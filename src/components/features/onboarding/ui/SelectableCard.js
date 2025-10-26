import { setIcon } from "obsidian";
/**
 * Reusable selectable card component with shadcn design principles
 * - Clean borders with subtle shadows
 * - Smooth transitions (200ms cubic-bezier)
 * - Clear selected state
 */
export class SelectableCard {
    constructor(container, configs, options = {}, onSelect) {
        this.selectedId = null;
        this.cards = new Map();
        this.container = container;
        this.onSelect = onSelect;
        this.render(configs, options);
    }
    render(configs, options) {
        const { containerClass = "selectable-cards-container", cardClass = "selectable-card", showIcon = true, showPreview = true, showFeatures = false, } = options;
        // Create container
        const cardsContainer = this.container.createDiv({
            cls: containerClass,
        });
        // Create cards
        configs.forEach((config) => {
            const card = cardsContainer.createDiv({
                cls: `${cardClass} card-${String(config.id)}`,
            });
            // Header
            const header = card.createDiv({ cls: `${cardClass}-header` });
            // Icon
            if (showIcon && config.icon) {
                const iconEl = header.createDiv({ cls: `${cardClass}-icon` });
                setIcon(iconEl, config.icon);
            }
            // Title & subtitle
            const titleContainer = header.createDiv({
                cls: `${cardClass}-title-container`,
            });
            const titleEl = titleContainer.createEl("h3", {
                text: config.title,
                cls: `${cardClass}-title`,
            });
            if (config.subtitle) {
                titleContainer.createEl("span", {
                    text: config.subtitle,
                    cls: `${cardClass}-subtitle`,
                });
            }
            // Badge (optional)
            if (config.badge) {
                const badge = header.createDiv({
                    cls: `${cardClass}-badge`,
                    text: config.badge,
                });
            }
            // Body
            const body = card.createDiv({ cls: `${cardClass}-body` });
            // Preview (optional)
            if (showPreview && config.preview) {
                const previewEl = body.createDiv({
                    cls: `${cardClass}-preview`,
                });
                if (typeof config.preview === "function") {
                    const previewContent = config.preview();
                    previewEl.appendChild(previewContent);
                }
                else {
                    previewEl.appendChild(config.preview);
                }
            }
            // Description
            body.createEl("p", {
                text: config.description,
                cls: `${cardClass}-description`,
            });
            // Features (optional)
            if (showFeatures && config.features && config.features.length > 0) {
                const featuresContainer = body.createDiv({
                    cls: `${cardClass}-features`,
                });
                const featuresList = featuresContainer.createEl("ul");
                config.features.forEach((feature) => {
                    featuresList.createEl("li", { text: feature });
                });
            }
            // Click handler
            card.addEventListener("click", () => {
                this.select(config.id);
            });
            // Keyboard support
            card.setAttribute("tabindex", "0");
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    this.select(config.id);
                }
            });
            // Store card reference
            this.cards.set(config.id, card);
        });
    }
    /**
     * Select a card by id
     */
    select(id) {
        // Deselect previous
        if (this.selectedId !== null) {
            const prevCard = this.cards.get(this.selectedId);
            prevCard === null || prevCard === void 0 ? void 0 : prevCard.removeClass("is-selected");
        }
        // Select new
        this.selectedId = id;
        const newCard = this.cards.get(id);
        newCard === null || newCard === void 0 ? void 0 : newCard.addClass("is-selected");
        // Trigger callback
        this.onSelect(id);
    }
    /**
     * Get selected id
     */
    getSelected() {
        return this.selectedId;
    }
    /**
     * Set selected programmatically
     */
    setSelected(id) {
        if (this.cards.has(id)) {
            this.select(id);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VsZWN0YWJsZUNhcmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJTZWxlY3RhYmxlQ2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBcUJuQzs7Ozs7R0FLRztBQUNILE1BQU0sT0FBTyxjQUFjO0lBTTFCLFlBQ0MsU0FBc0IsRUFDdEIsT0FBa0MsRUFDbEMsVUFBaUMsRUFBRSxFQUNuQyxRQUF5QjtRQVJsQixlQUFVLEdBQWEsSUFBSSxDQUFDO1FBRTVCLFVBQUssR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQVE5QyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBRU8sTUFBTSxDQUNiLE9BQWtDLEVBQ2xDLE9BQThCO1FBRTlCLE1BQU0sRUFDTCxjQUFjLEdBQUcsNEJBQTRCLEVBQzdDLFNBQVMsR0FBRyxpQkFBaUIsRUFDN0IsUUFBUSxHQUFHLElBQUksRUFDZixXQUFXLEdBQUcsSUFBSSxFQUNsQixZQUFZLEdBQUcsS0FBSyxHQUNwQixHQUFHLE9BQU8sQ0FBQztRQUVaLG1CQUFtQjtRQUNuQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztZQUMvQyxHQUFHLEVBQUUsY0FBYztTQUNuQixDQUFDLENBQUM7UUFFSCxlQUFlO1FBQ2YsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQzFCLE1BQU0sSUFBSSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3JDLEdBQUcsRUFBRSxHQUFHLFNBQVMsU0FBUyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2FBQzdDLENBQUMsQ0FBQztZQUVILFNB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QyxDQUFDO1FBQ25DLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFakMsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVztRQUNWLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxXQUFXLENBQUMsRUFBSztRQUNoQixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEI7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNlbGVjdGFibGVDYXJkQ29uZmlnPFQ+IHtcclxuXHRpZDogVDtcclxuXHR0aXRsZTogc3RyaW5nO1xyXG5cdHN1YnRpdGxlPzogc3RyaW5nO1xyXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcblx0aWNvbj86IHN0cmluZztcclxuXHRiYWRnZT86IHN0cmluZztcclxuXHRwcmV2aWV3PzogSFRNTEVsZW1lbnQgfCAoKCkgPT4gSFRNTEVsZW1lbnQpO1xyXG5cdGZlYXR1cmVzPzogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU2VsZWN0YWJsZUNhcmRPcHRpb25zIHtcclxuXHRjb250YWluZXJDbGFzcz86IHN0cmluZyB8IHN0cmluZ1tdO1xyXG5cdGNhcmRDbGFzcz86IHN0cmluZztcclxuXHRzaG93SWNvbj86IGJvb2xlYW47XHJcblx0c2hvd1ByZXZpZXc/OiBib29sZWFuO1xyXG5cdHNob3dGZWF0dXJlcz86IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZXVzYWJsZSBzZWxlY3RhYmxlIGNhcmQgY29tcG9uZW50IHdpdGggc2hhZGNuIGRlc2lnbiBwcmluY2lwbGVzXHJcbiAqIC0gQ2xlYW4gYm9yZGVycyB3aXRoIHN1YnRsZSBzaGFkb3dzXHJcbiAqIC0gU21vb3RoIHRyYW5zaXRpb25zICgyMDBtcyBjdWJpYy1iZXppZXIpXHJcbiAqIC0gQ2xlYXIgc2VsZWN0ZWQgc3RhdGVcclxuICovXHJcbmV4cG9ydCBjbGFzcyBTZWxlY3RhYmxlQ2FyZDxUID0gc3RyaW5nPiB7XHJcblx0cHJpdmF0ZSBjb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRJZDogVCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgb25TZWxlY3Q6IChpZDogVCkgPT4gdm9pZDtcclxuXHRwcml2YXRlIGNhcmRzOiBNYXA8VCwgSFRNTEVsZW1lbnQ+ID0gbmV3IE1hcCgpO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGNvbnRhaW5lcjogSFRNTEVsZW1lbnQsXHJcblx0XHRjb25maWdzOiBTZWxlY3RhYmxlQ2FyZENvbmZpZzxUPltdLFxyXG5cdFx0b3B0aW9uczogU2VsZWN0YWJsZUNhcmRPcHRpb25zID0ge30sXHJcblx0XHRvblNlbGVjdDogKGlkOiBUKSA9PiB2b2lkLFxyXG5cdCkge1xyXG5cdFx0dGhpcy5jb250YWluZXIgPSBjb250YWluZXI7XHJcblx0XHR0aGlzLm9uU2VsZWN0ID0gb25TZWxlY3Q7XHJcblx0XHR0aGlzLnJlbmRlcihjb25maWdzLCBvcHRpb25zKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyKFxyXG5cdFx0Y29uZmlnczogU2VsZWN0YWJsZUNhcmRDb25maWc8VD5bXSxcclxuXHRcdG9wdGlvbnM6IFNlbGVjdGFibGVDYXJkT3B0aW9ucyxcclxuXHQpIHtcclxuXHRcdGNvbnN0IHtcclxuXHRcdFx0Y29udGFpbmVyQ2xhc3MgPSBcInNlbGVjdGFibGUtY2FyZHMtY29udGFpbmVyXCIsXHJcblx0XHRcdGNhcmRDbGFzcyA9IFwic2VsZWN0YWJsZS1jYXJkXCIsXHJcblx0XHRcdHNob3dJY29uID0gdHJ1ZSxcclxuXHRcdFx0c2hvd1ByZXZpZXcgPSB0cnVlLFxyXG5cdFx0XHRzaG93RmVhdHVyZXMgPSBmYWxzZSxcclxuXHRcdH0gPSBvcHRpb25zO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjb250YWluZXJcclxuXHRcdGNvbnN0IGNhcmRzQ29udGFpbmVyID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBjb250YWluZXJDbGFzcyxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBjYXJkc1xyXG5cdFx0Y29uZmlncy5mb3JFYWNoKChjb25maWcpID0+IHtcclxuXHRcdFx0Y29uc3QgY2FyZCA9IGNhcmRzQ29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgJHtjYXJkQ2xhc3N9IGNhcmQtJHtTdHJpbmcoY29uZmlnLmlkKX1gLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEhlYWRlclxyXG5cdFx0XHRjb25zdCBoZWFkZXIgPSBjYXJkLmNyZWF0ZURpdih7IGNsczogYCR7Y2FyZENsYXNzfS1oZWFkZXJgIH0pO1xyXG5cclxuXHRcdFx0Ly8gSWNvblxyXG5cdFx0XHRpZiAoc2hvd0ljb24gJiYgY29uZmlnLmljb24pIHtcclxuXHRcdFx0XHRjb25zdCBpY29uRWwgPSBoZWFkZXIuY3JlYXRlRGl2KHsgY2xzOiBgJHtjYXJkQ2xhc3N9LWljb25gIH0pO1xyXG5cdFx0XHRcdHNldEljb24oaWNvbkVsLCBjb25maWcuaWNvbik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFRpdGxlICYgc3VidGl0bGVcclxuXHRcdFx0Y29uc3QgdGl0bGVDb250YWluZXIgPSBoZWFkZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IGAke2NhcmRDbGFzc30tdGl0bGUtY29udGFpbmVyYCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCB0aXRsZUVsID0gdGl0bGVDb250YWluZXIuY3JlYXRlRWwoXCJoM1wiLCB7XHJcblx0XHRcdFx0dGV4dDogY29uZmlnLnRpdGxlLFxyXG5cdFx0XHRcdGNsczogYCR7Y2FyZENsYXNzfS10aXRsZWAsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKGNvbmZpZy5zdWJ0aXRsZSkge1xyXG5cdFx0XHRcdHRpdGxlQ29udGFpbmVyLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0XHR0ZXh0OiBjb25maWcuc3VidGl0bGUsXHJcblx0XHRcdFx0XHRjbHM6IGAke2NhcmRDbGFzc30tc3VidGl0bGVgLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBCYWRnZSAob3B0aW9uYWwpXHJcblx0XHRcdGlmIChjb25maWcuYmFkZ2UpIHtcclxuXHRcdFx0XHRjb25zdCBiYWRnZSA9IGhlYWRlci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBgJHtjYXJkQ2xhc3N9LWJhZGdlYCxcclxuXHRcdFx0XHRcdHRleHQ6IGNvbmZpZy5iYWRnZSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQm9keVxyXG5cdFx0XHRjb25zdCBib2R5ID0gY2FyZC5jcmVhdGVEaXYoeyBjbHM6IGAke2NhcmRDbGFzc30tYm9keWAgfSk7XHJcblxyXG5cdFx0XHQvLyBQcmV2aWV3IChvcHRpb25hbClcclxuXHRcdFx0aWYgKHNob3dQcmV2aWV3ICYmIGNvbmZpZy5wcmV2aWV3KSB7XHJcblx0XHRcdFx0Y29uc3QgcHJldmlld0VsID0gYm9keS5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBgJHtjYXJkQ2xhc3N9LXByZXZpZXdgLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgY29uZmlnLnByZXZpZXcgPT09IFwiZnVuY3Rpb25cIikge1xyXG5cdFx0XHRcdFx0Y29uc3QgcHJldmlld0NvbnRlbnQgPSBjb25maWcucHJldmlldygpO1xyXG5cdFx0XHRcdFx0cHJldmlld0VsLmFwcGVuZENoaWxkKHByZXZpZXdDb250ZW50KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cHJldmlld0VsLmFwcGVuZENoaWxkKGNvbmZpZy5wcmV2aWV3KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERlc2NyaXB0aW9uXHJcblx0XHRcdGJvZHkuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHR0ZXh0OiBjb25maWcuZGVzY3JpcHRpb24sXHJcblx0XHRcdFx0Y2xzOiBgJHtjYXJkQ2xhc3N9LWRlc2NyaXB0aW9uYCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBGZWF0dXJlcyAob3B0aW9uYWwpXHJcblx0XHRcdGlmIChzaG93RmVhdHVyZXMgJiYgY29uZmlnLmZlYXR1cmVzICYmIGNvbmZpZy5mZWF0dXJlcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Y29uc3QgZmVhdHVyZXNDb250YWluZXIgPSBib2R5LmNyZWF0ZURpdih7XHJcblx0XHRcdFx0XHRjbHM6IGAke2NhcmRDbGFzc30tZmVhdHVyZXNgLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNvbnN0IGZlYXR1cmVzTGlzdCA9IGZlYXR1cmVzQ29udGFpbmVyLmNyZWF0ZUVsKFwidWxcIik7XHJcblx0XHRcdFx0Y29uZmlnLmZlYXR1cmVzLmZvckVhY2goKGZlYXR1cmUpID0+IHtcclxuXHRcdFx0XHRcdGZlYXR1cmVzTGlzdC5jcmVhdGVFbChcImxpXCIsIHsgdGV4dDogZmVhdHVyZSB9KTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2xpY2sgaGFuZGxlclxyXG5cdFx0XHRjYXJkLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zZWxlY3QoY29uZmlnLmlkKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBLZXlib2FyZCBzdXBwb3J0XHJcblx0XHRcdGNhcmQuc2V0QXR0cmlidXRlKFwidGFiaW5kZXhcIiwgXCIwXCIpO1xyXG5cdFx0XHRjYXJkLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIgfHwgZS5rZXkgPT09IFwiIFwiKSB7XHJcblx0XHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0XHR0aGlzLnNlbGVjdChjb25maWcuaWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTdG9yZSBjYXJkIHJlZmVyZW5jZVxyXG5cdFx0XHR0aGlzLmNhcmRzLnNldChjb25maWcuaWQsIGNhcmQpO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTZWxlY3QgYSBjYXJkIGJ5IGlkXHJcblx0ICovXHJcblx0c2VsZWN0KGlkOiBUKSB7XHJcblx0XHQvLyBEZXNlbGVjdCBwcmV2aW91c1xyXG5cdFx0aWYgKHRoaXMuc2VsZWN0ZWRJZCAhPT0gbnVsbCkge1xyXG5cdFx0XHRjb25zdCBwcmV2Q2FyZCA9IHRoaXMuY2FyZHMuZ2V0KHRoaXMuc2VsZWN0ZWRJZCk7XHJcblx0XHRcdHByZXZDYXJkPy5yZW1vdmVDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNlbGVjdCBuZXdcclxuXHRcdHRoaXMuc2VsZWN0ZWRJZCA9IGlkO1xyXG5cdFx0Y29uc3QgbmV3Q2FyZCA9IHRoaXMuY2FyZHMuZ2V0KGlkKTtcclxuXHRcdG5ld0NhcmQ/LmFkZENsYXNzKFwiaXMtc2VsZWN0ZWRcIik7XHJcblxyXG5cdFx0Ly8gVHJpZ2dlciBjYWxsYmFja1xyXG5cdFx0dGhpcy5vblNlbGVjdChpZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgc2VsZWN0ZWQgaWRcclxuXHQgKi9cclxuXHRnZXRTZWxlY3RlZCgpOiBUIHwgbnVsbCB7XHJcblx0XHRyZXR1cm4gdGhpcy5zZWxlY3RlZElkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0IHNlbGVjdGVkIHByb2dyYW1tYXRpY2FsbHlcclxuXHQgKi9cclxuXHRzZXRTZWxlY3RlZChpZDogVCkge1xyXG5cdFx0aWYgKHRoaXMuY2FyZHMuaGFzKGlkKSkge1xyXG5cdFx0XHR0aGlzLnNlbGVjdChpZCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==