import { Component, debounce, } from "obsidian";
import "@/styles/gantt/gantt.css";
// Import new components and helpers
import { DateHelper } from "@/utils/date/date-helper";
import { TimelineHeaderComponent } from "./timeline-header";
import { GridBackgroundComponent } from "./grid-background";
import { TaskRendererComponent } from "./task-renderer";
import { FilterComponent, buildFilterOptionsFromTasks, } from "@/components/features/task/filter/in-view/filter";
import { ScrollToDateButton } from '@/components/features/task/filter/in-view/custom/scroll-to-date-button';
import { PRIORITY_MAP } from "@/common/default-symbol";
// Define the PRIORITY_MAP here as well, or import it if moved to a shared location
// This is needed to convert filter value (icon/text) back to number for comparison
// Constants for layout and styling
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 40;
// const TASK_BAR_HEIGHT_RATIO = 0.6; // Moved to TaskRendererComponent
// const MILESTONE_SIZE = 10; // Moved to TaskRendererComponent
const DAY_WIDTH_DEFAULT = 50; // Default width for a day column
// const TASK_LABEL_PADDING = 5; // Moved to TaskRendererComponent
const MIN_DAY_WIDTH = 10; // Minimum width for a day during zoom out
const MAX_DAY_WIDTH = 200; // Maximum width for a day during zoom in
const INDICATOR_HEIGHT = 4; // Height of individual offscreen task indicators
export class GanttComponent extends Component {
    constructor(plugin, containerEl, params, viewId = "gantt" // 新增：视图ID参数
    ) {
        super();
        this.plugin = plugin;
        this.params = params;
        this.viewId = viewId;
        this.svgEl = null;
        this.tasks = [];
        this.allTasks = [];
        this.preparedTasks = [];
        this.timescale = "Day";
        this.dayWidth = DAY_WIDTH_DEFAULT;
        this.startDate = null;
        this.endDate = null;
        this.totalWidth = 0; // Total scrollable width
        this.totalHeight = 0; // Total content height
        this.zoomLevel = 1; // Ratio based on default day width
        this.visibleStartDate = null;
        this.visibleEndDate = null;
        this.isScrolling = false;
        this.isZooming = false;
        // SVG groups (will be passed to child components)
        this.gridGroupEl = null;
        this.taskGroupEl = null;
        // Child Components
        this.filterComponent = null;
        this.timelineHeaderComponent = null;
        this.gridBackgroundComponent = null;
        this.taskRendererComponent = null;
        // Helpers
        this.dateHelper = new DateHelper();
        // Per-view override from Bases
        this.configOverride = null;
        this.config = {
            showDependencies: false,
            taskColorBy: "status",
            useVirtualization: false,
            debounceRenderMs: 50,
            showTaskLabels: true,
            useMarkdownRenderer: true,
        };
        // --- Event Handlers (Update to coordinate children) ---
        this.handleScroll = (event) => {
            if (this.isZooming || !this.startDate)
                return; // Prevent conflict, ensure initialized
            const target = event.target;
            const scrollLeft = target.scrollLeft;
            // const scrollTop = target.scrollTop; // For vertical virtualization later
            // Update visible start date based on scroll
            const daysScrolled = scrollLeft / Math.max(1, this.dayWidth);
            this.visibleStartDate = this.dateHelper.addDays(this.startDate, daysScrolled);
            // Re-render only the header efficiently via debounced call
            this.debouncedHeaderUpdate();
            this.debouncedRender(); // Changed from debouncedHeaderUpdate
        };
        this.handleWheel = (event) => {
            if (!event.ctrlKey || !this.startDate || !this.endDate)
                return; // Only zoom with Ctrl, ensure initialized
            event.preventDefault();
            this.isZooming = true; // Set zoom flag
            const delta = event.deltaY > 0 ? 0.8 : 1.25;
            const newDayWidth = Math.max(MIN_DAY_WIDTH, Math.min(MAX_DAY_WIDTH, this.dayWidth * delta));
            if (newDayWidth === this.dayWidth) {
                this.isZooming = false;
                return; // No change
            }
            const scrollContainerRect = this.scrollContainerEl.getBoundingClientRect();
            const cursorX = event.clientX - scrollContainerRect.left;
            const scrollLeftBeforeZoom = this.scrollContainerEl.scrollLeft;
            // Date under the cursor before zoom
            const timeAtCursor = this.dateHelper.xToDate(scrollLeftBeforeZoom + cursorX, this.startDate, this.dayWidth);
            // Update day width *before* calculating new scroll position
            this.dayWidth = newDayWidth;
            // Recalculate total width based on new dayWidth (will be done in prepareTasksForRender)
            // Calculate where the timeAtCursor *should* be with the new dayWidth
            let newScrollLeft = 0;
            if (timeAtCursor) {
                const xAtCursorNew = this.dateHelper.dateToX(timeAtCursor, this.startDate, this.dayWidth);
                newScrollLeft = xAtCursorNew - cursorX;
            }
            // Update timescale based on new zoom level (will be done in prepareTasksForRender)
            // this.calculateTimescaleParams(); // Called within prepareTasksForRender
            // Trigger a full re-render because zoom changes timescale, layout, etc.
            // Prepare tasks first to get the new totalWidth
            this.prepareTasksForRender();
            const containerWidth = this.scrollContainerEl.clientWidth;
            newScrollLeft = Math.max(0, Math.min(newScrollLeft, this.totalWidth - containerWidth));
            this.debouncedRender(); // This will update all children
            // Apply the calculated scroll position *after* the render updates the layout
            requestAnimationFrame(() => {
                // Check if component might have been unloaded during async operation
                if (!this.scrollContainerEl)
                    return;
                this.scrollContainerEl.scrollLeft = newScrollLeft;
                // Update visibleStartDate based on the final scroll position
                const daysScrolled = newScrollLeft / Math.max(1, this.dayWidth);
                this.visibleStartDate = this.dateHelper.addDays(this.startDate, daysScrolled);
                // Update header again to ensure it reflects the final scroll position
                // The main render already updated it, but this ensures accuracy after scroll adjustment
                this.updateHeaderComponent();
                this.isZooming = false; // Reset zoom flag
            });
        };
        this.app = plugin.app;
        this.containerEl = containerEl.createDiv({
            cls: "gantt-chart-container",
        });
        // Create layout containers
        this.filterContainerEl = this.containerEl.createDiv("gantt-filter-area" // New container for filters
        );
        this.headerContainerEl = this.containerEl.createDiv("gantt-header-container");
        this.scrollContainerEl = this.containerEl.createDiv("gantt-scroll-container");
        this.contentWrapperEl = this.scrollContainerEl.createDiv("gantt-content-wrapper");
        // Create offscreen indicator containers
        this.leftIndicatorEl = this.containerEl.createDiv("gantt-indicator-container gantt-indicator-container-left" // Updated classes
        );
        this.rightIndicatorEl = this.containerEl.createDiv("gantt-indicator-container gantt-indicator-container-right" // Updated classes
        );
        // Containers are always visible, content determines if indicators show
        // Debounced functions
        this.debouncedRender = debounce(this.renderInternal, this.config.debounceRenderMs);
        // Debounce header updates triggered by scroll
        this.debouncedHeaderUpdate = debounce(this.updateHeaderComponent, 16 // Render header frequently on scroll
        );
    }
    onload() {
        console.log("GanttComponent loaded.");
        this.applyEffectiveConfig();
        this.createBaseSVG(); // Creates SVG and groups
        // Instantiate Child Components
        this.filterComponent = this.addChild(new FilterComponent({
            container: this.filterContainerEl,
            options: buildFilterOptionsFromTasks(this.tasks),
            onChange: (activeFilters) => {
                this.applyFiltersAndRender(activeFilters);
            },
            components: [
                new ScrollToDateButton(this.filterContainerEl, (date) => this.scrollToDate(date)),
            ],
        }, this.plugin));
        if (this.headerContainerEl) {
            this.timelineHeaderComponent = this.addChild(new TimelineHeaderComponent(this.app, this.headerContainerEl));
        }
        if (this.gridGroupEl) {
            this.gridBackgroundComponent = this.addChild(new GridBackgroundComponent(this.app, this.gridGroupEl));
        }
        if (this.taskGroupEl) {
            this.taskRendererComponent = this.addChild(new TaskRendererComponent(this.app, this.taskGroupEl));
        }
        this.registerDomEvent(this.scrollContainerEl, "scroll", this.handleScroll);
        this.registerDomEvent(this.containerEl, "wheel", this.handleWheel, {
            passive: false,
        });
        this.applyEffectiveConfig();
        // Initial render is triggered by updateTasks or refresh
    }
    onunload() {
        console.log("GanttComponent unloaded.");
        this.debouncedRender.cancel();
        this.debouncedHeaderUpdate.cancel();
        // Child components are unloaded automatically when the parent is unloaded
        // Remove specific elements if needed
        if (this.svgEl) {
            this.svgEl.detach();
        }
        this.filterContainerEl.detach();
        this.headerContainerEl.detach();
        this.scrollContainerEl.detach(); // This removes contentWrapperEl and svgEl too
        this.leftIndicatorEl.detach(); // Remove indicator containers
        this.rightIndicatorEl.detach(); // Remove indicator containers
        this.containerEl.removeClass("gantt-chart-container");
        this.tasks = [];
        this.allTasks = [];
        this.containerEl.removeClass("gantt-chart-container");
        this.tasks = [];
        this.preparedTasks = [];
    }
    setConfigOverride(override) {
        this.configOverride = override !== null && override !== void 0 ? override : null;
        this.applyEffectiveConfig();
        // Re-render with new settings
        this.debouncedRender();
    }
    getEffectiveGanttConfig() {
        var _a;
        const view = this.plugin.settings.viewConfiguration.find(v => v.id === this.viewId);
        let base = {};
        if (view && view.specificConfig && view.specificConfig.viewType === "gantt") {
            base = view.specificConfig;
        }
        else {
            const def = this.plugin.settings.viewConfiguration.find(v => v.id === "gantt");
            base = (def === null || def === void 0 ? void 0 : def.specificConfig) || {};
        }
        return Object.assign(Object.assign({}, (base !== null && base !== void 0 ? base : {})), ((_a = this.configOverride) !== null && _a !== void 0 ? _a : {}));
    }
    applyEffectiveConfig() {
        const eff = this.getEffectiveGanttConfig();
        if (typeof eff.showTaskLabels === "boolean")
            this.config.showTaskLabels = eff.showTaskLabels;
        if (typeof eff.useMarkdownRenderer === "boolean")
            this.config.useMarkdownRenderer = eff.useMarkdownRenderer;
    }
    setTasks(newTasks) {
        var _a;
        this.preparedTasks = []; // Clear prepared tasks
        this.tasks = this.sortTasks(newTasks);
        this.allTasks = [...this.tasks]; // Store the original, sorted list
        // Prepare tasks initially to generate relevant filter options
        this.prepareTasksForRender(); // Calculate preparedTasks based on the initial full list
        // Update filter options based on the initially prepared task list
        if (this.filterComponent) {
            // Extract the original Task objects from preparedTasks
            const tasksForFiltering = this.preparedTasks.map((pt) => pt.task);
            this.filterComponent.updateFilterOptions(tasksForFiltering); // Use prepared tasks for initial options
        }
        // Apply any existing filters from the component (will re-prepare and re-update filters)
        const currentFilters = ((_a = this.filterComponent) === null || _a === void 0 ? void 0 : _a.getActiveFilters()) || [];
        this.applyFiltersAndRender(currentFilters); // This will call prepareTasksForRender again and update filters
        // Scroll to today after the initial render is scheduled
        requestAnimationFrame(() => {
            // Check if component is still loaded before scrolling
            if (this.scrollContainerEl) {
                this.scrollToDate(new Date());
            }
        });
    }
    setTimescale(newTimescale) {
        this.timescale = newTimescale;
        this.calculateTimescaleParams(); // Update params based on new scale
        this.prepareTasksForRender(); // Prepare tasks with new scale
        this.debouncedRender(); // Trigger full render
    }
    createBaseSVG() {
        if (this.svgEl)
            this.svgEl.remove();
        this.svgEl = this.contentWrapperEl.createSvg("svg", {
            cls: "gantt-svg",
        });
        this.svgEl.setAttribute("width", "100%");
        this.svgEl.setAttribute("height", "100%");
        this.svgEl.style.display = "block";
        // Define SVG groups for children
        this.svgEl.createSvg("defs");
        this.gridGroupEl = this.svgEl.createSvg("g", { cls: "gantt-grid" });
        this.taskGroupEl = this.svgEl.createSvg("g", { cls: "gantt-tasks" });
    }
    // --- Date Range and Timescale Calculations ---
    calculateDateRange(forceRecalculate = false) {
        if (!forceRecalculate && this.startDate && this.endDate) {
            return { startDate: this.startDate, endDate: this.endDate };
        }
        if (this.tasks.length === 0) {
            const today = new Date();
            this.startDate = this.dateHelper.startOfDay(this.dateHelper.addDays(today, -7));
            this.endDate = this.dateHelper.addDays(today, 30);
            // Set initial visible range
            if (!this.visibleStartDate)
                this.visibleStartDate = new Date(this.startDate);
            this.visibleEndDate = this.calculateVisibleEndDate();
            return { startDate: this.startDate, endDate: this.endDate };
        }
        let minTimestamp = Infinity;
        let maxTimestamp = -Infinity;
        this.tasks.forEach((task) => {
            const taskStart = task.metadata.startDate ||
                task.metadata.scheduledDate ||
                task.metadata.createdDate;
            const taskEnd = task.metadata.dueDate || task.metadata.completedDate;
            if (taskStart) {
                const startTs = new Date(taskStart).getTime();
                if (!isNaN(startTs)) {
                    minTimestamp = Math.min(minTimestamp, startTs);
                }
            }
            else if (task.metadata.createdDate) {
                const creationTs = new Date(task.metadata.createdDate).getTime();
                if (!isNaN(creationTs)) {
                    minTimestamp = Math.min(minTimestamp, creationTs);
                }
            }
            if (taskEnd) {
                const endTs = new Date(taskEnd).getTime();
                if (!isNaN(endTs)) {
                    const isMilestone = !task.metadata.startDate && task.metadata.dueDate;
                    maxTimestamp = Math.max(maxTimestamp, isMilestone
                        ? endTs
                        : this.dateHelper
                            .addDays(new Date(endTs), 1)
                            .getTime());
                }
            }
            if (taskStart && !taskEnd) {
                const startTs = new Date(taskStart).getTime();
                if (!isNaN(startTs)) {
                    maxTimestamp = Math.max(maxTimestamp, this.dateHelper.addDays(new Date(startTs), 1).getTime());
                }
            }
        });
        const PADDING_DAYS = 3650; // Increased padding significantly for near-infinite scroll
        if (minTimestamp === Infinity || maxTimestamp === -Infinity) {
            const today = new Date();
            this.startDate = this.dateHelper.startOfDay(this.dateHelper.addDays(today, -PADDING_DAYS) // Use padding
            );
            this.endDate = this.dateHelper.addDays(today, PADDING_DAYS); // Use padding
        }
        else {
            this.startDate = this.dateHelper.startOfDay(this.dateHelper.addDays(new Date(minTimestamp), -PADDING_DAYS) // Use padding
            );
            this.endDate = this.dateHelper.startOfDay(this.dateHelper.addDays(new Date(maxTimestamp), PADDING_DAYS) // Use padding
            );
        }
        if (this.endDate <= this.startDate) {
            // Ensure end date is after start date, even with padding
            this.endDate = this.dateHelper.addDays(this.startDate, PADDING_DAYS * 2);
        }
        // Set initial visible range if not set or forced
        if (forceRecalculate || !this.visibleStartDate) {
            this.visibleStartDate = new Date(this.startDate);
        }
        this.visibleEndDate = this.calculateVisibleEndDate();
        return { startDate: this.startDate, endDate: this.endDate };
    }
    calculateVisibleEndDate() {
        if (!this.visibleStartDate || !this.scrollContainerEl) {
            return this.endDate || new Date();
        }
        const containerWidth = this.scrollContainerEl.clientWidth;
        // Ensure dayWidth is positive to avoid infinite loops or errors
        const effectiveDayWidth = Math.max(1, this.dayWidth);
        const visibleDays = Math.ceil(containerWidth / effectiveDayWidth);
        return this.dateHelper.addDays(this.visibleStartDate, visibleDays);
    }
    calculateTimescaleParams() {
        if (!this.startDate || !this.endDate)
            return;
        // Determine appropriate timescale based on dayWidth
        if (this.dayWidth < 15)
            this.timescale = "Year";
        else if (this.dayWidth < 35)
            this.timescale = "Month";
        else if (this.dayWidth < 70)
            this.timescale = "Week";
        else
            this.timescale = "Day";
    }
    // Prepare task data for rendering (still needed for layout calculations)
    prepareTasksForRender() {
        if (!this.startDate || !this.endDate) {
            console.error("Cannot prepare tasks: date range not set.");
            return;
        }
        this.calculateTimescaleParams(); // Ensure timescale is current
        const mappedTasks = this.tasks.map((task, index) => {
            const y = index * ROW_HEIGHT + ROW_HEIGHT / 2; // Y position based on row index
            let startX;
            let endX;
            let isMilestone = false;
            const taskStart = task.metadata.startDate || task.metadata.scheduledDate;
            let taskDue = task.metadata.dueDate;
            if (taskStart) {
                const startDate = new Date(taskStart);
                if (!isNaN(startDate.getTime())) {
                    startX = this.dateHelper.dateToX(startDate, this.startDate, this.dayWidth);
                }
            }
            if (taskDue) {
                const dueDate = new Date(taskDue);
                if (!isNaN(dueDate.getTime())) {
                    endX = this.dateHelper.dateToX(this.dateHelper.addDays(dueDate, 1), this.startDate, this.dayWidth);
                }
            }
            else if (task.metadata.completedDate && taskStart) {
                // Optional: end bar at completion date if no due date
            }
            if ((taskDue && !taskStart) ||
                (taskStart &&
                    taskDue &&
                    this.dateHelper.daysBetween(new Date(taskStart), new Date(taskDue)) === 0)) {
                const milestoneDate = taskDue
                    ? new Date(taskDue)
                    : taskStart
                        ? new Date(taskStart)
                        : null;
                if (milestoneDate) {
                    startX = this.dateHelper.dateToX(milestoneDate, this.startDate, this.dayWidth);
                    endX = startX;
                    isMilestone = true;
                }
                else {
                    startX = undefined;
                    endX = undefined;
                }
            }
            else if (!taskStart && !taskDue) {
                startX = undefined;
                endX = undefined;
            }
            else if (taskStart && !taskDue) {
                if (startX !== undefined) {
                    endX = this.dateHelper.dateToX(this.dateHelper.addDays(new Date(taskStart), 1), this.startDate, this.dayWidth);
                    isMilestone = false;
                }
            }
            const width = startX !== undefined && endX !== undefined && !isMilestone
                ? Math.max(1, endX - startX)
                : undefined;
            return {
                task,
                y: y,
                startX,
                endX,
                width,
                isMilestone,
                level: 0,
            };
        });
        // Filter out tasks that couldn't be placed and assert the type
        this.preparedTasks = mappedTasks.filter((pt) => pt.startX !== undefined);
        console.log("Prepared Tasks:", this.preparedTasks);
        // Calculate total dimensions
        // Ensure a minimum height even if there are no tasks initially
        const MIN_ROWS_DISPLAY = 5; // Show at least 5 rows worth of height
        this.totalHeight = Math.max(this.preparedTasks.length * ROW_HEIGHT, MIN_ROWS_DISPLAY * ROW_HEIGHT);
        const totalDays = this.dateHelper.daysBetween(this.startDate, this.endDate);
        this.totalWidth = totalDays * this.dayWidth;
    }
    sortTasks(tasks) {
        // Keep existing sort logic, using dateHelper
        return tasks.sort((a, b) => {
            var _a, _b;
            const startA = a.metadata.startDate || a.metadata.scheduledDate;
            const startB = b.metadata.startDate || b.metadata.scheduledDate;
            const dueA = a.metadata.dueDate;
            const dueB = b.metadata.dueDate;
            if (startA && startB) {
                const dateA = new Date(startA).getTime();
                const dateB = new Date(startB).getTime();
                if (dateA !== dateB)
                    return dateA - dateB;
            }
            else if (startA) {
                return -1;
            }
            else if (startB) {
                return 1;
            }
            if (dueA && dueB) {
                const dateA = new Date(dueA).getTime();
                const dateB = new Date(dueB).getTime();
                if (dateA !== dateB)
                    return dateA - dateB;
            }
            else if (dueA) {
                return -1;
            }
            else if (dueB) {
                return 1;
            }
            // Handle content comparison with null/empty values
            const contentA = ((_a = a.content) === null || _a === void 0 ? void 0 : _a.trim()) || null;
            const contentB = ((_b = b.content) === null || _b === void 0 ? void 0 : _b.trim()) || null;
            if (!contentA && !contentB)
                return 0;
            if (!contentA)
                return 1; // A is empty, goes to end
            if (!contentB)
                return -1; // B is empty, goes to end
            return contentA.localeCompare(contentB);
        });
    }
    // Debounce utility (Keep)
    // --- Rendering Function (Orchestrator) ---
    renderInternal() {
        var _a;
        if (!this.svgEl ||
            !this.startDate ||
            !this.endDate ||
            !this.scrollContainerEl ||
            !this.gridBackgroundComponent || // Check if children are loaded
            !this.taskRendererComponent ||
            !this.timelineHeaderComponent ||
            !this.leftIndicatorEl || // Check indicator containers too
            !this.rightIndicatorEl) {
            console.warn("Cannot render: Core elements, child components, or indicator containers not initialized.");
            return;
        }
        if (!this.containerEl.isShown()) {
            console.warn("Cannot render: Container not visible.");
            return;
        }
        // Recalculate dimensions and prepare data
        this.prepareTasksForRender(); // Recalculates totalWidth/Height, preparedTasks
        // Update SVG container dimensions
        this.svgEl.setAttribute("width", `${this.totalWidth}`);
        // Use the calculated totalHeight (which now has a minimum)
        this.svgEl.setAttribute("height", `${this.totalHeight}`);
        this.contentWrapperEl.style.width = `${this.totalWidth}px`;
        this.contentWrapperEl.style.height = `${this.totalHeight}px`;
        // Adjust scroll container height (consider filter area height if dynamic)
        const filterHeight = this.filterContainerEl.offsetHeight;
        // Ensure calculation is robust
        this.scrollContainerEl.style.height = `calc(100% - ${HEADER_HEIGHT}px - ${filterHeight}px)`;
        // --- Update Child Components ---
        // 1. Update Header
        this.updateHeaderComponent();
        // Calculate visible tasks *before* updating grid and task renderer
        const scrollLeft = this.scrollContainerEl.scrollLeft;
        const scrollTop = this.scrollContainerEl.scrollTop; // Get vertical scroll position
        const containerWidth = this.scrollContainerEl.clientWidth;
        const visibleStartX = scrollLeft;
        const visibleEndX = scrollLeft + containerWidth;
        // --- Update Offscreen Indicators ---
        // Clear existing indicators
        this.leftIndicatorEl.empty();
        this.rightIndicatorEl.empty();
        const visibleTasks = [];
        const renderBuffer = 300; // Keep a render buffer for smooth scrolling
        const indicatorYOffset = INDICATOR_HEIGHT / 2;
        for (const pt of this.preparedTasks) {
            const taskStartX = pt.startX;
            const taskEndX = pt.isMilestone
                ? pt.startX
                : pt.startX + ((_a = pt.width) !== null && _a !== void 0 ? _a : 0);
            // Check visibility for task rendering
            const isVisible = taskEndX > visibleStartX - renderBuffer &&
                taskStartX < visibleEndX + renderBuffer;
            if (isVisible) {
                visibleTasks.push(pt);
            }
            // Check for offscreen indicators (use smaller buffer or none)
            const indicatorBuffer = 5; // Small buffer to prevent flicker
            // Calculate top position relative to the scroll container's viewport
            const indicatorTop = pt.y - scrollTop - indicatorYOffset;
            if (taskEndX < visibleStartX - indicatorBuffer) {
                // Task is offscreen to the left
                this.leftIndicatorEl.createDiv({
                    cls: "gantt-single-indicator",
                    attr: {
                        style: `top: ${indicatorTop + 45}px;`,
                        title: pt.task.content,
                        "data-task-id": pt.task.id,
                    },
                });
            }
            else if (taskStartX > visibleEndX + indicatorBuffer) {
                // Task is offscreen to the right
                this.rightIndicatorEl.createDiv({
                    cls: "gantt-single-indicator",
                    attr: {
                        style: `top: ${indicatorTop + 45}px;`,
                        title: pt.task.content,
                        "data-task-id": pt.task.id,
                    },
                });
            }
        }
        this.registerDomEvent(this.leftIndicatorEl, "click", (e) => {
            const target = e.target;
            const taskId = target.getAttribute("data-task-id");
            if (taskId) {
                const task = this.tasks.find((t) => t.id === taskId);
                if (task) {
                    this.scrollToDate(new Date(task.metadata.dueDate ||
                        task.metadata.startDate ||
                        task.metadata.scheduledDate));
                }
            }
        });
        this.registerDomEvent(this.rightIndicatorEl, "click", (e) => {
            const target = e.target;
            const taskId = target.getAttribute("data-task-id");
            if (taskId) {
                const task = this.tasks.find((t) => t.id === taskId);
                if (task) {
                    this.scrollToDate(new Date(task.metadata.startDate ||
                        task.metadata.dueDate ||
                        task.metadata.scheduledDate));
                }
            }
        });
        // 2. Update Grid Background (Now using visibleTasks)
        this.gridBackgroundComponent.updateParams({
            startDate: this.startDate,
            endDate: this.endDate,
            visibleStartDate: this.visibleStartDate,
            visibleEndDate: this.visibleEndDate,
            totalWidth: this.totalWidth,
            totalHeight: this.totalHeight,
            visibleTasks: visibleTasks,
            timescale: this.timescale,
            dayWidth: this.dayWidth,
            rowHeight: ROW_HEIGHT,
            dateHelper: this.dateHelper,
            shouldDrawMajorTick: this.shouldDrawMajorTick.bind(this),
            shouldDrawMinorTick: this.shouldDrawMinorTick.bind(this),
        });
        // 3. Update Tasks - Pass only visible tasks
        this.taskRendererComponent.updateParams({
            app: this.app,
            taskGroupEl: this.taskGroupEl,
            preparedTasks: visibleTasks,
            rowHeight: ROW_HEIGHT,
            // Pass relevant config
            showTaskLabels: this.config.showTaskLabels,
            useMarkdownRenderer: this.config.useMarkdownRenderer,
            handleTaskClick: this.handleTaskClick.bind(this),
            handleTaskContextMenu: this.handleTaskContextMenu.bind(this),
            parentComponent: this, // Pass self as parent context for MarkdownRenderer
            // Pass other params like milestoneSize, barHeightRatio if needed
        });
    }
    // Separate method to update header, can be debounced for scroll
    updateHeaderComponent() {
        if (!this.timelineHeaderComponent ||
            !this.visibleStartDate ||
            !this.startDate ||
            !this.endDate)
            return;
        // Ensure visibleEndDate is calculated based on current state
        this.visibleEndDate = this.calculateVisibleEndDate();
        this.timelineHeaderComponent.updateParams({
            startDate: this.startDate,
            endDate: this.endDate,
            visibleStartDate: this.visibleStartDate,
            visibleEndDate: this.visibleEndDate,
            totalWidth: this.totalWidth,
            timescale: this.timescale,
            dayWidth: this.dayWidth,
            scrollLeft: this.scrollContainerEl.scrollLeft,
            headerHeight: HEADER_HEIGHT,
            dateHelper: this.dateHelper,
            shouldDrawMajorTick: this.shouldDrawMajorTick.bind(this),
            shouldDrawMinorTick: this.shouldDrawMinorTick.bind(this),
            formatMajorTick: this.formatMajorTick.bind(this),
            formatMinorTick: this.formatMinorTick.bind(this),
            formatDayTick: this.formatDayTick.bind(this),
        });
    }
    // --- Header Tick Logic (Kept in parent as it depends on timescale state) ---
    // These methods are now passed to children that need them.
    shouldDrawMajorTick(date) {
        switch (this.timescale) {
            case "Year":
                return date.getMonth() === 0 && date.getDate() === 1;
            case "Month":
                return date.getDate() === 1;
            case "Week":
                return date.getDate() === 1;
            case "Day":
                return date.getDay() === 1; // Monday
            default:
                return false;
        }
    }
    shouldDrawMinorTick(date) {
        switch (this.timescale) {
            case "Year":
                return date.getDate() === 1; // Month start
            case "Month":
                return date.getDay() === 1; // Week start (Monday)
            case "Week":
                return true; // Every day
            case "Day":
                return false; // Days handled by day ticks
            default:
                return false;
        }
    }
    formatMajorTick(date) {
        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];
        switch (this.timescale) {
            case "Year":
                return date.getFullYear().toString();
            case "Month":
                return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
            case "Week":
                // Show month only if the week starts in that month (first day of month)
                return date.getDate() === 1
                    ? `${monthNames[date.getMonth()]} ${date.getFullYear()}`
                    : "";
            case "Day":
                return `W${this.dateHelper.getWeekNumber(date)}`; // Week number
            default:
                return "";
        }
    }
    formatMinorTick(date) {
        switch (this.timescale) {
            case "Year":
                // Show month abbreviation for minor ticks (start of month)
                return this.formatMajorTick(date).substring(0, 3);
            case "Month":
                // Show week number for minor ticks (start of week)
                return `W${this.dateHelper.getWeekNumber(date)}`;
            case "Week":
                return date.getDate().toString(); // Day of month
            case "Day":
                return ""; // Not used
            default:
                return "";
        }
    }
    formatDayTick(date) {
        const dayNames = ["S", "M", "T", "W", "T", "F", "S"]; // Single letters
        if (this.timescale === "Day") {
            return dayNames[date.getDay()];
        }
        return ""; // Only show for Day timescale
    }
    handleTaskClick(task) {
        var _a, _b;
        (_b = (_a = this.params).onTaskSelected) === null || _b === void 0 ? void 0 : _b.call(_a, task);
    }
    handleTaskContextMenu(event, task) {
        var _a, _b;
        (_b = (_a = this.params).onTaskContextMenu) === null || _b === void 0 ? void 0 : _b.call(_a, event, task);
    }
    // Scroll smoothly to a specific date (Keep in parent)
    scrollToDate(date) {
        if (!this.startDate || !this.scrollContainerEl)
            return;
        const targetX = this.dateHelper.dateToX(date, this.startDate, this.dayWidth);
        const containerWidth = this.scrollContainerEl.clientWidth;
        let targetScrollLeft = targetX - containerWidth / 2;
        targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, this.totalWidth - containerWidth));
        // Update visible dates based on the scroll *target*
        const daysScrolled = targetScrollLeft / Math.max(1, this.dayWidth);
        this.visibleStartDate = this.dateHelper.addDays(this.startDate, // Use non-null assertion as startDate should exist
        daysScrolled);
        this.visibleEndDate = this.calculateVisibleEndDate(); // Recalculate based on new start
        // Update header and trigger full render immediately for programmatic scroll
        // Use behavior: 'auto' for instant scroll to avoid issues with smooth scroll timing
        this.scrollContainerEl.scrollTo({
            left: targetScrollLeft,
            behavior: "auto", // Changed from 'smooth'
        });
        this.updateHeaderComponent(); // Update header right away
        this.debouncedRender(); // Trigger full render including tasks
        // this.debouncedHeaderUpdate(); // Old call - only updated header
    }
    // --- Public API ---
    refresh() {
        console.log("GanttComponent refresh triggered.");
        // Force recalculation of date range and re-render
        this.calculateDateRange(true);
        this.prepareTasksForRender(); // Prepare tasks with new date range
        // Update filter options based on the refreshed prepared tasks
        if (this.filterComponent) {
            const tasksForFiltering = this.preparedTasks.map((pt) => pt.task);
            this.filterComponent.updateFilterOptions(tasksForFiltering);
        }
        this.debouncedRender(); // Trigger full render
    }
    // --- Filtering Logic ---
    applyFiltersAndRender(activeFilters) {
        console.log("Applying filters: ", activeFilters);
        if (activeFilters.length === 0) {
            this.tasks = [...this.allTasks]; // Show all tasks if no filters
        }
        else {
            this.tasks = this.allTasks.filter((task) => {
                return activeFilters.every((filter) => {
                    switch (filter.category) {
                        case "status":
                            return task.status === filter.value;
                        case "tag":
                            return task.metadata.tags.some((tag) => typeof tag === "string" &&
                                tag === filter.value);
                        case "project":
                            return task.metadata.project === filter.value;
                        case "context":
                            return task.metadata.context === filter.value;
                        case "priority":
                            // Convert the selected filter value (icon/text) back to its numerical representation
                            const expectedPriorityNumber = PRIORITY_MAP[filter.value];
                            // Compare the task's numerical priority
                            return (task.metadata.priority ===
                                expectedPriorityNumber);
                        case "completed":
                            return ((filter.value === "Yes" && task.completed) ||
                                (filter.value === "No" && !task.completed));
                        case "filePath":
                            return task.filePath === filter.value;
                        // Add cases for other filter types (date ranges etc.) if needed
                        default:
                            console.warn(`Unknown filter category: ${filter.category}`);
                            return true; // Don't filter if category is unknown
                    }
                });
            });
        }
        console.log("Filtered tasks count:", this.tasks.length);
        // Recalculate date range based on filtered tasks and prepare for render
        this.calculateDateRange(true); // Force recalculate based on filtered tasks
        this.prepareTasksForRender(); // Uses the filtered this.tasks
        // Update filter options based on the current set of prepared tasks after filtering
        if (this.filterComponent) {
            const tasksForFiltering = this.preparedTasks.map((pt) => pt.task);
            this.filterComponent.updateFilterOptions(tasksForFiltering);
        }
        this.debouncedRender();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FudHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW50dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBRU4sU0FBUyxFQUNULFFBQVEsR0FHUixNQUFNLFVBQVUsQ0FBQztBQUVsQixPQUFPLDBCQUEwQixDQUFDO0FBRWxDLG9DQUFvQztBQUNwQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDNUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDNUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFeEQsT0FBTyxFQUNOLGVBQWUsRUFDZiwyQkFBMkIsR0FDM0IsTUFBTSxrREFBa0QsQ0FBQztBQUUxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM1RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFJdkQsbUZBQW1GO0FBQ25GLG1GQUFtRjtBQUVuRixtQ0FBbUM7QUFDbkMsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDO0FBQ3RCLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQztBQUN6Qix1RUFBdUU7QUFDdkUsK0RBQStEO0FBQy9ELE1BQU0saUJBQWlCLEdBQUcsRUFBRSxDQUFDLENBQUMsaUNBQWlDO0FBQy9ELGtFQUFrRTtBQUNsRSxNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUMsQ0FBQywwQ0FBMEM7QUFDcEUsTUFBTSxhQUFhLEdBQUcsR0FBRyxDQUFDLENBQUMseUNBQXlDO0FBQ3BFLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLENBQUMsaURBQWlEO0FBNEQ3RSxNQUFNLE9BQU8sY0FBZSxTQUFRLFNBQVM7SUEwRDVDLFlBQ1MsTUFBNkIsRUFDckMsV0FBd0IsRUFDaEIsTUFLUCxFQUNPLFNBQWlC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MUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FDMUMsQ0FBQzt3QkFDSCxLQUFLLFVBQVU7NEJBQ2QsT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUM7d0JBQ3ZDLGdFQUFnRTt3QkFDaEU7NEJBQ0MsT0FBTyxDQUFDLElBQUksQ0FDWCw0QkFBNEIsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUM3QyxDQUFDOzRCQUNGLE9BQU8sSUFBSSxDQUFDLENBQUMsc0NBQXNDO3FCQUNwRDtnQkFDRixDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1NBQ0g7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFeEQsd0VBQXdFO1FBQ3hFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDRDQUE0QztRQUMzRSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLCtCQUErQjtRQUU3RCxtRkFBbUY7UUFDbkYsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFO1lBQ3pCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNsRSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLENBQUM7U0FDNUQ7UUFFRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRBcHAsXHJcblx0Q29tcG9uZW50LFxyXG5cdGRlYm91bmNlLFxyXG5cdE1hcmtkb3duUmVuZGVyZXIgYXMgT2JzaWRpYW5NYXJrZG93blJlbmRlcmVyLFxyXG5cdFRGaWxlLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyB0eXBlIFRhc2sgfSBmcm9tIFwiQC90eXBlcy90YXNrXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL2dhbnR0L2dhbnR0LmNzc1wiO1xyXG5cclxuLy8gSW1wb3J0IG5ldyBjb21wb25lbnRzIGFuZCBoZWxwZXJzXHJcbmltcG9ydCB7IERhdGVIZWxwZXIgfSBmcm9tIFwiQC91dGlscy9kYXRlL2RhdGUtaGVscGVyXCI7XHJcbmltcG9ydCB7IFRpbWVsaW5lSGVhZGVyQ29tcG9uZW50IH0gZnJvbSBcIi4vdGltZWxpbmUtaGVhZGVyXCI7XHJcbmltcG9ydCB7IEdyaWRCYWNrZ3JvdW5kQ29tcG9uZW50IH0gZnJvbSBcIi4vZ3JpZC1iYWNrZ3JvdW5kXCI7XHJcbmltcG9ydCB7IFRhc2tSZW5kZXJlckNvbXBvbmVudCB9IGZyb20gXCIuL3Rhc2stcmVuZGVyZXJcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQge1xyXG5cdEZpbHRlckNvbXBvbmVudCxcclxuXHRidWlsZEZpbHRlck9wdGlvbnNGcm9tVGFza3MsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9pbi12aWV3L2ZpbHRlclwiO1xyXG5pbXBvcnQgeyBBY3RpdmVGaWx0ZXIsIEZpbHRlckNhdGVnb3J5IH0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9pbi12aWV3L2ZpbHRlci10eXBlXCI7XHJcbmltcG9ydCB7IFNjcm9sbFRvRGF0ZUJ1dHRvbiB9IGZyb20gJ0AvY29tcG9uZW50cy9mZWF0dXJlcy90YXNrL2ZpbHRlci9pbi12aWV3L2N1c3RvbS9zY3JvbGwtdG8tZGF0ZS1idXR0b24nO1xyXG5pbXBvcnQgeyBQUklPUklUWV9NQVAgfSBmcm9tIFwiQC9jb21tb24vZGVmYXVsdC1zeW1ib2xcIjtcclxuXHJcbmltcG9ydCB7IEdhbnR0U3BlY2lmaWNDb25maWcgfSBmcm9tIFwiQC9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcblxyXG4vLyBEZWZpbmUgdGhlIFBSSU9SSVRZX01BUCBoZXJlIGFzIHdlbGwsIG9yIGltcG9ydCBpdCBpZiBtb3ZlZCB0byBhIHNoYXJlZCBsb2NhdGlvblxyXG4vLyBUaGlzIGlzIG5lZWRlZCB0byBjb252ZXJ0IGZpbHRlciB2YWx1ZSAoaWNvbi90ZXh0KSBiYWNrIHRvIG51bWJlciBmb3IgY29tcGFyaXNvblxyXG5cclxuLy8gQ29uc3RhbnRzIGZvciBsYXlvdXQgYW5kIHN0eWxpbmdcclxuY29uc3QgUk9XX0hFSUdIVCA9IDI0O1xyXG5jb25zdCBIRUFERVJfSEVJR0hUID0gNDA7XHJcbi8vIGNvbnN0IFRBU0tfQkFSX0hFSUdIVF9SQVRJTyA9IDAuNjsgLy8gTW92ZWQgdG8gVGFza1JlbmRlcmVyQ29tcG9uZW50XHJcbi8vIGNvbnN0IE1JTEVTVE9ORV9TSVpFID0gMTA7IC8vIE1vdmVkIHRvIFRhc2tSZW5kZXJlckNvbXBvbmVudFxyXG5jb25zdCBEQVlfV0lEVEhfREVGQVVMVCA9IDUwOyAvLyBEZWZhdWx0IHdpZHRoIGZvciBhIGRheSBjb2x1bW5cclxuLy8gY29uc3QgVEFTS19MQUJFTF9QQURESU5HID0gNTsgLy8gTW92ZWQgdG8gVGFza1JlbmRlcmVyQ29tcG9uZW50XHJcbmNvbnN0IE1JTl9EQVlfV0lEVEggPSAxMDsgLy8gTWluaW11bSB3aWR0aCBmb3IgYSBkYXkgZHVyaW5nIHpvb20gb3V0XHJcbmNvbnN0IE1BWF9EQVlfV0lEVEggPSAyMDA7IC8vIE1heGltdW0gd2lkdGggZm9yIGEgZGF5IGR1cmluZyB6b29tIGluXHJcbmNvbnN0IElORElDQVRPUl9IRUlHSFQgPSA0OyAvLyBIZWlnaHQgb2YgaW5kaXZpZHVhbCBvZmZzY3JlZW4gdGFzayBpbmRpY2F0b3JzXHJcblxyXG4vLyBEZWZpbmUgdGhlIHN0cnVjdHVyZSBmb3IgdGFza3MgcHJlcGFyZWQgZm9yIHJlbmRlcmluZ1xyXG5leHBvcnQgaW50ZXJmYWNlIEdhbnR0VGFza0l0ZW0ge1xyXG5cdC8vIFN0aWxsIGV4cG9ydGVkIGZvciBzdWItY29tcG9uZW50c1xyXG5cdHRhc2s6IFRhc2s7XHJcblx0eTogbnVtYmVyO1xyXG5cdHN0YXJ0WD86IG51bWJlcjtcclxuXHRlbmRYPzogbnVtYmVyO1xyXG5cdHdpZHRoPzogbnVtYmVyO1xyXG5cdGlzTWlsZXN0b25lOiBib29sZWFuO1xyXG5cdGxldmVsOiBudW1iZXI7IC8vIEZvciBoaWVyYXJjaGljYWwgZGlzcGxheVxyXG5cdC8vIFJlbW92ZWQgbGFiZWxDb250YWluZXIgYW5kIG1hcmtkb3duUmVuZGVyZXIgYXMgdGhleSBhcmUgbWFuYWdlZCBpbnRlcm5hbGx5IGJ5IFRhc2tSZW5kZXJlckNvbXBvbmVudCBvciBub3QgbmVlZGVkXHJcbn1cclxuXHJcbi8vIE5ldyBpbnRlcmZhY2UgZm9yIHRhc2tzIHRoYXQgaGF2ZSBiZWVuIHN1Y2Nlc3NmdWxseSBwb3NpdGlvbmVkXHJcbmV4cG9ydCBpbnRlcmZhY2UgUGxhY2VkR2FudHRUYXNrSXRlbSBleHRlbmRzIEdhbnR0VGFza0l0ZW0ge1xyXG5cdHN0YXJ0WDogbnVtYmVyOyAvLyBzdGFydFggaXMgZ3VhcmFudGVlZCBhZnRlciBmaWx0ZXJpbmdcclxuXHQvLyBlbmRYIGFuZCB3aWR0aCBtaWdodCBhbHNvIGJlIGd1YXJhbnRlZWQgZGVwZW5kaW5nIG9uIGxvZ2ljLCBidXQga2VlcCBvcHRpb25hbCBmb3Igbm93XHJcbn1cclxuXHJcbi8vIENvbmZpZ3VyYXRpb24gb3B0aW9ucyBmb3IgdGhlIEdhbnR0IGNoYXJ0XHJcbmV4cG9ydCBpbnRlcmZhY2UgR2FudHRDb25maWcge1xyXG5cdC8vIFRpbWUgcmFuZ2Ugb3B0aW9uc1xyXG5cdHN0YXJ0RGF0ZT86IERhdGU7XHJcblx0ZW5kRGF0ZT86IERhdGU7XHJcblx0dGltZVVuaXQ/OiBUaW1lc2NhbGU7XHJcblxyXG5cdC8vIERpc3BsYXkgb3B0aW9uc1xyXG5cdGhlYWRlckhlaWdodD86IG51bWJlcjtcclxuXHRyb3dIZWlnaHQ/OiBudW1iZXI7XHJcblx0YmFySGVpZ2h0PzogbnVtYmVyO1xyXG5cdGJhckNvcm5lclJhZGl1cz86IG51bWJlcjtcclxuXHJcblx0Ly8gRm9ybWF0dGluZyBvcHRpb25zXHJcblx0ZGF0ZUZvcm1hdD86IHtcclxuXHRcdHByaW1hcnk/OiBzdHJpbmc7XHJcblx0XHRzZWNvbmRhcnk/OiBzdHJpbmc7XHJcblx0fTtcclxuXHJcblx0Ly8gQ29sb3JzXHJcblx0Y29sb3JzPzoge1xyXG5cdFx0YmFja2dyb3VuZD86IHN0cmluZztcclxuXHRcdGdyaWQ/OiBzdHJpbmc7XHJcblx0XHRyb3c/OiBzdHJpbmc7XHJcblx0XHRiYXI/OiBzdHJpbmc7XHJcblx0XHRtaWxlc3RvbmU/OiBzdHJpbmc7XHJcblx0XHRwcm9ncmVzcz86IHN0cmluZztcclxuXHRcdHRvZGF5Pzogc3RyaW5nO1xyXG5cdH07XHJcblxyXG5cdC8vIE90aGVyIG9wdGlvbnNcclxuXHRzaG93VG9kYXk/OiBib29sZWFuO1xyXG5cdHNob3dQcm9ncmVzcz86IGJvb2xlYW47XHJcblx0c2hvd1JlbGF0aW9ucz86IGJvb2xlYW47XHJcbn1cclxuXHJcbi8vIERlZmluZSB0aW1lc2NhbGUgb3B0aW9uc1xyXG5leHBvcnQgdHlwZSBUaW1lc2NhbGUgPSBcIkRheVwiIHwgXCJXZWVrXCIgfCBcIk1vbnRoXCIgfCBcIlllYXJcIjsgLy8gU3RpbGwgZXhwb3J0ZWRcclxuXHJcbmV4cG9ydCBjbGFzcyBHYW50dENvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHVibGljIGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHN2Z0VsOiBTVkdTVkdFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0YXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBhbGxUYXNrczogVGFza1tdID0gW107XHJcblx0cHJpdmF0ZSBwcmVwYXJlZFRhc2tzOiBQbGFjZWRHYW50dFRhc2tJdGVtW10gPSBbXTtcclxuXHRwcml2YXRlIGFwcDogQXBwO1xyXG5cclxuXHRwcml2YXRlIHRpbWVzY2FsZTogVGltZXNjYWxlID0gXCJEYXlcIjtcclxuXHRwcml2YXRlIGRheVdpZHRoOiBudW1iZXIgPSBEQVlfV0lEVEhfREVGQVVMVDtcclxuXHRwcml2YXRlIHN0YXJ0RGF0ZTogRGF0ZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgZW5kRGF0ZTogRGF0ZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdG90YWxXaWR0aDogbnVtYmVyID0gMDsgLy8gVG90YWwgc2Nyb2xsYWJsZSB3aWR0aFxyXG5cdHByaXZhdGUgdG90YWxIZWlnaHQ6IG51bWJlciA9IDA7IC8vIFRvdGFsIGNvbnRlbnQgaGVpZ2h0XHJcblxyXG5cdHByaXZhdGUgem9vbUxldmVsOiBudW1iZXIgPSAxOyAvLyBSYXRpbyBiYXNlZCBvbiBkZWZhdWx0IGRheSB3aWR0aFxyXG5cdHByaXZhdGUgdmlzaWJsZVN0YXJ0RGF0ZTogRGF0ZSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdmlzaWJsZUVuZERhdGU6IERhdGUgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIHNjcm9sbENvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNvbnRlbnRXcmFwcGVyRWw6IEhUTUxFbGVtZW50OyAvLyBDb250YWlucyB0aGUgU1ZHXHJcblx0cHJpdmF0ZSBmaWx0ZXJDb250YWluZXJFbDogSFRNTEVsZW1lbnQ7IC8vIENvbnRhaW5lciBmb3IgZmlsdGVyc1xyXG5cdHByaXZhdGUgaGVhZGVyQ29udGFpbmVyRWw6IEhUTUxFbGVtZW50OyAvLyBDb250YWluZXIgZm9yIHN0aWNreSBoZWFkZXJcclxuXHRwcml2YXRlIGlzU2Nyb2xsaW5nOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBpc1pvb21pbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gU1ZHIGdyb3VwcyAod2lsbCBiZSBwYXNzZWQgdG8gY2hpbGQgY29tcG9uZW50cylcclxuXHRwcml2YXRlIGdyaWRHcm91cEVsOiBTVkdHRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGFza0dyb3VwRWw6IFNWR0dFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdC8vIENoaWxkIENvbXBvbmVudHNcclxuXHRwcml2YXRlIGZpbHRlckNvbXBvbmVudDogRmlsdGVyQ29tcG9uZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0aW1lbGluZUhlYWRlckNvbXBvbmVudDogVGltZWxpbmVIZWFkZXJDb21wb25lbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGdyaWRCYWNrZ3JvdW5kQ29tcG9uZW50OiBHcmlkQmFja2dyb3VuZENvbXBvbmVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgdGFza1JlbmRlcmVyQ29tcG9uZW50OiBUYXNrUmVuZGVyZXJDb21wb25lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gSGVscGVyc1xyXG5cdHByaXZhdGUgZGF0ZUhlbHBlciA9IG5ldyBEYXRlSGVscGVyKCk7XHJcblxyXG5cdFx0Ly8gUGVyLXZpZXcgb3ZlcnJpZGUgZnJvbSBCYXNlc1xyXG5cdFx0cHJpdmF0ZSBjb25maWdPdmVycmlkZTogUGFydGlhbDxHYW50dFNwZWNpZmljQ29uZmlnPiB8IG51bGwgPSBudWxsO1xyXG5cclxuXHJcblx0cHJpdmF0ZSBjb25maWcgPSB7XHJcblx0XHRzaG93RGVwZW5kZW5jaWVzOiBmYWxzZSxcclxuXHRcdHRhc2tDb2xvckJ5OiBcInN0YXR1c1wiLFxyXG5cdFx0dXNlVmlydHVhbGl6YXRpb246IGZhbHNlLFxyXG5cdFx0ZGVib3VuY2VSZW5kZXJNczogNTAsXHJcblx0XHRzaG93VGFza0xhYmVsczogdHJ1ZSxcclxuXHRcdHVzZU1hcmtkb3duUmVuZGVyZXI6IHRydWUsXHJcblx0fTtcclxuXHJcblx0cHJpdmF0ZSBkZWJvdW5jZWRSZW5kZXI6IFJldHVyblR5cGU8dHlwZW9mIGRlYm91bmNlPjtcclxuXHRwcml2YXRlIGRlYm91bmNlZEhlYWRlclVwZGF0ZTogUmV0dXJuVHlwZTx0eXBlb2YgZGVib3VuY2U+OyAvLyBSZW5hbWVkIGZvciBjbGFyaXR5XHJcblxyXG5cdC8vIE9mZnNjcmVlbiB0YXNrIGluZGljYXRvcnNcclxuXHRwcml2YXRlIGxlZnRJbmRpY2F0b3JFbDogSFRNTEVsZW1lbnQ7IC8vIE5vdyBhIGNvbnRhaW5lclxyXG5cdHByaXZhdGUgcmlnaHRJbmRpY2F0b3JFbDogSFRNTEVsZW1lbnQ7IC8vIE5vdyBhIGNvbnRhaW5lclxyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRjb250YWluZXJFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIHBhcmFtczoge1xyXG5cdFx0XHRjb25maWc/OiBHYW50dENvbmZpZztcclxuXHRcdFx0b25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRcdFx0b25UYXNrQ29tcGxldGVkPzogKHRhc2s6IFRhc2spID0+IHZvaWQ7XHJcblx0XHRcdG9uVGFza0NvbnRleHRNZW51PzogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdFx0fSxcclxuXHRcdHByaXZhdGUgdmlld0lkOiBzdHJpbmcgPSBcImdhbnR0XCIgLy8g5paw5aKe77ya6KeG5Zu+SUTlj4LmlbBcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmFwcCA9IHBsdWdpbi5hcHA7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImdhbnR0LWNoYXJ0LWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGxheW91dCBjb250YWluZXJzXHJcblx0XHR0aGlzLmZpbHRlckNvbnRhaW5lckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwiZ2FudHQtZmlsdGVyLWFyZWFcIiAvLyBOZXcgY29udGFpbmVyIGZvciBmaWx0ZXJzXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5oZWFkZXJDb250YWluZXJFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImdhbnR0LWhlYWRlci1jb250YWluZXJcIlxyXG5cdFx0KTtcclxuXHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJnYW50dC1zY3JvbGwtY29udGFpbmVyXCJcclxuXHRcdCk7XHJcblx0XHR0aGlzLmNvbnRlbnRXcmFwcGVyRWwgPSB0aGlzLnNjcm9sbENvbnRhaW5lckVsLmNyZWF0ZURpdihcclxuXHRcdFx0XCJnYW50dC1jb250ZW50LXdyYXBwZXJcIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgb2Zmc2NyZWVuIGluZGljYXRvciBjb250YWluZXJzXHJcblx0XHR0aGlzLmxlZnRJbmRpY2F0b3JFbCA9IHRoaXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFxyXG5cdFx0XHRcImdhbnR0LWluZGljYXRvci1jb250YWluZXIgZ2FudHQtaW5kaWNhdG9yLWNvbnRhaW5lci1sZWZ0XCIgLy8gVXBkYXRlZCBjbGFzc2VzXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yaWdodEluZGljYXRvckVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoXHJcblx0XHRcdFwiZ2FudHQtaW5kaWNhdG9yLWNvbnRhaW5lciBnYW50dC1pbmRpY2F0b3ItY29udGFpbmVyLXJpZ2h0XCIgLy8gVXBkYXRlZCBjbGFzc2VzXHJcblx0XHQpO1xyXG5cdFx0Ly8gQ29udGFpbmVycyBhcmUgYWx3YXlzIHZpc2libGUsIGNvbnRlbnQgZGV0ZXJtaW5lcyBpZiBpbmRpY2F0b3JzIHNob3dcclxuXHRcdC8vIERlYm91bmNlZCBmdW5jdGlvbnNcclxuXHRcdHRoaXMuZGVib3VuY2VkUmVuZGVyID0gZGVib3VuY2UoXHJcblx0XHRcdHRoaXMucmVuZGVySW50ZXJuYWwsXHJcblx0XHRcdHRoaXMuY29uZmlnLmRlYm91bmNlUmVuZGVyTXNcclxuXHRcdCk7XHJcblxyXG5cclxuXHJcblx0XHQvLyBEZWJvdW5jZSBoZWFkZXIgdXBkYXRlcyB0cmlnZ2VyZWQgYnkgc2Nyb2xsXHJcblx0XHR0aGlzLmRlYm91bmNlZEhlYWRlclVwZGF0ZSA9IGRlYm91bmNlKFxyXG5cdFx0XHR0aGlzLnVwZGF0ZUhlYWRlckNvbXBvbmVudCxcclxuXHRcdFx0MTYgLy8gUmVuZGVyIGhlYWRlciBmcmVxdWVudGx5IG9uIHNjcm9sbFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiR2FudHRDb21wb25lbnQgbG9hZGVkLlwiKTtcclxuXHRcdFx0dGhpcy5hcHBseUVmZmVjdGl2ZUNvbmZpZygpO1xyXG5cclxuXHRcdHRoaXMuY3JlYXRlQmFzZVNWRygpOyAvLyBDcmVhdGVzIFNWRyBhbmQgZ3JvdXBzXHJcblxyXG5cdFx0Ly8gSW5zdGFudGlhdGUgQ2hpbGQgQ29tcG9uZW50c1xyXG5cdFx0dGhpcy5maWx0ZXJDb21wb25lbnQgPSB0aGlzLmFkZENoaWxkKFxyXG5cdFx0XHRuZXcgRmlsdGVyQ29tcG9uZW50KFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNvbnRhaW5lcjogdGhpcy5maWx0ZXJDb250YWluZXJFbCxcclxuXHRcdFx0XHRcdG9wdGlvbnM6IGJ1aWxkRmlsdGVyT3B0aW9uc0Zyb21UYXNrcyh0aGlzLnRhc2tzKSwgLy8gSW5pdGlhbGl6ZSB3aXRoIGVtcHR5IGFycmF5IHRvIHNhdGlzZnkgdHlwZSwgd2lsbCBiZSB1cGRhdGVkIGR5bmFtaWNhbGx5XHJcblx0XHRcdFx0XHRvbkNoYW5nZTogKGFjdGl2ZUZpbHRlcnM6IEFjdGl2ZUZpbHRlcltdKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kUmVuZGVyKGFjdGl2ZUZpbHRlcnMpO1xyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGNvbXBvbmVudHM6IFtcclxuXHRcdFx0XHRcdFx0bmV3IFNjcm9sbFRvRGF0ZUJ1dHRvbihcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmZpbHRlckNvbnRhaW5lckVsLFxyXG5cdFx0XHRcdFx0XHRcdChkYXRlOiBEYXRlKSA9PiB0aGlzLnNjcm9sbFRvRGF0ZShkYXRlKVxyXG5cdFx0XHRcdFx0XHQpLFxyXG5cdFx0XHRcdFx0XSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luXHJcblxyXG5cclxuXHJcblx0XHRcdClcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKHRoaXMuaGVhZGVyQ29udGFpbmVyRWwpIHtcclxuXHRcdFx0dGhpcy50aW1lbGluZUhlYWRlckNvbXBvbmVudCA9IHRoaXMuYWRkQ2hpbGQoXHJcblx0XHRcdFx0bmV3IFRpbWVsaW5lSGVhZGVyQ29tcG9uZW50KHRoaXMuYXBwLCB0aGlzLmhlYWRlckNvbnRhaW5lckVsKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmdyaWRHcm91cEVsKSB7XHJcblx0XHRcdHRoaXMuZ3JpZEJhY2tncm91bmRDb21wb25lbnQgPSB0aGlzLmFkZENoaWxkKFxyXG5cdFx0XHRcdG5ldyBHcmlkQmFja2dyb3VuZENvbXBvbmVudCh0aGlzLmFwcCwgdGhpcy5ncmlkR3JvdXBFbClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy50YXNrR3JvdXBFbCkge1xyXG5cdFx0XHR0aGlzLnRhc2tSZW5kZXJlckNvbXBvbmVudCA9IHRoaXMuYWRkQ2hpbGQoXHJcblx0XHRcdFx0bmV3IFRhc2tSZW5kZXJlckNvbXBvbmVudCh0aGlzLmFwcCwgdGhpcy50YXNrR3JvdXBFbClcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwsXHJcblx0XHRcdFwic2Nyb2xsXCIsXHJcblx0XHRcdHRoaXMuaGFuZGxlU2Nyb2xsXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuY29udGFpbmVyRWwsIFwid2hlZWxcIiwgdGhpcy5oYW5kbGVXaGVlbCwge1xyXG5cdFx0XHRwYXNzaXZlOiBmYWxzZSxcclxuXHRcdH0pO1xyXG5cdFx0XHR0aGlzLmFwcGx5RWZmZWN0aXZlQ29uZmlnKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbCByZW5kZXIgaXMgdHJpZ2dlcmVkIGJ5IHVwZGF0ZVRhc2tzIG9yIHJlZnJlc2hcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJHYW50dENvbXBvbmVudCB1bmxvYWRlZC5cIik7XHJcblx0XHQodGhpcy5kZWJvdW5jZWRSZW5kZXIgYXMgYW55KS5jYW5jZWwoKTtcclxuXHRcdCh0aGlzLmRlYm91bmNlZEhlYWRlclVwZGF0ZSBhcyBhbnkpLmNhbmNlbCgpO1xyXG5cclxuXHRcdC8vIENoaWxkIGNvbXBvbmVudHMgYXJlIHVubG9hZGVkIGF1dG9tYXRpY2FsbHkgd2hlbiB0aGUgcGFyZW50IGlzIHVubG9hZGVkXHJcblx0XHQvLyBSZW1vdmUgc3BlY2lmaWMgZWxlbWVudHMgaWYgbmVlZGVkXHJcblx0XHRpZiAodGhpcy5zdmdFbCkge1xyXG5cdFx0XHR0aGlzLnN2Z0VsLmRldGFjaCgpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5maWx0ZXJDb250YWluZXJFbC5kZXRhY2goKTtcclxuXHRcdHRoaXMuaGVhZGVyQ29udGFpbmVyRWwuZGV0YWNoKCk7XHJcblx0XHR0aGlzLnNjcm9sbENvbnRhaW5lckVsLmRldGFjaCgpOyAvLyBUaGlzIHJlbW92ZXMgY29udGVudFdyYXBwZXJFbCBhbmQgc3ZnRWwgdG9vXHJcblx0XHR0aGlzLmxlZnRJbmRpY2F0b3JFbC5kZXRhY2goKTsgLy8gUmVtb3ZlIGluZGljYXRvciBjb250YWluZXJzXHJcblx0XHR0aGlzLnJpZ2h0SW5kaWNhdG9yRWwuZGV0YWNoKCk7IC8vIFJlbW92ZSBpbmRpY2F0b3IgY29udGFpbmVyc1xyXG5cclxuXHRcdHRoaXMuY29udGFpbmVyRWwucmVtb3ZlQ2xhc3MoXCJnYW50dC1jaGFydC1jb250YWluZXJcIik7XHJcblx0XHR0aGlzLnRhc2tzID0gW107XHJcblx0XHR0aGlzLmFsbFRhc2tzID0gW107XHJcblxyXG5cdFx0dGhpcy5jb250YWluZXJFbC5yZW1vdmVDbGFzcyhcImdhbnR0LWNoYXJ0LWNvbnRhaW5lclwiKTtcclxuXHRcdHRoaXMudGFza3MgPSBbXTtcclxuXHRcdHRoaXMucHJlcGFyZWRUYXNrcyA9IFtdO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldENvbmZpZ092ZXJyaWRlKG92ZXJyaWRlOiBQYXJ0aWFsPEdhbnR0U3BlY2lmaWNDb25maWc+IHwgbnVsbCk6IHZvaWQge1xyXG5cdFx0dGhpcy5jb25maWdPdmVycmlkZSA9IG92ZXJyaWRlID8/IG51bGw7XHJcblx0XHR0aGlzLmFwcGx5RWZmZWN0aXZlQ29uZmlnKCk7XHJcblx0XHQvLyBSZS1yZW5kZXIgd2l0aCBuZXcgc2V0dGluZ3NcclxuXHRcdHRoaXMuZGVib3VuY2VkUmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEVmZmVjdGl2ZUdhbnR0Q29uZmlnKCk6IFBhcnRpYWw8R2FudHRTcGVjaWZpY0NvbmZpZz4ge1xyXG5cdFx0Y29uc3QgdmlldyA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQodiA9PiB2LmlkID09PSB0aGlzLnZpZXdJZCk7XHJcblx0XHRsZXQgYmFzZTogUGFydGlhbDxHYW50dFNwZWNpZmljQ29uZmlnPiA9IHt9O1xyXG5cdFx0aWYgKHZpZXcgJiYgdmlldy5zcGVjaWZpY0NvbmZpZyAmJiB2aWV3LnNwZWNpZmljQ29uZmlnLnZpZXdUeXBlID09PSBcImdhbnR0XCIpIHtcclxuXHRcdFx0YmFzZSA9IHZpZXcuc3BlY2lmaWNDb25maWcgYXMgR2FudHRTcGVjaWZpY0NvbmZpZztcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNvbnN0IGRlZiA9IHRoaXMucGx1Z2luLnNldHRpbmdzLnZpZXdDb25maWd1cmF0aW9uLmZpbmQodiA9PiB2LmlkID09PSBcImdhbnR0XCIpO1xyXG5cdFx0XHRiYXNlID0gKGRlZj8uc3BlY2lmaWNDb25maWcgYXMgR2FudHRTcGVjaWZpY0NvbmZpZykgfHwgKHt9IGFzIGFueSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4geyAuLi4oYmFzZSA/PyB7fSksIC4uLih0aGlzLmNvbmZpZ092ZXJyaWRlID8/IHt9KSB9O1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhcHBseUVmZmVjdGl2ZUNvbmZpZygpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGVmZiA9IHRoaXMuZ2V0RWZmZWN0aXZlR2FudHRDb25maWcoKTtcclxuXHRcdGlmICh0eXBlb2YgZWZmLnNob3dUYXNrTGFiZWxzID09PSBcImJvb2xlYW5cIikgdGhpcy5jb25maWcuc2hvd1Rhc2tMYWJlbHMgPSBlZmYuc2hvd1Rhc2tMYWJlbHM7XHJcblx0XHRpZiAodHlwZW9mIGVmZi51c2VNYXJrZG93blJlbmRlcmVyID09PSBcImJvb2xlYW5cIikgdGhpcy5jb25maWcudXNlTWFya2Rvd25SZW5kZXJlciA9IGVmZi51c2VNYXJrZG93blJlbmRlcmVyO1xyXG5cdH1cclxuXHJcblxyXG5cdHNldFRhc2tzKG5ld1Rhc2tzOiBUYXNrW10pIHtcclxuXHRcdHRoaXMucHJlcGFyZWRUYXNrcyA9IFtdOyAvLyBDbGVhciBwcmVwYXJlZCB0YXNrc1xyXG5cclxuXHRcdHRoaXMudGFza3MgPSB0aGlzLnNvcnRUYXNrcyhuZXdUYXNrcyk7XHJcblx0XHR0aGlzLmFsbFRhc2tzID0gWy4uLnRoaXMudGFza3NdOyAvLyBTdG9yZSB0aGUgb3JpZ2luYWwsIHNvcnRlZCBsaXN0XHJcblxyXG5cdFx0Ly8gUHJlcGFyZSB0YXNrcyBpbml0aWFsbHkgdG8gZ2VuZXJhdGUgcmVsZXZhbnQgZmlsdGVyIG9wdGlvbnNcclxuXHRcdHRoaXMucHJlcGFyZVRhc2tzRm9yUmVuZGVyKCk7IC8vIENhbGN1bGF0ZSBwcmVwYXJlZFRhc2tzIGJhc2VkIG9uIHRoZSBpbml0aWFsIGZ1bGwgbGlzdFxyXG5cclxuXHRcdC8vIFVwZGF0ZSBmaWx0ZXIgb3B0aW9ucyBiYXNlZCBvbiB0aGUgaW5pdGlhbGx5IHByZXBhcmVkIHRhc2sgbGlzdFxyXG5cdFx0aWYgKHRoaXMuZmlsdGVyQ29tcG9uZW50KSB7XHJcblx0XHRcdC8vIEV4dHJhY3QgdGhlIG9yaWdpbmFsIFRhc2sgb2JqZWN0cyBmcm9tIHByZXBhcmVkVGFza3NcclxuXHRcdFx0Y29uc3QgdGFza3NGb3JGaWx0ZXJpbmcgPSB0aGlzLnByZXBhcmVkVGFza3MubWFwKChwdCkgPT4gcHQudGFzayk7XHJcblx0XHRcdHRoaXMuZmlsdGVyQ29tcG9uZW50LnVwZGF0ZUZpbHRlck9wdGlvbnModGFza3NGb3JGaWx0ZXJpbmcpOyAvLyBVc2UgcHJlcGFyZWQgdGFza3MgZm9yIGluaXRpYWwgb3B0aW9uc1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFwcGx5IGFueSBleGlzdGluZyBmaWx0ZXJzIGZyb20gdGhlIGNvbXBvbmVudCAod2lsbCByZS1wcmVwYXJlIGFuZCByZS11cGRhdGUgZmlsdGVycylcclxuXHRcdGNvbnN0IGN1cnJlbnRGaWx0ZXJzID0gdGhpcy5maWx0ZXJDb21wb25lbnQ/LmdldEFjdGl2ZUZpbHRlcnMoKSB8fCBbXTtcclxuXHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kUmVuZGVyKGN1cnJlbnRGaWx0ZXJzKTsgLy8gVGhpcyB3aWxsIGNhbGwgcHJlcGFyZVRhc2tzRm9yUmVuZGVyIGFnYWluIGFuZCB1cGRhdGUgZmlsdGVyc1xyXG5cclxuXHRcdC8vIFNjcm9sbCB0byB0b2RheSBhZnRlciB0aGUgaW5pdGlhbCByZW5kZXIgaXMgc2NoZWR1bGVkXHJcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBpZiBjb21wb25lbnQgaXMgc3RpbGwgbG9hZGVkIGJlZm9yZSBzY3JvbGxpbmdcclxuXHRcdFx0aWYgKHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwpIHtcclxuXHRcdFx0XHR0aGlzLnNjcm9sbFRvRGF0ZShuZXcgRGF0ZSgpKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRzZXRUaW1lc2NhbGUobmV3VGltZXNjYWxlOiBUaW1lc2NhbGUpIHtcclxuXHRcdHRoaXMudGltZXNjYWxlID0gbmV3VGltZXNjYWxlO1xyXG5cdFx0dGhpcy5jYWxjdWxhdGVUaW1lc2NhbGVQYXJhbXMoKTsgLy8gVXBkYXRlIHBhcmFtcyBiYXNlZCBvbiBuZXcgc2NhbGVcclxuXHRcdHRoaXMucHJlcGFyZVRhc2tzRm9yUmVuZGVyKCk7IC8vIFByZXBhcmUgdGFza3Mgd2l0aCBuZXcgc2NhbGVcclxuXHRcdHRoaXMuZGVib3VuY2VkUmVuZGVyKCk7IC8vIFRyaWdnZXIgZnVsbCByZW5kZXJcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlQmFzZVNWRygpIHtcclxuXHRcdGlmICh0aGlzLnN2Z0VsKSB0aGlzLnN2Z0VsLnJlbW92ZSgpO1xyXG5cclxuXHRcdHRoaXMuc3ZnRWwgPSB0aGlzLmNvbnRlbnRXcmFwcGVyRWwuY3JlYXRlU3ZnKFwic3ZnXCIsIHtcclxuXHRcdFx0Y2xzOiBcImdhbnR0LXN2Z1wiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5zdmdFbC5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBcIjEwMCVcIik7XHJcblx0XHR0aGlzLnN2Z0VsLnNldEF0dHJpYnV0ZShcImhlaWdodFwiLCBcIjEwMCVcIik7XHJcblx0XHR0aGlzLnN2Z0VsLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCI7XHJcblxyXG5cdFx0Ly8gRGVmaW5lIFNWRyBncm91cHMgZm9yIGNoaWxkcmVuXHJcblx0XHR0aGlzLnN2Z0VsLmNyZWF0ZVN2ZyhcImRlZnNcIik7XHJcblx0XHR0aGlzLmdyaWRHcm91cEVsID0gdGhpcy5zdmdFbC5jcmVhdGVTdmcoXCJnXCIsIHsgY2xzOiBcImdhbnR0LWdyaWRcIiB9KTtcclxuXHRcdHRoaXMudGFza0dyb3VwRWwgPSB0aGlzLnN2Z0VsLmNyZWF0ZVN2ZyhcImdcIiwgeyBjbHM6IFwiZ2FudHQtdGFza3NcIiB9KTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBEYXRlIFJhbmdlIGFuZCBUaW1lc2NhbGUgQ2FsY3VsYXRpb25zIC0tLVxyXG5cclxuXHRwcml2YXRlIGNhbGN1bGF0ZURhdGVSYW5nZShmb3JjZVJlY2FsY3VsYXRlOiBib29sZWFuID0gZmFsc2UpOiB7XHJcblx0XHRzdGFydERhdGU6IERhdGU7XHJcblx0XHRlbmREYXRlOiBEYXRlO1xyXG5cdH0ge1xyXG5cdFx0aWYgKCFmb3JjZVJlY2FsY3VsYXRlICYmIHRoaXMuc3RhcnREYXRlICYmIHRoaXMuZW5kRGF0ZSkge1xyXG5cdFx0XHRyZXR1cm4geyBzdGFydERhdGU6IHRoaXMuc3RhcnREYXRlLCBlbmREYXRlOiB0aGlzLmVuZERhdGUgfTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy50YXNrcy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHR0aGlzLnN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZUhlbHBlci5zdGFydE9mRGF5KFxyXG5cdFx0XHRcdHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKHRvZGF5LCAtNylcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5lbmREYXRlID0gdGhpcy5kYXRlSGVscGVyLmFkZERheXModG9kYXksIDMwKTtcclxuXHRcdFx0Ly8gU2V0IGluaXRpYWwgdmlzaWJsZSByYW5nZVxyXG5cdFx0XHRpZiAoIXRoaXMudmlzaWJsZVN0YXJ0RGF0ZSlcclxuXHRcdFx0XHR0aGlzLnZpc2libGVTdGFydERhdGUgPSBuZXcgRGF0ZSh0aGlzLnN0YXJ0RGF0ZSk7XHJcblx0XHRcdHRoaXMudmlzaWJsZUVuZERhdGUgPSB0aGlzLmNhbGN1bGF0ZVZpc2libGVFbmREYXRlKCk7XHJcblx0XHRcdHJldHVybiB7IHN0YXJ0RGF0ZTogdGhpcy5zdGFydERhdGUsIGVuZERhdGU6IHRoaXMuZW5kRGF0ZSB9O1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCBtaW5UaW1lc3RhbXAgPSBJbmZpbml0eTtcclxuXHRcdGxldCBtYXhUaW1lc3RhbXAgPSAtSW5maW5pdHk7XHJcblxyXG5cdFx0dGhpcy50YXNrcy5mb3JFYWNoKCh0YXNrKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2tTdGFydCA9XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGUgfHxcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUgfHxcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlO1xyXG5cdFx0XHRjb25zdCB0YXNrRW5kID1cclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmR1ZURhdGUgfHwgdGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlO1xyXG5cclxuXHRcdFx0aWYgKHRhc2tTdGFydCkge1xyXG5cdFx0XHRcdGNvbnN0IHN0YXJ0VHMgPSBuZXcgRGF0ZSh0YXNrU3RhcnQpLmdldFRpbWUoKTtcclxuXHRcdFx0XHRpZiAoIWlzTmFOKHN0YXJ0VHMpKSB7XHJcblx0XHRcdFx0XHRtaW5UaW1lc3RhbXAgPSBNYXRoLm1pbihtaW5UaW1lc3RhbXAsIHN0YXJ0VHMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICh0YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlKSB7XHJcblx0XHRcdFx0Y29uc3QgY3JlYXRpb25UcyA9IG5ldyBEYXRlKFxyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZVxyXG5cdFx0XHRcdCkuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdGlmICghaXNOYU4oY3JlYXRpb25UcykpIHtcclxuXHRcdFx0XHRcdG1pblRpbWVzdGFtcCA9IE1hdGgubWluKG1pblRpbWVzdGFtcCwgY3JlYXRpb25Ucyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGFza0VuZCkge1xyXG5cdFx0XHRcdGNvbnN0IGVuZFRzID0gbmV3IERhdGUodGFza0VuZCkuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdGlmICghaXNOYU4oZW5kVHMpKSB7XHJcblx0XHRcdFx0XHRjb25zdCBpc01pbGVzdG9uZSA9XHJcblx0XHRcdFx0XHRcdCF0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSAmJiB0YXNrLm1ldGFkYXRhLmR1ZURhdGU7XHJcblx0XHRcdFx0XHRtYXhUaW1lc3RhbXAgPSBNYXRoLm1heChcclxuXHRcdFx0XHRcdFx0bWF4VGltZXN0YW1wLFxyXG5cdFx0XHRcdFx0XHRpc01pbGVzdG9uZVxyXG5cdFx0XHRcdFx0XHRcdD8gZW5kVHNcclxuXHRcdFx0XHRcdFx0XHQ6IHRoaXMuZGF0ZUhlbHBlclxyXG5cdFx0XHRcdFx0XHRcdFx0XHQuYWRkRGF5cyhuZXcgRGF0ZShlbmRUcyksIDEpXHJcblx0XHRcdFx0XHRcdFx0XHRcdC5nZXRUaW1lKClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGFza1N0YXJ0ICYmICF0YXNrRW5kKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRUcyA9IG5ldyBEYXRlKHRhc2tTdGFydCkuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdGlmICghaXNOYU4oc3RhcnRUcykpIHtcclxuXHRcdFx0XHRcdG1heFRpbWVzdGFtcCA9IE1hdGgubWF4KFxyXG5cdFx0XHRcdFx0XHRtYXhUaW1lc3RhbXAsXHJcblx0XHRcdFx0XHRcdHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKG5ldyBEYXRlKHN0YXJ0VHMpLCAxKS5nZXRUaW1lKClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBQQURESU5HX0RBWVMgPSAzNjUwOyAvLyBJbmNyZWFzZWQgcGFkZGluZyBzaWduaWZpY2FudGx5IGZvciBuZWFyLWluZmluaXRlIHNjcm9sbFxyXG5cdFx0aWYgKG1pblRpbWVzdGFtcCA9PT0gSW5maW5pdHkgfHwgbWF4VGltZXN0YW1wID09PSAtSW5maW5pdHkpIHtcclxuXHRcdFx0Y29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHR0aGlzLnN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZUhlbHBlci5zdGFydE9mRGF5KFxyXG5cdFx0XHRcdHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKHRvZGF5LCAtUEFERElOR19EQVlTKSAvLyBVc2UgcGFkZGluZ1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmVuZERhdGUgPSB0aGlzLmRhdGVIZWxwZXIuYWRkRGF5cyh0b2RheSwgUEFERElOR19EQVlTKTsgLy8gVXNlIHBhZGRpbmdcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuc3RhcnREYXRlID0gdGhpcy5kYXRlSGVscGVyLnN0YXJ0T2ZEYXkoXHJcblx0XHRcdFx0dGhpcy5kYXRlSGVscGVyLmFkZERheXMobmV3IERhdGUobWluVGltZXN0YW1wKSwgLVBBRERJTkdfREFZUykgLy8gVXNlIHBhZGRpbmdcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5lbmREYXRlID0gdGhpcy5kYXRlSGVscGVyLnN0YXJ0T2ZEYXkoXHJcblx0XHRcdFx0dGhpcy5kYXRlSGVscGVyLmFkZERheXMobmV3IERhdGUobWF4VGltZXN0YW1wKSwgUEFERElOR19EQVlTKSAvLyBVc2UgcGFkZGluZ1xyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmVuZERhdGUgPD0gdGhpcy5zdGFydERhdGUpIHtcclxuXHRcdFx0Ly8gRW5zdXJlIGVuZCBkYXRlIGlzIGFmdGVyIHN0YXJ0IGRhdGUsIGV2ZW4gd2l0aCBwYWRkaW5nXHJcblx0XHRcdHRoaXMuZW5kRGF0ZSA9IHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKFxyXG5cdFx0XHRcdHRoaXMuc3RhcnREYXRlLFxyXG5cdFx0XHRcdFBBRERJTkdfREFZUyAqIDJcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgaW5pdGlhbCB2aXNpYmxlIHJhbmdlIGlmIG5vdCBzZXQgb3IgZm9yY2VkXHJcblx0XHRpZiAoZm9yY2VSZWNhbGN1bGF0ZSB8fCAhdGhpcy52aXNpYmxlU3RhcnREYXRlKSB7XHJcblx0XHRcdHRoaXMudmlzaWJsZVN0YXJ0RGF0ZSA9IG5ldyBEYXRlKHRoaXMuc3RhcnREYXRlKTtcclxuXHRcdH1cclxuXHRcdHRoaXMudmlzaWJsZUVuZERhdGUgPSB0aGlzLmNhbGN1bGF0ZVZpc2libGVFbmREYXRlKCk7XHJcblxyXG5cdFx0cmV0dXJuIHsgc3RhcnREYXRlOiB0aGlzLnN0YXJ0RGF0ZSwgZW5kRGF0ZTogdGhpcy5lbmREYXRlIH07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNhbGN1bGF0ZVZpc2libGVFbmREYXRlKCk6IERhdGUge1xyXG5cdFx0aWYgKCF0aGlzLnZpc2libGVTdGFydERhdGUgfHwgIXRoaXMuc2Nyb2xsQ29udGFpbmVyRWwpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZW5kRGF0ZSB8fCBuZXcgRGF0ZSgpO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgY29udGFpbmVyV2lkdGggPSB0aGlzLnNjcm9sbENvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xyXG5cdFx0Ly8gRW5zdXJlIGRheVdpZHRoIGlzIHBvc2l0aXZlIHRvIGF2b2lkIGluZmluaXRlIGxvb3BzIG9yIGVycm9yc1xyXG5cdFx0Y29uc3QgZWZmZWN0aXZlRGF5V2lkdGggPSBNYXRoLm1heCgxLCB0aGlzLmRheVdpZHRoKTtcclxuXHRcdGNvbnN0IHZpc2libGVEYXlzID0gTWF0aC5jZWlsKGNvbnRhaW5lcldpZHRoIC8gZWZmZWN0aXZlRGF5V2lkdGgpO1xyXG5cdFx0cmV0dXJuIHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKHRoaXMudmlzaWJsZVN0YXJ0RGF0ZSwgdmlzaWJsZURheXMpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjYWxjdWxhdGVUaW1lc2NhbGVQYXJhbXMoKSB7XHJcblx0XHRpZiAoIXRoaXMuc3RhcnREYXRlIHx8ICF0aGlzLmVuZERhdGUpIHJldHVybjtcclxuXHJcblx0XHQvLyBEZXRlcm1pbmUgYXBwcm9wcmlhdGUgdGltZXNjYWxlIGJhc2VkIG9uIGRheVdpZHRoXHJcblx0XHRpZiAodGhpcy5kYXlXaWR0aCA8IDE1KSB0aGlzLnRpbWVzY2FsZSA9IFwiWWVhclwiO1xyXG5cdFx0ZWxzZSBpZiAodGhpcy5kYXlXaWR0aCA8IDM1KSB0aGlzLnRpbWVzY2FsZSA9IFwiTW9udGhcIjtcclxuXHRcdGVsc2UgaWYgKHRoaXMuZGF5V2lkdGggPCA3MCkgdGhpcy50aW1lc2NhbGUgPSBcIldlZWtcIjtcclxuXHRcdGVsc2UgdGhpcy50aW1lc2NhbGUgPSBcIkRheVwiO1xyXG5cdH1cclxuXHJcblx0Ly8gUHJlcGFyZSB0YXNrIGRhdGEgZm9yIHJlbmRlcmluZyAoc3RpbGwgbmVlZGVkIGZvciBsYXlvdXQgY2FsY3VsYXRpb25zKVxyXG5cdHByaXZhdGUgcHJlcGFyZVRhc2tzRm9yUmVuZGVyKCkge1xyXG5cdFx0aWYgKCF0aGlzLnN0YXJ0RGF0ZSB8fCAhdGhpcy5lbmREYXRlKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJDYW5ub3QgcHJlcGFyZSB0YXNrczogZGF0ZSByYW5nZSBub3Qgc2V0LlwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5jYWxjdWxhdGVUaW1lc2NhbGVQYXJhbXMoKTsgLy8gRW5zdXJlIHRpbWVzY2FsZSBpcyBjdXJyZW50XHJcblxyXG5cdFx0Ly8gRGVmaW5lIGFuIGludGVybWVkaWF0ZSB0eXBlIGZvciBtYXBwZWQgdGFza3MgYmVmb3JlIGZpbHRlcmluZ1xyXG5cdFx0dHlwZSBNYXBwZWRUYXNrID0gT21pdDxHYW50dFRhc2tJdGVtLCBcInN0YXJ0WFwiPiAmIHsgc3RhcnRYPzogbnVtYmVyIH07XHJcblxyXG5cdFx0Y29uc3QgbWFwcGVkVGFza3M6IE1hcHBlZFRhc2tbXSA9IHRoaXMudGFza3MubWFwKCh0YXNrLCBpbmRleCkgPT4ge1xyXG5cdFx0XHRjb25zdCB5ID0gaW5kZXggKiBST1dfSEVJR0hUICsgUk9XX0hFSUdIVCAvIDI7IC8vIFkgcG9zaXRpb24gYmFzZWQgb24gcm93IGluZGV4XHJcblx0XHRcdGxldCBzdGFydFg6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuXHRcdFx0bGV0IGVuZFg6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuXHRcdFx0bGV0IGlzTWlsZXN0b25lID0gZmFsc2U7XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrU3RhcnQgPVxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuc3RhcnREYXRlIHx8IHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0bGV0IHRhc2tEdWUgPSB0YXNrLm1ldGFkYXRhLmR1ZURhdGU7XHJcblxyXG5cdFx0XHRpZiAodGFza1N0YXJ0KSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RhcnREYXRlID0gbmV3IERhdGUodGFza1N0YXJ0KTtcclxuXHRcdFx0XHRpZiAoIWlzTmFOKHN0YXJ0RGF0ZS5nZXRUaW1lKCkpKSB7XHJcblx0XHRcdFx0XHRzdGFydFggPSB0aGlzLmRhdGVIZWxwZXIuZGF0ZVRvWChcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YXJ0RGF0ZSEsXHJcblx0XHRcdFx0XHRcdHRoaXMuZGF5V2lkdGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGFza0R1ZSkge1xyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGUgPSBuZXcgRGF0ZSh0YXNrRHVlKTtcclxuXHRcdFx0XHRpZiAoIWlzTmFOKGR1ZURhdGUuZ2V0VGltZSgpKSkge1xyXG5cdFx0XHRcdFx0ZW5kWCA9IHRoaXMuZGF0ZUhlbHBlci5kYXRlVG9YKFxyXG5cdFx0XHRcdFx0XHR0aGlzLmRhdGVIZWxwZXIuYWRkRGF5cyhkdWVEYXRlLCAxKSxcclxuXHRcdFx0XHRcdFx0dGhpcy5zdGFydERhdGUhLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmRheVdpZHRoXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICh0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGUgJiYgdGFza1N0YXJ0KSB7XHJcblx0XHRcdFx0Ly8gT3B0aW9uYWw6IGVuZCBiYXIgYXQgY29tcGxldGlvbiBkYXRlIGlmIG5vIGR1ZSBkYXRlXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQodGFza0R1ZSAmJiAhdGFza1N0YXJ0KSB8fFxyXG5cdFx0XHRcdCh0YXNrU3RhcnQgJiZcclxuXHRcdFx0XHRcdHRhc2tEdWUgJiZcclxuXHRcdFx0XHRcdHRoaXMuZGF0ZUhlbHBlci5kYXlzQmV0d2VlbihcclxuXHRcdFx0XHRcdFx0bmV3IERhdGUodGFza1N0YXJ0KSxcclxuXHRcdFx0XHRcdFx0bmV3IERhdGUodGFza0R1ZSlcclxuXHRcdFx0XHRcdCkgPT09IDApXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IG1pbGVzdG9uZURhdGUgPSB0YXNrRHVlXHJcblx0XHRcdFx0XHQ/IG5ldyBEYXRlKHRhc2tEdWUpXHJcblx0XHRcdFx0XHQ6IHRhc2tTdGFydFxyXG5cdFx0XHRcdFx0PyBuZXcgRGF0ZSh0YXNrU3RhcnQpXHJcblx0XHRcdFx0XHQ6IG51bGw7XHJcblx0XHRcdFx0aWYgKG1pbGVzdG9uZURhdGUpIHtcclxuXHRcdFx0XHRcdHN0YXJ0WCA9IHRoaXMuZGF0ZUhlbHBlci5kYXRlVG9YKFxyXG5cdFx0XHRcdFx0XHRtaWxlc3RvbmVEYXRlLFxyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YXJ0RGF0ZSEsXHJcblx0XHRcdFx0XHRcdHRoaXMuZGF5V2lkdGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRlbmRYID0gc3RhcnRYO1xyXG5cdFx0XHRcdFx0aXNNaWxlc3RvbmUgPSB0cnVlO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRzdGFydFggPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHRlbmRYID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICghdGFza1N0YXJ0ICYmICF0YXNrRHVlKSB7XHJcblx0XHRcdFx0c3RhcnRYID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdGVuZFggPSB1bmRlZmluZWQ7XHJcblx0XHRcdH0gZWxzZSBpZiAodGFza1N0YXJ0ICYmICF0YXNrRHVlKSB7XHJcblx0XHRcdFx0aWYgKHN0YXJ0WCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0XHRlbmRYID0gdGhpcy5kYXRlSGVscGVyLmRhdGVUb1goXHJcblx0XHRcdFx0XHRcdHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKG5ldyBEYXRlKHRhc2tTdGFydCEpLCAxKSxcclxuXHRcdFx0XHRcdFx0dGhpcy5zdGFydERhdGUhLFxyXG5cdFx0XHRcdFx0XHR0aGlzLmRheVdpZHRoXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aXNNaWxlc3RvbmUgPSBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHdpZHRoID1cclxuXHRcdFx0XHRzdGFydFggIT09IHVuZGVmaW5lZCAmJiBlbmRYICE9PSB1bmRlZmluZWQgJiYgIWlzTWlsZXN0b25lXHJcblx0XHRcdFx0XHQ/IE1hdGgubWF4KDEsIGVuZFggLSBzdGFydFgpXHJcblx0XHRcdFx0XHQ6IHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0dGFzayxcclxuXHRcdFx0XHR5OiB5LCAvLyBZIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSBTVkcgdG9wXHJcblx0XHRcdFx0c3RhcnRYLFxyXG5cdFx0XHRcdGVuZFgsXHJcblx0XHRcdFx0d2lkdGgsXHJcblx0XHRcdFx0aXNNaWxlc3RvbmUsXHJcblx0XHRcdFx0bGV2ZWw6IDAsXHJcblx0XHRcdH07XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBGaWx0ZXIgb3V0IHRhc2tzIHRoYXQgY291bGRuJ3QgYmUgcGxhY2VkIGFuZCBhc3NlcnQgdGhlIHR5cGVcclxuXHRcdHRoaXMucHJlcGFyZWRUYXNrcyA9IG1hcHBlZFRhc2tzLmZpbHRlcihcclxuXHRcdFx0KHB0KTogcHQgaXMgUGxhY2VkR2FudHRUYXNrSXRlbSA9PiBwdC5zdGFydFggIT09IHVuZGVmaW5lZFxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcIlByZXBhcmVkIFRhc2tzOlwiLCB0aGlzLnByZXBhcmVkVGFza3MpO1xyXG5cclxuXHRcdC8vIENhbGN1bGF0ZSB0b3RhbCBkaW1lbnNpb25zXHJcblx0XHQvLyBFbnN1cmUgYSBtaW5pbXVtIGhlaWdodCBldmVuIGlmIHRoZXJlIGFyZSBubyB0YXNrcyBpbml0aWFsbHlcclxuXHRcdGNvbnN0IE1JTl9ST1dTX0RJU1BMQVkgPSA1OyAvLyBTaG93IGF0IGxlYXN0IDUgcm93cyB3b3J0aCBvZiBoZWlnaHRcclxuXHRcdHRoaXMudG90YWxIZWlnaHQgPSBNYXRoLm1heChcclxuXHRcdFx0dGhpcy5wcmVwYXJlZFRhc2tzLmxlbmd0aCAqIFJPV19IRUlHSFQsXHJcblx0XHRcdE1JTl9ST1dTX0RJU1BMQVkgKiBST1dfSEVJR0hUXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgdG90YWxEYXlzID0gdGhpcy5kYXRlSGVscGVyLmRheXNCZXR3ZWVuKFxyXG5cdFx0XHR0aGlzLnN0YXJ0RGF0ZSEsXHJcblx0XHRcdHRoaXMuZW5kRGF0ZSFcclxuXHRcdCk7XHJcblx0XHR0aGlzLnRvdGFsV2lkdGggPSB0b3RhbERheXMgKiB0aGlzLmRheVdpZHRoO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzb3J0VGFza3ModGFza3M6IFRhc2tbXSk6IFRhc2tbXSB7XHJcblx0XHQvLyBLZWVwIGV4aXN0aW5nIHNvcnQgbG9naWMsIHVzaW5nIGRhdGVIZWxwZXJcclxuXHRcdHJldHVybiB0YXNrcy5zb3J0KChhLCBiKSA9PiB7XHJcblx0XHRcdGNvbnN0IHN0YXJ0QSA9IGEubWV0YWRhdGEuc3RhcnREYXRlIHx8IGEubWV0YWRhdGEuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0Y29uc3Qgc3RhcnRCID0gYi5tZXRhZGF0YS5zdGFydERhdGUgfHwgYi5tZXRhZGF0YS5zY2hlZHVsZWREYXRlO1xyXG5cdFx0XHRjb25zdCBkdWVBID0gYS5tZXRhZGF0YS5kdWVEYXRlO1xyXG5cdFx0XHRjb25zdCBkdWVCID0gYi5tZXRhZGF0YS5kdWVEYXRlO1xyXG5cclxuXHRcdFx0aWYgKHN0YXJ0QSAmJiBzdGFydEIpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRlQSA9IG5ldyBEYXRlKHN0YXJ0QSkuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdGNvbnN0IGRhdGVCID0gbmV3IERhdGUoc3RhcnRCKS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0aWYgKGRhdGVBICE9PSBkYXRlQikgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7XHJcblx0XHRcdH0gZWxzZSBpZiAoc3RhcnRBKSB7XHJcblx0XHRcdFx0cmV0dXJuIC0xO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHN0YXJ0Qikge1xyXG5cdFx0XHRcdHJldHVybiAxO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoZHVlQSAmJiBkdWVCKSB7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZUEgPSBuZXcgRGF0ZShkdWVBKS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0Y29uc3QgZGF0ZUIgPSBuZXcgRGF0ZShkdWVCKS5nZXRUaW1lKCk7XHJcblx0XHRcdFx0aWYgKGRhdGVBICE9PSBkYXRlQikgcmV0dXJuIGRhdGVBIC0gZGF0ZUI7XHJcblx0XHRcdH0gZWxzZSBpZiAoZHVlQSkge1xyXG5cdFx0XHRcdHJldHVybiAtMTtcclxuXHRcdFx0fSBlbHNlIGlmIChkdWVCKSB7XHJcblx0XHRcdFx0cmV0dXJuIDE7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBjb250ZW50IGNvbXBhcmlzb24gd2l0aCBudWxsL2VtcHR5IHZhbHVlc1xyXG5cdFx0XHRjb25zdCBjb250ZW50QSA9IGEuY29udGVudD8udHJpbSgpIHx8IG51bGw7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnRCID0gYi5jb250ZW50Py50cmltKCkgfHwgbnVsbDtcclxuXHJcblx0XHRcdGlmICghY29udGVudEEgJiYgIWNvbnRlbnRCKSByZXR1cm4gMDtcclxuXHRcdFx0aWYgKCFjb250ZW50QSkgcmV0dXJuIDE7IC8vIEEgaXMgZW1wdHksIGdvZXMgdG8gZW5kXHJcblx0XHRcdGlmICghY29udGVudEIpIHJldHVybiAtMTsgLy8gQiBpcyBlbXB0eSwgZ29lcyB0byBlbmRcclxuXHJcblx0XHRcdHJldHVybiBjb250ZW50QS5sb2NhbGVDb21wYXJlKGNvbnRlbnRCKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gRGVib3VuY2UgdXRpbGl0eSAoS2VlcClcclxuXHJcblx0Ly8gLS0tIFJlbmRlcmluZyBGdW5jdGlvbiAoT3JjaGVzdHJhdG9yKSAtLS1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXJJbnRlcm5hbCgpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0IXRoaXMuc3ZnRWwgfHxcclxuXHRcdFx0IXRoaXMuc3RhcnREYXRlIHx8XHJcblx0XHRcdCF0aGlzLmVuZERhdGUgfHxcclxuXHRcdFx0IXRoaXMuc2Nyb2xsQ29udGFpbmVyRWwgfHxcclxuXHRcdFx0IXRoaXMuZ3JpZEJhY2tncm91bmRDb21wb25lbnQgfHwgLy8gQ2hlY2sgaWYgY2hpbGRyZW4gYXJlIGxvYWRlZFxyXG5cdFx0XHQhdGhpcy50YXNrUmVuZGVyZXJDb21wb25lbnQgfHxcclxuXHRcdFx0IXRoaXMudGltZWxpbmVIZWFkZXJDb21wb25lbnQgfHxcclxuXHRcdFx0IXRoaXMubGVmdEluZGljYXRvckVsIHx8IC8vIENoZWNrIGluZGljYXRvciBjb250YWluZXJzIHRvb1xyXG5cdFx0XHQhdGhpcy5yaWdodEluZGljYXRvckVsXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiQ2Fubm90IHJlbmRlcjogQ29yZSBlbGVtZW50cywgY2hpbGQgY29tcG9uZW50cywgb3IgaW5kaWNhdG9yIGNvbnRhaW5lcnMgbm90IGluaXRpYWxpemVkLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHRcdGlmICghdGhpcy5jb250YWluZXJFbC5pc1Nob3duKCkpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQ2Fubm90IHJlbmRlcjogQ29udGFpbmVyIG5vdCB2aXNpYmxlLlwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlY2FsY3VsYXRlIGRpbWVuc2lvbnMgYW5kIHByZXBhcmUgZGF0YVxyXG5cdFx0dGhpcy5wcmVwYXJlVGFza3NGb3JSZW5kZXIoKTsgLy8gUmVjYWxjdWxhdGVzIHRvdGFsV2lkdGgvSGVpZ2h0LCBwcmVwYXJlZFRhc2tzXHJcblxyXG5cdFx0Ly8gVXBkYXRlIFNWRyBjb250YWluZXIgZGltZW5zaW9uc1xyXG5cdFx0dGhpcy5zdmdFbC5zZXRBdHRyaWJ1dGUoXCJ3aWR0aFwiLCBgJHt0aGlzLnRvdGFsV2lkdGh9YCk7XHJcblx0XHQvLyBVc2UgdGhlIGNhbGN1bGF0ZWQgdG90YWxIZWlnaHQgKHdoaWNoIG5vdyBoYXMgYSBtaW5pbXVtKVxyXG5cdFx0dGhpcy5zdmdFbC5zZXRBdHRyaWJ1dGUoXCJoZWlnaHRcIiwgYCR7dGhpcy50b3RhbEhlaWdodH1gKTtcclxuXHRcdHRoaXMuY29udGVudFdyYXBwZXJFbC5zdHlsZS53aWR0aCA9IGAke3RoaXMudG90YWxXaWR0aH1weGA7XHJcblx0XHR0aGlzLmNvbnRlbnRXcmFwcGVyRWwuc3R5bGUuaGVpZ2h0ID0gYCR7dGhpcy50b3RhbEhlaWdodH1weGA7XHJcblxyXG5cdFx0Ly8gQWRqdXN0IHNjcm9sbCBjb250YWluZXIgaGVpZ2h0IChjb25zaWRlciBmaWx0ZXIgYXJlYSBoZWlnaHQgaWYgZHluYW1pYylcclxuXHRcdGNvbnN0IGZpbHRlckhlaWdodCA9IHRoaXMuZmlsdGVyQ29udGFpbmVyRWwub2Zmc2V0SGVpZ2h0O1xyXG5cdFx0Ly8gRW5zdXJlIGNhbGN1bGF0aW9uIGlzIHJvYnVzdFxyXG5cdFx0dGhpcy5zY3JvbGxDb250YWluZXJFbC5zdHlsZS5oZWlnaHQgPSBgY2FsYygxMDAlIC0gJHtIRUFERVJfSEVJR0hUfXB4IC0gJHtmaWx0ZXJIZWlnaHR9cHgpYDtcclxuXHJcblx0XHQvLyAtLS0gVXBkYXRlIENoaWxkIENvbXBvbmVudHMgLS0tXHJcblxyXG5cdFx0Ly8gMS4gVXBkYXRlIEhlYWRlclxyXG5cdFx0dGhpcy51cGRhdGVIZWFkZXJDb21wb25lbnQoKTtcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgdmlzaWJsZSB0YXNrcyAqYmVmb3JlKiB1cGRhdGluZyBncmlkIGFuZCB0YXNrIHJlbmRlcmVyXHJcblx0XHRjb25zdCBzY3JvbGxMZWZ0ID0gdGhpcy5zY3JvbGxDb250YWluZXJFbC5zY3JvbGxMZWZ0O1xyXG5cclxuXHRcdGNvbnN0IHNjcm9sbFRvcCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwuc2Nyb2xsVG9wOyAvLyBHZXQgdmVydGljYWwgc2Nyb2xsIHBvc2l0aW9uXHJcblx0XHRjb25zdCBjb250YWluZXJXaWR0aCA9IHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwuY2xpZW50V2lkdGg7XHJcblx0XHRjb25zdCB2aXNpYmxlU3RhcnRYID0gc2Nyb2xsTGVmdDtcclxuXHRcdGNvbnN0IHZpc2libGVFbmRYID0gc2Nyb2xsTGVmdCArIGNvbnRhaW5lcldpZHRoO1xyXG5cclxuXHRcdC8vIC0tLSBVcGRhdGUgT2Zmc2NyZWVuIEluZGljYXRvcnMgLS0tXHJcblx0XHQvLyBDbGVhciBleGlzdGluZyBpbmRpY2F0b3JzXHJcblx0XHR0aGlzLmxlZnRJbmRpY2F0b3JFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5yaWdodEluZGljYXRvckVsLmVtcHR5KCk7XHJcblxyXG5cdFx0Y29uc3QgdmlzaWJsZVRhc2tzOiBQbGFjZWRHYW50dFRhc2tJdGVtW10gPSBbXTtcclxuXHRcdGNvbnN0IHJlbmRlckJ1ZmZlciA9IDMwMDsgLy8gS2VlcCBhIHJlbmRlciBidWZmZXIgZm9yIHNtb290aCBzY3JvbGxpbmdcclxuXHRcdGNvbnN0IGluZGljYXRvcllPZmZzZXQgPSBJTkRJQ0FUT1JfSEVJR0hUIC8gMjtcclxuXHJcblx0XHRmb3IgKGNvbnN0IHB0IG9mIHRoaXMucHJlcGFyZWRUYXNrcykge1xyXG5cdFx0XHRjb25zdCB0YXNrU3RhcnRYID0gcHQuc3RhcnRYO1xyXG5cdFx0XHRjb25zdCB0YXNrRW5kWCA9IHB0LmlzTWlsZXN0b25lXHJcblx0XHRcdFx0PyBwdC5zdGFydFhcclxuXHRcdFx0XHQ6IHB0LnN0YXJ0WCArIChwdC53aWR0aCA/PyAwKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIHZpc2liaWxpdHkgZm9yIHRhc2sgcmVuZGVyaW5nXHJcblx0XHRcdGNvbnN0IGlzVmlzaWJsZSA9XHJcblx0XHRcdFx0dGFza0VuZFggPiB2aXNpYmxlU3RhcnRYIC0gcmVuZGVyQnVmZmVyICYmXHJcblx0XHRcdFx0dGFza1N0YXJ0WCA8IHZpc2libGVFbmRYICsgcmVuZGVyQnVmZmVyO1xyXG5cclxuXHRcdFx0aWYgKGlzVmlzaWJsZSkge1xyXG5cdFx0XHRcdHZpc2libGVUYXNrcy5wdXNoKHB0KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgZm9yIG9mZnNjcmVlbiBpbmRpY2F0b3JzICh1c2Ugc21hbGxlciBidWZmZXIgb3Igbm9uZSlcclxuXHRcdFx0Y29uc3QgaW5kaWNhdG9yQnVmZmVyID0gNTsgLy8gU21hbGwgYnVmZmVyIHRvIHByZXZlbnQgZmxpY2tlclxyXG5cdFx0XHQvLyBDYWxjdWxhdGUgdG9wIHBvc2l0aW9uIHJlbGF0aXZlIHRvIHRoZSBzY3JvbGwgY29udGFpbmVyJ3Mgdmlld3BvcnRcclxuXHRcdFx0Y29uc3QgaW5kaWNhdG9yVG9wID0gcHQueSAtIHNjcm9sbFRvcCAtIGluZGljYXRvcllPZmZzZXQ7XHJcblxyXG5cdFx0XHRpZiAodGFza0VuZFggPCB2aXNpYmxlU3RhcnRYIC0gaW5kaWNhdG9yQnVmZmVyKSB7XHJcblx0XHRcdFx0Ly8gVGFzayBpcyBvZmZzY3JlZW4gdG8gdGhlIGxlZnRcclxuXHRcdFx0XHR0aGlzLmxlZnRJbmRpY2F0b3JFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcImdhbnR0LXNpbmdsZS1pbmRpY2F0b3JcIixcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0c3R5bGU6IGB0b3A6ICR7aW5kaWNhdG9yVG9wICsgNDV9cHg7YCwgLy8gVXNlIGNhbGN1bGF0ZWQgcmVsYXRpdmUgdG9wXHJcblx0XHRcdFx0XHRcdHRpdGxlOiBwdC50YXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdFwiZGF0YS10YXNrLWlkXCI6IHB0LnRhc2suaWQsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRhc2tTdGFydFggPiB2aXNpYmxlRW5kWCArIGluZGljYXRvckJ1ZmZlcikge1xyXG5cdFx0XHRcdC8vIFRhc2sgaXMgb2Zmc2NyZWVuIHRvIHRoZSByaWdodFxyXG5cdFx0XHRcdHRoaXMucmlnaHRJbmRpY2F0b3JFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0Y2xzOiBcImdhbnR0LXNpbmdsZS1pbmRpY2F0b3JcIixcclxuXHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0c3R5bGU6IGB0b3A6ICR7aW5kaWNhdG9yVG9wICsgNDV9cHg7YCwgLy8gVXNlIGNhbGN1bGF0ZWQgcmVsYXRpdmUgdG9wXHJcblx0XHRcdFx0XHRcdHRpdGxlOiBwdC50YXNrLmNvbnRlbnQsXHJcblx0XHRcdFx0XHRcdFwiZGF0YS10YXNrLWlkXCI6IHB0LnRhc2suaWQsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMubGVmdEluZGljYXRvckVsLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRjb25zdCB0YXNrSWQgPSB0YXJnZXQuZ2V0QXR0cmlidXRlKFwiZGF0YS10YXNrLWlkXCIpO1xyXG5cdFx0XHRpZiAodGFza0lkKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IHRoaXMudGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gdGFza0lkKTtcclxuXHRcdFx0XHRpZiAodGFzaykge1xyXG5cdFx0XHRcdFx0dGhpcy5zY3JvbGxUb0RhdGUoXHJcblx0XHRcdFx0XHRcdG5ldyBEYXRlKFxyXG5cdFx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEuZHVlRGF0ZSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGUgfHxcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSFcclxuXHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLnJpZ2h0SW5kaWNhdG9yRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGNvbnN0IHRhc2tJZCA9IHRhcmdldC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2staWRcIik7XHJcblx0XHRcdGlmICh0YXNrSWQpIHtcclxuXHRcdFx0XHRjb25zdCB0YXNrID0gdGhpcy50YXNrcy5maW5kKCh0KSA9PiB0LmlkID09PSB0YXNrSWQpO1xyXG5cdFx0XHRcdGlmICh0YXNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLnNjcm9sbFRvRGF0ZShcclxuXHRcdFx0XHRcdFx0bmV3IERhdGUoXHJcblx0XHRcdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGUgfHxcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEuZHVlRGF0ZSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlIVxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gMi4gVXBkYXRlIEdyaWQgQmFja2dyb3VuZCAoTm93IHVzaW5nIHZpc2libGVUYXNrcylcclxuXHRcdHRoaXMuZ3JpZEJhY2tncm91bmRDb21wb25lbnQudXBkYXRlUGFyYW1zKHtcclxuXHRcdFx0c3RhcnREYXRlOiB0aGlzLnN0YXJ0RGF0ZSxcclxuXHRcdFx0ZW5kRGF0ZTogdGhpcy5lbmREYXRlLFxyXG5cdFx0XHR2aXNpYmxlU3RhcnREYXRlOiB0aGlzLnZpc2libGVTdGFydERhdGUhLFxyXG5cdFx0XHR2aXNpYmxlRW5kRGF0ZTogdGhpcy52aXNpYmxlRW5kRGF0ZSEsXHJcblx0XHRcdHRvdGFsV2lkdGg6IHRoaXMudG90YWxXaWR0aCxcclxuXHRcdFx0dG90YWxIZWlnaHQ6IHRoaXMudG90YWxIZWlnaHQsXHJcblx0XHRcdHZpc2libGVUYXNrczogdmlzaWJsZVRhc2tzLCAvLyBQYXNzIGZpbHRlcmVkIGxpc3RcclxuXHRcdFx0dGltZXNjYWxlOiB0aGlzLnRpbWVzY2FsZSxcclxuXHRcdFx0ZGF5V2lkdGg6IHRoaXMuZGF5V2lkdGgsXHJcblx0XHRcdHJvd0hlaWdodDogUk9XX0hFSUdIVCxcclxuXHRcdFx0ZGF0ZUhlbHBlcjogdGhpcy5kYXRlSGVscGVyLFxyXG5cdFx0XHRzaG91bGREcmF3TWFqb3JUaWNrOiB0aGlzLnNob3VsZERyYXdNYWpvclRpY2suYmluZCh0aGlzKSxcclxuXHRcdFx0c2hvdWxkRHJhd01pbm9yVGljazogdGhpcy5zaG91bGREcmF3TWlub3JUaWNrLmJpbmQodGhpcyksXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyAzLiBVcGRhdGUgVGFza3MgLSBQYXNzIG9ubHkgdmlzaWJsZSB0YXNrc1xyXG5cdFx0dGhpcy50YXNrUmVuZGVyZXJDb21wb25lbnQudXBkYXRlUGFyYW1zKHtcclxuXHRcdFx0YXBwOiB0aGlzLmFwcCxcclxuXHRcdFx0dGFza0dyb3VwRWw6IHRoaXMudGFza0dyb3VwRWwhLCAvLyBBc3NlcnQgbm9uLW51bGwgYXMgY2hlY2tlZCBhYm92ZVxyXG5cdFx0XHRwcmVwYXJlZFRhc2tzOiB2aXNpYmxlVGFza3MsIC8vIFBhc3MgZmlsdGVyZWQgbGlzdFxyXG5cdFx0XHRyb3dIZWlnaHQ6IFJPV19IRUlHSFQsXHJcblx0XHRcdC8vIFBhc3MgcmVsZXZhbnQgY29uZmlnXHJcblx0XHRcdHNob3dUYXNrTGFiZWxzOiB0aGlzLmNvbmZpZy5zaG93VGFza0xhYmVscyxcclxuXHRcdFx0dXNlTWFya2Rvd25SZW5kZXJlcjogdGhpcy5jb25maWcudXNlTWFya2Rvd25SZW5kZXJlcixcclxuXHRcdFx0aGFuZGxlVGFza0NsaWNrOiB0aGlzLmhhbmRsZVRhc2tDbGljay5iaW5kKHRoaXMpLFxyXG5cdFx0XHRoYW5kbGVUYXNrQ29udGV4dE1lbnU6IHRoaXMuaGFuZGxlVGFza0NvbnRleHRNZW51LmJpbmQodGhpcyksXHJcblx0XHRcdHBhcmVudENvbXBvbmVudDogdGhpcywgLy8gUGFzcyBzZWxmIGFzIHBhcmVudCBjb250ZXh0IGZvciBNYXJrZG93blJlbmRlcmVyXHJcblx0XHRcdC8vIFBhc3Mgb3RoZXIgcGFyYW1zIGxpa2UgbWlsZXN0b25lU2l6ZSwgYmFySGVpZ2h0UmF0aW8gaWYgbmVlZGVkXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIFNlcGFyYXRlIG1ldGhvZCB0byB1cGRhdGUgaGVhZGVyLCBjYW4gYmUgZGVib3VuY2VkIGZvciBzY3JvbGxcclxuXHRwcml2YXRlIHVwZGF0ZUhlYWRlckNvbXBvbmVudCgpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0IXRoaXMudGltZWxpbmVIZWFkZXJDb21wb25lbnQgfHxcclxuXHRcdFx0IXRoaXMudmlzaWJsZVN0YXJ0RGF0ZSB8fFxyXG5cdFx0XHQhdGhpcy5zdGFydERhdGUgfHxcclxuXHRcdFx0IXRoaXMuZW5kRGF0ZVxyXG5cdFx0KVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Ly8gRW5zdXJlIHZpc2libGVFbmREYXRlIGlzIGNhbGN1bGF0ZWQgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxyXG5cdFx0dGhpcy52aXNpYmxlRW5kRGF0ZSA9IHRoaXMuY2FsY3VsYXRlVmlzaWJsZUVuZERhdGUoKTtcclxuXHJcblx0XHR0aGlzLnRpbWVsaW5lSGVhZGVyQ29tcG9uZW50LnVwZGF0ZVBhcmFtcyh7XHJcblx0XHRcdHN0YXJ0RGF0ZTogdGhpcy5zdGFydERhdGUsXHJcblx0XHRcdGVuZERhdGU6IHRoaXMuZW5kRGF0ZSxcclxuXHRcdFx0dmlzaWJsZVN0YXJ0RGF0ZTogdGhpcy52aXNpYmxlU3RhcnREYXRlLFxyXG5cdFx0XHR2aXNpYmxlRW5kRGF0ZTogdGhpcy52aXNpYmxlRW5kRGF0ZSxcclxuXHRcdFx0dG90YWxXaWR0aDogdGhpcy50b3RhbFdpZHRoLFxyXG5cdFx0XHR0aW1lc2NhbGU6IHRoaXMudGltZXNjYWxlLFxyXG5cdFx0XHRkYXlXaWR0aDogdGhpcy5kYXlXaWR0aCxcclxuXHRcdFx0c2Nyb2xsTGVmdDogdGhpcy5zY3JvbGxDb250YWluZXJFbC5zY3JvbGxMZWZ0LFxyXG5cdFx0XHRoZWFkZXJIZWlnaHQ6IEhFQURFUl9IRUlHSFQsXHJcblx0XHRcdGRhdGVIZWxwZXI6IHRoaXMuZGF0ZUhlbHBlcixcclxuXHRcdFx0c2hvdWxkRHJhd01ham9yVGljazogdGhpcy5zaG91bGREcmF3TWFqb3JUaWNrLmJpbmQodGhpcyksXHJcblx0XHRcdHNob3VsZERyYXdNaW5vclRpY2s6IHRoaXMuc2hvdWxkRHJhd01pbm9yVGljay5iaW5kKHRoaXMpLFxyXG5cdFx0XHRmb3JtYXRNYWpvclRpY2s6IHRoaXMuZm9ybWF0TWFqb3JUaWNrLmJpbmQodGhpcyksXHJcblx0XHRcdGZvcm1hdE1pbm9yVGljazogdGhpcy5mb3JtYXRNaW5vclRpY2suYmluZCh0aGlzKSxcclxuXHRcdFx0Zm9ybWF0RGF5VGljazogdGhpcy5mb3JtYXREYXlUaWNrLmJpbmQodGhpcyksXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBIZWFkZXIgVGljayBMb2dpYyAoS2VwdCBpbiBwYXJlbnQgYXMgaXQgZGVwZW5kcyBvbiB0aW1lc2NhbGUgc3RhdGUpIC0tLVxyXG5cdC8vIFRoZXNlIG1ldGhvZHMgYXJlIG5vdyBwYXNzZWQgdG8gY2hpbGRyZW4gdGhhdCBuZWVkIHRoZW0uXHJcblx0cHJpdmF0ZSBzaG91bGREcmF3TWFqb3JUaWNrKGRhdGU6IERhdGUpOiBib29sZWFuIHtcclxuXHRcdHN3aXRjaCAodGhpcy50aW1lc2NhbGUpIHtcclxuXHRcdFx0Y2FzZSBcIlllYXJcIjpcclxuXHRcdFx0XHRyZXR1cm4gZGF0ZS5nZXRNb250aCgpID09PSAwICYmIGRhdGUuZ2V0RGF0ZSgpID09PSAxO1xyXG5cdFx0XHRjYXNlIFwiTW9udGhcIjpcclxuXHRcdFx0XHRyZXR1cm4gZGF0ZS5nZXREYXRlKCkgPT09IDE7XHJcblx0XHRcdGNhc2UgXCJXZWVrXCI6XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0RGF0ZSgpID09PSAxO1xyXG5cdFx0XHRjYXNlIFwiRGF5XCI6XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0RGF5KCkgPT09IDE7IC8vIE1vbmRheVxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvdWxkRHJhd01pbm9yVGljayhkYXRlOiBEYXRlKTogYm9vbGVhbiB7XHJcblx0XHRzd2l0Y2ggKHRoaXMudGltZXNjYWxlKSB7XHJcblx0XHRcdGNhc2UgXCJZZWFyXCI6XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0RGF0ZSgpID09PSAxOyAvLyBNb250aCBzdGFydFxyXG5cdFx0XHRjYXNlIFwiTW9udGhcIjpcclxuXHRcdFx0XHRyZXR1cm4gZGF0ZS5nZXREYXkoKSA9PT0gMTsgLy8gV2VlayBzdGFydCAoTW9uZGF5KVxyXG5cdFx0XHRjYXNlIFwiV2Vla1wiOlxyXG5cdFx0XHRcdHJldHVybiB0cnVlOyAvLyBFdmVyeSBkYXlcclxuXHRcdFx0Y2FzZSBcIkRheVwiOlxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gRGF5cyBoYW5kbGVkIGJ5IGRheSB0aWNrc1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9ybWF0TWFqb3JUaWNrKGRhdGU6IERhdGUpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgbW9udGhOYW1lcyA9IFtcclxuXHRcdFx0XCJKYW5cIixcclxuXHRcdFx0XCJGZWJcIixcclxuXHRcdFx0XCJNYXJcIixcclxuXHRcdFx0XCJBcHJcIixcclxuXHRcdFx0XCJNYXlcIixcclxuXHRcdFx0XCJKdW5cIixcclxuXHRcdFx0XCJKdWxcIixcclxuXHRcdFx0XCJBdWdcIixcclxuXHRcdFx0XCJTZXBcIixcclxuXHRcdFx0XCJPY3RcIixcclxuXHRcdFx0XCJOb3ZcIixcclxuXHRcdFx0XCJEZWNcIixcclxuXHRcdF07XHJcblx0XHRzd2l0Y2ggKHRoaXMudGltZXNjYWxlKSB7XHJcblx0XHRcdGNhc2UgXCJZZWFyXCI6XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0RnVsbFllYXIoKS50b1N0cmluZygpO1xyXG5cdFx0XHRjYXNlIFwiTW9udGhcIjpcclxuXHRcdFx0XHRyZXR1cm4gYCR7bW9udGhOYW1lc1tkYXRlLmdldE1vbnRoKCldfSAke2RhdGUuZ2V0RnVsbFllYXIoKX1gO1xyXG5cdFx0XHRjYXNlIFwiV2Vla1wiOlxyXG5cdFx0XHRcdC8vIFNob3cgbW9udGggb25seSBpZiB0aGUgd2VlayBzdGFydHMgaW4gdGhhdCBtb250aCAoZmlyc3QgZGF5IG9mIG1vbnRoKVxyXG5cdFx0XHRcdHJldHVybiBkYXRlLmdldERhdGUoKSA9PT0gMVxyXG5cdFx0XHRcdFx0PyBgJHttb250aE5hbWVzW2RhdGUuZ2V0TW9udGgoKV19ICR7ZGF0ZS5nZXRGdWxsWWVhcigpfWBcclxuXHRcdFx0XHRcdDogXCJcIjtcclxuXHRcdFx0Y2FzZSBcIkRheVwiOlxyXG5cdFx0XHRcdHJldHVybiBgVyR7dGhpcy5kYXRlSGVscGVyLmdldFdlZWtOdW1iZXIoZGF0ZSl9YDsgLy8gV2VlayBudW1iZXJcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRyZXR1cm4gXCJcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9ybWF0TWlub3JUaWNrKGRhdGU6IERhdGUpOiBzdHJpbmcge1xyXG5cdFx0c3dpdGNoICh0aGlzLnRpbWVzY2FsZSkge1xyXG5cdFx0XHRjYXNlIFwiWWVhclwiOlxyXG5cdFx0XHRcdC8vIFNob3cgbW9udGggYWJicmV2aWF0aW9uIGZvciBtaW5vciB0aWNrcyAoc3RhcnQgb2YgbW9udGgpXHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZm9ybWF0TWFqb3JUaWNrKGRhdGUpLnN1YnN0cmluZygwLCAzKTtcclxuXHRcdFx0Y2FzZSBcIk1vbnRoXCI6XHJcblx0XHRcdFx0Ly8gU2hvdyB3ZWVrIG51bWJlciBmb3IgbWlub3IgdGlja3MgKHN0YXJ0IG9mIHdlZWspXHJcblx0XHRcdFx0cmV0dXJuIGBXJHt0aGlzLmRhdGVIZWxwZXIuZ2V0V2Vla051bWJlcihkYXRlKX1gO1xyXG5cdFx0XHRjYXNlIFwiV2Vla1wiOlxyXG5cdFx0XHRcdHJldHVybiBkYXRlLmdldERhdGUoKS50b1N0cmluZygpOyAvLyBEYXkgb2YgbW9udGhcclxuXHRcdFx0Y2FzZSBcIkRheVwiOlxyXG5cdFx0XHRcdHJldHVybiBcIlwiOyAvLyBOb3QgdXNlZFxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHJldHVybiBcIlwiO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRwcml2YXRlIGZvcm1hdERheVRpY2soZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcblx0XHRjb25zdCBkYXlOYW1lcyA9IFtcIlNcIiwgXCJNXCIsIFwiVFwiLCBcIldcIiwgXCJUXCIsIFwiRlwiLCBcIlNcIl07IC8vIFNpbmdsZSBsZXR0ZXJzXHJcblx0XHRpZiAodGhpcy50aW1lc2NhbGUgPT09IFwiRGF5XCIpIHtcclxuXHRcdFx0cmV0dXJuIGRheU5hbWVzW2RhdGUuZ2V0RGF5KCldO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIFwiXCI7IC8vIE9ubHkgc2hvdyBmb3IgRGF5IHRpbWVzY2FsZVxyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEV2ZW50IEhhbmRsZXJzIChVcGRhdGUgdG8gY29vcmRpbmF0ZSBjaGlsZHJlbikgLS0tXHJcblxyXG5cdHByaXZhdGUgaGFuZGxlU2Nyb2xsID0gKGV2ZW50OiBFdmVudCkgPT4ge1xyXG5cdFx0aWYgKHRoaXMuaXNab29taW5nIHx8ICF0aGlzLnN0YXJ0RGF0ZSkgcmV0dXJuOyAvLyBQcmV2ZW50IGNvbmZsaWN0LCBlbnN1cmUgaW5pdGlhbGl6ZWRcclxuXHJcblx0XHRjb25zdCB0YXJnZXQgPSBldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRjb25zdCBzY3JvbGxMZWZ0ID0gdGFyZ2V0LnNjcm9sbExlZnQ7XHJcblx0XHQvLyBjb25zdCBzY3JvbGxUb3AgPSB0YXJnZXQuc2Nyb2xsVG9wOyAvLyBGb3IgdmVydGljYWwgdmlydHVhbGl6YXRpb24gbGF0ZXJcclxuXHJcblx0XHQvLyBVcGRhdGUgdmlzaWJsZSBzdGFydCBkYXRlIGJhc2VkIG9uIHNjcm9sbFxyXG5cdFx0Y29uc3QgZGF5c1Njcm9sbGVkID0gc2Nyb2xsTGVmdCAvIE1hdGgubWF4KDEsIHRoaXMuZGF5V2lkdGgpO1xyXG5cdFx0dGhpcy52aXNpYmxlU3RhcnREYXRlID0gdGhpcy5kYXRlSGVscGVyLmFkZERheXMoXHJcblx0XHRcdHRoaXMuc3RhcnREYXRlISxcclxuXHRcdFx0ZGF5c1Njcm9sbGVkXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFJlLXJlbmRlciBvbmx5IHRoZSBoZWFkZXIgZWZmaWNpZW50bHkgdmlhIGRlYm91bmNlZCBjYWxsXHJcblx0XHR0aGlzLmRlYm91bmNlZEhlYWRlclVwZGF0ZSgpO1xyXG5cdFx0dGhpcy5kZWJvdW5jZWRSZW5kZXIoKTsgLy8gQ2hhbmdlZCBmcm9tIGRlYm91bmNlZEhlYWRlclVwZGF0ZVxyXG5cdH07XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlV2hlZWwgPSAoZXZlbnQ6IFdoZWVsRXZlbnQpID0+IHtcclxuXHRcdGlmICghZXZlbnQuY3RybEtleSB8fCAhdGhpcy5zdGFydERhdGUgfHwgIXRoaXMuZW5kRGF0ZSkgcmV0dXJuOyAvLyBPbmx5IHpvb20gd2l0aCBDdHJsLCBlbnN1cmUgaW5pdGlhbGl6ZWRcclxuXHJcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0dGhpcy5pc1pvb21pbmcgPSB0cnVlOyAvLyBTZXQgem9vbSBmbGFnXHJcblxyXG5cdFx0Y29uc3QgZGVsdGEgPSBldmVudC5kZWx0YVkgPiAwID8gMC44IDogMS4yNTtcclxuXHRcdGNvbnN0IG5ld0RheVdpZHRoID0gTWF0aC5tYXgoXHJcblx0XHRcdE1JTl9EQVlfV0lEVEgsXHJcblx0XHRcdE1hdGgubWluKE1BWF9EQVlfV0lEVEgsIHRoaXMuZGF5V2lkdGggKiBkZWx0YSlcclxuXHRcdCk7XHJcblxyXG5cdFx0aWYgKG5ld0RheVdpZHRoID09PSB0aGlzLmRheVdpZHRoKSB7XHJcblx0XHRcdHRoaXMuaXNab29taW5nID0gZmFsc2U7XHJcblx0XHRcdHJldHVybjsgLy8gTm8gY2hhbmdlXHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3Qgc2Nyb2xsQ29udGFpbmVyUmVjdCA9XHJcblx0XHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRjb25zdCBjdXJzb3JYID0gZXZlbnQuY2xpZW50WCAtIHNjcm9sbENvbnRhaW5lclJlY3QubGVmdDtcclxuXHRcdGNvbnN0IHNjcm9sbExlZnRCZWZvcmVab29tID0gdGhpcy5zY3JvbGxDb250YWluZXJFbC5zY3JvbGxMZWZ0O1xyXG5cclxuXHRcdC8vIERhdGUgdW5kZXIgdGhlIGN1cnNvciBiZWZvcmUgem9vbVxyXG5cdFx0Y29uc3QgdGltZUF0Q3Vyc29yID0gdGhpcy5kYXRlSGVscGVyLnhUb0RhdGUoXHJcblx0XHRcdHNjcm9sbExlZnRCZWZvcmVab29tICsgY3Vyc29yWCxcclxuXHRcdFx0dGhpcy5zdGFydERhdGUhLFxyXG5cdFx0XHR0aGlzLmRheVdpZHRoXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBkYXkgd2lkdGggKmJlZm9yZSogY2FsY3VsYXRpbmcgbmV3IHNjcm9sbCBwb3NpdGlvblxyXG5cdFx0dGhpcy5kYXlXaWR0aCA9IG5ld0RheVdpZHRoO1xyXG5cclxuXHRcdC8vIFJlY2FsY3VsYXRlIHRvdGFsIHdpZHRoIGJhc2VkIG9uIG5ldyBkYXlXaWR0aCAod2lsbCBiZSBkb25lIGluIHByZXBhcmVUYXNrc0ZvclJlbmRlcilcclxuXHJcblx0XHQvLyBDYWxjdWxhdGUgd2hlcmUgdGhlIHRpbWVBdEN1cnNvciAqc2hvdWxkKiBiZSB3aXRoIHRoZSBuZXcgZGF5V2lkdGhcclxuXHRcdGxldCBuZXdTY3JvbGxMZWZ0ID0gMDtcclxuXHRcdGlmICh0aW1lQXRDdXJzb3IpIHtcclxuXHRcdFx0Y29uc3QgeEF0Q3Vyc29yTmV3ID0gdGhpcy5kYXRlSGVscGVyLmRhdGVUb1goXHJcblx0XHRcdFx0dGltZUF0Q3Vyc29yLFxyXG5cdFx0XHRcdHRoaXMuc3RhcnREYXRlISxcclxuXHRcdFx0XHR0aGlzLmRheVdpZHRoXHJcblx0XHRcdCk7XHJcblx0XHRcdG5ld1Njcm9sbExlZnQgPSB4QXRDdXJzb3JOZXcgLSBjdXJzb3JYO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aW1lc2NhbGUgYmFzZWQgb24gbmV3IHpvb20gbGV2ZWwgKHdpbGwgYmUgZG9uZSBpbiBwcmVwYXJlVGFza3NGb3JSZW5kZXIpXHJcblx0XHQvLyB0aGlzLmNhbGN1bGF0ZVRpbWVzY2FsZVBhcmFtcygpOyAvLyBDYWxsZWQgd2l0aGluIHByZXBhcmVUYXNrc0ZvclJlbmRlclxyXG5cclxuXHRcdC8vIFRyaWdnZXIgYSBmdWxsIHJlLXJlbmRlciBiZWNhdXNlIHpvb20gY2hhbmdlcyB0aW1lc2NhbGUsIGxheW91dCwgZXRjLlxyXG5cdFx0Ly8gUHJlcGFyZSB0YXNrcyBmaXJzdCB0byBnZXQgdGhlIG5ldyB0b3RhbFdpZHRoXHJcblx0XHR0aGlzLnByZXBhcmVUYXNrc0ZvclJlbmRlcigpO1xyXG5cdFx0Y29uc3QgY29udGFpbmVyV2lkdGggPSB0aGlzLnNjcm9sbENvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xyXG5cdFx0bmV3U2Nyb2xsTGVmdCA9IE1hdGgubWF4KFxyXG5cdFx0XHQwLFxyXG5cdFx0XHRNYXRoLm1pbihuZXdTY3JvbGxMZWZ0LCB0aGlzLnRvdGFsV2lkdGggLSBjb250YWluZXJXaWR0aClcclxuXHRcdCk7XHJcblx0XHR0aGlzLmRlYm91bmNlZFJlbmRlcigpOyAvLyBUaGlzIHdpbGwgdXBkYXRlIGFsbCBjaGlsZHJlblxyXG5cclxuXHRcdC8vIEFwcGx5IHRoZSBjYWxjdWxhdGVkIHNjcm9sbCBwb3NpdGlvbiAqYWZ0ZXIqIHRoZSByZW5kZXIgdXBkYXRlcyB0aGUgbGF5b3V0XHJcblx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xyXG5cdFx0XHQvLyBDaGVjayBpZiBjb21wb25lbnQgbWlnaHQgaGF2ZSBiZWVuIHVubG9hZGVkIGR1cmluZyBhc3luYyBvcGVyYXRpb25cclxuXHRcdFx0aWYgKCF0aGlzLnNjcm9sbENvbnRhaW5lckVsKSByZXR1cm47XHJcblxyXG5cdFx0XHR0aGlzLnNjcm9sbENvbnRhaW5lckVsLnNjcm9sbExlZnQgPSBuZXdTY3JvbGxMZWZ0O1xyXG5cdFx0XHQvLyBVcGRhdGUgdmlzaWJsZVN0YXJ0RGF0ZSBiYXNlZCBvbiB0aGUgZmluYWwgc2Nyb2xsIHBvc2l0aW9uXHJcblx0XHRcdGNvbnN0IGRheXNTY3JvbGxlZCA9IG5ld1Njcm9sbExlZnQgLyBNYXRoLm1heCgxLCB0aGlzLmRheVdpZHRoKTtcclxuXHRcdFx0dGhpcy52aXNpYmxlU3RhcnREYXRlID0gdGhpcy5kYXRlSGVscGVyLmFkZERheXMoXHJcblx0XHRcdFx0dGhpcy5zdGFydERhdGUhLFxyXG5cdFx0XHRcdGRheXNTY3JvbGxlZFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIGhlYWRlciBhZ2FpbiB0byBlbnN1cmUgaXQgcmVmbGVjdHMgdGhlIGZpbmFsIHNjcm9sbCBwb3NpdGlvblxyXG5cdFx0XHQvLyBUaGUgbWFpbiByZW5kZXIgYWxyZWFkeSB1cGRhdGVkIGl0LCBidXQgdGhpcyBlbnN1cmVzIGFjY3VyYWN5IGFmdGVyIHNjcm9sbCBhZGp1c3RtZW50XHJcblx0XHRcdHRoaXMudXBkYXRlSGVhZGVyQ29tcG9uZW50KCk7XHJcblxyXG5cdFx0XHR0aGlzLmlzWm9vbWluZyA9IGZhbHNlOyAvLyBSZXNldCB6b29tIGZsYWdcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlVGFza0NsaWNrKHRhc2s6IFRhc2spIHtcclxuXHRcdHRoaXMucGFyYW1zLm9uVGFza1NlbGVjdGVkPy4odGFzayk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZVRhc2tDb250ZXh0TWVudShldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykge1xyXG5cdFx0dGhpcy5wYXJhbXMub25UYXNrQ29udGV4dE1lbnU/LihldmVudCwgdGFzayk7XHJcblx0fVxyXG5cclxuXHQvLyBTY3JvbGwgc21vb3RobHkgdG8gYSBzcGVjaWZpYyBkYXRlIChLZWVwIGluIHBhcmVudClcclxuXHRwdWJsaWMgc2Nyb2xsVG9EYXRlKGRhdGU6IERhdGUpIHtcclxuXHRcdGlmICghdGhpcy5zdGFydERhdGUgfHwgIXRoaXMuc2Nyb2xsQ29udGFpbmVyRWwpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCB0YXJnZXRYID0gdGhpcy5kYXRlSGVscGVyLmRhdGVUb1goXHJcblx0XHRcdGRhdGUsXHJcblx0XHRcdHRoaXMuc3RhcnREYXRlLFxyXG5cdFx0XHR0aGlzLmRheVdpZHRoXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgY29udGFpbmVyV2lkdGggPSB0aGlzLnNjcm9sbENvbnRhaW5lckVsLmNsaWVudFdpZHRoO1xyXG5cdFx0bGV0IHRhcmdldFNjcm9sbExlZnQgPSB0YXJnZXRYIC0gY29udGFpbmVyV2lkdGggLyAyO1xyXG5cclxuXHRcdHRhcmdldFNjcm9sbExlZnQgPSBNYXRoLm1heChcclxuXHRcdFx0MCxcclxuXHRcdFx0TWF0aC5taW4odGFyZ2V0U2Nyb2xsTGVmdCwgdGhpcy50b3RhbFdpZHRoIC0gY29udGFpbmVyV2lkdGgpXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB2aXNpYmxlIGRhdGVzIGJhc2VkIG9uIHRoZSBzY3JvbGwgKnRhcmdldCpcclxuXHRcdGNvbnN0IGRheXNTY3JvbGxlZCA9IHRhcmdldFNjcm9sbExlZnQgLyBNYXRoLm1heCgxLCB0aGlzLmRheVdpZHRoKTtcclxuXHRcdHRoaXMudmlzaWJsZVN0YXJ0RGF0ZSA9IHRoaXMuZGF0ZUhlbHBlci5hZGREYXlzKFxyXG5cdFx0XHR0aGlzLnN0YXJ0RGF0ZSEsIC8vIFVzZSBub24tbnVsbCBhc3NlcnRpb24gYXMgc3RhcnREYXRlIHNob3VsZCBleGlzdFxyXG5cdFx0XHRkYXlzU2Nyb2xsZWRcclxuXHRcdCk7XHJcblx0XHR0aGlzLnZpc2libGVFbmREYXRlID0gdGhpcy5jYWxjdWxhdGVWaXNpYmxlRW5kRGF0ZSgpOyAvLyBSZWNhbGN1bGF0ZSBiYXNlZCBvbiBuZXcgc3RhcnRcclxuXHJcblx0XHQvLyBVcGRhdGUgaGVhZGVyIGFuZCB0cmlnZ2VyIGZ1bGwgcmVuZGVyIGltbWVkaWF0ZWx5IGZvciBwcm9ncmFtbWF0aWMgc2Nyb2xsXHJcblx0XHQvLyBVc2UgYmVoYXZpb3I6ICdhdXRvJyBmb3IgaW5zdGFudCBzY3JvbGwgdG8gYXZvaWQgaXNzdWVzIHdpdGggc21vb3RoIHNjcm9sbCB0aW1pbmdcclxuXHRcdHRoaXMuc2Nyb2xsQ29udGFpbmVyRWwuc2Nyb2xsVG8oe1xyXG5cdFx0XHRsZWZ0OiB0YXJnZXRTY3JvbGxMZWZ0LFxyXG5cdFx0XHRiZWhhdmlvcjogXCJhdXRvXCIsIC8vIENoYW5nZWQgZnJvbSAnc21vb3RoJ1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnVwZGF0ZUhlYWRlckNvbXBvbmVudCgpOyAvLyBVcGRhdGUgaGVhZGVyIHJpZ2h0IGF3YXlcclxuXHRcdHRoaXMuZGVib3VuY2VkUmVuZGVyKCk7IC8vIFRyaWdnZXIgZnVsbCByZW5kZXIgaW5jbHVkaW5nIHRhc2tzXHJcblx0XHQvLyB0aGlzLmRlYm91bmNlZEhlYWRlclVwZGF0ZSgpOyAvLyBPbGQgY2FsbCAtIG9ubHkgdXBkYXRlZCBoZWFkZXJcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBQdWJsaWMgQVBJIC0tLVxyXG5cdHB1YmxpYyByZWZyZXNoKCkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJHYW50dENvbXBvbmVudCByZWZyZXNoIHRyaWdnZXJlZC5cIik7XHJcblx0XHQvLyBGb3JjZSByZWNhbGN1bGF0aW9uIG9mIGRhdGUgcmFuZ2UgYW5kIHJlLXJlbmRlclxyXG5cdFx0dGhpcy5jYWxjdWxhdGVEYXRlUmFuZ2UodHJ1ZSk7XHJcblx0XHR0aGlzLnByZXBhcmVUYXNrc0ZvclJlbmRlcigpOyAvLyBQcmVwYXJlIHRhc2tzIHdpdGggbmV3IGRhdGUgcmFuZ2VcclxuXHJcblx0XHQvLyBVcGRhdGUgZmlsdGVyIG9wdGlvbnMgYmFzZWQgb24gdGhlIHJlZnJlc2hlZCBwcmVwYXJlZCB0YXNrc1xyXG5cdFx0aWYgKHRoaXMuZmlsdGVyQ29tcG9uZW50KSB7XHJcblx0XHRcdGNvbnN0IHRhc2tzRm9yRmlsdGVyaW5nID0gdGhpcy5wcmVwYXJlZFRhc2tzLm1hcCgocHQpID0+IHB0LnRhc2spO1xyXG5cdFx0XHR0aGlzLmZpbHRlckNvbXBvbmVudC51cGRhdGVGaWx0ZXJPcHRpb25zKHRhc2tzRm9yRmlsdGVyaW5nKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmRlYm91bmNlZFJlbmRlcigpOyAvLyBUcmlnZ2VyIGZ1bGwgcmVuZGVyXHJcblx0fVxyXG5cclxuXHQvLyAtLS0gRmlsdGVyaW5nIExvZ2ljIC0tLVxyXG5cdHByaXZhdGUgYXBwbHlGaWx0ZXJzQW5kUmVuZGVyKGFjdGl2ZUZpbHRlcnM6IEFjdGl2ZUZpbHRlcltdKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcIkFwcGx5aW5nIGZpbHRlcnM6IFwiLCBhY3RpdmVGaWx0ZXJzKTtcclxuXHRcdGlmIChhY3RpdmVGaWx0ZXJzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLnRhc2tzID0gWy4uLnRoaXMuYWxsVGFza3NdOyAvLyBTaG93IGFsbCB0YXNrcyBpZiBubyBmaWx0ZXJzXHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnRhc2tzID0gdGhpcy5hbGxUYXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0XHRyZXR1cm4gYWN0aXZlRmlsdGVycy5ldmVyeSgoZmlsdGVyKSA9PiB7XHJcblx0XHRcdFx0XHRzd2l0Y2ggKGZpbHRlci5jYXRlZ29yeSkge1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRhc2suc3RhdHVzID09PSBmaWx0ZXIudmFsdWU7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJ0YWdcIjpcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS50YWdzLnNvbWUoXHJcblx0XHRcdFx0XHRcdFx0XHQodGFnKSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0eXBlb2YgdGFnID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdHRhZyA9PT0gZmlsdGVyLnZhbHVlXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YS5wcm9qZWN0ID09PSBmaWx0ZXIudmFsdWU7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJjb250ZXh0XCI6XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRhc2subWV0YWRhdGEuY29udGV4dCA9PT0gZmlsdGVyLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRcdFx0XHQvLyBDb252ZXJ0IHRoZSBzZWxlY3RlZCBmaWx0ZXIgdmFsdWUgKGljb24vdGV4dCkgYmFjayB0byBpdHMgbnVtZXJpY2FsIHJlcHJlc2VudGF0aW9uXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgZXhwZWN0ZWRQcmlvcml0eU51bWJlciA9XHJcblx0XHRcdFx0XHRcdFx0XHRQUklPUklUWV9NQVBbZmlsdGVyLnZhbHVlXTtcclxuXHRcdFx0XHRcdFx0XHQvLyBDb21wYXJlIHRoZSB0YXNrJ3MgbnVtZXJpY2FsIHByaW9yaXR5XHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdFx0XHRcdHRhc2subWV0YWRhdGEucHJpb3JpdHkgPT09XHJcblx0XHRcdFx0XHRcdFx0XHRleHBlY3RlZFByaW9yaXR5TnVtYmVyXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y2FzZSBcImNvbXBsZXRlZFwiOlxyXG5cdFx0XHRcdFx0XHRcdHJldHVybiAoXHJcblx0XHRcdFx0XHRcdFx0XHQoZmlsdGVyLnZhbHVlID09PSBcIlllc1wiICYmIHRhc2suY29tcGxldGVkKSB8fFxyXG5cdFx0XHRcdFx0XHRcdFx0KGZpbHRlci52YWx1ZSA9PT0gXCJOb1wiICYmICF0YXNrLmNvbXBsZXRlZClcclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0XHRjYXNlIFwiZmlsZVBhdGhcIjpcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGFzay5maWxlUGF0aCA9PT0gZmlsdGVyLnZhbHVlO1xyXG5cdFx0XHRcdFx0XHQvLyBBZGQgY2FzZXMgZm9yIG90aGVyIGZpbHRlciB0eXBlcyAoZGF0ZSByYW5nZXMgZXRjLikgaWYgbmVlZGVkXHJcblx0XHRcdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0YFVua25vd24gZmlsdGVyIGNhdGVnb3J5OiAke2ZpbHRlci5jYXRlZ29yeX1gXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTsgLy8gRG9uJ3QgZmlsdGVyIGlmIGNhdGVnb3J5IGlzIHVua25vd25cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJGaWx0ZXJlZCB0YXNrcyBjb3VudDpcIiwgdGhpcy50YXNrcy5sZW5ndGgpO1xyXG5cclxuXHRcdC8vIFJlY2FsY3VsYXRlIGRhdGUgcmFuZ2UgYmFzZWQgb24gZmlsdGVyZWQgdGFza3MgYW5kIHByZXBhcmUgZm9yIHJlbmRlclxyXG5cdFx0dGhpcy5jYWxjdWxhdGVEYXRlUmFuZ2UodHJ1ZSk7IC8vIEZvcmNlIHJlY2FsY3VsYXRlIGJhc2VkIG9uIGZpbHRlcmVkIHRhc2tzXHJcblx0XHR0aGlzLnByZXBhcmVUYXNrc0ZvclJlbmRlcigpOyAvLyBVc2VzIHRoZSBmaWx0ZXJlZCB0aGlzLnRhc2tzXHJcblxyXG5cdFx0Ly8gVXBkYXRlIGZpbHRlciBvcHRpb25zIGJhc2VkIG9uIHRoZSBjdXJyZW50IHNldCBvZiBwcmVwYXJlZCB0YXNrcyBhZnRlciBmaWx0ZXJpbmdcclxuXHRcdGlmICh0aGlzLmZpbHRlckNvbXBvbmVudCkge1xyXG5cdFx0XHRjb25zdCB0YXNrc0ZvckZpbHRlcmluZyA9IHRoaXMucHJlcGFyZWRUYXNrcy5tYXAoKHB0KSA9PiBwdC50YXNrKTtcclxuXHRcdFx0dGhpcy5maWx0ZXJDb21wb25lbnQudXBkYXRlRmlsdGVyT3B0aW9ucyh0YXNrc0ZvckZpbHRlcmluZyk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5kZWJvdW5jZWRSZW5kZXIoKTtcclxuXHR9XHJcbn1cclxuIl19