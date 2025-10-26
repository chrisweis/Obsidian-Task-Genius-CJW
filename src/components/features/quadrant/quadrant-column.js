import { __awaiter } from "tslib";
import { Component, setIcon } from "obsidian";
import { QuadrantCardComponent } from "./quadrant-card";
import { t } from "@/translations/helper";
import "@/styles/quadrant/quadrant.css";
export class QuadrantColumnComponent extends Component {
    constructor(app, plugin, containerEl, quadrant, params = {}) {
        super();
        this.tasks = [];
        this.cardComponents = [];
        this.isContentLoaded = false;
        this.intersectionObserver = null;
        this.scrollObserver = null;
        this.loadingEl = null;
        this.loadMoreEl = null;
        // Pagination and virtual scrolling
        this.currentPage = 0;
        this.pageSize = 20;
        this.isLoadingMore = false;
        this.hasMoreTasks = true;
        this.renderedTasks = [];
        this.handleScroll = () => {
            if (!this.scrollContainerEl ||
                !this.hasMoreTasks ||
                this.isLoadingMore) {
                return;
            }
            const container = this.scrollContainerEl;
            const scrollTop = container.scrollTop;
            const scrollHeight = container.scrollHeight;
            const clientHeight = container.clientHeight;
            // Check if we're near the bottom (within 100px)
            const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
            if (isNearBottom) {
                this.loadMoreTasks();
            }
        };
        this.app = app;
        this.plugin = plugin;
        this.containerEl = containerEl;
        this.quadrant = quadrant;
        this.params = params;
    }
    onload() {
        super.onload();
        this.render();
        // Setup observers after render so scroll container exists
        setTimeout(() => {
            this.setupLazyLoading();
            this.setupScrollLoading();
            this.setupManualScrollListener();
            // Force initial content check
            this.checkInitialVisibility();
        }, 50);
        // Additional fallback - force load after a longer delay if still not loaded
        setTimeout(() => {
            if (!this.isContentLoaded && this.tasks.length > 0) {
                console.log(`Fallback loading for ${this.quadrant.id} - forcing content load`);
                this.loadContent();
            }
        }, 500);
        // Extra aggressive fallback for small task counts
        setTimeout(() => {
            if (!this.isContentLoaded &&
                this.tasks.length > 0 &&
                this.tasks.length <= this.pageSize) {
                console.log(`Extra aggressive fallback for small task count in ${this.quadrant.id}`);
                this.loadContent();
            }
        }, 1000);
    }
    onunload() {
        this.cleanup();
        if (this.intersectionObserver) {
            this.intersectionObserver.disconnect();
            this.intersectionObserver = null;
        }
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
        // Remove scroll listener
        if (this.scrollContainerEl) {
            this.scrollContainerEl.removeEventListener("scroll", this.handleScroll);
        }
        super.onunload();
    }
    cleanup() {
        // Clean up card components
        this.cardComponents.forEach((card) => {
            card.onunload();
        });
        this.cardComponents = [];
    }
    render() {
        this.containerEl.empty();
        this.containerEl.addClass("tg-quadrant-column");
        this.containerEl.addClass(this.quadrant.className);
        // Create header
        this.createHeader();
        // Create scrollable content area
        this.createScrollableContent();
    }
    createHeader() {
        this.headerEl = this.containerEl.createDiv("tg-quadrant-header");
        // Title and priority indicator
        const titleContainerEl = this.headerEl.createDiv("tg-quadrant-title-container");
        // Priority emoji
        const priorityEl = titleContainerEl.createSpan("tg-quadrant-priority");
        priorityEl.textContent = this.quadrant.priorityEmoji;
        // Title
        this.titleEl = titleContainerEl.createDiv("tg-quadrant-title");
        this.titleEl.textContent = this.quadrant.title;
        // Task count
        this.countEl = this.headerEl.createDiv("tg-quadrant-count");
        this.updateCount();
    }
    createScrollableContent() {
        // Create scroll container
        this.scrollContainerEl = this.containerEl.createDiv("tg-quadrant-scroll-container");
        // Add scroll event listener
        this.scrollContainerEl.addEventListener("scroll", this.handleScroll, {
            passive: true,
        });
        // Create content area inside scroll container
        this.contentEl = this.scrollContainerEl.createDiv("tg-quadrant-column-content");
        this.contentEl.setAttribute("data-quadrant-id", this.quadrant.id);
        // Create load more indicator
        this.createLoadMoreIndicator();
    }
    createLoadMoreIndicator() {
        this.loadMoreEl = this.scrollContainerEl.createDiv("tg-quadrant-load-more");
        const spinnerEl = this.loadMoreEl.createDiv("tg-quadrant-load-more-spinner");
        setIcon(spinnerEl, "loader-2");
        const messageEl = this.loadMoreEl.createDiv("tg-quadrant-load-more-message");
        messageEl.textContent = t("Loading more tasks...");
    }
    checkInitialVisibility() {
        // Force load content if the column is visible in viewport
        if (!this.isContentLoaded && this.isElementVisible()) {
            console.log(`Force loading content for quadrant: ${this.quadrant.id}`);
            this.loadContent();
        }
    }
    isElementVisible() {
        if (!this.containerEl)
            return false;
        // For quadrant grid layout, check if the column container is visible in viewport
        const containerRect = this.containerEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        // Column is visible if any part of it is in the viewport
        const isInViewport = containerRect.top < viewportHeight &&
            containerRect.bottom > 0 &&
            containerRect.left < viewportWidth &&
            containerRect.right > 0;
        // For grid layout, also check if the column has reasonable dimensions
        const hasReasonableSize = containerRect.width > 50 && containerRect.height > 50;
        return isInViewport && hasReasonableSize;
    }
    setupLazyLoading() {
        // For quadrant view, we need a different approach since columns are in a grid
        // and may not be properly detected by intersection observer
        // For small task counts, be more aggressive and load immediately
        if (this.tasks.length <= this.pageSize) {
            console.log(`Small task count detected (${this.tasks.length}), loading immediately for ${this.quadrant.id}`);
            this.loadContent();
            return;
        }
        // First, try immediate loading if element is visible
        if (this.isElementVisible()) {
            console.log(`Immediately loading content for visible quadrant: ${this.quadrant.id}`);
            this.loadContent();
            return;
        }
        // Create intersection observer for lazy loading with both viewport and container detection
        this.intersectionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !this.isContentLoaded) {
                    console.log(`Intersection triggered for quadrant: ${this.quadrant.id}`);
                    this.loadContent();
                }
            });
        }, {
            root: null,
            rootMargin: "100px",
            threshold: 0.01, // Lower threshold to trigger more easily
        });
        // Start observing the content element
        this.intersectionObserver.observe(this.contentEl);
        // Also observe the container element as backup
        if (this.containerEl) {
            this.intersectionObserver.observe(this.containerEl);
        }
    }
    setupScrollLoading() {
        // Create intersection observer for scroll loading
        this.scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting &&
                    this.hasMoreTasks &&
                    !this.isLoadingMore &&
                    this.isContentLoaded) {
                    console.log("Triggering loadMoreTasks - intersection detected");
                    this.loadMoreTasks();
                }
            });
        }, {
            root: this.scrollContainerEl,
            rootMargin: "50px",
            threshold: 0.1,
        });
        // Start observing the load more element when it's created
        this.observeLoadMoreElement();
    }
    observeLoadMoreElement() {
        if (this.loadMoreEl && this.scrollObserver) {
            this.scrollObserver.observe(this.loadMoreEl);
        }
    }
    loadContent() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isContentLoaded)
                return;
            this.isContentLoaded = true;
            // Remove loading indicator if it exists
            if (this.loadingEl) {
                this.loadingEl.remove();
                this.loadingEl = null;
            }
            // Reset pagination
            this.currentPage = 0;
            this.renderedTasks = [];
            // Load first page of tasks
            yield this.loadMoreTasks();
            // Setup scroll observer after initial load
            this.observeLoadMoreElement();
        });
    }
    loadMoreTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isLoadingMore) {
                return;
            }
            // For small task counts, ensure we still process them even if hasMoreTasks is false
            const shouldProcess = this.hasMoreTasks ||
                (this.renderedTasks.length === 0 && this.tasks.length > 0);
            if (!shouldProcess) {
                return;
            }
            this.isLoadingMore = true;
            this.showLoadMoreIndicator();
            try {
                // Calculate which tasks to load for this page
                const startIndex = this.currentPage * this.pageSize;
                const endIndex = startIndex + this.pageSize;
                const tasksToLoad = this.tasks.slice(startIndex, endIndex);
                if (tasksToLoad.length === 0) {
                    this.hasMoreTasks = false;
                    this.hideLoadMoreIndicator();
                    return;
                }
                // Add tasks to rendered list
                this.renderedTasks.push(...tasksToLoad);
                // Render the new batch of tasks
                yield this.renderTaskBatch(tasksToLoad);
                // Update pagination
                this.currentPage++;
                // Check if there are more tasks to load
                if (endIndex >= this.tasks.length) {
                    this.hasMoreTasks = false;
                    this.hideLoadMoreIndicator();
                }
                else {
                    // Show load more indicator if there are more tasks
                    this.showLoadMoreIndicator();
                }
            }
            catch (error) {
                console.error("Error loading more tasks:", error);
            }
            finally {
                this.isLoadingMore = false;
            }
        });
    }
    showLoadMoreIndicator() {
        if (this.loadMoreEl && this.hasMoreTasks) {
            this.loadMoreEl.addClass("tg-quadrant-load-more--visible");
        }
    }
    hideLoadMoreIndicator() {
        if (this.loadMoreEl) {
            this.loadMoreEl.removeClass("tg-quadrant-load-more--visible");
        }
    }
    setTasks(tasks) {
        console.log(`setTasks called for ${this.quadrant.id} with ${tasks.length} tasks`);
        // Check if tasks have actually changed to avoid unnecessary re-renders
        if (this.areTasksEqual(this.tasks, tasks)) {
            console.log(`Tasks unchanged for ${this.quadrant.id}, skipping setTasks`);
            return;
        }
        this.tasks = tasks;
        this.updateCount();
        // Reset pagination state
        this.currentPage = 0;
        this.renderedTasks = [];
        this.hasMoreTasks = tasks.length > this.pageSize;
        // Always try to load content immediately if we have tasks
        if (tasks.length > 0) {
            if (this.isContentLoaded) {
                // Re-render immediately if already loaded
                this.renderTasks();
            }
            else {
                // For small task counts, load immediately without lazy loading
                if (tasks.length <= this.pageSize) {
                    console.log(`Small task count (${tasks.length}), loading immediately for ${this.quadrant.id}`);
                    // Force immediate loading for small task counts
                    setTimeout(() => {
                        this.loadContent();
                    }, 50);
                }
                else {
                    // More aggressive loading strategy - load content for all columns
                    // since the quadrant view is typically small enough to show all columns
                    setTimeout(() => {
                        if (!this.isContentLoaded) {
                            console.log(`Force loading content for ${this.quadrant.id} after setTasks (aggressive)`);
                            this.loadContent();
                        }
                    }, 100);
                }
            }
        }
        else {
            // Handle empty state
            if (this.isContentLoaded) {
                this.showEmptyState();
            }
        }
    }
    /**
     * Check if two task arrays are equal (same tasks in same order)
     */
    areTasksEqual(currentTasks, newTasks) {
        if (currentTasks.length !== newTasks.length) {
            return false;
        }
        if (currentTasks.length === 0 && newTasks.length === 0) {
            return true;
        }
        // Quick ID-based comparison first
        for (let i = 0; i < currentTasks.length; i++) {
            if (currentTasks[i].id !== newTasks[i].id) {
                return false;
            }
        }
        // If IDs match, do a deeper comparison of content
        for (let i = 0; i < currentTasks.length; i++) {
            if (!this.areTasksContentEqual(currentTasks[i], newTasks[i])) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if two individual tasks have equal content
     */
    areTasksContentEqual(task1, task2) {
        // Compare basic properties
        if (task1.content !== task2.content ||
            task1.status !== task2.status ||
            task1.completed !== task2.completed) {
            return false;
        }
        // Compare metadata if it exists
        if (task1.metadata && task2.metadata) {
            // Check important metadata fields
            if (task1.metadata.priority !== task2.metadata.priority ||
                task1.metadata.dueDate !== task2.metadata.dueDate ||
                task1.metadata.scheduledDate !== task2.metadata.scheduledDate ||
                task1.metadata.startDate !== task2.metadata.startDate) {
                return false;
            }
            // Check tags
            const tags1 = task1.metadata.tags || [];
            const tags2 = task2.metadata.tags || [];
            if (tags1.length !== tags2.length ||
                !tags1.every((tag) => tags2.includes(tag))) {
                return false;
            }
        }
        else if (task1.metadata !== task2.metadata) {
            // One has metadata, the other doesn't
            return false;
        }
        return true;
    }
    /**
     * Force update tasks even if they appear to be the same
     */
    forceSetTasks(tasks) {
        console.log(`forceSetTasks called for ${this.quadrant.id} with ${tasks.length} tasks`);
        this.tasks = tasks;
        this.updateCount();
        // Reset pagination state
        this.currentPage = 0;
        this.renderedTasks = [];
        this.hasMoreTasks = tasks.length > this.pageSize;
        // Always re-render
        if (this.isContentLoaded) {
            this.renderTasks();
        }
        else {
            this.loadContent();
        }
    }
    /**
     * Update a single task in the column
     */
    updateTask(updatedTask) {
        const taskIndex = this.tasks.findIndex((task) => task.id === updatedTask.id);
        if (taskIndex === -1) {
            console.warn(`Task ${updatedTask.id} not found in quadrant ${this.quadrant.id}`);
            return;
        }
        // Check if the task actually changed
        if (this.areTasksContentEqual(this.tasks[taskIndex], updatedTask)) {
            console.log(`Task ${updatedTask.id} unchanged, skipping update`);
            return;
        }
        // Update the task
        this.tasks[taskIndex] = updatedTask;
        this.updateCount();
        // Update the rendered task if it's currently visible
        const renderedIndex = this.renderedTasks.findIndex((task) => task.id === updatedTask.id);
        if (renderedIndex !== -1) {
            this.renderedTasks[renderedIndex] = updatedTask;
            // Find and update the card component
            const cardComponent = this.cardComponents.find((card) => {
                const cardEl = card.containerEl;
                return cardEl.getAttribute("data-task-id") === updatedTask.id;
            });
            if (cardComponent) {
                // Update the card component with new task data
                cardComponent.updateTask(updatedTask);
            }
        }
        console.log(`Updated task ${updatedTask.id} in quadrant ${this.quadrant.id}`);
    }
    /**
     * Add a task to the column
     */
    addTask(task) {
        // Check if task already exists
        if (this.tasks.some((t) => t.id === task.id)) {
            console.warn(`Task ${task.id} already exists in quadrant ${this.quadrant.id}`);
            return;
        }
        this.tasks.push(task);
        this.updateCount();
        // If content is loaded and we have space, render the new task
        if (this.isContentLoaded &&
            this.renderedTasks.length < this.tasks.length) {
            this.renderedTasks.push(task);
            this.renderSingleTask(task);
        }
        console.log(`Added task ${task.id} to quadrant ${this.quadrant.id}`);
    }
    /**
     * Remove a task from the column
     */
    removeTask(taskId) {
        const taskIndex = this.tasks.findIndex((task) => task.id === taskId);
        if (taskIndex === -1) {
            console.warn(`Task ${taskId} not found in quadrant ${this.quadrant.id}`);
            return;
        }
        // Remove from tasks array
        this.tasks.splice(taskIndex, 1);
        this.updateCount();
        // Remove from rendered tasks
        const renderedIndex = this.renderedTasks.findIndex((task) => task.id === taskId);
        if (renderedIndex !== -1) {
            this.renderedTasks.splice(renderedIndex, 1);
        }
        // Remove card component
        const cardIndex = this.cardComponents.findIndex((card) => {
            const cardEl = card.containerEl;
            return cardEl.getAttribute("data-task-id") === taskId;
        });
        if (cardIndex !== -1) {
            const card = this.cardComponents[cardIndex];
            card.onunload();
            card.containerEl.remove();
            this.cardComponents.splice(cardIndex, 1);
        }
        // Show empty state if no tasks left
        if (this.tasks.length === 0 && this.isContentLoaded) {
            this.showEmptyState();
        }
        console.log(`Removed task ${taskId} from quadrant ${this.quadrant.id}`);
    }
    /**
     * Render a single task (used for adding new tasks)
     */
    renderSingleTask(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const cardEl = document.createElement("div");
            cardEl.className = "tg-quadrant-card";
            cardEl.setAttribute("data-task-id", task.id);
            const card = new QuadrantCardComponent(this.app, this.plugin, cardEl, task, {
                onTaskStatusUpdate: this.params.onTaskStatusUpdate,
                onTaskSelected: this.params.onTaskSelected,
                onTaskCompleted: this.params.onTaskCompleted,
                onTaskContextMenu: this.params.onTaskContextMenu,
                onTaskUpdated: (updatedTask) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    (_b = (_a = this.params).onTaskUpdated) === null || _b === void 0 ? void 0 : _b.call(_a, updatedTask);
                }),
            });
            this.addChild(card);
            this.cardComponents.push(card);
            this.contentEl.appendChild(cardEl);
        });
    }
    updateCount() {
        if (this.countEl) {
            this.countEl.textContent = `${this.tasks.length} ${this.tasks.length === 1 ? t("task") : t("tasks")}`;
        }
    }
    renderTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.contentEl)
                return;
            // Clean up existing components
            this.cleanup();
            // Clear content
            this.contentEl.empty();
            // Reset pagination and render first page
            this.currentPage = 0;
            this.renderedTasks = [];
            this.hasMoreTasks = this.tasks.length > this.pageSize;
            yield this.loadMoreTasks();
            // Show empty state if no tasks
            if (this.tasks.length === 0) {
                this.showEmptyState();
            }
        });
    }
    renderTaskBatch(tasks) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!tasks.length)
                return;
            const fragment = document.createDocumentFragment();
            // Render tasks in smaller sub-batches to prevent UI blocking
            const subBatchSize = 5;
            for (let i = 0; i < tasks.length; i += subBatchSize) {
                const subBatch = tasks.slice(i, i + subBatchSize);
                subBatch.forEach((task) => {
                    const cardEl = document.createElement("div");
                    cardEl.className = "tg-quadrant-card";
                    cardEl.setAttribute("data-task-id", task.id);
                    const card = new QuadrantCardComponent(this.app, this.plugin, cardEl, task, {
                        onTaskStatusUpdate: this.params.onTaskStatusUpdate,
                        onTaskSelected: this.params.onTaskSelected,
                        onTaskCompleted: this.params.onTaskCompleted,
                        onTaskContextMenu: this.params.onTaskContextMenu,
                        onTaskUpdated: (updatedTask) => __awaiter(this, void 0, void 0, function* () {
                            // Notify parent quadrant component that a task was updated
                            // This will trigger a refresh to re-categorize tasks
                            if (this.params.onTaskStatusUpdate) {
                                yield this.params.onTaskStatusUpdate(updatedTask.id, updatedTask.status);
                            }
                        }),
                    });
                    this.addChild(card);
                    this.cardComponents.push(card);
                    fragment.appendChild(cardEl);
                });
                // Small delay between sub-batches
                if (i + subBatchSize < tasks.length) {
                    yield new Promise((resolve) => setTimeout(resolve, 5));
                }
            }
            this.contentEl.appendChild(fragment);
            // Force a scroll check after rendering
            setTimeout(() => {
                this.checkScrollPosition();
            }, 100);
        });
    }
    checkScrollPosition() {
        if (!this.scrollContainerEl || !this.loadMoreEl)
            return;
        const container = this.scrollContainerEl;
        const loadMore = this.loadMoreEl;
        // Check if load more element is visible within the scroll container
        const containerRect = container.getBoundingClientRect();
        const loadMoreRect = loadMore.getBoundingClientRect();
        // More precise visibility check for nested scroll containers
        const isVisible = loadMoreRect.top < containerRect.bottom &&
            loadMoreRect.bottom > containerRect.top &&
            loadMoreRect.left < containerRect.right &&
            loadMoreRect.right > containerRect.left;
        // Also check scroll position as backup
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        if ((isVisible || isNearBottom) &&
            this.hasMoreTasks &&
            !this.isLoadingMore) {
            this.loadMoreTasks();
        }
    }
    showEmptyState() {
        const emptyEl = this.contentEl.createDiv("tg-quadrant-empty-state");
        const iconEl = emptyEl.createDiv("tg-quadrant-empty-icon");
        setIcon(iconEl, "inbox");
        const messageEl = emptyEl.createDiv("tg-quadrant-empty-message");
        messageEl.textContent = this.getEmptyStateMessage();
    }
    getEmptyStateMessage() {
        switch (this.quadrant.id) {
            case "urgent-important":
                return t("No crisis tasks - great job!");
            case "not-urgent-important":
                return t("No planning tasks - consider adding some goals");
            case "urgent-not-important":
                return t("No interruptions - focus time!");
            case "not-urgent-not-important":
                return t("No time wasters - excellent focus!");
            default:
                return t("No tasks in this quadrant");
        }
    }
    setVisibility(visible) {
        if (visible) {
            this.containerEl.removeClass("tg-quadrant-column--hidden");
        }
        else {
            this.containerEl.addClass("tg-quadrant-column--hidden");
        }
    }
    addDropIndicator() {
        this.contentEl.addClass("tg-quadrant-column-content--drop-active");
        this.containerEl.addClass("tg-quadrant-column--drag-target");
    }
    removeDropIndicator() {
        this.contentEl.removeClass("tg-quadrant-column-content--drop-active");
        this.containerEl.removeClass("tg-quadrant-column--drag-target");
        // Also remove any other drag-related classes
        this.containerEl.removeClass("tg-quadrant-column--highlighted");
        // Force cleanup of any lingering styles with a small delay
        setTimeout(() => {
            // Double-check and clean up any remaining drag classes
            this.contentEl.removeClass("tg-quadrant-column-content--drop-active");
            this.containerEl.removeClass("tg-quadrant-column--drag-target");
            this.containerEl.removeClass("tg-quadrant-column--highlighted");
        }, 10);
    }
    forceLoadContent() {
        console.log(`forceLoadContent called for ${this.quadrant.id}`);
        if (!this.isContentLoaded) {
            this.loadContent();
        }
    }
    loadAllTasks() {
        return __awaiter(this, void 0, void 0, function* () {
            // Force load all remaining tasks (useful for drag operations)
            if (!this.hasMoreTasks)
                return;
            console.log("Loading all remaining tasks asynchronously");
            this.hasMoreTasks = false;
            this.hideLoadMoreIndicator();
            // Load all remaining tasks in batches to avoid UI blocking
            const remainingTasks = this.tasks.slice(this.renderedTasks.length);
            if (remainingTasks.length === 0)
                return;
            const batchSize = 10;
            for (let i = 0; i < remainingTasks.length; i += batchSize) {
                const batch = remainingTasks.slice(i, i + batchSize);
                yield this.renderTaskBatch(batch);
                this.renderedTasks.push(...batch);
                // Small delay between batches to keep UI responsive
                if (i + batchSize < remainingTasks.length) {
                    yield new Promise((resolve) => setTimeout(resolve, 10));
                }
            }
            console.log("Finished loading all tasks");
        });
    }
    getQuadrantId() {
        return this.quadrant.id;
    }
    getQuadrant() {
        return this.quadrant;
    }
    getTasks() {
        return this.tasks;
    }
    getRenderedTasks() {
        return this.renderedTasks;
    }
    getTaskCount() {
        return this.tasks.length;
    }
    isEmpty() {
        return this.tasks.length === 0;
    }
    isLoaded() {
        return this.isContentLoaded;
    }
    hasMoreToLoad() {
        return this.hasMoreTasks;
    }
    // Method to get quadrant-specific styling or behavior
    getQuadrantColor() {
        switch (this.quadrant.id) {
            case "urgent-important":
                return "var(--text-error)"; // Error color - Crisis
            case "not-urgent-important":
                return "var(--color-accent)"; // Accent color - Growth
            case "urgent-not-important":
                return "var(--text-warning)"; // Warning color - Caution
            case "not-urgent-not-important":
                return "var(--text-muted)"; // Muted color - Eliminate
            default:
                return "var(--color-accent)"; // Accent color - Default
        }
    }
    // Method to get quadrant recommendations
    getQuadrantRecommendation() {
        switch (this.quadrant.id) {
            case "urgent-important":
                return t("Handle immediately. These are critical tasks that need your attention now.");
            case "not-urgent-important":
                return t("Schedule and plan. These tasks are key to your long-term success.");
            case "urgent-not-important":
                return t("Delegate if possible. These tasks are urgent but don't require your specific skills.");
            case "not-urgent-not-important":
                return t("Eliminate or minimize. These tasks may be time wasters.");
            default:
                return t("Review and categorize these tasks appropriately.");
        }
    }
    setupManualScrollListener() {
        // Add manual scroll listener as backup
        this.handleScroll = this.handleScroll.bind(this);
    }
    prepareDragOperation() {
        // Lightweight preparation for drag operations
        // Only load a few more tasks if needed, not all
        if (this.hasMoreTasks &&
            this.renderedTasks.length < this.pageSize * 2) {
            this.loadMoreTasks();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVhZHJhbnQtY29sdW1uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicXVhZHJhbnQtY29sdW1uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUluRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxnQ0FBZ0MsQ0FBQztBQUV4QyxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsU0FBUztJQW9DckQsWUFDQyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsV0FBd0IsRUFDeEIsUUFBNEIsRUFDNUIsU0FTSSxFQUFFO1FBRU4sS0FBSyxFQUFFLENBQUM7UUExQ0QsVUFBSyxHQUFXLEVBQUUsQ0FBQztRQUNuQixtQkFBYyxHQUE0QixFQUFFLENBQUM7UUFDN0Msb0JBQWUsR0FBWSxLQUFLLENBQUM7UUFDakMseUJBQW9CLEdBQWdDLElBQUksQ0FBQztRQUN6RCxtQkFBYyxHQUFnQyxJQUFJLENBQUM7UUFDbkQsY0FBUyxHQUF1QixJQUFJLENBQUM7UUFDckMsZUFBVSxHQUF1QixJQUFJLENBQUM7UUFFOUMsbUNBQW1DO1FBQzNCLGdCQUFXLEdBQVcsQ0FBQyxDQUFDO1FBQ3hCLGFBQVEsR0FBVyxFQUFFLENBQUM7UUFDdEIsa0JBQWEsR0FBWSxLQUFLLENBQUM7UUFDL0IsaUJBQVksR0FBWSxJQUFJLENBQUM7UUFDN0Isa0JBQWEsR0FBVyxFQUFFLENBQUM7UUFzOEIzQixpQkFBWSxHQUFHLEdBQUcsRUFBRTtZQUMzQixJQUNDLENBQUMsSUFBSSxDQUFDLGlCQUFpQjtnQkFDdkIsQ0FBQyxJQUFJLENBQUMsWUFBWTtnQkFDbEIsSUFBSSxDQUFDLGFBQWEsRUFDakI7Z0JBQ0QsT0FBTzthQUNQO1lBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGlC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LHlEQUF5RCxDQUN6RCxDQUFDO1lBQ0g7Z0JBQ0MsT0FBTyxDQUFDLENBQUMsa0RBQWtELENBQUMsQ0FBQztTQUM5RDtJQUNGLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsdUNBQXVDO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEQsQ0FBQztJQXdCTSxvQkFBb0I7UUFDMUIsOENBQThDO1FBQzlDLGdEQUFnRDtRQUNoRCxJQUNDLElBQUksQ0FBQyxZQUFZO1lBQ2pCLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxFQUM1QztZQUNELElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztTQUNyQjtJQUNGLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCwgQ29tcG9uZW50LCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHsgUXVhZHJhbnREZWZpbml0aW9uIH0gZnJvbSAnLi9xdWFkcmFudCc7XHJcbmltcG9ydCB7IFF1YWRyYW50Q2FyZENvbXBvbmVudCB9IGZyb20gXCIuL3F1YWRyYW50LWNhcmRcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvcXVhZHJhbnQvcXVhZHJhbnQuY3NzXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgUXVhZHJhbnRDb2x1bW5Db21wb25lbnQgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdGFwcDogQXBwO1xyXG5cdHB1YmxpYyBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBoZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSB0aXRsZUVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNvdW50RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udGVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHNjcm9sbENvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHF1YWRyYW50OiBRdWFkcmFudERlZmluaXRpb247XHJcblx0cHJpdmF0ZSB0YXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBjYXJkQ29tcG9uZW50czogUXVhZHJhbnRDYXJkQ29tcG9uZW50W10gPSBbXTtcclxuXHRwcml2YXRlIGlzQ29udGVudExvYWRlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgaW50ZXJzZWN0aW9uT2JzZXJ2ZXI6IEludGVyc2VjdGlvbk9ic2VydmVyIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBzY3JvbGxPYnNlcnZlcjogSW50ZXJzZWN0aW9uT2JzZXJ2ZXIgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGxvYWRpbmdFbDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGxvYWRNb3JlRWw6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIFBhZ2luYXRpb24gYW5kIHZpcnR1YWwgc2Nyb2xsaW5nXHJcblx0cHJpdmF0ZSBjdXJyZW50UGFnZTogbnVtYmVyID0gMDtcclxuXHRwcml2YXRlIHBhZ2VTaXplOiBudW1iZXIgPSAyMDtcclxuXHRwcml2YXRlIGlzTG9hZGluZ01vcmU6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHRwcml2YXRlIGhhc01vcmVUYXNrczogYm9vbGVhbiA9IHRydWU7XHJcblx0cHJpdmF0ZSByZW5kZXJlZFRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHJcblx0cHJpdmF0ZSBwYXJhbXM6IHtcclxuXHRcdG9uVGFza1N0YXR1c1VwZGF0ZT86IChcclxuXHRcdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRcdG5ld1N0YXR1c01hcms6IHN0cmluZ1xyXG5cdFx0KSA9PiBQcm9taXNlPHZvaWQ+O1xyXG5cdFx0b25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdG9uVGFza0NvbXBsZXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0b25UYXNrQ29udGV4dE1lbnU/OiAoZXY6IE1vdXNlRXZlbnQsIHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRvblRhc2tVcGRhdGVkPzogKHRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0fTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0Y29udGFpbmVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cXVhZHJhbnQ6IFF1YWRyYW50RGVmaW5pdGlvbixcclxuXHRcdHBhcmFtczoge1xyXG5cdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU/OiAoXHJcblx0XHRcdFx0dGFza0lkOiBzdHJpbmcsXHJcblx0XHRcdFx0bmV3U3RhdHVzTWFyazogc3RyaW5nXHJcblx0XHRcdCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuXHRcdFx0b25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0XHRvblRhc2tVcGRhdGVkPzogKHRhc2s6IFRhc2spID0+IFByb21pc2U8dm9pZD47XHJcblx0XHR9ID0ge31cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IGFwcDtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5xdWFkcmFudCA9IHF1YWRyYW50O1xyXG5cdFx0dGhpcy5wYXJhbXMgPSBwYXJhbXM7XHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBvbmxvYWQoKSB7XHJcblx0XHRzdXBlci5vbmxvYWQoKTtcclxuXHRcdHRoaXMucmVuZGVyKCk7XHJcblxyXG5cdFx0Ly8gU2V0dXAgb2JzZXJ2ZXJzIGFmdGVyIHJlbmRlciBzbyBzY3JvbGwgY29udGFpbmVyIGV4aXN0c1xyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMuc2V0dXBMYXp5TG9hZGluZygpO1xyXG5cdFx0XHR0aGlzLnNldHVwU2Nyb2xsTG9hZGluZygpO1xyXG5cdFx0XHR0aGlzLnNldHVwTWFudWFsU2Nyb2xsTGlzdGVuZXIoKTtcclxuXHJcblx0XHRcdC8vIEZvcmNlIGluaXRpYWwgY29udGVudCBjaGVja1xyXG5cdFx0XHR0aGlzLmNoZWNrSW5pdGlhbFZpc2liaWxpdHkoKTtcclxuXHRcdH0sIDUwKTtcclxuXHJcblx0XHQvLyBBZGRpdGlvbmFsIGZhbGxiYWNrIC0gZm9yY2UgbG9hZCBhZnRlciBhIGxvbmdlciBkZWxheSBpZiBzdGlsbCBub3QgbG9hZGVkXHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0aWYgKCF0aGlzLmlzQ29udGVudExvYWRlZCAmJiB0aGlzLnRhc2tzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBGYWxsYmFjayBsb2FkaW5nIGZvciAke3RoaXMucXVhZHJhbnQuaWR9IC0gZm9yY2luZyBjb250ZW50IGxvYWRgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmxvYWRDb250ZW50KCk7XHJcblx0XHRcdH1cclxuXHRcdH0sIDUwMCk7XHJcblxyXG5cdFx0Ly8gRXh0cmEgYWdncmVzc2l2ZSBmYWxsYmFjayBmb3Igc21hbGwgdGFzayBjb3VudHNcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0IXRoaXMuaXNDb250ZW50TG9hZGVkICYmXHJcblx0XHRcdFx0dGhpcy50YXNrcy5sZW5ndGggPiAwICYmXHJcblx0XHRcdFx0dGhpcy50YXNrcy5sZW5ndGggPD0gdGhpcy5wYWdlU2l6ZVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcdGBFeHRyYSBhZ2dyZXNzaXZlIGZhbGxiYWNrIGZvciBzbWFsbCB0YXNrIGNvdW50IGluICR7dGhpcy5xdWFkcmFudC5pZH1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmxvYWRDb250ZW50KCk7XHJcblx0XHRcdH1cclxuXHRcdH0sIDEwMDApO1xyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb251bmxvYWQoKSB7XHJcblx0XHR0aGlzLmNsZWFudXAoKTtcclxuXHRcdGlmICh0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyKSB7XHJcblx0XHRcdHRoaXMuaW50ZXJzZWN0aW9uT2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xyXG5cdFx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLnNjcm9sbE9ic2VydmVyKSB7XHJcblx0XHRcdHRoaXMuc2Nyb2xsT2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xyXG5cdFx0XHR0aGlzLnNjcm9sbE9ic2VydmVyID0gbnVsbDtcclxuXHRcdH1cclxuXHRcdC8vIFJlbW92ZSBzY3JvbGwgbGlzdGVuZXJcclxuXHRcdGlmICh0aGlzLnNjcm9sbENvbnRhaW5lckVsKSB7XHJcblx0XHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihcclxuXHRcdFx0XHRcInNjcm9sbFwiLFxyXG5cdFx0XHRcdHRoaXMuaGFuZGxlU2Nyb2xsXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHRzdXBlci5vbnVubG9hZCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjbGVhbnVwKCkge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgY2FyZCBjb21wb25lbnRzXHJcblx0XHR0aGlzLmNhcmRDb21wb25lbnRzLmZvckVhY2goKGNhcmQpID0+IHtcclxuXHRcdFx0Y2FyZC5vbnVubG9hZCgpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmNhcmRDb21wb25lbnRzID0gW107XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcigpIHtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuZW1wdHkoKTtcclxuXHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJ0Zy1xdWFkcmFudC1jb2x1bW5cIik7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKHRoaXMucXVhZHJhbnQuY2xhc3NOYW1lKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgaGVhZGVyXHJcblx0XHR0aGlzLmNyZWF0ZUhlYWRlcigpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBzY3JvbGxhYmxlIGNvbnRlbnQgYXJlYVxyXG5cdFx0dGhpcy5jcmVhdGVTY3JvbGxhYmxlQ29udGVudCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVIZWFkZXIoKSB7XHJcblx0XHR0aGlzLmhlYWRlckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXCJ0Zy1xdWFkcmFudC1oZWFkZXJcIik7XHJcblxyXG5cdFx0Ly8gVGl0bGUgYW5kIHByaW9yaXR5IGluZGljYXRvclxyXG5cdFx0Y29uc3QgdGl0bGVDb250YWluZXJFbCA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInRnLXF1YWRyYW50LXRpdGxlLWNvbnRhaW5lclwiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFByaW9yaXR5IGVtb2ppXHJcblx0XHRjb25zdCBwcmlvcml0eUVsID0gdGl0bGVDb250YWluZXJFbC5jcmVhdGVTcGFuKFwidGctcXVhZHJhbnQtcHJpb3JpdHlcIik7XHJcblx0XHRwcmlvcml0eUVsLnRleHRDb250ZW50ID0gdGhpcy5xdWFkcmFudC5wcmlvcml0eUVtb2ppO1xyXG5cclxuXHRcdC8vIFRpdGxlXHJcblx0XHR0aGlzLnRpdGxlRWwgPSB0aXRsZUNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LXRpdGxlXCIpO1xyXG5cdFx0dGhpcy50aXRsZUVsLnRleHRDb250ZW50ID0gdGhpcy5xdWFkcmFudC50aXRsZTtcclxuXHJcblx0XHQvLyBUYXNrIGNvdW50XHJcblx0XHR0aGlzLmNvdW50RWwgPSB0aGlzLmhlYWRlckVsLmNyZWF0ZURpdihcInRnLXF1YWRyYW50LWNvdW50XCIpO1xyXG5cdFx0dGhpcy51cGRhdGVDb3VudCgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVTY3JvbGxhYmxlQ29udGVudCgpIHtcclxuXHRcdC8vIENyZWF0ZSBzY3JvbGwgY29udGFpbmVyXHJcblx0XHR0aGlzLnNjcm9sbENvbnRhaW5lckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGctcXVhZHJhbnQtc2Nyb2xsLWNvbnRhaW5lclwiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEFkZCBzY3JvbGwgZXZlbnQgbGlzdGVuZXJcclxuXHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwuYWRkRXZlbnRMaXN0ZW5lcihcInNjcm9sbFwiLCB0aGlzLmhhbmRsZVNjcm9sbCwge1xyXG5cdFx0XHRwYXNzaXZlOiB0cnVlLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgYXJlYSBpbnNpZGUgc2Nyb2xsIGNvbnRhaW5lclxyXG5cdFx0dGhpcy5jb250ZW50RWwgPSB0aGlzLnNjcm9sbENvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJ0Zy1xdWFkcmFudC1jb2x1bW4tY29udGVudFwiXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5jb250ZW50RWwuc2V0QXR0cmlidXRlKFwiZGF0YS1xdWFkcmFudC1pZFwiLCB0aGlzLnF1YWRyYW50LmlkKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgbG9hZCBtb3JlIGluZGljYXRvclxyXG5cdFx0dGhpcy5jcmVhdGVMb2FkTW9yZUluZGljYXRvcigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjcmVhdGVMb2FkTW9yZUluZGljYXRvcigpIHtcclxuXHRcdHRoaXMubG9hZE1vcmVFbCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcInRnLXF1YWRyYW50LWxvYWQtbW9yZVwiXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IHNwaW5uZXJFbCA9IHRoaXMubG9hZE1vcmVFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGctcXVhZHJhbnQtbG9hZC1tb3JlLXNwaW5uZXJcIlxyXG5cdFx0KTtcclxuXHRcdHNldEljb24oc3Bpbm5lckVsLCBcImxvYWRlci0yXCIpO1xyXG5cclxuXHRcdGNvbnN0IG1lc3NhZ2VFbCA9IHRoaXMubG9hZE1vcmVFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwidGctcXVhZHJhbnQtbG9hZC1tb3JlLW1lc3NhZ2VcIlxyXG5cdFx0KTtcclxuXHRcdG1lc3NhZ2VFbC50ZXh0Q29udGVudCA9IHQoXCJMb2FkaW5nIG1vcmUgdGFza3MuLi5cIik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNoZWNrSW5pdGlhbFZpc2liaWxpdHkoKSB7XHJcblx0XHQvLyBGb3JjZSBsb2FkIGNvbnRlbnQgaWYgdGhlIGNvbHVtbiBpcyB2aXNpYmxlIGluIHZpZXdwb3J0XHJcblx0XHRpZiAoIXRoaXMuaXNDb250ZW50TG9hZGVkICYmIHRoaXMuaXNFbGVtZW50VmlzaWJsZSgpKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBGb3JjZSBsb2FkaW5nIGNvbnRlbnQgZm9yIHF1YWRyYW50OiAke3RoaXMucXVhZHJhbnQuaWR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmxvYWRDb250ZW50KCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzRWxlbWVudFZpc2libGUoKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIXRoaXMuY29udGFpbmVyRWwpIHJldHVybiBmYWxzZTtcclxuXHJcblx0XHQvLyBGb3IgcXVhZHJhbnQgZ3JpZCBsYXlvdXQsIGNoZWNrIGlmIHRoZSBjb2x1bW4gY29udGFpbmVyIGlzIHZpc2libGUgaW4gdmlld3BvcnRcclxuXHRcdGNvbnN0IGNvbnRhaW5lclJlY3QgPSB0aGlzLmNvbnRhaW5lckVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0Y29uc3Qgdmlld3BvcnRIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcblx0XHRjb25zdCB2aWV3cG9ydFdpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XHJcblxyXG5cdFx0Ly8gQ29sdW1uIGlzIHZpc2libGUgaWYgYW55IHBhcnQgb2YgaXQgaXMgaW4gdGhlIHZpZXdwb3J0XHJcblx0XHRjb25zdCBpc0luVmlld3BvcnQgPVxyXG5cdFx0XHRjb250YWluZXJSZWN0LnRvcCA8IHZpZXdwb3J0SGVpZ2h0ICYmXHJcblx0XHRcdGNvbnRhaW5lclJlY3QuYm90dG9tID4gMCAmJlxyXG5cdFx0XHRjb250YWluZXJSZWN0LmxlZnQgPCB2aWV3cG9ydFdpZHRoICYmXHJcblx0XHRcdGNvbnRhaW5lclJlY3QucmlnaHQgPiAwO1xyXG5cclxuXHRcdC8vIEZvciBncmlkIGxheW91dCwgYWxzbyBjaGVjayBpZiB0aGUgY29sdW1uIGhhcyByZWFzb25hYmxlIGRpbWVuc2lvbnNcclxuXHRcdGNvbnN0IGhhc1JlYXNvbmFibGVTaXplID1cclxuXHRcdFx0Y29udGFpbmVyUmVjdC53aWR0aCA+IDUwICYmIGNvbnRhaW5lclJlY3QuaGVpZ2h0ID4gNTA7XHJcblxyXG5cdFx0cmV0dXJuIGlzSW5WaWV3cG9ydCAmJiBoYXNSZWFzb25hYmxlU2l6ZTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBMYXp5TG9hZGluZygpIHtcclxuXHRcdC8vIEZvciBxdWFkcmFudCB2aWV3LCB3ZSBuZWVkIGEgZGlmZmVyZW50IGFwcHJvYWNoIHNpbmNlIGNvbHVtbnMgYXJlIGluIGEgZ3JpZFxyXG5cdFx0Ly8gYW5kIG1heSBub3QgYmUgcHJvcGVybHkgZGV0ZWN0ZWQgYnkgaW50ZXJzZWN0aW9uIG9ic2VydmVyXHJcblxyXG5cdFx0Ly8gRm9yIHNtYWxsIHRhc2sgY291bnRzLCBiZSBtb3JlIGFnZ3Jlc3NpdmUgYW5kIGxvYWQgaW1tZWRpYXRlbHlcclxuXHRcdGlmICh0aGlzLnRhc2tzLmxlbmd0aCA8PSB0aGlzLnBhZ2VTaXplKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdGBTbWFsbCB0YXNrIGNvdW50IGRldGVjdGVkICgke3RoaXMudGFza3MubGVuZ3RofSksIGxvYWRpbmcgaW1tZWRpYXRlbHkgZm9yICR7dGhpcy5xdWFkcmFudC5pZH1gXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMubG9hZENvbnRlbnQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpcnN0LCB0cnkgaW1tZWRpYXRlIGxvYWRpbmcgaWYgZWxlbWVudCBpcyB2aXNpYmxlXHJcblx0XHRpZiAodGhpcy5pc0VsZW1lbnRWaXNpYmxlKCkpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YEltbWVkaWF0ZWx5IGxvYWRpbmcgY29udGVudCBmb3IgdmlzaWJsZSBxdWFkcmFudDogJHt0aGlzLnF1YWRyYW50LmlkfWBcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5sb2FkQ29udGVudCgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGludGVyc2VjdGlvbiBvYnNlcnZlciBmb3IgbGF6eSBsb2FkaW5nIHdpdGggYm90aCB2aWV3cG9ydCBhbmQgY29udGFpbmVyIGRldGVjdGlvblxyXG5cdFx0dGhpcy5pbnRlcnNlY3Rpb25PYnNlcnZlciA9IG5ldyBJbnRlcnNlY3Rpb25PYnNlcnZlcihcclxuXHRcdFx0KGVudHJpZXMpID0+IHtcclxuXHRcdFx0XHRlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XHJcblx0XHRcdFx0XHRpZiAoZW50cnkuaXNJbnRlcnNlY3RpbmcgJiYgIXRoaXMuaXNDb250ZW50TG9hZGVkKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdGBJbnRlcnNlY3Rpb24gdHJpZ2dlcmVkIGZvciBxdWFkcmFudDogJHt0aGlzLnF1YWRyYW50LmlkfWBcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2FkQ29udGVudCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0cm9vdDogbnVsbCwgLy8gVXNlIHZpZXdwb3J0IGFzIHJvb3QgZm9yIGJldHRlciBncmlkIGRldGVjdGlvblxyXG5cdFx0XHRcdHJvb3RNYXJnaW46IFwiMTAwcHhcIiwgLy8gTGFyZ2VyIG1hcmdpbiB0byBjYXRjaCBncmlkIGl0ZW1zXHJcblx0XHRcdFx0dGhyZXNob2xkOiAwLjAxLCAvLyBMb3dlciB0aHJlc2hvbGQgdG8gdHJpZ2dlciBtb3JlIGVhc2lseVxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFN0YXJ0IG9ic2VydmluZyB0aGUgY29udGVudCBlbGVtZW50XHJcblx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyLm9ic2VydmUodGhpcy5jb250ZW50RWwpO1xyXG5cclxuXHRcdC8vIEFsc28gb2JzZXJ2ZSB0aGUgY29udGFpbmVyIGVsZW1lbnQgYXMgYmFja3VwXHJcblx0XHRpZiAodGhpcy5jb250YWluZXJFbCkge1xyXG5cdFx0XHR0aGlzLmludGVyc2VjdGlvbk9ic2VydmVyLm9ic2VydmUodGhpcy5jb250YWluZXJFbCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwU2Nyb2xsTG9hZGluZygpIHtcclxuXHRcdC8vIENyZWF0ZSBpbnRlcnNlY3Rpb24gb2JzZXJ2ZXIgZm9yIHNjcm9sbCBsb2FkaW5nXHJcblx0XHR0aGlzLnNjcm9sbE9ic2VydmVyID0gbmV3IEludGVyc2VjdGlvbk9ic2VydmVyKFxyXG5cdFx0XHQoZW50cmllcykgPT4ge1xyXG5cdFx0XHRcdGVudHJpZXMuZm9yRWFjaCgoZW50cnkpID0+IHtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0ZW50cnkuaXNJbnRlcnNlY3RpbmcgJiZcclxuXHRcdFx0XHRcdFx0dGhpcy5oYXNNb3JlVGFza3MgJiZcclxuXHRcdFx0XHRcdFx0IXRoaXMuaXNMb2FkaW5nTW9yZSAmJlxyXG5cdFx0XHRcdFx0XHR0aGlzLmlzQ29udGVudExvYWRlZFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFwiVHJpZ2dlcmluZyBsb2FkTW9yZVRhc2tzIC0gaW50ZXJzZWN0aW9uIGRldGVjdGVkXCJcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0dGhpcy5sb2FkTW9yZVRhc2tzKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRyb290OiB0aGlzLnNjcm9sbENvbnRhaW5lckVsLCAvLyBVc2Ugc2Nyb2xsIGNvbnRhaW5lciBhcyByb290IGZvciBwcm9wZXIgZGV0ZWN0aW9uXHJcblx0XHRcdFx0cm9vdE1hcmdpbjogXCI1MHB4XCIsIC8vIFNtYWxsZXIgbWFyZ2luIGZvciBzY3JvbGwgY29udGFpbmVyXHJcblx0XHRcdFx0dGhyZXNob2xkOiAwLjEsXHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU3RhcnQgb2JzZXJ2aW5nIHRoZSBsb2FkIG1vcmUgZWxlbWVudCB3aGVuIGl0J3MgY3JlYXRlZFxyXG5cdFx0dGhpcy5vYnNlcnZlTG9hZE1vcmVFbGVtZW50KCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIG9ic2VydmVMb2FkTW9yZUVsZW1lbnQoKSB7XHJcblx0XHRpZiAodGhpcy5sb2FkTW9yZUVsICYmIHRoaXMuc2Nyb2xsT2JzZXJ2ZXIpIHtcclxuXHRcdFx0dGhpcy5zY3JvbGxPYnNlcnZlci5vYnNlcnZlKHRoaXMubG9hZE1vcmVFbCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGxvYWRDb250ZW50KCkge1xyXG5cdFx0aWYgKHRoaXMuaXNDb250ZW50TG9hZGVkKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5pc0NvbnRlbnRMb2FkZWQgPSB0cnVlO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBsb2FkaW5nIGluZGljYXRvciBpZiBpdCBleGlzdHNcclxuXHRcdGlmICh0aGlzLmxvYWRpbmdFbCkge1xyXG5cdFx0XHR0aGlzLmxvYWRpbmdFbC5yZW1vdmUoKTtcclxuXHRcdFx0dGhpcy5sb2FkaW5nRWwgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc2V0IHBhZ2luYXRpb25cclxuXHRcdHRoaXMuY3VycmVudFBhZ2UgPSAwO1xyXG5cdFx0dGhpcy5yZW5kZXJlZFRhc2tzID0gW107XHJcblxyXG5cdFx0Ly8gTG9hZCBmaXJzdCBwYWdlIG9mIHRhc2tzXHJcblx0XHRhd2FpdCB0aGlzLmxvYWRNb3JlVGFza3MoKTtcclxuXHJcblx0XHQvLyBTZXR1cCBzY3JvbGwgb2JzZXJ2ZXIgYWZ0ZXIgaW5pdGlhbCBsb2FkXHJcblx0XHR0aGlzLm9ic2VydmVMb2FkTW9yZUVsZW1lbnQoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgbG9hZE1vcmVUYXNrcygpIHtcclxuXHRcdGlmICh0aGlzLmlzTG9hZGluZ01vcmUpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBzbWFsbCB0YXNrIGNvdW50cywgZW5zdXJlIHdlIHN0aWxsIHByb2Nlc3MgdGhlbSBldmVuIGlmIGhhc01vcmVUYXNrcyBpcyBmYWxzZVxyXG5cdFx0Y29uc3Qgc2hvdWxkUHJvY2VzcyA9XHJcblx0XHRcdHRoaXMuaGFzTW9yZVRhc2tzIHx8XHJcblx0XHRcdCh0aGlzLnJlbmRlcmVkVGFza3MubGVuZ3RoID09PSAwICYmIHRoaXMudGFza3MubGVuZ3RoID4gMCk7XHJcblxyXG5cdFx0aWYgKCFzaG91bGRQcm9jZXNzKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmlzTG9hZGluZ01vcmUgPSB0cnVlO1xyXG5cdFx0dGhpcy5zaG93TG9hZE1vcmVJbmRpY2F0b3IoKTtcclxuXHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBDYWxjdWxhdGUgd2hpY2ggdGFza3MgdG8gbG9hZCBmb3IgdGhpcyBwYWdlXHJcblx0XHRcdGNvbnN0IHN0YXJ0SW5kZXggPSB0aGlzLmN1cnJlbnRQYWdlICogdGhpcy5wYWdlU2l6ZTtcclxuXHRcdFx0Y29uc3QgZW5kSW5kZXggPSBzdGFydEluZGV4ICsgdGhpcy5wYWdlU2l6ZTtcclxuXHRcdFx0Y29uc3QgdGFza3NUb0xvYWQgPSB0aGlzLnRhc2tzLnNsaWNlKHN0YXJ0SW5kZXgsIGVuZEluZGV4KTtcclxuXHJcblx0XHRcdGlmICh0YXNrc1RvTG9hZC5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0XHR0aGlzLmhhc01vcmVUYXNrcyA9IGZhbHNlO1xyXG5cdFx0XHRcdHRoaXMuaGlkZUxvYWRNb3JlSW5kaWNhdG9yKCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgdGFza3MgdG8gcmVuZGVyZWQgbGlzdFxyXG5cdFx0XHR0aGlzLnJlbmRlcmVkVGFza3MucHVzaCguLi50YXNrc1RvTG9hZCk7XHJcblxyXG5cdFx0XHQvLyBSZW5kZXIgdGhlIG5ldyBiYXRjaCBvZiB0YXNrc1xyXG5cdFx0XHRhd2FpdCB0aGlzLnJlbmRlclRhc2tCYXRjaCh0YXNrc1RvTG9hZCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgcGFnaW5hdGlvblxyXG5cdFx0XHR0aGlzLmN1cnJlbnRQYWdlKys7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGVyZSBhcmUgbW9yZSB0YXNrcyB0byBsb2FkXHJcblx0XHRcdGlmIChlbmRJbmRleCA+PSB0aGlzLnRhc2tzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHRoaXMuaGFzTW9yZVRhc2tzID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5oaWRlTG9hZE1vcmVJbmRpY2F0b3IoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBTaG93IGxvYWQgbW9yZSBpbmRpY2F0b3IgaWYgdGhlcmUgYXJlIG1vcmUgdGFza3NcclxuXHRcdFx0XHR0aGlzLnNob3dMb2FkTW9yZUluZGljYXRvcigpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgbG9hZGluZyBtb3JlIHRhc2tzOlwiLCBlcnJvcik7XHJcblx0XHR9IGZpbmFsbHkge1xyXG5cdFx0XHR0aGlzLmlzTG9hZGluZ01vcmUgPSBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd0xvYWRNb3JlSW5kaWNhdG9yKCkge1xyXG5cdFx0aWYgKHRoaXMubG9hZE1vcmVFbCAmJiB0aGlzLmhhc01vcmVUYXNrcykge1xyXG5cdFx0XHR0aGlzLmxvYWRNb3JlRWwuYWRkQ2xhc3MoXCJ0Zy1xdWFkcmFudC1sb2FkLW1vcmUtLXZpc2libGVcIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhpZGVMb2FkTW9yZUluZGljYXRvcigpIHtcclxuXHRcdGlmICh0aGlzLmxvYWRNb3JlRWwpIHtcclxuXHRcdFx0dGhpcy5sb2FkTW9yZUVsLnJlbW92ZUNsYXNzKFwidGctcXVhZHJhbnQtbG9hZC1tb3JlLS12aXNpYmxlXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblxyXG5cclxuXHRwdWJsaWMgc2V0VGFza3ModGFza3M6IFRhc2tbXSkge1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBzZXRUYXNrcyBjYWxsZWQgZm9yICR7dGhpcy5xdWFkcmFudC5pZH0gd2l0aCAke3Rhc2tzLmxlbmd0aH0gdGFza3NgXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRhc2tzIGhhdmUgYWN0dWFsbHkgY2hhbmdlZCB0byBhdm9pZCB1bm5lY2Vzc2FyeSByZS1yZW5kZXJzXHJcblx0XHRpZiAodGhpcy5hcmVUYXNrc0VxdWFsKHRoaXMudGFza3MsIHRhc2tzKSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRgVGFza3MgdW5jaGFuZ2VkIGZvciAke3RoaXMucXVhZHJhbnQuaWR9LCBza2lwcGluZyBzZXRUYXNrc2BcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudGFza3MgPSB0YXNrcztcclxuXHRcdHRoaXMudXBkYXRlQ291bnQoKTtcclxuXHJcblx0XHQvLyBSZXNldCBwYWdpbmF0aW9uIHN0YXRlXHJcblx0XHR0aGlzLmN1cnJlbnRQYWdlID0gMDtcclxuXHRcdHRoaXMucmVuZGVyZWRUYXNrcyA9IFtdO1xyXG5cdFx0dGhpcy5oYXNNb3JlVGFza3MgPSB0YXNrcy5sZW5ndGggPiB0aGlzLnBhZ2VTaXplO1xyXG5cclxuXHRcdC8vIEFsd2F5cyB0cnkgdG8gbG9hZCBjb250ZW50IGltbWVkaWF0ZWx5IGlmIHdlIGhhdmUgdGFza3NcclxuXHRcdGlmICh0YXNrcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGlmICh0aGlzLmlzQ29udGVudExvYWRlZCkge1xyXG5cdFx0XHRcdC8vIFJlLXJlbmRlciBpbW1lZGlhdGVseSBpZiBhbHJlYWR5IGxvYWRlZFxyXG5cdFx0XHRcdHRoaXMucmVuZGVyVGFza3MoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBGb3Igc21hbGwgdGFzayBjb3VudHMsIGxvYWQgaW1tZWRpYXRlbHkgd2l0aG91dCBsYXp5IGxvYWRpbmdcclxuXHRcdFx0XHRpZiAodGFza3MubGVuZ3RoIDw9IHRoaXMucGFnZVNpemUpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgU21hbGwgdGFzayBjb3VudCAoJHt0YXNrcy5sZW5ndGh9KSwgbG9hZGluZyBpbW1lZGlhdGVseSBmb3IgJHt0aGlzLnF1YWRyYW50LmlkfWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHQvLyBGb3JjZSBpbW1lZGlhdGUgbG9hZGluZyBmb3Igc21hbGwgdGFzayBjb3VudHNcclxuXHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmxvYWRDb250ZW50KCk7XHJcblx0XHRcdFx0XHR9LCA1MCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIE1vcmUgYWdncmVzc2l2ZSBsb2FkaW5nIHN0cmF0ZWd5IC0gbG9hZCBjb250ZW50IGZvciBhbGwgY29sdW1uc1xyXG5cdFx0XHRcdFx0Ly8gc2luY2UgdGhlIHF1YWRyYW50IHZpZXcgaXMgdHlwaWNhbGx5IHNtYWxsIGVub3VnaCB0byBzaG93IGFsbCBjb2x1bW5zXHJcblx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKCF0aGlzLmlzQ29udGVudExvYWRlZCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRcdFx0YEZvcmNlIGxvYWRpbmcgY29udGVudCBmb3IgJHt0aGlzLnF1YWRyYW50LmlkfSBhZnRlciBzZXRUYXNrcyAoYWdncmVzc2l2ZSlgXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmxvYWRDb250ZW50KCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIDEwMCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBIYW5kbGUgZW1wdHkgc3RhdGVcclxuXHRcdFx0aWYgKHRoaXMuaXNDb250ZW50TG9hZGVkKSB7XHJcblx0XHRcdFx0dGhpcy5zaG93RW1wdHlTdGF0ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB0d28gdGFzayBhcnJheXMgYXJlIGVxdWFsIChzYW1lIHRhc2tzIGluIHNhbWUgb3JkZXIpXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhcmVUYXNrc0VxdWFsKGN1cnJlbnRUYXNrczogVGFza1tdLCBuZXdUYXNrczogVGFza1tdKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoY3VycmVudFRhc2tzLmxlbmd0aCAhPT0gbmV3VGFza3MubGVuZ3RoKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoY3VycmVudFRhc2tzLmxlbmd0aCA9PT0gMCAmJiBuZXdUYXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUXVpY2sgSUQtYmFzZWQgY29tcGFyaXNvbiBmaXJzdFxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50VGFza3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKGN1cnJlbnRUYXNrc1tpXS5pZCAhPT0gbmV3VGFza3NbaV0uaWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBJRHMgbWF0Y2gsIGRvIGEgZGVlcGVyIGNvbXBhcmlzb24gb2YgY29udGVudFxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjdXJyZW50VGFza3MubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0aWYgKCF0aGlzLmFyZVRhc2tzQ29udGVudEVxdWFsKGN1cnJlbnRUYXNrc1tpXSwgbmV3VGFza3NbaV0pKSB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiB0d28gaW5kaXZpZHVhbCB0YXNrcyBoYXZlIGVxdWFsIGNvbnRlbnRcclxuXHQgKi9cclxuXHRwcml2YXRlIGFyZVRhc2tzQ29udGVudEVxdWFsKHRhc2sxOiBUYXNrLCB0YXNrMjogVGFzayk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gQ29tcGFyZSBiYXNpYyBwcm9wZXJ0aWVzXHJcblx0XHRpZiAoXHJcblx0XHRcdHRhc2sxLmNvbnRlbnQgIT09IHRhc2syLmNvbnRlbnQgfHxcclxuXHRcdFx0dGFzazEuc3RhdHVzICE9PSB0YXNrMi5zdGF0dXMgfHxcclxuXHRcdFx0dGFzazEuY29tcGxldGVkICE9PSB0YXNrMi5jb21wbGV0ZWRcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29tcGFyZSBtZXRhZGF0YSBpZiBpdCBleGlzdHNcclxuXHRcdGlmICh0YXNrMS5tZXRhZGF0YSAmJiB0YXNrMi5tZXRhZGF0YSkge1xyXG5cdFx0XHQvLyBDaGVjayBpbXBvcnRhbnQgbWV0YWRhdGEgZmllbGRzXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHR0YXNrMS5tZXRhZGF0YS5wcmlvcml0eSAhPT0gdGFzazIubWV0YWRhdGEucHJpb3JpdHkgfHxcclxuXHRcdFx0XHR0YXNrMS5tZXRhZGF0YS5kdWVEYXRlICE9PSB0YXNrMi5tZXRhZGF0YS5kdWVEYXRlIHx8XHJcblx0XHRcdFx0dGFzazEubWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSAhPT0gdGFzazIubWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSB8fFxyXG5cdFx0XHRcdHRhc2sxLm1ldGFkYXRhLnN0YXJ0RGF0ZSAhPT0gdGFzazIubWV0YWRhdGEuc3RhcnREYXRlXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdGFnc1xyXG5cdFx0XHRjb25zdCB0YWdzMSA9IHRhc2sxLm1ldGFkYXRhLnRhZ3MgfHwgW107XHJcblx0XHRcdGNvbnN0IHRhZ3MyID0gdGFzazIubWV0YWRhdGEudGFncyB8fCBbXTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRhZ3MxLmxlbmd0aCAhPT0gdGFnczIubGVuZ3RoIHx8XHJcblx0XHRcdFx0IXRhZ3MxLmV2ZXJ5KCh0YWcpID0+IHRhZ3MyLmluY2x1ZGVzKHRhZykpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmICh0YXNrMS5tZXRhZGF0YSAhPT0gdGFzazIubWV0YWRhdGEpIHtcclxuXHRcdFx0Ly8gT25lIGhhcyBtZXRhZGF0YSwgdGhlIG90aGVyIGRvZXNuJ3RcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9yY2UgdXBkYXRlIHRhc2tzIGV2ZW4gaWYgdGhleSBhcHBlYXIgdG8gYmUgdGhlIHNhbWVcclxuXHQgKi9cclxuXHRwdWJsaWMgZm9yY2VTZXRUYXNrcyh0YXNrczogVGFza1tdKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YGZvcmNlU2V0VGFza3MgY2FsbGVkIGZvciAke3RoaXMucXVhZHJhbnQuaWR9IHdpdGggJHt0YXNrcy5sZW5ndGh9IHRhc2tzYFxyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnRhc2tzID0gdGFza3M7XHJcblx0XHR0aGlzLnVwZGF0ZUNvdW50KCk7XHJcblxyXG5cdFx0Ly8gUmVzZXQgcGFnaW5hdGlvbiBzdGF0ZVxyXG5cdFx0dGhpcy5jdXJyZW50UGFnZSA9IDA7XHJcblx0XHR0aGlzLnJlbmRlcmVkVGFza3MgPSBbXTtcclxuXHRcdHRoaXMuaGFzTW9yZVRhc2tzID0gdGFza3MubGVuZ3RoID4gdGhpcy5wYWdlU2l6ZTtcclxuXHJcblx0XHQvLyBBbHdheXMgcmUtcmVuZGVyXHJcblx0XHRpZiAodGhpcy5pc0NvbnRlbnRMb2FkZWQpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJUYXNrcygpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5sb2FkQ29udGVudCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGEgc2luZ2xlIHRhc2sgaW4gdGhlIGNvbHVtblxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVUYXNrKHVwZGF0ZWRUYXNrOiBUYXNrKSB7XHJcblx0XHRjb25zdCB0YXNrSW5kZXggPSB0aGlzLnRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0KHRhc2spID0+IHRhc2suaWQgPT09IHVwZGF0ZWRUYXNrLmlkXHJcblx0XHQpO1xyXG5cdFx0aWYgKHRhc2tJbmRleCA9PT0gLTEpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdGBUYXNrICR7dXBkYXRlZFRhc2suaWR9IG5vdCBmb3VuZCBpbiBxdWFkcmFudCAke3RoaXMucXVhZHJhbnQuaWR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIHRhc2sgYWN0dWFsbHkgY2hhbmdlZFxyXG5cdFx0aWYgKHRoaXMuYXJlVGFza3NDb250ZW50RXF1YWwodGhpcy50YXNrc1t0YXNrSW5kZXhdLCB1cGRhdGVkVGFzaykpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coYFRhc2sgJHt1cGRhdGVkVGFzay5pZH0gdW5jaGFuZ2VkLCBza2lwcGluZyB1cGRhdGVgKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgdGFza1xyXG5cdFx0dGhpcy50YXNrc1t0YXNrSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblx0XHR0aGlzLnVwZGF0ZUNvdW50KCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSByZW5kZXJlZCB0YXNrIGlmIGl0J3MgY3VycmVudGx5IHZpc2libGVcclxuXHRcdGNvbnN0IHJlbmRlcmVkSW5kZXggPSB0aGlzLnJlbmRlcmVkVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodGFzaykgPT4gdGFzay5pZCA9PT0gdXBkYXRlZFRhc2suaWRcclxuXHRcdCk7XHJcblx0XHRpZiAocmVuZGVyZWRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJlZFRhc2tzW3JlbmRlcmVkSW5kZXhdID0gdXBkYXRlZFRhc2s7XHJcblxyXG5cdFx0XHQvLyBGaW5kIGFuZCB1cGRhdGUgdGhlIGNhcmQgY29tcG9uZW50XHJcblx0XHRcdGNvbnN0IGNhcmRDb21wb25lbnQgPSB0aGlzLmNhcmRDb21wb25lbnRzLmZpbmQoKGNhcmQpID0+IHtcclxuXHRcdFx0XHRjb25zdCBjYXJkRWwgPSBjYXJkLmNvbnRhaW5lckVsO1xyXG5cdFx0XHRcdHJldHVybiBjYXJkRWwuZ2V0QXR0cmlidXRlKFwiZGF0YS10YXNrLWlkXCIpID09PSB1cGRhdGVkVGFzay5pZDtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpZiAoY2FyZENvbXBvbmVudCkge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSB0aGUgY2FyZCBjb21wb25lbnQgd2l0aCBuZXcgdGFzayBkYXRhXHJcblx0XHRcdFx0Y2FyZENvbXBvbmVudC51cGRhdGVUYXNrKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRgVXBkYXRlZCB0YXNrICR7dXBkYXRlZFRhc2suaWR9IGluIHF1YWRyYW50ICR7dGhpcy5xdWFkcmFudC5pZH1gXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQWRkIGEgdGFzayB0byB0aGUgY29sdW1uXHJcblx0ICovXHJcblx0cHVibGljIGFkZFRhc2sodGFzazogVGFzaykge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGFzayBhbHJlYWR5IGV4aXN0c1xyXG5cdFx0aWYgKHRoaXMudGFza3Muc29tZSgodCkgPT4gdC5pZCA9PT0gdGFzay5pZCkpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdGBUYXNrICR7dGFzay5pZH0gYWxyZWFkeSBleGlzdHMgaW4gcXVhZHJhbnQgJHt0aGlzLnF1YWRyYW50LmlkfWBcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudGFza3MucHVzaCh0YXNrKTtcclxuXHRcdHRoaXMudXBkYXRlQ291bnQoKTtcclxuXHJcblx0XHQvLyBJZiBjb250ZW50IGlzIGxvYWRlZCBhbmQgd2UgaGF2ZSBzcGFjZSwgcmVuZGVyIHRoZSBuZXcgdGFza1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLmlzQ29udGVudExvYWRlZCAmJlxyXG5cdFx0XHR0aGlzLnJlbmRlcmVkVGFza3MubGVuZ3RoIDwgdGhpcy50YXNrcy5sZW5ndGhcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLnJlbmRlcmVkVGFza3MucHVzaCh0YXNrKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJTaW5nbGVUYXNrKHRhc2spO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnNvbGUubG9nKGBBZGRlZCB0YXNrICR7dGFzay5pZH0gdG8gcXVhZHJhbnQgJHt0aGlzLnF1YWRyYW50LmlkfWApO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGEgdGFzayBmcm9tIHRoZSBjb2x1bW5cclxuXHQgKi9cclxuXHRwdWJsaWMgcmVtb3ZlVGFzayh0YXNrSWQ6IHN0cmluZykge1xyXG5cdFx0Y29uc3QgdGFza0luZGV4ID0gdGhpcy50YXNrcy5maW5kSW5kZXgoKHRhc2spID0+IHRhc2suaWQgPT09IHRhc2tJZCk7XHJcblx0XHRpZiAodGFza0luZGV4ID09PSAtMSkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YFRhc2sgJHt0YXNrSWR9IG5vdCBmb3VuZCBpbiBxdWFkcmFudCAke3RoaXMucXVhZHJhbnQuaWR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gdGFza3MgYXJyYXlcclxuXHRcdHRoaXMudGFza3Muc3BsaWNlKHRhc2tJbmRleCwgMSk7XHJcblx0XHR0aGlzLnVwZGF0ZUNvdW50KCk7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGZyb20gcmVuZGVyZWQgdGFza3NcclxuXHRcdGNvbnN0IHJlbmRlcmVkSW5kZXggPSB0aGlzLnJlbmRlcmVkVGFza3MuZmluZEluZGV4KFxyXG5cdFx0XHQodGFzaykgPT4gdGFzay5pZCA9PT0gdGFza0lkXHJcblx0XHQpO1xyXG5cdFx0aWYgKHJlbmRlcmVkSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyZWRUYXNrcy5zcGxpY2UocmVuZGVyZWRJbmRleCwgMSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGNhcmQgY29tcG9uZW50XHJcblx0XHRjb25zdCBjYXJkSW5kZXggPSB0aGlzLmNhcmRDb21wb25lbnRzLmZpbmRJbmRleCgoY2FyZCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjYXJkRWwgPSBjYXJkLmNvbnRhaW5lckVsO1xyXG5cdFx0XHRyZXR1cm4gY2FyZEVsLmdldEF0dHJpYnV0ZShcImRhdGEtdGFzay1pZFwiKSA9PT0gdGFza0lkO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKGNhcmRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0Y29uc3QgY2FyZCA9IHRoaXMuY2FyZENvbXBvbmVudHNbY2FyZEluZGV4XTtcclxuXHRcdFx0Y2FyZC5vbnVubG9hZCgpO1xyXG5cdFx0XHRjYXJkLmNvbnRhaW5lckVsLnJlbW92ZSgpO1xyXG5cdFx0XHR0aGlzLmNhcmRDb21wb25lbnRzLnNwbGljZShjYXJkSW5kZXgsIDEpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gdGFza3MgbGVmdFxyXG5cdFx0aWYgKHRoaXMudGFza3MubGVuZ3RoID09PSAwICYmIHRoaXMuaXNDb250ZW50TG9hZGVkKSB7XHJcblx0XHRcdHRoaXMuc2hvd0VtcHR5U3RhdGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhgUmVtb3ZlZCB0YXNrICR7dGFza0lkfSBmcm9tIHF1YWRyYW50ICR7dGhpcy5xdWFkcmFudC5pZH1gKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciBhIHNpbmdsZSB0YXNrICh1c2VkIGZvciBhZGRpbmcgbmV3IHRhc2tzKVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgcmVuZGVyU2luZ2xlVGFzayh0YXNrOiBUYXNrKSB7XHJcblx0XHRjb25zdCBjYXJkRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0Y2FyZEVsLmNsYXNzTmFtZSA9IFwidGctcXVhZHJhbnQtY2FyZFwiO1xyXG5cdFx0Y2FyZEVsLnNldEF0dHJpYnV0ZShcImRhdGEtdGFzay1pZFwiLCB0YXNrLmlkKTtcclxuXHJcblx0XHRjb25zdCBjYXJkID0gbmV3IFF1YWRyYW50Q2FyZENvbXBvbmVudChcclxuXHRcdFx0dGhpcy5hcHAsXHJcblx0XHRcdHRoaXMucGx1Z2luLFxyXG5cdFx0XHRjYXJkRWwsXHJcblx0XHRcdHRhc2ssXHJcblx0XHRcdHtcclxuXHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6IHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZSxcclxuXHRcdFx0XHRvblRhc2tTZWxlY3RlZDogdGhpcy5wYXJhbXMub25UYXNrU2VsZWN0ZWQsXHJcblx0XHRcdFx0b25UYXNrQ29tcGxldGVkOiB0aGlzLnBhcmFtcy5vblRhc2tDb21wbGV0ZWQsXHJcblx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IHRoaXMucGFyYW1zLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdG9uVGFza1VwZGF0ZWQ6IGFzeW5jICh1cGRhdGVkVGFzazogVGFzaykgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5wYXJhbXMub25UYXNrVXBkYXRlZD8uKHVwZGF0ZWRUYXNrKTtcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuYWRkQ2hpbGQoY2FyZCk7XHJcblx0XHR0aGlzLmNhcmRDb21wb25lbnRzLnB1c2goY2FyZCk7XHJcblx0XHR0aGlzLmNvbnRlbnRFbC5hcHBlbmRDaGlsZChjYXJkRWwpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB1cGRhdGVDb3VudCgpIHtcclxuXHRcdGlmICh0aGlzLmNvdW50RWwpIHtcclxuXHRcdFx0dGhpcy5jb3VudEVsLnRleHRDb250ZW50ID0gYCR7dGhpcy50YXNrcy5sZW5ndGh9ICR7XHJcblx0XHRcdFx0dGhpcy50YXNrcy5sZW5ndGggPT09IDEgPyB0KFwidGFza1wiKSA6IHQoXCJ0YXNrc1wiKVxyXG5cdFx0XHR9YDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgcmVuZGVyVGFza3MoKSB7XHJcblx0XHRpZiAoIXRoaXMuY29udGVudEVsKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgZXhpc3RpbmcgY29tcG9uZW50c1xyXG5cdFx0dGhpcy5jbGVhbnVwKCk7XHJcblxyXG5cdFx0Ly8gQ2xlYXIgY29udGVudFxyXG5cdFx0dGhpcy5jb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBSZXNldCBwYWdpbmF0aW9uIGFuZCByZW5kZXIgZmlyc3QgcGFnZVxyXG5cdFx0dGhpcy5jdXJyZW50UGFnZSA9IDA7XHJcblx0XHR0aGlzLnJlbmRlcmVkVGFza3MgPSBbXTtcclxuXHRcdHRoaXMuaGFzTW9yZVRhc2tzID0gdGhpcy50YXNrcy5sZW5ndGggPiB0aGlzLnBhZ2VTaXplO1xyXG5cclxuXHRcdGF3YWl0IHRoaXMubG9hZE1vcmVUYXNrcygpO1xyXG5cclxuXHRcdC8vIFNob3cgZW1wdHkgc3RhdGUgaWYgbm8gdGFza3NcclxuXHRcdGlmICh0aGlzLnRhc2tzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLnNob3dFbXB0eVN0YXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHJlbmRlclRhc2tCYXRjaCh0YXNrczogVGFza1tdKSB7XHJcblx0XHRpZiAoIXRhc2tzLmxlbmd0aCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IGZyYWdtZW50ID0gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cclxuXHRcdC8vIFJlbmRlciB0YXNrcyBpbiBzbWFsbGVyIHN1Yi1iYXRjaGVzIHRvIHByZXZlbnQgVUkgYmxvY2tpbmdcclxuXHRcdGNvbnN0IHN1YkJhdGNoU2l6ZSA9IDU7XHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhc2tzLmxlbmd0aDsgaSArPSBzdWJCYXRjaFNpemUpIHtcclxuXHRcdFx0Y29uc3Qgc3ViQmF0Y2ggPSB0YXNrcy5zbGljZShpLCBpICsgc3ViQmF0Y2hTaXplKTtcclxuXHJcblx0XHRcdHN1YkJhdGNoLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdFx0XHRjb25zdCBjYXJkRWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0XHRcdGNhcmRFbC5jbGFzc05hbWUgPSBcInRnLXF1YWRyYW50LWNhcmRcIjtcclxuXHRcdFx0XHRjYXJkRWwuc2V0QXR0cmlidXRlKFwiZGF0YS10YXNrLWlkXCIsIHRhc2suaWQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBjYXJkID0gbmV3IFF1YWRyYW50Q2FyZENvbXBvbmVudChcclxuXHRcdFx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFx0XHRjYXJkRWwsXHJcblx0XHRcdFx0XHR0YXNrLFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRvblRhc2tTdGF0dXNVcGRhdGU6IHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZSxcclxuXHRcdFx0XHRcdFx0b25UYXNrU2VsZWN0ZWQ6IHRoaXMucGFyYW1zLm9uVGFza1NlbGVjdGVkLFxyXG5cdFx0XHRcdFx0XHRvblRhc2tDb21wbGV0ZWQ6IHRoaXMucGFyYW1zLm9uVGFza0NvbXBsZXRlZCxcclxuXHRcdFx0XHRcdFx0b25UYXNrQ29udGV4dE1lbnU6IHRoaXMucGFyYW1zLm9uVGFza0NvbnRleHRNZW51LFxyXG5cdFx0XHRcdFx0XHRvblRhc2tVcGRhdGVkOiBhc3luYyAodXBkYXRlZFRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdFx0XHQvLyBOb3RpZnkgcGFyZW50IHF1YWRyYW50IGNvbXBvbmVudCB0aGF0IGEgdGFzayB3YXMgdXBkYXRlZFxyXG5cdFx0XHRcdFx0XHRcdC8vIFRoaXMgd2lsbCB0cmlnZ2VyIGEgcmVmcmVzaCB0byByZS1jYXRlZ29yaXplIHRhc2tzXHJcblx0XHRcdFx0XHRcdFx0aWYgKHRoaXMucGFyYW1zLm9uVGFza1N0YXR1c1VwZGF0ZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0YXdhaXQgdGhpcy5wYXJhbXMub25UYXNrU3RhdHVzVXBkYXRlKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkVGFzay5pZCxcclxuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZFRhc2suc3RhdHVzXHJcblx0XHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHR0aGlzLmFkZENoaWxkKGNhcmQpO1xyXG5cdFx0XHRcdHRoaXMuY2FyZENvbXBvbmVudHMucHVzaChjYXJkKTtcclxuXHRcdFx0XHRmcmFnbWVudC5hcHBlbmRDaGlsZChjYXJkRWwpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNtYWxsIGRlbGF5IGJldHdlZW4gc3ViLWJhdGNoZXNcclxuXHRcdFx0aWYgKGkgKyBzdWJCYXRjaFNpemUgPCB0YXNrcy5sZW5ndGgpIHtcclxuXHRcdFx0XHRhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1KSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmNvbnRlbnRFbC5hcHBlbmRDaGlsZChmcmFnbWVudCk7XHJcblxyXG5cdFx0Ly8gRm9yY2UgYSBzY3JvbGwgY2hlY2sgYWZ0ZXIgcmVuZGVyaW5nXHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5jaGVja1Njcm9sbFBvc2l0aW9uKCk7XHJcblx0XHR9LCAxMDApO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjaGVja1Njcm9sbFBvc2l0aW9uKCkge1xyXG5cdFx0aWYgKCF0aGlzLnNjcm9sbENvbnRhaW5lckVsIHx8ICF0aGlzLmxvYWRNb3JlRWwpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBjb250YWluZXIgPSB0aGlzLnNjcm9sbENvbnRhaW5lckVsO1xyXG5cdFx0Y29uc3QgbG9hZE1vcmUgPSB0aGlzLmxvYWRNb3JlRWw7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgbG9hZCBtb3JlIGVsZW1lbnQgaXMgdmlzaWJsZSB3aXRoaW4gdGhlIHNjcm9sbCBjb250YWluZXJcclxuXHRcdGNvbnN0IGNvbnRhaW5lclJlY3QgPSBjb250YWluZXIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRjb25zdCBsb2FkTW9yZVJlY3QgPSBsb2FkTW9yZS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcblx0XHQvLyBNb3JlIHByZWNpc2UgdmlzaWJpbGl0eSBjaGVjayBmb3IgbmVzdGVkIHNjcm9sbCBjb250YWluZXJzXHJcblx0XHRjb25zdCBpc1Zpc2libGUgPVxyXG5cdFx0XHRsb2FkTW9yZVJlY3QudG9wIDwgY29udGFpbmVyUmVjdC5ib3R0b20gJiZcclxuXHRcdFx0bG9hZE1vcmVSZWN0LmJvdHRvbSA+IGNvbnRhaW5lclJlY3QudG9wICYmXHJcblx0XHRcdGxvYWRNb3JlUmVjdC5sZWZ0IDwgY29udGFpbmVyUmVjdC5yaWdodCAmJlxyXG5cdFx0XHRsb2FkTW9yZVJlY3QucmlnaHQgPiBjb250YWluZXJSZWN0LmxlZnQ7XHJcblxyXG5cdFx0Ly8gQWxzbyBjaGVjayBzY3JvbGwgcG9zaXRpb24gYXMgYmFja3VwXHJcblx0XHRjb25zdCBzY3JvbGxUb3AgPSBjb250YWluZXIuc2Nyb2xsVG9wO1xyXG5cdFx0Y29uc3Qgc2Nyb2xsSGVpZ2h0ID0gY29udGFpbmVyLnNjcm9sbEhlaWdodDtcclxuXHRcdGNvbnN0IGNsaWVudEhlaWdodCA9IGNvbnRhaW5lci5jbGllbnRIZWlnaHQ7XHJcblx0XHRjb25zdCBpc05lYXJCb3R0b20gPSBzY3JvbGxUb3AgKyBjbGllbnRIZWlnaHQgPj0gc2Nyb2xsSGVpZ2h0IC0gMTAwO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0KGlzVmlzaWJsZSB8fCBpc05lYXJCb3R0b20pICYmXHJcblx0XHRcdHRoaXMuaGFzTW9yZVRhc2tzICYmXHJcblx0XHRcdCF0aGlzLmlzTG9hZGluZ01vcmVcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLmxvYWRNb3JlVGFza3MoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd0VtcHR5U3RhdGUoKSB7XHJcblx0XHRjb25zdCBlbXB0eUVsID0gdGhpcy5jb250ZW50RWwuY3JlYXRlRGl2KFwidGctcXVhZHJhbnQtZW1wdHktc3RhdGVcIik7XHJcblxyXG5cdFx0Y29uc3QgaWNvbkVsID0gZW1wdHlFbC5jcmVhdGVEaXYoXCJ0Zy1xdWFkcmFudC1lbXB0eS1pY29uXCIpO1xyXG5cdFx0c2V0SWNvbihpY29uRWwsIFwiaW5ib3hcIik7XHJcblxyXG5cdFx0Y29uc3QgbWVzc2FnZUVsID0gZW1wdHlFbC5jcmVhdGVEaXYoXCJ0Zy1xdWFkcmFudC1lbXB0eS1tZXNzYWdlXCIpO1xyXG5cdFx0bWVzc2FnZUVsLnRleHRDb250ZW50ID0gdGhpcy5nZXRFbXB0eVN0YXRlTWVzc2FnZSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXRFbXB0eVN0YXRlTWVzc2FnZSgpOiBzdHJpbmcge1xyXG5cdFx0c3dpdGNoICh0aGlzLnF1YWRyYW50LmlkKSB7XHJcblx0XHRcdGNhc2UgXCJ1cmdlbnQtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIHQoXCJObyBjcmlzaXMgdGFza3MgLSBncmVhdCBqb2IhXCIpO1xyXG5cdFx0XHRjYXNlIFwibm90LXVyZ2VudC1pbXBvcnRhbnRcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcIk5vIHBsYW5uaW5nIHRhc2tzIC0gY29uc2lkZXIgYWRkaW5nIHNvbWUgZ29hbHNcIik7XHJcblx0XHRcdGNhc2UgXCJ1cmdlbnQtbm90LWltcG9ydGFudFwiOlxyXG5cdFx0XHRcdHJldHVybiB0KFwiTm8gaW50ZXJydXB0aW9ucyAtIGZvY3VzIHRpbWUhXCIpO1xyXG5cdFx0XHRjYXNlIFwibm90LXVyZ2VudC1ub3QtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIHQoXCJObyB0aW1lIHdhc3RlcnMgLSBleGNlbGxlbnQgZm9jdXMhXCIpO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiB0KFwiTm8gdGFza3MgaW4gdGhpcyBxdWFkcmFudFwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzZXRWaXNpYmlsaXR5KHZpc2libGU6IGJvb2xlYW4pIHtcclxuXHRcdGlmICh2aXNpYmxlKSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlQ2xhc3MoXCJ0Zy1xdWFkcmFudC1jb2x1bW4tLWhpZGRlblwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwuYWRkQ2xhc3MoXCJ0Zy1xdWFkcmFudC1jb2x1bW4tLWhpZGRlblwiKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBhZGREcm9wSW5kaWNhdG9yKCkge1xyXG5cdFx0dGhpcy5jb250ZW50RWwuYWRkQ2xhc3MoXCJ0Zy1xdWFkcmFudC1jb2x1bW4tY29udGVudC0tZHJvcC1hY3RpdmVcIik7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLmFkZENsYXNzKFwidGctcXVhZHJhbnQtY29sdW1uLS1kcmFnLXRhcmdldFwiKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyByZW1vdmVEcm9wSW5kaWNhdG9yKCkge1xyXG5cdFx0dGhpcy5jb250ZW50RWwucmVtb3ZlQ2xhc3MoXCJ0Zy1xdWFkcmFudC1jb2x1bW4tY29udGVudC0tZHJvcC1hY3RpdmVcIik7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsLnJlbW92ZUNsYXNzKFwidGctcXVhZHJhbnQtY29sdW1uLS1kcmFnLXRhcmdldFwiKTtcclxuXHRcdC8vIEFsc28gcmVtb3ZlIGFueSBvdGhlciBkcmFnLXJlbGF0ZWQgY2xhc3Nlc1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmVDbGFzcyhcInRnLXF1YWRyYW50LWNvbHVtbi0taGlnaGxpZ2h0ZWRcIik7XHJcblxyXG5cdFx0Ly8gRm9yY2UgY2xlYW51cCBvZiBhbnkgbGluZ2VyaW5nIHN0eWxlcyB3aXRoIGEgc21hbGwgZGVsYXlcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHQvLyBEb3VibGUtY2hlY2sgYW5kIGNsZWFuIHVwIGFueSByZW1haW5pbmcgZHJhZyBjbGFzc2VzXHJcblx0XHRcdHRoaXMuY29udGVudEVsLnJlbW92ZUNsYXNzKFxyXG5cdFx0XHRcdFwidGctcXVhZHJhbnQtY29sdW1uLWNvbnRlbnQtLWRyb3AtYWN0aXZlXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmVDbGFzcyhcInRnLXF1YWRyYW50LWNvbHVtbi0tZHJhZy10YXJnZXRcIik7XHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlQ2xhc3MoXCJ0Zy1xdWFkcmFudC1jb2x1bW4tLWhpZ2hsaWdodGVkXCIpO1xyXG5cdFx0fSwgMTApO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGZvcmNlTG9hZENvbnRlbnQoKSB7XHJcblx0XHRjb25zb2xlLmxvZyhgZm9yY2VMb2FkQ29udGVudCBjYWxsZWQgZm9yICR7dGhpcy5xdWFkcmFudC5pZH1gKTtcclxuXHRcdGlmICghdGhpcy5pc0NvbnRlbnRMb2FkZWQpIHtcclxuXHRcdFx0dGhpcy5sb2FkQ29udGVudCgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHVibGljIGFzeW5jIGxvYWRBbGxUYXNrcygpIHtcclxuXHRcdC8vIEZvcmNlIGxvYWQgYWxsIHJlbWFpbmluZyB0YXNrcyAodXNlZnVsIGZvciBkcmFnIG9wZXJhdGlvbnMpXHJcblx0XHRpZiAoIXRoaXMuaGFzTW9yZVRhc2tzKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJMb2FkaW5nIGFsbCByZW1haW5pbmcgdGFza3MgYXN5bmNocm9ub3VzbHlcIik7XHJcblx0XHR0aGlzLmhhc01vcmVUYXNrcyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5oaWRlTG9hZE1vcmVJbmRpY2F0b3IoKTtcclxuXHJcblx0XHQvLyBMb2FkIGFsbCByZW1haW5pbmcgdGFza3MgaW4gYmF0Y2hlcyB0byBhdm9pZCBVSSBibG9ja2luZ1xyXG5cdFx0Y29uc3QgcmVtYWluaW5nVGFza3MgPSB0aGlzLnRhc2tzLnNsaWNlKHRoaXMucmVuZGVyZWRUYXNrcy5sZW5ndGgpO1xyXG5cdFx0aWYgKHJlbWFpbmluZ1Rhc2tzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IGJhdGNoU2l6ZSA9IDEwO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCByZW1haW5pbmdUYXNrcy5sZW5ndGg7IGkgKz0gYmF0Y2hTaXplKSB7XHJcblx0XHRcdGNvbnN0IGJhdGNoID0gcmVtYWluaW5nVGFza3Muc2xpY2UoaSwgaSArIGJhdGNoU2l6ZSk7XHJcblx0XHRcdGF3YWl0IHRoaXMucmVuZGVyVGFza0JhdGNoKGJhdGNoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJlZFRhc2tzLnB1c2goLi4uYmF0Y2gpO1xyXG5cclxuXHRcdFx0Ly8gU21hbGwgZGVsYXkgYmV0d2VlbiBiYXRjaGVzIHRvIGtlZXAgVUkgcmVzcG9uc2l2ZVxyXG5cdFx0XHRpZiAoaSArIGJhdGNoU2l6ZSA8IHJlbWFpbmluZ1Rhc2tzLmxlbmd0aCkge1xyXG5cdFx0XHRcdGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDEwKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIkZpbmlzaGVkIGxvYWRpbmcgYWxsIHRhc2tzXCIpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFF1YWRyYW50SWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0aGlzLnF1YWRyYW50LmlkO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGdldFF1YWRyYW50KCk6IFF1YWRyYW50RGVmaW5pdGlvbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5xdWFkcmFudDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRUYXNrcygpOiBUYXNrW10ge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFza3M7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgZ2V0UmVuZGVyZWRUYXNrcygpOiBUYXNrW10ge1xyXG5cdFx0cmV0dXJuIHRoaXMucmVuZGVyZWRUYXNrcztcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRUYXNrQ291bnQoKTogbnVtYmVyIHtcclxuXHRcdHJldHVybiB0aGlzLnRhc2tzLmxlbmd0aDtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBpc0VtcHR5KCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMudGFza3MubGVuZ3RoID09PSAwO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGlzTG9hZGVkKCk6IGJvb2xlYW4ge1xyXG5cdFx0cmV0dXJuIHRoaXMuaXNDb250ZW50TG9hZGVkO1xyXG5cdH1cclxuXHJcblx0cHVibGljIGhhc01vcmVUb0xvYWQoKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5oYXNNb3JlVGFza3M7XHJcblx0fVxyXG5cclxuXHQvLyBNZXRob2QgdG8gZ2V0IHF1YWRyYW50LXNwZWNpZmljIHN0eWxpbmcgb3IgYmVoYXZpb3JcclxuXHRwdWJsaWMgZ2V0UXVhZHJhbnRDb2xvcigpOiBzdHJpbmcge1xyXG5cdFx0c3dpdGNoICh0aGlzLnF1YWRyYW50LmlkKSB7XHJcblx0XHRcdGNhc2UgXCJ1cmdlbnQtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIFwidmFyKC0tdGV4dC1lcnJvcilcIjsgLy8gRXJyb3IgY29sb3IgLSBDcmlzaXNcclxuXHRcdFx0Y2FzZSBcIm5vdC11cmdlbnQtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIFwidmFyKC0tY29sb3ItYWNjZW50KVwiOyAvLyBBY2NlbnQgY29sb3IgLSBHcm93dGhcclxuXHRcdFx0Y2FzZSBcInVyZ2VudC1ub3QtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIFwidmFyKC0tdGV4dC13YXJuaW5nKVwiOyAvLyBXYXJuaW5nIGNvbG9yIC0gQ2F1dGlvblxyXG5cdFx0XHRjYXNlIFwibm90LXVyZ2VudC1ub3QtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIFwidmFyKC0tdGV4dC1tdXRlZClcIjsgLy8gTXV0ZWQgY29sb3IgLSBFbGltaW5hdGVcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gXCJ2YXIoLS1jb2xvci1hY2NlbnQpXCI7IC8vIEFjY2VudCBjb2xvciAtIERlZmF1bHRcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIE1ldGhvZCB0byBnZXQgcXVhZHJhbnQgcmVjb21tZW5kYXRpb25zXHJcblx0cHVibGljIGdldFF1YWRyYW50UmVjb21tZW5kYXRpb24oKTogc3RyaW5nIHtcclxuXHRcdHN3aXRjaCAodGhpcy5xdWFkcmFudC5pZCkge1xyXG5cdFx0XHRjYXNlIFwidXJnZW50LWltcG9ydGFudFwiOlxyXG5cdFx0XHRcdHJldHVybiB0KFxyXG5cdFx0XHRcdFx0XCJIYW5kbGUgaW1tZWRpYXRlbHkuIFRoZXNlIGFyZSBjcml0aWNhbCB0YXNrcyB0aGF0IG5lZWQgeW91ciBhdHRlbnRpb24gbm93LlwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0Y2FzZSBcIm5vdC11cmdlbnQtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIHQoXHJcblx0XHRcdFx0XHRcIlNjaGVkdWxlIGFuZCBwbGFuLiBUaGVzZSB0YXNrcyBhcmUga2V5IHRvIHlvdXIgbG9uZy10ZXJtIHN1Y2Nlc3MuXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRjYXNlIFwidXJnZW50LW5vdC1pbXBvcnRhbnRcIjpcclxuXHRcdFx0XHRyZXR1cm4gdChcclxuXHRcdFx0XHRcdFwiRGVsZWdhdGUgaWYgcG9zc2libGUuIFRoZXNlIHRhc2tzIGFyZSB1cmdlbnQgYnV0IGRvbid0IHJlcXVpcmUgeW91ciBzcGVjaWZpYyBza2lsbHMuXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRjYXNlIFwibm90LXVyZ2VudC1ub3QtaW1wb3J0YW50XCI6XHJcblx0XHRcdFx0cmV0dXJuIHQoXHJcblx0XHRcdFx0XHRcIkVsaW1pbmF0ZSBvciBtaW5pbWl6ZS4gVGhlc2UgdGFza3MgbWF5IGJlIHRpbWUgd2FzdGVycy5cIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIHQoXCJSZXZpZXcgYW5kIGNhdGVnb3JpemUgdGhlc2UgdGFza3MgYXBwcm9wcmlhdGVseS5cIik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwTWFudWFsU2Nyb2xsTGlzdGVuZXIoKSB7XHJcblx0XHQvLyBBZGQgbWFudWFsIHNjcm9sbCBsaXN0ZW5lciBhcyBiYWNrdXBcclxuXHRcdHRoaXMuaGFuZGxlU2Nyb2xsID0gdGhpcy5oYW5kbGVTY3JvbGwuYmluZCh0aGlzKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlU2Nyb2xsID0gKCkgPT4ge1xyXG5cdFx0aWYgKFxyXG5cdFx0XHQhdGhpcy5zY3JvbGxDb250YWluZXJFbCB8fFxyXG5cdFx0XHQhdGhpcy5oYXNNb3JlVGFza3MgfHxcclxuXHRcdFx0dGhpcy5pc0xvYWRpbmdNb3JlXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyRWw7XHJcblx0XHRjb25zdCBzY3JvbGxUb3AgPSBjb250YWluZXIuc2Nyb2xsVG9wO1xyXG5cdFx0Y29uc3Qgc2Nyb2xsSGVpZ2h0ID0gY29udGFpbmVyLnNjcm9sbEhlaWdodDtcclxuXHRcdGNvbnN0IGNsaWVudEhlaWdodCA9IGNvbnRhaW5lci5jbGllbnRIZWlnaHQ7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgd2UncmUgbmVhciB0aGUgYm90dG9tICh3aXRoaW4gMTAwcHgpXHJcblx0XHRjb25zdCBpc05lYXJCb3R0b20gPSBzY3JvbGxUb3AgKyBjbGllbnRIZWlnaHQgPj0gc2Nyb2xsSGVpZ2h0IC0gMTAwO1xyXG5cclxuXHRcdGlmIChpc05lYXJCb3R0b20pIHtcclxuXHRcdFx0dGhpcy5sb2FkTW9yZVRhc2tzKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0cHVibGljIHByZXBhcmVEcmFnT3BlcmF0aW9uKCkge1xyXG5cdFx0Ly8gTGlnaHR3ZWlnaHQgcHJlcGFyYXRpb24gZm9yIGRyYWcgb3BlcmF0aW9uc1xyXG5cdFx0Ly8gT25seSBsb2FkIGEgZmV3IG1vcmUgdGFza3MgaWYgbmVlZGVkLCBub3QgYWxsXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMuaGFzTW9yZVRhc2tzICYmXHJcblx0XHRcdHRoaXMucmVuZGVyZWRUYXNrcy5sZW5ndGggPCB0aGlzLnBhZ2VTaXplICogMlxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMubG9hZE1vcmVUYXNrcygpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=