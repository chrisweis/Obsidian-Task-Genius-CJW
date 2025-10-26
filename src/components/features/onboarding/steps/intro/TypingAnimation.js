export class TypingAnimation {
    constructor(container, messages, onComplete) {
        this.timers = [];
        this.container = container;
        this.messages = messages;
        this.onComplete = onComplete;
        this.start();
    }
    /**
     * Start the typing animation sequence
     */
    start() {
        this.animateSequence(0);
    }
    /**
     * Animate a sequence of messages
     */
    animateSequence(index) {
        if (index >= this.messages.length) {
            // All messages complete
            this.onComplete();
            return;
        }
        const message = this.messages[index];
        const { text, className = "intro-line", speed = 25, fadeOut = false, pauseAfter = 0, fadeOutDelay = 600, fadeOutDuration = 500, delayNext = 300, } = message;
        // Create line element
        const lineEl = this.container.createEl("p", {
            cls: `intro-line ${className}`,
        });
        // Create character spans
        const chars = [];
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const span = lineEl.createSpan({
                cls: "intro-char",
                text: char,
            });
            if (char === " ") {
                span.addClass("intro-char-space");
            }
            chars.push(span);
        }
        // Create cursor
        const cursor = lineEl.createSpan({
            cls: "intro-cursor",
            text: "▊",
        });
        // Animate characters
        let charIndex = 0;
        const animateChar = () => {
            if (charIndex < chars.length) {
                const char = chars[charIndex];
                const jitter = Math.random() * speed * 0.3;
                char.addClass("intro-char-visible");
                // Move cursor
                char.after(cursor);
                charIndex++;
                const id = window.setTimeout(animateChar, speed + jitter);
                this.timers.push(id);
            }
            else {
                // Line complete
                cursor.remove();
                lineEl.addClass("stream-complete");
                // Pause after typing (if specified)
                const pauseDelay = pauseAfter || 0;
                const pauseId = window.setTimeout(() => {
                    // Handle fade out
                    if (fadeOut) {
                        const fadeId = window.setTimeout(() => {
                            // Fade out ALL previous lines including current
                            const lines = this.container.querySelectorAll(".intro-line");
                            lines.forEach((line, i) => {
                                if (i <= index) {
                                    line.addClass("intro-line-fadeout");
                                }
                            });
                            // Remove faded lines after animation
                            const removeId = window.setTimeout(() => {
                                lines.forEach((line, i) => {
                                    if (i <= index) {
                                        line.remove();
                                    }
                                });
                                // Continue to next message after delay
                                const nextId = window.setTimeout(() => this.animateSequence(index + 1), delayNext);
                                this.timers.push(nextId);
                            }, fadeOutDuration);
                            this.timers.push(removeId);
                        }, fadeOutDelay);
                        this.timers.push(fadeId);
                    }
                    else {
                        // Continue to next message after delay
                        const id = window.setTimeout(() => this.animateSequence(index + 1), delayNext);
                        this.timers.push(id);
                    }
                }, pauseDelay);
                this.timers.push(pauseId);
            }
        };
        // Start animation
        animateChar();
    }
    /**
     * Cleanup timers
     */
    cleanup() {
        this.timers.forEach((id) => window.clearTimeout(id));
        this.timers = [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHlwaW5nQW5pbWF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVHlwaW5nQW5pbWF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQWVBLE1BQU0sT0FBTyxlQUFlO0lBTTNCLFlBQ0MsU0FBc0IsRUFDdEIsUUFBeUIsRUFDekIsVUFBc0I7UUFMZixXQUFNLEdBQWEsRUFBRSxDQUFDO1FBTzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNkLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUs7UUFDWixJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxLQUFhO1FBQ3BDLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO1lBQ2xDLHdCQUF3QjtZQUN4QixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbEIsT0FBTztTQUNQO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQyxNQUFNLEVBQ0wsSUFBSSxFQUNKLFNBQVMsR0FBRyxZQUFZLEVBQ3hCLEtBQUssR0FBRyxFQUFFLEVBQ1YsT0FBTyxHQUFHLEtBQUssRUFDZixVQUFVLEdBQUcsQ0FBQyxFQUNkLFlBQVksR0FBRyxHQUFHLEVBQ2xCLGVBQWUsR0FBRyxHQUFHLEVBQ3JCLFNBQVMsR0FBRyxHQUFHLEdBQ2YsR0FBRyxPQUFPLENBQUM7UUFFWixzQkFBc0I7UUFDdEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQzNDLEdBQUcsRUFBRSxjQUFjLFNBQVMs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VUFBVSxDQUMvQixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsRUFDckMsU0FBUyxDQUNULENBQUM7Z0NBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7NEJBQzFCLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQzs0QkFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7d0JBQzVCLENBQUMsRUFBRSxZQUFZLENBQUMsQ0FBQzt3QkFDakIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7cUJBQ3pCO3lCQUFNO3dCQUNOLHVDQUF1Qzt3QkFDdkMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FDM0IsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEVBQ3JDLFNBQVMsQ0FDVCxDQUFDO3dCQUNGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNyQjtnQkFDRixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7YUFDMUI7UUFDRixDQUFDLENBQUM7UUFFRixrQkFBa0I7UUFDbEIsV0FBVyxFQUFFLENBQUM7SUFDZixDQUFDO0lBRUQ7O09BRUc7SUFDSCxPQUFPO1FBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQUktc3R5bGUgdHlwaW5nIGFuaW1hdGlvbiBmb3IgaW50cm8gbWVzc2FnZXNcclxuICogQ2hhcmFjdGVycyBmYWRlIGluIHNtb290aGx5IHdpdGggYSBtb3ZpbmcgY3Vyc29yXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFR5cGluZ01lc3NhZ2Uge1xyXG5cdHRleHQ6IHN0cmluZztcclxuXHRjbGFzc05hbWU/OiBzdHJpbmc7XHJcblx0c3BlZWQ/OiBudW1iZXI7XHJcblx0ZmFkZU91dD86IGJvb2xlYW47XHJcblx0cGF1c2VBZnRlcj86IG51bWJlcjsgLy8gUGF1c2UgYWZ0ZXIgdHlwaW5nIHRoaXMgbGluZSAobXMpXHJcblx0ZmFkZU91dERlbGF5PzogbnVtYmVyOyAvLyBXYWl0IGJlZm9yZSBzdGFydGluZyBmYWRlIG91dCAobXMpXHJcblx0ZmFkZU91dER1cmF0aW9uPzogbnVtYmVyOyAvLyBEdXJhdGlvbiBvZiBmYWRlIG91dCBhbmltYXRpb24gKG1zKVxyXG5cdGRlbGF5TmV4dD86IG51bWJlcjsgLy8gRGVsYXkgYmVmb3JlIG5leHQgbWVzc2FnZSAobXMpXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUeXBpbmdBbmltYXRpb24ge1xyXG5cdHByaXZhdGUgY29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIG1lc3NhZ2VzOiBUeXBpbmdNZXNzYWdlW107XHJcblx0cHJpdmF0ZSBvbkNvbXBsZXRlOiAoKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgdGltZXJzOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRtZXNzYWdlczogVHlwaW5nTWVzc2FnZVtdLFxyXG5cdFx0b25Db21wbGV0ZTogKCkgPT4gdm9pZFxyXG5cdCkge1xyXG5cdFx0dGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XHJcblx0XHR0aGlzLm1lc3NhZ2VzID0gbWVzc2FnZXM7XHJcblx0XHR0aGlzLm9uQ29tcGxldGUgPSBvbkNvbXBsZXRlO1xyXG5cdFx0dGhpcy5zdGFydCgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RhcnQgdGhlIHR5cGluZyBhbmltYXRpb24gc2VxdWVuY2VcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXJ0KCkge1xyXG5cdFx0dGhpcy5hbmltYXRlU2VxdWVuY2UoMCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBbmltYXRlIGEgc2VxdWVuY2Ugb2YgbWVzc2FnZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFuaW1hdGVTZXF1ZW5jZShpbmRleDogbnVtYmVyKSB7XHJcblx0XHRpZiAoaW5kZXggPj0gdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcclxuXHRcdFx0Ly8gQWxsIG1lc3NhZ2VzIGNvbXBsZXRlXHJcblx0XHRcdHRoaXMub25Db21wbGV0ZSgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbWVzc2FnZSA9IHRoaXMubWVzc2FnZXNbaW5kZXhdO1xyXG5cdFx0Y29uc3Qge1xyXG5cdFx0XHR0ZXh0LFxyXG5cdFx0XHRjbGFzc05hbWUgPSBcImludHJvLWxpbmVcIixcclxuXHRcdFx0c3BlZWQgPSAyNSxcclxuXHRcdFx0ZmFkZU91dCA9IGZhbHNlLFxyXG5cdFx0XHRwYXVzZUFmdGVyID0gMCxcclxuXHRcdFx0ZmFkZU91dERlbGF5ID0gNjAwLFxyXG5cdFx0XHRmYWRlT3V0RHVyYXRpb24gPSA1MDAsXHJcblx0XHRcdGRlbGF5TmV4dCA9IDMwMCxcclxuXHRcdH0gPSBtZXNzYWdlO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBsaW5lIGVsZW1lbnRcclxuXHRcdGNvbnN0IGxpbmVFbCA9IHRoaXMuY29udGFpbmVyLmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdGNsczogYGludHJvLWxpbmUgJHtjbGFzc05hbWV9YCxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjaGFyYWN0ZXIgc3BhbnNcclxuXHRcdGNvbnN0IGNoYXJzOiBIVE1MRWxlbWVudFtdID0gW107XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRleHQubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0Y29uc3QgY2hhciA9IHRleHRbaV07XHJcblx0XHRcdGNvbnN0IHNwYW4gPSBsaW5lRWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdFx0Y2xzOiBcImludHJvLWNoYXJcIixcclxuXHRcdFx0XHR0ZXh0OiBjaGFyLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKGNoYXIgPT09IFwiIFwiKSB7XHJcblx0XHRcdFx0c3Bhbi5hZGRDbGFzcyhcImludHJvLWNoYXItc3BhY2VcIik7XHJcblx0XHRcdH1cclxuXHRcdFx0Y2hhcnMucHVzaChzcGFuKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgY3Vyc29yXHJcblx0XHRjb25zdCBjdXJzb3IgPSBsaW5lRWwuY3JlYXRlU3Bhbih7XHJcblx0XHRcdGNsczogXCJpbnRyby1jdXJzb3JcIixcclxuXHRcdFx0dGV4dDogXCLilopcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEFuaW1hdGUgY2hhcmFjdGVyc1xyXG5cdFx0bGV0IGNoYXJJbmRleCA9IDA7XHJcblx0XHRjb25zdCBhbmltYXRlQ2hhciA9ICgpID0+IHtcclxuXHRcdFx0aWYgKGNoYXJJbmRleCA8IGNoYXJzLmxlbmd0aCkge1xyXG5cdFx0XHRcdGNvbnN0IGNoYXIgPSBjaGFyc1tjaGFySW5kZXhdO1xyXG5cdFx0XHRcdGNvbnN0IGppdHRlciA9IE1hdGgucmFuZG9tKCkgKiBzcGVlZCAqIDAuMztcclxuXHRcdFx0XHRjaGFyLmFkZENsYXNzKFwiaW50cm8tY2hhci12aXNpYmxlXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBNb3ZlIGN1cnNvclxyXG5cdFx0XHRcdGNoYXIuYWZ0ZXIoY3Vyc29yKTtcclxuXHJcblx0XHRcdFx0Y2hhckluZGV4Kys7XHJcblx0XHRcdFx0Y29uc3QgaWQgPSB3aW5kb3cuc2V0VGltZW91dChhbmltYXRlQ2hhciwgc3BlZWQgKyBqaXR0ZXIpO1xyXG5cdFx0XHRcdHRoaXMudGltZXJzLnB1c2goaWQpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIExpbmUgY29tcGxldGVcclxuXHRcdFx0XHRjdXJzb3IucmVtb3ZlKCk7XHJcblx0XHRcdFx0bGluZUVsLmFkZENsYXNzKFwic3RyZWFtLWNvbXBsZXRlXCIpO1xyXG5cclxuXHRcdFx0XHQvLyBQYXVzZSBhZnRlciB0eXBpbmcgKGlmIHNwZWNpZmllZClcclxuXHRcdFx0XHRjb25zdCBwYXVzZURlbGF5ID0gcGF1c2VBZnRlciB8fCAwO1xyXG5cdFx0XHRcdGNvbnN0IHBhdXNlSWQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHQvLyBIYW5kbGUgZmFkZSBvdXRcclxuXHRcdFx0XHRcdGlmIChmYWRlT3V0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGZhZGVJZCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBGYWRlIG91dCBBTEwgcHJldmlvdXMgbGluZXMgaW5jbHVkaW5nIGN1cnJlbnRcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBsaW5lcyA9XHJcblx0XHRcdFx0XHRcdFx0XHR0aGlzLmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFwiLmludHJvLWxpbmVcIik7XHJcblx0XHRcdFx0XHRcdFx0bGluZXMuZm9yRWFjaCgobGluZSwgaSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGkgPD0gaW5kZXgpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bGluZS5hZGRDbGFzcyhcImludHJvLWxpbmUtZmFkZW91dFwiKTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gUmVtb3ZlIGZhZGVkIGxpbmVzIGFmdGVyIGFuaW1hdGlvblxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHJlbW92ZUlkID0gd2luZG93LnNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0bGluZXMuZm9yRWFjaCgobGluZSwgaSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoaSA8PSBpbmRleCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGxpbmUucmVtb3ZlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdC8vIENvbnRpbnVlIHRvIG5leHQgbWVzc2FnZSBhZnRlciBkZWxheVxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgbmV4dElkID0gd2luZG93LnNldFRpbWVvdXQoXHJcblx0XHRcdFx0XHRcdFx0XHRcdCgpID0+IHRoaXMuYW5pbWF0ZVNlcXVlbmNlKGluZGV4ICsgMSksXHJcblx0XHRcdFx0XHRcdFx0XHRcdGRlbGF5TmV4dFxyXG5cdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMudGltZXJzLnB1c2gobmV4dElkKTtcclxuXHRcdFx0XHRcdFx0XHR9LCBmYWRlT3V0RHVyYXRpb24pO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudGltZXJzLnB1c2gocmVtb3ZlSWQpO1xyXG5cdFx0XHRcdFx0XHR9LCBmYWRlT3V0RGVsYXkpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRpbWVycy5wdXNoKGZhZGVJZCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBDb250aW51ZSB0byBuZXh0IG1lc3NhZ2UgYWZ0ZXIgZGVsYXlcclxuXHRcdFx0XHRcdFx0Y29uc3QgaWQgPSB3aW5kb3cuc2V0VGltZW91dChcclxuXHRcdFx0XHRcdFx0XHQoKSA9PiB0aGlzLmFuaW1hdGVTZXF1ZW5jZShpbmRleCArIDEpLFxyXG5cdFx0XHRcdFx0XHRcdGRlbGF5TmV4dFxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRpbWVycy5wdXNoKGlkKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LCBwYXVzZURlbGF5KTtcclxuXHRcdFx0XHR0aGlzLnRpbWVycy5wdXNoKHBhdXNlSWQpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFN0YXJ0IGFuaW1hdGlvblxyXG5cdFx0YW5pbWF0ZUNoYXIoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFudXAgdGltZXJzXHJcblx0ICovXHJcblx0Y2xlYW51cCgpIHtcclxuXHRcdHRoaXMudGltZXJzLmZvckVhY2goKGlkKSA9PiB3aW5kb3cuY2xlYXJUaW1lb3V0KGlkKSk7XHJcblx0XHR0aGlzLnRpbWVycyA9IFtdO1xyXG5cdH1cclxufVxyXG4iXX0=