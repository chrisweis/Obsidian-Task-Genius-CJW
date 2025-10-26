import { Component, setIcon } from "obsidian";
import { t } from '@/translations/helper';
/**
 * Workflow progress indicator component for visualizing workflow completion
 */
export class WorkflowProgressIndicator extends Component {
    constructor(containerEl, plugin, workflow, currentStageId, completedStages = []) {
        super();
        this.completedStages = [];
        this.containerEl = containerEl;
        this.plugin = plugin;
        this.workflow = workflow;
        this.currentStageId = currentStageId;
        this.completedStages = completedStages;
    }
    onload() {
        this.render();
    }
    onunload() {
        this.containerEl.empty();
    }
    /**
     * Updates the progress indicator with new stage information
     */
    updateProgress(currentStageId, completedStages = []) {
        this.currentStageId = currentStageId;
        this.completedStages = completedStages;
        this.render();
    }
    /**
     * Renders the workflow progress indicator
     */
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("workflow-progress-indicator");
        // Create header
        const header = this.containerEl.createDiv({ cls: "workflow-progress-header" });
        header.createSpan({ cls: "workflow-name", text: this.workflow.name });
        const progressText = this.getProgressText();
        header.createSpan({ cls: "workflow-progress-text", text: progressText });
        // Create progress bar
        this.createProgressBar();
        // Create stage list
        this.createStageList();
    }
    /**
     * Creates the visual progress bar
     */
    createProgressBar() {
        const progressContainer = this.containerEl.createDiv({ cls: "workflow-progress-bar-container" });
        const progressBar = progressContainer.createDiv({ cls: "workflow-progress-bar" });
        const totalStages = this.workflow.stages.length;
        const completedCount = this.completedStages.length;
        const currentStageIndex = this.workflow.stages.findIndex(stage => stage.id === this.currentStageId);
        // Calculate progress percentage
        let progressPercentage = 0;
        if (totalStages > 0) {
            // Count completed stages plus partial progress for current stage
            progressPercentage = (completedCount / totalStages) * 100;
            // Add partial progress for current stage if it's not completed
            if (currentStageIndex >= 0 && !this.completedStages.includes(this.currentStageId)) {
                progressPercentage += (1 / totalStages) * 50; // 50% progress for current stage
            }
        }
        const progressFill = progressBar.createDiv({ cls: "workflow-progress-fill" });
        progressFill.style.width = `${Math.min(progressPercentage, 100)}%`;
        // Add progress percentage text
        progressContainer.createSpan({
            cls: "workflow-progress-percentage",
            text: `${Math.round(progressPercentage)}%`
        });
    }
    /**
     * Creates the detailed stage list
     */
    createStageList() {
        const stageListContainer = this.containerEl.createDiv({ cls: "workflow-stage-list" });
        this.workflow.stages.forEach((stage, index) => {
            const stageItem = stageListContainer.createDiv({ cls: "workflow-stage-item" });
            // Determine stage status
            const isCompleted = this.completedStages.includes(stage.id);
            const isCurrent = stage.id === this.currentStageId;
            const isPending = !isCompleted && !isCurrent;
            // Add status classes
            if (isCompleted)
                stageItem.addClass("completed");
            if (isCurrent)
                stageItem.addClass("current");
            if (isPending)
                stageItem.addClass("pending");
            // Create stage icon
            const stageIcon = stageItem.createDiv({ cls: "workflow-stage-icon" });
            this.setStageIcon(stageIcon, stage, isCompleted, isCurrent);
            // Create stage content
            const stageContent = stageItem.createDiv({ cls: "workflow-stage-content" });
            const stageName = stageContent.createDiv({ cls: "workflow-stage-name" });
            stageName.textContent = stage.name;
            // Add stage type indicator
            const stageType = stageContent.createDiv({ cls: "workflow-stage-type" });
            stageType.textContent = this.getStageTypeText(stage);
            // Add substages if they exist and stage is current
            if (isCurrent && stage.subStages && stage.subStages.length > 0) {
                this.createSubStageList(stageContent, stage);
            }
            // Add stage number
            const stageNumber = stageItem.createDiv({ cls: "workflow-stage-number" });
            stageNumber.textContent = (index + 1).toString();
        });
    }
    /**
     * Creates substage list for cycle stages
     */
    createSubStageList(container, stage) {
        if (!stage.subStages)
            return;
        const subStageContainer = container.createDiv({ cls: "workflow-substage-container" });
        stage.subStages.forEach((subStage) => {
            const subStageItem = subStageContainer.createDiv({ cls: "workflow-substage-item" });
            const subStageIcon = subStageItem.createDiv({ cls: "workflow-substage-icon" });
            setIcon(subStageIcon, "circle");
            const subStageName = subStageItem.createDiv({ cls: "workflow-substage-name" });
            subStageName.textContent = subStage.name;
        });
    }
    /**
     * Sets the appropriate icon for a stage based on its status
     */
    setStageIcon(iconEl, stage, isCompleted, isCurrent) {
        if (isCompleted) {
            setIcon(iconEl, "check-circle");
            iconEl.addClass("completed-icon");
        }
        else if (isCurrent) {
            if (stage.type === "cycle") {
                setIcon(iconEl, "rotate-cw");
            }
            else if (stage.type === "terminal") {
                setIcon(iconEl, "flag");
            }
            else {
                setIcon(iconEl, "play-circle");
            }
            iconEl.addClass("current-icon");
        }
        else {
            setIcon(iconEl, "circle");
            iconEl.addClass("pending-icon");
        }
    }
    /**
     * Gets the display text for stage type
     */
    getStageTypeText(stage) {
        switch (stage.type) {
            case "cycle":
                return t("Repeatable");
            case "terminal":
                return t("Final");
            case "linear":
            default:
                return t("Sequential");
        }
    }
    /**
     * Gets the progress text summary
     */
    getProgressText() {
        const totalStages = this.workflow.stages.length;
        const completedCount = this.completedStages.length;
        const currentStage = this.workflow.stages.find(stage => stage.id === this.currentStageId);
        if (completedCount === totalStages) {
            return t("Completed");
        }
        else if (currentStage) {
            return t("Current: ") + currentStage.name;
        }
        else {
            return `${completedCount}/${totalStages} ${t("completed")}`;
        }
    }
    /**
     * Static method to create and render a workflow progress indicator
     */
    static create(containerEl, plugin, workflow, currentStageId, completedStages = []) {
        const indicator = new WorkflowProgressIndicator(containerEl, plugin, workflow, currentStageId, completedStages);
        indicator.load();
        return indicator;
    }
    /**
     * Calculates completed stages from a workflow task hierarchy
     */
    static calculateCompletedStages(workflowTasks, workflow) {
        const completed = [];
        // Simple heuristic: a stage is completed if all its tasks are completed
        const stageTaskCounts = new Map();
        workflowTasks.forEach(task => {
            const current = stageTaskCounts.get(task.stage) || { total: 0, completed: 0 };
            current.total++;
            if (task.completed) {
                current.completed++;
            }
            stageTaskCounts.set(task.stage, current);
        });
        stageTaskCounts.forEach((counts, stageId) => {
            if (counts.completed === counts.total && counts.total > 0) {
                completed.push(stageId);
            }
        });
        return completed;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV29ya2Zsb3dQcm9ncmVzc0luZGljYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIldvcmtmbG93UHJvZ3Jlc3NJbmRpY2F0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFHOUMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRTFDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFNBQVM7SUFPdkQsWUFDQyxXQUF3QixFQUN4QixNQUE2QixFQUM3QixRQUE0QixFQUM1QixjQUFzQixFQUN0QixrQkFBNEIsRUFBRTtRQUU5QixLQUFLLEVBQUUsQ0FBQztRQVRELG9CQUFlLEdBQWEsRUFBRSxDQUFDO1FBVXRDLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQ3hDLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWMsQ0FBQyxjQUFzQixFQUFFLGtCQUE0QixFQUFFO1FBQ3BFLElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztJQUNmLENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU07UUFDYixJQUFJLENBQUMsV0FBVyxDQUFDLEtB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RCxDQUFDO1FBRWhGLGFBQWEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDNUIsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUM5RSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO2dCQUNuQixPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7YUFDcEI7WUFDRCxlQUFlLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQzNDLElBQUksTUFBTSxDQUFDLFNBQVMsS0FBSyxNQUFNLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxFQUFFO2dCQUMxRCxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2FBQ3hCO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgV29ya2Zsb3dEZWZpbml0aW9uLCBXb3JrZmxvd1N0YWdlIH0gZnJvbSAnQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uJztcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tICdAL2luZGV4JztcclxuaW1wb3J0IHsgdCB9IGZyb20gJ0AvdHJhbnNsYXRpb25zL2hlbHBlcic7XHJcblxyXG4vKipcclxuICogV29ya2Zsb3cgcHJvZ3Jlc3MgaW5kaWNhdG9yIGNvbXBvbmVudCBmb3IgdmlzdWFsaXppbmcgd29ya2Zsb3cgY29tcGxldGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFdvcmtmbG93UHJvZ3Jlc3NJbmRpY2F0b3IgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSB3b3JrZmxvdzogV29ya2Zsb3dEZWZpbml0aW9uO1xyXG5cdHByaXZhdGUgY3VycmVudFN0YWdlSWQ6IHN0cmluZztcclxuXHRwcml2YXRlIGNvbXBsZXRlZFN0YWdlczogc3RyaW5nW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHdvcmtmbG93OiBXb3JrZmxvd0RlZmluaXRpb24sXHJcblx0XHRjdXJyZW50U3RhZ2VJZDogc3RyaW5nLFxyXG5cdFx0Y29tcGxldGVkU3RhZ2VzOiBzdHJpbmdbXSA9IFtdXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0XHR0aGlzLndvcmtmbG93ID0gd29ya2Zsb3c7XHJcblx0XHR0aGlzLmN1cnJlbnRTdGFnZUlkID0gY3VycmVudFN0YWdlSWQ7XHJcblx0XHR0aGlzLmNvbXBsZXRlZFN0YWdlcyA9IGNvbXBsZXRlZFN0YWdlcztcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZXMgdGhlIHByb2dyZXNzIGluZGljYXRvciB3aXRoIG5ldyBzdGFnZSBpbmZvcm1hdGlvblxyXG5cdCAqL1xyXG5cdHVwZGF0ZVByb2dyZXNzKGN1cnJlbnRTdGFnZUlkOiBzdHJpbmcsIGNvbXBsZXRlZFN0YWdlczogc3RyaW5nW10gPSBbXSkge1xyXG5cdFx0dGhpcy5jdXJyZW50U3RhZ2VJZCA9IGN1cnJlbnRTdGFnZUlkO1xyXG5cdFx0dGhpcy5jb21wbGV0ZWRTdGFnZXMgPSBjb21wbGV0ZWRTdGFnZXM7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVycyB0aGUgd29ya2Zsb3cgcHJvZ3Jlc3MgaW5kaWNhdG9yXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXIoKSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwid29ya2Zsb3ctcHJvZ3Jlc3MtaW5kaWNhdG9yXCIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBoZWFkZXJcclxuXHRcdGNvbnN0IGhlYWRlciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXByb2dyZXNzLWhlYWRlclwiIH0pO1xyXG5cdFx0aGVhZGVyLmNyZWF0ZVNwYW4oeyBjbHM6IFwid29ya2Zsb3ctbmFtZVwiLCB0ZXh0OiB0aGlzLndvcmtmbG93Lm5hbWUgfSk7XHJcblx0XHRcclxuXHRcdGNvbnN0IHByb2dyZXNzVGV4dCA9IHRoaXMuZ2V0UHJvZ3Jlc3NUZXh0KCk7XHJcblx0XHRoZWFkZXIuY3JlYXRlU3Bhbih7IGNsczogXCJ3b3JrZmxvdy1wcm9ncmVzcy10ZXh0XCIsIHRleHQ6IHByb2dyZXNzVGV4dCB9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgcHJvZ3Jlc3MgYmFyXHJcblx0XHR0aGlzLmNyZWF0ZVByb2dyZXNzQmFyKCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIHN0YWdlIGxpc3RcclxuXHRcdHRoaXMuY3JlYXRlU3RhZ2VMaXN0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGVzIHRoZSB2aXN1YWwgcHJvZ3Jlc3MgYmFyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVQcm9ncmVzc0JhcigpIHtcclxuXHRcdGNvbnN0IHByb2dyZXNzQ29udGFpbmVyID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6IFwid29ya2Zsb3ctcHJvZ3Jlc3MtYmFyLWNvbnRhaW5lclwiIH0pO1xyXG5cdFx0Y29uc3QgcHJvZ3Jlc3NCYXIgPSBwcm9ncmVzc0NvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6IFwid29ya2Zsb3ctcHJvZ3Jlc3MtYmFyXCIgfSk7XHJcblxyXG5cdFx0Y29uc3QgdG90YWxTdGFnZXMgPSB0aGlzLndvcmtmbG93LnN0YWdlcy5sZW5ndGg7XHJcblx0XHRjb25zdCBjb21wbGV0ZWRDb3VudCA9IHRoaXMuY29tcGxldGVkU3RhZ2VzLmxlbmd0aDtcclxuXHRcdGNvbnN0IGN1cnJlbnRTdGFnZUluZGV4ID0gdGhpcy53b3JrZmxvdy5zdGFnZXMuZmluZEluZGV4KHN0YWdlID0+IHN0YWdlLmlkID09PSB0aGlzLmN1cnJlbnRTdGFnZUlkKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ2FsY3VsYXRlIHByb2dyZXNzIHBlcmNlbnRhZ2VcclxuXHRcdGxldCBwcm9ncmVzc1BlcmNlbnRhZ2UgPSAwO1xyXG5cdFx0aWYgKHRvdGFsU3RhZ2VzID4gMCkge1xyXG5cdFx0XHQvLyBDb3VudCBjb21wbGV0ZWQgc3RhZ2VzIHBsdXMgcGFydGlhbCBwcm9ncmVzcyBmb3IgY3VycmVudCBzdGFnZVxyXG5cdFx0XHRwcm9ncmVzc1BlcmNlbnRhZ2UgPSAoY29tcGxldGVkQ291bnQgLyB0b3RhbFN0YWdlcykgKiAxMDA7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBBZGQgcGFydGlhbCBwcm9ncmVzcyBmb3IgY3VycmVudCBzdGFnZSBpZiBpdCdzIG5vdCBjb21wbGV0ZWRcclxuXHRcdFx0aWYgKGN1cnJlbnRTdGFnZUluZGV4ID49IDAgJiYgIXRoaXMuY29tcGxldGVkU3RhZ2VzLmluY2x1ZGVzKHRoaXMuY3VycmVudFN0YWdlSWQpKSB7XHJcblx0XHRcdFx0cHJvZ3Jlc3NQZXJjZW50YWdlICs9ICgxIC8gdG90YWxTdGFnZXMpICogNTA7IC8vIDUwJSBwcm9ncmVzcyBmb3IgY3VycmVudCBzdGFnZVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcHJvZ3Jlc3NGaWxsID0gcHJvZ3Jlc3NCYXIuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXByb2dyZXNzLWZpbGxcIiB9KTtcclxuXHRcdHByb2dyZXNzRmlsbC5zdHlsZS53aWR0aCA9IGAke01hdGgubWluKHByb2dyZXNzUGVyY2VudGFnZSwgMTAwKX0lYDtcclxuXHJcblx0XHQvLyBBZGQgcHJvZ3Jlc3MgcGVyY2VudGFnZSB0ZXh0XHJcblx0XHRwcm9ncmVzc0NvbnRhaW5lci5jcmVhdGVTcGFuKHsgXHJcblx0XHRcdGNsczogXCJ3b3JrZmxvdy1wcm9ncmVzcy1wZXJjZW50YWdlXCIsIFxyXG5cdFx0XHR0ZXh0OiBgJHtNYXRoLnJvdW5kKHByb2dyZXNzUGVyY2VudGFnZSl9JWAgXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgdGhlIGRldGFpbGVkIHN0YWdlIGxpc3RcclxuXHQgKi9cclxuXHRwcml2YXRlIGNyZWF0ZVN0YWdlTGlzdCgpIHtcclxuXHRcdGNvbnN0IHN0YWdlTGlzdENvbnRhaW5lciA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN0YWdlLWxpc3RcIiB9KTtcclxuXHJcblx0XHR0aGlzLndvcmtmbG93LnN0YWdlcy5mb3JFYWNoKChzdGFnZSwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3RhZ2VJdGVtID0gc3RhZ2VMaXN0Q29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogXCJ3b3JrZmxvdy1zdGFnZS1pdGVtXCIgfSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBEZXRlcm1pbmUgc3RhZ2Ugc3RhdHVzXHJcblx0XHRcdGNvbnN0IGlzQ29tcGxldGVkID0gdGhpcy5jb21wbGV0ZWRTdGFnZXMuaW5jbHVkZXMoc3RhZ2UuaWQpO1xyXG5cdFx0XHRjb25zdCBpc0N1cnJlbnQgPSBzdGFnZS5pZCA9PT0gdGhpcy5jdXJyZW50U3RhZ2VJZDtcclxuXHRcdFx0Y29uc3QgaXNQZW5kaW5nID0gIWlzQ29tcGxldGVkICYmICFpc0N1cnJlbnQ7XHJcblxyXG5cdFx0XHQvLyBBZGQgc3RhdHVzIGNsYXNzZXNcclxuXHRcdFx0aWYgKGlzQ29tcGxldGVkKSBzdGFnZUl0ZW0uYWRkQ2xhc3MoXCJjb21wbGV0ZWRcIik7XHJcblx0XHRcdGlmIChpc0N1cnJlbnQpIHN0YWdlSXRlbS5hZGRDbGFzcyhcImN1cnJlbnRcIik7XHJcblx0XHRcdGlmIChpc1BlbmRpbmcpIHN0YWdlSXRlbS5hZGRDbGFzcyhcInBlbmRpbmdcIik7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgc3RhZ2UgaWNvblxyXG5cdFx0XHRjb25zdCBzdGFnZUljb24gPSBzdGFnZUl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN0YWdlLWljb25cIiB9KTtcclxuXHRcdFx0dGhpcy5zZXRTdGFnZUljb24oc3RhZ2VJY29uLCBzdGFnZSwgaXNDb21wbGV0ZWQsIGlzQ3VycmVudCk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgc3RhZ2UgY29udGVudFxyXG5cdFx0XHRjb25zdCBzdGFnZUNvbnRlbnQgPSBzdGFnZUl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN0YWdlLWNvbnRlbnRcIiB9KTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHN0YWdlTmFtZSA9IHN0YWdlQ29udGVudC5jcmVhdGVEaXYoeyBjbHM6IFwid29ya2Zsb3ctc3RhZ2UtbmFtZVwiIH0pO1xyXG5cdFx0XHRzdGFnZU5hbWUudGV4dENvbnRlbnQgPSBzdGFnZS5uYW1lO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHN0YWdlIHR5cGUgaW5kaWNhdG9yXHJcblx0XHRcdGNvbnN0IHN0YWdlVHlwZSA9IHN0YWdlQ29udGVudC5jcmVhdGVEaXYoeyBjbHM6IFwid29ya2Zsb3ctc3RhZ2UtdHlwZVwiIH0pO1xyXG5cdFx0XHRzdGFnZVR5cGUudGV4dENvbnRlbnQgPSB0aGlzLmdldFN0YWdlVHlwZVRleHQoc3RhZ2UpO1xyXG5cclxuXHRcdFx0Ly8gQWRkIHN1YnN0YWdlcyBpZiB0aGV5IGV4aXN0IGFuZCBzdGFnZSBpcyBjdXJyZW50XHJcblx0XHRcdGlmIChpc0N1cnJlbnQgJiYgc3RhZ2Uuc3ViU3RhZ2VzICYmIHN0YWdlLnN1YlN0YWdlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0dGhpcy5jcmVhdGVTdWJTdGFnZUxpc3Qoc3RhZ2VDb250ZW50LCBzdGFnZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCBzdGFnZSBudW1iZXJcclxuXHRcdFx0Y29uc3Qgc3RhZ2VOdW1iZXIgPSBzdGFnZUl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN0YWdlLW51bWJlclwiIH0pO1xyXG5cdFx0XHRzdGFnZU51bWJlci50ZXh0Q29udGVudCA9IChpbmRleCArIDEpLnRvU3RyaW5nKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZXMgc3Vic3RhZ2UgbGlzdCBmb3IgY3ljbGUgc3RhZ2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVTdWJTdGFnZUxpc3QoY29udGFpbmVyOiBIVE1MRWxlbWVudCwgc3RhZ2U6IFdvcmtmbG93U3RhZ2UpIHtcclxuXHRcdGlmICghc3RhZ2Uuc3ViU3RhZ2VzKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgc3ViU3RhZ2VDb250YWluZXIgPSBjb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN1YnN0YWdlLWNvbnRhaW5lclwiIH0pO1xyXG5cdFx0XHJcblx0XHRzdGFnZS5zdWJTdGFnZXMuZm9yRWFjaCgoc3ViU3RhZ2UpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3ViU3RhZ2VJdGVtID0gc3ViU3RhZ2VDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN1YnN0YWdlLWl0ZW1cIiB9KTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHN1YlN0YWdlSWNvbiA9IHN1YlN0YWdlSXRlbS5jcmVhdGVEaXYoeyBjbHM6IFwid29ya2Zsb3ctc3Vic3RhZ2UtaWNvblwiIH0pO1xyXG5cdFx0XHRzZXRJY29uKHN1YlN0YWdlSWNvbiwgXCJjaXJjbGVcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCBzdWJTdGFnZU5hbWUgPSBzdWJTdGFnZUl0ZW0uY3JlYXRlRGl2KHsgY2xzOiBcIndvcmtmbG93LXN1YnN0YWdlLW5hbWVcIiB9KTtcclxuXHRcdFx0c3ViU3RhZ2VOYW1lLnRleHRDb250ZW50ID0gc3ViU3RhZ2UubmFtZTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0cyB0aGUgYXBwcm9wcmlhdGUgaWNvbiBmb3IgYSBzdGFnZSBiYXNlZCBvbiBpdHMgc3RhdHVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZXRTdGFnZUljb24oaWNvbkVsOiBIVE1MRWxlbWVudCwgc3RhZ2U6IFdvcmtmbG93U3RhZ2UsIGlzQ29tcGxldGVkOiBib29sZWFuLCBpc0N1cnJlbnQ6IGJvb2xlYW4pIHtcclxuXHRcdGlmIChpc0NvbXBsZXRlZCkge1xyXG5cdFx0XHRzZXRJY29uKGljb25FbCwgXCJjaGVjay1jaXJjbGVcIik7XHJcblx0XHRcdGljb25FbC5hZGRDbGFzcyhcImNvbXBsZXRlZC1pY29uXCIpO1xyXG5cdFx0fSBlbHNlIGlmIChpc0N1cnJlbnQpIHtcclxuXHRcdFx0aWYgKHN0YWdlLnR5cGUgPT09IFwiY3ljbGVcIikge1xyXG5cdFx0XHRcdHNldEljb24oaWNvbkVsLCBcInJvdGF0ZS1jd1wiKTtcclxuXHRcdFx0fSBlbHNlIGlmIChzdGFnZS50eXBlID09PSBcInRlcm1pbmFsXCIpIHtcclxuXHRcdFx0XHRzZXRJY29uKGljb25FbCwgXCJmbGFnXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHNldEljb24oaWNvbkVsLCBcInBsYXktY2lyY2xlXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGljb25FbC5hZGRDbGFzcyhcImN1cnJlbnQtaWNvblwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHNldEljb24oaWNvbkVsLCBcImNpcmNsZVwiKTtcclxuXHRcdFx0aWNvbkVsLmFkZENsYXNzKFwicGVuZGluZy1pY29uXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0cyB0aGUgZGlzcGxheSB0ZXh0IGZvciBzdGFnZSB0eXBlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRTdGFnZVR5cGVUZXh0KHN0YWdlOiBXb3JrZmxvd1N0YWdlKTogc3RyaW5nIHtcclxuXHRcdHN3aXRjaCAoc3RhZ2UudHlwZSkge1xyXG5cdFx0XHRjYXNlIFwiY3ljbGVcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcIlJlcGVhdGFibGVcIik7XHJcblx0XHRcdGNhc2UgXCJ0ZXJtaW5hbFwiOlxyXG5cdFx0XHRcdHJldHVybiB0KFwiRmluYWxcIik7XHJcblx0XHRcdGNhc2UgXCJsaW5lYXJcIjpcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gdChcIlNlcXVlbnRpYWxcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXRzIHRoZSBwcm9ncmVzcyB0ZXh0IHN1bW1hcnlcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFByb2dyZXNzVGV4dCgpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgdG90YWxTdGFnZXMgPSB0aGlzLndvcmtmbG93LnN0YWdlcy5sZW5ndGg7XHJcblx0XHRjb25zdCBjb21wbGV0ZWRDb3VudCA9IHRoaXMuY29tcGxldGVkU3RhZ2VzLmxlbmd0aDtcclxuXHRcdGNvbnN0IGN1cnJlbnRTdGFnZSA9IHRoaXMud29ya2Zsb3cuc3RhZ2VzLmZpbmQoc3RhZ2UgPT4gc3RhZ2UuaWQgPT09IHRoaXMuY3VycmVudFN0YWdlSWQpO1xyXG5cdFx0XHJcblx0XHRpZiAoY29tcGxldGVkQ291bnQgPT09IHRvdGFsU3RhZ2VzKSB7XHJcblx0XHRcdHJldHVybiB0KFwiQ29tcGxldGVkXCIpO1xyXG5cdFx0fSBlbHNlIGlmIChjdXJyZW50U3RhZ2UpIHtcclxuXHRcdFx0cmV0dXJuIHQoXCJDdXJyZW50OiBcIikgKyBjdXJyZW50U3RhZ2UubmFtZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBgJHtjb21wbGV0ZWRDb3VudH0vJHt0b3RhbFN0YWdlc30gJHt0KFwiY29tcGxldGVkXCIpfWA7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdGF0aWMgbWV0aG9kIHRvIGNyZWF0ZSBhbmQgcmVuZGVyIGEgd29ya2Zsb3cgcHJvZ3Jlc3MgaW5kaWNhdG9yXHJcblx0ICovXHJcblx0c3RhdGljIGNyZWF0ZShcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0d29ya2Zsb3c6IFdvcmtmbG93RGVmaW5pdGlvbixcclxuXHRcdGN1cnJlbnRTdGFnZUlkOiBzdHJpbmcsXHJcblx0XHRjb21wbGV0ZWRTdGFnZXM6IHN0cmluZ1tdID0gW11cclxuXHQpOiBXb3JrZmxvd1Byb2dyZXNzSW5kaWNhdG9yIHtcclxuXHRcdGNvbnN0IGluZGljYXRvciA9IG5ldyBXb3JrZmxvd1Byb2dyZXNzSW5kaWNhdG9yKFxyXG5cdFx0XHRjb250YWluZXJFbCxcclxuXHRcdFx0cGx1Z2luLFxyXG5cdFx0XHR3b3JrZmxvdyxcclxuXHRcdFx0Y3VycmVudFN0YWdlSWQsXHJcblx0XHRcdGNvbXBsZXRlZFN0YWdlc1xyXG5cdFx0KTtcclxuXHRcdGluZGljYXRvci5sb2FkKCk7XHJcblx0XHRyZXR1cm4gaW5kaWNhdG9yO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2FsY3VsYXRlcyBjb21wbGV0ZWQgc3RhZ2VzIGZyb20gYSB3b3JrZmxvdyB0YXNrIGhpZXJhcmNoeVxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjYWxjdWxhdGVDb21wbGV0ZWRTdGFnZXMoXHJcblx0XHR3b3JrZmxvd1Rhc2tzOiBBcnJheTx7IHN0YWdlOiBzdHJpbmc7IGNvbXBsZXRlZDogYm9vbGVhbiB9PixcclxuXHRcdHdvcmtmbG93OiBXb3JrZmxvd0RlZmluaXRpb25cclxuXHQpOiBzdHJpbmdbXSB7XHJcblx0XHRjb25zdCBjb21wbGV0ZWQ6IHN0cmluZ1tdID0gW107XHJcblx0XHRcclxuXHRcdC8vIFNpbXBsZSBoZXVyaXN0aWM6IGEgc3RhZ2UgaXMgY29tcGxldGVkIGlmIGFsbCBpdHMgdGFza3MgYXJlIGNvbXBsZXRlZFxyXG5cdFx0Y29uc3Qgc3RhZ2VUYXNrQ291bnRzID0gbmV3IE1hcDxzdHJpbmcsIHsgdG90YWw6IG51bWJlcjsgY29tcGxldGVkOiBudW1iZXIgfT4oKTtcclxuXHRcdFxyXG5cdFx0d29ya2Zsb3dUYXNrcy5mb3JFYWNoKHRhc2sgPT4ge1xyXG5cdFx0XHRjb25zdCBjdXJyZW50ID0gc3RhZ2VUYXNrQ291bnRzLmdldCh0YXNrLnN0YWdlKSB8fCB7IHRvdGFsOiAwLCBjb21wbGV0ZWQ6IDAgfTtcclxuXHRcdFx0Y3VycmVudC50b3RhbCsrO1xyXG5cdFx0XHRpZiAodGFzay5jb21wbGV0ZWQpIHtcclxuXHRcdFx0XHRjdXJyZW50LmNvbXBsZXRlZCsrO1xyXG5cdFx0XHR9XHJcblx0XHRcdHN0YWdlVGFza0NvdW50cy5zZXQodGFzay5zdGFnZSwgY3VycmVudCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRzdGFnZVRhc2tDb3VudHMuZm9yRWFjaCgoY291bnRzLCBzdGFnZUlkKSA9PiB7XHJcblx0XHRcdGlmIChjb3VudHMuY29tcGxldGVkID09PSBjb3VudHMudG90YWwgJiYgY291bnRzLnRvdGFsID4gMCkge1xyXG5cdFx0XHRcdGNvbXBsZXRlZC5wdXNoKHN0YWdlSWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gY29tcGxldGVkO1xyXG5cdH1cclxufVxyXG4iXX0=