/**
 * Simple rebuild progress tracker using Obsidian's Notice component
 */
import { Notice } from "obsidian";
/**
 * Manages rebuild progress notifications using a single persistent Notice
 */
export class RebuildProgressManager {
    constructor() {
        this.notice = null;
        this.startTime = 0;
        this.processedFiles = 0;
        this.totalFiles = 0;
        this.tasksFound = 0;
    }
    /**
     * Start tracking rebuild progress
     */
    startRebuild(totalFiles, reason) {
        this.startTime = Date.now();
        this.processedFiles = 0;
        this.totalFiles = totalFiles;
        this.tasksFound = 0;
        // Create persistent notice (duration: 0 means it won't auto-hide)
        const reasonText = reason ? ` (${reason})` : "";
        this.notice = new Notice(`Task Genius: Starting rebuild${reasonText}...`, 0);
    }
    /**
     * Update progress with current step information
     */
    updateStep(step, currentFile) {
        if (!this.notice)
            return;
        let message = `Task Genius: ${step}`;
        if (this.totalFiles > 0) {
            const percentage = Math.round((this.processedFiles / this.totalFiles) * 100);
            message += ` (${this.processedFiles}/${this.totalFiles} - ${percentage}%)`;
        }
        if (this.tasksFound > 0) {
            message += ` - ${this.tasksFound} tasks found`;
        }
        if (currentFile) {
            const fileName = currentFile.split("/").pop() || currentFile;
            message += ` - ${fileName}`;
        }
        this.notice.setMessage(message);
    }
    /**
     * Increment processed files count and update progress
     */
    incrementProcessedFiles(tasksFound = 0) {
        this.processedFiles++;
        this.tasksFound += tasksFound;
        if (!this.notice)
            return;
        const percentage = this.totalFiles > 0
            ? Math.round((this.processedFiles / this.totalFiles) * 100)
            : 0;
        const message = `Task Genius: Processing files (${this.processedFiles}/${this.totalFiles} - ${percentage}%) - ${this.tasksFound} tasks found`;
        this.notice.setMessage(message);
    }
    /**
     * Mark rebuild as complete and show final statistics
     */
    completeRebuild(finalTaskCount) {
        if (!this.notice)
            return;
        const duration = Date.now() - this.startTime;
        const durationText = duration > 1000
            ? `${Math.round(duration / 1000)}s`
            : `${duration}ms`;
        const taskCount = finalTaskCount !== null && finalTaskCount !== void 0 ? finalTaskCount : this.tasksFound;
        const message = `Task Genius: Rebuild complete! Found ${taskCount} tasks in ${durationText}`;
        this.notice.setMessage(message);
        // Auto-hide the completion notice after 3 seconds
        setTimeout(() => {
            if (this.notice) {
                this.notice.hide();
                this.notice = null;
            }
        }, 3000);
    }
    /**
     * Mark rebuild as failed and show error
     */
    failRebuild(error) {
        if (!this.notice)
            return;
        const message = `Task Genius: Rebuild failed - ${error}`;
        this.notice.setMessage(message);
        // Auto-hide the error notice after 5 seconds
        setTimeout(() => {
            if (this.notice) {
                this.notice.hide();
                this.notice = null;
            }
        }, 5000);
    }
    /**
     * Clean up and hide any active notice
     */
    cleanup() {
        if (this.notice) {
            this.notice.hide();
            this.notice = null;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVidWlsZC1wcm9ncmVzcy1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmVidWlsZC1wcm9ncmVzcy1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBRUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVsQzs7R0FFRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUFBbkM7UUFDUyxXQUFNLEdBQWtCLElBQUksQ0FBQztRQUM3QixjQUFTLEdBQVcsQ0FBQyxDQUFDO1FBQ3RCLG1CQUFjLEdBQVcsQ0FBQyxDQUFDO1FBQzNCLGVBQVUsR0FBVyxDQUFDLENBQUM7UUFDdkIsZUFBVSxHQUFXLENBQUMsQ0FBQztJQXFIaEMsQ0FBQztJQW5IQTs7T0FFRztJQUNJLFlBQVksQ0FBQyxVQUFrQixFQUFFLE1BQWU7UUFDdEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7UUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUM7UUFFcEIsa0VBQWtFO1FBQ2xFLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2hELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQ3ZCLGdDQUFnQyxVQUFVLEtBQUssRUFDL0MsQ0FBQyxDQUNELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxVQUFVLENBQUMsSUFBWSxFQUFFLFdBQW9CO1FBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU87UUFFekIsSUFBSSxPQUFPLEdBQUcsZ0JBQWdCLElBQUksRUFBRSxDQUFDO1FBRXJDLElBQUksSUFBSSxDQUFDLFVB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NkNBQTZDO1FBQzdDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDZixJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Z0JBQ2hCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2FBQ25CO1FBQ0YsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksT0FBTztRQUNiLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNoQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO1NBQ25CO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFNpbXBsZSByZWJ1aWxkIHByb2dyZXNzIHRyYWNrZXIgdXNpbmcgT2JzaWRpYW4ncyBOb3RpY2UgY29tcG9uZW50XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTm90aWNlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vKipcclxuICogTWFuYWdlcyByZWJ1aWxkIHByb2dyZXNzIG5vdGlmaWNhdGlvbnMgdXNpbmcgYSBzaW5nbGUgcGVyc2lzdGVudCBOb3RpY2VcclxuICovXHJcbmV4cG9ydCBjbGFzcyBSZWJ1aWxkUHJvZ3Jlc3NNYW5hZ2VyIHtcclxuXHRwcml2YXRlIG5vdGljZTogTm90aWNlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzdGFydFRpbWU6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSBwcm9jZXNzZWRGaWxlczogbnVtYmVyID0gMDtcclxuXHRwcml2YXRlIHRvdGFsRmlsZXM6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSB0YXNrc0ZvdW5kOiBudW1iZXIgPSAwO1xyXG5cclxuXHQvKipcclxuXHQgKiBTdGFydCB0cmFja2luZyByZWJ1aWxkIHByb2dyZXNzXHJcblx0ICovXHJcblx0cHVibGljIHN0YXJ0UmVidWlsZCh0b3RhbEZpbGVzOiBudW1iZXIsIHJlYXNvbj86IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0dGhpcy5zdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0dGhpcy5wcm9jZXNzZWRGaWxlcyA9IDA7XHJcblx0XHR0aGlzLnRvdGFsRmlsZXMgPSB0b3RhbEZpbGVzO1xyXG5cdFx0dGhpcy50YXNrc0ZvdW5kID0gMDtcclxuXHJcblx0XHQvLyBDcmVhdGUgcGVyc2lzdGVudCBub3RpY2UgKGR1cmF0aW9uOiAwIG1lYW5zIGl0IHdvbid0IGF1dG8taGlkZSlcclxuXHRcdGNvbnN0IHJlYXNvblRleHQgPSByZWFzb24gPyBgICgke3JlYXNvbn0pYCA6IFwiXCI7XHJcblx0XHR0aGlzLm5vdGljZSA9IG5ldyBOb3RpY2UoXHJcblx0XHRcdGBUYXNrIEdlbml1czogU3RhcnRpbmcgcmVidWlsZCR7cmVhc29uVGV4dH0uLi5gLFxyXG5cdFx0XHQwXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHByb2dyZXNzIHdpdGggY3VycmVudCBzdGVwIGluZm9ybWF0aW9uXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVN0ZXAoc3RlcDogc3RyaW5nLCBjdXJyZW50RmlsZT86IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLm5vdGljZSkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCBtZXNzYWdlID0gYFRhc2sgR2VuaXVzOiAke3N0ZXB9YDtcclxuXHJcblx0XHRpZiAodGhpcy50b3RhbEZpbGVzID4gMCkge1xyXG5cdFx0XHRjb25zdCBwZXJjZW50YWdlID0gTWF0aC5yb3VuZChcclxuXHRcdFx0XHQodGhpcy5wcm9jZXNzZWRGaWxlcyAvIHRoaXMudG90YWxGaWxlcykgKiAxMDBcclxuXHRcdFx0KTtcclxuXHRcdFx0bWVzc2FnZSArPSBgICgke3RoaXMucHJvY2Vzc2VkRmlsZXN9LyR7dGhpcy50b3RhbEZpbGVzfSAtICR7cGVyY2VudGFnZX0lKWA7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMudGFza3NGb3VuZCA+IDApIHtcclxuXHRcdFx0bWVzc2FnZSArPSBgIC0gJHt0aGlzLnRhc2tzRm91bmR9IHRhc2tzIGZvdW5kYDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoY3VycmVudEZpbGUpIHtcclxuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSBjdXJyZW50RmlsZS5zcGxpdChcIi9cIikucG9wKCkgfHwgY3VycmVudEZpbGU7XHJcblx0XHRcdG1lc3NhZ2UgKz0gYCAtICR7ZmlsZU5hbWV9YDtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLm5vdGljZS5zZXRNZXNzYWdlKG1lc3NhZ2UpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5jcmVtZW50IHByb2Nlc3NlZCBmaWxlcyBjb3VudCBhbmQgdXBkYXRlIHByb2dyZXNzXHJcblx0ICovXHJcblx0cHVibGljIGluY3JlbWVudFByb2Nlc3NlZEZpbGVzKHRhc2tzRm91bmQ6IG51bWJlciA9IDApOiB2b2lkIHtcclxuXHRcdHRoaXMucHJvY2Vzc2VkRmlsZXMrKztcclxuXHRcdHRoaXMudGFza3NGb3VuZCArPSB0YXNrc0ZvdW5kO1xyXG5cclxuXHRcdGlmICghdGhpcy5ub3RpY2UpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBwZXJjZW50YWdlID1cclxuXHRcdFx0dGhpcy50b3RhbEZpbGVzID4gMFxyXG5cdFx0XHRcdD8gTWF0aC5yb3VuZCgodGhpcy5wcm9jZXNzZWRGaWxlcyAvIHRoaXMudG90YWxGaWxlcykgKiAxMDApXHJcblx0XHRcdFx0OiAwO1xyXG5cclxuXHRcdGNvbnN0IG1lc3NhZ2UgPSBgVGFzayBHZW5pdXM6IFByb2Nlc3NpbmcgZmlsZXMgKCR7dGhpcy5wcm9jZXNzZWRGaWxlc30vJHt0aGlzLnRvdGFsRmlsZXN9IC0gJHtwZXJjZW50YWdlfSUpIC0gJHt0aGlzLnRhc2tzRm91bmR9IHRhc2tzIGZvdW5kYDtcclxuXHRcdHRoaXMubm90aWNlLnNldE1lc3NhZ2UobWVzc2FnZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBNYXJrIHJlYnVpbGQgYXMgY29tcGxldGUgYW5kIHNob3cgZmluYWwgc3RhdGlzdGljc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBjb21wbGV0ZVJlYnVpbGQoZmluYWxUYXNrQ291bnQ/OiBudW1iZXIpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5ub3RpY2UpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSB0aGlzLnN0YXJ0VGltZTtcclxuXHRcdGNvbnN0IGR1cmF0aW9uVGV4dCA9XHJcblx0XHRcdGR1cmF0aW9uID4gMTAwMFxyXG5cdFx0XHRcdD8gYCR7TWF0aC5yb3VuZChkdXJhdGlvbiAvIDEwMDApfXNgXHJcblx0XHRcdFx0OiBgJHtkdXJhdGlvbn1tc2A7XHJcblxyXG5cdFx0Y29uc3QgdGFza0NvdW50ID0gZmluYWxUYXNrQ291bnQgPz8gdGhpcy50YXNrc0ZvdW5kO1xyXG5cdFx0Y29uc3QgbWVzc2FnZSA9IGBUYXNrIEdlbml1czogUmVidWlsZCBjb21wbGV0ZSEgRm91bmQgJHt0YXNrQ291bnR9IHRhc2tzIGluICR7ZHVyYXRpb25UZXh0fWA7XHJcblxyXG5cdFx0dGhpcy5ub3RpY2Uuc2V0TWVzc2FnZShtZXNzYWdlKTtcclxuXHJcblx0XHQvLyBBdXRvLWhpZGUgdGhlIGNvbXBsZXRpb24gbm90aWNlIGFmdGVyIDMgc2Vjb25kc1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm5vdGljZSkge1xyXG5cdFx0XHRcdHRoaXMubm90aWNlLmhpZGUoKTtcclxuXHRcdFx0XHR0aGlzLm5vdGljZSA9IG51bGw7XHJcblx0XHRcdH1cclxuXHRcdH0sIDMwMDApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTWFyayByZWJ1aWxkIGFzIGZhaWxlZCBhbmQgc2hvdyBlcnJvclxyXG5cdCAqL1xyXG5cdHB1YmxpYyBmYWlsUmVidWlsZChlcnJvcjogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMubm90aWNlKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgbWVzc2FnZSA9IGBUYXNrIEdlbml1czogUmVidWlsZCBmYWlsZWQgLSAke2Vycm9yfWA7XHJcblx0XHR0aGlzLm5vdGljZS5zZXRNZXNzYWdlKG1lc3NhZ2UpO1xyXG5cclxuXHRcdC8vIEF1dG8taGlkZSB0aGUgZXJyb3Igbm90aWNlIGFmdGVyIDUgc2Vjb25kc1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdGlmICh0aGlzLm5vdGljZSkge1xyXG5cdFx0XHRcdHRoaXMubm90aWNlLmhpZGUoKTtcclxuXHRcdFx0XHR0aGlzLm5vdGljZSA9IG51bGw7XHJcblx0XHRcdH1cclxuXHRcdH0sIDUwMDApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2xlYW4gdXAgYW5kIGhpZGUgYW55IGFjdGl2ZSBub3RpY2VcclxuXHQgKi9cclxuXHRwdWJsaWMgY2xlYW51cCgpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLm5vdGljZSkge1xyXG5cdFx0XHR0aGlzLm5vdGljZS5oaWRlKCk7XHJcblx0XHRcdHRoaXMubm90aWNlID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuIl19