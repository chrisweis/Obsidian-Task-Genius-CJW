import { Component, setIcon } from "obsidian";
import { KanbanCardComponent } from "./kanban-card";
import { QuickCaptureModal } from "@/components/features/quick-capture/modals/QuickCaptureModalWithSwitch"; // Import QuickCaptureModal
import { t } from "@/translations/helper"; // Import translation helper
const BATCH_SIZE = 20; // Number of cards to load at a time
export class KanbanColumnComponent extends Component {
    constructor(app, plugin, containerEl, statusName, // e.g., "Todo", "In Progress"
    tasks, params) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.statusName = statusName;
        this.tasks = tasks;
        this.params = params;
        this.cards = [];
        this.renderedTaskCount = 0;
        this.isLoadingMore = false; // Prevent multiple simultaneous loads
        this.observer = null;
        this.sentinelEl = null; // Element to observe
    }
    onload() {
        var _a;
        this.element = this.containerEl.createDiv({
            cls: "tg-kanban-column",
            attr: { "data-status-name": this.statusName },
        });
        // Hide column if no tasks and hideEmptyColumns is enabled
        if (this.tasks.length === 0) {
            this.element.classList.add("tg-kanban-column-empty");
        }
        // Column Header
        this.headerEl = this.element.createEl("div", {
            cls: "tg-kanban-column-header",
        });
        const checkbox = this.headerEl.createEl("input", {
            cls: "task-list-item-checkbox",
            type: "checkbox",
        });
        const mark = this.plugin.settings.taskStatusMarks[this.statusName] || " ";
        checkbox.dataset.task = mark;
        // Only show the header checkbox as checked for the Completed column
        const completedChars = (((_a = this.plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || "x|X").split("|");
        checkbox.checked = completedChars.includes(mark);
        this.registerDomEvent(checkbox, "click", (event) => {
            event.stopPropagation();
            event.preventDefault();
        });
        this.titleEl = this.headerEl.createEl("span", {
            cls: "tg-kanban-column-title",
            text: this.statusName,
        });
        this.countEl = this.headerEl.createEl("span", {
            cls: "tg-kanban-column-count",
            text: `(${this.tasks.length})`,
        });
        // Column Content (Scrollable Area for Cards, and Drop Zone)
        this.contentEl = this.element.createDiv({
            cls: "tg-kanban-column-content",
        });
        // Create sentinel element
        this.sentinelEl = this.contentEl.createDiv({
            cls: "tg-kanban-sentinel",
        });
        // --- Add Card Button ---
        const addCardButtonContainer = this.element.createDiv({
            cls: "tg-kanban-add-card-container",
        });
        const addCardButton = addCardButtonContainer.createEl("button", {
            cls: "tg-kanban-add-card-button",
        }, (el) => {
            el.createEl("span", {}, (el) => {
                setIcon(el, "plus");
            });
            el.createEl("span", {
                text: t("Add Card"),
            });
        });
        this.registerDomEvent(addCardButton, "click", () => {
            // Get the status symbol for the current column
            const taskStatusSymbol = this.plugin.settings.taskStatusMarks[this.statusName] ||
                this.statusName ||
                " ";
            new QuickCaptureModal(this.app, this.plugin, { status: taskStatusSymbol }, true).open();
        });
        // --- End Add Card Button ---
        // Setup Intersection Observer
        this.setupIntersectionObserver();
        // Load initial cards (observer will trigger if sentinel is initially visible)
        // If the initial view is empty or very short, we might need an initial load.
        // Check if sentinel is visible initially or if task list is short
        this.loadMoreCards(); // Let's attempt initial load, observer handles subsequent
    }
    onunload() {
        var _a, _b, _c;
        (_a = this.observer) === null || _a === void 0 ? void 0 : _a.disconnect(); // Disconnect observer
        (_b = this.sentinelEl) === null || _b === void 0 ? void 0 : _b.remove(); // Remove sentinel
        this.cards.forEach((card) => card.unload());
        this.cards = [];
        (_c = this.element) === null || _c === void 0 ? void 0 : _c.remove();
    }
    loadMoreCards() {
        var _a;
        if (this.isLoadingMore || this.renderedTaskCount >= this.tasks.length) {
            return; // Already loading or all tasks rendered
        }
        this.isLoadingMore = true;
        const startIndex = this.renderedTaskCount;
        const endIndex = Math.min(startIndex + BATCH_SIZE, this.tasks.length);
        let cardsAdded = false;
        for (let i = startIndex; i < endIndex; i++) {
            const task = this.tasks[i];
            const card = new KanbanCardComponent(this.app, this.plugin, this.contentEl, task, this.params);
            this.addChild(card); // Register for lifecycle
            this.cards.push(card);
            card.load(); // Load should handle appending to the DOM if not done already
            // Now insert the created element before the sentinel
            if (card.element && this.sentinelEl) {
                // Check if element and sentinel exist
                this.contentEl.insertBefore(card.element, this.sentinelEl);
            }
            this.renderedTaskCount++;
            cardsAdded = true;
        }
        this.isLoadingMore = false;
        // If all cards are loaded, stop observing
        if (this.renderedTaskCount >= this.tasks.length && this.sentinelEl) {
            (_a = this.observer) === null || _a === void 0 ? void 0 : _a.unobserve(this.sentinelEl);
            this.sentinelEl.hide(); // Optionally hide the sentinel
        }
    }
    // Optional: Method to add a card component if tasks are updated dynamically
    addCard(task) {
        const card = new KanbanCardComponent(this.app, this.plugin, this.contentEl, task, this.params);
        this.addChild(card);
        this.cards.push(card);
        card.load();
    }
    // Optional: Method to remove a card component
    removeCard(taskId) {
        const cardIndex = this.cards.findIndex((c) => c.getTask().id === taskId);
        if (cardIndex > -1) {
            const card = this.cards[cardIndex];
            this.removeChild(card); // Unregister
            card.unload(); // Detach DOM element etc.
            this.cards.splice(cardIndex, 1);
        }
    }
    // Update tasks and refresh the column
    updateTasks(newTasks) {
        this.tasks = newTasks;
        // Update count in header
        this.countEl.textContent = `(${this.tasks.length})`;
        // Update empty state
        if (this.tasks.length === 0) {
            this.element.classList.add("tg-kanban-column-empty");
        }
        else {
            this.element.classList.remove("tg-kanban-column-empty");
        }
        // Clear existing cards
        this.cards.forEach((card) => {
            this.removeChild(card);
            card.unload();
        });
        this.cards = [];
        this.renderedTaskCount = 0;
        // Reload cards
        this.loadMoreCards();
    }
    // Public getter for the content element (for SortableJS)
    getContentElement() {
        return this.contentEl;
    }
    // Get the number of tasks in this column
    getTaskCount() {
        return this.tasks.length;
    }
    // Check if column is empty
    isEmpty() {
        return this.tasks.length === 0;
    }
    // Hide/show the column
    setVisible(visible) {
        if (visible) {
            this.element.style.display = "";
            this.element.classList.remove("tg-kanban-column-hidden");
        }
        else {
            this.element.style.display = "none";
            this.element.classList.add("tg-kanban-column-hidden");
        }
    }
    setupIntersectionObserver() {
        if (!this.sentinelEl)
            return;
        const options = {
            root: this.contentEl,
            rootMargin: "0px",
            threshold: 0.1, // Trigger when 10% of the sentinel is visible
        };
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !this.isLoadingMore) {
                    this.loadMoreCards();
                }
            });
        }, options);
        this.observer.observe(this.sentinelEl);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2FuYmFuLWNvbHVtbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImthbmJhbi1jb2x1bW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFPLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZUFBZSxDQUFDO0FBRXBELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDLENBQUMsMkJBQTJCO0FBQ3ZJLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQyxDQUFDLDRCQUE0QjtBQUV2RSxNQUFNLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQyxvQ0FBb0M7QUFFM0QsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFNBQVM7SUFZbkQsWUFDUyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsV0FBd0IsRUFDekIsVUFBa0IsRUFBRSw4QkFBOEI7SUFDakQsS0FBYSxFQUNiLE1BWVA7UUFFRCxLQUFLLEVBQUUsQ0FBQztRQW5CQSxRQUFHLEdBQUgsR0FBRyxDQUFLO1FBQ1IsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7UUFDN0IsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDekIsZUFBVSxHQUFWLFVBQVUsQ0FBUTtRQUNqQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsV0FBTSxHQUFOLE1BQU0sQ0FZYjtRQXhCTSxVQUFLLEdBQTBCLEVBQUUsQ0FBQztRQUNsQyxzQkFBaUIsR0FBRyxDQUFDLENBQUM7UUFDdEIsa0JBQWEsR0FBRyxLQUFLLENBQUMsQ0FBQyxzQ0FBc0M7UUFDN0QsYUFBUSxHQUFnQyxJQUFJLENBQUM7UUFDN0MsZUFBVSxHQUF1QixJQUFJLENBQUMsQ0FBQyxxQkFBcUI7SUF1QnBFLENBQUM7SUFFUSxNQUFNOztRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7WUFDekMsR0FBRyxF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LElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN4QyxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIENvbXBvbmVudCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiOyAvLyBBZGp1c3QgcGF0aFxyXG5pbXBvcnQgeyBLYW5iYW5DYXJkQ29tcG9uZW50IH0gZnJvbSBcIi4va2FuYmFuLWNhcmRcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiOyAvLyBBZGp1c3QgcGF0aFxyXG5pbXBvcnQgeyBRdWlja0NhcHR1cmVNb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWxXaXRoU3dpdGNoXCI7IC8vIEltcG9ydCBRdWlja0NhcHR1cmVNb2RhbFxyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiOyAvLyBJbXBvcnQgdHJhbnNsYXRpb24gaGVscGVyXHJcblxyXG5jb25zdCBCQVRDSF9TSVpFID0gMjA7IC8vIE51bWJlciBvZiBjYXJkcyB0byBsb2FkIGF0IGEgdGltZVxyXG5cclxuZXhwb3J0IGNsYXNzIEthbmJhbkNvbHVtbkNvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBlbGVtZW50OiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNvbnRlbnRFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBoZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0aXRsZUVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNvdW50RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY2FyZHM6IEthbmJhbkNhcmRDb21wb25lbnRbXSA9IFtdO1xyXG5cdHByaXZhdGUgcmVuZGVyZWRUYXNrQ291bnQgPSAwO1xyXG5cdHByaXZhdGUgaXNMb2FkaW5nTW9yZSA9IGZhbHNlOyAvLyBQcmV2ZW50IG11bHRpcGxlIHNpbXVsdGFuZW91cyBsb2Fkc1xyXG5cdHByaXZhdGUgb2JzZXJ2ZXI6IEludGVyc2VjdGlvbk9ic2VydmVyIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzZW50aW5lbEVsOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsOyAvLyBFbGVtZW50IHRvIG9ic2VydmVcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHByaXZhdGUgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHVibGljIHN0YXR1c05hbWU6IHN0cmluZywgLy8gZS5nLiwgXCJUb2RvXCIsIFwiSW4gUHJvZ3Jlc3NcIlxyXG5cdFx0cHJpdmF0ZSB0YXNrczogVGFza1tdLFxyXG5cdFx0cHJpdmF0ZSBwYXJhbXM6IHtcclxuXHRcdFx0b25UYXNrU3RhdHVzVXBkYXRlPzogKFxyXG5cdFx0XHRcdHRhc2tJZDogc3RyaW5nLFxyXG5cdFx0XHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdFx0XHQpID0+IFByb21pc2U8dm9pZD47XHJcblx0XHRcdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza0NvbXBsZXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tDb250ZXh0TWVudT86IChldjogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25GaWx0ZXJBcHBseT86IChcclxuXHRcdFx0XHRmaWx0ZXJUeXBlOiBzdHJpbmcsXHJcblx0XHRcdFx0dmFsdWU6IHN0cmluZyB8IG51bWJlciB8IHN0cmluZ1tdXHJcblx0XHRcdCkgPT4gdm9pZDtcclxuXHRcdH1cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBvbmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmVsZW1lbnQgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tY29sdW1uXCIsXHJcblx0XHRcdGF0dHI6IHtcImRhdGEtc3RhdHVzLW5hbWVcIjogdGhpcy5zdGF0dXNOYW1lfSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEhpZGUgY29sdW1uIGlmIG5vIHRhc2tzIGFuZCBoaWRlRW1wdHlDb2x1bW5zIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LmFkZChcInRnLWthbmJhbi1jb2x1bW4tZW1wdHlcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29sdW1uIEhlYWRlclxyXG5cdFx0dGhpcy5oZWFkZXJFbCA9IHRoaXMuZWxlbWVudC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tY29sdW1uLWhlYWRlclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY2hlY2tib3ggPSB0aGlzLmhlYWRlckVsLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IFwidGFzay1saXN0LWl0ZW0tY2hlY2tib3hcIixcclxuXHRcdFx0dHlwZTogXCJjaGVja2JveFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgbWFyayA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNNYXJrc1t0aGlzLnN0YXR1c05hbWVdIHx8IFwiIFwiO1xyXG5cdFx0Y2hlY2tib3guZGF0YXNldC50YXNrID0gbWFyaztcclxuXHRcdC8vIE9ubHkgc2hvdyB0aGUgaGVhZGVyIGNoZWNrYm94IGFzIGNoZWNrZWQgZm9yIHRoZSBDb21wbGV0ZWQgY29sdW1uXHJcblx0XHRjb25zdCBjb21wbGV0ZWRDaGFycyA9ICh0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZCB8fCBcInh8WFwiKS5zcGxpdChcInxcIik7XHJcblx0XHRjaGVja2JveC5jaGVja2VkID0gY29tcGxldGVkQ2hhcnMuaW5jbHVkZXMobWFyayk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGNoZWNrYm94LCBcImNsaWNrXCIsIChldmVudCkgPT4ge1xyXG5cdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMudGl0bGVFbCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0Y2xzOiBcInRnLWthbmJhbi1jb2x1bW4tdGl0bGVcIixcclxuXHRcdFx0dGV4dDogdGhpcy5zdGF0dXNOYW1lLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5jb3VudEVsID0gdGhpcy5oZWFkZXJFbC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRjbHM6IFwidGcta2FuYmFuLWNvbHVtbi1jb3VudFwiLFxyXG5cdFx0XHR0ZXh0OiBgKCR7dGhpcy50YXNrcy5sZW5ndGh9KWAsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDb2x1bW4gQ29udGVudCAoU2Nyb2xsYWJsZSBBcmVhIGZvciBDYXJkcywgYW5kIERyb3AgWm9uZSlcclxuXHRcdHRoaXMuY29udGVudEVsID0gdGhpcy5lbGVtZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tY29sdW1uLWNvbnRlbnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBzZW50aW5lbCBlbGVtZW50XHJcblx0XHR0aGlzLnNlbnRpbmVsRWwgPSB0aGlzLmNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGcta2FuYmFuLXNlbnRpbmVsXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyAtLS0gQWRkIENhcmQgQnV0dG9uIC0tLVxyXG5cdFx0Y29uc3QgYWRkQ2FyZEJ1dHRvbkNvbnRhaW5lciA9IHRoaXMuZWxlbWVudC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGcta2FuYmFuLWFkZC1jYXJkLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCBhZGRDYXJkQnV0dG9uID0gYWRkQ2FyZEJ1dHRvbkNvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XCJidXR0b25cIixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJ0Zy1rYW5iYW4tYWRkLWNhcmQtYnV0dG9uXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdGVsLmNyZWF0ZUVsKFwic3BhblwiLCB7fSwgKGVsKSA9PiB7XHJcblx0XHRcdFx0XHRzZXRJY29uKGVsLCBcInBsdXNcIik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0ZWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJBZGQgQ2FyZFwiKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChhZGRDYXJkQnV0dG9uLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gR2V0IHRoZSBzdGF0dXMgc3ltYm9sIGZvciB0aGUgY3VycmVudCBjb2x1bW5cclxuXHRcdFx0Y29uc3QgdGFza1N0YXR1c1N5bWJvbCA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c01hcmtzW3RoaXMuc3RhdHVzTmFtZV0gfHxcclxuXHRcdFx0XHR0aGlzLnN0YXR1c05hbWUgfHxcclxuXHRcdFx0XHRcIiBcIjtcclxuXHRcdFx0bmV3IFF1aWNrQ2FwdHVyZU1vZGFsKFxyXG5cdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRcdHtzdGF0dXM6IHRhc2tTdGF0dXNTeW1ib2x9LFxyXG5cdFx0XHRcdHRydWVcclxuXHRcdFx0KS5vcGVuKCk7XHJcblx0XHR9KTtcclxuXHRcdC8vIC0tLSBFbmQgQWRkIENhcmQgQnV0dG9uIC0tLVxyXG5cclxuXHRcdC8vIFNldHVwIEludGVyc2VjdGlvbiBPYnNlcnZlclxyXG5cdFx0dGhpcy5zZXR1cEludGVyc2VjdGlvbk9ic2VydmVyKCk7XHJcblxyXG5cdFx0Ly8gTG9hZCBpbml0aWFsIGNhcmRzIChvYnNlcnZlciB3aWxsIHRyaWdnZXIgaWYgc2VudGluZWwgaXMgaW5pdGlhbGx5IHZpc2libGUpXHJcblx0XHQvLyBJZiB0aGUgaW5pdGlhbCB2aWV3IGlzIGVtcHR5IG9yIHZlcnkgc2hvcnQsIHdlIG1pZ2h0IG5lZWQgYW4gaW5pdGlhbCBsb2FkLlxyXG5cdFx0Ly8gQ2hlY2sgaWYgc2VudGluZWwgaXMgdmlzaWJsZSBpbml0aWFsbHkgb3IgaWYgdGFzayBsaXN0IGlzIHNob3J0XHJcblx0XHR0aGlzLmxvYWRNb3JlQ2FyZHMoKTsgLy8gTGV0J3MgYXR0ZW1wdCBpbml0aWFsIGxvYWQsIG9ic2VydmVyIGhhbmRsZXMgc3Vic2VxdWVudFxyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb251bmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLm9ic2VydmVyPy5kaXNjb25uZWN0KCk7IC8vIERpc2Nvbm5lY3Qgb2JzZXJ2ZXJcclxuXHRcdHRoaXMuc2VudGluZWxFbD8ucmVtb3ZlKCk7IC8vIFJlbW92ZSBzZW50aW5lbFxyXG5cdFx0dGhpcy5jYXJkcy5mb3JFYWNoKChjYXJkKSA9PiBjYXJkLnVubG9hZCgpKTtcclxuXHRcdHRoaXMuY2FyZHMgPSBbXTtcclxuXHRcdHRoaXMuZWxlbWVudD8ucmVtb3ZlKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGxvYWRNb3JlQ2FyZHMoKSB7XHJcblx0XHRpZiAodGhpcy5pc0xvYWRpbmdNb3JlIHx8IHRoaXMucmVuZGVyZWRUYXNrQ291bnQgPj0gdGhpcy50YXNrcy5sZW5ndGgpIHtcclxuXHRcdFx0cmV0dXJuOyAvLyBBbHJlYWR5IGxvYWRpbmcgb3IgYWxsIHRhc2tzIHJlbmRlcmVkXHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc0xvYWRpbmdNb3JlID0gdHJ1ZTtcclxuXHJcblx0XHRjb25zdCBzdGFydEluZGV4ID0gdGhpcy5yZW5kZXJlZFRhc2tDb3VudDtcclxuXHRcdGNvbnN0IGVuZEluZGV4ID0gTWF0aC5taW4oc3RhcnRJbmRleCArIEJBVENIX1NJWkUsIHRoaXMudGFza3MubGVuZ3RoKTtcclxuXHRcdGxldCBjYXJkc0FkZGVkID0gZmFsc2U7XHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IHN0YXJ0SW5kZXg7IGkgPCBlbmRJbmRleDsgaSsrKSB7XHJcblx0XHRcdGNvbnN0IHRhc2sgPSB0aGlzLnRhc2tzW2ldO1xyXG5cdFx0XHRjb25zdCBjYXJkID0gbmV3IEthbmJhbkNhcmRDb21wb25lbnQoXHJcblx0XHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0dGhpcy5jb250ZW50RWwsXHJcblx0XHRcdFx0dGFzayxcclxuXHRcdFx0XHR0aGlzLnBhcmFtc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKGNhcmQpOyAvLyBSZWdpc3RlciBmb3IgbGlmZWN5Y2xlXHJcblx0XHRcdHRoaXMuY2FyZHMucHVzaChjYXJkKTtcclxuXHRcdFx0Y2FyZC5sb2FkKCk7IC8vIExvYWQgc2hvdWxkIGhhbmRsZSBhcHBlbmRpbmcgdG8gdGhlIERPTSBpZiBub3QgZG9uZSBhbHJlYWR5XHJcblx0XHRcdC8vIE5vdyBpbnNlcnQgdGhlIGNyZWF0ZWQgZWxlbWVudCBiZWZvcmUgdGhlIHNlbnRpbmVsXHJcblx0XHRcdGlmIChjYXJkLmVsZW1lbnQgJiYgdGhpcy5zZW50aW5lbEVsKSB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgZWxlbWVudCBhbmQgc2VudGluZWwgZXhpc3RcclxuXHRcdFx0XHR0aGlzLmNvbnRlbnRFbC5pbnNlcnRCZWZvcmUoY2FyZC5lbGVtZW50LCB0aGlzLnNlbnRpbmVsRWwpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMucmVuZGVyZWRUYXNrQ291bnQrKztcclxuXHRcdFx0Y2FyZHNBZGRlZCA9IHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc0xvYWRpbmdNb3JlID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gSWYgYWxsIGNhcmRzIGFyZSBsb2FkZWQsIHN0b3Agb2JzZXJ2aW5nXHJcblx0XHRpZiAodGhpcy5yZW5kZXJlZFRhc2tDb3VudCA+PSB0aGlzLnRhc2tzLmxlbmd0aCAmJiB0aGlzLnNlbnRpbmVsRWwpIHtcclxuXHRcdFx0dGhpcy5vYnNlcnZlcj8udW5vYnNlcnZlKHRoaXMuc2VudGluZWxFbCk7XHJcblx0XHRcdHRoaXMuc2VudGluZWxFbC5oaWRlKCk7IC8vIE9wdGlvbmFsbHkgaGlkZSB0aGUgc2VudGluZWxcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIE9wdGlvbmFsOiBNZXRob2QgdG8gYWRkIGEgY2FyZCBjb21wb25lbnQgaWYgdGFza3MgYXJlIHVwZGF0ZWQgZHluYW1pY2FsbHlcclxuXHRhZGRDYXJkKHRhc2s6IFRhc2spIHtcclxuXHRcdGNvbnN0IGNhcmQgPSBuZXcgS2FuYmFuQ2FyZENvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHR0aGlzLmNvbnRlbnRFbCxcclxuXHRcdFx0dGFzayxcclxuXHRcdFx0dGhpcy5wYXJhbXNcclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKGNhcmQpO1xyXG5cdFx0dGhpcy5jYXJkcy5wdXNoKGNhcmQpO1xyXG5cdFx0Y2FyZC5sb2FkKCk7XHJcblx0fVxyXG5cclxuXHQvLyBPcHRpb25hbDogTWV0aG9kIHRvIHJlbW92ZSBhIGNhcmQgY29tcG9uZW50XHJcblx0cmVtb3ZlQ2FyZCh0YXNrSWQ6IHN0cmluZykge1xyXG5cdFx0Y29uc3QgY2FyZEluZGV4ID0gdGhpcy5jYXJkcy5maW5kSW5kZXgoXHJcblx0XHRcdChjKSA9PiBjLmdldFRhc2soKS5pZCA9PT0gdGFza0lkXHJcblx0XHQpO1xyXG5cdFx0aWYgKGNhcmRJbmRleCA+IC0xKSB7XHJcblx0XHRcdGNvbnN0IGNhcmQgPSB0aGlzLmNhcmRzW2NhcmRJbmRleF07XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQoY2FyZCk7IC8vIFVucmVnaXN0ZXJcclxuXHRcdFx0Y2FyZC51bmxvYWQoKTsgLy8gRGV0YWNoIERPTSBlbGVtZW50IGV0Yy5cclxuXHRcdFx0dGhpcy5jYXJkcy5zcGxpY2UoY2FyZEluZGV4LCAxKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFVwZGF0ZSB0YXNrcyBhbmQgcmVmcmVzaCB0aGUgY29sdW1uXHJcblx0cHVibGljIHVwZGF0ZVRhc2tzKG5ld1Rhc2tzOiBUYXNrW10pIHtcclxuXHRcdHRoaXMudGFza3MgPSBuZXdUYXNrcztcclxuXHJcblx0XHQvLyBVcGRhdGUgY291bnQgaW4gaGVhZGVyXHJcblx0XHR0aGlzLmNvdW50RWwudGV4dENvbnRlbnQgPSBgKCR7dGhpcy50YXNrcy5sZW5ndGh9KWA7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGVtcHR5IHN0YXRlXHJcblx0XHRpZiAodGhpcy50YXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJ0Zy1rYW5iYW4tY29sdW1uLWVtcHR5XCIpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXCJ0Zy1rYW5iYW4tY29sdW1uLWVtcHR5XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGNhcmRzXHJcblx0XHR0aGlzLmNhcmRzLmZvckVhY2goKGNhcmQpID0+IHtcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZChjYXJkKTtcclxuXHRcdFx0Y2FyZC51bmxvYWQoKTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5jYXJkcyA9IFtdO1xyXG5cdFx0dGhpcy5yZW5kZXJlZFRhc2tDb3VudCA9IDA7XHJcblxyXG5cdFx0Ly8gUmVsb2FkIGNhcmRzXHJcblx0XHR0aGlzLmxvYWRNb3JlQ2FyZHMoKTtcclxuXHR9XHJcblxyXG5cdC8vIFB1YmxpYyBnZXR0ZXIgZm9yIHRoZSBjb250ZW50IGVsZW1lbnQgKGZvciBTb3J0YWJsZUpTKVxyXG5cdGdldENvbnRlbnRFbGVtZW50KCk6IEhUTUxFbGVtZW50IHtcclxuXHRcdHJldHVybiB0aGlzLmNvbnRlbnRFbDtcclxuXHR9XHJcblxyXG5cdC8vIEdldCB0aGUgbnVtYmVyIG9mIHRhc2tzIGluIHRoaXMgY29sdW1uXHJcblx0cHVibGljIGdldFRhc2tDb3VudCgpOiBudW1iZXIge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFza3MubGVuZ3RoO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgY29sdW1uIGlzIGVtcHR5XHJcblx0cHVibGljIGlzRW1wdHkoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy50YXNrcy5sZW5ndGggPT09IDA7XHJcblx0fVxyXG5cclxuXHQvLyBIaWRlL3Nob3cgdGhlIGNvbHVtblxyXG5cdHB1YmxpYyBzZXRWaXNpYmxlKHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHRcdGlmICh2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJcIjtcclxuXHRcdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXCJ0Zy1rYW5iYW4tY29sdW1uLWhpZGRlblwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuZWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwidGcta2FuYmFuLWNvbHVtbi1oaWRkZW5cIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwSW50ZXJzZWN0aW9uT2JzZXJ2ZXIoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuc2VudGluZWxFbCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IG9wdGlvbnMgPSB7XHJcblx0XHRcdHJvb3Q6IHRoaXMuY29udGVudEVsLCAvLyBPYnNlcnZlIHdpdGhpbiB0aGUgc2Nyb2xsaW5nIGNvbnRhaW5lclxyXG5cdFx0XHRyb290TWFyZ2luOiBcIjBweFwiLCAvLyBObyBtYXJnaW5cclxuXHRcdFx0dGhyZXNob2xkOiAwLjEsIC8vIFRyaWdnZXIgd2hlbiAxMCUgb2YgdGhlIHNlbnRpbmVsIGlzIHZpc2libGVcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5vYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcigoZW50cmllcykgPT4ge1xyXG5cdFx0XHRlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XHJcblx0XHRcdFx0aWYgKGVudHJ5LmlzSW50ZXJzZWN0aW5nICYmICF0aGlzLmlzTG9hZGluZ01vcmUpIHtcclxuXHRcdFx0XHRcdHRoaXMubG9hZE1vcmVDYXJkcygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9LCBvcHRpb25zKTtcclxuXHJcblx0XHR0aGlzLm9ic2VydmVyLm9ic2VydmUodGhpcy5zZW50aW5lbEVsKTtcclxuXHR9XHJcbn1cclxuIl19