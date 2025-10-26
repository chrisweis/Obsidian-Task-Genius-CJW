import { t } from "@/translations/helper";
import { TypingAnimation } from "./TypingAnimation";
/**
 * Config Check Transition - Shows checking animation with typing effect
 */
export class ConfigCheckTransition {
    constructor(container, onComplete, hasChanges) {
        this.container = container;
        this.show(hasChanges, onComplete);
    }
    /**
     * Show checking animation with typing effect
     */
    show(hasChanges, onComplete) {
        this.container.empty();
        // Create typing container with same style as intro
        const wrapper = this.container.createDiv({
            cls: "intro-typing-wrapper",
        });
        const typingContainer = wrapper.createDiv({
            cls: "intro-typing config-check-typing",
        });
        // Define checking messages
        const messages = [
            {
                text: t("Just a moment..."),
                className: "check-line check-line-1",
                speed: 40,
            },
            {
                text: t("Checking your current configuration"),
                className: "check-line check-line-2",
                speed: 30,
            },
            {
                text: t("Analyzing your settings"),
                className: "check-line check-line-3",
                speed: 25,
                pauseAfter: 800
            },
        ];
        // Add result message based on findings
        if (hasChanges) {
            messages.push({
                text: t("Great! I found your existing customizations."),
                className: "check-line check-line-3",
                speed: 25,
                pauseAfter: 400,
            });
        }
        else {
            messages.push({
                text: t("No previous configuration found. Let's get started!"),
                className: "check-line check-line-3",
                speed: 25,
                pauseAfter: 400,
            });
        }
        // Start typing animation
        this.typingAnimation = new TypingAnimation(typingContainer, messages, () => {
            // Animation complete, proceed to next step
            window.setTimeout(() => {
                onComplete(hasChanges);
            }, 1000);
        });
    }
    /**
     * Cleanup
     */
    cleanup() {
        var _a;
        (_a = this.typingAnimation) === null || _a === void 0 ? void 0 : _a.cleanup();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29uZmlnQ2hlY2tUcmFuc2l0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiQ29uZmlnQ2hlY2tUcmFuc2l0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFpQixNQUFNLG1CQUFtQixDQUFDO0FBRW5FOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHFCQUFxQjtJQUlqQyxZQUNDLFNBQXNCLEVBQ3RCLFVBQXlDLEVBQ3pDLFVBQW1CO1FBRW5CLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNLLElBQUksQ0FDWCxVQUFtQixFQUNuQixVQUF5QztRQUV6QyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXZCLG1EQUFtRDtRQUNuRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUN4QyxHQUFHLEVBQUUsc0JBQXNCO1NBQzNCLENBQUMsQ0FBQztRQUVILE1BQU0sZUFBZSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDekMsR0FBRyxFQUFFLGtDQUFrQztTQUN2QyxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsTUFBTSxRQUFRLEdBQW9CO1lBQ2pDO2dCQUNDLElBQUksRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUM7Z0JBQzNCLFNBQVMsRUFBRSx5QkFBeUI7Z0JBQ3BDLEtBQUssRUFBRSxFQUFFO2FBQ1Q7WUFDRDtnQkFDQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLHFDQUFxQyxDQUFDO2dCQUM5QyxTQUFTLEVBQUUseUJBQXlCO2dCQUNwQyxLQUFLLEVBQUUsRUFBRTthQUNUO1lBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQztnQkFDbEMsU0FBUyxFQUFFLHlCQUF5QjtnQkFDcEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLEdBQUc7YUFDZjtTQUNELENBQUM7UUFFRix1Q0FBdUM7UUFDdkMsSUFBSSxVQUFVLEVBQUU7WUFDZixRQUFRLENBQUMsSUFBSSxDQUFDO2dCQUNiLElBQUksRUFBRSxDQUFDLENBQUMsOENBQThDLENBQUM7Z0JBQ3ZELFNBQVMsRUFBRSx5QkFBeUI7Z0JBQ3BDLEtBQUssRUFBRSxFQUFFO2dCQUNULFVBQVUsRUFBRSxHQUFHO2FBQ2YsQ0FBQyxDQUFDO1NBQ0g7YUFBTTtZQUNOLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQ2IsSUFBSSxFQUFFLENBQUMsQ0FBQyxxREFBcUQsQ0FBQztnQkFDOUQsU0FBUyxFQUFFLHlCQUF5QjtnQkFDcEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsVUFBVSxFQUFFLEdBQUc7YUFDZixDQUFDLENBQUM7U0FDSDtRQUVELHlCQUF5QjtRQUN6QixJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksZUFBZSxDQUN6QyxlQUFlLEVBQ2YsUUFBUSxFQUNSLEdBQUcsRUFBRTtZQUNKLDJDQUEyQztZQUMzQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDdEIsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3hCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNWLENBQUMsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTzs7UUFDTixNQUFBLElBQUksQ0FBQyxlQUFlLDBDQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ2pDLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFR5cGluZ0FuaW1hdGlvbiwgVHlwaW5nTWVzc2FnZSB9IGZyb20gXCIuL1R5cGluZ0FuaW1hdGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIENvbmZpZyBDaGVjayBUcmFuc2l0aW9uIC0gU2hvd3MgY2hlY2tpbmcgYW5pbWF0aW9uIHdpdGggdHlwaW5nIGVmZmVjdFxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbmZpZ0NoZWNrVHJhbnNpdGlvbiB7XHJcblx0cHJpdmF0ZSBjb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdHlwaW5nQW5pbWF0aW9uPzogVHlwaW5nQW5pbWF0aW9uO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRvbkNvbXBsZXRlOiAoaGFzQ2hhbmdlczogYm9vbGVhbikgPT4gdm9pZCxcclxuXHRcdGhhc0NoYW5nZXM6IGJvb2xlYW5cclxuXHQpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xyXG5cdFx0dGhpcy5zaG93KGhhc0NoYW5nZXMsIG9uQ29tcGxldGUpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2hvdyBjaGVja2luZyBhbmltYXRpb24gd2l0aCB0eXBpbmcgZWZmZWN0XHJcblx0ICovXHJcblx0cHJpdmF0ZSBzaG93KFxyXG5cdFx0aGFzQ2hhbmdlczogYm9vbGVhbixcclxuXHRcdG9uQ29tcGxldGU6IChoYXNDaGFuZ2VzOiBib29sZWFuKSA9PiB2b2lkXHJcblx0KSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lci5lbXB0eSgpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0eXBpbmcgY29udGFpbmVyIHdpdGggc2FtZSBzdHlsZSBhcyBpbnRyb1xyXG5cdFx0Y29uc3Qgd3JhcHBlciA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJpbnRyby10eXBpbmctd3JhcHBlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgdHlwaW5nQ29udGFpbmVyID0gd3JhcHBlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiaW50cm8tdHlwaW5nIGNvbmZpZy1jaGVjay10eXBpbmdcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIERlZmluZSBjaGVja2luZyBtZXNzYWdlc1xyXG5cdFx0Y29uc3QgbWVzc2FnZXM6IFR5cGluZ01lc3NhZ2VbXSA9IFtcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJKdXN0IGEgbW9tZW50Li4uXCIpLFxyXG5cdFx0XHRcdGNsYXNzTmFtZTogXCJjaGVjay1saW5lIGNoZWNrLWxpbmUtMVwiLFxyXG5cdFx0XHRcdHNwZWVkOiA0MCxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJDaGVja2luZyB5b3VyIGN1cnJlbnQgY29uZmlndXJhdGlvblwiKSxcclxuXHRcdFx0XHRjbGFzc05hbWU6IFwiY2hlY2stbGluZSBjaGVjay1saW5lLTJcIixcclxuXHRcdFx0XHRzcGVlZDogMzAsXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHR0ZXh0OiB0KFwiQW5hbHl6aW5nIHlvdXIgc2V0dGluZ3NcIiksXHJcblx0XHRcdFx0Y2xhc3NOYW1lOiBcImNoZWNrLWxpbmUgY2hlY2stbGluZS0zXCIsXHJcblx0XHRcdFx0c3BlZWQ6IDI1LFxyXG5cdFx0XHRcdHBhdXNlQWZ0ZXI6IDgwMFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHJcblx0XHQvLyBBZGQgcmVzdWx0IG1lc3NhZ2UgYmFzZWQgb24gZmluZGluZ3NcclxuXHRcdGlmIChoYXNDaGFuZ2VzKSB7XHJcblx0XHRcdG1lc3NhZ2VzLnB1c2goe1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJHcmVhdCEgSSBmb3VuZCB5b3VyIGV4aXN0aW5nIGN1c3RvbWl6YXRpb25zLlwiKSxcclxuXHRcdFx0XHRjbGFzc05hbWU6IFwiY2hlY2stbGluZSBjaGVjay1saW5lLTNcIixcclxuXHRcdFx0XHRzcGVlZDogMjUsXHJcblx0XHRcdFx0cGF1c2VBZnRlcjogNDAwLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdG1lc3NhZ2VzLnB1c2goe1xyXG5cdFx0XHRcdHRleHQ6IHQoXCJObyBwcmV2aW91cyBjb25maWd1cmF0aW9uIGZvdW5kLiBMZXQncyBnZXQgc3RhcnRlZCFcIiksXHJcblx0XHRcdFx0Y2xhc3NOYW1lOiBcImNoZWNrLWxpbmUgY2hlY2stbGluZS0zXCIsXHJcblx0XHRcdFx0c3BlZWQ6IDI1LFxyXG5cdFx0XHRcdHBhdXNlQWZ0ZXI6IDQwMCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU3RhcnQgdHlwaW5nIGFuaW1hdGlvblxyXG5cdFx0dGhpcy50eXBpbmdBbmltYXRpb24gPSBuZXcgVHlwaW5nQW5pbWF0aW9uKFxyXG5cdFx0XHR0eXBpbmdDb250YWluZXIsXHJcblx0XHRcdG1lc3NhZ2VzLFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0Ly8gQW5pbWF0aW9uIGNvbXBsZXRlLCBwcm9jZWVkIHRvIG5leHQgc3RlcFxyXG5cdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdG9uQ29tcGxldGUoaGFzQ2hhbmdlcyk7XHJcblx0XHRcdFx0fSwgMTAwMCk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhbnVwXHJcblx0ICovXHJcblx0Y2xlYW51cCgpIHtcclxuXHRcdHRoaXMudHlwaW5nQW5pbWF0aW9uPy5jbGVhbnVwKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==