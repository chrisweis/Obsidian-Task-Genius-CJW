import { Component } from "obsidian";
import { t } from "@/translations/helper";
import { TableRenderer } from "./TableRenderer";
import { TableEditor } from "./TableEditor";
import { TreeManager } from "./TreeManager";
import { VirtualScrollManager } from "./VirtualScrollManager";
import { TableHeader } from "./TableHeader";
import { sortTasks } from "@/commands/sortTaskCommands";
import { isProjectReadonly } from "@/utils/task/task-operations";
import "@/styles/table.css";
/**
 * Main table view component for displaying tasks in an editable table format
 * Supports both flat list and hierarchical tree view with lazy loading
 */
export class TableView extends Component {
    constructor(app, plugin, parentEl, config, callbacks = {}) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.parentEl = parentEl;
        this.config = config;
        this.callbacks = callbacks;
        // Data management
        this.allTasks = [];
        this.filteredTasks = [];
        this.displayedRows = [];
        this.columns = [];
        this.selectedRows = new Set();
        this.editingCell = null;
        // State
        this.isTreeView = false;
        this.currentSortField = "";
        this.currentSortOrder = "asc";
        this.isLoading = false;
        // Performance optimization
        this.scrollRAF = null;
        this.lastScrollTime = 0;
        this.scrollVelocity = 0;
        this.lastViewport = null;
        this.renderThrottleRAF = null;
        this.lastRenderTime = 0;
        this.handleScroll = () => {
            // Cancel any pending animation frame
            if (this.scrollRAF) {
                cancelAnimationFrame(this.scrollRAF);
            }
            // Use requestAnimationFrame for smooth scrolling
            this.scrollRAF = requestAnimationFrame(() => {
                // Handle virtual scrolling only if enabled and needed
                if (this.virtualScroll &&
                    this.displayedRows.length > this.config.pageSize) {
                    // Calculate scroll velocity for predictive rendering
                    const currentTime = performance.now();
                    const deltaTime = currentTime - this.lastScrollTime;
                    // Remove time-based throttling for immediate responsiveness
                    const currentScrollTop = this.tableWrapper.scrollTop;
                    const previousScrollTop = this.virtualScroll.getViewport().scrollTop;
                    this.scrollVelocity =
                        (currentScrollTop - previousScrollTop) /
                            Math.max(deltaTime, 1);
                    this.lastScrollTime = currentTime;
                    // Let virtual scroll manager handle the scroll logic first
                    this.virtualScroll.handleScroll();
                    // Get viewport and check if it actually changed
                    const viewport = this.virtualScroll.getViewport();
                    // Always render if viewport changed, no matter how small the change
                    const viewportChanged = !this.lastViewport ||
                        this.lastViewport.startIndex !== viewport.startIndex ||
                        this.lastViewport.endIndex !== viewport.endIndex;
                    // Remove render throttling for immediate response
                    if (viewportChanged) {
                        this.performRender(viewport, currentTime);
                    }
                }
                this.scrollRAF = null;
            });
        };
        this.setupCallbacks();
        this.initializeConfig();
    }
    setupCallbacks() {
        // 对于表格视图，我们不自动触发任务选择，让父组件决定是否显示详情
        // this.onTaskSelected = this.callbacks.onTaskSelected;
        this.onTaskCompleted = this.callbacks.onTaskCompleted;
        this.onTaskContextMenu = this.callbacks.onTaskContextMenu;
        this.onTaskUpdated = this.callbacks.onTaskUpdated;
    }
    initializeConfig() {
        this.isTreeView = this.config.enableTreeView;
        this.currentSortField = this.config.defaultSortField;
        this.currentSortOrder = this.config.defaultSortOrder;
        this.initializeColumns();
    }
    initializeColumns() {
        // Define all available columns
        const allColumns = [
            {
                id: "rowNumber",
                title: "#",
                width: 60,
                sortable: false,
                resizable: false,
                type: "number",
                visible: this.config.showRowNumbers,
            },
            {
                id: "status",
                title: t("Status"),
                width: this.config.columnWidths.status || 80,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "status",
                visible: this.config.visibleColumns.includes("status"),
            },
            {
                id: "content",
                title: t("Content"),
                width: this.config.columnWidths.content || 300,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "text",
                visible: this.config.visibleColumns.includes("content"),
            },
            {
                id: "priority",
                title: t("Priority"),
                width: this.config.columnWidths.priority || 100,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "priority",
                visible: this.config.visibleColumns.includes("priority"),
            },
            {
                id: "dueDate",
                title: t("Due Date"),
                width: this.config.columnWidths.dueDate || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "date",
                visible: this.config.visibleColumns.includes("dueDate"),
            },
            {
                id: "startDate",
                title: t("Start Date"),
                width: this.config.columnWidths.startDate || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "date",
                visible: this.config.visibleColumns.includes("startDate"),
            },
            {
                id: "scheduledDate",
                title: t("Scheduled Date"),
                width: this.config.columnWidths.scheduledDate || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "date",
                visible: this.config.visibleColumns.includes("scheduledDate"),
            },
            {
                id: "createdDate",
                title: t("Created Date"),
                width: this.config.columnWidths.createdDate || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "date",
                visible: this.config.visibleColumns.includes("createdDate"),
            },
            {
                id: "completedDate",
                title: t("Completed Date"),
                width: this.config.columnWidths.completedDate || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "date",
                visible: this.config.visibleColumns.includes("completedDate"),
            },
            {
                id: "tags",
                title: t("Tags"),
                width: this.config.columnWidths.tags || 150,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "tags",
                visible: this.config.visibleColumns.includes("tags"),
            },
            {
                id: "project",
                title: t("Project"),
                width: this.config.columnWidths.project || 150,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "text",
                visible: this.config.visibleColumns.includes("project"),
            },
            {
                id: "context",
                title: t("Context"),
                width: this.config.columnWidths.context || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "text",
                visible: this.config.visibleColumns.includes("context"),
            },
            {
                id: "recurrence",
                title: t("Recurrence"),
                width: this.config.columnWidths.recurrence || 120,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "text",
                visible: this.config.visibleColumns.includes("recurrence"),
            },
            {
                id: "filePath",
                title: t("File"),
                width: this.config.columnWidths.filePath || 200,
                sortable: this.config.sortableColumns,
                resizable: this.config.resizableColumns,
                type: "text",
                visible: this.config.visibleColumns.includes("filePath"),
            },
        ];
        this.columns = allColumns.filter((col) => col.visible);
    }
    onload() {
        this.createTableStructure();
        this.initializeChildComponents();
        this.setupEventListeners();
        // Initialize table header with current state
        this.updateTableHeaderInfo();
    }
    onunload() {
        this.cleanup();
    }
    createTableStructure() {
        this.containerEl = this.parentEl.createDiv("task-table-container");
        // Create table header bar (not the table header)
        this.tableHeader = new TableHeader(this.containerEl, {
            onTreeModeToggle: (enabled) => {
                this.isTreeView = enabled;
                this.config.enableTreeView = enabled;
                this.refreshDisplay();
            },
            onRefresh: () => {
                this.refreshData();
            },
            onColumnToggle: (columnId, visible) => {
                this.toggleColumnVisibility(columnId, visible);
            },
        });
        this.addChild(this.tableHeader);
        // Create table wrapper for proper scrolling
        this.tableWrapper = this.containerEl.createDiv("task-table-wrapper");
        // Create table element
        this.tableEl = this.tableWrapper.createEl("table", "task-table");
        // Create header
        this.headerEl = this.tableEl.createEl("thead", "task-table-header");
        // Create body
        this.bodyEl = this.tableEl.createEl("tbody", "task-table-body");
        // Create loading indicator
        this.loadingEl = this.tableWrapper.createDiv("task-table-loading");
        this.loadingEl.textContent = t("Loading...");
        this.loadingEl.style.display = "none";
    }
    initializeChildComponents() {
        // Initialize renderer
        this.renderer = new TableRenderer(this.tableEl, this.headerEl, this.bodyEl, this.columns, this.config, this.app, this.plugin);
        this.addChild(this.renderer);
        // Set up date change callback
        this.renderer.onDateChange = (rowId, columnId, newDate) => {
            this.handleDateChange(rowId, columnId, newDate);
        };
        // Set up row expansion callback
        this.renderer.onRowExpand = (rowId) => {
            this.handleRowExpansion(rowId);
        };
        // Set up cell change callback
        this.renderer.onCellChange = (rowId, columnId, newValue) => {
            this.handleCellChange(rowId, columnId, newValue);
        };
        // Initialize editor if inline editing is enabled
        if (this.config.enableInlineEditing) {
            this.editor = new TableEditor(this.app, this.plugin, this.config, {
                onCellEdit: this.handleCellEdit.bind(this),
                onEditComplete: this.handleEditComplete.bind(this),
                onEditCancel: this.handleEditCancel.bind(this),
            });
            this.addChild(this.editor);
        }
        // Initialize tree manager if tree view is enabled
        if (this.config.enableTreeView) {
            this.treeManager = new TreeManager(this.columns, this.plugin.settings);
            this.addChild(this.treeManager);
        }
        // Initialize virtual scroll if lazy loading is enabled
        if (this.config.enableLazyLoading) {
            this.virtualScroll = new VirtualScrollManager(this.tableWrapper, this.config.pageSize, {
                onLoadMore: this.loadMoreRows.bind(this),
                onScroll: this.handleScroll.bind(this),
            });
            this.addChild(this.virtualScroll);
        }
    }
    setupEventListeners() {
        // Table click events
        this.registerDomEvent(this.tableEl, "click", this.handleTableClick.bind(this));
        this.registerDomEvent(this.tableEl, "dblclick", this.handleTableDoubleClick.bind(this));
        this.registerDomEvent(this.tableEl, "contextmenu", this.handleTableContextMenu.bind(this));
        // Keyboard events
        this.registerDomEvent(this.containerEl, "keydown", this.handleKeyDown.bind(this));
        // Header events for sorting and resizing
        this.registerDomEvent(this.headerEl, "click", this.handleHeaderClick.bind(this));
    }
    /**
     * Update the table with new task data
     */
    updateTasks(tasks) {
        this.allTasks = tasks;
        this.applyFiltersAndSort();
        this.refreshDisplay();
        this.updateTableHeaderInfo();
    }
    /**
     * Force a complete table refresh - useful when sorting issues are detected
     */
    forceRefresh() {
        // Clear all cached rows and force complete re-render
        if (this.renderer) {
            this.renderer.forceClearCache();
        }
        // Reset virtual scroll if enabled
        if (this.virtualScroll) {
            this.virtualScroll.reset();
        }
        // Clear selections
        this.selectedRows.clear();
        // Re-apply sorting and refresh
        this.applyFiltersAndSort();
        this.refreshDisplay();
        this.updateSortIndicators();
    }
    /**
     * Apply current filters and sorting to the task list
     */
    applyFiltersAndSort() {
        // Apply any additional filters here if needed
        this.filteredTasks = [...this.allTasks];
        // Sort tasks using the centralized sorting function
        if (this.currentSortField) {
            const sortCriteria = [
                {
                    field: this.currentSortField,
                    order: this.currentSortOrder,
                },
            ];
            this.filteredTasks = sortTasks(this.filteredTasks, sortCriteria, this.plugin.settings);
            console.log("sort tasks", this.filteredTasks, sortCriteria);
            console.log(this.filteredTasks);
        }
    }
    /**
     * Refresh the table display
     */
    refreshDisplay() {
        // Ensure tree manager is initialized if we're in tree view
        if (this.isTreeView && !this.treeManager) {
            this.treeManager = new TreeManager(this.columns, this.plugin.settings);
            this.addChild(this.treeManager);
        }
        if (this.isTreeView && this.treeManager) {
            // Pass current sort parameters to tree manager
            this.displayedRows = this.treeManager.buildTreeRows(this.filteredTasks, this.currentSortField, this.currentSortOrder);
        }
        else {
            this.displayedRows = this.buildFlatRows(this.filteredTasks);
        }
        // Clear any existing selection that might be invalid after sorting
        this.selectedRows.clear();
        // If virtual scrolling is enabled and we have many rows, use virtual rendering
        if (this.virtualScroll &&
            this.displayedRows.length > this.config.pageSize) {
            this.virtualScroll.updateContent(this.displayedRows.length);
            const viewport = this.virtualScroll.getViewport();
            const visibleRows = this.displayedRows.slice(viewport.startIndex, viewport.endIndex + 1);
            this.renderer.renderTable(visibleRows, this.selectedRows, viewport.startIndex, this.displayedRows.length);
        }
        else {
            // Render all rows normally
            this.renderer.renderTable(this.displayedRows, this.selectedRows);
        }
    }
    /**
     * Build flat table rows from tasks
     */
    buildFlatRows(tasks) {
        return tasks.map((task, index) => ({
            id: task.id,
            task: task,
            level: 0,
            expanded: false,
            hasChildren: false,
            cells: this.buildCellsForTask(task, index + 1),
        }));
    }
    /**
     * Build table cells for a task
     */
    buildCellsForTask(task, rowNumber) {
        return this.columns.map((column) => {
            var _a;
            let value;
            let displayValue;
            switch (column.id) {
                case "rowNumber":
                    value = rowNumber;
                    displayValue = rowNumber.toString();
                    break;
                case "status":
                    value = task.status;
                    displayValue = this.formatStatus(task.status);
                    break;
                case "content":
                    value = task.content;
                    displayValue = task.content;
                    break;
                case "priority":
                    const metadata = task.metadata || {};
                    value = metadata.priority;
                    displayValue = this.formatPriority(metadata.priority);
                    break;
                case "dueDate":
                    const metadataDue = task.metadata || {};
                    value = metadataDue.dueDate;
                    displayValue = this.formatDate(metadataDue.dueDate);
                    break;
                case "startDate":
                    const metadataStart = task.metadata || {};
                    value = metadataStart.startDate;
                    displayValue = this.formatDate(metadataStart.startDate);
                    break;
                case "scheduledDate":
                    const metadataScheduled = task.metadata || {};
                    value = metadataScheduled.scheduledDate;
                    displayValue = this.formatDate(metadataScheduled.scheduledDate);
                    break;
                case "createdDate":
                    value = task.metadata.createdDate;
                    displayValue = this.formatDate(task.metadata.createdDate);
                    break;
                case "completedDate":
                    value = task.metadata.completedDate;
                    displayValue = this.formatDate(task.metadata.completedDate);
                    break;
                case "tags":
                    value = task.metadata.tags;
                    displayValue = ((_a = task.metadata.tags) === null || _a === void 0 ? void 0 : _a.join(", ")) || "";
                    break;
                case "project":
                    value = task.metadata.project;
                    displayValue = task.metadata.project || "";
                    break;
                case "context":
                    value = task.metadata.context;
                    displayValue = task.metadata.context || "";
                    break;
                case "recurrence":
                    value = task.metadata.recurrence;
                    displayValue = task.metadata.recurrence || "";
                    break;
                case "filePath":
                    value = task.filePath;
                    displayValue = this.formatFilePath(task.filePath);
                    break;
                default:
                    value = "";
                    displayValue = "";
            }
            return {
                columnId: column.id,
                value: value,
                displayValue: displayValue,
                editable: column.id !== "rowNumber" &&
                    this.config.enableInlineEditing,
            };
        });
    }
    // Formatting methods
    formatStatus(status) {
        // Convert status symbols to readable text
        const statusMap = {
            " ": t("Not Started"),
            x: t("Completed"),
            X: t("Completed"),
            "/": t("In Progress"),
            ">": t("In Progress"),
            "-": t("Abandoned"),
            "?": t("Planned"),
        };
        return statusMap[status] || status;
    }
    formatPriority(priority) {
        if (!priority)
            return "";
        const priorityMap = {
            5: t("Highest"),
            4: t("High"),
            3: t("Medium"),
            2: t("Low"),
            1: t("Lowest"),
        };
        return priorityMap[priority] || priority.toString();
    }
    formatDate(timestamp) {
        if (!timestamp)
            return "";
        return new Date(timestamp).toLocaleDateString();
    }
    formatFilePath(filePath) {
        // Extract just the filename
        const parts = filePath.split("/");
        return parts[parts.length - 1].replace(/\.md$/, "");
    }
    // Event handlers
    handleTableClick(event) {
        const target = event.target;
        const row = target.closest("tr");
        if (!row)
            return;
        const rowId = row.dataset.rowId;
        if (!rowId)
            return;
        const task = this.allTasks.find((t) => t.id === rowId);
        if (!task)
            return;
        // Handle row selection
        if (this.config.enableRowSelection) {
            if (event.ctrlKey || event.metaKey) {
                // Multi-select
                if (this.config.enableMultiSelect) {
                    if (this.selectedRows.has(rowId)) {
                        this.selectedRows.delete(rowId);
                    }
                    else {
                        this.selectedRows.add(rowId);
                    }
                }
            }
            else {
                // Single select
                this.selectedRows.clear();
                this.selectedRows.add(rowId);
            }
            this.updateRowSelection();
        }
        // 表格视图不自动触发任务选择，避免显示详情面板
        // 如果需要显示详情，可以通过右键菜单或其他方式触发
        // if (this.onTaskSelected) {
        // 	this.onTaskSelected(task);
        // }
    }
    handleTableDoubleClick(event) {
        const target = event.target;
        const cell = target.closest("td");
        if (!cell)
            return;
        const row = cell.closest("tr");
        if (!row)
            return;
        const rowId = row.dataset.rowId;
        const columnId = cell.dataset.columnId;
        if (rowId && columnId && this.config.enableInlineEditing) {
            this.startCellEdit(rowId, columnId, cell);
        }
    }
    handleTableContextMenu(event) {
        event.preventDefault();
        const target = event.target;
        const row = target.closest("tr");
        if (!row)
            return;
        const rowId = row.dataset.rowId;
        if (!rowId)
            return;
        const task = this.allTasks.find((t) => t.id === rowId);
        if (!task)
            return;
        // 调用原有的上下文菜单回调
        if (this.onTaskContextMenu) {
            this.onTaskContextMenu(event, task);
        }
    }
    handleHeaderClick(event) {
        const target = event.target;
        // Don't handle sort if we're resizing or clicking on a resize handle
        if (target.classList.contains("task-table-resize-handle")) {
            return;
        }
        const header = target.closest("th");
        if (!header) {
            return;
        }
        // Check if the table is currently being resized
        if (this.tableEl.classList.contains("resizing")) {
            return;
        }
        const columnId = header.dataset.columnId;
        if (!columnId)
            return;
        const column = this.columns.find((c) => c.id === columnId);
        if (!column || !column.sortable) {
            return;
        }
        // Handle sorting logic
        if (this.currentSortField === columnId) {
            // Same column clicked - cycle through: asc -> desc -> no sort
            if (this.currentSortOrder === "asc") {
                this.currentSortOrder = "desc";
            }
            else if (this.currentSortOrder === "desc") {
                // Third click: clear sorting
                this.currentSortField = "";
                this.currentSortOrder = "asc";
            }
        }
        else {
            // Different column clicked - clear previous sorting and start with asc
            this.currentSortField = columnId;
            this.currentSortOrder = "asc";
        }
        // Reset virtual scroll state when sorting changes to ensure proper re-rendering
        if (this.virtualScroll) {
            this.virtualScroll.reset();
        }
        this.applyFiltersAndSort();
        this.refreshDisplay();
        this.updateSortIndicators();
        // Debug logging to help identify sorting issues
        console.log(`Table sorted by ${this.currentSortField} (${this.currentSortOrder})`);
        console.log(`Filtered tasks count: ${this.filteredTasks.length}`);
        console.log(`Displayed rows count: ${this.displayedRows.length}`);
        // Fallback: If the table doesn't seem to be updating properly, force a complete refresh
        // This is a safety net for any edge cases in the rendering logic
        setTimeout(() => {
            const currentRowCount = this.bodyEl.querySelectorAll("tr[data-row-id]").length;
            const expectedRowCount = this.displayedRows.length;
            if (currentRowCount !== expectedRowCount && expectedRowCount > 0) {
                console.warn(`Table row count mismatch detected. Expected: ${expectedRowCount}, Actual: ${currentRowCount}. Forcing refresh.`);
                this.forceRefresh();
            }
        }, 100); // Small delay to allow rendering to complete
    }
    handleKeyDown(event) {
        // Handle keyboard shortcuts
        if (event.key === "Escape" && this.editingCell) {
            this.cancelCellEdit();
        }
    }
    /**
     * Perform actual rendering with throttling
     */
    performRender(viewport, currentTime) {
        // Cancel any pending render
        if (this.renderThrottleRAF) {
            cancelAnimationFrame(this.renderThrottleRAF);
            this.renderThrottleRAF = null;
        }
        // Execute rendering immediately for better responsiveness
        // More aggressive buffer adjustment for fast scrolling
        let bufferAdjustment = 0;
        if (Math.abs(this.scrollVelocity) > 1) {
            // Reduced threshold from 2 to 1 for earlier buffer adjustment
            bufferAdjustment = Math.min(8, // Increased from 5 to 8 for even larger buffer
            Math.floor(Math.abs(this.scrollVelocity) / 1.5) // Reduced divisor for more aggressive buffering
            );
        }
        // Calculate visible range with buffer
        let adjustedStartIndex = Math.max(0, viewport.startIndex - bufferAdjustment);
        // Special check: if we're very close to the top, force startIndex to 0
        const currentScrollTop = this.tableWrapper.scrollTop;
        if (currentScrollTop <= 40) {
            // Within one row height of top
            adjustedStartIndex = 0;
        }
        const adjustedEndIndex = Math.min(this.displayedRows.length - 1, viewport.endIndex + bufferAdjustment);
        const visibleRows = this.displayedRows.slice(adjustedStartIndex, adjustedEndIndex + 1);
        // Use the optimized renderer with row recycling
        this.renderer.renderTable(visibleRows, this.selectedRows, adjustedStartIndex, this.displayedRows.length);
        // Update state
        this.lastViewport = {
            startIndex: adjustedStartIndex,
            endIndex: adjustedEndIndex,
        };
        this.lastRenderTime = currentTime;
    }
    // Cell editing methods
    startCellEdit(rowId, columnId, cellEl) {
        if (this.editingCell) {
            this.cancelCellEdit();
        }
        this.editingCell = { rowId, columnId };
        this.editor.startEdit(rowId, columnId, cellEl);
    }
    /**
     * Handle cell edit from table editor
     */
    handleCellEdit(rowId, columnId, newValue) {
        const task = this.allTasks.find((t) => t.id === rowId);
        if (!task)
            return;
        // Update task property
        const updatedTask = Object.assign({}, task);
        this.updateTaskProperty(updatedTask, columnId, newValue);
        // Notify task update
        if (this.onTaskUpdated) {
            this.onTaskUpdated(updatedTask);
        }
    }
    handleEditComplete() {
        this.editingCell = null;
        this.refreshDisplay();
    }
    handleEditCancel() {
        this.editingCell = null;
    }
    cancelCellEdit() {
        if (this.editingCell) {
            this.editor.cancelEdit();
            this.editingCell = null;
        }
    }
    updateTaskProperty(task, property, value) {
        switch (property) {
            case "status":
                task.status = value;
                task.completed = value === "x" || value === "X";
                break;
            case "content":
                task.content = value;
                break;
            case "priority":
                task.metadata.priority = value
                    ? parseInt(String(value))
                    : undefined;
                break;
            case "dueDate":
                task.metadata.dueDate = value
                    ? new Date(value).getTime()
                    : undefined;
                break;
            case "startDate":
                task.metadata.startDate = value
                    ? new Date(value).getTime()
                    : undefined;
                break;
            case "scheduledDate":
                task.metadata.scheduledDate = value
                    ? new Date(value).getTime()
                    : undefined;
                break;
            case "createdDate":
                task.metadata.createdDate = value
                    ? new Date(value).getTime()
                    : undefined;
                break;
            case "completedDate":
                task.metadata.completedDate = value
                    ? new Date(value).getTime()
                    : undefined;
                break;
            case "tags":
                // Handle both array and string inputs
                if (Array.isArray(value)) {
                    task.metadata.tags = value;
                }
                else if (typeof value === "string") {
                    task.metadata.tags = value
                        ? value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t.length > 0)
                        : [];
                }
                else {
                    task.metadata.tags = [];
                }
                break;
            case "project":
                // Only update project if it's not a read-only tgProject
                if (!isProjectReadonly(task)) {
                    task.metadata.project = value || undefined;
                }
                break;
            case "context":
                task.metadata.context = value || undefined;
                break;
            case "recurrence":
                task.metadata.recurrence = value || undefined;
                break;
        }
    }
    // UI update methods
    updateRowSelection() {
        this.renderer.updateSelection(this.selectedRows);
    }
    updateSortIndicators() {
        // If no sort field is set, clear all indicators
        if (!this.currentSortField) {
            this.renderer.updateSortIndicators("", "asc");
        }
        else {
            this.renderer.updateSortIndicators(this.currentSortField, this.currentSortOrder);
        }
    }
    loadMoreRows() {
        // Implement lazy loading logic here
        if (this.virtualScroll) {
            this.virtualScroll.loadNextBatch();
        }
    }
    cleanup() {
        // Cancel any pending scroll animation
        if (this.scrollRAF) {
            cancelAnimationFrame(this.scrollRAF);
            this.scrollRAF = null;
        }
        // Cancel any pending render
        if (this.renderThrottleRAF) {
            cancelAnimationFrame(this.renderThrottleRAF);
            this.renderThrottleRAF = null;
        }
        // Clear viewport cache
        this.lastViewport = null;
        this.selectedRows.clear();
        this.displayedRows = [];
        this.filteredTasks = [];
        this.allTasks = [];
    }
    /**
     * Toggle between tree view and flat view
     */
    toggleTreeView() {
        this.isTreeView = !this.isTreeView;
        this.refreshDisplay();
    }
    /**
     * Get currently selected tasks
     */
    getSelectedTasks() {
        return this.allTasks.filter((task) => this.selectedRows.has(task.id));
    }
    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedRows.clear();
        this.updateRowSelection();
    }
    /**
     * Export table data
     */
    exportData() {
        return this.displayedRows.map((row) => {
            const data = {};
            row.cells.forEach((cell) => {
                data[cell.columnId] = cell.value;
            });
            return data;
        });
    }
    /**
     * Refresh table data
     */
    refreshData() {
        this.applyFiltersAndSort();
        this.refreshDisplay();
    }
    /**
     * Toggle column visibility
     */
    toggleColumnVisibility(columnId, visible) {
        // Update config
        if (visible && !this.config.visibleColumns.includes(columnId)) {
            this.config.visibleColumns.push(columnId);
        }
        else if (!visible) {
            const index = this.config.visibleColumns.indexOf(columnId);
            if (index > -1) {
                this.config.visibleColumns.splice(index, 1);
            }
        }
        // Save the updated configuration to plugin settings
        this.saveColumnConfiguration();
        // Reinitialize columns
        this.initializeColumns();
        // Update renderer with new columns
        if (this.renderer) {
            this.renderer.updateColumns(this.columns);
        }
        // Update tree manager with new columns
        if (this.treeManager) {
            this.treeManager.updateColumns(this.columns);
        }
        // Refresh display
        this.refreshDisplay();
        // Update table header with new column info
        this.updateTableHeaderInfo();
    }
    /**
     * Save column configuration to plugin settings
     */
    saveColumnConfiguration() {
        if (this.plugin && this.plugin.settings) {
            // Find the table view configuration
            const tableViewConfig = this.plugin.settings.viewConfiguration.find((view) => view.id === "table");
            if (tableViewConfig && tableViewConfig.specificConfig) {
                const tableConfig = tableViewConfig.specificConfig;
                if (tableConfig.viewType === "table") {
                    // Update the visible columns in the plugin settings
                    tableConfig.visibleColumns = [
                        ...this.config.visibleColumns,
                    ];
                    // Save settings
                    this.plugin.saveSettings();
                }
            }
        }
    }
    /**
     * Update table header information
     */
    updateTableHeaderInfo() {
        if (this.tableHeader) {
            // Update task count
            this.tableHeader.updateTaskCount(this.filteredTasks.length);
            // Update tree mode state
            this.tableHeader.updateTreeMode(this.isTreeView);
            // Update available columns
            const allColumns = this.getAllAvailableColumns();
            this.tableHeader.updateColumns(allColumns);
        }
    }
    /**
     * Get all available columns with their visibility state
     */
    getAllAvailableColumns() {
        return [
            {
                id: "status",
                title: t("Status"),
                visible: this.config.visibleColumns.includes("status"),
            },
            {
                id: "content",
                title: t("Content"),
                visible: this.config.visibleColumns.includes("content"),
            },
            {
                id: "priority",
                title: t("Priority"),
                visible: this.config.visibleColumns.includes("priority"),
            },
            {
                id: "dueDate",
                title: t("Due Date"),
                visible: this.config.visibleColumns.includes("dueDate"),
            },
            {
                id: "startDate",
                title: t("Start Date"),
                visible: this.config.visibleColumns.includes("startDate"),
            },
            {
                id: "scheduledDate",
                title: t("Scheduled Date"),
                visible: this.config.visibleColumns.includes("scheduledDate"),
            },
            {
                id: "createdDate",
                title: t("Created Date"),
                visible: this.config.visibleColumns.includes("createdDate"),
            },
            {
                id: "completedDate",
                title: t("Completed Date"),
                visible: this.config.visibleColumns.includes("completedDate"),
            },
            {
                id: "tags",
                title: t("Tags"),
                visible: this.config.visibleColumns.includes("tags"),
            },
            {
                id: "project",
                title: t("Project"),
                visible: this.config.visibleColumns.includes("project"),
            },
            {
                id: "context",
                title: t("Context"),
                visible: this.config.visibleColumns.includes("context"),
            },
            {
                id: "recurrence",
                title: t("Recurrence"),
                visible: this.config.visibleColumns.includes("recurrence"),
            },
            {
                id: "filePath",
                title: t("File"),
                visible: this.config.visibleColumns.includes("filePath"),
            },
        ];
    }
    /**
     * Handle date change from date picker
     */
    handleDateChange(rowId, columnId, newDate) {
        const task = this.allTasks.find((t) => t.id === rowId);
        if (!task)
            return;
        // Update task property based on column
        const updatedTask = Object.assign({}, task);
        // Define valid date column IDs for type safety
        const dateColumns = [
            "dueDate",
            "startDate",
            "scheduledDate",
            "createdDate",
            "completedDate",
        ];
        // Check if the column is a valid date column
        if (!dateColumns.includes(columnId)) {
            return;
        }
        if (newDate) {
            // Set the date value
            const dateValue = new Date(newDate).getTime();
            updatedTask.metadata[columnId] = dateValue;
        }
        else {
            // Clear the date
            delete updatedTask.metadata[columnId];
        }
        // Notify task update
        if (this.onTaskUpdated) {
            this.onTaskUpdated(updatedTask);
        }
        // Refresh display
        this.refreshDisplay();
    }
    /**
     * Handle edit start
     */
    handleEditStart(rowId, columnId) {
        this.editingCell = { rowId, columnId };
    }
    /**
     * Handle row expansion in tree view
     */
    handleRowExpansion(rowId) {
        if (this.isTreeView && this.treeManager) {
            const wasToggled = this.treeManager.toggleNodeExpansion(rowId);
            if (wasToggled) {
                this.refreshDisplay();
            }
        }
    }
    /**
     * Handle cell change from inline editing
     */
    handleCellChange(rowId, columnId, newValue) {
        const taskIndex = this.allTasks.findIndex((t) => t.id === rowId);
        if (taskIndex === -1) {
            return;
        }
        const task = this.allTasks[taskIndex];
        // Update task property directly on the original task object
        this.updateTaskProperty(task, columnId, newValue);
        // Create a copy for the callback to maintain the existing interface
        const updatedTask = Object.assign({}, task);
        // Notify task update
        if (this.onTaskUpdated) {
            this.onTaskUpdated(updatedTask);
        }
        // Also update the filteredTasks array if this task is in it
        const filteredIndex = this.filteredTasks.findIndex((t) => t.id === rowId);
        if (filteredIndex !== -1) {
            // Update the reference to point to the updated task
            this.filteredTasks[filteredIndex] = task;
        }
        // Refresh display
        this.refreshDisplay();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFibGVWaWV3LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVGFibGVWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQWlCLE1BQU0sVUFBVSxDQUFDO0FBT3BELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUM1QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQzVDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzlELE9BQU8sRUFBRSxXQUFXLEVBQXdCLE1BQU0sZUFBZSxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN4RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRSxPQUFPLG9CQUFvQixDQUFDO0FBUzVCOzs7R0FHRztBQUNILE1BQU0sT0FBTyxTQUFVLFNBQVEsU0FBUztJQTRDdkMsWUFDUyxHQUFRLEVBQ1IsTUFBNkIsRUFDN0IsUUFBcUIsRUFDckIsTUFBMkIsRUFDM0IsWUFBZ0MsRUFBRTtRQUUxQyxLQUFLLEVBQUUsQ0FBQztRQU5BLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQUM3QixhQUFRLEdBQVIsUUFBUSxDQUFhO1FBQ3JCLFdBQU0sR0FBTixNQUFNLENBQXFCO1FBQzNCLGNBQVMsR0FBVCxTQUFTLENBQXlCO1FBbEMzQyxrQkFBa0I7UUFDVixhQUFRLEdBQVcsRUFBRSxDQUFDO1FBQ3RCLGtCQUFhLEdBQVcsRUFBRSxDQUFDO1FBQzNCLGtCQUFhLEdBQWUsRUFBRSxDQUFDO1FBQy9CLFlBQU8sR0FBa0IsRUFBRSxDQUFDO1FBQzVCLGlC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QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsQ0FBQztRQUNqRSxJQUFJLFNBQVMsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNyQixPQUFPO1NBQ1A7UUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBRXRDLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsa0JBQWtCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVsRCxvRUFBb0U7UUFDcEUsTUFBTSxXQUFXLHFCQUFRLElBQUksQ0FBRSxDQUFDO1FBRWhDLHFCQUFxQjtRQUNyQixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7WUFDdkIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztTQUNoQztRQUVELDREQUE0RDtRQUM1RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FDakQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUNyQixDQUFDO1FBQ0YsSUFBSSxhQUFhLEtBQUssQ0FBQyxDQUFDLEVBQUU7WUFDekIsb0RBQW9EO1lBQ3BELElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxDQUFDLEdBQUcsSUFBSSxDQUFDO1NBQ3pDO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUN2QixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEFwcCwgZGVib3VuY2UgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCJAL3R5cGVzL3Rhc2tcIjtcclxuaW1wb3J0IHtcclxuXHRUYWJsZVNwZWNpZmljQ29uZmlnLFxyXG5cdFNvcnRDcml0ZXJpb24sXHJcbn0gZnJvbSBcIi4uLy4uLy4uL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb25cIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBUYWJsZUNvbHVtbiwgVGFibGVSb3csIFRhYmxlQ2VsbCB9IGZyb20gXCIuL1RhYmxlVHlwZXNcIjtcclxuaW1wb3J0IHsgVGFibGVSZW5kZXJlciB9IGZyb20gXCIuL1RhYmxlUmVuZGVyZXJcIjtcclxuaW1wb3J0IHsgVGFibGVFZGl0b3IgfSBmcm9tIFwiLi9UYWJsZUVkaXRvclwiO1xyXG5pbXBvcnQgeyBUcmVlTWFuYWdlciB9IGZyb20gXCIuL1RyZWVNYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFZpcnR1YWxTY3JvbGxNYW5hZ2VyIH0gZnJvbSBcIi4vVmlydHVhbFNjcm9sbE1hbmFnZXJcIjtcclxuaW1wb3J0IHsgVGFibGVIZWFkZXIsIFRhYmxlSGVhZGVyQ2FsbGJhY2tzIH0gZnJvbSBcIi4vVGFibGVIZWFkZXJcIjtcclxuaW1wb3J0IHsgc29ydFRhc2tzIH0gZnJvbSBcIkAvY29tbWFuZHMvc29ydFRhc2tDb21tYW5kc1wiO1xyXG5pbXBvcnQgeyBpc1Byb2plY3RSZWFkb25seSB9IGZyb20gXCJAL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCI7XHJcbmltcG9ydCBcIkAvc3R5bGVzL3RhYmxlLmNzc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUYWJsZVZpZXdDYWxsYmFja3Mge1xyXG5cdG9uVGFza1NlbGVjdGVkPzogKHRhc2s6IFRhc2sgfCBudWxsKSA9PiB2b2lkO1xyXG5cdG9uVGFza0NvbXBsZXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdG9uVGFza0NvbnRleHRNZW51PzogKGV2ZW50OiBNb3VzZUV2ZW50LCB0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdG9uVGFza1VwZGF0ZWQ/OiAodGFzazogVGFzaykgPT4gdm9pZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIE1haW4gdGFibGUgdmlldyBjb21wb25lbnQgZm9yIGRpc3BsYXlpbmcgdGFza3MgaW4gYW4gZWRpdGFibGUgdGFibGUgZm9ybWF0XHJcbiAqIFN1cHBvcnRzIGJvdGggZmxhdCBsaXN0IGFuZCBoaWVyYXJjaGljYWwgdHJlZSB2aWV3IHdpdGggbGF6eSBsb2FkaW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVGFibGVWaWV3IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwdWJsaWMgY29udGFpbmVyRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdGFibGVFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBoZWFkZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBib2R5RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgbG9hZGluZ0VsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIHRhYmxlV3JhcHBlcjogSFRNTEVsZW1lbnQ7XHJcblxyXG5cdC8vIENoaWxkIGNvbXBvbmVudHNcclxuXHRwcml2YXRlIHRhYmxlSGVhZGVyOiBUYWJsZUhlYWRlcjtcclxuXHRwcml2YXRlIHJlbmRlcmVyOiBUYWJsZVJlbmRlcmVyO1xyXG5cdHByaXZhdGUgZWRpdG9yOiBUYWJsZUVkaXRvcjtcclxuXHRwcml2YXRlIHRyZWVNYW5hZ2VyOiBUcmVlTWFuYWdlcjtcclxuXHRwcml2YXRlIHZpcnR1YWxTY3JvbGw6IFZpcnR1YWxTY3JvbGxNYW5hZ2VyO1xyXG5cclxuXHQvLyBEYXRhIG1hbmFnZW1lbnRcclxuXHRwcml2YXRlIGFsbFRhc2tzOiBUYXNrW10gPSBbXTtcclxuXHRwcml2YXRlIGZpbHRlcmVkVGFza3M6IFRhc2tbXSA9IFtdO1xyXG5cdHByaXZhdGUgZGlzcGxheWVkUm93czogVGFibGVSb3dbXSA9IFtdO1xyXG5cdHByaXZhdGUgY29sdW1uczogVGFibGVDb2x1bW5bXSA9IFtdO1xyXG5cdHByaXZhdGUgc2VsZWN0ZWRSb3dzOiBTZXQ8c3RyaW5nPiA9IG5ldyBTZXQoKTtcclxuXHRwcml2YXRlIGVkaXRpbmdDZWxsOiB7IHJvd0lkOiBzdHJpbmc7IGNvbHVtbklkOiBzdHJpbmcgfSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHQvLyBTdGF0ZVxyXG5cdHByaXZhdGUgaXNUcmVlVmlldzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cdHByaXZhdGUgY3VycmVudFNvcnRGaWVsZDogc3RyaW5nID0gXCJcIjtcclxuXHRwcml2YXRlIGN1cnJlbnRTb3J0T3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIiA9IFwiYXNjXCI7XHJcblx0cHJpdmF0ZSBpc0xvYWRpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcblx0Ly8gUGVyZm9ybWFuY2Ugb3B0aW1pemF0aW9uXHJcblx0cHJpdmF0ZSBzY3JvbGxSQUY6IG51bWJlciB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgbGFzdFNjcm9sbFRpbWU6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSBzY3JvbGxWZWxvY2l0eTogbnVtYmVyID0gMDtcclxuXHRwcml2YXRlIGxhc3RWaWV3cG9ydDogeyBzdGFydEluZGV4OiBudW1iZXI7IGVuZEluZGV4OiBudW1iZXIgfSB8IG51bGwgPVxyXG5cdFx0bnVsbDtcclxuXHRwcml2YXRlIHJlbmRlclRocm90dGxlUkFGOiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGxhc3RSZW5kZXJUaW1lOiBudW1iZXIgPSAwO1xyXG5cclxuXHQvLyBDYWxsYmFja3NcclxuXHRwdWJsaWMgb25UYXNrU2VsZWN0ZWQ/OiAodGFzazogVGFzayB8IG51bGwpID0+IHZvaWQ7XHJcblx0cHVibGljIG9uVGFza0NvbXBsZXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cdHB1YmxpYyBvblRhc2tDb250ZXh0TWVudT86IChldmVudDogTW91c2VFdmVudCwgdGFzazogVGFzaykgPT4gdm9pZDtcclxuXHRwdWJsaWMgb25UYXNrVXBkYXRlZD86ICh0YXNrOiBUYXNrKSA9PiB2b2lkO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHByaXZhdGUgYXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBwYXJlbnRFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRwcml2YXRlIGNvbmZpZzogVGFibGVTcGVjaWZpY0NvbmZpZyxcclxuXHRcdHByaXZhdGUgY2FsbGJhY2tzOiBUYWJsZVZpZXdDYWxsYmFja3MgPSB7fVxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuc2V0dXBDYWxsYmFja3MoKTtcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZUNvbmZpZygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZXR1cENhbGxiYWNrcygpIHtcclxuXHRcdC8vIOWvueS6juihqOagvOinhuWbvu+8jOaIkeS7rOS4jeiHquWKqOinpuWPkeS7u+WKoemAieaLqe+8jOiuqeeItue7hOS7tuWGs+WumuaYr+WQpuaYvuekuuivpuaDhVxyXG5cdFx0Ly8gdGhpcy5vblRhc2tTZWxlY3RlZCA9IHRoaXMuY2FsbGJhY2tzLm9uVGFza1NlbGVjdGVkO1xyXG5cdFx0dGhpcy5vblRhc2tDb21wbGV0ZWQgPSB0aGlzLmNhbGxiYWNrcy5vblRhc2tDb21wbGV0ZWQ7XHJcblx0XHR0aGlzLm9uVGFza0NvbnRleHRNZW51ID0gdGhpcy5jYWxsYmFja3Mub25UYXNrQ29udGV4dE1lbnU7XHJcblx0XHR0aGlzLm9uVGFza1VwZGF0ZWQgPSB0aGlzLmNhbGxiYWNrcy5vblRhc2tVcGRhdGVkO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpbml0aWFsaXplQ29uZmlnKCkge1xyXG5cdFx0dGhpcy5pc1RyZWVWaWV3ID0gdGhpcy5jb25maWcuZW5hYmxlVHJlZVZpZXc7XHJcblx0XHR0aGlzLmN1cnJlbnRTb3J0RmllbGQgPSB0aGlzLmNvbmZpZy5kZWZhdWx0U29ydEZpZWxkO1xyXG5cdFx0dGhpcy5jdXJyZW50U29ydE9yZGVyID0gdGhpcy5jb25maWcuZGVmYXVsdFNvcnRPcmRlcjtcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZUNvbHVtbnMoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaW5pdGlhbGl6ZUNvbHVtbnMoKSB7XHJcblx0XHQvLyBEZWZpbmUgYWxsIGF2YWlsYWJsZSBjb2x1bW5zXHJcblx0XHRjb25zdCBhbGxDb2x1bW5zOiBUYWJsZUNvbHVtbltdID0gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwicm93TnVtYmVyXCIsXHJcblx0XHRcdFx0dGl0bGU6IFwiI1wiLFxyXG5cdFx0XHRcdHdpZHRoOiA2MCxcclxuXHRcdFx0XHRzb3J0YWJsZTogZmFsc2UsXHJcblx0XHRcdFx0cmVzaXphYmxlOiBmYWxzZSxcclxuXHRcdFx0XHR0eXBlOiBcIm51bWJlclwiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnNob3dSb3dOdW1iZXJzLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwic3RhdHVzXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJTdGF0dXNcIiksXHJcblx0XHRcdFx0d2lkdGg6IHRoaXMuY29uZmlnLmNvbHVtbldpZHRocy5zdGF0dXMgfHwgODAsXHJcblx0XHRcdFx0c29ydGFibGU6IHRoaXMuY29uZmlnLnNvcnRhYmxlQ29sdW1ucyxcclxuXHRcdFx0XHRyZXNpemFibGU6IHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0dHlwZTogXCJzdGF0dXNcIixcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcInN0YXR1c1wiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImNvbnRlbnRcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIkNvbnRlbnRcIiksXHJcblx0XHRcdFx0d2lkdGg6IHRoaXMuY29uZmlnLmNvbHVtbldpZHRocy5jb250ZW50IHx8IDMwMCxcclxuXHRcdFx0XHRzb3J0YWJsZTogdGhpcy5jb25maWcuc29ydGFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHJlc2l6YWJsZTogdGhpcy5jb25maWcucmVzaXphYmxlQ29sdW1ucyxcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcImNvbnRlbnRcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiUHJpb3JpdHlcIiksXHJcblx0XHRcdFx0d2lkdGg6IHRoaXMuY29uZmlnLmNvbHVtbldpZHRocy5wcmlvcml0eSB8fCAxMDAsXHJcblx0XHRcdFx0c29ydGFibGU6IHRoaXMuY29uZmlnLnNvcnRhYmxlQ29sdW1ucyxcclxuXHRcdFx0XHRyZXNpemFibGU6IHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0dHlwZTogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwicHJpb3JpdHlcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJkdWVEYXRlXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJEdWUgRGF0ZVwiKSxcclxuXHRcdFx0XHR3aWR0aDogdGhpcy5jb25maWcuY29sdW1uV2lkdGhzLmR1ZURhdGUgfHwgMTIwLFxyXG5cdFx0XHRcdHNvcnRhYmxlOiB0aGlzLmNvbmZpZy5zb3J0YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0cmVzaXphYmxlOiB0aGlzLmNvbmZpZy5yZXNpemFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwiZHVlRGF0ZVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcInN0YXJ0RGF0ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiU3RhcnQgRGF0ZVwiKSxcclxuXHRcdFx0XHR3aWR0aDogdGhpcy5jb25maWcuY29sdW1uV2lkdGhzLnN0YXJ0RGF0ZSB8fCAxMjAsXHJcblx0XHRcdFx0c29ydGFibGU6IHRoaXMuY29uZmlnLnNvcnRhYmxlQ29sdW1ucyxcclxuXHRcdFx0XHRyZXNpemFibGU6IHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJzdGFydERhdGVcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJTY2hlZHVsZWQgRGF0ZVwiKSxcclxuXHRcdFx0XHR3aWR0aDogdGhpcy5jb25maWcuY29sdW1uV2lkdGhzLnNjaGVkdWxlZERhdGUgfHwgMTIwLFxyXG5cdFx0XHRcdHNvcnRhYmxlOiB0aGlzLmNvbmZpZy5zb3J0YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0cmVzaXphYmxlOiB0aGlzLmNvbmZpZy5yZXNpemFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHR5cGU6IFwiZGF0ZVwiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwic2NoZWR1bGVkRGF0ZVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImNyZWF0ZWREYXRlXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJDcmVhdGVkIERhdGVcIiksXHJcblx0XHRcdFx0d2lkdGg6IHRoaXMuY29uZmlnLmNvbHVtbldpZHRocy5jcmVhdGVkRGF0ZSB8fCAxMjAsXHJcblx0XHRcdFx0c29ydGFibGU6IHRoaXMuY29uZmlnLnNvcnRhYmxlQ29sdW1ucyxcclxuXHRcdFx0XHRyZXNpemFibGU6IHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJjcmVhdGVkRGF0ZVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIkNvbXBsZXRlZCBEYXRlXCIpLFxyXG5cdFx0XHRcdHdpZHRoOiB0aGlzLmNvbmZpZy5jb2x1bW5XaWR0aHMuY29tcGxldGVkRGF0ZSB8fCAxMjAsXHJcblx0XHRcdFx0c29ydGFibGU6IHRoaXMuY29uZmlnLnNvcnRhYmxlQ29sdW1ucyxcclxuXHRcdFx0XHRyZXNpemFibGU6IHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0dHlwZTogXCJkYXRlXCIsXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJjb21wbGV0ZWREYXRlXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwidGFnc1wiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiVGFnc1wiKSxcclxuXHRcdFx0XHR3aWR0aDogdGhpcy5jb25maWcuY29sdW1uV2lkdGhzLnRhZ3MgfHwgMTUwLFxyXG5cdFx0XHRcdHNvcnRhYmxlOiB0aGlzLmNvbmZpZy5zb3J0YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0cmVzaXphYmxlOiB0aGlzLmNvbmZpZy5yZXNpemFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHR5cGU6IFwidGFnc1wiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwidGFnc1wiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcInByb2plY3RcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIlByb2plY3RcIiksXHJcblx0XHRcdFx0d2lkdGg6IHRoaXMuY29uZmlnLmNvbHVtbldpZHRocy5wcm9qZWN0IHx8IDE1MCxcclxuXHRcdFx0XHRzb3J0YWJsZTogdGhpcy5jb25maWcuc29ydGFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHJlc2l6YWJsZTogdGhpcy5jb25maWcucmVzaXphYmxlQ29sdW1ucyxcclxuXHRcdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcInByb2plY3RcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJjb250ZXh0XCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJDb250ZXh0XCIpLFxyXG5cdFx0XHRcdHdpZHRoOiB0aGlzLmNvbmZpZy5jb2x1bW5XaWR0aHMuY29udGV4dCB8fCAxMjAsXHJcblx0XHRcdFx0c29ydGFibGU6IHRoaXMuY29uZmlnLnNvcnRhYmxlQ29sdW1ucyxcclxuXHRcdFx0XHRyZXNpemFibGU6IHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0dHlwZTogXCJ0ZXh0XCIsXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJjb250ZXh0XCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwicmVjdXJyZW5jZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiUmVjdXJyZW5jZVwiKSxcclxuXHRcdFx0XHR3aWR0aDogdGhpcy5jb25maWcuY29sdW1uV2lkdGhzLnJlY3VycmVuY2UgfHwgMTIwLFxyXG5cdFx0XHRcdHNvcnRhYmxlOiB0aGlzLmNvbmZpZy5zb3J0YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0cmVzaXphYmxlOiB0aGlzLmNvbmZpZy5yZXNpemFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwicmVjdXJyZW5jZVwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImZpbGVQYXRoXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJGaWxlXCIpLFxyXG5cdFx0XHRcdHdpZHRoOiB0aGlzLmNvbmZpZy5jb2x1bW5XaWR0aHMuZmlsZVBhdGggfHwgMjAwLFxyXG5cdFx0XHRcdHNvcnRhYmxlOiB0aGlzLmNvbmZpZy5zb3J0YWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0cmVzaXphYmxlOiB0aGlzLmNvbmZpZy5yZXNpemFibGVDb2x1bW5zLFxyXG5cdFx0XHRcdHR5cGU6IFwidGV4dFwiLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwiZmlsZVBhdGhcIiksXHJcblx0XHRcdH0sXHJcblx0XHRdO1xyXG5cclxuXHRcdHRoaXMuY29sdW1ucyA9IGFsbENvbHVtbnMuZmlsdGVyKChjb2wpID0+IGNvbC52aXNpYmxlKTtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMuY3JlYXRlVGFibGVTdHJ1Y3R1cmUoKTtcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZUNoaWxkQ29tcG9uZW50cygpO1xyXG5cdFx0dGhpcy5zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0YWJsZSBoZWFkZXIgd2l0aCBjdXJyZW50IHN0YXRlXHJcblx0XHR0aGlzLnVwZGF0ZVRhYmxlSGVhZGVySW5mbygpO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHR0aGlzLmNsZWFudXAoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlVGFibGVTdHJ1Y3R1cmUoKSB7XHJcblx0XHR0aGlzLmNvbnRhaW5lckVsID0gdGhpcy5wYXJlbnRFbC5jcmVhdGVEaXYoXCJ0YXNrLXRhYmxlLWNvbnRhaW5lclwiKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGFibGUgaGVhZGVyIGJhciAobm90IHRoZSB0YWJsZSBoZWFkZXIpXHJcblx0XHR0aGlzLnRhYmxlSGVhZGVyID0gbmV3IFRhYmxlSGVhZGVyKHRoaXMuY29udGFpbmVyRWwsIHtcclxuXHRcdFx0b25UcmVlTW9kZVRvZ2dsZTogKGVuYWJsZWQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0XHR0aGlzLmlzVHJlZVZpZXcgPSBlbmFibGVkO1xyXG5cdFx0XHRcdHRoaXMuY29uZmlnLmVuYWJsZVRyZWVWaWV3ID0gZW5hYmxlZDtcclxuXHRcdFx0XHR0aGlzLnJlZnJlc2hEaXNwbGF5KCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdG9uUmVmcmVzaDogKCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMucmVmcmVzaERhdGEoKTtcclxuXHRcdFx0fSxcclxuXHRcdFx0b25Db2x1bW5Ub2dnbGU6IChjb2x1bW5JZDogc3RyaW5nLCB2aXNpYmxlOiBib29sZWFuKSA9PiB7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVDb2x1bW5WaXNpYmlsaXR5KGNvbHVtbklkLCB2aXNpYmxlKTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnRhYmxlSGVhZGVyKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGFibGUgd3JhcHBlciBmb3IgcHJvcGVyIHNjcm9sbGluZ1xyXG5cdFx0dGhpcy50YWJsZVdyYXBwZXIgPSB0aGlzLmNvbnRhaW5lckVsLmNyZWF0ZURpdihcInRhc2stdGFibGUtd3JhcHBlclwiKTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGFibGUgZWxlbWVudFxyXG5cdFx0dGhpcy50YWJsZUVsID0gdGhpcy50YWJsZVdyYXBwZXIuY3JlYXRlRWwoXCJ0YWJsZVwiLCBcInRhc2stdGFibGVcIik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGhlYWRlclxyXG5cdFx0dGhpcy5oZWFkZXJFbCA9IHRoaXMudGFibGVFbC5jcmVhdGVFbChcInRoZWFkXCIsIFwidGFzay10YWJsZS1oZWFkZXJcIik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGJvZHlcclxuXHRcdHRoaXMuYm9keUVsID0gdGhpcy50YWJsZUVsLmNyZWF0ZUVsKFwidGJvZHlcIiwgXCJ0YXNrLXRhYmxlLWJvZHlcIik7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGxvYWRpbmcgaW5kaWNhdG9yXHJcblx0XHR0aGlzLmxvYWRpbmdFbCA9IHRoaXMudGFibGVXcmFwcGVyLmNyZWF0ZURpdihcInRhc2stdGFibGUtbG9hZGluZ1wiKTtcclxuXHRcdHRoaXMubG9hZGluZ0VsLnRleHRDb250ZW50ID0gdChcIkxvYWRpbmcuLi5cIik7XHJcblx0XHR0aGlzLmxvYWRpbmdFbC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGluaXRpYWxpemVDaGlsZENvbXBvbmVudHMoKSB7XHJcblx0XHQvLyBJbml0aWFsaXplIHJlbmRlcmVyXHJcblx0XHR0aGlzLnJlbmRlcmVyID0gbmV3IFRhYmxlUmVuZGVyZXIoXHJcblx0XHRcdHRoaXMudGFibGVFbCxcclxuXHRcdFx0dGhpcy5oZWFkZXJFbCxcclxuXHRcdFx0dGhpcy5ib2R5RWwsXHJcblx0XHRcdHRoaXMuY29sdW1ucyxcclxuXHRcdFx0dGhpcy5jb25maWcsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5yZW5kZXJlcik7XHJcblxyXG5cdFx0Ly8gU2V0IHVwIGRhdGUgY2hhbmdlIGNhbGxiYWNrXHJcblx0XHR0aGlzLnJlbmRlcmVyLm9uRGF0ZUNoYW5nZSA9IChcclxuXHRcdFx0cm93SWQ6IHN0cmluZyxcclxuXHRcdFx0Y29sdW1uSWQ6IHN0cmluZyxcclxuXHRcdFx0bmV3RGF0ZTogc3RyaW5nIHwgbnVsbFxyXG5cdFx0KSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlRGF0ZUNoYW5nZShyb3dJZCwgY29sdW1uSWQsIG5ld0RhdGUpO1xyXG5cdFx0fTtcclxuXHJcblx0XHQvLyBTZXQgdXAgcm93IGV4cGFuc2lvbiBjYWxsYmFja1xyXG5cdFx0dGhpcy5yZW5kZXJlci5vblJvd0V4cGFuZCA9IChyb3dJZDogc3RyaW5nKSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlUm93RXhwYW5zaW9uKHJvd0lkKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gU2V0IHVwIGNlbGwgY2hhbmdlIGNhbGxiYWNrXHJcblx0XHR0aGlzLnJlbmRlcmVyLm9uQ2VsbENoYW5nZSA9IChcclxuXHRcdFx0cm93SWQ6IHN0cmluZyxcclxuXHRcdFx0Y29sdW1uSWQ6IHN0cmluZyxcclxuXHRcdFx0bmV3VmFsdWU6IGFueVxyXG5cdFx0KSA9PiB7XHJcblx0XHRcdHRoaXMuaGFuZGxlQ2VsbENoYW5nZShyb3dJZCwgY29sdW1uSWQsIG5ld1ZhbHVlKTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSBlZGl0b3IgaWYgaW5saW5lIGVkaXRpbmcgaXMgZW5hYmxlZFxyXG5cdFx0aWYgKHRoaXMuY29uZmlnLmVuYWJsZUlubGluZUVkaXRpbmcpIHtcclxuXHRcdFx0dGhpcy5lZGl0b3IgPSBuZXcgVGFibGVFZGl0b3IodGhpcy5hcHAsIHRoaXMucGx1Z2luLCB0aGlzLmNvbmZpZywge1xyXG5cdFx0XHRcdG9uQ2VsbEVkaXQ6IHRoaXMuaGFuZGxlQ2VsbEVkaXQuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvbkVkaXRDb21wbGV0ZTogdGhpcy5oYW5kbGVFZGl0Q29tcGxldGUuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRvbkVkaXRDYW5jZWw6IHRoaXMuaGFuZGxlRWRpdENhbmNlbC5iaW5kKHRoaXMpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmVkaXRvcik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0cmVlIG1hbmFnZXIgaWYgdHJlZSB2aWV3IGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5lbmFibGVUcmVlVmlldykge1xyXG5cdFx0XHR0aGlzLnRyZWVNYW5hZ2VyID0gbmV3IFRyZWVNYW5hZ2VyKFxyXG5cdFx0XHRcdHRoaXMuY29sdW1ucyxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKHRoaXMudHJlZU1hbmFnZXIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgdmlydHVhbCBzY3JvbGwgaWYgbGF6eSBsb2FkaW5nIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLmNvbmZpZy5lbmFibGVMYXp5TG9hZGluZykge1xyXG5cdFx0XHR0aGlzLnZpcnR1YWxTY3JvbGwgPSBuZXcgVmlydHVhbFNjcm9sbE1hbmFnZXIoXHJcblx0XHRcdFx0dGhpcy50YWJsZVdyYXBwZXIsXHJcblx0XHRcdFx0dGhpcy5jb25maWcucGFnZVNpemUsXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0b25Mb2FkTW9yZTogdGhpcy5sb2FkTW9yZVJvd3MuYmluZCh0aGlzKSxcclxuXHRcdFx0XHRcdG9uU2Nyb2xsOiB0aGlzLmhhbmRsZVNjcm9sbC5iaW5kKHRoaXMpLFxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnZpcnR1YWxTY3JvbGwpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZXR1cEV2ZW50TGlzdGVuZXJzKCkge1xyXG5cdFx0Ly8gVGFibGUgY2xpY2sgZXZlbnRzXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMudGFibGVFbCxcclxuXHRcdFx0XCJjbGlja1wiLFxyXG5cdFx0XHR0aGlzLmhhbmRsZVRhYmxlQ2xpY2suYmluZCh0aGlzKVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0dGhpcy50YWJsZUVsLFxyXG5cdFx0XHRcImRibGNsaWNrXCIsXHJcblx0XHRcdHRoaXMuaGFuZGxlVGFibGVEb3VibGVDbGljay5iaW5kKHRoaXMpXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHR0aGlzLnRhYmxlRWwsXHJcblx0XHRcdFwiY29udGV4dG1lbnVcIixcclxuXHRcdFx0dGhpcy5oYW5kbGVUYWJsZUNvbnRleHRNZW51LmJpbmQodGhpcylcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gS2V5Ym9hcmQgZXZlbnRzXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdHRoaXMuY29udGFpbmVyRWwsXHJcblx0XHRcdFwia2V5ZG93blwiLFxyXG5cdFx0XHR0aGlzLmhhbmRsZUtleURvd24uYmluZCh0aGlzKVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBIZWFkZXIgZXZlbnRzIGZvciBzb3J0aW5nIGFuZCByZXNpemluZ1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHR0aGlzLmhlYWRlckVsLFxyXG5cdFx0XHRcImNsaWNrXCIsXHJcblx0XHRcdHRoaXMuaGFuZGxlSGVhZGVyQ2xpY2suYmluZCh0aGlzKVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0aGUgdGFibGUgd2l0aCBuZXcgdGFzayBkYXRhXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVRhc2tzKHRhc2tzOiBUYXNrW10pIHtcclxuXHRcdHRoaXMuYWxsVGFza3MgPSB0YXNrcztcclxuXHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kU29ydCgpO1xyXG5cdFx0dGhpcy5yZWZyZXNoRGlzcGxheSgpO1xyXG5cdFx0dGhpcy51cGRhdGVUYWJsZUhlYWRlckluZm8oKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZvcmNlIGEgY29tcGxldGUgdGFibGUgcmVmcmVzaCAtIHVzZWZ1bCB3aGVuIHNvcnRpbmcgaXNzdWVzIGFyZSBkZXRlY3RlZFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBmb3JjZVJlZnJlc2goKSB7XHJcblx0XHQvLyBDbGVhciBhbGwgY2FjaGVkIHJvd3MgYW5kIGZvcmNlIGNvbXBsZXRlIHJlLXJlbmRlclxyXG5cdFx0aWYgKHRoaXMucmVuZGVyZXIpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJlci5mb3JjZUNsZWFyQ2FjaGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZXNldCB2aXJ0dWFsIHNjcm9sbCBpZiBlbmFibGVkXHJcblx0XHRpZiAodGhpcy52aXJ0dWFsU2Nyb2xsKSB7XHJcblx0XHRcdHRoaXMudmlydHVhbFNjcm9sbC5yZXNldCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENsZWFyIHNlbGVjdGlvbnNcclxuXHRcdHRoaXMuc2VsZWN0ZWRSb3dzLmNsZWFyKCk7XHJcblxyXG5cdFx0Ly8gUmUtYXBwbHkgc29ydGluZyBhbmQgcmVmcmVzaFxyXG5cdFx0dGhpcy5hcHBseUZpbHRlcnNBbmRTb3J0KCk7XHJcblx0XHR0aGlzLnJlZnJlc2hEaXNwbGF5KCk7XHJcblx0XHR0aGlzLnVwZGF0ZVNvcnRJbmRpY2F0b3JzKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBcHBseSBjdXJyZW50IGZpbHRlcnMgYW5kIHNvcnRpbmcgdG8gdGhlIHRhc2sgbGlzdFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXBwbHlGaWx0ZXJzQW5kU29ydCgpIHtcclxuXHRcdC8vIEFwcGx5IGFueSBhZGRpdGlvbmFsIGZpbHRlcnMgaGVyZSBpZiBuZWVkZWRcclxuXHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IFsuLi50aGlzLmFsbFRhc2tzXTtcclxuXHJcblx0XHQvLyBTb3J0IHRhc2tzIHVzaW5nIHRoZSBjZW50cmFsaXplZCBzb3J0aW5nIGZ1bmN0aW9uXHJcblx0XHRpZiAodGhpcy5jdXJyZW50U29ydEZpZWxkKSB7XHJcblx0XHRcdGNvbnN0IHNvcnRDcml0ZXJpYTogU29ydENyaXRlcmlvbltdID0gW1xyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGZpZWxkOiB0aGlzLmN1cnJlbnRTb3J0RmllbGQgYXMgU29ydENyaXRlcmlvbltcImZpZWxkXCJdLFxyXG5cdFx0XHRcdFx0b3JkZXI6IHRoaXMuY3VycmVudFNvcnRPcmRlcixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRdO1xyXG5cdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MgPSBzb3J0VGFza3MoXHJcblx0XHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzLFxyXG5cdFx0XHRcdHNvcnRDcml0ZXJpYSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5nc1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJzb3J0IHRhc2tzXCIsIHRoaXMuZmlsdGVyZWRUYXNrcywgc29ydENyaXRlcmlhKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKHRoaXMuZmlsdGVyZWRUYXNrcyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZWZyZXNoIHRoZSB0YWJsZSBkaXNwbGF5XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZWZyZXNoRGlzcGxheSgpIHtcclxuXHRcdC8vIEVuc3VyZSB0cmVlIG1hbmFnZXIgaXMgaW5pdGlhbGl6ZWQgaWYgd2UncmUgaW4gdHJlZSB2aWV3XHJcblx0XHRpZiAodGhpcy5pc1RyZWVWaWV3ICYmICF0aGlzLnRyZWVNYW5hZ2VyKSB7XHJcblx0XHRcdHRoaXMudHJlZU1hbmFnZXIgPSBuZXcgVHJlZU1hbmFnZXIoXHJcblx0XHRcdFx0dGhpcy5jb2x1bW5zLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzXHJcblx0XHRcdCk7XHJcblx0XHRcdHRoaXMuYWRkQ2hpbGQodGhpcy50cmVlTWFuYWdlcik7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKHRoaXMuaXNUcmVlVmlldyAmJiB0aGlzLnRyZWVNYW5hZ2VyKSB7XHJcblx0XHRcdC8vIFBhc3MgY3VycmVudCBzb3J0IHBhcmFtZXRlcnMgdG8gdHJlZSBtYW5hZ2VyXHJcblx0XHRcdHRoaXMuZGlzcGxheWVkUm93cyA9IHRoaXMudHJlZU1hbmFnZXIuYnVpbGRUcmVlUm93cyhcclxuXHRcdFx0XHR0aGlzLmZpbHRlcmVkVGFza3MsXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50U29ydEZpZWxkLFxyXG5cdFx0XHRcdHRoaXMuY3VycmVudFNvcnRPcmRlclxyXG5cdFx0XHQpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy5kaXNwbGF5ZWRSb3dzID0gdGhpcy5idWlsZEZsYXRSb3dzKHRoaXMuZmlsdGVyZWRUYXNrcyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2xlYXIgYW55IGV4aXN0aW5nIHNlbGVjdGlvbiB0aGF0IG1pZ2h0IGJlIGludmFsaWQgYWZ0ZXIgc29ydGluZ1xyXG5cdFx0dGhpcy5zZWxlY3RlZFJvd3MuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBJZiB2aXJ0dWFsIHNjcm9sbGluZyBpcyBlbmFibGVkIGFuZCB3ZSBoYXZlIG1hbnkgcm93cywgdXNlIHZpcnR1YWwgcmVuZGVyaW5nXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMudmlydHVhbFNjcm9sbCAmJlxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZFJvd3MubGVuZ3RoID4gdGhpcy5jb25maWcucGFnZVNpemVcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLnZpcnR1YWxTY3JvbGwudXBkYXRlQ29udGVudCh0aGlzLmRpc3BsYXllZFJvd3MubGVuZ3RoKTtcclxuXHRcdFx0Y29uc3Qgdmlld3BvcnQgPSB0aGlzLnZpcnR1YWxTY3JvbGwuZ2V0Vmlld3BvcnQoKTtcclxuXHRcdFx0Y29uc3QgdmlzaWJsZVJvd3MgPSB0aGlzLmRpc3BsYXllZFJvd3Muc2xpY2UoXHJcblx0XHRcdFx0dmlld3BvcnQuc3RhcnRJbmRleCxcclxuXHRcdFx0XHR2aWV3cG9ydC5lbmRJbmRleCArIDFcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5yZW5kZXJlci5yZW5kZXJUYWJsZShcclxuXHRcdFx0XHR2aXNpYmxlUm93cyxcclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkUm93cyxcclxuXHRcdFx0XHR2aWV3cG9ydC5zdGFydEluZGV4LFxyXG5cdFx0XHRcdHRoaXMuZGlzcGxheWVkUm93cy5sZW5ndGhcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFJlbmRlciBhbGwgcm93cyBub3JtYWxseVxyXG5cdFx0XHR0aGlzLnJlbmRlcmVyLnJlbmRlclRhYmxlKHRoaXMuZGlzcGxheWVkUm93cywgdGhpcy5zZWxlY3RlZFJvd3MpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQnVpbGQgZmxhdCB0YWJsZSByb3dzIGZyb20gdGFza3NcclxuXHQgKi9cclxuXHRwcml2YXRlIGJ1aWxkRmxhdFJvd3ModGFza3M6IFRhc2tbXSk6IFRhYmxlUm93W10ge1xyXG5cdFx0cmV0dXJuIHRhc2tzLm1hcCgodGFzaywgaW5kZXgpID0+ICh7XHJcblx0XHRcdGlkOiB0YXNrLmlkLFxyXG5cdFx0XHR0YXNrOiB0YXNrLFxyXG5cdFx0XHRsZXZlbDogMCxcclxuXHRcdFx0ZXhwYW5kZWQ6IGZhbHNlLFxyXG5cdFx0XHRoYXNDaGlsZHJlbjogZmFsc2UsXHJcblx0XHRcdGNlbGxzOiB0aGlzLmJ1aWxkQ2VsbHNGb3JUYXNrKHRhc2ssIGluZGV4ICsgMSksXHJcblx0XHR9KSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBCdWlsZCB0YWJsZSBjZWxscyBmb3IgYSB0YXNrXHJcblx0ICovXHJcblx0cHJpdmF0ZSBidWlsZENlbGxzRm9yVGFzayh0YXNrOiBUYXNrLCByb3dOdW1iZXI6IG51bWJlcik6IFRhYmxlQ2VsbFtdIHtcclxuXHRcdHJldHVybiB0aGlzLmNvbHVtbnMubWFwKChjb2x1bW4pID0+IHtcclxuXHRcdFx0bGV0IHZhbHVlOiBhbnk7XHJcblx0XHRcdGxldCBkaXNwbGF5VmFsdWU6IHN0cmluZztcclxuXHJcblx0XHRcdHN3aXRjaCAoY29sdW1uLmlkKSB7XHJcblx0XHRcdFx0Y2FzZSBcInJvd051bWJlclwiOlxyXG5cdFx0XHRcdFx0dmFsdWUgPSByb3dOdW1iZXI7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSByb3dOdW1iZXIudG9TdHJpbmcoKTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJzdGF0dXNcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5zdGF0dXM7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0aGlzLmZvcm1hdFN0YXR1cyh0YXNrLnN0YXR1cyk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY29udGVudFwiOlxyXG5cdFx0XHRcdFx0dmFsdWUgPSB0YXNrLmNvbnRlbnQ7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0YXNrLmNvbnRlbnQ7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRcdGNvbnN0IG1ldGFkYXRhID0gdGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdFx0XHRcdHZhbHVlID0gbWV0YWRhdGEucHJpb3JpdHk7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0aGlzLmZvcm1hdFByaW9yaXR5KG1ldGFkYXRhLnByaW9yaXR5KTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhZGF0YUR1ZSA9IHRhc2subWV0YWRhdGEgfHwge307XHJcblx0XHRcdFx0XHR2YWx1ZSA9IG1ldGFkYXRhRHVlLmR1ZURhdGU7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0aGlzLmZvcm1hdERhdGUobWV0YWRhdGFEdWUuZHVlRGF0ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0XHRjb25zdCBtZXRhZGF0YVN0YXJ0ID0gdGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdFx0XHRcdHZhbHVlID0gbWV0YWRhdGFTdGFydC5zdGFydERhdGU7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0aGlzLmZvcm1hdERhdGUobWV0YWRhdGFTdGFydC5zdGFydERhdGUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHRcdGNvbnN0IG1ldGFkYXRhU2NoZWR1bGVkID0gdGFzay5tZXRhZGF0YSB8fCB7fTtcclxuXHRcdFx0XHRcdHZhbHVlID0gbWV0YWRhdGFTY2hlZHVsZWQuc2NoZWR1bGVkRGF0ZTtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IHRoaXMuZm9ybWF0RGF0ZShcclxuXHRcdFx0XHRcdFx0bWV0YWRhdGFTY2hlZHVsZWQuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJjcmVhdGVkRGF0ZVwiOlxyXG5cdFx0XHRcdFx0dmFsdWUgPSB0YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGhpcy5mb3JtYXREYXRlKHRhc2subWV0YWRhdGEuY3JlYXRlZERhdGUpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImNvbXBsZXRlZERhdGVcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5tZXRhZGF0YS5jb21wbGV0ZWREYXRlO1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGhpcy5mb3JtYXREYXRlKHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdFx0dmFsdWUgPSB0YXNrLm1ldGFkYXRhLnRhZ3M7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0YXNrLm1ldGFkYXRhLnRhZ3M/LmpvaW4oXCIsIFwiKSB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdHZhbHVlID0gdGFzay5tZXRhZGF0YS5wcm9qZWN0O1xyXG5cdFx0XHRcdFx0ZGlzcGxheVZhbHVlID0gdGFzay5tZXRhZGF0YS5wcm9qZWN0IHx8IFwiXCI7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdFx0dmFsdWUgPSB0YXNrLm1ldGFkYXRhLmNvbnRleHQ7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0YXNrLm1ldGFkYXRhLmNvbnRleHQgfHwgXCJcIjtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGNhc2UgXCJyZWN1cnJlbmNlXCI6XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRhc2subWV0YWRhdGEucmVjdXJyZW5jZTtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IHRhc2subWV0YWRhdGEucmVjdXJyZW5jZSB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImZpbGVQYXRoXCI6XHJcblx0XHRcdFx0XHR2YWx1ZSA9IHRhc2suZmlsZVBhdGg7XHJcblx0XHRcdFx0XHRkaXNwbGF5VmFsdWUgPSB0aGlzLmZvcm1hdEZpbGVQYXRoKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdHZhbHVlID0gXCJcIjtcclxuXHRcdFx0XHRcdGRpc3BsYXlWYWx1ZSA9IFwiXCI7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0Y29sdW1uSWQ6IGNvbHVtbi5pZCxcclxuXHRcdFx0XHR2YWx1ZTogdmFsdWUsXHJcblx0XHRcdFx0ZGlzcGxheVZhbHVlOiBkaXNwbGF5VmFsdWUsXHJcblx0XHRcdFx0ZWRpdGFibGU6XHJcblx0XHRcdFx0XHRjb2x1bW4uaWQgIT09IFwicm93TnVtYmVyXCIgJiZcclxuXHRcdFx0XHRcdHRoaXMuY29uZmlnLmVuYWJsZUlubGluZUVkaXRpbmcsXHJcblx0XHRcdH07XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIEZvcm1hdHRpbmcgbWV0aG9kc1xyXG5cdHByaXZhdGUgZm9ybWF0U3RhdHVzKHN0YXR1czogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIENvbnZlcnQgc3RhdHVzIHN5bWJvbHMgdG8gcmVhZGFibGUgdGV4dFxyXG5cdFx0Y29uc3Qgc3RhdHVzTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG5cdFx0XHRcIiBcIjogdChcIk5vdCBTdGFydGVkXCIpLFxyXG5cdFx0XHR4OiB0KFwiQ29tcGxldGVkXCIpLFxyXG5cdFx0XHRYOiB0KFwiQ29tcGxldGVkXCIpLFxyXG5cdFx0XHRcIi9cIjogdChcIkluIFByb2dyZXNzXCIpLFxyXG5cdFx0XHRcIj5cIjogdChcIkluIFByb2dyZXNzXCIpLFxyXG5cdFx0XHRcIi1cIjogdChcIkFiYW5kb25lZFwiKSxcclxuXHRcdFx0XCI/XCI6IHQoXCJQbGFubmVkXCIpLFxyXG5cdFx0fTtcclxuXHRcdHJldHVybiBzdGF0dXNNYXBbc3RhdHVzXSB8fCBzdGF0dXM7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdFByaW9yaXR5KHByaW9yaXR5PzogbnVtYmVyKTogc3RyaW5nIHtcclxuXHRcdGlmICghcHJpb3JpdHkpIHJldHVybiBcIlwiO1xyXG5cdFx0Y29uc3QgcHJpb3JpdHlNYXA6IFJlY29yZDxudW1iZXIsIHN0cmluZz4gPSB7XHJcblx0XHRcdDU6IHQoXCJIaWdoZXN0XCIpLFxyXG5cdFx0XHQ0OiB0KFwiSGlnaFwiKSxcclxuXHRcdFx0MzogdChcIk1lZGl1bVwiKSxcclxuXHRcdFx0MjogdChcIkxvd1wiKSxcclxuXHRcdFx0MTogdChcIkxvd2VzdFwiKSxcclxuXHRcdH07XHJcblx0XHRyZXR1cm4gcHJpb3JpdHlNYXBbcHJpb3JpdHldIHx8IHByaW9yaXR5LnRvU3RyaW5nKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGZvcm1hdERhdGUodGltZXN0YW1wPzogbnVtYmVyKTogc3RyaW5nIHtcclxuXHRcdGlmICghdGltZXN0YW1wKSByZXR1cm4gXCJcIjtcclxuXHRcdHJldHVybiBuZXcgRGF0ZSh0aW1lc3RhbXApLnRvTG9jYWxlRGF0ZVN0cmluZygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmb3JtYXRGaWxlUGF0aChmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIEV4dHJhY3QganVzdCB0aGUgZmlsZW5hbWVcclxuXHRcdGNvbnN0IHBhcnRzID0gZmlsZVBhdGguc3BsaXQoXCIvXCIpO1xyXG5cdFx0cmV0dXJuIHBhcnRzW3BhcnRzLmxlbmd0aCAtIDFdLnJlcGxhY2UoL1xcLm1kJC8sIFwiXCIpO1xyXG5cdH1cclxuXHJcblx0Ly8gRXZlbnQgaGFuZGxlcnNcclxuXHRwcml2YXRlIGhhbmRsZVRhYmxlQ2xpY2soZXZlbnQ6IE1vdXNlRXZlbnQpIHtcclxuXHRcdGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGNvbnN0IHJvdyA9IHRhcmdldC5jbG9zZXN0KFwidHJcIik7XHJcblx0XHRpZiAoIXJvdykgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHJvd0lkID0gcm93LmRhdGFzZXQucm93SWQ7XHJcblx0XHRpZiAoIXJvd0lkKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgdGFzayA9IHRoaXMuYWxsVGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gcm93SWQpO1xyXG5cdFx0aWYgKCF0YXNrKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gSGFuZGxlIHJvdyBzZWxlY3Rpb25cclxuXHRcdGlmICh0aGlzLmNvbmZpZy5lbmFibGVSb3dTZWxlY3Rpb24pIHtcclxuXHRcdFx0aWYgKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSkge1xyXG5cdFx0XHRcdC8vIE11bHRpLXNlbGVjdFxyXG5cdFx0XHRcdGlmICh0aGlzLmNvbmZpZy5lbmFibGVNdWx0aVNlbGVjdCkge1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuc2VsZWN0ZWRSb3dzLmhhcyhyb3dJZCkpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5zZWxlY3RlZFJvd3MuZGVsZXRlKHJvd0lkKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2VsZWN0ZWRSb3dzLmFkZChyb3dJZCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFNpbmdsZSBzZWxlY3RcclxuXHRcdFx0XHR0aGlzLnNlbGVjdGVkUm93cy5jbGVhcigpO1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0ZWRSb3dzLmFkZChyb3dJZCk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy51cGRhdGVSb3dTZWxlY3Rpb24oKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyDooajmoLzop4blm77kuI3oh6rliqjop6blj5Hku7vliqHpgInmi6nvvIzpgb/lhY3mmL7npLror6bmg4XpnaLmnb9cclxuXHRcdC8vIOWmguaenOmcgOimgeaYvuekuuivpuaDhe+8jOWPr+S7pemAmui/h+WPs+mUruiPnOWNleaIluWFtuS7luaWueW8j+inpuWPkVxyXG5cdFx0Ly8gaWYgKHRoaXMub25UYXNrU2VsZWN0ZWQpIHtcclxuXHRcdC8vIFx0dGhpcy5vblRhc2tTZWxlY3RlZCh0YXNrKTtcclxuXHRcdC8vIH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlVGFibGVEb3VibGVDbGljayhldmVudDogTW91c2VFdmVudCkge1xyXG5cdFx0Y29uc3QgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0Y29uc3QgY2VsbCA9IHRhcmdldC5jbG9zZXN0KFwidGRcIik7XHJcblx0XHRpZiAoIWNlbGwpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCByb3cgPSBjZWxsLmNsb3Nlc3QoXCJ0clwiKTtcclxuXHRcdGlmICghcm93KSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgcm93SWQgPSByb3cuZGF0YXNldC5yb3dJZDtcclxuXHRcdGNvbnN0IGNvbHVtbklkID0gY2VsbC5kYXRhc2V0LmNvbHVtbklkO1xyXG5cclxuXHRcdGlmIChyb3dJZCAmJiBjb2x1bW5JZCAmJiB0aGlzLmNvbmZpZy5lbmFibGVJbmxpbmVFZGl0aW5nKSB7XHJcblx0XHRcdHRoaXMuc3RhcnRDZWxsRWRpdChyb3dJZCwgY29sdW1uSWQsIGNlbGwpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVUYWJsZUNvbnRleHRNZW51KGV2ZW50OiBNb3VzZUV2ZW50KSB7XHJcblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuXHRcdGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGNvbnN0IHJvdyA9IHRhcmdldC5jbG9zZXN0KFwidHJcIik7XHJcblx0XHRpZiAoIXJvdykgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHJvd0lkID0gcm93LmRhdGFzZXQucm93SWQ7XHJcblx0XHRpZiAoIXJvd0lkKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgdGFzayA9IHRoaXMuYWxsVGFza3MuZmluZCgodCkgPT4gdC5pZCA9PT0gcm93SWQpO1xyXG5cdFx0aWYgKCF0YXNrKSByZXR1cm47XHJcblxyXG5cdFx0Ly8g6LCD55So5Y6f5pyJ55qE5LiK5LiL5paH6I+c5Y2V5Zue6LCDXHJcblx0XHRpZiAodGhpcy5vblRhc2tDb250ZXh0TWVudSkge1xyXG5cdFx0XHR0aGlzLm9uVGFza0NvbnRleHRNZW51KGV2ZW50LCB0YXNrKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlSGVhZGVyQ2xpY2soZXZlbnQ6IE1vdXNlRXZlbnQpIHtcclxuXHRcdGNvbnN0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuXHJcblx0XHQvLyBEb24ndCBoYW5kbGUgc29ydCBpZiB3ZSdyZSByZXNpemluZyBvciBjbGlja2luZyBvbiBhIHJlc2l6ZSBoYW5kbGVcclxuXHRcdGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKFwidGFzay10YWJsZS1yZXNpemUtaGFuZGxlXCIpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBoZWFkZXIgPSB0YXJnZXQuY2xvc2VzdChcInRoXCIpO1xyXG5cdFx0aWYgKCFoZWFkZXIpIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoZSB0YWJsZSBpcyBjdXJyZW50bHkgYmVpbmcgcmVzaXplZFxyXG5cdFx0aWYgKHRoaXMudGFibGVFbC5jbGFzc0xpc3QuY29udGFpbnMoXCJyZXNpemluZ1wiKSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY29sdW1uSWQgPSBoZWFkZXIuZGF0YXNldC5jb2x1bW5JZDtcclxuXHRcdGlmICghY29sdW1uSWQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBjb2x1bW4gPSB0aGlzLmNvbHVtbnMuZmluZCgoYykgPT4gYy5pZCA9PT0gY29sdW1uSWQpO1xyXG5cdFx0aWYgKCFjb2x1bW4gfHwgIWNvbHVtbi5zb3J0YWJsZSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSGFuZGxlIHNvcnRpbmcgbG9naWNcclxuXHRcdGlmICh0aGlzLmN1cnJlbnRTb3J0RmllbGQgPT09IGNvbHVtbklkKSB7XHJcblx0XHRcdC8vIFNhbWUgY29sdW1uIGNsaWNrZWQgLSBjeWNsZSB0aHJvdWdoOiBhc2MgLT4gZGVzYyAtPiBubyBzb3J0XHJcblx0XHRcdGlmICh0aGlzLmN1cnJlbnRTb3J0T3JkZXIgPT09IFwiYXNjXCIpIHtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRTb3J0T3JkZXIgPSBcImRlc2NcIjtcclxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLmN1cnJlbnRTb3J0T3JkZXIgPT09IFwiZGVzY1wiKSB7XHJcblx0XHRcdFx0Ly8gVGhpcmQgY2xpY2s6IGNsZWFyIHNvcnRpbmdcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRTb3J0RmllbGQgPSBcIlwiO1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFNvcnRPcmRlciA9IFwiYXNjXCI7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIERpZmZlcmVudCBjb2x1bW4gY2xpY2tlZCAtIGNsZWFyIHByZXZpb3VzIHNvcnRpbmcgYW5kIHN0YXJ0IHdpdGggYXNjXHJcblx0XHRcdHRoaXMuY3VycmVudFNvcnRGaWVsZCA9IGNvbHVtbklkO1xyXG5cdFx0XHR0aGlzLmN1cnJlbnRTb3J0T3JkZXIgPSBcImFzY1wiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlc2V0IHZpcnR1YWwgc2Nyb2xsIHN0YXRlIHdoZW4gc29ydGluZyBjaGFuZ2VzIHRvIGVuc3VyZSBwcm9wZXIgcmUtcmVuZGVyaW5nXHJcblx0XHRpZiAodGhpcy52aXJ0dWFsU2Nyb2xsKSB7XHJcblx0XHRcdHRoaXMudmlydHVhbFNjcm9sbC5yZXNldCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuYXBwbHlGaWx0ZXJzQW5kU29ydCgpO1xyXG5cdFx0dGhpcy5yZWZyZXNoRGlzcGxheSgpO1xyXG5cdFx0dGhpcy51cGRhdGVTb3J0SW5kaWNhdG9ycygpO1xyXG5cclxuXHRcdC8vIERlYnVnIGxvZ2dpbmcgdG8gaGVscCBpZGVudGlmeSBzb3J0aW5nIGlzc3Vlc1xyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBUYWJsZSBzb3J0ZWQgYnkgJHt0aGlzLmN1cnJlbnRTb3J0RmllbGR9ICgke3RoaXMuY3VycmVudFNvcnRPcmRlcn0pYFxyXG5cdFx0KTtcclxuXHRcdGNvbnNvbGUubG9nKGBGaWx0ZXJlZCB0YXNrcyBjb3VudDogJHt0aGlzLmZpbHRlcmVkVGFza3MubGVuZ3RofWApO1xyXG5cdFx0Y29uc29sZS5sb2coYERpc3BsYXllZCByb3dzIGNvdW50OiAke3RoaXMuZGlzcGxheWVkUm93cy5sZW5ndGh9YCk7XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2s6IElmIHRoZSB0YWJsZSBkb2Vzbid0IHNlZW0gdG8gYmUgdXBkYXRpbmcgcHJvcGVybHksIGZvcmNlIGEgY29tcGxldGUgcmVmcmVzaFxyXG5cdFx0Ly8gVGhpcyBpcyBhIHNhZmV0eSBuZXQgZm9yIGFueSBlZGdlIGNhc2VzIGluIHRoZSByZW5kZXJpbmcgbG9naWNcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjdXJyZW50Um93Q291bnQgPVxyXG5cdFx0XHRcdHRoaXMuYm9keUVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJ0cltkYXRhLXJvdy1pZF1cIikubGVuZ3RoO1xyXG5cdFx0XHRjb25zdCBleHBlY3RlZFJvd0NvdW50ID0gdGhpcy5kaXNwbGF5ZWRSb3dzLmxlbmd0aDtcclxuXHJcblx0XHRcdGlmIChjdXJyZW50Um93Q291bnQgIT09IGV4cGVjdGVkUm93Q291bnQgJiYgZXhwZWN0ZWRSb3dDb3VudCA+IDApIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgVGFibGUgcm93IGNvdW50IG1pc21hdGNoIGRldGVjdGVkLiBFeHBlY3RlZDogJHtleHBlY3RlZFJvd0NvdW50fSwgQWN0dWFsOiAke2N1cnJlbnRSb3dDb3VudH0uIEZvcmNpbmcgcmVmcmVzaC5gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLmZvcmNlUmVmcmVzaCgpO1xyXG5cdFx0XHR9XHJcblx0XHR9LCAxMDApOyAvLyBTbWFsbCBkZWxheSB0byBhbGxvdyByZW5kZXJpbmcgdG8gY29tcGxldGVcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlS2V5RG93bihldmVudDogS2V5Ym9hcmRFdmVudCkge1xyXG5cdFx0Ly8gSGFuZGxlIGtleWJvYXJkIHNob3J0Y3V0c1xyXG5cdFx0aWYgKGV2ZW50LmtleSA9PT0gXCJFc2NhcGVcIiAmJiB0aGlzLmVkaXRpbmdDZWxsKSB7XHJcblx0XHRcdHRoaXMuY2FuY2VsQ2VsbEVkaXQoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlU2Nyb2xsID0gKCkgPT4ge1xyXG5cdFx0Ly8gQ2FuY2VsIGFueSBwZW5kaW5nIGFuaW1hdGlvbiBmcmFtZVxyXG5cdFx0aWYgKHRoaXMuc2Nyb2xsUkFGKSB7XHJcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuc2Nyb2xsUkFGKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVc2UgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIGZvciBzbW9vdGggc2Nyb2xsaW5nXHJcblx0XHR0aGlzLnNjcm9sbFJBRiA9IHJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XHJcblx0XHRcdC8vIEhhbmRsZSB2aXJ0dWFsIHNjcm9sbGluZyBvbmx5IGlmIGVuYWJsZWQgYW5kIG5lZWRlZFxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dGhpcy52aXJ0dWFsU2Nyb2xsICYmXHJcblx0XHRcdFx0dGhpcy5kaXNwbGF5ZWRSb3dzLmxlbmd0aCA+IHRoaXMuY29uZmlnLnBhZ2VTaXplXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSBzY3JvbGwgdmVsb2NpdHkgZm9yIHByZWRpY3RpdmUgcmVuZGVyaW5nXHJcblx0XHRcdFx0Y29uc3QgY3VycmVudFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0XHRjb25zdCBkZWx0YVRpbWUgPSBjdXJyZW50VGltZSAtIHRoaXMubGFzdFNjcm9sbFRpbWU7XHJcblxyXG5cdFx0XHRcdC8vIFJlbW92ZSB0aW1lLWJhc2VkIHRocm90dGxpbmcgZm9yIGltbWVkaWF0ZSByZXNwb25zaXZlbmVzc1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRTY3JvbGxUb3AgPSB0aGlzLnRhYmxlV3JhcHBlci5zY3JvbGxUb3A7XHJcblx0XHRcdFx0Y29uc3QgcHJldmlvdXNTY3JvbGxUb3AgPVxyXG5cdFx0XHRcdFx0dGhpcy52aXJ0dWFsU2Nyb2xsLmdldFZpZXdwb3J0KCkuc2Nyb2xsVG9wO1xyXG5cdFx0XHRcdHRoaXMuc2Nyb2xsVmVsb2NpdHkgPVxyXG5cdFx0XHRcdFx0KGN1cnJlbnRTY3JvbGxUb3AgLSBwcmV2aW91c1Njcm9sbFRvcCkgL1xyXG5cdFx0XHRcdFx0TWF0aC5tYXgoZGVsdGFUaW1lLCAxKTtcclxuXHRcdFx0XHR0aGlzLmxhc3RTY3JvbGxUaW1lID0gY3VycmVudFRpbWU7XHJcblxyXG5cdFx0XHRcdC8vIExldCB2aXJ0dWFsIHNjcm9sbCBtYW5hZ2VyIGhhbmRsZSB0aGUgc2Nyb2xsIGxvZ2ljIGZpcnN0XHJcblx0XHRcdFx0dGhpcy52aXJ0dWFsU2Nyb2xsLmhhbmRsZVNjcm9sbCgpO1xyXG5cclxuXHRcdFx0XHQvLyBHZXQgdmlld3BvcnQgYW5kIGNoZWNrIGlmIGl0IGFjdHVhbGx5IGNoYW5nZWRcclxuXHRcdFx0XHRjb25zdCB2aWV3cG9ydCA9IHRoaXMudmlydHVhbFNjcm9sbC5nZXRWaWV3cG9ydCgpO1xyXG5cclxuXHRcdFx0XHQvLyBBbHdheXMgcmVuZGVyIGlmIHZpZXdwb3J0IGNoYW5nZWQsIG5vIG1hdHRlciBob3cgc21hbGwgdGhlIGNoYW5nZVxyXG5cdFx0XHRcdGNvbnN0IHZpZXdwb3J0Q2hhbmdlZCA9XHJcblx0XHRcdFx0XHQhdGhpcy5sYXN0Vmlld3BvcnQgfHxcclxuXHRcdFx0XHRcdHRoaXMubGFzdFZpZXdwb3J0LnN0YXJ0SW5kZXggIT09IHZpZXdwb3J0LnN0YXJ0SW5kZXggfHxcclxuXHRcdFx0XHRcdHRoaXMubGFzdFZpZXdwb3J0LmVuZEluZGV4ICE9PSB2aWV3cG9ydC5lbmRJbmRleDtcclxuXHJcblx0XHRcdFx0Ly8gUmVtb3ZlIHJlbmRlciB0aHJvdHRsaW5nIGZvciBpbW1lZGlhdGUgcmVzcG9uc2VcclxuXHRcdFx0XHRpZiAodmlld3BvcnRDaGFuZ2VkKSB7XHJcblx0XHRcdFx0XHR0aGlzLnBlcmZvcm1SZW5kZXIodmlld3BvcnQsIGN1cnJlbnRUaW1lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHRoaXMuc2Nyb2xsUkFGID0gbnVsbDtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG5cdC8qKlxyXG5cdCAqIFBlcmZvcm0gYWN0dWFsIHJlbmRlcmluZyB3aXRoIHRocm90dGxpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIHBlcmZvcm1SZW5kZXIodmlld3BvcnQ6IGFueSwgY3VycmVudFRpbWU6IG51bWJlcikge1xyXG5cdFx0Ly8gQ2FuY2VsIGFueSBwZW5kaW5nIHJlbmRlclxyXG5cdFx0aWYgKHRoaXMucmVuZGVyVGhyb3R0bGVSQUYpIHtcclxuXHRcdFx0Y2FuY2VsQW5pbWF0aW9uRnJhbWUodGhpcy5yZW5kZXJUaHJvdHRsZVJBRik7XHJcblx0XHRcdHRoaXMucmVuZGVyVGhyb3R0bGVSQUYgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4ZWN1dGUgcmVuZGVyaW5nIGltbWVkaWF0ZWx5IGZvciBiZXR0ZXIgcmVzcG9uc2l2ZW5lc3NcclxuXHRcdC8vIE1vcmUgYWdncmVzc2l2ZSBidWZmZXIgYWRqdXN0bWVudCBmb3IgZmFzdCBzY3JvbGxpbmdcclxuXHRcdGxldCBidWZmZXJBZGp1c3RtZW50ID0gMDtcclxuXHRcdGlmIChNYXRoLmFicyh0aGlzLnNjcm9sbFZlbG9jaXR5KSA+IDEpIHtcclxuXHRcdFx0Ly8gUmVkdWNlZCB0aHJlc2hvbGQgZnJvbSAyIHRvIDEgZm9yIGVhcmxpZXIgYnVmZmVyIGFkanVzdG1lbnRcclxuXHRcdFx0YnVmZmVyQWRqdXN0bWVudCA9IE1hdGgubWluKFxyXG5cdFx0XHRcdDgsIC8vIEluY3JlYXNlZCBmcm9tIDUgdG8gOCBmb3IgZXZlbiBsYXJnZXIgYnVmZmVyXHJcblx0XHRcdFx0TWF0aC5mbG9vcihNYXRoLmFicyh0aGlzLnNjcm9sbFZlbG9jaXR5KSAvIDEuNSkgLy8gUmVkdWNlZCBkaXZpc29yIGZvciBtb3JlIGFnZ3Jlc3NpdmUgYnVmZmVyaW5nXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2FsY3VsYXRlIHZpc2libGUgcmFuZ2Ugd2l0aCBidWZmZXJcclxuXHRcdGxldCBhZGp1c3RlZFN0YXJ0SW5kZXggPSBNYXRoLm1heChcclxuXHRcdFx0MCxcclxuXHRcdFx0dmlld3BvcnQuc3RhcnRJbmRleCAtIGJ1ZmZlckFkanVzdG1lbnRcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU3BlY2lhbCBjaGVjazogaWYgd2UncmUgdmVyeSBjbG9zZSB0byB0aGUgdG9wLCBmb3JjZSBzdGFydEluZGV4IHRvIDBcclxuXHRcdGNvbnN0IGN1cnJlbnRTY3JvbGxUb3AgPSB0aGlzLnRhYmxlV3JhcHBlci5zY3JvbGxUb3A7XHJcblx0XHRpZiAoY3VycmVudFNjcm9sbFRvcCA8PSA0MCkge1xyXG5cdFx0XHQvLyBXaXRoaW4gb25lIHJvdyBoZWlnaHQgb2YgdG9wXHJcblx0XHRcdGFkanVzdGVkU3RhcnRJbmRleCA9IDA7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgYWRqdXN0ZWRFbmRJbmRleCA9IE1hdGgubWluKFxyXG5cdFx0XHR0aGlzLmRpc3BsYXllZFJvd3MubGVuZ3RoIC0gMSxcclxuXHRcdFx0dmlld3BvcnQuZW5kSW5kZXggKyBidWZmZXJBZGp1c3RtZW50XHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IHZpc2libGVSb3dzID0gdGhpcy5kaXNwbGF5ZWRSb3dzLnNsaWNlKFxyXG5cdFx0XHRhZGp1c3RlZFN0YXJ0SW5kZXgsXHJcblx0XHRcdGFkanVzdGVkRW5kSW5kZXggKyAxXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFVzZSB0aGUgb3B0aW1pemVkIHJlbmRlcmVyIHdpdGggcm93IHJlY3ljbGluZ1xyXG5cdFx0dGhpcy5yZW5kZXJlci5yZW5kZXJUYWJsZShcclxuXHRcdFx0dmlzaWJsZVJvd3MsXHJcblx0XHRcdHRoaXMuc2VsZWN0ZWRSb3dzLFxyXG5cdFx0XHRhZGp1c3RlZFN0YXJ0SW5kZXgsXHJcblx0XHRcdHRoaXMuZGlzcGxheWVkUm93cy5sZW5ndGhcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHN0YXRlXHJcblx0XHR0aGlzLmxhc3RWaWV3cG9ydCA9IHtcclxuXHRcdFx0c3RhcnRJbmRleDogYWRqdXN0ZWRTdGFydEluZGV4LFxyXG5cdFx0XHRlbmRJbmRleDogYWRqdXN0ZWRFbmRJbmRleCxcclxuXHRcdH07XHJcblx0XHR0aGlzLmxhc3RSZW5kZXJUaW1lID0gY3VycmVudFRpbWU7XHJcblx0fVxyXG5cclxuXHQvLyBDZWxsIGVkaXRpbmcgbWV0aG9kc1xyXG5cdHByaXZhdGUgc3RhcnRDZWxsRWRpdChcclxuXHRcdHJvd0lkOiBzdHJpbmcsXHJcblx0XHRjb2x1bW5JZDogc3RyaW5nLFxyXG5cdFx0Y2VsbEVsOiBIVE1MRWxlbWVudFxyXG5cdCkge1xyXG5cdFx0aWYgKHRoaXMuZWRpdGluZ0NlbGwpIHtcclxuXHRcdFx0dGhpcy5jYW5jZWxDZWxsRWRpdCgpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuZWRpdGluZ0NlbGwgPSB7IHJvd0lkLCBjb2x1bW5JZCB9O1xyXG5cdFx0dGhpcy5lZGl0b3Iuc3RhcnRFZGl0KHJvd0lkLCBjb2x1bW5JZCwgY2VsbEVsKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBjZWxsIGVkaXQgZnJvbSB0YWJsZSBlZGl0b3JcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZUNlbGxFZGl0KHJvd0lkOiBzdHJpbmcsIGNvbHVtbklkOiBzdHJpbmcsIG5ld1ZhbHVlOiBhbnkpIHtcclxuXHRcdGNvbnN0IHRhc2sgPSB0aGlzLmFsbFRhc2tzLmZpbmQoKHQpID0+IHQuaWQgPT09IHJvd0lkKTtcclxuXHRcdGlmICghdGFzaykgcmV0dXJuO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSB0YXNrIHByb3BlcnR5XHJcblx0XHRjb25zdCB1cGRhdGVkVGFzayA9IHsgLi4udGFzayB9O1xyXG5cdFx0dGhpcy51cGRhdGVUYXNrUHJvcGVydHkodXBkYXRlZFRhc2ssIGNvbHVtbklkLCBuZXdWYWx1ZSk7XHJcblxyXG5cdFx0Ly8gTm90aWZ5IHRhc2sgdXBkYXRlXHJcblx0XHRpZiAodGhpcy5vblRhc2tVcGRhdGVkKSB7XHJcblx0XHRcdHRoaXMub25UYXNrVXBkYXRlZCh1cGRhdGVkVGFzayk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhhbmRsZUVkaXRDb21wbGV0ZSgpIHtcclxuXHRcdHRoaXMuZWRpdGluZ0NlbGwgPSBudWxsO1xyXG5cdFx0dGhpcy5yZWZyZXNoRGlzcGxheSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVFZGl0Q2FuY2VsKCkge1xyXG5cdFx0dGhpcy5lZGl0aW5nQ2VsbCA9IG51bGw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNhbmNlbENlbGxFZGl0KCkge1xyXG5cdFx0aWYgKHRoaXMuZWRpdGluZ0NlbGwpIHtcclxuXHRcdFx0dGhpcy5lZGl0b3IuY2FuY2VsRWRpdCgpO1xyXG5cdFx0XHR0aGlzLmVkaXRpbmdDZWxsID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlVGFza1Byb3BlcnR5KHRhc2s6IFRhc2ssIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcclxuXHRcdHN3aXRjaCAocHJvcGVydHkpIHtcclxuXHRcdFx0Y2FzZSBcInN0YXR1c1wiOlxyXG5cdFx0XHRcdHRhc2suc3RhdHVzID0gdmFsdWU7XHJcblx0XHRcdFx0dGFzay5jb21wbGV0ZWQgPSB2YWx1ZSA9PT0gXCJ4XCIgfHwgdmFsdWUgPT09IFwiWFwiO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiY29udGVudFwiOlxyXG5cdFx0XHRcdHRhc2suY29udGVudCA9IHZhbHVlO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnByaW9yaXR5ID0gdmFsdWVcclxuXHRcdFx0XHRcdD8gcGFyc2VJbnQoU3RyaW5nKHZhbHVlKSlcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiZHVlRGF0ZVwiOlxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuZHVlRGF0ZSA9IHZhbHVlXHJcblx0XHRcdFx0XHQ/IG5ldyBEYXRlKHZhbHVlKS5nZXRUaW1lKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwic3RhcnREYXRlXCI6XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGUgPSB2YWx1ZVxyXG5cdFx0XHRcdFx0PyBuZXcgRGF0ZSh2YWx1ZSkuZ2V0VGltZSgpXHJcblx0XHRcdFx0XHQ6IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUgPSB2YWx1ZVxyXG5cdFx0XHRcdFx0PyBuZXcgRGF0ZSh2YWx1ZSkuZ2V0VGltZSgpXHJcblx0XHRcdFx0XHQ6IHVuZGVmaW5lZDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImNyZWF0ZWREYXRlXCI6XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZSA9IHZhbHVlXHJcblx0XHRcdFx0XHQ/IG5ldyBEYXRlKHZhbHVlKS5nZXRUaW1lKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiY29tcGxldGVkRGF0ZVwiOlxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSA9IHZhbHVlXHJcblx0XHRcdFx0XHQ/IG5ldyBEYXRlKHZhbHVlKS5nZXRUaW1lKClcclxuXHRcdFx0XHRcdDogdW5kZWZpbmVkO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwidGFnc1wiOlxyXG5cdFx0XHRcdC8vIEhhbmRsZSBib3RoIGFycmF5IGFuZCBzdHJpbmcgaW5wdXRzXHJcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcblx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLnRhZ3MgPSB2YWx1ZTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS50YWdzID0gdmFsdWVcclxuXHRcdFx0XHRcdFx0PyB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdFx0XHRcdFx0Lm1hcCgodDogc3RyaW5nKSA9PiB0LnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0XHRcdC5maWx0ZXIoKHQpID0+IHQubGVuZ3RoID4gMClcclxuXHRcdFx0XHRcdFx0OiBbXTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS50YWdzID0gW107XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicHJvamVjdFwiOlxyXG5cdFx0XHRcdC8vIE9ubHkgdXBkYXRlIHByb2plY3QgaWYgaXQncyBub3QgYSByZWFkLW9ubHkgdGdQcm9qZWN0XHJcblx0XHRcdFx0aWYgKCFpc1Byb2plY3RSZWFkb25seSh0YXNrKSkge1xyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5wcm9qZWN0ID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImNvbnRleHRcIjpcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmNvbnRleHQgPSB2YWx1ZSB8fCB1bmRlZmluZWQ7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJyZWN1cnJlbmNlXCI6XHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlID0gdmFsdWUgfHwgdW5kZWZpbmVkO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gVUkgdXBkYXRlIG1ldGhvZHNcclxuXHRwcml2YXRlIHVwZGF0ZVJvd1NlbGVjdGlvbigpIHtcclxuXHRcdHRoaXMucmVuZGVyZXIudXBkYXRlU2VsZWN0aW9uKHRoaXMuc2VsZWN0ZWRSb3dzKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlU29ydEluZGljYXRvcnMoKSB7XHJcblx0XHQvLyBJZiBubyBzb3J0IGZpZWxkIGlzIHNldCwgY2xlYXIgYWxsIGluZGljYXRvcnNcclxuXHRcdGlmICghdGhpcy5jdXJyZW50U29ydEZpZWxkKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyZXIudXBkYXRlU29ydEluZGljYXRvcnMoXCJcIiwgXCJhc2NcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLnJlbmRlcmVyLnVwZGF0ZVNvcnRJbmRpY2F0b3JzKFxyXG5cdFx0XHRcdHRoaXMuY3VycmVudFNvcnRGaWVsZCxcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRTb3J0T3JkZXJcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgbG9hZE1vcmVSb3dzKCkge1xyXG5cdFx0Ly8gSW1wbGVtZW50IGxhenkgbG9hZGluZyBsb2dpYyBoZXJlXHJcblx0XHRpZiAodGhpcy52aXJ0dWFsU2Nyb2xsKSB7XHJcblx0XHRcdHRoaXMudmlydHVhbFNjcm9sbC5sb2FkTmV4dEJhdGNoKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNsZWFudXAoKSB7XHJcblx0XHQvLyBDYW5jZWwgYW55IHBlbmRpbmcgc2Nyb2xsIGFuaW1hdGlvblxyXG5cdFx0aWYgKHRoaXMuc2Nyb2xsUkFGKSB7XHJcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMuc2Nyb2xsUkFGKTtcclxuXHRcdFx0dGhpcy5zY3JvbGxSQUYgPSBudWxsO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENhbmNlbCBhbnkgcGVuZGluZyByZW5kZXJcclxuXHRcdGlmICh0aGlzLnJlbmRlclRocm90dGxlUkFGKSB7XHJcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKHRoaXMucmVuZGVyVGhyb3R0bGVSQUYpO1xyXG5cdFx0XHR0aGlzLnJlbmRlclRocm90dGxlUkFGID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDbGVhciB2aWV3cG9ydCBjYWNoZVxyXG5cdFx0dGhpcy5sYXN0Vmlld3BvcnQgPSBudWxsO1xyXG5cclxuXHRcdHRoaXMuc2VsZWN0ZWRSb3dzLmNsZWFyKCk7XHJcblx0XHR0aGlzLmRpc3BsYXllZFJvd3MgPSBbXTtcclxuXHRcdHRoaXMuZmlsdGVyZWRUYXNrcyA9IFtdO1xyXG5cdFx0dGhpcy5hbGxUYXNrcyA9IFtdO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIGJldHdlZW4gdHJlZSB2aWV3IGFuZCBmbGF0IHZpZXdcclxuXHQgKi9cclxuXHRwdWJsaWMgdG9nZ2xlVHJlZVZpZXcoKSB7XHJcblx0XHR0aGlzLmlzVHJlZVZpZXcgPSAhdGhpcy5pc1RyZWVWaWV3O1xyXG5cdFx0dGhpcy5yZWZyZXNoRGlzcGxheSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGN1cnJlbnRseSBzZWxlY3RlZCB0YXNrc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBnZXRTZWxlY3RlZFRhc2tzKCk6IFRhc2tbXSB7XHJcblx0XHRyZXR1cm4gdGhpcy5hbGxUYXNrcy5maWx0ZXIoKHRhc2spID0+IHRoaXMuc2VsZWN0ZWRSb3dzLmhhcyh0YXNrLmlkKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBhbGwgc2VsZWN0aW9uc1xyXG5cdCAqL1xyXG5cdHB1YmxpYyBjbGVhclNlbGVjdGlvbigpIHtcclxuXHRcdHRoaXMuc2VsZWN0ZWRSb3dzLmNsZWFyKCk7XHJcblx0XHR0aGlzLnVwZGF0ZVJvd1NlbGVjdGlvbigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXhwb3J0IHRhYmxlIGRhdGFcclxuXHQgKi9cclxuXHRwdWJsaWMgZXhwb3J0RGF0YSgpOiBhbnlbXSB7XHJcblx0XHRyZXR1cm4gdGhpcy5kaXNwbGF5ZWRSb3dzLm1hcCgocm93KSA9PiB7XHJcblx0XHRcdGNvbnN0IGRhdGE6IGFueSA9IHt9O1xyXG5cdFx0XHRyb3cuY2VsbHMuZm9yRWFjaCgoY2VsbCkgPT4ge1xyXG5cdFx0XHRcdGRhdGFbY2VsbC5jb2x1bW5JZF0gPSBjZWxsLnZhbHVlO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuIGRhdGE7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZnJlc2ggdGFibGUgZGF0YVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVmcmVzaERhdGEoKSB7XHJcblx0XHR0aGlzLmFwcGx5RmlsdGVyc0FuZFNvcnQoKTtcclxuXHRcdHRoaXMucmVmcmVzaERpc3BsYXkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFRvZ2dsZSBjb2x1bW4gdmlzaWJpbGl0eVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdG9nZ2xlQ29sdW1uVmlzaWJpbGl0eShjb2x1bW5JZDogc3RyaW5nLCB2aXNpYmxlOiBib29sZWFuKSB7XHJcblx0XHQvLyBVcGRhdGUgY29uZmlnXHJcblx0XHRpZiAodmlzaWJsZSAmJiAhdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoY29sdW1uSWQpKSB7XHJcblx0XHRcdHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLnB1c2goY29sdW1uSWQpO1xyXG5cdFx0fSBlbHNlIGlmICghdmlzaWJsZSkge1xyXG5cdFx0XHRjb25zdCBpbmRleCA9IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluZGV4T2YoY29sdW1uSWQpO1xyXG5cdFx0XHRpZiAoaW5kZXggPiAtMSkge1xyXG5cdFx0XHRcdHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBTYXZlIHRoZSB1cGRhdGVkIGNvbmZpZ3VyYXRpb24gdG8gcGx1Z2luIHNldHRpbmdzXHJcblx0XHR0aGlzLnNhdmVDb2x1bW5Db25maWd1cmF0aW9uKCk7XHJcblxyXG5cdFx0Ly8gUmVpbml0aWFsaXplIGNvbHVtbnNcclxuXHRcdHRoaXMuaW5pdGlhbGl6ZUNvbHVtbnMoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgcmVuZGVyZXIgd2l0aCBuZXcgY29sdW1uc1xyXG5cdFx0aWYgKHRoaXMucmVuZGVyZXIpIHtcclxuXHRcdFx0dGhpcy5yZW5kZXJlci51cGRhdGVDb2x1bW5zKHRoaXMuY29sdW1ucyk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRyZWUgbWFuYWdlciB3aXRoIG5ldyBjb2x1bW5zXHJcblx0XHRpZiAodGhpcy50cmVlTWFuYWdlcikge1xyXG5cdFx0XHR0aGlzLnRyZWVNYW5hZ2VyLnVwZGF0ZUNvbHVtbnModGhpcy5jb2x1bW5zKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWZyZXNoIGRpc3BsYXlcclxuXHRcdHRoaXMucmVmcmVzaERpc3BsYXkoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGFibGUgaGVhZGVyIHdpdGggbmV3IGNvbHVtbiBpbmZvXHJcblx0XHR0aGlzLnVwZGF0ZVRhYmxlSGVhZGVySW5mbygpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2F2ZSBjb2x1bW4gY29uZmlndXJhdGlvbiB0byBwbHVnaW4gc2V0dGluZ3NcclxuXHQgKi9cclxuXHRwcml2YXRlIHNhdmVDb2x1bW5Db25maWd1cmF0aW9uKCkge1xyXG5cdFx0aWYgKHRoaXMucGx1Z2luICYmIHRoaXMucGx1Z2luLnNldHRpbmdzKSB7XHJcblx0XHRcdC8vIEZpbmQgdGhlIHRhYmxlIHZpZXcgY29uZmlndXJhdGlvblxyXG5cdFx0XHRjb25zdCB0YWJsZVZpZXdDb25maWcgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy52aWV3Q29uZmlndXJhdGlvbi5maW5kKFxyXG5cdFx0XHRcdCh2aWV3KSA9PiB2aWV3LmlkID09PSBcInRhYmxlXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICh0YWJsZVZpZXdDb25maWcgJiYgdGFibGVWaWV3Q29uZmlnLnNwZWNpZmljQ29uZmlnKSB7XHJcblx0XHRcdFx0Y29uc3QgdGFibGVDb25maWcgPSB0YWJsZVZpZXdDb25maWcuc3BlY2lmaWNDb25maWcgYXMgYW55O1xyXG5cdFx0XHRcdGlmICh0YWJsZUNvbmZpZy52aWV3VHlwZSA9PT0gXCJ0YWJsZVwiKSB7XHJcblx0XHRcdFx0XHQvLyBVcGRhdGUgdGhlIHZpc2libGUgY29sdW1ucyBpbiB0aGUgcGx1Z2luIHNldHRpbmdzXHJcblx0XHRcdFx0XHR0YWJsZUNvbmZpZy52aXNpYmxlQ29sdW1ucyA9IFtcclxuXHRcdFx0XHRcdFx0Li4udGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMsXHJcblx0XHRcdFx0XHRdO1xyXG5cclxuXHRcdFx0XHRcdC8vIFNhdmUgc2V0dGluZ3NcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRhYmxlIGhlYWRlciBpbmZvcm1hdGlvblxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlVGFibGVIZWFkZXJJbmZvKCkge1xyXG5cdFx0aWYgKHRoaXMudGFibGVIZWFkZXIpIHtcclxuXHRcdFx0Ly8gVXBkYXRlIHRhc2sgY291bnRcclxuXHRcdFx0dGhpcy50YWJsZUhlYWRlci51cGRhdGVUYXNrQ291bnQodGhpcy5maWx0ZXJlZFRhc2tzLmxlbmd0aCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdHJlZSBtb2RlIHN0YXRlXHJcblx0XHRcdHRoaXMudGFibGVIZWFkZXIudXBkYXRlVHJlZU1vZGUodGhpcy5pc1RyZWVWaWV3KTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSBhdmFpbGFibGUgY29sdW1uc1xyXG5cdFx0XHRjb25zdCBhbGxDb2x1bW5zID0gdGhpcy5nZXRBbGxBdmFpbGFibGVDb2x1bW5zKCk7XHJcblx0XHRcdHRoaXMudGFibGVIZWFkZXIudXBkYXRlQ29sdW1ucyhhbGxDb2x1bW5zKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhbGwgYXZhaWxhYmxlIGNvbHVtbnMgd2l0aCB0aGVpciB2aXNpYmlsaXR5IHN0YXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRBbGxBdmFpbGFibGVDb2x1bW5zKCk6IEFycmF5PHtcclxuXHRcdGlkOiBzdHJpbmc7XHJcblx0XHR0aXRsZTogc3RyaW5nO1xyXG5cdFx0dmlzaWJsZTogYm9vbGVhbjtcclxuXHR9PiB7XHJcblx0XHRyZXR1cm4gW1xyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwic3RhdHVzXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJTdGF0dXNcIiksXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJzdGF0dXNcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJjb250ZW50XCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJDb250ZW50XCIpLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwiY29udGVudFwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcInByaW9yaXR5XCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJQcmlvcml0eVwiKSxcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcInByaW9yaXR5XCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwiZHVlRGF0ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiRHVlIERhdGVcIiksXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJkdWVEYXRlXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJTdGFydCBEYXRlXCIpLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwic3RhcnREYXRlXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiU2NoZWR1bGVkIERhdGVcIiksXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJzY2hlZHVsZWREYXRlXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwiY3JlYXRlZERhdGVcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIkNyZWF0ZWQgRGF0ZVwiKSxcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcImNyZWF0ZWREYXRlXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwiY29tcGxldGVkRGF0ZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiQ29tcGxldGVkIERhdGVcIiksXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJjb21wbGV0ZWREYXRlXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwidGFnc1wiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiVGFnc1wiKSxcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcInRhZ3NcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJwcm9qZWN0XCIsXHJcblx0XHRcdFx0dGl0bGU6IHQoXCJQcm9qZWN0XCIpLFxyXG5cdFx0XHRcdHZpc2libGU6IHRoaXMuY29uZmlnLnZpc2libGVDb2x1bW5zLmluY2x1ZGVzKFwicHJvamVjdFwiKSxcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGlkOiBcImNvbnRleHRcIixcclxuXHRcdFx0XHR0aXRsZTogdChcIkNvbnRleHRcIiksXHJcblx0XHRcdFx0dmlzaWJsZTogdGhpcy5jb25maWcudmlzaWJsZUNvbHVtbnMuaW5jbHVkZXMoXCJjb250ZXh0XCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0aWQ6IFwicmVjdXJyZW5jZVwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiUmVjdXJyZW5jZVwiKSxcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcInJlY3VycmVuY2VcIiksXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRpZDogXCJmaWxlUGF0aFwiLFxyXG5cdFx0XHRcdHRpdGxlOiB0KFwiRmlsZVwiKSxcclxuXHRcdFx0XHR2aXNpYmxlOiB0aGlzLmNvbmZpZy52aXNpYmxlQ29sdW1ucy5pbmNsdWRlcyhcImZpbGVQYXRoXCIpLFxyXG5cdFx0XHR9LFxyXG5cdFx0XTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBkYXRlIGNoYW5nZSBmcm9tIGRhdGUgcGlja2VyXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYW5kbGVEYXRlQ2hhbmdlKFxyXG5cdFx0cm93SWQ6IHN0cmluZyxcclxuXHRcdGNvbHVtbklkOiBzdHJpbmcsXHJcblx0XHRuZXdEYXRlOiBzdHJpbmcgfCBudWxsXHJcblx0KSB7XHJcblx0XHRjb25zdCB0YXNrID0gdGhpcy5hbGxUYXNrcy5maW5kKCh0KSA9PiB0LmlkID09PSByb3dJZCk7XHJcblx0XHRpZiAoIXRhc2spIHJldHVybjtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGFzayBwcm9wZXJ0eSBiYXNlZCBvbiBjb2x1bW5cclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0geyAuLi50YXNrIH07XHJcblxyXG5cdFx0Ly8gRGVmaW5lIHZhbGlkIGRhdGUgY29sdW1uIElEcyBmb3IgdHlwZSBzYWZldHlcclxuXHRcdGNvbnN0IGRhdGVDb2x1bW5zID0gW1xyXG5cdFx0XHRcImR1ZURhdGVcIixcclxuXHRcdFx0XCJzdGFydERhdGVcIixcclxuXHRcdFx0XCJzY2hlZHVsZWREYXRlXCIsXHJcblx0XHRcdFwiY3JlYXRlZERhdGVcIixcclxuXHRcdFx0XCJjb21wbGV0ZWREYXRlXCIsXHJcblx0XHRdIGFzIGNvbnN0O1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoZSBjb2x1bW4gaXMgYSB2YWxpZCBkYXRlIGNvbHVtblxyXG5cdFx0aWYgKCFkYXRlQ29sdW1ucy5pbmNsdWRlcyhjb2x1bW5JZCBhcyBhbnkpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAobmV3RGF0ZSkge1xyXG5cdFx0XHQvLyBTZXQgdGhlIGRhdGUgdmFsdWVcclxuXHRcdFx0Y29uc3QgZGF0ZVZhbHVlID0gbmV3IERhdGUobmV3RGF0ZSkuZ2V0VGltZSgpO1xyXG5cdFx0XHQodXBkYXRlZFRhc2subWV0YWRhdGEgYXMgYW55KVtjb2x1bW5JZF0gPSBkYXRlVmFsdWU7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBDbGVhciB0aGUgZGF0ZVxyXG5cdFx0XHRkZWxldGUgKHVwZGF0ZWRUYXNrLm1ldGFkYXRhIGFzIGFueSlbY29sdW1uSWRdO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE5vdGlmeSB0YXNrIHVwZGF0ZVxyXG5cdFx0aWYgKHRoaXMub25UYXNrVXBkYXRlZCkge1xyXG5cdFx0XHR0aGlzLm9uVGFza1VwZGF0ZWQodXBkYXRlZFRhc2spO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlZnJlc2ggZGlzcGxheVxyXG5cdFx0dGhpcy5yZWZyZXNoRGlzcGxheSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIGVkaXQgc3RhcnRcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZUVkaXRTdGFydChyb3dJZDogc3RyaW5nLCBjb2x1bW5JZDogc3RyaW5nKSB7XHJcblx0XHR0aGlzLmVkaXRpbmdDZWxsID0geyByb3dJZCwgY29sdW1uSWQgfTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSByb3cgZXhwYW5zaW9uIGluIHRyZWUgdmlld1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlUm93RXhwYW5zaW9uKHJvd0lkOiBzdHJpbmcpIHtcclxuXHRcdGlmICh0aGlzLmlzVHJlZVZpZXcgJiYgdGhpcy50cmVlTWFuYWdlcikge1xyXG5cdFx0XHRjb25zdCB3YXNUb2dnbGVkID0gdGhpcy50cmVlTWFuYWdlci50b2dnbGVOb2RlRXhwYW5zaW9uKHJvd0lkKTtcclxuXHRcdFx0aWYgKHdhc1RvZ2dsZWQpIHtcclxuXHRcdFx0XHR0aGlzLnJlZnJlc2hEaXNwbGF5KCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSBjZWxsIGNoYW5nZSBmcm9tIGlubGluZSBlZGl0aW5nXHJcblx0ICovXHJcblx0cHJpdmF0ZSBoYW5kbGVDZWxsQ2hhbmdlKHJvd0lkOiBzdHJpbmcsIGNvbHVtbklkOiBzdHJpbmcsIG5ld1ZhbHVlOiBhbnkpIHtcclxuXHRcdGNvbnN0IHRhc2tJbmRleCA9IHRoaXMuYWxsVGFza3MuZmluZEluZGV4KCh0KSA9PiB0LmlkID09PSByb3dJZCk7XHJcblx0XHRpZiAodGFza0luZGV4ID09PSAtMSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdGFzayA9IHRoaXMuYWxsVGFza3NbdGFza0luZGV4XTtcclxuXHJcblx0XHQvLyBVcGRhdGUgdGFzayBwcm9wZXJ0eSBkaXJlY3RseSBvbiB0aGUgb3JpZ2luYWwgdGFzayBvYmplY3RcclxuXHRcdHRoaXMudXBkYXRlVGFza1Byb3BlcnR5KHRhc2ssIGNvbHVtbklkLCBuZXdWYWx1ZSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgY29weSBmb3IgdGhlIGNhbGxiYWNrIHRvIG1haW50YWluIHRoZSBleGlzdGluZyBpbnRlcmZhY2VcclxuXHRcdGNvbnN0IHVwZGF0ZWRUYXNrID0geyAuLi50YXNrIH07XHJcblxyXG5cdFx0Ly8gTm90aWZ5IHRhc2sgdXBkYXRlXHJcblx0XHRpZiAodGhpcy5vblRhc2tVcGRhdGVkKSB7XHJcblx0XHRcdHRoaXMub25UYXNrVXBkYXRlZCh1cGRhdGVkVGFzayk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWxzbyB1cGRhdGUgdGhlIGZpbHRlcmVkVGFza3MgYXJyYXkgaWYgdGhpcyB0YXNrIGlzIGluIGl0XHJcblx0XHRjb25zdCBmaWx0ZXJlZEluZGV4ID0gdGhpcy5maWx0ZXJlZFRhc2tzLmZpbmRJbmRleChcclxuXHRcdFx0KHQpID0+IHQuaWQgPT09IHJvd0lkXHJcblx0XHQpO1xyXG5cdFx0aWYgKGZpbHRlcmVkSW5kZXggIT09IC0xKSB7XHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgcmVmZXJlbmNlIHRvIHBvaW50IHRvIHRoZSB1cGRhdGVkIHRhc2tcclxuXHRcdFx0dGhpcy5maWx0ZXJlZFRhc2tzW2ZpbHRlcmVkSW5kZXhdID0gdGFzaztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZWZyZXNoIGRpc3BsYXlcclxuXHRcdHRoaXMucmVmcmVzaERpc3BsYXkoKTtcclxuXHR9XHJcbn1cclxuIl19