/**
 * Progress dots component for step indication
 * Shows current progress through onboarding steps
 */
export class ProgressDots {
    constructor(container, totalSteps, labels, options = {}) {
        this.currentStep = 0;
        this.dots = [];
        this.container = container;
        this.totalSteps = totalSteps;
        this.labels = labels;
        this.render(options);
    }
    render(options) {
        const { containerClass = "progress-dots", dotClass = "progress-dot", showLabels = false, } = options;
        const dotsContainer = this.container.createDiv({
            cls: containerClass,
        });
        for (let i = 0; i < this.totalSteps; i++) {
            const dotWrapper = dotsContainer.createDiv({
                cls: `${dotClass}-wrapper`,
            });
            const dot = dotWrapper.createDiv({
                cls: dotClass,
            });
            // Add label if provided
            if (showLabels && this.labels && this.labels[i]) {
                dotWrapper.createEl("span", {
                    text: this.labels[i],
                    cls: `${dotClass}-label`,
                });
            }
            this.dots.push(dot);
        }
    }
    /**
     * Set current step
     */
    setStep(step) {
        if (step < 0 || step >= this.totalSteps)
            return;
        // Remove active from previous
        if (this.currentStep < this.dots.length) {
            this.dots[this.currentStep].removeClass("is-active");
        }
        // Set new step
        this.currentStep = step;
        this.dots[step].addClass("is-active");
        // Mark completed steps
        this.dots.forEach((dot, index) => {
            if (index < step) {
                dot.addClass("is-completed");
                dot.removeClass("is-active");
            }
            else if (index === step) {
                dot.addClass("is-active");
                dot.removeClass("is-completed");
            }
            else {
                dot.removeClass("is-active");
                dot.removeClass("is-completed");
            }
        });
    }
    /**
     * Get current step
     */
    getStep() {
        return this.currentStep;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvZ3Jlc3NEb3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUHJvZ3Jlc3NEb3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU1BOzs7R0FHRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBT3hCLFlBQ0MsU0FBc0IsRUFDdEIsVUFBa0IsRUFDbEIsTUFBaUIsRUFDakIsVUFBK0IsRUFBRTtRQVIxQixnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixTQUFJLEdBQWtCLEVBQUUsQ0FBQztRQVNoQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFTyxNQUFNLENBQUMsT0FBNEI7UUFDMUMsTUFBTSxFQUNMLGNBQWMsR0FBRyxlQUFlLEVBQ2hDLFFBQVEsR0FBRyxjQUFjLEVBQ3pCLFVBQVUsR0FBRyxLQUFLLEdBQ2xCLEdBQUcsT0FBTyxDQUFDO1FBRVosTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUM7WUFDOUMsR0FBRyxFQUFFLGNBQWM7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDekMsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztnQkFDMUMsR0FBRyxFQUFFLEdBQUcsUUFBUSxVQUFVO2FBQzFCLENBQUMsQ0FBQztZQUVILE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUM7Z0JBQ2hDLEdBQUcsRUFBRSxRQUFRO2FBQ2IsQ0FBQyxDQUFDO1lBRUgsd0JBQXdCO1lBQ3hCLElBQUksVUFBVSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDaEQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7b0JBQzNCLElBQUksRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDcEIsR0FBRyxFQUFFLEdBQUcsUUFBUSxRQUFRO2lCQUN4QixDQUFDLENBQUM7YUFDSDtZQUVELElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1NBQ3BCO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTyxDQUFDLElBQVk7UUFDbkIsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVTtZQUFFLE9BQU87UUFFaEQsOEJBQThCO1FBQzlCLElBQUksSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUN4QyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDckQ7UUFFRCxlQUFlO1FBQ2YsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7UUFFdEMsdUJBQXVCO1FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ2hDLElBQUksS0FBSyxHQUFHLElBQUksRUFBRTtnQkFDakIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDN0IsR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQzthQUM3QjtpQkFBTSxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLEdBQUcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQzFCLEdBQUcsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7YUFDaEM7aUJBQU07Z0JBQ04sR0FBRyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDN0IsR0FBRyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUNoQztRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUN6QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgaW50ZXJmYWNlIFByb2dyZXNzRG90c09wdGlvbnMge1xyXG5cdGNvbnRhaW5lckNsYXNzPzogc3RyaW5nO1xyXG5cdGRvdENsYXNzPzogc3RyaW5nO1xyXG5cdHNob3dMYWJlbHM/OiBib29sZWFuO1xyXG59XHJcblxyXG4vKipcclxuICogUHJvZ3Jlc3MgZG90cyBjb21wb25lbnQgZm9yIHN0ZXAgaW5kaWNhdGlvblxyXG4gKiBTaG93cyBjdXJyZW50IHByb2dyZXNzIHRocm91Z2ggb25ib2FyZGluZyBzdGVwc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFByb2dyZXNzRG90cyB7XHJcblx0cHJpdmF0ZSBjb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdG90YWxTdGVwczogbnVtYmVyO1xyXG5cdHByaXZhdGUgY3VycmVudFN0ZXA6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSBkb3RzOiBIVE1MRWxlbWVudFtdID0gW107XHJcblx0cHJpdmF0ZSBsYWJlbHM/OiBzdHJpbmdbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0dG90YWxTdGVwczogbnVtYmVyLFxyXG5cdFx0bGFiZWxzPzogc3RyaW5nW10sXHJcblx0XHRvcHRpb25zOiBQcm9ncmVzc0RvdHNPcHRpb25zID0ge31cclxuXHQpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyID0gY29udGFpbmVyO1xyXG5cdFx0dGhpcy50b3RhbFN0ZXBzID0gdG90YWxTdGVwcztcclxuXHRcdHRoaXMubGFiZWxzID0gbGFiZWxzO1xyXG5cdFx0dGhpcy5yZW5kZXIob3B0aW9ucyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcihvcHRpb25zOiBQcm9ncmVzc0RvdHNPcHRpb25zKSB7XHJcblx0XHRjb25zdCB7XHJcblx0XHRcdGNvbnRhaW5lckNsYXNzID0gXCJwcm9ncmVzcy1kb3RzXCIsXHJcblx0XHRcdGRvdENsYXNzID0gXCJwcm9ncmVzcy1kb3RcIixcclxuXHRcdFx0c2hvd0xhYmVscyA9IGZhbHNlLFxyXG5cdFx0fSA9IG9wdGlvbnM7XHJcblxyXG5cdFx0Y29uc3QgZG90c0NvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogY29udGFpbmVyQ2xhc3MsXHJcblx0XHR9KTtcclxuXHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudG90YWxTdGVwczsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IGRvdFdyYXBwZXIgPSBkb3RzQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgJHtkb3RDbGFzc30td3JhcHBlcmAsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgZG90ID0gZG90V3JhcHBlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogZG90Q2xhc3MsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQWRkIGxhYmVsIGlmIHByb3ZpZGVkXHJcblx0XHRcdGlmIChzaG93TGFiZWxzICYmIHRoaXMubGFiZWxzICYmIHRoaXMubGFiZWxzW2ldKSB7XHJcblx0XHRcdFx0ZG90V3JhcHBlci5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0dGV4dDogdGhpcy5sYWJlbHNbaV0sXHJcblx0XHRcdFx0XHRjbHM6IGAke2RvdENsYXNzfS1sYWJlbGAsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuZG90cy5wdXNoKGRvdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZXQgY3VycmVudCBzdGVwXHJcblx0ICovXHJcblx0c2V0U3RlcChzdGVwOiBudW1iZXIpIHtcclxuXHRcdGlmIChzdGVwIDwgMCB8fCBzdGVwID49IHRoaXMudG90YWxTdGVwcykgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBhY3RpdmUgZnJvbSBwcmV2aW91c1xyXG5cdFx0aWYgKHRoaXMuY3VycmVudFN0ZXAgPCB0aGlzLmRvdHMubGVuZ3RoKSB7XHJcblx0XHRcdHRoaXMuZG90c1t0aGlzLmN1cnJlbnRTdGVwXS5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgbmV3IHN0ZXBcclxuXHRcdHRoaXMuY3VycmVudFN0ZXAgPSBzdGVwO1xyXG5cdFx0dGhpcy5kb3RzW3N0ZXBdLmFkZENsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG5cclxuXHRcdC8vIE1hcmsgY29tcGxldGVkIHN0ZXBzXHJcblx0XHR0aGlzLmRvdHMuZm9yRWFjaCgoZG90LCBpbmRleCkgPT4ge1xyXG5cdFx0XHRpZiAoaW5kZXggPCBzdGVwKSB7XHJcblx0XHRcdFx0ZG90LmFkZENsYXNzKFwiaXMtY29tcGxldGVkXCIpO1xyXG5cdFx0XHRcdGRvdC5yZW1vdmVDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdFx0fSBlbHNlIGlmIChpbmRleCA9PT0gc3RlcCkge1xyXG5cdFx0XHRcdGRvdC5hZGRDbGFzcyhcImlzLWFjdGl2ZVwiKTtcclxuXHRcdFx0XHRkb3QucmVtb3ZlQ2xhc3MoXCJpcy1jb21wbGV0ZWRcIik7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0ZG90LnJlbW92ZUNsYXNzKFwiaXMtYWN0aXZlXCIpO1xyXG5cdFx0XHRcdGRvdC5yZW1vdmVDbGFzcyhcImlzLWNvbXBsZXRlZFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgY3VycmVudCBzdGVwXHJcblx0ICovXHJcblx0Z2V0U3RlcCgpOiBudW1iZXIge1xyXG5cdFx0cmV0dXJuIHRoaXMuY3VycmVudFN0ZXA7XHJcblx0fVxyXG59XHJcbiJdfQ==