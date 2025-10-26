import { __awaiter } from "tslib";
import { Component } from "obsidian";
import { getStatusIcon } from "../icon";
/**
 * Manages Task Genius Icons functionality
 * Handles CSS style injection, body class management, and cleanup
 */
export class TaskGeniusIconManager extends Component {
    constructor(plugin) {
        super();
        this.styleElement = null;
        this.STYLE_ID = "task-genius-icons-styles";
        this.BODY_CLASS = "task-genius-checkbox";
        this.plugin = plugin;
    }
    onload() {
        return __awaiter(this, void 0, void 0, function* () {
            // Initialize if enabled
            if (this.plugin.settings.enableTaskGeniusIcons) {
                this.enable();
            }
        });
    }
    onunload() {
        this.disable();
    }
    /**
     * Enable Task Genius Icons functionality
     */
    enable() {
        try {
            this.addBodyClass();
            this.injectStyles();
        }
        catch (error) {
            console.error("Task Genius: Failed to enable icons:", error);
        }
    }
    /**
     * Disable Task Genius Icons functionality
     */
    disable() {
        try {
            this.removeBodyClass();
            this.removeStyles();
        }
        catch (error) {
            console.error("Task Genius: Failed to disable icons:", error);
        }
    }
    /**
     * Update functionality when settings change
     */
    update() {
        if (this.plugin.settings.enableTaskGeniusIcons) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    /**
     * Add task-genius-checkbox class to body
     */
    addBodyClass() {
        document.body.classList.add(this.BODY_CLASS);
    }
    /**
     * Remove task-genius-checkbox class from body
     */
    removeBodyClass() {
        document.body.classList.remove(this.BODY_CLASS);
    }
    /**
     * Inject CSS styles into head
     */
    injectStyles() {
        // Remove existing styles first
        this.removeStyles();
        // Generate CSS content
        const cssContent = this.generateCSS();
        // Create and inject style element
        this.styleElement = document.createElement("style");
        this.styleElement.id = this.STYLE_ID;
        this.styleElement.textContent = cssContent;
        document.head.appendChild(this.styleElement);
    }
    /**
     * Remove injected CSS styles
     */
    removeStyles() {
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }
        // Also remove any existing style element with our ID
        const existingStyle = document.getElementById(this.STYLE_ID);
        if (existingStyle) {
            existingStyle.remove();
        }
    }
    /**
     * Generate CSS content based on current settings
     */
    generateCSS() {
        const settings = this.plugin.settings;
        const statusConfigs = this.parseTaskStatuses(settings);
        let css = "";
        for (const config of statusConfigs) {
            const svgIcon = getStatusIcon(config.status);
            const fillColor = this.extractFillColor(svgIcon);
            const encodedSvg = this.encodeSvgForCSS(svgIcon);
            const requireChecked = config.status === "completed"; // Only completed should use :checked
            for (const char of config.chars) {
                css += this.generateCSSRuleForChar(char, encodedSvg, fillColor, requireChecked);
            }
        }
        return css;
    }
    /**
     * Parse taskStatuses configuration into structured format
     */
    parseTaskStatuses(settings) {
        const result = [];
        const statusMap = {
            notStarted: "notStarted",
            inProgress: "inProgress",
            completed: "completed",
            abandoned: "abandoned",
            planned: "planned",
        };
        for (const [statusKey, charString] of Object.entries(settings.taskStatuses)) {
            const status = statusMap[statusKey];
            if (status) {
                const chars = charString.split("|");
                result.push({ status, chars });
            }
        }
        return result;
    }
    /**
     * Extract fill color from SVG, prioritizing path elements
     */
    extractFillColor(svgString) {
        try {
            // First, look for fill attribute in path elements
            const pathFillMatch = svgString.match(/<path[^>]*fill="([^"]+)"/);
            if (pathFillMatch &&
                pathFillMatch[1] &&
                pathFillMatch[1] !== "none" &&
                pathFillMatch[1] !== "currentColor") {
                return pathFillMatch[1];
            }
            // Then, look for stroke attribute in path elements
            const pathStrokeMatch = svgString.match(/<path[^>]*stroke="([^"]+)"/);
            if (pathStrokeMatch &&
                pathStrokeMatch[1] &&
                pathStrokeMatch[1] !== "none" &&
                pathStrokeMatch[1] !== "currentColor") {
                return pathStrokeMatch[1];
            }
            // Fallback: look for any fill attribute in the SVG
            const fillMatch = svgString.match(/fill="([^"]+)"/);
            if (fillMatch &&
                fillMatch[1] &&
                fillMatch[1] !== "none" &&
                fillMatch[1] !== "currentColor") {
                return fillMatch[1];
            }
            // Default fallback color
            return "var(--text-accent)";
        }
        catch (error) {
            console.error("Task Genius: Failed to extract fill color:", error);
            return "var(--text-accent)";
        }
    }
    /**
     * Encode SVG for use in CSS data URI
     */
    encodeSvgForCSS(svgString) {
        try {
            // Clean up SVG but keep width and height attributes
            const cleanSvg = svgString.replace(/\s+/g, " ").trim();
            // Encode special characters for Data URI as per your specification
            const encoded = cleanSvg
                .replace(/"/g, "'") // 双引号 → 单引号
                .replace(/</g, "%3C") // < → %3C
                .replace(/>/g, "%3E") // > → %3E
                .replace(/#/g, "%23") // # → %23
                .replace(/ /g, "%20"); // 空格 → %20
            return `data:image/svg+xml,${encoded}`;
        }
        catch (error) {
            console.error("Task Genius: Failed to encode SVG:", error);
            return "";
        }
    }
    /**
     * Generate CSS rule for a specific character
     */
    generateCSSRuleForChar(char, encodedSvg, fillColor, requireChecked = true) {
        // Escape special characters for CSS selector
        const escapedChar = this.escapeCSSSelector(char);
        const isSpace = char === " ";
        // If we don't require :checked (e.g., planned/inProgress), always show the icon via :after
        if (!requireChecked || isSpace) {
            return `
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox],
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox],
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox] {
    border: none;
}

.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox],
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox],
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox] {
	--checkbox-color: ${fillColor};
	--checkbox-color-hover: ${fillColor};

	background-color: unset;
	border: none;
}
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:after {
    content: "";
    top: -1px;
    inset-inline-start: -1px;
    position: absolute;
    width: var(--checkbox-size);
    height: var(--checkbox-size);
    display: block;
	-webkit-mask-position: 52% 52%;
    -webkit-mask-repeat: no-repeat;
	-webkit-mask-image: url("${encodedSvg}");
	-webkit-mask-size: 100%;
	background-color: ${fillColor};
	transition: filter 0.15s ease;
}
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:hover:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:hover:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:hover:after {
	filter: brightness(0.75);
}
@media (hover: hover) {
	.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:hover,
	.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:hover,
	.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:hover {
		background-color: unset;
		border: none;
	}
}
			`;
        }
        // Default: require :checked to show the icon (completed)
        return `
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox],
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox],
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox] {
    border: none;
}

.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:checked,
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:checked,
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:checked {
	--checkbox-color: ${fillColor};
	--checkbox-color-hover: ${fillColor};

	background-color: unset;
	border: none;
}
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:checked:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:checked:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:checked:after {
	-webkit-mask-image: url("${encodedSvg}");
	-webkit-mask-size: 100%;
	background-color: ${fillColor};
	transition: filter 0.15s ease;
}
.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:checked:hover:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:checked:hover:after,
.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:checked:hover:after {
	filter: brightness(0.75);
}
@media (hover: hover) {
	.${this.BODY_CLASS} [data-task="${escapedChar}"] > input[type=checkbox]:checked:hover,
	.${this.BODY_CLASS} [data-task="${escapedChar}"] > p > input[type=checkbox]:checked:hover,
	.${this.BODY_CLASS} [data-task="${escapedChar}"][type=checkbox]:checked:hover {
		background-color: unset;
		border: none;
	}
}
		`;
    }
    /**
     * Escape special characters for CSS selector
     */
    escapeCSSSelector(char) {
        // Handle space character specially
        if (char === " ") {
            return " ";
        }
        // Escape special CSS characters
        return char.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWNvbi1tYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaWNvbi1tYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRXJDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFHeEM7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFNBQVM7SUFNbkQsWUFBWSxNQUE2QjtRQUN4QyxLQUFLLEVBQUUsQ0FBQztRQUxELGlCQUFZLEdBQTRCLElBQUksQ0FBQztRQUNwQyxhQUFRLEdBQUcsMEJBQTBCLENBQUM7UUFDdEMsZUFBVSxHQUFHLHNCQUFzQixDQUFDO1FBSXBELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3RCLENBQUM7SUFFSyxNQUFNOztZQUNYLHdCQUF3QjtZQUN4QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFO2dCQUMvQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDZDtRQUNGLENBQUM7S0FBQTtJQUVELFFBQVE7UUFDUCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsTUFBTTtRQUNMLElBQUk7WUFDSCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDcEIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQ3BCO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzdEO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNOLElBQUk7WUFDSCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1NBQ3BCO1FBQUMsT0FBTyxLQUFLLEVBQUU7WUFDZixPQUFPLENBQUMs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TztHQUNOLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXOzs7O0dBSTFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO3FCQUN4QixTQUFTOzJCQUNILFNBQVM7Ozs7O0dBS2pDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXOzRCQUNqQixVQUFVOztxQkFFakIsU0FBUzs7O0dBRzNCLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0dBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXOzs7O0lBSXpDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0lBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXO0lBQzFDLElBQUksQ0FBQyxVQUFVLGdCQUFnQixXQUFXOzs7OztHQUszQyxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssaUJBQWlCLENBQUMsSUFBWTtRQUNyQyxtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ2pCLE9BQU8sR0FBRyxDQUFDO1NBQ1g7UUFFRCxnQ0FBZ0M7UUFDaEMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLHNDQUFzQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3JFLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBnZXRTdGF0dXNJY29uIH0gZnJvbSBcIi4uL2ljb25cIjtcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIE1hbmFnZXMgVGFzayBHZW5pdXMgSWNvbnMgZnVuY3Rpb25hbGl0eVxyXG4gKiBIYW5kbGVzIENTUyBzdHlsZSBpbmplY3Rpb24sIGJvZHkgY2xhc3MgbWFuYWdlbWVudCwgYW5kIGNsZWFudXBcclxuICovXHJcbmV4cG9ydCBjbGFzcyBUYXNrR2VuaXVzSWNvbk1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBzdHlsZUVsZW1lbnQ6IEhUTUxTdHlsZUVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHJlYWRvbmx5IFNUWUxFX0lEID0gXCJ0YXNrLWdlbml1cy1pY29ucy1zdHlsZXNcIjtcclxuXHRwcml2YXRlIHJlYWRvbmx5IEJPRFlfQ0xBU1MgPSBcInRhc2stZ2VuaXVzLWNoZWNrYm94XCI7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbmxvYWQoKSB7XHJcblx0XHQvLyBJbml0aWFsaXplIGlmIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5zZXR0aW5ncy5lbmFibGVUYXNrR2VuaXVzSWNvbnMpIHtcclxuXHRcdFx0dGhpcy5lbmFibGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0dGhpcy5kaXNhYmxlKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFbmFibGUgVGFzayBHZW5pdXMgSWNvbnMgZnVuY3Rpb25hbGl0eVxyXG5cdCAqL1xyXG5cdGVuYWJsZSgpIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdHRoaXMuYWRkQm9keUNsYXNzKCk7XHJcblx0XHRcdHRoaXMuaW5qZWN0U3R5bGVzKCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiVGFzayBHZW5pdXM6IEZhaWxlZCB0byBlbmFibGUgaWNvbnM6XCIsIGVycm9yKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERpc2FibGUgVGFzayBHZW5pdXMgSWNvbnMgZnVuY3Rpb25hbGl0eVxyXG5cdCAqL1xyXG5cdGRpc2FibGUoKSB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLnJlbW92ZUJvZHlDbGFzcygpO1xyXG5cdFx0XHR0aGlzLnJlbW92ZVN0eWxlcygpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIlRhc2sgR2VuaXVzOiBGYWlsZWQgdG8gZGlzYWJsZSBpY29uczpcIiwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGZ1bmN0aW9uYWxpdHkgd2hlbiBzZXR0aW5ncyBjaGFuZ2VcclxuXHQgKi9cclxuXHR1cGRhdGUoKSB7XHJcblx0XHRpZiAodGhpcy5wbHVnaW4uc2V0dGluZ3MuZW5hYmxlVGFza0dlbml1c0ljb25zKSB7XHJcblx0XHRcdHRoaXMuZW5hYmxlKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmRpc2FibGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCB0YXNrLWdlbml1cy1jaGVja2JveCBjbGFzcyB0byBib2R5XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhZGRCb2R5Q2xhc3MoKSB7XHJcblx0XHRkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5hZGQodGhpcy5CT0RZX0NMQVNTKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbW92ZSB0YXNrLWdlbml1cy1jaGVja2JveCBjbGFzcyBmcm9tIGJvZHlcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbW92ZUJvZHlDbGFzcygpIHtcclxuXHRcdGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSh0aGlzLkJPRFlfQ0xBU1MpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5qZWN0IENTUyBzdHlsZXMgaW50byBoZWFkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBpbmplY3RTdHlsZXMoKSB7XHJcblx0XHQvLyBSZW1vdmUgZXhpc3Rpbmcgc3R5bGVzIGZpcnN0XHJcblx0XHR0aGlzLnJlbW92ZVN0eWxlcygpO1xyXG5cclxuXHRcdC8vIEdlbmVyYXRlIENTUyBjb250ZW50XHJcblx0XHRjb25zdCBjc3NDb250ZW50ID0gdGhpcy5nZW5lcmF0ZUNTUygpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhbmQgaW5qZWN0IHN0eWxlIGVsZW1lbnRcclxuXHRcdHRoaXMuc3R5bGVFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInN0eWxlXCIpO1xyXG5cdFx0dGhpcy5zdHlsZUVsZW1lbnQuaWQgPSB0aGlzLlNUWUxFX0lEO1xyXG5cdFx0dGhpcy5zdHlsZUVsZW1lbnQudGV4dENvbnRlbnQgPSBjc3NDb250ZW50O1xyXG5cdFx0ZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCh0aGlzLnN0eWxlRWxlbWVudCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW1vdmUgaW5qZWN0ZWQgQ1NTIHN0eWxlc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVtb3ZlU3R5bGVzKCkge1xyXG5cdFx0aWYgKHRoaXMuc3R5bGVFbGVtZW50KSB7XHJcblx0XHRcdHRoaXMuc3R5bGVFbGVtZW50LnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLnN0eWxlRWxlbWVudCA9IG51bGw7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWxzbyByZW1vdmUgYW55IGV4aXN0aW5nIHN0eWxlIGVsZW1lbnQgd2l0aCBvdXIgSURcclxuXHRcdGNvbnN0IGV4aXN0aW5nU3R5bGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLlNUWUxFX0lEKTtcclxuXHRcdGlmIChleGlzdGluZ1N0eWxlKSB7XHJcblx0XHRcdGV4aXN0aW5nU3R5bGUucmVtb3ZlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZW5lcmF0ZSBDU1MgY29udGVudCBiYXNlZCBvbiBjdXJyZW50IHNldHRpbmdzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUNTUygpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3Qgc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncztcclxuXHRcdGNvbnN0IHN0YXR1c0NvbmZpZ3MgPSB0aGlzLnBhcnNlVGFza1N0YXR1c2VzKHNldHRpbmdzKTtcclxuXHJcblx0XHRsZXQgY3NzID0gXCJcIjtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGNvbmZpZyBvZiBzdGF0dXNDb25maWdzKSB7XHJcblx0XHRcdGNvbnN0IHN2Z0ljb24gPSBnZXRTdGF0dXNJY29uKGNvbmZpZy5zdGF0dXMpO1xyXG5cdFx0XHRjb25zdCBmaWxsQ29sb3IgPSB0aGlzLmV4dHJhY3RGaWxsQ29sb3Ioc3ZnSWNvbik7XHJcblx0XHRcdGNvbnN0IGVuY29kZWRTdmcgPSB0aGlzLmVuY29kZVN2Z0ZvckNTUyhzdmdJY29uKTtcclxuXHRcdFx0Y29uc3QgcmVxdWlyZUNoZWNrZWQgPSBjb25maWcuc3RhdHVzID09PSBcImNvbXBsZXRlZFwiOyAvLyBPbmx5IGNvbXBsZXRlZCBzaG91bGQgdXNlIDpjaGVja2VkXHJcblx0XHRcdGZvciAoY29uc3QgY2hhciBvZiBjb25maWcuY2hhcnMpIHtcclxuXHRcdFx0XHRjc3MgKz0gdGhpcy5nZW5lcmF0ZUNTU1J1bGVGb3JDaGFyKFxyXG5cdFx0XHRcdFx0Y2hhcixcclxuXHRcdFx0XHRcdGVuY29kZWRTdmcsXHJcblx0XHRcdFx0XHRmaWxsQ29sb3IsXHJcblx0XHRcdFx0XHRyZXF1aXJlQ2hlY2tlZFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gY3NzO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGFyc2UgdGFza1N0YXR1c2VzIGNvbmZpZ3VyYXRpb24gaW50byBzdHJ1Y3R1cmVkIGZvcm1hdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcGFyc2VUYXNrU3RhdHVzZXMoc2V0dGluZ3M6IFRhc2tQcm9ncmVzc0JhclNldHRpbmdzKTogQXJyYXk8e1xyXG5cdFx0c3RhdHVzOlxyXG5cdFx0XHR8IFwibm90U3RhcnRlZFwiXHJcblx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHRcdHwgXCJhYmFuZG9uZWRcIlxyXG5cdFx0XHR8IFwicGxhbm5lZFwiO1xyXG5cdFx0Y2hhcnM6IHN0cmluZ1tdO1xyXG5cdH0+IHtcclxuXHRcdGNvbnN0IHJlc3VsdDogQXJyYXk8e1xyXG5cdFx0XHRzdGF0dXM6XHJcblx0XHRcdFx0fCBcIm5vdFN0YXJ0ZWRcIlxyXG5cdFx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0XHR8IFwiY29tcGxldGVkXCJcclxuXHRcdFx0XHR8IFwiYWJhbmRvbmVkXCJcclxuXHRcdFx0XHR8IFwicGxhbm5lZFwiO1xyXG5cdFx0XHRjaGFyczogc3RyaW5nW107XHJcblx0XHR9PiA9IFtdO1xyXG5cclxuXHRcdGNvbnN0IHN0YXR1c01hcDogUmVjb3JkPFxyXG5cdFx0XHRzdHJpbmcsXHJcblx0XHRcdFwibm90U3RhcnRlZFwiIHwgXCJpblByb2dyZXNzXCIgfCBcImNvbXBsZXRlZFwiIHwgXCJhYmFuZG9uZWRcIiB8IFwicGxhbm5lZFwiXHJcblx0XHQ+ID0ge1xyXG5cdFx0XHRub3RTdGFydGVkOiBcIm5vdFN0YXJ0ZWRcIixcclxuXHRcdFx0aW5Qcm9ncmVzczogXCJpblByb2dyZXNzXCIsXHJcblx0XHRcdGNvbXBsZXRlZDogXCJjb21wbGV0ZWRcIixcclxuXHRcdFx0YWJhbmRvbmVkOiBcImFiYW5kb25lZFwiLFxyXG5cdFx0XHRwbGFubmVkOiBcInBsYW5uZWRcIixcclxuXHRcdH07XHJcblxyXG5cdFx0Zm9yIChjb25zdCBbc3RhdHVzS2V5LCBjaGFyU3RyaW5nXSBvZiBPYmplY3QuZW50cmllcyhcclxuXHRcdFx0c2V0dGluZ3MudGFza1N0YXR1c2VzXHJcblx0XHQpKSB7XHJcblx0XHRcdGNvbnN0IHN0YXR1cyA9IHN0YXR1c01hcFtzdGF0dXNLZXldO1xyXG5cdFx0XHRpZiAoc3RhdHVzKSB7XHJcblx0XHRcdFx0Y29uc3QgY2hhcnMgPSBjaGFyU3RyaW5nLnNwbGl0KFwifFwiKTtcclxuXHRcdFx0XHRyZXN1bHQucHVzaCh7IHN0YXR1cywgY2hhcnMgfSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gcmVzdWx0O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCBmaWxsIGNvbG9yIGZyb20gU1ZHLCBwcmlvcml0aXppbmcgcGF0aCBlbGVtZW50c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXh0cmFjdEZpbGxDb2xvcihzdmdTdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBGaXJzdCwgbG9vayBmb3IgZmlsbCBhdHRyaWJ1dGUgaW4gcGF0aCBlbGVtZW50c1xyXG5cdFx0XHRjb25zdCBwYXRoRmlsbE1hdGNoID0gc3ZnU3RyaW5nLm1hdGNoKC88cGF0aFtePl0qZmlsbD1cIihbXlwiXSspXCIvKTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHBhdGhGaWxsTWF0Y2ggJiZcclxuXHRcdFx0XHRwYXRoRmlsbE1hdGNoWzFdICYmXHJcblx0XHRcdFx0cGF0aEZpbGxNYXRjaFsxXSAhPT0gXCJub25lXCIgJiZcclxuXHRcdFx0XHRwYXRoRmlsbE1hdGNoWzFdICE9PSBcImN1cnJlbnRDb2xvclwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBwYXRoRmlsbE1hdGNoWzFdO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUaGVuLCBsb29rIGZvciBzdHJva2UgYXR0cmlidXRlIGluIHBhdGggZWxlbWVudHNcclxuXHRcdFx0Y29uc3QgcGF0aFN0cm9rZU1hdGNoID0gc3ZnU3RyaW5nLm1hdGNoKFxyXG5cdFx0XHRcdC88cGF0aFtePl0qc3Ryb2tlPVwiKFteXCJdKylcIi9cclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHBhdGhTdHJva2VNYXRjaCAmJlxyXG5cdFx0XHRcdHBhdGhTdHJva2VNYXRjaFsxXSAmJlxyXG5cdFx0XHRcdHBhdGhTdHJva2VNYXRjaFsxXSAhPT0gXCJub25lXCIgJiZcclxuXHRcdFx0XHRwYXRoU3Ryb2tlTWF0Y2hbMV0gIT09IFwiY3VycmVudENvbG9yXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHBhdGhTdHJva2VNYXRjaFsxXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmFsbGJhY2s6IGxvb2sgZm9yIGFueSBmaWxsIGF0dHJpYnV0ZSBpbiB0aGUgU1ZHXHJcblx0XHRcdGNvbnN0IGZpbGxNYXRjaCA9IHN2Z1N0cmluZy5tYXRjaCgvZmlsbD1cIihbXlwiXSspXCIvKTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGZpbGxNYXRjaCAmJlxyXG5cdFx0XHRcdGZpbGxNYXRjaFsxXSAmJlxyXG5cdFx0XHRcdGZpbGxNYXRjaFsxXSAhPT0gXCJub25lXCIgJiZcclxuXHRcdFx0XHRmaWxsTWF0Y2hbMV0gIT09IFwiY3VycmVudENvbG9yXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIGZpbGxNYXRjaFsxXTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRGVmYXVsdCBmYWxsYmFjayBjb2xvclxyXG5cdFx0XHRyZXR1cm4gXCJ2YXIoLS10ZXh0LWFjY2VudClcIjtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJUYXNrIEdlbml1czogRmFpbGVkIHRvIGV4dHJhY3QgZmlsbCBjb2xvcjpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gXCJ2YXIoLS10ZXh0LWFjY2VudClcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEVuY29kZSBTVkcgZm9yIHVzZSBpbiBDU1MgZGF0YSBVUklcclxuXHQgKi9cclxuXHRwcml2YXRlIGVuY29kZVN2Z0ZvckNTUyhzdmdTdHJpbmc6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBDbGVhbiB1cCBTVkcgYnV0IGtlZXAgd2lkdGggYW5kIGhlaWdodCBhdHRyaWJ1dGVzXHJcblx0XHRcdGNvbnN0IGNsZWFuU3ZnID0gc3ZnU3RyaW5nLnJlcGxhY2UoL1xccysvZywgXCIgXCIpLnRyaW0oKTtcclxuXHJcblx0XHRcdC8vIEVuY29kZSBzcGVjaWFsIGNoYXJhY3RlcnMgZm9yIERhdGEgVVJJIGFzIHBlciB5b3VyIHNwZWNpZmljYXRpb25cclxuXHRcdFx0Y29uc3QgZW5jb2RlZCA9IGNsZWFuU3ZnXHJcblx0XHRcdFx0LnJlcGxhY2UoL1wiL2csIFwiJ1wiKSAvLyDlj4zlvJXlj7cg4oaSIOWNleW8leWPt1xyXG5cdFx0XHRcdC5yZXBsYWNlKC88L2csIFwiJTNDXCIpIC8vIDwg4oaSICUzQ1xyXG5cdFx0XHRcdC5yZXBsYWNlKC8+L2csIFwiJTNFXCIpIC8vID4g4oaSICUzRVxyXG5cdFx0XHRcdC5yZXBsYWNlKC8jL2csIFwiJTIzXCIpIC8vICMg4oaSICUyM1xyXG5cdFx0XHRcdC5yZXBsYWNlKC8gL2csIFwiJTIwXCIpOyAvLyDnqbrmoLwg4oaSICUyMFxyXG5cclxuXHRcdFx0cmV0dXJuIGBkYXRhOmltYWdlL3N2Zyt4bWwsJHtlbmNvZGVkfWA7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiVGFzayBHZW5pdXM6IEZhaWxlZCB0byBlbmNvZGUgU1ZHOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2VuZXJhdGUgQ1NTIHJ1bGUgZm9yIGEgc3BlY2lmaWMgY2hhcmFjdGVyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZW5lcmF0ZUNTU1J1bGVGb3JDaGFyKFxyXG5cdFx0Y2hhcjogc3RyaW5nLFxyXG5cdFx0ZW5jb2RlZFN2Zzogc3RyaW5nLFxyXG5cdFx0ZmlsbENvbG9yOiBzdHJpbmcsXHJcblx0XHRyZXF1aXJlQ2hlY2tlZDogYm9vbGVhbiA9IHRydWVcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Ly8gRXNjYXBlIHNwZWNpYWwgY2hhcmFjdGVycyBmb3IgQ1NTIHNlbGVjdG9yXHJcblx0XHRjb25zdCBlc2NhcGVkQ2hhciA9IHRoaXMuZXNjYXBlQ1NTU2VsZWN0b3IoY2hhcik7XHJcblx0XHRjb25zdCBpc1NwYWNlID0gY2hhciA9PT0gXCIgXCI7XHJcblxyXG5cdFx0Ly8gSWYgd2UgZG9uJ3QgcmVxdWlyZSA6Y2hlY2tlZCAoZS5nLiwgcGxhbm5lZC9pblByb2dyZXNzKSwgYWx3YXlzIHNob3cgdGhlIGljb24gdmlhIDphZnRlclxyXG5cdFx0aWYgKCFyZXF1aXJlQ2hlY2tlZCB8fCBpc1NwYWNlKSB7XHJcblx0XHRcdHJldHVybiBgXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gaW5wdXRbdHlwZT1jaGVja2JveF0sXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gcCA+IGlucHV0W3R5cGU9Y2hlY2tib3hdLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XSB7XHJcbiAgICBib3JkZXI6IG5vbmU7XHJcbn1cclxuXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gaW5wdXRbdHlwZT1jaGVja2JveF0sXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gcCA+IGlucHV0W3R5cGU9Y2hlY2tib3hdLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XSB7XHJcblx0LS1jaGVja2JveC1jb2xvcjogJHtmaWxsQ29sb3J9O1xyXG5cdC0tY2hlY2tib3gtY29sb3ItaG92ZXI6ICR7ZmlsbENvbG9yfTtcclxuXHJcblx0YmFja2dyb3VuZC1jb2xvcjogdW5zZXQ7XHJcblx0Ym9yZGVyOiBub25lO1xyXG59XHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gaW5wdXRbdHlwZT1jaGVja2JveF06YWZ0ZXIsXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gcCA+IGlucHV0W3R5cGU9Y2hlY2tib3hdOmFmdGVyLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XTphZnRlciB7XHJcbiAgICBjb250ZW50OiBcIlwiO1xyXG4gICAgdG9wOiAtMXB4O1xyXG4gICAgaW5zZXQtaW5saW5lLXN0YXJ0OiAtMXB4O1xyXG4gICAgcG9zaXRpb246IGFic29sdXRlO1xyXG4gICAgd2lkdGg6IHZhcigtLWNoZWNrYm94LXNpemUpO1xyXG4gICAgaGVpZ2h0OiB2YXIoLS1jaGVja2JveC1zaXplKTtcclxuICAgIGRpc3BsYXk6IGJsb2NrO1xyXG5cdC13ZWJraXQtbWFzay1wb3NpdGlvbjogNTIlIDUyJTtcclxuICAgIC13ZWJraXQtbWFzay1yZXBlYXQ6IG5vLXJlcGVhdDtcclxuXHQtd2Via2l0LW1hc2staW1hZ2U6IHVybChcIiR7ZW5jb2RlZFN2Z31cIik7XHJcblx0LXdlYmtpdC1tYXNrLXNpemU6IDEwMCU7XHJcblx0YmFja2dyb3VuZC1jb2xvcjogJHtmaWxsQ29sb3J9O1xyXG5cdHRyYW5zaXRpb246IGZpbHRlciAwLjE1cyBlYXNlO1xyXG59XHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gaW5wdXRbdHlwZT1jaGVja2JveF06aG92ZXI6YWZ0ZXIsXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gcCA+IGlucHV0W3R5cGU9Y2hlY2tib3hdOmhvdmVyOmFmdGVyLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XTpob3ZlcjphZnRlciB7XHJcblx0ZmlsdGVyOiBicmlnaHRuZXNzKDAuNzUpO1xyXG59XHJcbkBtZWRpYSAoaG92ZXI6IGhvdmVyKSB7XHJcblx0LiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpob3ZlcixcclxuXHQuJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXSA+IHAgPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpob3ZlcixcclxuXHQuJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XTpob3ZlciB7XHJcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB1bnNldDtcclxuXHRcdGJvcmRlcjogbm9uZTtcclxuXHR9XHJcbn1cclxuXHRcdFx0YDtcclxuXHRcdH1cclxuXHRcdC8vIERlZmF1bHQ6IHJlcXVpcmUgOmNoZWNrZWQgdG8gc2hvdyB0aGUgaWNvbiAoY29tcGxldGVkKVxyXG5cdFx0cmV0dXJuIGBcclxuLiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBpbnB1dFt0eXBlPWNoZWNrYm94XSxcclxuLiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBwID4gaW5wdXRbdHlwZT1jaGVja2JveF0sXHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdW3R5cGU9Y2hlY2tib3hdIHtcclxuICAgIGJvcmRlcjogbm9uZTtcclxufVxyXG5cclxuLiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpjaGVja2VkLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXSA+IHAgPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpjaGVja2VkLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XTpjaGVja2VkIHtcclxuXHQtLWNoZWNrYm94LWNvbG9yOiAke2ZpbGxDb2xvcn07XHJcblx0LS1jaGVja2JveC1jb2xvci1ob3ZlcjogJHtmaWxsQ29sb3J9O1xyXG5cclxuXHRiYWNrZ3JvdW5kLWNvbG9yOiB1bnNldDtcclxuXHRib3JkZXI6IG5vbmU7XHJcbn1cclxuLiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpjaGVja2VkOmFmdGVyLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXSA+IHAgPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpjaGVja2VkOmFmdGVyLFxyXG4uJHt0aGlzLkJPRFlfQ0xBU1N9IFtkYXRhLXRhc2s9XCIke2VzY2FwZWRDaGFyfVwiXVt0eXBlPWNoZWNrYm94XTpjaGVja2VkOmFmdGVyIHtcclxuXHQtd2Via2l0LW1hc2staW1hZ2U6IHVybChcIiR7ZW5jb2RlZFN2Z31cIik7XHJcblx0LXdlYmtpdC1tYXNrLXNpemU6IDEwMCU7XHJcblx0YmFja2dyb3VuZC1jb2xvcjogJHtmaWxsQ29sb3J9O1xyXG5cdHRyYW5zaXRpb246IGZpbHRlciAwLjE1cyBlYXNlO1xyXG59XHJcbi4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gaW5wdXRbdHlwZT1jaGVja2JveF06Y2hlY2tlZDpob3ZlcjphZnRlcixcclxuLiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBwID4gaW5wdXRbdHlwZT1jaGVja2JveF06Y2hlY2tlZDpob3ZlcjphZnRlcixcclxuLiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl1bdHlwZT1jaGVja2JveF06Y2hlY2tlZDpob3ZlcjphZnRlciB7XHJcblx0ZmlsdGVyOiBicmlnaHRuZXNzKDAuNzUpO1xyXG59XHJcbkBtZWRpYSAoaG92ZXI6IGhvdmVyKSB7XHJcblx0LiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl0gPiBpbnB1dFt0eXBlPWNoZWNrYm94XTpjaGVja2VkOmhvdmVyLFxyXG5cdC4ke3RoaXMuQk9EWV9DTEFTU30gW2RhdGEtdGFzaz1cIiR7ZXNjYXBlZENoYXJ9XCJdID4gcCA+IGlucHV0W3R5cGU9Y2hlY2tib3hdOmNoZWNrZWQ6aG92ZXIsXHJcblx0LiR7dGhpcy5CT0RZX0NMQVNTfSBbZGF0YS10YXNrPVwiJHtlc2NhcGVkQ2hhcn1cIl1bdHlwZT1jaGVja2JveF06Y2hlY2tlZDpob3ZlciB7XHJcblx0XHRiYWNrZ3JvdW5kLWNvbG9yOiB1bnNldDtcclxuXHRcdGJvcmRlcjogbm9uZTtcclxuXHR9XHJcbn1cclxuXHRcdGA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGZvciBDU1Mgc2VsZWN0b3JcclxuXHQgKi9cclxuXHRwcml2YXRlIGVzY2FwZUNTU1NlbGVjdG9yKGNoYXI6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHQvLyBIYW5kbGUgc3BhY2UgY2hhcmFjdGVyIHNwZWNpYWxseVxyXG5cdFx0aWYgKGNoYXIgPT09IFwiIFwiKSB7XHJcblx0XHRcdHJldHVybiBcIiBcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFc2NhcGUgc3BlY2lhbCBDU1MgY2hhcmFjdGVyc1xyXG5cdFx0cmV0dXJuIGNoYXIucmVwbGFjZSgvWyFcIiMkJSYnKCkqKywuXFwvOjs8PT4/QFtcXFxcXFxdXmB7fH1+XS9nLCBcIlxcXFwkJlwiKTtcclxuXHR9XHJcbn1cclxuIl19