import { __awaiter } from "tslib";
import { Component, setIcon, Menu } from "obsidian";
import { t } from "@/translations/helper";
import { DatePickerPopover } from "@/components/ui/date-picker/DatePickerPopover";
import { ContextSuggest, ProjectSuggest, TagSuggest } from "@/components/ui/inputs/AutoComplete";
import { clearAllMarks } from "@/components/ui/renderers/MarkdownRenderer";
import { getEffectiveProject, isProjectReadonly } from "@/utils/task/task-operations";
/**
 * Table renderer component responsible for rendering the table HTML structure
 */
export class TableRenderer extends Component {
    constructor(tableEl, headerEl, bodyEl, columns, config, app, plugin) {
        super();
        this.tableEl = tableEl;
        this.headerEl = headerEl;
        this.bodyEl = bodyEl;
        this.columns = columns;
        this.config = config;
        this.app = app;
        this.plugin = plugin;
        this.resizeObserver = null;
        this.isResizing = false;
        this.resizeStartX = 0;
        this.resizeColumn = "";
        this.resizeStartWidth = 0;
        // DOM节点缓存池
        this.rowPool = [];
        this.activeRows = new Map();
        this.eventCleanupMap = new Map();
        // AutoComplete optimization
        this.autoCompleteCache = null;
        this.activeSuggests = new Map();
        this.CACHE_DURATION = 30000; // 30 seconds cache
    }
    onload() {
        this.renderHeader();
        this.setupResizeHandlers();
    }
    onunload() {
        // Clean up all tracked events
        this.eventCleanupMap.forEach((cleanupFns) => {
            cleanupFns.forEach((fn) => fn());
        });
        this.eventCleanupMap.clear();
        // Clean up active suggests
        this.activeSuggests.forEach((suggest) => {
            suggest.close();
        });
        this.activeSuggests.clear();
        // Clear row pools
        this.rowPool = [];
        this.activeRows.clear();
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }
    /**
     * Get cached autocomplete data or fetch if expired
     */
    getAutoCompleteData() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (!this.autoCompleteCache ||
                now - this.autoCompleteCache.lastUpdate > this.CACHE_DURATION) {
                // Fetch fresh data
                const tags = Object.keys(this.plugin.app.metadataCache.getTags() || {}).map((tag) => tag.substring(1) // Remove # prefix
                );
                // Get projects and contexts from dataflow
                let projects = [];
                let contexts = [];
                if (this.plugin.dataflowOrchestrator) {
                    try {
                        const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                        const allTasks = yield queryAPI.getAllTasks();
                        // Extract unique projects and contexts from tasks
                        const projectSet = new Set();
                        const contextSet = new Set();
                        allTasks.forEach((task) => {
                            if (task.project)
                                projectSet.add(task.project);
                            if (task.context)
                                contextSet.add(task.context);
                        });
                        projects = Array.from(projectSet).sort();
                        contexts = Array.from(contextSet).sort();
                    }
                    catch (error) {
                        console.warn("Failed to get projects/contexts from dataflow:", error);
                    }
                }
                this.autoCompleteCache = {
                    tags,
                    projects,
                    contexts,
                    lastUpdate: now,
                };
            }
            return this.autoCompleteCache;
        });
    }
    /**
     * Create or reuse autocomplete suggest for input
     */
    setupAutoComplete(input, type) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if this input already has a suggest
            if (this.activeSuggests.has(input)) {
                return;
            }
            const data = yield this.getAutoCompleteData();
            let suggest;
            switch (type) {
                case "tags":
                    suggest = new TagSuggest(this.app, input, this.plugin);
                    // Override the expensive getTags call with cached data
                    suggest.availableChoices = data.tags;
                    break;
                case "project":
                    suggest = new ProjectSuggest(this.app, input, this.plugin);
                    suggest.availableChoices = data.projects;
                    break;
                case "context":
                    suggest = new ContextSuggest(this.app, input, this.plugin);
                    suggest.availableChoices = data.contexts;
                    break;
            }
            this.activeSuggests.set(input, suggest);
            // Clean up when input is removed or loses focus permanently
            const cleanup = () => {
                const suggestInstance = this.activeSuggests.get(input);
                if (suggestInstance) {
                    suggestInstance.close();
                    this.activeSuggests.delete(input);
                }
            };
            // Clean up when input is removed from DOM
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        if (node === input ||
                            (node instanceof Element && node.contains(input))) {
                            cleanup();
                            observer.disconnect();
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }
    /**
     * Render the table header
     */
    renderHeader() {
        this.headerEl.empty();
        const headerRow = this.headerEl.createEl("tr", "task-table-header-row");
        this.columns.forEach((column) => {
            const th = headerRow.createEl("th", "task-table-header-cell");
            th.dataset.columnId = column.id;
            th.style.width = `${column.width}px`;
            th.style.minWidth = `${Math.min(column.width, 50)}px`;
            // Create header content container
            const headerContent = th.createDiv("task-table-header-content");
            // Add column title
            const titleSpan = headerContent.createSpan("task-table-header-title");
            titleSpan.textContent = column.title;
            // Add sort indicator if sortable
            if (column.sortable) {
                th.addClass("sortable");
                const sortIcon = headerContent.createSpan("task-table-sort-icon");
                setIcon(sortIcon, "chevrons-up-down");
            }
            // Add resize handle if resizable
            if (column.resizable && this.config.resizableColumns) {
                const resizeHandle = th.createDiv("task-table-resize-handle");
                this.registerDomEvent(resizeHandle, "mousedown", (e) => {
                    this.startResize(e, column.id, column.width);
                });
            }
            // Set text alignment
            if (column.align) {
                th.style.textAlign = column.align;
            }
        });
    }
    /**
     * Render the table body with rows using improved DOM node recycling
     */
    renderTable(rows, selectedRows, startIndex = 0, totalRows) {
        // Always clear empty state first if it exists
        this.clearEmptyState();
        if (rows.length === 0) {
            this.clearAllRows();
            this.renderEmptyState();
            return;
        }
        // Handle virtual scroll spacer first
        this.updateVirtualScrollSpacer(startIndex);
        // Track which row IDs are currently needed
        const neededRowIds = new Set(rows.map((row) => row.id));
        const currentRowElements = Array.from(this.bodyEl.querySelectorAll("tr[data-row-id]"));
        // Step 1: Remove rows that are no longer needed
        const rowsToRemove = [];
        this.activeRows.forEach((rowEl, rowId) => {
            if (!neededRowIds.has(rowId)) {
                rowsToRemove.push(rowId);
            }
        });
        // Return unneeded rows to pool (batch operation)
        if (rowsToRemove.length > 0) {
            const fragment = document.createDocumentFragment();
            rowsToRemove.forEach((rowId) => {
                const rowEl = this.activeRows.get(rowId);
                if (rowEl && rowEl.parentNode) {
                    this.activeRows.delete(rowId);
                    fragment.appendChild(rowEl); // Move to fragment (removes from DOM)
                    this.returnRowToPool(rowEl);
                }
            });
        }
        // Step 2: Build a map of current DOM positions
        const spacerElement = this.bodyEl.querySelector(".virtual-scroll-spacer-top");
        const targetPosition = spacerElement ? 1 : 0; // Position after spacer
        // Step 3: Process each needed row
        const rowsToInsert = [];
        rows.forEach((row, index) => {
            let rowEl = this.activeRows.get(row.id);
            const targetIndex = targetPosition + index;
            if (!rowEl) {
                // Create new row
                rowEl = this.getRowFromPool();
                this.activeRows.set(row.id, rowEl);
                this.updateRow(rowEl, row, selectedRows.has(row.id));
                rowsToInsert.push({ element: rowEl, index: targetIndex });
            }
            else {
                // Always update existing rows to ensure they reflect current sort order
                // This is crucial for proper re-rendering after sorting
                this.updateRow(rowEl, row, selectedRows.has(row.id));
                // Check if row needs repositioning
                const currentIndex = Array.from(this.bodyEl.children).indexOf(rowEl);
                if (currentIndex !== targetIndex) {
                    rowsToInsert.push({ element: rowEl, index: targetIndex });
                }
            }
        });
        // Step 4: Insert/reposition rows efficiently
        if (rowsToInsert.length > 0) {
            // Sort by target index to insert in correct order
            rowsToInsert.sort((a, b) => a.index - b.index);
            // Use insertBefore for precise positioning
            const children = Array.from(this.bodyEl.children);
            rowsToInsert.forEach(({ element, index }) => {
                const referenceNode = children[index];
                if (referenceNode && referenceNode !== element) {
                    this.bodyEl.insertBefore(element, referenceNode);
                }
                else if (!referenceNode) {
                    this.bodyEl.appendChild(element);
                }
            });
        }
    }
    /**
     * Optimized row update check - more precise
     */
    shouldUpdateRow(rowEl, row, isSelected) {
        // Quick checks first
        const currentRowId = rowEl.dataset.rowId;
        if (currentRowId !== row.id)
            return true;
        const wasSelected = rowEl.hasClass("selected");
        if (wasSelected !== isSelected)
            return true;
        const currentLevel = parseInt(rowEl.dataset.level || "0");
        if (currentLevel !== row.level)
            return true;
        // Check expanded state for tree view
        const currentExpanded = rowEl.dataset.expanded === "true";
        if (currentExpanded !== row.expanded)
            return true;
        // Check if hasChildren state changed
        const currentHasChildren = rowEl.dataset.hasChildren === "true";
        if (currentHasChildren !== row.hasChildren)
            return true;
        // Check if row has the right number of cells
        const currentCellCount = rowEl.querySelectorAll("td").length;
        if (currentCellCount !== row.cells.length)
            return true;
        // Optimized cell content check - only check key fields that change frequently
        const currentCells = rowEl.querySelectorAll("td");
        for (let i = 0; i < Math.min(row.cells.length, 3); i++) {
            // Only check first 3 cells for performance
            const cell = row.cells[i];
            const currentCell = currentCells[i];
            if (!currentCell)
                return true; // Cell missing
            // For editable text cells, check the actual content
            if (cell.editable &&
                (cell.columnId === "content" ||
                    cell.columnId === "project" ||
                    cell.columnId === "context")) {
                const input = currentCell.querySelector("input");
                const currentValue = input
                    ? input.value
                    : currentCell.textContent || "";
                const newValue = cell.displayValue || "";
                if (currentValue.trim() !== newValue.trim()) {
                    return true;
                }
            }
            // For tags cells, compare array content
            else if (cell.columnId === "tags") {
                const newTags = Array.isArray(cell.value) ? cell.value : [];
                const currentTagsText = currentCell.textContent || "";
                const expectedTagsText = newTags.join(", ");
                if (currentTagsText.trim() !== expectedTagsText.trim()) {
                    return true;
                }
            }
        }
        return false;
    }
    /**
     * Get a row element from the pool or create a new one
     */
    getRowFromPool() {
        let rowEl = this.rowPool.pop();
        if (!rowEl) {
            rowEl = document.createElement("tr");
            rowEl.addClass("task-table-row");
        }
        return rowEl;
    }
    /**
     * Return a row element to the pool for reuse
     */
    returnRowToPool(rowEl) {
        // Clean up event listeners
        this.cleanupRowEvents(rowEl);
        // Clear row content and attributes efficiently
        rowEl.empty();
        rowEl.className = "task-table-row";
        // Batch attribute removal
        const attributesToRemove = [
            "data-row-id",
            "data-level",
            "data-expanded",
            "data-has-children",
        ];
        attributesToRemove.forEach((attr) => rowEl.removeAttribute(attr));
        // Add to pool if not too many
        if (this.rowPool.length < 50) {
            // Reduced pool size for better memory usage
            this.rowPool.push(rowEl);
        }
        else {
            // Remove from DOM completely
            rowEl.remove();
        }
    }
    /**
     * Update a row element with new data - optimized version
     */
    updateRow(rowEl, row, isSelected) {
        // Clean up previous events for this row
        this.cleanupRowEvents(rowEl);
        // Clear and set basic attributes efficiently
        rowEl.empty();
        // Batch dataset updates
        const dataset = rowEl.dataset;
        dataset.rowId = row.id;
        dataset.level = row.level.toString();
        dataset.expanded = row.expanded.toString();
        dataset.hasChildren = row.hasChildren.toString();
        // Update classes efficiently using a single className assignment
        const classNames = [
            "task-table-row",
            ...(row.level > 0
                ? [`task-table-row-level-${row.level}`, "task-table-subtask"]
                : []),
            ...(row.hasChildren ? ["task-table-parent"] : []),
            ...(isSelected ? ["selected"] : []),
            ...(row.className ? [row.className] : []),
        ];
        rowEl.className = classNames.join(" ");
        // Pre-calculate common styles to avoid repeated calculations
        const isSubtask = row.level > 0;
        const subtaskOpacity = isSubtask ? "0.9" : "";
        // Create document fragment for batch DOM operations
        const fragment = document.createDocumentFragment();
        // Render cells
        row.cells.forEach((cell, index) => {
            const column = this.columns[index];
            if (!column)
                return;
            const td = document.createElement("td");
            td.className = "task-table-cell";
            // Batch dataset and style updates
            td.dataset.columnId = cell.columnId;
            td.dataset.rowId = row.id;
            // Set cell width and styles efficiently
            td.style.cssText = `width:${column.width}px;min-width:${Math.min(column.width, 50)}px;${column.align ? `text-align:${column.align};` : ""}`;
            // Apply subtask styling if needed
            if (isSubtask) {
                td.classList.add("task-table-subtask-cell");
                if (subtaskOpacity) {
                    td.style.opacity = subtaskOpacity;
                }
            }
            // Render content based on column type
            if (column.id === "rowNumber") {
                this.renderTreeStructure(td, row, cell, column);
            }
            else {
                this.renderCellContent(td, cell, column, row);
            }
            if (cell.className) {
                td.classList.add(cell.className);
            }
            fragment.appendChild(td);
        });
        // Single DOM append operation
        rowEl.appendChild(fragment);
    }
    /**
     * Update virtual scroll spacer - simplified and optimized
     */
    updateVirtualScrollSpacer(startIndex) {
        // Always clear existing spacers first
        this.clearVirtualSpacers();
        // Only create spacer if we're truly scrolled down (not just at the edge)
        if (startIndex <= 0) {
            return; // No spacers needed when at or near the top
        }
        // Create top spacer for rows above viewport
        const topSpacer = document.createElement("tr");
        topSpacer.className = "virtual-scroll-spacer-top";
        const topSpacerCell = document.createElement("td");
        topSpacerCell.colSpan = this.columns.length;
        topSpacerCell.style.cssText = `
			height: ${startIndex * 40}px;
			padding: 0;
			margin: 0;
			border: none;
			background: transparent;
			border-collapse: collapse;
			line-height: 0;
		`;
        topSpacer.appendChild(topSpacerCell);
        // Insert at the very beginning
        this.bodyEl.insertBefore(topSpacer, this.bodyEl.firstChild);
    }
    /**
     * Clear existing virtual spacers - optimized
     */
    clearVirtualSpacers() {
        // Use more efficient selector and removal
        const spacers = this.bodyEl.querySelectorAll(".virtual-scroll-spacer-top, .virtual-scroll-spacer-bottom");
        spacers.forEach((spacer) => spacer.remove());
    }
    /**
     * Clear all rows and return them to pool
     */
    clearAllRows() {
        // Batch cleanup for better performance
        const rowsToCleanup = Array.from(this.activeRows.values());
        rowsToCleanup.forEach((rowEl) => {
            this.returnRowToPool(rowEl);
        });
        this.activeRows.clear();
        this.bodyEl.empty();
    }
    /**
     * Clean up event listeners for a row - optimized
     */
    cleanupRowEvents(element) {
        const cleanupFns = this.eventCleanupMap.get(element);
        if (cleanupFns) {
            cleanupFns.forEach((fn) => fn());
            this.eventCleanupMap.delete(element);
        }
        // Also clean up child elements - but limit depth for performance
        const childElements = element.querySelectorAll("input, button, [data-cleanup]");
        childElements.forEach((child) => {
            const childCleanup = this.eventCleanupMap.get(child);
            if (childCleanup) {
                childCleanup.forEach((fn) => fn());
                this.eventCleanupMap.delete(child);
            }
        });
    }
    /**
     * Override registerDomEvent to track cleanup functions
     */
    registerDomEvent(el, type, callback, options) {
        // Call the appropriate overload based on the element type
        if (el instanceof Window) {
            super.registerDomEvent(el, type, callback, options);
        }
        else if (el instanceof Document) {
            super.registerDomEvent(el, type, callback, options);
        }
        else {
            super.registerDomEvent(el, type, callback, options);
            // Track cleanup for HTMLElements only
            if (!this.eventCleanupMap.has(el)) {
                this.eventCleanupMap.set(el, []);
            }
            this.eventCleanupMap.get(el).push(() => {
                el.removeEventListener(type, callback, options);
            });
        }
    }
    /**
     * Render tree structure for content column
     */
    renderTreeStructure(cellEl, row, cell, column) {
        const treeContainer = cellEl.createDiv("task-table-tree-container");
        if (row.level > 0) {
            // Add expand/collapse button for parent rows
            if (row.hasChildren) {
                const expandBtn = treeContainer.createSpan("task-table-expand-btn");
                expandBtn.addClass("clickable-icon");
                setIcon(expandBtn, row.expanded ? "chevron-down" : "chevron-right");
                this.registerDomEvent(expandBtn, "click", (e) => {
                    e.stopPropagation();
                    this.toggleRowExpansion(row.id);
                });
                expandBtn.title = row.expanded ? t("Collapse") : t("Expand");
            }
        }
        else if (row.hasChildren) {
            // Top-level parent task with children
            const expandBtn = treeContainer.createSpan("task-table-expand-btn");
            expandBtn.addClass("clickable-icon");
            expandBtn.addClass("task-table-top-level-expand");
            setIcon(expandBtn, row.expanded ? "chevron-down" : "chevron-right");
            this.registerDomEvent(expandBtn, "click", (e) => {
                e.stopPropagation();
                this.toggleRowExpansion(row.id);
            });
            expandBtn.title = row.expanded
                ? t("Collapse subtasks")
                : t("Expand subtasks");
        }
        // Create content wrapper
        const contentWrapper = treeContainer.createDiv("task-table-content-wrapper");
        // Render the actual cell content
        this.renderCellContent(contentWrapper, cell, column, row);
    }
    /**
     * Render cell content based on column type
     */
    renderCellContent(cellEl, cell, column, row) {
        cellEl.empty();
        switch (column.type) {
            case "status":
                this.renderStatusCell(cellEl, cell);
                break;
            case "priority":
                this.renderPriorityCell(cellEl, cell);
                break;
            case "date":
                this.renderDateCell(cellEl, cell);
                break;
            case "tags":
                this.renderTagsCell(cellEl, cell);
                break;
            case "number":
                this.renderNumberCell(cellEl, cell);
                break;
            default:
                this.renderTextCell(cellEl, cell, row);
        }
    }
    /**
     * Render status cell with visual indicator and click-to-edit
     */
    renderStatusCell(cellEl, cell) {
        const statusContainer = cellEl.createDiv("task-table-status");
        statusContainer.addClass("clickable-status");
        // Add status icon
        const statusIcon = statusContainer.createSpan("task-table-status-icon");
        const status = cell.value;
        switch (status) {
            case "x":
            case "X":
                setIcon(statusIcon, "check-circle");
                statusContainer.addClass("completed");
                break;
            case "/":
            case ">":
                setIcon(statusIcon, "clock");
                statusContainer.addClass("in-progress");
                break;
            case "-":
                setIcon(statusIcon, "x-circle");
                statusContainer.addClass("abandoned");
                break;
            case "?":
                setIcon(statusIcon, "help-circle");
                statusContainer.addClass("planned");
                break;
            default:
                setIcon(statusIcon, "circle");
                statusContainer.addClass("not-started");
        }
        // Add status text
        const statusText = statusContainer.createSpan("task-table-status-text");
        statusText.textContent = cell.displayValue;
        // Add click handler for status editing
        this.registerDomEvent(statusContainer, "click", (e) => {
            e.stopPropagation();
            this.openStatusMenu(cellEl, cell);
        });
        // Add hover effect
        statusContainer.title = t("Click to change status");
    }
    /**
     * Open status selection menu
     */
    openStatusMenu(cellEl, cell) {
        const rowId = cellEl.dataset.rowId;
        if (!rowId)
            return;
        const menu = new Menu();
        // Get unique statuses from taskStatusMarks
        const statusMarks = this.plugin.settings.taskStatusMarks;
        const uniqueStatuses = new Map();
        // Build a map of unique mark -> status name to avoid duplicates
        for (const status of Object.keys(statusMarks)) {
            const mark = statusMarks[status];
            // If this mark is not already in the map, add it
            // This ensures each mark appears only once in the menu
            if (!Array.from(uniqueStatuses.values()).includes(mark)) {
                uniqueStatuses.set(status, mark);
            }
        }
        // Create menu items from unique statuses
        for (const [status, mark] of uniqueStatuses) {
            menu.addItem((item) => {
                item.titleEl.createEl("span", {
                    cls: "status-option-checkbox",
                }, (el) => {
                    const checkbox = el.createEl("input", {
                        cls: "task-list-item-checkbox",
                        type: "checkbox",
                    });
                    checkbox.dataset.task = mark;
                    if (mark !== " ") {
                        checkbox.checked = true;
                    }
                });
                item.titleEl.createEl("span", {
                    cls: "status-option",
                    text: status,
                });
                item.onClick(() => {
                    if (this.onCellChange) {
                        // Also update completed status if needed
                        const isCompleted = mark.toLowerCase() === "x";
                        this.onCellChange(rowId, cell.columnId, mark);
                        // Note: completion status should be handled by the parent component
                    }
                });
            });
        }
        const rect = cellEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom + 5 });
    }
    /**
     * Render priority cell with visual indicator and click-to-edit
     */
    renderPriorityCell(cellEl, cell) {
        const priorityContainer = cellEl.createDiv("task-table-priority");
        priorityContainer.addClass("clickable-priority");
        const priority = cell.value;
        if (priority) {
            // Add priority icon
            const priorityIcon = priorityContainer.createSpan("task-table-priority-icon");
            // Add priority text with emoji and label
            const priorityText = priorityContainer.createSpan("task-table-priority-text");
            // Update priority icons and text according to 5-level system
            if (priority === 5) {
                setIcon(priorityIcon, "triangle");
                priorityIcon.addClass("highest");
                priorityText.textContent = t("Highest");
            }
            else if (priority === 4) {
                setIcon(priorityIcon, "alert-triangle");
                priorityIcon.addClass("high");
                priorityText.textContent = t("High");
            }
            else if (priority === 3) {
                setIcon(priorityIcon, "minus");
                priorityIcon.addClass("medium");
                priorityText.textContent = t("Medium");
            }
            else if (priority === 2) {
                setIcon(priorityIcon, "chevron-down");
                priorityIcon.addClass("low");
                priorityText.textContent = t("Low");
            }
            else if (priority === 1) {
                setIcon(priorityIcon, "chevrons-down");
                priorityIcon.addClass("lowest");
                priorityText.textContent = t("Lowest");
            }
        }
        else {
            // Empty priority cell
            const emptyText = priorityContainer.createSpan("task-table-priority-empty");
            emptyText.textContent = "\u00A0"; // Non-breaking space for invisible whitespace
            emptyText.addClass("empty-priority");
        }
        // Add click handler for priority editing
        this.registerDomEvent(priorityContainer, "click", (e) => {
            e.stopPropagation();
            this.openPriorityMenu(cellEl, cell);
        });
        // Add hover effect
        priorityContainer.title = t("Click to set priority");
    }
    /**
     * Open priority selection menu
     */
    openPriorityMenu(cellEl, cell) {
        const rowId = cellEl.dataset.rowId;
        if (!rowId)
            return;
        const menu = new Menu();
        // No priority option
        menu.addItem((item) => {
            item.setTitle(t("No priority"))
                .setIcon("circle")
                .onClick(() => {
                if (this.onCellChange) {
                    this.onCellChange(rowId, cell.columnId, null);
                }
            });
        });
        // Lowest priority (1)
        menu.addItem((item) => {
            item.setTitle(t("Lowest"))
                .setIcon("chevrons-down")
                .onClick(() => {
                if (this.onCellChange) {
                    this.onCellChange(rowId, cell.columnId, 1);
                }
            });
        });
        // Low priority (2)
        menu.addItem((item) => {
            item.setTitle(t("Low"))
                .setIcon("chevron-down")
                .onClick(() => {
                if (this.onCellChange) {
                    this.onCellChange(rowId, cell.columnId, 2);
                }
            });
        });
        // Medium priority (3)
        menu.addItem((item) => {
            item.setTitle(t("Medium"))
                .setIcon("minus")
                .onClick(() => {
                if (this.onCellChange) {
                    this.onCellChange(rowId, cell.columnId, 3);
                }
            });
        });
        // High priority (4)
        menu.addItem((item) => {
            item.setTitle(t("High"))
                .setIcon("alert-triangle")
                .onClick(() => {
                if (this.onCellChange) {
                    this.onCellChange(rowId, cell.columnId, 4);
                }
            });
        });
        // Highest priority (5)
        menu.addItem((item) => {
            item.setTitle(t("Highest"))
                .setIcon("triangle")
                .onClick(() => {
                if (this.onCellChange) {
                    this.onCellChange(rowId, cell.columnId, 5);
                }
            });
        });
        const rect = cellEl.getBoundingClientRect();
        menu.showAtPosition({ x: rect.left, y: rect.bottom + 5 });
    }
    /**
     * Render date cell with relative time and click-to-edit functionality
     */
    renderDateCell(cellEl, cell) {
        const dateContainer = cellEl.createDiv("task-table-date");
        dateContainer.addClass("clickable-date");
        if (cell.value) {
            const date = new Date(cell.value);
            date.setHours(0, 0, 0, 0); // Zero out time for consistent comparison
            const now = new Date();
            now.setHours(0, 0, 0, 0); // Zero out time for consistent comparison
            const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            // Add date text
            const dateText = dateContainer.createSpan("task-table-date-text");
            dateText.textContent = cell.displayValue;
            // Add relative indicator
            const relativeIndicator = dateContainer.createSpan("task-table-date-relative");
            if (diffDays === 0) {
                relativeIndicator.textContent = t("Today");
                relativeIndicator.addClass("today");
            }
            else if (diffDays === 1) {
                relativeIndicator.textContent = t("Tomorrow");
                relativeIndicator.addClass("tomorrow");
            }
            else if (diffDays === -1) {
                relativeIndicator.textContent = t("Yesterday");
                relativeIndicator.addClass("yesterday");
            }
            else if (diffDays < 0) {
                relativeIndicator.textContent = t("Overdue");
                relativeIndicator.addClass("overdue");
            }
            else if (diffDays <= 7) {
                relativeIndicator.textContent = `${diffDays}d`;
                relativeIndicator.addClass("upcoming");
            }
        }
        else {
            // Empty date cell
            const emptyText = dateContainer.createSpan("task-table-date-empty");
            emptyText.textContent = "\u00A0"; // Non-breaking space for invisible whitespace
            emptyText.addClass("empty-date");
        }
        // Add click handler for date editing
        if (this.app && this.plugin) {
            this.registerDomEvent(dateContainer, "click", (e) => {
                e.stopPropagation();
                this.openDatePicker(cellEl, cell);
            });
            // Add hover effect
            dateContainer.title = t("Click to edit date");
        }
    }
    /**
     * Open date picker for editing date
     */
    openDatePicker(cellEl, cell) {
        if (!this.app || !this.plugin)
            return;
        const rowId = cellEl.dataset.rowId;
        const columnId = cell.columnId;
        if (!rowId)
            return;
        // Get current date value - fix timezone offset issue
        let currentDate;
        if (cell.value) {
            const date = new Date(cell.value);
            // Use local date methods to avoid timezone offset
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            currentDate = `${year}-${month}-${day}`;
        }
        // Create date picker popover
        const popover = new DatePickerPopover(this.app, this.plugin, currentDate);
        popover.onDateSelected = (dateStr) => {
            if (this.onDateChange) {
                this.onDateChange(rowId, columnId, dateStr);
            }
        };
        // Position the popover near the cell
        const rect = cellEl.getBoundingClientRect();
        popover.showAtPosition({
            x: rect.left,
            y: rect.bottom + 5,
        });
    }
    /**
     * Render tags cell with inline editing and auto-suggest
     */
    renderTagsCell(cellEl, cell) {
        const tagsContainer = cellEl.createDiv("task-table-tags");
        const tags = cell.value;
        if (cell.editable) {
            // Create editable input for tags
            const input = tagsContainer.createEl("input", "task-table-tags-input");
            input.type = "text";
            const initialValue = (tags === null || tags === void 0 ? void 0 : tags.join(", ")) || "";
            input.value = initialValue;
            input.style.cssText =
                "border:none;background:transparent;width:100%;padding:0;font:inherit;";
            // Store initial value for comparison
            const originalTags = [...(tags || [])];
            // Setup autocomplete only when user starts typing or focuses
            let autoCompleteSetup = false;
            const setupAutoCompleteOnce = () => {
                if (!autoCompleteSetup && this.app) {
                    autoCompleteSetup = true;
                    this.setupAutoComplete(input, "tags");
                }
            };
            // Handle blur event to save changes
            this.registerDomEvent(input, "blur", () => {
                const newValue = input.value.trim();
                const newTags = newValue
                    ? newValue
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter((tag) => tag.length > 0)
                    : [];
                // Only save if tags actually changed
                if (!this.arraysEqual(originalTags, newTags)) {
                    this.saveCellValue(cellEl, cell, newTags);
                }
            });
            // Handle Enter key to save and exit
            this.registerDomEvent(input, "keydown", (e) => {
                if (e.key === "Enter") {
                    input.blur();
                    e.preventDefault();
                }
                e.stopPropagation();
            });
            // Setup autocomplete on focus or first input
            this.registerDomEvent(input, "focus", setupAutoCompleteOnce);
            this.registerDomEvent(input, "input", setupAutoCompleteOnce);
            // Stop click propagation
            this.registerDomEvent(input, "click", (e) => {
                e.stopPropagation();
                // Use requestAnimationFrame instead of setTimeout for better performance
                requestAnimationFrame(() => input.focus());
            });
        }
        else {
            // Display tags as chips - optimized version
            if (tags && tags.length > 0) {
                // Use a single text content instead of multiple DOM elements for better performance
                tagsContainer.textContent = tags.join(", ");
                tagsContainer.addClass("task-table-tags-display");
            }
            else {
                tagsContainer.textContent = "\u00A0"; // Non-breaking space
                tagsContainer.addClass("empty-tags");
            }
        }
    }
    /**
     * Render number cell with proper alignment
     */
    renderNumberCell(cellEl, cell) {
        cellEl.addClass("task-table-number");
        cellEl.textContent = cell.displayValue;
    }
    /**
     * Render text cell with inline editing and auto-suggest
     */
    renderTextCell(cellEl, cell, row) {
        var _a, _b, _c, _d;
        cellEl.addClass("task-table-text");
        // For content column (rowNumber), use cleaned content without tags and other marks
        const isContentColumn = cell.columnId === "content";
        const isProjectColumn = cell.columnId === "project";
        // Get effective project value for project column
        let displayText;
        let effectiveValue;
        let isReadonly = false;
        if (isProjectColumn && ((_b = (_a = row === null || row === void 0 ? void 0 : row.task) === null || _a === void 0 ? void 0 : _a.metadata) === null || _b === void 0 ? void 0 : _b.tgProject)) {
            effectiveValue = getEffectiveProject(row.task) || "";
            displayText = effectiveValue;
            isReadonly = isProjectReadonly(row.task);
        }
        else if (isContentColumn) {
            displayText = clearAllMarks(cell.value || cell.displayValue);
            effectiveValue = displayText;
        }
        else {
            displayText = cell.displayValue;
            effectiveValue = cell.value || "";
        }
        if (cell.editable && !isReadonly) {
            // Create editable input
            const input = cellEl.createEl("input", "task-table-text-input");
            input.type = "text";
            input.value = displayText;
            input.style.cssText =
                "border:none;background:transparent;width:100%;padding:0;font:inherit;";
            // Store initial value for comparison - should match what's shown in the input
            // For content column, use the cleaned text; for others, use the raw value
            const originalValue = isContentColumn
                ? displayText // This is the cleaned text that user sees and edits
                : effectiveValue;
            // Setup autocomplete only when user starts typing or focuses
            let autoCompleteSetup = false;
            const setupAutoCompleteOnce = () => {
                if (!autoCompleteSetup && this.app) {
                    autoCompleteSetup = true;
                    if (cell.columnId === "project") {
                        this.setupAutoComplete(input, "project");
                    }
                    else if (cell.columnId === "context") {
                        this.setupAutoComplete(input, "context");
                    }
                }
            };
            // Handle blur event to save changes
            this.registerDomEvent(input, "blur", () => {
                const newValue = input.value.trim();
                // Only save if value actually changed
                if (originalValue !== newValue) {
                    this.saveCellValue(cellEl, cell, newValue);
                }
            });
            // Handle Enter key to save and exit
            this.registerDomEvent(input, "keydown", (e) => {
                if (e.key === "Enter") {
                    input.blur();
                    e.preventDefault();
                }
                // Stop propagation to prevent triggering table events
                e.stopPropagation();
            });
            // Setup autocomplete on focus or first input for project/context columns
            if (cell.columnId === "project" || cell.columnId === "context") {
                this.registerDomEvent(input, "focus", setupAutoCompleteOnce);
                this.registerDomEvent(input, "input", setupAutoCompleteOnce);
            }
            // Stop click propagation to prevent row selection
            this.registerDomEvent(input, "click", (e) => {
                e.stopPropagation();
                requestAnimationFrame(() => input.focus());
            });
        }
        else {
            cellEl.textContent = displayText;
            if (cell.columnId === "filePath") {
                this.registerDomEvent(cellEl, "click", (e) => {
                    e.stopPropagation();
                    const file = this.plugin.app.vault.getFileByPath(cell.value);
                    if (file) {
                        this.plugin.app.workspace.getLeaf(true).openFile(file);
                    }
                });
                cellEl.title = t("Click to open file");
            }
        }
        // Add tgProject indicator for project column - only show if no user-set project exists
        if (isProjectColumn &&
            ((_d = (_c = row === null || row === void 0 ? void 0 : row.task) === null || _c === void 0 ? void 0 : _c.metadata) === null || _d === void 0 ? void 0 : _d.tgProject) &&
            (!row.task.metadata.project || !row.task.metadata.project.trim())) {
            const tgProject = row.task.metadata.tgProject;
            const indicator = cellEl.createDiv({
                cls: "project-source-indicator table-indicator",
            });
            // Create indicator icon based on tgProject type
            let indicatorIcon = "";
            let indicatorTitle = "";
            switch (tgProject.type) {
                case "path":
                    indicatorIcon = "📁";
                    indicatorTitle =
                        t("Auto-assigned from path") + `: ${tgProject.source}`;
                    break;
                case "metadata":
                    indicatorIcon = "📄";
                    indicatorTitle =
                        t("Auto-assigned from file metadata") +
                            `: ${tgProject.source}`;
                    break;
                case "config":
                    indicatorIcon = "⚙️";
                    indicatorTitle =
                        t("Auto-assigned from config file") +
                            `: ${tgProject.source}`;
                    break;
                default:
                    indicatorIcon = "🔗";
                    indicatorTitle =
                        t("Auto-assigned") + `: ${tgProject.source}`;
            }
            indicator.innerHTML = `<span class="indicator-icon">${indicatorIcon}</span>`;
            indicator.title = indicatorTitle;
            if (isReadonly) {
                indicator.addClass("readonly-indicator");
                cellEl.addClass("readonly-cell");
            }
            else {
                indicator.addClass("override-indicator");
            }
        }
        // Add tooltip for long text - only if necessary
        if (displayText.length > 50) {
            cellEl.title = displayText;
        }
    }
    /**
     * Render empty state
     */
    renderEmptyState() {
        const emptyRow = this.bodyEl.createEl("tr", "task-table-empty-row");
        const emptyCell = emptyRow.createEl("td", "task-table-empty-cell");
        emptyCell.colSpan = this.columns.length;
        emptyCell.textContent = t("No tasks found");
    }
    /**
     * Update row selection visual state
     */
    updateSelection(selectedRows) {
        const rows = this.bodyEl.querySelectorAll("tr[data-row-id]");
        rows.forEach((row) => {
            const rowId = row.dataset.rowId;
            if (rowId) {
                row.toggleClass("selected", selectedRows.has(rowId));
            }
        });
    }
    /**
     * Update sort indicators in header
     */
    updateSortIndicators(sortField, sortOrder) {
        // Clear all sort indicators
        const sortIcons = this.headerEl.querySelectorAll(".task-table-sort-icon");
        sortIcons.forEach((icon) => {
            icon.empty();
            setIcon(icon, "chevrons-up-down");
            icon.removeClass("asc", "desc");
        });
        // Set active sort indicator
        const activeHeader = this.headerEl.querySelector(`th[data-column-id="${sortField}"]`);
        if (activeHeader) {
            const sortIcon = activeHeader.querySelector(".task-table-sort-icon");
            if (sortIcon) {
                sortIcon.empty();
                setIcon(sortIcon, sortOrder === "asc" ? "chevron-up" : "chevron-down");
                sortIcon.addClass(sortOrder);
            }
        }
    }
    /**
     * Setup column resize handlers
     */
    setupResizeHandlers() {
        this.registerDomEvent(document, "mousemove", this.handleMouseMove.bind(this));
        this.registerDomEvent(document, "mouseup", this.handleMouseUp.bind(this));
    }
    /**
     * Handle mouse move during resize - prevent triggering sort when resizing
     */
    handleMouseMove(event) {
        if (!this.isResizing)
            return;
        const deltaX = event.clientX - this.resizeStartX;
        const newWidth = Math.max(50, this.resizeStartWidth + deltaX);
        // Update column width
        this.updateColumnWidth(this.resizeColumn, newWidth);
    }
    /**
     * Start column resize
     */
    startResize(event, columnId, currentWidth) {
        event.preventDefault();
        event.stopPropagation(); // Prevent triggering sort
        this.isResizing = true;
        this.resizeColumn = columnId;
        this.resizeStartX = event.clientX;
        this.resizeStartWidth = currentWidth;
        document.body.style.cursor = "col-resize";
        this.tableEl.addClass("resizing");
    }
    /**
     * Handle mouse up to end resize
     */
    handleMouseUp() {
        if (!this.isResizing)
            return;
        this.isResizing = false;
        this.resizeColumn = "";
        document.body.style.cursor = "";
        this.tableEl.removeClass("resizing");
    }
    /**
     * Update column width
     */
    updateColumnWidth(columnId, newWidth) {
        // Update header
        const headerCell = this.headerEl.querySelector(`th[data-column-id="${columnId}"]`);
        if (headerCell) {
            headerCell.style.width = `${newWidth}px`;
            headerCell.style.minWidth = `${Math.min(newWidth, 50)}px`;
        }
        // Update body cells
        const bodyCells = this.bodyEl.querySelectorAll(`td[data-column-id="${columnId}"]`);
        bodyCells.forEach((cell) => {
            const cellEl = cell;
            cellEl.style.width = `${newWidth}px`;
            cellEl.style.minWidth = `${Math.min(newWidth, 50)}px`;
        });
        // Update column definition
        const column = this.columns.find((c) => c.id === columnId);
        if (column) {
            column.width = newWidth;
        }
    }
    /**
     * Toggle row expansion (for tree view)
     */
    toggleRowExpansion(rowId) {
        // This will be handled by the parent component
        // Emit event or call callback
        if (this.onRowExpand) {
            this.onRowExpand(rowId);
        }
        else {
            // Fallback: dispatch event
            const event = new CustomEvent("rowToggle", {
                detail: { rowId },
            });
            this.tableEl.dispatchEvent(event);
        }
    }
    /**
     * Update columns configuration and re-render header
     */
    updateColumns(newColumns) {
        this.columns = newColumns;
        this.renderHeader();
    }
    /**
     * Force clear all cached rows and DOM elements - useful for complete refresh
     */
    forceClearCache() {
        // Clear all active rows
        this.activeRows.clear();
        // Clear row pool
        this.rowPool = [];
        // Clear all event cleanup maps
        this.eventCleanupMap.clear();
        // Clear active suggests
        this.activeSuggests.forEach((suggest) => {
            suggest.close();
        });
        this.activeSuggests.clear();
        // Clear the table body completely
        this.bodyEl.empty();
    }
    /**
     * Get all available values for auto-completion from existing tasks
     */
    getAllValues(columnType) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.plugin)
                return [];
            // Get all tasks from dataflow
            let allTasks = [];
            if (this.plugin.dataflowOrchestrator) {
                try {
                    const queryAPI = this.plugin.dataflowOrchestrator.getQueryAPI();
                    allTasks = yield queryAPI.getAllTasks();
                }
                catch (error) {
                    console.warn("Failed to get tasks from dataflow:", error);
                    allTasks = [];
                }
            }
            const values = new Set();
            allTasks.forEach((task) => {
                var _a;
                switch (columnType) {
                    case "tags":
                        (_a = task.metadata.tags) === null || _a === void 0 ? void 0 : _a.forEach((tag) => {
                            if (tag && tag.trim()) {
                                // Remove # prefix if present
                                const cleanTag = tag.startsWith("#")
                                    ? tag.substring(1)
                                    : tag;
                                values.add(cleanTag);
                            }
                        });
                        break;
                    case "project":
                        if (task.metadata.project && task.metadata.project.trim()) {
                            values.add(task.metadata.project);
                        }
                        break;
                    case "context":
                        if (task.metadata.context && task.metadata.context.trim()) {
                            values.add(task.metadata.context);
                        }
                        break;
                }
            });
            return Array.from(values).sort();
        });
    }
    /**
     * Helper method to compare two arrays for equality
     */
    arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) {
            return false;
        }
        // Sort both arrays for comparison to ignore order differences
        const sorted1 = [...arr1].sort();
        const sorted2 = [...arr2].sort();
        return sorted1.every((value, index) => value === sorted2[index]);
    }
    /**
     * Save cell value helper - now with improved change detection
     */
    saveCellValue(cellEl, cell, newValue) {
        const rowId = cellEl.dataset.rowId;
        if (rowId && this.onCellChange) {
            // The caller should have already verified the value has changed
            // This method now assumes a change is needed
            this.onCellChange(rowId, cell.columnId, newValue);
        }
    }
    /**
     * Clear empty state element if it exists
     */
    clearEmptyState() {
        const emptyRow = this.bodyEl.querySelector(".task-table-empty-row");
        if (emptyRow) {
            emptyRow.remove();
        }
    }
    /**
     * Ensure tree state consistency - check and update expansion button states
     */
    ensureTreeStateConsistency(rowEl, row) {
        // Find the expansion button in the row
        const expandBtn = rowEl.querySelector(".task-table-expand-btn");
        if (expandBtn && row.hasChildren) {
            // Simple check: just update the icon to ensure it's correct
            // This is safer than trying to detect the current state
            const expectedIcon = row.expanded
                ? "chevron-down"
                : "chevron-right";
            // Always update the icon to ensure consistency
            expandBtn.empty();
            setIcon(expandBtn, expectedIcon);
            // Update tooltip text
            expandBtn.title = row.expanded
                ? row.level > 0
                    ? t("Collapse")
                    : t("Collapse subtasks")
                : row.level > 0
                    ? t("Expand")
                    : t("Expand subtasks");
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFibGVSZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhYmxlUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBTyxNQUFNLFVBQVUsQ0FBQztBQUd6RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBVXRGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxTQUFTO0lBcUMzQyxZQUNTLE9BQW9CLEVBQ3BCLFFBQXFCLEVBQ3JCLE1BQW1CLEVBQ25CLE9BQXNCLEVBQ3RCLE1BQTJCLEVBQzNCLEdBQVEsRUFDUixNQUE2QjtRQUVyQyxLQUFLLEVBQUUsQ0FBQztRQVJBLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFDcEIsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ25CLFlBQU8sR0FBUCxPQUFPLENBQWU7UUFDdEIsV0FBTSxHQUFOLE1BQU0sQ0FBcUI7UUFDM0IsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNSLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBM0M5QixtQkFBYyxHQUEwQixJQUFJLENBQUM7UUFDN0MsZUFBVSxHQUFZLEtBQUssQ0FBQztRQUM1QixpQkFBWSxHQUFXLENBQUMsQ0FBQztRQUN6QixpQkFBWSxHQUFXLEVBQUUsQ0FBQztRQUMxQixxQkFBZ0IsR0FBVyxDQUFDLENBQUM7UUFFckMsV0FB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LFNBQVMsR0FBRyxLQUFLLENBQUMsYUFBYSxDQUNwQyx3QkFBd0IsQ0FDVCxDQUFDO1FBRWpCLElBQUksU0FBUyxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUU7WUFDakMsNERBQTREO1lBQzVELHdEQUF3RDtZQUN4RCxNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsUUFBUTtnQkFDaEMsQ0FBQyxDQUFDLGNBQWM7Z0JBQ2hCLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFFbkIsK0NBQStDO1lBQy9DLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRWpDLHNCQUFzQjtZQUN0QixTQUFTLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRO2dCQUM3QixDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDO29CQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO29CQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUM7Z0JBQ3pCLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUM7b0JBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1NBQ3hCO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBzZXRJY29uLCBNZW51LCBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFibGVDb2x1bW4sIFRhYmxlUm93LCBUYWJsZUNlbGwgfSBmcm9tIFwiLi9UYWJsZVR5cGVzXCI7XHJcbmltcG9ydCB7IFRhYmxlU3BlY2lmaWNDb25maWcgfSBmcm9tIFwiLi4vLi4vLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5pbXBvcnQgeyBEYXRlUGlja2VyUG9wb3ZlciB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvZGF0ZS1waWNrZXIvRGF0ZVBpY2tlclBvcG92ZXJcIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IENvbnRleHRTdWdnZXN0LCBQcm9qZWN0U3VnZ2VzdCwgVGFnU3VnZ2VzdCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvaW5wdXRzL0F1dG9Db21wbGV0ZVwiO1xyXG5pbXBvcnQgeyBjbGVhckFsbE1hcmtzIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aS9yZW5kZXJlcnMvTWFya2Rvd25SZW5kZXJlclwiO1xyXG5pbXBvcnQgeyBnZXRFZmZlY3RpdmVQcm9qZWN0LCBpc1Byb2plY3RSZWFkb25seSB9IGZyb20gXCJAL3V0aWxzL3Rhc2svdGFzay1vcGVyYXRpb25zXCI7XHJcblxyXG4vLyBDYWNoZSBmb3IgYXV0b2NvbXBsZXRlIGRhdGEgdG8gYXZvaWQgcmVwZWF0ZWQgZXhwZW5zaXZlIG9wZXJhdGlvbnNcclxuaW50ZXJmYWNlIEF1dG9Db21wbGV0ZUNhY2hlIHtcclxuXHR0YWdzOiBzdHJpbmdbXTtcclxuXHRwcm9qZWN0czogc3RyaW5nW107XHJcblx0Y29udGV4dHM6IHN0cmluZ1tdO1xyXG5cdGxhc3RVcGRhdGU6IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFRhYmxlIHJlbmRlcmVyIGNvbXBvbmVudCByZXNwb25zaWJsZSBmb3IgcmVuZGVyaW5nIHRoZSB0YWJsZSBIVE1MIHN0cnVjdHVyZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRhYmxlUmVuZGVyZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgcmVzaXplT2JzZXJ2ZXI6IFJlc2l6ZU9ic2VydmVyIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBpc1Jlc2l6aW5nOiBib29sZWFuID0gZmFsc2U7XHJcblx0cHJpdmF0ZSByZXNpemVTdGFydFg6IG51bWJlciA9IDA7XHJcblx0cHJpdmF0ZSByZXNpemVDb2x1bW46IHN0cmluZyA9IFwiXCI7XHJcblx0cHJpdmF0ZSByZXNpemVTdGFydFdpZHRoOiBudW1iZXIgPSAwO1xyXG5cclxuXHQvLyBET03oioLngrnnvJPlrZjmsaBcclxuXHRwcml2YXRlIHJvd1Bvb2w6IEhUTUxUYWJsZVJvd0VsZW1lbnRbXSA9IFtdO1xyXG5cdHByaXZhdGUgYWN0aXZlUm93czogTWFwPHN0cmluZywgSFRNTFRhYmxlUm93RWxlbWVudD4gPSBuZXcgTWFwKCk7XHJcblx0cHJpdmF0ZSBldmVudENsZWFudXBNYXA6IE1hcDxIVE1MRWxlbWVudCwgQXJyYXk8KCkgPT4gdm9pZD4+ID0gbmV3IE1hcCgpO1xyXG5cclxuXHQvLyBBdXRvQ29tcGxldGUgb3B0aW1pemF0aW9uXHJcblx0cHJpdmF0ZSBhdXRvQ29tcGxldGVDYWNoZTogQXV0b0NvbXBsZXRlQ2FjaGUgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGFjdGl2ZVN1Z2dlc3RzOiBNYXA8XHJcblx0XHRIVE1MSW5wdXRFbGVtZW50LFxyXG5cdFx0Q29udGV4dFN1Z2dlc3QgfCBQcm9qZWN0U3VnZ2VzdCB8IFRhZ1N1Z2dlc3RcclxuXHQ+ID0gbmV3IE1hcCgpO1xyXG5cdHByaXZhdGUgcmVhZG9ubHkgQ0FDSEVfRFVSQVRJT04gPSAzMDAwMDsgLy8gMzAgc2Vjb25kcyBjYWNoZVxyXG5cclxuXHQvLyBDYWxsYmFjayBmb3IgZGF0ZSBjaGFuZ2VzXHJcblx0cHVibGljIG9uRGF0ZUNoYW5nZT86IChcclxuXHRcdHJvd0lkOiBzdHJpbmcsXHJcblx0XHRjb2x1bW5JZDogc3RyaW5nLFxyXG5cdFx0bmV3RGF0ZTogc3RyaW5nIHwgbnVsbFxyXG5cdCkgPT4gdm9pZDtcclxuXHJcblx0Ly8gQ2FsbGJhY2sgZm9yIHJvdyBleHBhbnNpb25cclxuXHRwdWJsaWMgb25Sb3dFeHBhbmQ/OiAocm93SWQ6IHN0cmluZykgPT4gdm9pZDtcclxuXHJcblx0Ly8gQ2FsbGJhY2sgZm9yIGNlbGwgdmFsdWUgY2hhbmdlc1xyXG5cdHB1YmxpYyBvbkNlbGxDaGFuZ2U/OiAoXHJcblx0XHRyb3dJZDogc3RyaW5nLFxyXG5cdFx0Y29sdW1uSWQ6IHN0cmluZyxcclxuXHRcdG5ld1ZhbHVlOiBhbnlcclxuXHQpID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSB0YWJsZUVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHByaXZhdGUgaGVhZGVyRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBib2R5RWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0cHJpdmF0ZSBjb2x1bW5zOiBUYWJsZUNvbHVtbltdLFxyXG5cdFx0cHJpdmF0ZSBjb25maWc6IFRhYmxlU3BlY2lmaWNDb25maWcsXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMucmVuZGVySGVhZGVyKCk7XHJcblx0XHR0aGlzLnNldHVwUmVzaXplSGFuZGxlcnMoKTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgYWxsIHRyYWNrZWQgZXZlbnRzXHJcblx0XHR0aGlzLmV2ZW50Q2xlYW51cE1hcC5mb3JFYWNoKChjbGVhbnVwRm5zKSA9PiB7XHJcblx0XHRcdGNsZWFudXBGbnMuZm9yRWFjaCgoZm4pID0+IGZuKCkpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmV2ZW50Q2xlYW51cE1hcC5jbGVhcigpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIGFjdGl2ZSBzdWdnZXN0c1xyXG5cdFx0dGhpcy5hY3RpdmVTdWdnZXN0cy5mb3JFYWNoKChzdWdnZXN0KSA9PiB7XHJcblx0XHRcdHN1Z2dlc3QuY2xvc2UoKTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5hY3RpdmVTdWdnZXN0cy5jbGVhcigpO1xyXG5cclxuXHRcdC8vIENsZWFyIHJvdyBwb29sc1xyXG5cdFx0dGhpcy5yb3dQb29sID0gW107XHJcblx0XHR0aGlzLmFjdGl2ZVJvd3MuY2xlYXIoKTtcclxuXHJcblx0XHRpZiAodGhpcy5yZXNpemVPYnNlcnZlcikge1xyXG5cdFx0XHR0aGlzLnJlc2l6ZU9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBjYWNoZWQgYXV0b2NvbXBsZXRlIGRhdGEgb3IgZmV0Y2ggaWYgZXhwaXJlZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZ2V0QXV0b0NvbXBsZXRlRGF0YSgpOiBQcm9taXNlPEF1dG9Db21wbGV0ZUNhY2hlPiB7XHJcblx0XHRjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdGlmIChcclxuXHRcdFx0IXRoaXMuYXV0b0NvbXBsZXRlQ2FjaGUgfHxcclxuXHRcdFx0bm93IC0gdGhpcy5hdXRvQ29tcGxldGVDYWNoZS5sYXN0VXBkYXRlID4gdGhpcy5DQUNIRV9EVVJBVElPTlxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIEZldGNoIGZyZXNoIGRhdGFcclxuXHRcdFx0Y29uc3QgdGFncyA9IE9iamVjdC5rZXlzKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldFRhZ3MoKSB8fCB7fVxyXG5cdFx0XHQpLm1hcChcclxuXHRcdFx0XHQodGFnKSA9PiB0YWcuc3Vic3RyaW5nKDEpIC8vIFJlbW92ZSAjIHByZWZpeFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gR2V0IHByb2plY3RzIGFuZCBjb250ZXh0cyBmcm9tIGRhdGFmbG93XHJcblx0XHRcdGxldCBwcm9qZWN0czogc3RyaW5nW10gPSBbXTtcclxuXHRcdFx0bGV0IGNvbnRleHRzOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRoaXMucGx1Z2luLmRhdGFmbG93T3JjaGVzdHJhdG9yKSB7XHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHRcdGNvbnN0IGFsbFRhc2tzID0gYXdhaXQgcXVlcnlBUEkuZ2V0QWxsVGFza3MoKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0Ly8gRXh0cmFjdCB1bmlxdWUgcHJvamVjdHMgYW5kIGNvbnRleHRzIGZyb20gdGFza3NcclxuXHRcdFx0XHRcdGNvbnN0IHByb2plY3RTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0XHRcdGNvbnN0IGNvbnRleHRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0YWxsVGFza3MuZm9yRWFjaCgodGFzazogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0YXNrLnByb2plY3QpIHByb2plY3RTZXQuYWRkKHRhc2sucHJvamVjdCk7XHJcblx0XHRcdFx0XHRcdGlmICh0YXNrLmNvbnRleHQpIGNvbnRleHRTZXQuYWRkKHRhc2suY29udGV4dCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0cHJvamVjdHMgPSBBcnJheS5mcm9tKHByb2plY3RTZXQpLnNvcnQoKTtcclxuXHRcdFx0XHRcdGNvbnRleHRzID0gQXJyYXkuZnJvbShjb250ZXh0U2V0KS5zb3J0KCk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBnZXQgcHJvamVjdHMvY29udGV4dHMgZnJvbSBkYXRhZmxvdzpcIiwgZXJyb3IpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy5hdXRvQ29tcGxldGVDYWNoZSA9IHtcclxuXHRcdFx0XHR0YWdzLFxyXG5cdFx0XHRcdHByb2plY3RzLFxyXG5cdFx0XHRcdGNvbnRleHRzLFxyXG5cdFx0XHRcdGxhc3RVcGRhdGU6IG5vdyxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcy5hdXRvQ29tcGxldGVDYWNoZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBvciByZXVzZSBhdXRvY29tcGxldGUgc3VnZ2VzdCBmb3IgaW5wdXRcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHNldHVwQXV0b0NvbXBsZXRlKFxyXG5cdFx0aW5wdXQ6IEhUTUxJbnB1dEVsZW1lbnQsXHJcblx0XHR0eXBlOiBcInRhZ3NcIiB8IFwicHJvamVjdFwiIHwgXCJjb250ZXh0XCJcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdC8vIENoZWNrIGlmIHRoaXMgaW5wdXQgYWxyZWFkeSBoYXMgYSBzdWdnZXN0XHJcblx0XHRpZiAodGhpcy5hY3RpdmVTdWdnZXN0cy5oYXMoaW5wdXQpKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBkYXRhID0gYXdhaXQgdGhpcy5nZXRBdXRvQ29tcGxldGVEYXRhKCk7XHJcblx0XHRsZXQgc3VnZ2VzdDogQ29udGV4dFN1Z2dlc3QgfCBQcm9qZWN0U3VnZ2VzdCB8IFRhZ1N1Z2dlc3Q7XHJcblxyXG5cdFx0c3dpdGNoICh0eXBlKSB7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0c3VnZ2VzdCA9IG5ldyBUYWdTdWdnZXN0KHRoaXMuYXBwLCBpbnB1dCwgdGhpcy5wbHVnaW4pO1xyXG5cdFx0XHRcdC8vIE92ZXJyaWRlIHRoZSBleHBlbnNpdmUgZ2V0VGFncyBjYWxsIHdpdGggY2FjaGVkIGRhdGFcclxuXHRcdFx0XHQoc3VnZ2VzdCBhcyBhbnkpLmF2YWlsYWJsZUNob2ljZXMgPSBkYXRhLnRhZ3M7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0c3VnZ2VzdCA9IG5ldyBQcm9qZWN0U3VnZ2VzdCh0aGlzLmFwcCwgaW5wdXQsIHRoaXMucGx1Z2luKTtcclxuXHRcdFx0XHQoc3VnZ2VzdCBhcyBhbnkpLmF2YWlsYWJsZUNob2ljZXMgPSBkYXRhLnByb2plY3RzO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdHN1Z2dlc3QgPSBuZXcgQ29udGV4dFN1Z2dlc3QodGhpcy5hcHAsIGlucHV0LCB0aGlzLnBsdWdpbik7XHJcblx0XHRcdFx0KHN1Z2dlc3QgYXMgYW55KS5hdmFpbGFibGVDaG9pY2VzID0gZGF0YS5jb250ZXh0cztcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3RzLnNldChpbnB1dCwgc3VnZ2VzdCk7XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgd2hlbiBpbnB1dCBpcyByZW1vdmVkIG9yIGxvc2VzIGZvY3VzIHBlcm1hbmVudGx5XHJcblx0XHRjb25zdCBjbGVhbnVwID0gKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzdWdnZXN0SW5zdGFuY2UgPSB0aGlzLmFjdGl2ZVN1Z2dlc3RzLmdldChpbnB1dCk7XHJcblx0XHRcdGlmIChzdWdnZXN0SW5zdGFuY2UpIHtcclxuXHRcdFx0XHRzdWdnZXN0SW5zdGFuY2UuY2xvc2UoKTtcclxuXHRcdFx0XHR0aGlzLmFjdGl2ZVN1Z2dlc3RzLmRlbGV0ZShpbnB1dCk7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgd2hlbiBpbnB1dCBpcyByZW1vdmVkIGZyb20gRE9NXHJcblx0XHRjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKChtdXRhdGlvbnMpID0+IHtcclxuXHRcdFx0bXV0YXRpb25zLmZvckVhY2goKG11dGF0aW9uKSA9PiB7XHJcblx0XHRcdFx0bXV0YXRpb24ucmVtb3ZlZE5vZGVzLmZvckVhY2goKG5vZGUpID0+IHtcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0bm9kZSA9PT0gaW5wdXQgfHxcclxuXHRcdFx0XHRcdFx0KG5vZGUgaW5zdGFuY2VvZiBFbGVtZW50ICYmIG5vZGUuY29udGFpbnMoaW5wdXQpKVxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGNsZWFudXAoKTtcclxuXHRcdFx0XHRcdFx0b2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBjaGlsZExpc3Q6IHRydWUsIHN1YnRyZWU6IHRydWUgfSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIHRhYmxlIGhlYWRlclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVySGVhZGVyKCkge1xyXG5cdFx0dGhpcy5oZWFkZXJFbC5lbXB0eSgpO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlclJvdyA9IHRoaXMuaGVhZGVyRWwuY3JlYXRlRWwoXCJ0clwiLCBcInRhc2stdGFibGUtaGVhZGVyLXJvd1wiKTtcclxuXHJcblx0XHR0aGlzLmNvbHVtbnMuZm9yRWFjaCgoY29sdW1uKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRoID0gaGVhZGVyUm93LmNyZWF0ZUVsKFwidGhcIiwgXCJ0YXNrLXRhYmxlLWhlYWRlci1jZWxsXCIpO1xyXG5cdFx0XHR0aC5kYXRhc2V0LmNvbHVtbklkID0gY29sdW1uLmlkO1xyXG5cdFx0XHR0aC5zdHlsZS53aWR0aCA9IGAke2NvbHVtbi53aWR0aH1weGA7XHJcblx0XHRcdHRoLnN0eWxlLm1pbldpZHRoID0gYCR7TWF0aC5taW4oY29sdW1uLndpZHRoLCA1MCl9cHhgO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGhlYWRlciBjb250ZW50IGNvbnRhaW5lclxyXG5cdFx0XHRjb25zdCBoZWFkZXJDb250ZW50ID0gdGguY3JlYXRlRGl2KFwidGFzay10YWJsZS1oZWFkZXItY29udGVudFwiKTtcclxuXHJcblx0XHRcdC8vIEFkZCBjb2x1bW4gdGl0bGVcclxuXHRcdFx0Y29uc3QgdGl0bGVTcGFuID0gaGVhZGVyQ29udGVudC5jcmVhdGVTcGFuKFxyXG5cdFx0XHRcdFwidGFzay10YWJsZS1oZWFkZXItdGl0bGVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aXRsZVNwYW4udGV4dENvbnRlbnQgPSBjb2x1bW4udGl0bGU7XHJcblxyXG5cdFx0XHQvLyBBZGQgc29ydCBpbmRpY2F0b3IgaWYgc29ydGFibGVcclxuXHRcdFx0aWYgKGNvbHVtbi5zb3J0YWJsZSkge1xyXG5cdFx0XHRcdHRoLmFkZENsYXNzKFwic29ydGFibGVcIik7XHJcblx0XHRcdFx0Y29uc3Qgc29ydEljb24gPSBoZWFkZXJDb250ZW50LmNyZWF0ZVNwYW4oXHJcblx0XHRcdFx0XHRcInRhc2stdGFibGUtc29ydC1pY29uXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHNldEljb24oc29ydEljb24sIFwiY2hldnJvbnMtdXAtZG93blwiKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHJlc2l6ZSBoYW5kbGUgaWYgcmVzaXphYmxlXHJcblx0XHRcdGlmIChjb2x1bW4ucmVzaXphYmxlICYmIHRoaXMuY29uZmlnLnJlc2l6YWJsZUNvbHVtbnMpIHtcclxuXHRcdFx0XHRjb25zdCByZXNpemVIYW5kbGUgPSB0aC5jcmVhdGVEaXYoXCJ0YXNrLXRhYmxlLXJlc2l6ZS1oYW5kbGVcIik7XHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHJlc2l6ZUhhbmRsZSwgXCJtb3VzZWRvd25cIiwgKGUpID0+IHtcclxuXHRcdFx0XHRcdHRoaXMuc3RhcnRSZXNpemUoZSwgY29sdW1uLmlkLCBjb2x1bW4ud2lkdGgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTZXQgdGV4dCBhbGlnbm1lbnRcclxuXHRcdFx0aWYgKGNvbHVtbi5hbGlnbikge1xyXG5cdFx0XHRcdHRoLnN0eWxlLnRleHRBbGlnbiA9IGNvbHVtbi5hbGlnbjtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIHRhYmxlIGJvZHkgd2l0aCByb3dzIHVzaW5nIGltcHJvdmVkIERPTSBub2RlIHJlY3ljbGluZ1xyXG5cdCAqL1xyXG5cdHB1YmxpYyByZW5kZXJUYWJsZShcclxuXHRcdHJvd3M6IFRhYmxlUm93W10sXHJcblx0XHRzZWxlY3RlZFJvd3M6IFNldDxzdHJpbmc+LFxyXG5cdFx0c3RhcnRJbmRleDogbnVtYmVyID0gMCxcclxuXHRcdHRvdGFsUm93cz86IG51bWJlclxyXG5cdCkge1xyXG5cdFx0Ly8gQWx3YXlzIGNsZWFyIGVtcHR5IHN0YXRlIGZpcnN0IGlmIGl0IGV4aXN0c1xyXG5cdFx0dGhpcy5jbGVhckVtcHR5U3RhdGUoKTtcclxuXHJcblx0XHRpZiAocm93cy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0dGhpcy5jbGVhckFsbFJvd3MoKTtcclxuXHRcdFx0dGhpcy5yZW5kZXJFbXB0eVN0YXRlKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBIYW5kbGUgdmlydHVhbCBzY3JvbGwgc3BhY2VyIGZpcnN0XHJcblx0XHR0aGlzLnVwZGF0ZVZpcnR1YWxTY3JvbGxTcGFjZXIoc3RhcnRJbmRleCk7XHJcblxyXG5cdFx0Ly8gVHJhY2sgd2hpY2ggcm93IElEcyBhcmUgY3VycmVudGx5IG5lZWRlZFxyXG5cdFx0Y29uc3QgbmVlZGVkUm93SWRzID0gbmV3IFNldChyb3dzLm1hcCgocm93KSA9PiByb3cuaWQpKTtcclxuXHRcdGNvbnN0IGN1cnJlbnRSb3dFbGVtZW50cyA9IEFycmF5LmZyb20oXHJcblx0XHRcdHRoaXMuYm9keUVsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJ0cltkYXRhLXJvdy1pZF1cIilcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gU3RlcCAxOiBSZW1vdmUgcm93cyB0aGF0IGFyZSBubyBsb25nZXIgbmVlZGVkXHJcblx0XHRjb25zdCByb3dzVG9SZW1vdmU6IHN0cmluZ1tdID0gW107XHJcblx0XHR0aGlzLmFjdGl2ZVJvd3MuZm9yRWFjaCgocm93RWwsIHJvd0lkKSA9PiB7XHJcblx0XHRcdGlmICghbmVlZGVkUm93SWRzLmhhcyhyb3dJZCkpIHtcclxuXHRcdFx0XHRyb3dzVG9SZW1vdmUucHVzaChyb3dJZCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFJldHVybiB1bm5lZWRlZCByb3dzIHRvIHBvb2wgKGJhdGNoIG9wZXJhdGlvbilcclxuXHRcdGlmIChyb3dzVG9SZW1vdmUubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRjb25zdCBmcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcclxuXHRcdFx0cm93c1RvUmVtb3ZlLmZvckVhY2goKHJvd0lkKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgcm93RWwgPSB0aGlzLmFjdGl2ZVJvd3MuZ2V0KHJvd0lkKTtcclxuXHRcdFx0XHRpZiAocm93RWwgJiYgcm93RWwucGFyZW50Tm9kZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5hY3RpdmVSb3dzLmRlbGV0ZShyb3dJZCk7XHJcblx0XHRcdFx0XHRmcmFnbWVudC5hcHBlbmRDaGlsZChyb3dFbCk7IC8vIE1vdmUgdG8gZnJhZ21lbnQgKHJlbW92ZXMgZnJvbSBET00pXHJcblx0XHRcdFx0XHR0aGlzLnJldHVyblJvd1RvUG9vbChyb3dFbCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTdGVwIDI6IEJ1aWxkIGEgbWFwIG9mIGN1cnJlbnQgRE9NIHBvc2l0aW9uc1xyXG5cdFx0Y29uc3Qgc3BhY2VyRWxlbWVudCA9IHRoaXMuYm9keUVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLnZpcnR1YWwtc2Nyb2xsLXNwYWNlci10b3BcIlxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHRhcmdldFBvc2l0aW9uID0gc3BhY2VyRWxlbWVudCA/IDEgOiAwOyAvLyBQb3NpdGlvbiBhZnRlciBzcGFjZXJcclxuXHJcblx0XHQvLyBTdGVwIDM6IFByb2Nlc3MgZWFjaCBuZWVkZWQgcm93XHJcblx0XHRjb25zdCByb3dzVG9JbnNlcnQ6IHsgZWxlbWVudDogSFRNTFRhYmxlUm93RWxlbWVudDsgaW5kZXg6IG51bWJlciB9W10gPVxyXG5cdFx0XHRbXTtcclxuXHJcblx0XHRyb3dzLmZvckVhY2goKHJvdywgaW5kZXgpID0+IHtcclxuXHRcdFx0bGV0IHJvd0VsID0gdGhpcy5hY3RpdmVSb3dzLmdldChyb3cuaWQpO1xyXG5cdFx0XHRjb25zdCB0YXJnZXRJbmRleCA9IHRhcmdldFBvc2l0aW9uICsgaW5kZXg7XHJcblxyXG5cdFx0XHRpZiAoIXJvd0VsKSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIG5ldyByb3dcclxuXHRcdFx0XHRyb3dFbCA9IHRoaXMuZ2V0Um93RnJvbVBvb2woKTtcclxuXHRcdFx0XHR0aGlzLmFjdGl2ZVJvd3Muc2V0KHJvdy5pZCwgcm93RWwpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlUm93KHJvd0VsLCByb3csIHNlbGVjdGVkUm93cy5oYXMocm93LmlkKSk7XHJcblx0XHRcdFx0cm93c1RvSW5zZXJ0LnB1c2goeyBlbGVtZW50OiByb3dFbCwgaW5kZXg6IHRhcmdldEluZGV4IH0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEFsd2F5cyB1cGRhdGUgZXhpc3Rpbmcgcm93cyB0byBlbnN1cmUgdGhleSByZWZsZWN0IGN1cnJlbnQgc29ydCBvcmRlclxyXG5cdFx0XHRcdC8vIFRoaXMgaXMgY3J1Y2lhbCBmb3IgcHJvcGVyIHJlLXJlbmRlcmluZyBhZnRlciBzb3J0aW5nXHJcblx0XHRcdFx0dGhpcy51cGRhdGVSb3cocm93RWwsIHJvdywgc2VsZWN0ZWRSb3dzLmhhcyhyb3cuaWQpKTtcclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgcm93IG5lZWRzIHJlcG9zaXRpb25pbmdcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50SW5kZXggPSBBcnJheS5mcm9tKHRoaXMuYm9keUVsLmNoaWxkcmVuKS5pbmRleE9mKFxyXG5cdFx0XHRcdFx0cm93RWxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChjdXJyZW50SW5kZXggIT09IHRhcmdldEluZGV4KSB7XHJcblx0XHRcdFx0XHRyb3dzVG9JbnNlcnQucHVzaCh7IGVsZW1lbnQ6IHJvd0VsLCBpbmRleDogdGFyZ2V0SW5kZXggfSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTdGVwIDQ6IEluc2VydC9yZXBvc2l0aW9uIHJvd3MgZWZmaWNpZW50bHlcclxuXHRcdGlmIChyb3dzVG9JbnNlcnQubGVuZ3RoID4gMCkge1xyXG5cdFx0XHQvLyBTb3J0IGJ5IHRhcmdldCBpbmRleCB0byBpbnNlcnQgaW4gY29ycmVjdCBvcmRlclxyXG5cdFx0XHRyb3dzVG9JbnNlcnQuc29ydCgoYSwgYikgPT4gYS5pbmRleCAtIGIuaW5kZXgpO1xyXG5cclxuXHRcdFx0Ly8gVXNlIGluc2VydEJlZm9yZSBmb3IgcHJlY2lzZSBwb3NpdGlvbmluZ1xyXG5cdFx0XHRjb25zdCBjaGlsZHJlbiA9IEFycmF5LmZyb20odGhpcy5ib2R5RWwuY2hpbGRyZW4pO1xyXG5cdFx0XHRyb3dzVG9JbnNlcnQuZm9yRWFjaCgoeyBlbGVtZW50LCBpbmRleCB9KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVmZXJlbmNlTm9kZSA9IGNoaWxkcmVuW2luZGV4XTtcclxuXHRcdFx0XHRpZiAocmVmZXJlbmNlTm9kZSAmJiByZWZlcmVuY2VOb2RlICE9PSBlbGVtZW50KSB7XHJcblx0XHRcdFx0XHR0aGlzLmJvZHlFbC5pbnNlcnRCZWZvcmUoZWxlbWVudCwgcmVmZXJlbmNlTm9kZSk7XHJcblx0XHRcdFx0fSBlbHNlIGlmICghcmVmZXJlbmNlTm9kZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5ib2R5RWwuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE9wdGltaXplZCByb3cgdXBkYXRlIGNoZWNrIC0gbW9yZSBwcmVjaXNlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzaG91bGRVcGRhdGVSb3coXHJcblx0XHRyb3dFbDogSFRNTFRhYmxlUm93RWxlbWVudCxcclxuXHRcdHJvdzogVGFibGVSb3csXHJcblx0XHRpc1NlbGVjdGVkOiBib29sZWFuXHJcblx0KTogYm9vbGVhbiB7XHJcblx0XHQvLyBRdWljayBjaGVja3MgZmlyc3RcclxuXHRcdGNvbnN0IGN1cnJlbnRSb3dJZCA9IHJvd0VsLmRhdGFzZXQucm93SWQ7XHJcblx0XHRpZiAoY3VycmVudFJvd0lkICE9PSByb3cuaWQpIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdGNvbnN0IHdhc1NlbGVjdGVkID0gcm93RWwuaGFzQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdGlmICh3YXNTZWxlY3RlZCAhPT0gaXNTZWxlY3RlZCkgcmV0dXJuIHRydWU7XHJcblxyXG5cdFx0Y29uc3QgY3VycmVudExldmVsID0gcGFyc2VJbnQocm93RWwuZGF0YXNldC5sZXZlbCB8fCBcIjBcIik7XHJcblx0XHRpZiAoY3VycmVudExldmVsICE9PSByb3cubGV2ZWwpIHJldHVybiB0cnVlO1xyXG5cclxuXHRcdC8vIENoZWNrIGV4cGFuZGVkIHN0YXRlIGZvciB0cmVlIHZpZXdcclxuXHRcdGNvbnN0IGN1cnJlbnRFeHBhbmRlZCA9IHJvd0VsLmRhdGFzZXQuZXhwYW5kZWQgPT09IFwidHJ1ZVwiO1xyXG5cdFx0aWYgKGN1cnJlbnRFeHBhbmRlZCAhPT0gcm93LmV4cGFuZGVkKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBoYXNDaGlsZHJlbiBzdGF0ZSBjaGFuZ2VkXHJcblx0XHRjb25zdCBjdXJyZW50SGFzQ2hpbGRyZW4gPSByb3dFbC5kYXRhc2V0Lmhhc0NoaWxkcmVuID09PSBcInRydWVcIjtcclxuXHRcdGlmIChjdXJyZW50SGFzQ2hpbGRyZW4gIT09IHJvdy5oYXNDaGlsZHJlbikgcmV0dXJuIHRydWU7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgcm93IGhhcyB0aGUgcmlnaHQgbnVtYmVyIG9mIGNlbGxzXHJcblx0XHRjb25zdCBjdXJyZW50Q2VsbENvdW50ID0gcm93RWwucXVlcnlTZWxlY3RvckFsbChcInRkXCIpLmxlbmd0aDtcclxuXHRcdGlmIChjdXJyZW50Q2VsbENvdW50ICE9PSByb3cuY2VsbHMubGVuZ3RoKSByZXR1cm4gdHJ1ZTtcclxuXHJcblx0XHQvLyBPcHRpbWl6ZWQgY2VsbCBjb250ZW50IGNoZWNrIC0gb25seSBjaGVjayBrZXkgZmllbGRzIHRoYXQgY2hhbmdlIGZyZXF1ZW50bHlcclxuXHRcdGNvbnN0IGN1cnJlbnRDZWxscyA9IHJvd0VsLnF1ZXJ5U2VsZWN0b3JBbGwoXCJ0ZFwiKTtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgTWF0aC5taW4ocm93LmNlbGxzLmxlbmd0aCwgMyk7IGkrKykge1xyXG5cdFx0XHQvLyBPbmx5IGNoZWNrIGZpcnN0IDMgY2VsbHMgZm9yIHBlcmZvcm1hbmNlXHJcblx0XHRcdGNvbnN0IGNlbGwgPSByb3cuY2VsbHNbaV07XHJcblx0XHRcdGNvbnN0IGN1cnJlbnRDZWxsID0gY3VycmVudENlbGxzW2ldO1xyXG5cclxuXHRcdFx0aWYgKCFjdXJyZW50Q2VsbCkgcmV0dXJuIHRydWU7IC8vIENlbGwgbWlzc2luZ1xyXG5cclxuXHRcdFx0Ly8gRm9yIGVkaXRhYmxlIHRleHQgY2VsbHMsIGNoZWNrIHRoZSBhY3R1YWwgY29udGVudFxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0Y2VsbC5lZGl0YWJsZSAmJlxyXG5cdFx0XHRcdChjZWxsLmNvbHVtbklkID09PSBcImNvbnRlbnRcIiB8fFxyXG5cdFx0XHRcdFx0Y2VsbC5jb2x1bW5JZCA9PT0gXCJwcm9qZWN0XCIgfHxcclxuXHRcdFx0XHRcdGNlbGwuY29sdW1uSWQgPT09IFwiY29udGV4dFwiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRjb25zdCBpbnB1dCA9IGN1cnJlbnRDZWxsLnF1ZXJ5U2VsZWN0b3IoXCJpbnB1dFwiKTtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50VmFsdWUgPSBpbnB1dFxyXG5cdFx0XHRcdFx0PyBpbnB1dC52YWx1ZVxyXG5cdFx0XHRcdFx0OiBjdXJyZW50Q2VsbC50ZXh0Q29udGVudCB8fCBcIlwiO1xyXG5cdFx0XHRcdGNvbnN0IG5ld1ZhbHVlID0gY2VsbC5kaXNwbGF5VmFsdWUgfHwgXCJcIjtcclxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlLnRyaW0oKSAhPT0gbmV3VmFsdWUudHJpbSgpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gRm9yIHRhZ3MgY2VsbHMsIGNvbXBhcmUgYXJyYXkgY29udGVudFxyXG5cdFx0XHRlbHNlIGlmIChjZWxsLmNvbHVtbklkID09PSBcInRhZ3NcIikge1xyXG5cdFx0XHRcdGNvbnN0IG5ld1RhZ3MgPSBBcnJheS5pc0FycmF5KGNlbGwudmFsdWUpID8gY2VsbC52YWx1ZSA6IFtdO1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRUYWdzVGV4dCA9IGN1cnJlbnRDZWxsLnRleHRDb250ZW50IHx8IFwiXCI7XHJcblx0XHRcdFx0Y29uc3QgZXhwZWN0ZWRUYWdzVGV4dCA9IG5ld1RhZ3Muam9pbihcIiwgXCIpO1xyXG5cdFx0XHRcdGlmIChjdXJyZW50VGFnc1RleHQudHJpbSgpICE9PSBleHBlY3RlZFRhZ3NUZXh0LnRyaW0oKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGEgcm93IGVsZW1lbnQgZnJvbSB0aGUgcG9vbCBvciBjcmVhdGUgYSBuZXcgb25lXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRSb3dGcm9tUG9vbCgpOiBIVE1MVGFibGVSb3dFbGVtZW50IHtcclxuXHRcdGxldCByb3dFbCA9IHRoaXMucm93UG9vbC5wb3AoKTtcclxuXHRcdGlmICghcm93RWwpIHtcclxuXHRcdFx0cm93RWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidHJcIik7XHJcblx0XHRcdHJvd0VsLmFkZENsYXNzKFwidGFzay10YWJsZS1yb3dcIik7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gcm93RWw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZXR1cm4gYSByb3cgZWxlbWVudCB0byB0aGUgcG9vbCBmb3IgcmV1c2VcclxuXHQgKi9cclxuXHRwcml2YXRlIHJldHVyblJvd1RvUG9vbChyb3dFbDogSFRNTFRhYmxlUm93RWxlbWVudCkge1xyXG5cdFx0Ly8gQ2xlYW4gdXAgZXZlbnQgbGlzdGVuZXJzXHJcblx0XHR0aGlzLmNsZWFudXBSb3dFdmVudHMocm93RWwpO1xyXG5cclxuXHRcdC8vIENsZWFyIHJvdyBjb250ZW50IGFuZCBhdHRyaWJ1dGVzIGVmZmljaWVudGx5XHJcblx0XHRyb3dFbC5lbXB0eSgpO1xyXG5cdFx0cm93RWwuY2xhc3NOYW1lID0gXCJ0YXNrLXRhYmxlLXJvd1wiO1xyXG5cclxuXHRcdC8vIEJhdGNoIGF0dHJpYnV0ZSByZW1vdmFsXHJcblx0XHRjb25zdCBhdHRyaWJ1dGVzVG9SZW1vdmUgPSBbXHJcblx0XHRcdFwiZGF0YS1yb3ctaWRcIixcclxuXHRcdFx0XCJkYXRhLWxldmVsXCIsXHJcblx0XHRcdFwiZGF0YS1leHBhbmRlZFwiLFxyXG5cdFx0XHRcImRhdGEtaGFzLWNoaWxkcmVuXCIsXHJcblx0XHRdO1xyXG5cdFx0YXR0cmlidXRlc1RvUmVtb3ZlLmZvckVhY2goKGF0dHIpID0+IHJvd0VsLnJlbW92ZUF0dHJpYnV0ZShhdHRyKSk7XHJcblxyXG5cdFx0Ly8gQWRkIHRvIHBvb2wgaWYgbm90IHRvbyBtYW55XHJcblx0XHRpZiAodGhpcy5yb3dQb29sLmxlbmd0aCA8IDUwKSB7XHJcblx0XHRcdC8vIFJlZHVjZWQgcG9vbCBzaXplIGZvciBiZXR0ZXIgbWVtb3J5IHVzYWdlXHJcblx0XHRcdHRoaXMucm93UG9vbC5wdXNoKHJvd0VsKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFJlbW92ZSBmcm9tIERPTSBjb21wbGV0ZWx5XHJcblx0XHRcdHJvd0VsLnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGEgcm93IGVsZW1lbnQgd2l0aCBuZXcgZGF0YSAtIG9wdGltaXplZCB2ZXJzaW9uXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVSb3coXHJcblx0XHRyb3dFbDogSFRNTFRhYmxlUm93RWxlbWVudCxcclxuXHRcdHJvdzogVGFibGVSb3csXHJcblx0XHRpc1NlbGVjdGVkOiBib29sZWFuXHJcblx0KSB7XHJcblx0XHQvLyBDbGVhbiB1cCBwcmV2aW91cyBldmVudHMgZm9yIHRoaXMgcm93XHJcblx0XHR0aGlzLmNsZWFudXBSb3dFdmVudHMocm93RWwpO1xyXG5cclxuXHRcdC8vIENsZWFyIGFuZCBzZXQgYmFzaWMgYXR0cmlidXRlcyBlZmZpY2llbnRseVxyXG5cdFx0cm93RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyBCYXRjaCBkYXRhc2V0IHVwZGF0ZXNcclxuXHRcdGNvbnN0IGRhdGFzZXQgPSByb3dFbC5kYXRhc2V0O1xyXG5cdFx0ZGF0YXNldC5yb3dJZCA9IHJvdy5pZDtcclxuXHRcdGRhdGFzZXQubGV2ZWwgPSByb3cubGV2ZWwudG9TdHJpbmcoKTtcclxuXHRcdGRhdGFzZXQuZXhwYW5kZWQgPSByb3cuZXhwYW5kZWQudG9TdHJpbmcoKTtcclxuXHRcdGRhdGFzZXQuaGFzQ2hpbGRyZW4gPSByb3cuaGFzQ2hpbGRyZW4udG9TdHJpbmcoKTtcclxuXHJcblx0XHQvLyBVcGRhdGUgY2xhc3NlcyBlZmZpY2llbnRseSB1c2luZyBhIHNpbmdsZSBjbGFzc05hbWUgYXNzaWdubWVudFxyXG5cdFx0Y29uc3QgY2xhc3NOYW1lcyA9IFtcclxuXHRcdFx0XCJ0YXNrLXRhYmxlLXJvd1wiLFxyXG5cdFx0XHQuLi4ocm93LmxldmVsID4gMFxyXG5cdFx0XHRcdD8gW2B0YXNrLXRhYmxlLXJvdy1sZXZlbC0ke3Jvdy5sZXZlbH1gLCBcInRhc2stdGFibGUtc3VidGFza1wiXVxyXG5cdFx0XHRcdDogW10pLFxyXG5cdFx0XHQuLi4ocm93Lmhhc0NoaWxkcmVuID8gW1widGFzay10YWJsZS1wYXJlbnRcIl0gOiBbXSksXHJcblx0XHRcdC4uLihpc1NlbGVjdGVkID8gW1wic2VsZWN0ZWRcIl0gOiBbXSksXHJcblx0XHRcdC4uLihyb3cuY2xhc3NOYW1lID8gW3Jvdy5jbGFzc05hbWVdIDogW10pLFxyXG5cdFx0XTtcclxuXHRcdHJvd0VsLmNsYXNzTmFtZSA9IGNsYXNzTmFtZXMuam9pbihcIiBcIik7XHJcblxyXG5cdFx0Ly8gUHJlLWNhbGN1bGF0ZSBjb21tb24gc3R5bGVzIHRvIGF2b2lkIHJlcGVhdGVkIGNhbGN1bGF0aW9uc1xyXG5cdFx0Y29uc3QgaXNTdWJ0YXNrID0gcm93LmxldmVsID4gMDtcclxuXHRcdGNvbnN0IHN1YnRhc2tPcGFjaXR5ID0gaXNTdWJ0YXNrID8gXCIwLjlcIiA6IFwiXCI7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGRvY3VtZW50IGZyYWdtZW50IGZvciBiYXRjaCBET00gb3BlcmF0aW9uc1xyXG5cdFx0Y29uc3QgZnJhZ21lbnQgPSBkb2N1bWVudC5jcmVhdGVEb2N1bWVudEZyYWdtZW50KCk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIGNlbGxzXHJcblx0XHRyb3cuY2VsbHMuZm9yRWFjaCgoY2VsbCwgaW5kZXgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29sdW1uID0gdGhpcy5jb2x1bW5zW2luZGV4XTtcclxuXHRcdFx0aWYgKCFjb2x1bW4pIHJldHVybjtcclxuXHJcblx0XHRcdGNvbnN0IHRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRkXCIpO1xyXG5cdFx0XHR0ZC5jbGFzc05hbWUgPSBcInRhc2stdGFibGUtY2VsbFwiO1xyXG5cclxuXHRcdFx0Ly8gQmF0Y2ggZGF0YXNldCBhbmQgc3R5bGUgdXBkYXRlc1xyXG5cdFx0XHR0ZC5kYXRhc2V0LmNvbHVtbklkID0gY2VsbC5jb2x1bW5JZDtcclxuXHRcdFx0dGQuZGF0YXNldC5yb3dJZCA9IHJvdy5pZDtcclxuXHJcblx0XHRcdC8vIFNldCBjZWxsIHdpZHRoIGFuZCBzdHlsZXMgZWZmaWNpZW50bHlcclxuXHRcdFx0dGQuc3R5bGUuY3NzVGV4dCA9IGB3aWR0aDoke2NvbHVtbi53aWR0aH1weDttaW4td2lkdGg6JHtNYXRoLm1pbihcclxuXHRcdFx0XHRjb2x1bW4ud2lkdGgsXHJcblx0XHRcdFx0NTBcclxuXHRcdFx0KX1weDske2NvbHVtbi5hbGlnbiA/IGB0ZXh0LWFsaWduOiR7Y29sdW1uLmFsaWdufTtgIDogXCJcIn1gO1xyXG5cclxuXHRcdFx0Ly8gQXBwbHkgc3VidGFzayBzdHlsaW5nIGlmIG5lZWRlZFxyXG5cdFx0XHRpZiAoaXNTdWJ0YXNrKSB7XHJcblx0XHRcdFx0dGQuY2xhc3NMaXN0LmFkZChcInRhc2stdGFibGUtc3VidGFzay1jZWxsXCIpO1xyXG5cdFx0XHRcdGlmIChzdWJ0YXNrT3BhY2l0eSkge1xyXG5cdFx0XHRcdFx0dGQuc3R5bGUub3BhY2l0eSA9IHN1YnRhc2tPcGFjaXR5O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVuZGVyIGNvbnRlbnQgYmFzZWQgb24gY29sdW1uIHR5cGVcclxuXHRcdFx0aWYgKGNvbHVtbi5pZCA9PT0gXCJyb3dOdW1iZXJcIikge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyVHJlZVN0cnVjdHVyZSh0ZCwgcm93LCBjZWxsLCBjb2x1bW4pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyQ2VsbENvbnRlbnQodGQsIGNlbGwsIGNvbHVtbiwgcm93KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGNlbGwuY2xhc3NOYW1lKSB7XHJcblx0XHRcdFx0dGQuY2xhc3NMaXN0LmFkZChjZWxsLmNsYXNzTmFtZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGZyYWdtZW50LmFwcGVuZENoaWxkKHRkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIFNpbmdsZSBET00gYXBwZW5kIG9wZXJhdGlvblxyXG5cdFx0cm93RWwuYXBwZW5kQ2hpbGQoZnJhZ21lbnQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHZpcnR1YWwgc2Nyb2xsIHNwYWNlciAtIHNpbXBsaWZpZWQgYW5kIG9wdGltaXplZFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlVmlydHVhbFNjcm9sbFNwYWNlcihzdGFydEluZGV4OiBudW1iZXIpIHtcclxuXHRcdC8vIEFsd2F5cyBjbGVhciBleGlzdGluZyBzcGFjZXJzIGZpcnN0XHJcblx0XHR0aGlzLmNsZWFyVmlydHVhbFNwYWNlcnMoKTtcclxuXHJcblx0XHQvLyBPbmx5IGNyZWF0ZSBzcGFjZXIgaWYgd2UncmUgdHJ1bHkgc2Nyb2xsZWQgZG93biAobm90IGp1c3QgYXQgdGhlIGVkZ2UpXHJcblx0XHRpZiAoc3RhcnRJbmRleCA8PSAwKSB7XHJcblx0XHRcdHJldHVybjsgLy8gTm8gc3BhY2VycyBuZWVkZWQgd2hlbiBhdCBvciBuZWFyIHRoZSB0b3BcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgdG9wIHNwYWNlciBmb3Igcm93cyBhYm92ZSB2aWV3cG9ydFxyXG5cdFx0Y29uc3QgdG9wU3BhY2VyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInRyXCIpO1xyXG5cdFx0dG9wU3BhY2VyLmNsYXNzTmFtZSA9IFwidmlydHVhbC1zY3JvbGwtc3BhY2VyLXRvcFwiO1xyXG5cclxuXHRcdGNvbnN0IHRvcFNwYWNlckNlbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwidGRcIik7XHJcblx0XHR0b3BTcGFjZXJDZWxsLmNvbFNwYW4gPSB0aGlzLmNvbHVtbnMubGVuZ3RoO1xyXG5cdFx0dG9wU3BhY2VyQ2VsbC5zdHlsZS5jc3NUZXh0ID0gYFxyXG5cdFx0XHRoZWlnaHQ6ICR7c3RhcnRJbmRleCAqIDQwfXB4O1xyXG5cdFx0XHRwYWRkaW5nOiAwO1xyXG5cdFx0XHRtYXJnaW46IDA7XHJcblx0XHRcdGJvcmRlcjogbm9uZTtcclxuXHRcdFx0YmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7XHJcblx0XHRcdGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XHJcblx0XHRcdGxpbmUtaGVpZ2h0OiAwO1xyXG5cdFx0YDtcclxuXHJcblx0XHR0b3BTcGFjZXIuYXBwZW5kQ2hpbGQodG9wU3BhY2VyQ2VsbCk7XHJcblxyXG5cdFx0Ly8gSW5zZXJ0IGF0IHRoZSB2ZXJ5IGJlZ2lubmluZ1xyXG5cdFx0dGhpcy5ib2R5RWwuaW5zZXJ0QmVmb3JlKHRvcFNwYWNlciwgdGhpcy5ib2R5RWwuZmlyc3RDaGlsZCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBleGlzdGluZyB2aXJ0dWFsIHNwYWNlcnMgLSBvcHRpbWl6ZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGNsZWFyVmlydHVhbFNwYWNlcnMoKSB7XHJcblx0XHQvLyBVc2UgbW9yZSBlZmZpY2llbnQgc2VsZWN0b3IgYW5kIHJlbW92YWxcclxuXHRcdGNvbnN0IHNwYWNlcnMgPSB0aGlzLmJvZHlFbC5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcIi52aXJ0dWFsLXNjcm9sbC1zcGFjZXItdG9wLCAudmlydHVhbC1zY3JvbGwtc3BhY2VyLWJvdHRvbVwiXHJcblx0XHQpO1xyXG5cdFx0c3BhY2Vycy5mb3JFYWNoKChzcGFjZXIpID0+IHNwYWNlci5yZW1vdmUoKSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBhbGwgcm93cyBhbmQgcmV0dXJuIHRoZW0gdG8gcG9vbFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2xlYXJBbGxSb3dzKCkge1xyXG5cdFx0Ly8gQmF0Y2ggY2xlYW51cCBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcblx0XHRjb25zdCByb3dzVG9DbGVhbnVwID0gQXJyYXkuZnJvbSh0aGlzLmFjdGl2ZVJvd3MudmFsdWVzKCkpO1xyXG5cdFx0cm93c1RvQ2xlYW51cC5mb3JFYWNoKChyb3dFbCkgPT4ge1xyXG5cdFx0XHR0aGlzLnJldHVyblJvd1RvUG9vbChyb3dFbCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWN0aXZlUm93cy5jbGVhcigpO1xyXG5cdFx0dGhpcy5ib2R5RWwuZW1wdHkoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENsZWFuIHVwIGV2ZW50IGxpc3RlbmVycyBmb3IgYSByb3cgLSBvcHRpbWl6ZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGNsZWFudXBSb3dFdmVudHMoZWxlbWVudDogSFRNTEVsZW1lbnQpIHtcclxuXHRcdGNvbnN0IGNsZWFudXBGbnMgPSB0aGlzLmV2ZW50Q2xlYW51cE1hcC5nZXQoZWxlbWVudCk7XHJcblx0XHRpZiAoY2xlYW51cEZucykge1xyXG5cdFx0XHRjbGVhbnVwRm5zLmZvckVhY2goKGZuKSA9PiBmbigpKTtcclxuXHRcdFx0dGhpcy5ldmVudENsZWFudXBNYXAuZGVsZXRlKGVsZW1lbnQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFsc28gY2xlYW4gdXAgY2hpbGQgZWxlbWVudHMgLSBidXQgbGltaXQgZGVwdGggZm9yIHBlcmZvcm1hbmNlXHJcblx0XHRjb25zdCBjaGlsZEVsZW1lbnRzID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcImlucHV0LCBidXR0b24sIFtkYXRhLWNsZWFudXBdXCJcclxuXHRcdCk7XHJcblx0XHRjaGlsZEVsZW1lbnRzLmZvckVhY2goKGNoaWxkKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNoaWxkQ2xlYW51cCA9IHRoaXMuZXZlbnRDbGVhbnVwTWFwLmdldChjaGlsZCBhcyBIVE1MRWxlbWVudCk7XHJcblx0XHRcdGlmIChjaGlsZENsZWFudXApIHtcclxuXHRcdFx0XHRjaGlsZENsZWFudXAuZm9yRWFjaCgoZm4pID0+IGZuKCkpO1xyXG5cdFx0XHRcdHRoaXMuZXZlbnRDbGVhbnVwTWFwLmRlbGV0ZShjaGlsZCBhcyBIVE1MRWxlbWVudCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogT3ZlcnJpZGUgcmVnaXN0ZXJEb21FdmVudCB0byB0cmFjayBjbGVhbnVwIGZ1bmN0aW9uc1xyXG5cdCAqL1xyXG5cdHJlZ2lzdGVyRG9tRXZlbnQ8SyBleHRlbmRzIGtleW9mIEhUTUxFbGVtZW50RXZlbnRNYXA+KFxyXG5cdFx0ZWw6IEhUTUxFbGVtZW50IHwgRG9jdW1lbnQgfCBXaW5kb3csXHJcblx0XHR0eXBlOiBLLFxyXG5cdFx0Y2FsbGJhY2s6ICh0aGlzOiBIVE1MRWxlbWVudCwgZXY6IEhUTUxFbGVtZW50RXZlbnRNYXBbS10pID0+IGFueSxcclxuXHRcdG9wdGlvbnM/OiBib29sZWFuIHwgQWRkRXZlbnRMaXN0ZW5lck9wdGlvbnNcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIENhbGwgdGhlIGFwcHJvcHJpYXRlIG92ZXJsb2FkIGJhc2VkIG9uIHRoZSBlbGVtZW50IHR5cGVcclxuXHRcdGlmIChlbCBpbnN0YW5jZW9mIFdpbmRvdykge1xyXG5cdFx0XHRzdXBlci5yZWdpc3RlckRvbUV2ZW50KGVsLCB0eXBlIGFzIGFueSwgY2FsbGJhY2sgYXMgYW55LCBvcHRpb25zKTtcclxuXHRcdH0gZWxzZSBpZiAoZWwgaW5zdGFuY2VvZiBEb2N1bWVudCkge1xyXG5cdFx0XHRzdXBlci5yZWdpc3RlckRvbUV2ZW50KGVsLCB0eXBlIGFzIGFueSwgY2FsbGJhY2sgYXMgYW55LCBvcHRpb25zKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHN1cGVyLnJlZ2lzdGVyRG9tRXZlbnQoZWwsIHR5cGUsIGNhbGxiYWNrLCBvcHRpb25zKTtcclxuXHJcblx0XHRcdC8vIFRyYWNrIGNsZWFudXAgZm9yIEhUTUxFbGVtZW50cyBvbmx5XHJcblx0XHRcdGlmICghdGhpcy5ldmVudENsZWFudXBNYXAuaGFzKGVsKSkge1xyXG5cdFx0XHRcdHRoaXMuZXZlbnRDbGVhbnVwTWFwLnNldChlbCwgW10pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuZXZlbnRDbGVhbnVwTWFwLmdldChlbCkhLnB1c2goKCkgPT4ge1xyXG5cdFx0XHRcdGVsLnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2sgYXMgYW55LCBvcHRpb25zKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdHJlZSBzdHJ1Y3R1cmUgZm9yIGNvbnRlbnQgY29sdW1uXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJUcmVlU3RydWN0dXJlKFxyXG5cdFx0Y2VsbEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdHJvdzogVGFibGVSb3csXHJcblx0XHRjZWxsOiBUYWJsZUNlbGwsXHJcblx0XHRjb2x1bW46IFRhYmxlQ29sdW1uXHJcblx0KSB7XHJcblx0XHRjb25zdCB0cmVlQ29udGFpbmVyID0gY2VsbEVsLmNyZWF0ZURpdihcInRhc2stdGFibGUtdHJlZS1jb250YWluZXJcIik7XHJcblxyXG5cdFx0aWYgKHJvdy5sZXZlbCA+IDApIHtcclxuXHRcdFx0Ly8gQWRkIGV4cGFuZC9jb2xsYXBzZSBidXR0b24gZm9yIHBhcmVudCByb3dzXHJcblx0XHRcdGlmIChyb3cuaGFzQ2hpbGRyZW4pIHtcclxuXHRcdFx0XHRjb25zdCBleHBhbmRCdG4gPSB0cmVlQ29udGFpbmVyLmNyZWF0ZVNwYW4oXHJcblx0XHRcdFx0XHRcInRhc2stdGFibGUtZXhwYW5kLWJ0blwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRleHBhbmRCdG4uYWRkQ2xhc3MoXCJjbGlja2FibGUtaWNvblwiKTtcclxuXHRcdFx0XHRzZXRJY29uKFxyXG5cdFx0XHRcdFx0ZXhwYW5kQnRuLFxyXG5cdFx0XHRcdFx0cm93LmV4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZXhwYW5kQnRuLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdFx0dGhpcy50b2dnbGVSb3dFeHBhbnNpb24ocm93LmlkKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRleHBhbmRCdG4udGl0bGUgPSByb3cuZXhwYW5kZWQgPyB0KFwiQ29sbGFwc2VcIikgOiB0KFwiRXhwYW5kXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2UgaWYgKHJvdy5oYXNDaGlsZHJlbikge1xyXG5cdFx0XHQvLyBUb3AtbGV2ZWwgcGFyZW50IHRhc2sgd2l0aCBjaGlsZHJlblxyXG5cdFx0XHRjb25zdCBleHBhbmRCdG4gPSB0cmVlQ29udGFpbmVyLmNyZWF0ZVNwYW4oXCJ0YXNrLXRhYmxlLWV4cGFuZC1idG5cIik7XHJcblx0XHRcdGV4cGFuZEJ0bi5hZGRDbGFzcyhcImNsaWNrYWJsZS1pY29uXCIpO1xyXG5cdFx0XHRleHBhbmRCdG4uYWRkQ2xhc3MoXCJ0YXNrLXRhYmxlLXRvcC1sZXZlbC1leHBhbmRcIik7XHJcblx0XHRcdHNldEljb24oZXhwYW5kQnRuLCByb3cuZXhwYW5kZWQgPyBcImNoZXZyb24tZG93blwiIDogXCJjaGV2cm9uLXJpZ2h0XCIpO1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZXhwYW5kQnRuLCBcImNsaWNrXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLnRvZ2dsZVJvd0V4cGFuc2lvbihyb3cuaWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdFx0ZXhwYW5kQnRuLnRpdGxlID0gcm93LmV4cGFuZGVkXHJcblx0XHRcdFx0PyB0KFwiQ29sbGFwc2Ugc3VidGFza3NcIilcclxuXHRcdFx0XHQ6IHQoXCJFeHBhbmQgc3VidGFza3NcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGNvbnRlbnQgd3JhcHBlclxyXG5cdFx0Y29uc3QgY29udGVudFdyYXBwZXIgPSB0cmVlQ29udGFpbmVyLmNyZWF0ZURpdihcclxuXHRcdFx0XCJ0YXNrLXRhYmxlLWNvbnRlbnQtd3JhcHBlclwiXHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIFJlbmRlciB0aGUgYWN0dWFsIGNlbGwgY29udGVudFxyXG5cdFx0dGhpcy5yZW5kZXJDZWxsQ29udGVudChjb250ZW50V3JhcHBlciwgY2VsbCwgY29sdW1uLCByb3cpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGNlbGwgY29udGVudCBiYXNlZCBvbiBjb2x1bW4gdHlwZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyQ2VsbENvbnRlbnQoXHJcblx0XHRjZWxsRWw6IEhUTUxFbGVtZW50LFxyXG5cdFx0Y2VsbDogVGFibGVDZWxsLFxyXG5cdFx0Y29sdW1uOiBUYWJsZUNvbHVtbixcclxuXHRcdHJvdz86IFRhYmxlUm93XHJcblx0KSB7XHJcblx0XHRjZWxsRWwuZW1wdHkoKTtcclxuXHJcblx0XHRzd2l0Y2ggKGNvbHVtbi50eXBlKSB7XHJcblx0XHRcdGNhc2UgXCJzdGF0dXNcIjpcclxuXHRcdFx0XHR0aGlzLnJlbmRlclN0YXR1c0NlbGwoY2VsbEVsLCBjZWxsKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcInByaW9yaXR5XCI6XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJQcmlvcml0eUNlbGwoY2VsbEVsLCBjZWxsKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImRhdGVcIjpcclxuXHRcdFx0XHR0aGlzLnJlbmRlckRhdGVDZWxsKGNlbGxFbCwgY2VsbCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJUYWdzQ2VsbChjZWxsRWwsIGNlbGwpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwibnVtYmVyXCI6XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJOdW1iZXJDZWxsKGNlbGxFbCwgY2VsbCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJUZXh0Q2VsbChjZWxsRWwsIGNlbGwsIHJvdyk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgc3RhdHVzIGNlbGwgd2l0aCB2aXN1YWwgaW5kaWNhdG9yIGFuZCBjbGljay10by1lZGl0XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJTdGF0dXNDZWxsKGNlbGxFbDogSFRNTEVsZW1lbnQsIGNlbGw6IFRhYmxlQ2VsbCkge1xyXG5cdFx0Y29uc3Qgc3RhdHVzQ29udGFpbmVyID0gY2VsbEVsLmNyZWF0ZURpdihcInRhc2stdGFibGUtc3RhdHVzXCIpO1xyXG5cdFx0c3RhdHVzQ29udGFpbmVyLmFkZENsYXNzKFwiY2xpY2thYmxlLXN0YXR1c1wiKTtcclxuXHJcblx0XHQvLyBBZGQgc3RhdHVzIGljb25cclxuXHRcdGNvbnN0IHN0YXR1c0ljb24gPSBzdGF0dXNDb250YWluZXIuY3JlYXRlU3BhbihcInRhc2stdGFibGUtc3RhdHVzLWljb25cIik7XHJcblx0XHRjb25zdCBzdGF0dXMgPSBjZWxsLnZhbHVlIGFzIHN0cmluZztcclxuXHJcblx0XHRzd2l0Y2ggKHN0YXR1cykge1xyXG5cdFx0XHRjYXNlIFwieFwiOlxyXG5cdFx0XHRjYXNlIFwiWFwiOlxyXG5cdFx0XHRcdHNldEljb24oc3RhdHVzSWNvbiwgXCJjaGVjay1jaXJjbGVcIik7XHJcblx0XHRcdFx0c3RhdHVzQ29udGFpbmVyLmFkZENsYXNzKFwiY29tcGxldGVkXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiL1wiOlxyXG5cdFx0XHRjYXNlIFwiPlwiOlxyXG5cdFx0XHRcdHNldEljb24oc3RhdHVzSWNvbiwgXCJjbG9ja1wiKTtcclxuXHRcdFx0XHRzdGF0dXNDb250YWluZXIuYWRkQ2xhc3MoXCJpbi1wcm9ncmVzc1wiKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcIi1cIjpcclxuXHRcdFx0XHRzZXRJY29uKHN0YXR1c0ljb24sIFwieC1jaXJjbGVcIik7XHJcblx0XHRcdFx0c3RhdHVzQ29udGFpbmVyLmFkZENsYXNzKFwiYWJhbmRvbmVkXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwiP1wiOlxyXG5cdFx0XHRcdHNldEljb24oc3RhdHVzSWNvbiwgXCJoZWxwLWNpcmNsZVwiKTtcclxuXHRcdFx0XHRzdGF0dXNDb250YWluZXIuYWRkQ2xhc3MoXCJwbGFubmVkXCIpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdHNldEljb24oc3RhdHVzSWNvbiwgXCJjaXJjbGVcIik7XHJcblx0XHRcdFx0c3RhdHVzQ29udGFpbmVyLmFkZENsYXNzKFwibm90LXN0YXJ0ZWRcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHN0YXR1cyB0ZXh0XHJcblx0XHRjb25zdCBzdGF0dXNUZXh0ID0gc3RhdHVzQ29udGFpbmVyLmNyZWF0ZVNwYW4oXCJ0YXNrLXRhYmxlLXN0YXR1cy10ZXh0XCIpO1xyXG5cdFx0c3RhdHVzVGV4dC50ZXh0Q29udGVudCA9IGNlbGwuZGlzcGxheVZhbHVlO1xyXG5cclxuXHRcdC8vIEFkZCBjbGljayBoYW5kbGVyIGZvciBzdGF0dXMgZWRpdGluZ1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHN0YXR1c0NvbnRhaW5lciwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHR0aGlzLm9wZW5TdGF0dXNNZW51KGNlbGxFbCwgY2VsbCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgaG92ZXIgZWZmZWN0XHJcblx0XHRzdGF0dXNDb250YWluZXIudGl0bGUgPSB0KFwiQ2xpY2sgdG8gY2hhbmdlIHN0YXR1c1wiKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE9wZW4gc3RhdHVzIHNlbGVjdGlvbiBtZW51XHJcblx0ICovXHJcblx0cHJpdmF0ZSBvcGVuU3RhdHVzTWVudShjZWxsRWw6IEhUTUxFbGVtZW50LCBjZWxsOiBUYWJsZUNlbGwpIHtcclxuXHRcdGNvbnN0IHJvd0lkID0gY2VsbEVsLmRhdGFzZXQucm93SWQ7XHJcblx0XHRpZiAoIXJvd0lkKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgbWVudSA9IG5ldyBNZW51KCk7XHJcblxyXG5cdFx0Ly8gR2V0IHVuaXF1ZSBzdGF0dXNlcyBmcm9tIHRhc2tTdGF0dXNNYXJrc1xyXG5cdFx0Y29uc3Qgc3RhdHVzTWFya3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy50YXNrU3RhdHVzTWFya3M7XHJcblx0XHRjb25zdCB1bmlxdWVTdGF0dXNlcyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XHJcblxyXG5cdFx0Ly8gQnVpbGQgYSBtYXAgb2YgdW5pcXVlIG1hcmsgLT4gc3RhdHVzIG5hbWUgdG8gYXZvaWQgZHVwbGljYXRlc1xyXG5cdFx0Zm9yIChjb25zdCBzdGF0dXMgb2YgT2JqZWN0LmtleXMoc3RhdHVzTWFya3MpKSB7XHJcblx0XHRcdGNvbnN0IG1hcmsgPSBzdGF0dXNNYXJrc1tzdGF0dXNdO1xyXG5cdFx0XHQvLyBJZiB0aGlzIG1hcmsgaXMgbm90IGFscmVhZHkgaW4gdGhlIG1hcCwgYWRkIGl0XHJcblx0XHRcdC8vIFRoaXMgZW5zdXJlcyBlYWNoIG1hcmsgYXBwZWFycyBvbmx5IG9uY2UgaW4gdGhlIG1lbnVcclxuXHRcdFx0aWYgKCFBcnJheS5mcm9tKHVuaXF1ZVN0YXR1c2VzLnZhbHVlcygpKS5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdHVuaXF1ZVN0YXR1c2VzLnNldChzdGF0dXMsIG1hcmspO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIG1lbnUgaXRlbXMgZnJvbSB1bmlxdWUgc3RhdHVzZXNcclxuXHRcdGZvciAoY29uc3QgW3N0YXR1cywgbWFya10gb2YgdW5pcXVlU3RhdHVzZXMpIHtcclxuXHRcdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdFx0aXRlbS50aXRsZUVsLmNyZWF0ZUVsKFxyXG5cdFx0XHRcdFx0XCJzcGFuXCIsXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdGNsczogXCJzdGF0dXMtb3B0aW9uLWNoZWNrYm94XCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGNoZWNrYm94ID0gZWwuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInRhc2stbGlzdC1pdGVtLWNoZWNrYm94XCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJjaGVja2JveFwiLFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0Y2hlY2tib3guZGF0YXNldC50YXNrID0gbWFyaztcclxuXHRcdFx0XHRcdFx0aWYgKG1hcmsgIT09IFwiIFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0Y2hlY2tib3guY2hlY2tlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGl0ZW0udGl0bGVFbC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcInN0YXR1cy1vcHRpb25cIixcclxuXHRcdFx0XHRcdHRleHQ6IHN0YXR1cyxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpdGVtLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMub25DZWxsQ2hhbmdlKSB7XHJcblx0XHRcdFx0XHRcdC8vIEFsc28gdXBkYXRlIGNvbXBsZXRlZCBzdGF0dXMgaWYgbmVlZGVkXHJcblx0XHRcdFx0XHRcdGNvbnN0IGlzQ29tcGxldGVkID0gbWFyay50b0xvd2VyQ2FzZSgpID09PSBcInhcIjtcclxuXHRcdFx0XHRcdFx0dGhpcy5vbkNlbGxDaGFuZ2Uocm93SWQsIGNlbGwuY29sdW1uSWQsIG1hcmspO1xyXG5cdFx0XHRcdFx0XHQvLyBOb3RlOiBjb21wbGV0aW9uIHN0YXR1cyBzaG91bGQgYmUgaGFuZGxlZCBieSB0aGUgcGFyZW50IGNvbXBvbmVudFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCByZWN0ID0gY2VsbEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0bWVudS5zaG93QXRQb3NpdGlvbih7IHg6IHJlY3QubGVmdCwgeTogcmVjdC5ib3R0b20gKyA1IH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIHByaW9yaXR5IGNlbGwgd2l0aCB2aXN1YWwgaW5kaWNhdG9yIGFuZCBjbGljay10by1lZGl0XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJQcmlvcml0eUNlbGwoY2VsbEVsOiBIVE1MRWxlbWVudCwgY2VsbDogVGFibGVDZWxsKSB7XHJcblx0XHRjb25zdCBwcmlvcml0eUNvbnRhaW5lciA9IGNlbGxFbC5jcmVhdGVEaXYoXCJ0YXNrLXRhYmxlLXByaW9yaXR5XCIpO1xyXG5cdFx0cHJpb3JpdHlDb250YWluZXIuYWRkQ2xhc3MoXCJjbGlja2FibGUtcHJpb3JpdHlcIik7XHJcblx0XHRjb25zdCBwcmlvcml0eSA9IGNlbGwudmFsdWUgYXMgbnVtYmVyO1xyXG5cclxuXHRcdGlmIChwcmlvcml0eSkge1xyXG5cdFx0XHQvLyBBZGQgcHJpb3JpdHkgaWNvblxyXG5cdFx0XHRjb25zdCBwcmlvcml0eUljb24gPSBwcmlvcml0eUNvbnRhaW5lci5jcmVhdGVTcGFuKFxyXG5cdFx0XHRcdFwidGFzay10YWJsZS1wcmlvcml0eS1pY29uXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEFkZCBwcmlvcml0eSB0ZXh0IHdpdGggZW1vamkgYW5kIGxhYmVsXHJcblx0XHRcdGNvbnN0IHByaW9yaXR5VGV4dCA9IHByaW9yaXR5Q29udGFpbmVyLmNyZWF0ZVNwYW4oXHJcblx0XHRcdFx0XCJ0YXNrLXRhYmxlLXByaW9yaXR5LXRleHRcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHByaW9yaXR5IGljb25zIGFuZCB0ZXh0IGFjY29yZGluZyB0byA1LWxldmVsIHN5c3RlbVxyXG5cdFx0XHRpZiAocHJpb3JpdHkgPT09IDUpIHtcclxuXHRcdFx0XHRzZXRJY29uKHByaW9yaXR5SWNvbiwgXCJ0cmlhbmdsZVwiKTtcclxuXHRcdFx0XHRwcmlvcml0eUljb24uYWRkQ2xhc3MoXCJoaWdoZXN0XCIpO1xyXG5cdFx0XHRcdHByaW9yaXR5VGV4dC50ZXh0Q29udGVudCA9IHQoXCJIaWdoZXN0XCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHByaW9yaXR5ID09PSA0KSB7XHJcblx0XHRcdFx0c2V0SWNvbihwcmlvcml0eUljb24sIFwiYWxlcnQtdHJpYW5nbGVcIik7XHJcblx0XHRcdFx0cHJpb3JpdHlJY29uLmFkZENsYXNzKFwiaGlnaFwiKTtcclxuXHRcdFx0XHRwcmlvcml0eVRleHQudGV4dENvbnRlbnQgPSB0KFwiSGlnaFwiKTtcclxuXHRcdFx0fSBlbHNlIGlmIChwcmlvcml0eSA9PT0gMykge1xyXG5cdFx0XHRcdHNldEljb24ocHJpb3JpdHlJY29uLCBcIm1pbnVzXCIpO1xyXG5cdFx0XHRcdHByaW9yaXR5SWNvbi5hZGRDbGFzcyhcIm1lZGl1bVwiKTtcclxuXHRcdFx0XHRwcmlvcml0eVRleHQudGV4dENvbnRlbnQgPSB0KFwiTWVkaXVtXCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHByaW9yaXR5ID09PSAyKSB7XHJcblx0XHRcdFx0c2V0SWNvbihwcmlvcml0eUljb24sIFwiY2hldnJvbi1kb3duXCIpO1xyXG5cdFx0XHRcdHByaW9yaXR5SWNvbi5hZGRDbGFzcyhcImxvd1wiKTtcclxuXHRcdFx0XHRwcmlvcml0eVRleHQudGV4dENvbnRlbnQgPSB0KFwiTG93XCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHByaW9yaXR5ID09PSAxKSB7XHJcblx0XHRcdFx0c2V0SWNvbihwcmlvcml0eUljb24sIFwiY2hldnJvbnMtZG93blwiKTtcclxuXHRcdFx0XHRwcmlvcml0eUljb24uYWRkQ2xhc3MoXCJsb3dlc3RcIik7XHJcblx0XHRcdFx0cHJpb3JpdHlUZXh0LnRleHRDb250ZW50ID0gdChcIkxvd2VzdFwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRW1wdHkgcHJpb3JpdHkgY2VsbFxyXG5cdFx0XHRjb25zdCBlbXB0eVRleHQgPSBwcmlvcml0eUNvbnRhaW5lci5jcmVhdGVTcGFuKFxyXG5cdFx0XHRcdFwidGFzay10YWJsZS1wcmlvcml0eS1lbXB0eVwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGVtcHR5VGV4dC50ZXh0Q29udGVudCA9IFwiXFx1MDBBMFwiOyAvLyBOb24tYnJlYWtpbmcgc3BhY2UgZm9yIGludmlzaWJsZSB3aGl0ZXNwYWNlXHJcblx0XHRcdGVtcHR5VGV4dC5hZGRDbGFzcyhcImVtcHR5LXByaW9yaXR5XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCBjbGljayBoYW5kbGVyIGZvciBwcmlvcml0eSBlZGl0aW5nXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQocHJpb3JpdHlDb250YWluZXIsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0dGhpcy5vcGVuUHJpb3JpdHlNZW51KGNlbGxFbCwgY2VsbCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBBZGQgaG92ZXIgZWZmZWN0XHJcblx0XHRwcmlvcml0eUNvbnRhaW5lci50aXRsZSA9IHQoXCJDbGljayB0byBzZXQgcHJpb3JpdHlcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBPcGVuIHByaW9yaXR5IHNlbGVjdGlvbiBtZW51XHJcblx0ICovXHJcblx0cHJpdmF0ZSBvcGVuUHJpb3JpdHlNZW51KGNlbGxFbDogSFRNTEVsZW1lbnQsIGNlbGw6IFRhYmxlQ2VsbCkge1xyXG5cdFx0Y29uc3Qgcm93SWQgPSBjZWxsRWwuZGF0YXNldC5yb3dJZDtcclxuXHRcdGlmICghcm93SWQpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBtZW51ID0gbmV3IE1lbnUoKTtcclxuXHJcblx0XHQvLyBObyBwcmlvcml0eSBvcHRpb25cclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJObyBwcmlvcml0eVwiKSlcclxuXHRcdFx0XHQuc2V0SWNvbihcImNpcmNsZVwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uQ2VsbENoYW5nZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uQ2VsbENoYW5nZShyb3dJZCwgY2VsbC5jb2x1bW5JZCwgbnVsbCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMb3dlc3QgcHJpb3JpdHkgKDEpXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiTG93ZXN0XCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwiY2hldnJvbnMtZG93blwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uQ2VsbENoYW5nZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uQ2VsbENoYW5nZShyb3dJZCwgY2VsbC5jb2x1bW5JZCwgMSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBMb3cgcHJpb3JpdHkgKDIpXHJcblx0XHRtZW51LmFkZEl0ZW0oKGl0ZW0pID0+IHtcclxuXHRcdFx0aXRlbS5zZXRUaXRsZSh0KFwiTG93XCIpKVxyXG5cdFx0XHRcdC5zZXRJY29uKFwiY2hldnJvbi1kb3duXCIpXHJcblx0XHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMub25DZWxsQ2hhbmdlKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMub25DZWxsQ2hhbmdlKHJvd0lkLCBjZWxsLmNvbHVtbklkLCAyKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIE1lZGl1bSBwcmlvcml0eSAoMylcclxuXHRcdG1lbnUuYWRkSXRlbSgoaXRlbSkgPT4ge1xyXG5cdFx0XHRpdGVtLnNldFRpdGxlKHQoXCJNZWRpdW1cIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJtaW51c1wiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uQ2VsbENoYW5nZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uQ2VsbENoYW5nZShyb3dJZCwgY2VsbC5jb2x1bW5JZCwgMyk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBIaWdoIHByaW9yaXR5ICg0KVxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkhpZ2hcIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJhbGVydC10cmlhbmdsZVwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uQ2VsbENoYW5nZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uQ2VsbENoYW5nZShyb3dJZCwgY2VsbC5jb2x1bW5JZCwgNCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBIaWdoZXN0IHByaW9yaXR5ICg1KVxyXG5cdFx0bWVudS5hZGRJdGVtKChpdGVtKSA9PiB7XHJcblx0XHRcdGl0ZW0uc2V0VGl0bGUodChcIkhpZ2hlc3RcIikpXHJcblx0XHRcdFx0LnNldEljb24oXCJ0cmlhbmdsZVwiKVxyXG5cdFx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRcdGlmICh0aGlzLm9uQ2VsbENoYW5nZSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9uQ2VsbENoYW5nZShyb3dJZCwgY2VsbC5jb2x1bW5JZCwgNSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZWN0ID0gY2VsbEVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0bWVudS5zaG93QXRQb3NpdGlvbih7IHg6IHJlY3QubGVmdCwgeTogcmVjdC5ib3R0b20gKyA1IH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGRhdGUgY2VsbCB3aXRoIHJlbGF0aXZlIHRpbWUgYW5kIGNsaWNrLXRvLWVkaXQgZnVuY3Rpb25hbGl0eVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVuZGVyRGF0ZUNlbGwoY2VsbEVsOiBIVE1MRWxlbWVudCwgY2VsbDogVGFibGVDZWxsKSB7XHJcblx0XHRjb25zdCBkYXRlQ29udGFpbmVyID0gY2VsbEVsLmNyZWF0ZURpdihcInRhc2stdGFibGUtZGF0ZVwiKTtcclxuXHRcdGRhdGVDb250YWluZXIuYWRkQ2xhc3MoXCJjbGlja2FibGUtZGF0ZVwiKTtcclxuXHJcblx0XHRpZiAoY2VsbC52YWx1ZSkge1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoY2VsbC52YWx1ZSBhcyBudW1iZXIpO1xyXG5cdFx0XHRkYXRlLnNldEhvdXJzKDAsIDAsIDAsIDApOyAvLyBaZXJvIG91dCB0aW1lIGZvciBjb25zaXN0ZW50IGNvbXBhcmlzb25cclxuXHJcblx0XHRcdGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdG5vdy5zZXRIb3VycygwLCAwLCAwLCAwKTsgLy8gWmVybyBvdXQgdGltZSBmb3IgY29uc2lzdGVudCBjb21wYXJpc29uXHJcblxyXG5cdFx0XHRjb25zdCBkaWZmRGF5cyA9IE1hdGguZmxvb3IoXHJcblx0XHRcdFx0KGRhdGUuZ2V0VGltZSgpIC0gbm93LmdldFRpbWUoKSkgLyAoMTAwMCAqIDYwICogNjAgKiAyNClcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEFkZCBkYXRlIHRleHRcclxuXHRcdFx0Y29uc3QgZGF0ZVRleHQgPSBkYXRlQ29udGFpbmVyLmNyZWF0ZVNwYW4oXCJ0YXNrLXRhYmxlLWRhdGUtdGV4dFwiKTtcclxuXHRcdFx0ZGF0ZVRleHQudGV4dENvbnRlbnQgPSBjZWxsLmRpc3BsYXlWYWx1ZTtcclxuXHJcblx0XHRcdC8vIEFkZCByZWxhdGl2ZSBpbmRpY2F0b3JcclxuXHRcdFx0Y29uc3QgcmVsYXRpdmVJbmRpY2F0b3IgPSBkYXRlQ29udGFpbmVyLmNyZWF0ZVNwYW4oXHJcblx0XHRcdFx0XCJ0YXNrLXRhYmxlLWRhdGUtcmVsYXRpdmVcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoZGlmZkRheXMgPT09IDApIHtcclxuXHRcdFx0XHRyZWxhdGl2ZUluZGljYXRvci50ZXh0Q29udGVudCA9IHQoXCJUb2RheVwiKTtcclxuXHRcdFx0XHRyZWxhdGl2ZUluZGljYXRvci5hZGRDbGFzcyhcInRvZGF5XCIpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGRpZmZEYXlzID09PSAxKSB7XHJcblx0XHRcdFx0cmVsYXRpdmVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSB0KFwiVG9tb3Jyb3dcIik7XHJcblx0XHRcdFx0cmVsYXRpdmVJbmRpY2F0b3IuYWRkQ2xhc3MoXCJ0b21vcnJvd1wiKTtcclxuXHRcdFx0fSBlbHNlIGlmIChkaWZmRGF5cyA9PT0gLTEpIHtcclxuXHRcdFx0XHRyZWxhdGl2ZUluZGljYXRvci50ZXh0Q29udGVudCA9IHQoXCJZZXN0ZXJkYXlcIik7XHJcblx0XHRcdFx0cmVsYXRpdmVJbmRpY2F0b3IuYWRkQ2xhc3MoXCJ5ZXN0ZXJkYXlcIik7XHJcblx0XHRcdH0gZWxzZSBpZiAoZGlmZkRheXMgPCAwKSB7XHJcblx0XHRcdFx0cmVsYXRpdmVJbmRpY2F0b3IudGV4dENvbnRlbnQgPSB0KFwiT3ZlcmR1ZVwiKTtcclxuXHRcdFx0XHRyZWxhdGl2ZUluZGljYXRvci5hZGRDbGFzcyhcIm92ZXJkdWVcIik7XHJcblx0XHRcdH0gZWxzZSBpZiAoZGlmZkRheXMgPD0gNykge1xyXG5cdFx0XHRcdHJlbGF0aXZlSW5kaWNhdG9yLnRleHRDb250ZW50ID0gYCR7ZGlmZkRheXN9ZGA7XHJcblx0XHRcdFx0cmVsYXRpdmVJbmRpY2F0b3IuYWRkQ2xhc3MoXCJ1cGNvbWluZ1wiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRW1wdHkgZGF0ZSBjZWxsXHJcblx0XHRcdGNvbnN0IGVtcHR5VGV4dCA9IGRhdGVDb250YWluZXIuY3JlYXRlU3BhbihcInRhc2stdGFibGUtZGF0ZS1lbXB0eVwiKTtcclxuXHRcdFx0ZW1wdHlUZXh0LnRleHRDb250ZW50ID0gXCJcXHUwMEEwXCI7IC8vIE5vbi1icmVha2luZyBzcGFjZSBmb3IgaW52aXNpYmxlIHdoaXRlc3BhY2VcclxuXHRcdFx0ZW1wdHlUZXh0LmFkZENsYXNzKFwiZW1wdHktZGF0ZVwiKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgY2xpY2sgaGFuZGxlciBmb3IgZGF0ZSBlZGl0aW5nXHJcblx0XHRpZiAodGhpcy5hcHAgJiYgdGhpcy5wbHVnaW4pIHtcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGRhdGVDb250YWluZXIsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdHRoaXMub3BlbkRhdGVQaWNrZXIoY2VsbEVsLCBjZWxsKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBBZGQgaG92ZXIgZWZmZWN0XHJcblx0XHRcdGRhdGVDb250YWluZXIudGl0bGUgPSB0KFwiQ2xpY2sgdG8gZWRpdCBkYXRlXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogT3BlbiBkYXRlIHBpY2tlciBmb3IgZWRpdGluZyBkYXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBvcGVuRGF0ZVBpY2tlcihjZWxsRWw6IEhUTUxFbGVtZW50LCBjZWxsOiBUYWJsZUNlbGwpIHtcclxuXHRcdGlmICghdGhpcy5hcHAgfHwgIXRoaXMucGx1Z2luKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3Qgcm93SWQgPSBjZWxsRWwuZGF0YXNldC5yb3dJZDtcclxuXHRcdGNvbnN0IGNvbHVtbklkID0gY2VsbC5jb2x1bW5JZDtcclxuXHJcblx0XHRpZiAoIXJvd0lkKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gR2V0IGN1cnJlbnQgZGF0ZSB2YWx1ZSAtIGZpeCB0aW1lem9uZSBvZmZzZXQgaXNzdWVcclxuXHRcdGxldCBjdXJyZW50RGF0ZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cdFx0aWYgKGNlbGwudmFsdWUpIHtcclxuXHRcdFx0Y29uc3QgZGF0ZSA9IG5ldyBEYXRlKGNlbGwudmFsdWUgYXMgbnVtYmVyKTtcclxuXHRcdFx0Ly8gVXNlIGxvY2FsIGRhdGUgbWV0aG9kcyB0byBhdm9pZCB0aW1lem9uZSBvZmZzZXRcclxuXHRcdFx0Y29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHRcdFx0Y29uc3QgbW9udGggPSBTdHJpbmcoZGF0ZS5nZXRNb250aCgpICsgMSkucGFkU3RhcnQoMiwgXCIwXCIpO1xyXG5cdFx0XHRjb25zdCBkYXkgPSBTdHJpbmcoZGF0ZS5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcclxuXHRcdFx0Y3VycmVudERhdGUgPSBgJHt5ZWFyfS0ke21vbnRofS0ke2RheX1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBkYXRlIHBpY2tlciBwb3BvdmVyXHJcblx0XHRjb25zdCBwb3BvdmVyID0gbmV3IERhdGVQaWNrZXJQb3BvdmVyKFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdGN1cnJlbnREYXRlXHJcblx0XHQpO1xyXG5cclxuXHRcdHBvcG92ZXIub25EYXRlU2VsZWN0ZWQgPSAoZGF0ZVN0cjogc3RyaW5nIHwgbnVsbCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5vbkRhdGVDaGFuZ2UpIHtcclxuXHRcdFx0XHR0aGlzLm9uRGF0ZUNoYW5nZShyb3dJZCwgY29sdW1uSWQsIGRhdGVTdHIpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFBvc2l0aW9uIHRoZSBwb3BvdmVyIG5lYXIgdGhlIGNlbGxcclxuXHRcdGNvbnN0IHJlY3QgPSBjZWxsRWwuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRwb3BvdmVyLnNob3dBdFBvc2l0aW9uKHtcclxuXHRcdFx0eDogcmVjdC5sZWZ0LFxyXG5cdFx0XHR5OiByZWN0LmJvdHRvbSArIDUsXHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0YWdzIGNlbGwgd2l0aCBpbmxpbmUgZWRpdGluZyBhbmQgYXV0by1zdWdnZXN0XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJUYWdzQ2VsbChjZWxsRWw6IEhUTUxFbGVtZW50LCBjZWxsOiBUYWJsZUNlbGwpIHtcclxuXHRcdGNvbnN0IHRhZ3NDb250YWluZXIgPSBjZWxsRWwuY3JlYXRlRGl2KFwidGFzay10YWJsZS10YWdzXCIpO1xyXG5cdFx0Y29uc3QgdGFncyA9IGNlbGwudmFsdWUgYXMgc3RyaW5nW107XHJcblxyXG5cdFx0aWYgKGNlbGwuZWRpdGFibGUpIHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGVkaXRhYmxlIGlucHV0IGZvciB0YWdzXHJcblx0XHRcdGNvbnN0IGlucHV0ID0gdGFnc0NvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XHRcImlucHV0XCIsXHJcblx0XHRcdFx0XCJ0YXNrLXRhYmxlLXRhZ3MtaW5wdXRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpbnB1dC50eXBlID0gXCJ0ZXh0XCI7XHJcblx0XHRcdGNvbnN0IGluaXRpYWxWYWx1ZSA9IHRhZ3M/LmpvaW4oXCIsIFwiKSB8fCBcIlwiO1xyXG5cdFx0XHRpbnB1dC52YWx1ZSA9IGluaXRpYWxWYWx1ZTtcclxuXHRcdFx0aW5wdXQuc3R5bGUuY3NzVGV4dCA9XHJcblx0XHRcdFx0XCJib3JkZXI6bm9uZTtiYWNrZ3JvdW5kOnRyYW5zcGFyZW50O3dpZHRoOjEwMCU7cGFkZGluZzowO2ZvbnQ6aW5oZXJpdDtcIjtcclxuXHJcblx0XHRcdC8vIFN0b3JlIGluaXRpYWwgdmFsdWUgZm9yIGNvbXBhcmlzb25cclxuXHRcdFx0Y29uc3Qgb3JpZ2luYWxUYWdzID0gWy4uLih0YWdzIHx8IFtdKV07XHJcblxyXG5cdFx0XHQvLyBTZXR1cCBhdXRvY29tcGxldGUgb25seSB3aGVuIHVzZXIgc3RhcnRzIHR5cGluZyBvciBmb2N1c2VzXHJcblx0XHRcdGxldCBhdXRvQ29tcGxldGVTZXR1cCA9IGZhbHNlO1xyXG5cdFx0XHRjb25zdCBzZXR1cEF1dG9Db21wbGV0ZU9uY2UgPSAoKSA9PiB7XHJcblx0XHRcdFx0aWYgKCFhdXRvQ29tcGxldGVTZXR1cCAmJiB0aGlzLmFwcCkge1xyXG5cdFx0XHRcdFx0YXV0b0NvbXBsZXRlU2V0dXAgPSB0cnVlO1xyXG5cdFx0XHRcdFx0dGhpcy5zZXR1cEF1dG9Db21wbGV0ZShpbnB1dCwgXCJ0YWdzXCIpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSBibHVyIGV2ZW50IHRvIHNhdmUgY2hhbmdlc1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaW5wdXQsIFwiYmx1clwiLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbmV3VmFsdWUgPSBpbnB1dC52YWx1ZS50cmltKCk7XHJcblx0XHRcdFx0Y29uc3QgbmV3VGFncyA9IG5ld1ZhbHVlXHJcblx0XHRcdFx0XHQ/IG5ld1ZhbHVlXHJcblx0XHRcdFx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdFx0XHRcdC5tYXAoKHRhZykgPT4gdGFnLnRyaW0oKSlcclxuXHRcdFx0XHRcdFx0XHQuZmlsdGVyKCh0YWcpID0+IHRhZy5sZW5ndGggPiAwKVxyXG5cdFx0XHRcdFx0OiBbXTtcclxuXHJcblx0XHRcdFx0Ly8gT25seSBzYXZlIGlmIHRhZ3MgYWN0dWFsbHkgY2hhbmdlZFxyXG5cdFx0XHRcdGlmICghdGhpcy5hcnJheXNFcXVhbChvcmlnaW5hbFRhZ3MsIG5ld1RhZ3MpKSB7XHJcblx0XHRcdFx0XHR0aGlzLnNhdmVDZWxsVmFsdWUoY2VsbEVsLCBjZWxsLCBuZXdUYWdzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIEVudGVyIGtleSB0byBzYXZlIGFuZCBleGl0XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChpbnB1dCwgXCJrZXlkb3duXCIsIChlKSA9PiB7XHJcblx0XHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuXHRcdFx0XHRcdGlucHV0LmJsdXIoKTtcclxuXHRcdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTZXR1cCBhdXRvY29tcGxldGUgb24gZm9jdXMgb3IgZmlyc3QgaW5wdXRcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImZvY3VzXCIsIHNldHVwQXV0b0NvbXBsZXRlT25jZSk7XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChpbnB1dCwgXCJpbnB1dFwiLCBzZXR1cEF1dG9Db21wbGV0ZU9uY2UpO1xyXG5cclxuXHRcdFx0Ly8gU3RvcCBjbGljayBwcm9wYWdhdGlvblxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaW5wdXQsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHRcdC8vIFVzZSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgaW5zdGVhZCBvZiBzZXRUaW1lb3V0IGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcclxuXHRcdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gaW5wdXQuZm9jdXMoKSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRGlzcGxheSB0YWdzIGFzIGNoaXBzIC0gb3B0aW1pemVkIHZlcnNpb25cclxuXHRcdFx0aWYgKHRhZ3MgJiYgdGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Ly8gVXNlIGEgc2luZ2xlIHRleHQgY29udGVudCBpbnN0ZWFkIG9mIG11bHRpcGxlIERPTSBlbGVtZW50cyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXHJcblx0XHRcdFx0dGFnc0NvbnRhaW5lci50ZXh0Q29udGVudCA9IHRhZ3Muam9pbihcIiwgXCIpO1xyXG5cdFx0XHRcdHRhZ3NDb250YWluZXIuYWRkQ2xhc3MoXCJ0YXNrLXRhYmxlLXRhZ3MtZGlzcGxheVwiKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0YWdzQ29udGFpbmVyLnRleHRDb250ZW50ID0gXCJcXHUwMEEwXCI7IC8vIE5vbi1icmVha2luZyBzcGFjZVxyXG5cdFx0XHRcdHRhZ3NDb250YWluZXIuYWRkQ2xhc3MoXCJlbXB0eS10YWdzXCIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBSZW5kZXIgbnVtYmVyIGNlbGwgd2l0aCBwcm9wZXIgYWxpZ25tZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJOdW1iZXJDZWxsKGNlbGxFbDogSFRNTEVsZW1lbnQsIGNlbGw6IFRhYmxlQ2VsbCkge1xyXG5cdFx0Y2VsbEVsLmFkZENsYXNzKFwidGFzay10YWJsZS1udW1iZXJcIik7XHJcblx0XHRjZWxsRWwudGV4dENvbnRlbnQgPSBjZWxsLmRpc3BsYXlWYWx1ZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlbmRlciB0ZXh0IGNlbGwgd2l0aCBpbmxpbmUgZWRpdGluZyBhbmQgYXV0by1zdWdnZXN0XHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJUZXh0Q2VsbChcclxuXHRcdGNlbGxFbDogSFRNTEVsZW1lbnQsXHJcblx0XHRjZWxsOiBUYWJsZUNlbGwsXHJcblx0XHRyb3c/OiBUYWJsZVJvd1xyXG5cdCkge1xyXG5cdFx0Y2VsbEVsLmFkZENsYXNzKFwidGFzay10YWJsZS10ZXh0XCIpO1xyXG5cclxuXHRcdC8vIEZvciBjb250ZW50IGNvbHVtbiAocm93TnVtYmVyKSwgdXNlIGNsZWFuZWQgY29udGVudCB3aXRob3V0IHRhZ3MgYW5kIG90aGVyIG1hcmtzXHJcblx0XHRjb25zdCBpc0NvbnRlbnRDb2x1bW4gPSBjZWxsLmNvbHVtbklkID09PSBcImNvbnRlbnRcIjtcclxuXHRcdGNvbnN0IGlzUHJvamVjdENvbHVtbiA9IGNlbGwuY29sdW1uSWQgPT09IFwicHJvamVjdFwiO1xyXG5cclxuXHRcdC8vIEdldCBlZmZlY3RpdmUgcHJvamVjdCB2YWx1ZSBmb3IgcHJvamVjdCBjb2x1bW5cclxuXHRcdGxldCBkaXNwbGF5VGV4dDogc3RyaW5nO1xyXG5cdFx0bGV0IGVmZmVjdGl2ZVZhbHVlOiBzdHJpbmc7XHJcblx0XHRsZXQgaXNSZWFkb25seSA9IGZhbHNlO1xyXG5cclxuXHRcdGlmIChpc1Byb2plY3RDb2x1bW4gJiYgcm93Py50YXNrPy5tZXRhZGF0YT8udGdQcm9qZWN0KSB7XHJcblx0XHRcdGVmZmVjdGl2ZVZhbHVlID0gZ2V0RWZmZWN0aXZlUHJvamVjdChyb3cudGFzaykgfHwgXCJcIjtcclxuXHRcdFx0ZGlzcGxheVRleHQgPSBlZmZlY3RpdmVWYWx1ZTtcclxuXHRcdFx0aXNSZWFkb25seSA9IGlzUHJvamVjdFJlYWRvbmx5KHJvdy50YXNrKTtcclxuXHRcdH0gZWxzZSBpZiAoaXNDb250ZW50Q29sdW1uKSB7XHJcblx0XHRcdGRpc3BsYXlUZXh0ID0gY2xlYXJBbGxNYXJrcyhcclxuXHRcdFx0XHQoY2VsbC52YWx1ZSBhcyBzdHJpbmcpIHx8IGNlbGwuZGlzcGxheVZhbHVlXHJcblx0XHRcdCk7XHJcblx0XHRcdGVmZmVjdGl2ZVZhbHVlID0gZGlzcGxheVRleHQ7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRkaXNwbGF5VGV4dCA9IGNlbGwuZGlzcGxheVZhbHVlO1xyXG5cdFx0XHRlZmZlY3RpdmVWYWx1ZSA9IChjZWxsLnZhbHVlIGFzIHN0cmluZykgfHwgXCJcIjtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoY2VsbC5lZGl0YWJsZSAmJiAhaXNSZWFkb25seSkge1xyXG5cdFx0XHQvLyBDcmVhdGUgZWRpdGFibGUgaW5wdXRcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBjZWxsRWwuY3JlYXRlRWwoXCJpbnB1dFwiLCBcInRhc2stdGFibGUtdGV4dC1pbnB1dFwiKTtcclxuXHRcdFx0aW5wdXQudHlwZSA9IFwidGV4dFwiO1xyXG5cdFx0XHRpbnB1dC52YWx1ZSA9IGRpc3BsYXlUZXh0O1xyXG5cdFx0XHRpbnB1dC5zdHlsZS5jc3NUZXh0ID1cclxuXHRcdFx0XHRcImJvcmRlcjpub25lO2JhY2tncm91bmQ6dHJhbnNwYXJlbnQ7d2lkdGg6MTAwJTtwYWRkaW5nOjA7Zm9udDppbmhlcml0O1wiO1xyXG5cclxuXHRcdFx0Ly8gU3RvcmUgaW5pdGlhbCB2YWx1ZSBmb3IgY29tcGFyaXNvbiAtIHNob3VsZCBtYXRjaCB3aGF0J3Mgc2hvd24gaW4gdGhlIGlucHV0XHJcblx0XHRcdC8vIEZvciBjb250ZW50IGNvbHVtbiwgdXNlIHRoZSBjbGVhbmVkIHRleHQ7IGZvciBvdGhlcnMsIHVzZSB0aGUgcmF3IHZhbHVlXHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsVmFsdWUgPSBpc0NvbnRlbnRDb2x1bW5cclxuXHRcdFx0XHQ/IGRpc3BsYXlUZXh0IC8vIFRoaXMgaXMgdGhlIGNsZWFuZWQgdGV4dCB0aGF0IHVzZXIgc2VlcyBhbmQgZWRpdHNcclxuXHRcdFx0XHQ6IGVmZmVjdGl2ZVZhbHVlO1xyXG5cclxuXHRcdFx0Ly8gU2V0dXAgYXV0b2NvbXBsZXRlIG9ubHkgd2hlbiB1c2VyIHN0YXJ0cyB0eXBpbmcgb3IgZm9jdXNlc1xyXG5cdFx0XHRsZXQgYXV0b0NvbXBsZXRlU2V0dXAgPSBmYWxzZTtcclxuXHRcdFx0Y29uc3Qgc2V0dXBBdXRvQ29tcGxldGVPbmNlID0gKCkgPT4ge1xyXG5cdFx0XHRcdGlmICghYXV0b0NvbXBsZXRlU2V0dXAgJiYgdGhpcy5hcHApIHtcclxuXHRcdFx0XHRcdGF1dG9Db21wbGV0ZVNldHVwID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGlmIChjZWxsLmNvbHVtbklkID09PSBcInByb2plY3RcIikge1xyXG5cdFx0XHRcdFx0XHR0aGlzLnNldHVwQXV0b0NvbXBsZXRlKGlucHV0LCBcInByb2plY3RcIik7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGNlbGwuY29sdW1uSWQgPT09IFwiY29udGV4dFwiKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuc2V0dXBBdXRvQ29tcGxldGUoaW5wdXQsIFwiY29udGV4dFwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgYmx1ciBldmVudCB0byBzYXZlIGNoYW5nZXNcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImJsdXJcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IG5ld1ZhbHVlID0gaW5wdXQudmFsdWUudHJpbSgpO1xyXG5cclxuXHRcdFx0XHQvLyBPbmx5IHNhdmUgaWYgdmFsdWUgYWN0dWFsbHkgY2hhbmdlZFxyXG5cdFx0XHRcdGlmIChvcmlnaW5hbFZhbHVlICE9PSBuZXdWYWx1ZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5zYXZlQ2VsbFZhbHVlKGNlbGxFbCwgY2VsbCwgbmV3VmFsdWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgRW50ZXIga2V5IHRvIHNhdmUgYW5kIGV4aXRcclxuXHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImtleWRvd25cIiwgKGUpID0+IHtcclxuXHRcdFx0XHRpZiAoZS5rZXkgPT09IFwiRW50ZXJcIikge1xyXG5cdFx0XHRcdFx0aW5wdXQuYmx1cigpO1xyXG5cdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyBTdG9wIHByb3BhZ2F0aW9uIHRvIHByZXZlbnQgdHJpZ2dlcmluZyB0YWJsZSBldmVudHNcclxuXHRcdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIFNldHVwIGF1dG9jb21wbGV0ZSBvbiBmb2N1cyBvciBmaXJzdCBpbnB1dCBmb3IgcHJvamVjdC9jb250ZXh0IGNvbHVtbnNcclxuXHRcdFx0aWYgKGNlbGwuY29sdW1uSWQgPT09IFwicHJvamVjdFwiIHx8IGNlbGwuY29sdW1uSWQgPT09IFwiY29udGV4dFwiKSB7XHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImZvY3VzXCIsIHNldHVwQXV0b0NvbXBsZXRlT25jZSk7XHJcblx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGlucHV0LCBcImlucHV0XCIsIHNldHVwQXV0b0NvbXBsZXRlT25jZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFN0b3AgY2xpY2sgcHJvcGFnYXRpb24gdG8gcHJldmVudCByb3cgc2VsZWN0aW9uXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChpbnB1dCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IGlucHV0LmZvY3VzKCkpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGNlbGxFbC50ZXh0Q29udGVudCA9IGRpc3BsYXlUZXh0O1xyXG5cclxuXHRcdFx0aWYgKGNlbGwuY29sdW1uSWQgPT09IFwiZmlsZVBhdGhcIikge1xyXG5cdFx0XHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChjZWxsRWwsIFwiY2xpY2tcIiwgKGUpID0+IHtcclxuXHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0XHRjb25zdCBmaWxlID0gdGhpcy5wbHVnaW4uYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoXHJcblx0XHRcdFx0XHRcdGNlbGwudmFsdWUgYXMgc3RyaW5nXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKGZpbGUpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS5nZXRMZWFmKHRydWUpLm9wZW5GaWxlKGZpbGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdGNlbGxFbC50aXRsZSA9IHQoXCJDbGljayB0byBvcGVuIGZpbGVcIik7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgdGdQcm9qZWN0IGluZGljYXRvciBmb3IgcHJvamVjdCBjb2x1bW4gLSBvbmx5IHNob3cgaWYgbm8gdXNlci1zZXQgcHJvamVjdCBleGlzdHNcclxuXHRcdGlmIChcclxuXHRcdFx0aXNQcm9qZWN0Q29sdW1uICYmXHJcblx0XHRcdHJvdz8udGFzaz8ubWV0YWRhdGE/LnRnUHJvamVjdCAmJlxyXG5cdFx0XHQoIXJvdy50YXNrLm1ldGFkYXRhLnByb2plY3QgfHwgIXJvdy50YXNrLm1ldGFkYXRhLnByb2plY3QudHJpbSgpKVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IHRnUHJvamVjdCA9IHJvdy50YXNrLm1ldGFkYXRhLnRnUHJvamVjdDtcclxuXHRcdFx0Y29uc3QgaW5kaWNhdG9yID0gY2VsbEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBcInByb2plY3Qtc291cmNlLWluZGljYXRvciB0YWJsZS1pbmRpY2F0b3JcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgaW5kaWNhdG9yIGljb24gYmFzZWQgb24gdGdQcm9qZWN0IHR5cGVcclxuXHRcdFx0bGV0IGluZGljYXRvckljb24gPSBcIlwiO1xyXG5cdFx0XHRsZXQgaW5kaWNhdG9yVGl0bGUgPSBcIlwiO1xyXG5cclxuXHRcdFx0c3dpdGNoICh0Z1Byb2plY3QudHlwZSkge1xyXG5cdFx0XHRcdGNhc2UgXCJwYXRoXCI6XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JJY29uID0gXCLwn5OBXCI7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JUaXRsZSA9XHJcblx0XHRcdFx0XHRcdHQoXCJBdXRvLWFzc2lnbmVkIGZyb20gcGF0aFwiKSArIGA6ICR7dGdQcm9qZWN0LnNvdXJjZX1gO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcIm1ldGFkYXRhXCI6XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JJY29uID0gXCLwn5OEXCI7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JUaXRsZSA9XHJcblx0XHRcdFx0XHRcdHQoXCJBdXRvLWFzc2lnbmVkIGZyb20gZmlsZSBtZXRhZGF0YVwiKSArXHJcblx0XHRcdFx0XHRcdGA6ICR7dGdQcm9qZWN0LnNvdXJjZX1gO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcImNvbmZpZ1wiOlxyXG5cdFx0XHRcdFx0aW5kaWNhdG9ySWNvbiA9IFwi4pqZ77iPXCI7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JUaXRsZSA9XHJcblx0XHRcdFx0XHRcdHQoXCJBdXRvLWFzc2lnbmVkIGZyb20gY29uZmlnIGZpbGVcIikgK1xyXG5cdFx0XHRcdFx0XHRgOiAke3RnUHJvamVjdC5zb3VyY2V9YDtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JJY29uID0gXCLwn5SXXCI7XHJcblx0XHRcdFx0XHRpbmRpY2F0b3JUaXRsZSA9XHJcblx0XHRcdFx0XHRcdHQoXCJBdXRvLWFzc2lnbmVkXCIpICsgYDogJHt0Z1Byb2plY3Quc291cmNlfWA7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGluZGljYXRvci5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJpbmRpY2F0b3ItaWNvblwiPiR7aW5kaWNhdG9ySWNvbn08L3NwYW4+YDtcclxuXHRcdFx0aW5kaWNhdG9yLnRpdGxlID0gaW5kaWNhdG9yVGl0bGU7XHJcblxyXG5cdFx0XHRpZiAoaXNSZWFkb25seSkge1xyXG5cdFx0XHRcdGluZGljYXRvci5hZGRDbGFzcyhcInJlYWRvbmx5LWluZGljYXRvclwiKTtcclxuXHRcdFx0XHRjZWxsRWwuYWRkQ2xhc3MoXCJyZWFkb25seS1jZWxsXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGluZGljYXRvci5hZGRDbGFzcyhcIm92ZXJyaWRlLWluZGljYXRvclwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEFkZCB0b29sdGlwIGZvciBsb25nIHRleHQgLSBvbmx5IGlmIG5lY2Vzc2FyeVxyXG5cdFx0aWYgKGRpc3BsYXlUZXh0Lmxlbmd0aCA+IDUwKSB7XHJcblx0XHRcdGNlbGxFbC50aXRsZSA9IGRpc3BsYXlUZXh0O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGVtcHR5IHN0YXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJFbXB0eVN0YXRlKCkge1xyXG5cdFx0Y29uc3QgZW1wdHlSb3cgPSB0aGlzLmJvZHlFbC5jcmVhdGVFbChcInRyXCIsIFwidGFzay10YWJsZS1lbXB0eS1yb3dcIik7XHJcblx0XHRjb25zdCBlbXB0eUNlbGwgPSBlbXB0eVJvdy5jcmVhdGVFbChcInRkXCIsIFwidGFzay10YWJsZS1lbXB0eS1jZWxsXCIpO1xyXG5cdFx0ZW1wdHlDZWxsLmNvbFNwYW4gPSB0aGlzLmNvbHVtbnMubGVuZ3RoO1xyXG5cdFx0ZW1wdHlDZWxsLnRleHRDb250ZW50ID0gdChcIk5vIHRhc2tzIGZvdW5kXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHJvdyBzZWxlY3Rpb24gdmlzdWFsIHN0YXRlXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVNlbGVjdGlvbihzZWxlY3RlZFJvd3M6IFNldDxzdHJpbmc+KSB7XHJcblx0XHRjb25zdCByb3dzID0gdGhpcy5ib2R5RWwucXVlcnlTZWxlY3RvckFsbChcInRyW2RhdGEtcm93LWlkXVwiKTtcclxuXHRcdHJvd3MuZm9yRWFjaCgocm93KSA9PiB7XHJcblx0XHRcdGNvbnN0IHJvd0lkID0gKHJvdyBhcyBIVE1MRWxlbWVudCkuZGF0YXNldC5yb3dJZDtcclxuXHRcdFx0aWYgKHJvd0lkKSB7XHJcblx0XHRcdFx0cm93LnRvZ2dsZUNsYXNzKFwic2VsZWN0ZWRcIiwgc2VsZWN0ZWRSb3dzLmhhcyhyb3dJZCkpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBzb3J0IGluZGljYXRvcnMgaW4gaGVhZGVyXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZVNvcnRJbmRpY2F0b3JzKHNvcnRGaWVsZDogc3RyaW5nLCBzb3J0T3JkZXI6IFwiYXNjXCIgfCBcImRlc2NcIikge1xyXG5cdFx0Ly8gQ2xlYXIgYWxsIHNvcnQgaW5kaWNhdG9yc1xyXG5cdFx0Y29uc3Qgc29ydEljb25zID0gdGhpcy5oZWFkZXJFbC5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcIi50YXNrLXRhYmxlLXNvcnQtaWNvblwiXHJcblx0XHQpO1xyXG5cdFx0c29ydEljb25zLmZvckVhY2goKGljb24pID0+IHtcclxuXHRcdFx0aWNvbi5lbXB0eSgpO1xyXG5cdFx0XHRzZXRJY29uKGljb24gYXMgSFRNTEVsZW1lbnQsIFwiY2hldnJvbnMtdXAtZG93blwiKTtcclxuXHRcdFx0aWNvbi5yZW1vdmVDbGFzcyhcImFzY1wiLCBcImRlc2NcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBTZXQgYWN0aXZlIHNvcnQgaW5kaWNhdG9yXHJcblx0XHRjb25zdCBhY3RpdmVIZWFkZXIgPSB0aGlzLmhlYWRlckVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdGB0aFtkYXRhLWNvbHVtbi1pZD1cIiR7c29ydEZpZWxkfVwiXWBcclxuXHRcdCk7XHJcblx0XHRpZiAoYWN0aXZlSGVhZGVyKSB7XHJcblx0XHRcdGNvbnN0IHNvcnRJY29uID0gYWN0aXZlSGVhZGVyLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XCIudGFzay10YWJsZS1zb3J0LWljb25cIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAoc29ydEljb24pIHtcclxuXHRcdFx0XHRzb3J0SWNvbi5lbXB0eSgpO1xyXG5cdFx0XHRcdHNldEljb24oXHJcblx0XHRcdFx0XHRzb3J0SWNvbiBhcyBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHRcdHNvcnRPcmRlciA9PT0gXCJhc2NcIiA/IFwiY2hldnJvbi11cFwiIDogXCJjaGV2cm9uLWRvd25cIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0c29ydEljb24uYWRkQ2xhc3Moc29ydE9yZGVyKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2V0dXAgY29sdW1uIHJlc2l6ZSBoYW5kbGVyc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2V0dXBSZXNpemVIYW5kbGVycygpIHtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChcclxuXHRcdFx0ZG9jdW1lbnQsXHJcblx0XHRcdFwibW91c2Vtb3ZlXCIsXHJcblx0XHRcdHRoaXMuaGFuZGxlTW91c2VNb3ZlLmJpbmQodGhpcylcclxuXHRcdCk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdGRvY3VtZW50LFxyXG5cdFx0XHRcIm1vdXNldXBcIixcclxuXHRcdFx0dGhpcy5oYW5kbGVNb3VzZVVwLmJpbmQodGhpcylcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgbW91c2UgbW92ZSBkdXJpbmcgcmVzaXplIC0gcHJldmVudCB0cmlnZ2VyaW5nIHNvcnQgd2hlbiByZXNpemluZ1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgaGFuZGxlTW91c2VNb3ZlKGV2ZW50OiBNb3VzZUV2ZW50KSB7XHJcblx0XHRpZiAoIXRoaXMuaXNSZXNpemluZykgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IGRlbHRhWCA9IGV2ZW50LmNsaWVudFggLSB0aGlzLnJlc2l6ZVN0YXJ0WDtcclxuXHRcdGNvbnN0IG5ld1dpZHRoID0gTWF0aC5tYXgoNTAsIHRoaXMucmVzaXplU3RhcnRXaWR0aCArIGRlbHRhWCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGNvbHVtbiB3aWR0aFxyXG5cdFx0dGhpcy51cGRhdGVDb2x1bW5XaWR0aCh0aGlzLnJlc2l6ZUNvbHVtbiwgbmV3V2lkdGgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RhcnQgY29sdW1uIHJlc2l6ZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhcnRSZXNpemUoXHJcblx0XHRldmVudDogTW91c2VFdmVudCxcclxuXHRcdGNvbHVtbklkOiBzdHJpbmcsXHJcblx0XHRjdXJyZW50V2lkdGg6IG51bWJlclxyXG5cdCkge1xyXG5cdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpOyAvLyBQcmV2ZW50IHRyaWdnZXJpbmcgc29ydFxyXG5cdFx0dGhpcy5pc1Jlc2l6aW5nID0gdHJ1ZTtcclxuXHRcdHRoaXMucmVzaXplQ29sdW1uID0gY29sdW1uSWQ7XHJcblx0XHR0aGlzLnJlc2l6ZVN0YXJ0WCA9IGV2ZW50LmNsaWVudFg7XHJcblx0XHR0aGlzLnJlc2l6ZVN0YXJ0V2lkdGggPSBjdXJyZW50V2lkdGg7XHJcblxyXG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3IgPSBcImNvbC1yZXNpemVcIjtcclxuXHRcdHRoaXMudGFibGVFbC5hZGRDbGFzcyhcInJlc2l6aW5nXCIpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSGFuZGxlIG1vdXNlIHVwIHRvIGVuZCByZXNpemVcclxuXHQgKi9cclxuXHRwcml2YXRlIGhhbmRsZU1vdXNlVXAoKSB7XHJcblx0XHRpZiAoIXRoaXMuaXNSZXNpemluZykgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuaXNSZXNpemluZyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5yZXNpemVDb2x1bW4gPSBcIlwiO1xyXG5cdFx0ZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3IgPSBcIlwiO1xyXG5cdFx0dGhpcy50YWJsZUVsLnJlbW92ZUNsYXNzKFwicmVzaXppbmdcIik7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgY29sdW1uIHdpZHRoXHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVDb2x1bW5XaWR0aChjb2x1bW5JZDogc3RyaW5nLCBuZXdXaWR0aDogbnVtYmVyKSB7XHJcblx0XHQvLyBVcGRhdGUgaGVhZGVyXHJcblx0XHRjb25zdCBoZWFkZXJDZWxsID0gdGhpcy5oZWFkZXJFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRgdGhbZGF0YS1jb2x1bW4taWQ9XCIke2NvbHVtbklkfVwiXWBcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRpZiAoaGVhZGVyQ2VsbCkge1xyXG5cdFx0XHRoZWFkZXJDZWxsLnN0eWxlLndpZHRoID0gYCR7bmV3V2lkdGh9cHhgO1xyXG5cdFx0XHRoZWFkZXJDZWxsLnN0eWxlLm1pbldpZHRoID0gYCR7TWF0aC5taW4obmV3V2lkdGgsIDUwKX1weGA7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIGJvZHkgY2VsbHNcclxuXHRcdGNvbnN0IGJvZHlDZWxscyA9IHRoaXMuYm9keUVsLnF1ZXJ5U2VsZWN0b3JBbGwoXHJcblx0XHRcdGB0ZFtkYXRhLWNvbHVtbi1pZD1cIiR7Y29sdW1uSWR9XCJdYFxyXG5cdFx0KTtcclxuXHRcdGJvZHlDZWxscy5mb3JFYWNoKChjZWxsKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNlbGxFbCA9IGNlbGwgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGNlbGxFbC5zdHlsZS53aWR0aCA9IGAke25ld1dpZHRofXB4YDtcclxuXHRcdFx0Y2VsbEVsLnN0eWxlLm1pbldpZHRoID0gYCR7TWF0aC5taW4obmV3V2lkdGgsIDUwKX1weGA7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBVcGRhdGUgY29sdW1uIGRlZmluaXRpb25cclxuXHRcdGNvbnN0IGNvbHVtbiA9IHRoaXMuY29sdW1ucy5maW5kKChjKSA9PiBjLmlkID09PSBjb2x1bW5JZCk7XHJcblx0XHRpZiAoY29sdW1uKSB7XHJcblx0XHRcdGNvbHVtbi53aWR0aCA9IG5ld1dpZHRoO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVG9nZ2xlIHJvdyBleHBhbnNpb24gKGZvciB0cmVlIHZpZXcpXHJcblx0ICovXHJcblx0cHJpdmF0ZSB0b2dnbGVSb3dFeHBhbnNpb24ocm93SWQ6IHN0cmluZykge1xyXG5cdFx0Ly8gVGhpcyB3aWxsIGJlIGhhbmRsZWQgYnkgdGhlIHBhcmVudCBjb21wb25lbnRcclxuXHRcdC8vIEVtaXQgZXZlbnQgb3IgY2FsbCBjYWxsYmFja1xyXG5cdFx0aWYgKHRoaXMub25Sb3dFeHBhbmQpIHtcclxuXHRcdFx0dGhpcy5vblJvd0V4cGFuZChyb3dJZCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHQvLyBGYWxsYmFjazogZGlzcGF0Y2ggZXZlbnRcclxuXHRcdFx0Y29uc3QgZXZlbnQgPSBuZXcgQ3VzdG9tRXZlbnQoXCJyb3dUb2dnbGVcIiwge1xyXG5cdFx0XHRcdGRldGFpbDogeyByb3dJZCB9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0dGhpcy50YWJsZUVsLmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGNvbHVtbnMgY29uZmlndXJhdGlvbiBhbmQgcmUtcmVuZGVyIGhlYWRlclxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVDb2x1bW5zKG5ld0NvbHVtbnM6IFRhYmxlQ29sdW1uW10pIHtcclxuXHRcdHRoaXMuY29sdW1ucyA9IG5ld0NvbHVtbnM7XHJcblx0XHR0aGlzLnJlbmRlckhlYWRlcigpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRm9yY2UgY2xlYXIgYWxsIGNhY2hlZCByb3dzIGFuZCBET00gZWxlbWVudHMgLSB1c2VmdWwgZm9yIGNvbXBsZXRlIHJlZnJlc2hcclxuXHQgKi9cclxuXHRwdWJsaWMgZm9yY2VDbGVhckNhY2hlKCkge1xyXG5cdFx0Ly8gQ2xlYXIgYWxsIGFjdGl2ZSByb3dzXHJcblx0XHR0aGlzLmFjdGl2ZVJvd3MuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBDbGVhciByb3cgcG9vbFxyXG5cdFx0dGhpcy5yb3dQb29sID0gW107XHJcblxyXG5cdFx0Ly8gQ2xlYXIgYWxsIGV2ZW50IGNsZWFudXAgbWFwc1xyXG5cdFx0dGhpcy5ldmVudENsZWFudXBNYXAuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBDbGVhciBhY3RpdmUgc3VnZ2VzdHNcclxuXHRcdHRoaXMuYWN0aXZlU3VnZ2VzdHMuZm9yRWFjaCgoc3VnZ2VzdCkgPT4ge1xyXG5cdFx0XHRzdWdnZXN0LmNsb3NlKCk7XHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWN0aXZlU3VnZ2VzdHMuY2xlYXIoKTtcclxuXHJcblx0XHQvLyBDbGVhciB0aGUgdGFibGUgYm9keSBjb21wbGV0ZWx5XHJcblx0XHR0aGlzLmJvZHlFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBhdmFpbGFibGUgdmFsdWVzIGZvciBhdXRvLWNvbXBsZXRpb24gZnJvbSBleGlzdGluZyB0YXNrc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgZ2V0QWxsVmFsdWVzKGNvbHVtblR5cGU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcclxuXHRcdGlmICghdGhpcy5wbHVnaW4pIHJldHVybiBbXTtcclxuXHJcblx0XHQvLyBHZXQgYWxsIHRhc2tzIGZyb20gZGF0YWZsb3dcclxuXHRcdGxldCBhbGxUYXNrczogYW55W10gPSBbXTtcclxuXHRcdGlmICh0aGlzLnBsdWdpbi5kYXRhZmxvd09yY2hlc3RyYXRvcikge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGNvbnN0IHF1ZXJ5QVBJID0gdGhpcy5wbHVnaW4uZGF0YWZsb3dPcmNoZXN0cmF0b3IuZ2V0UXVlcnlBUEkoKTtcclxuXHRcdFx0XHRhbGxUYXNrcyA9IGF3YWl0IHF1ZXJ5QVBJLmdldEFsbFRhc2tzKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFwiRmFpbGVkIHRvIGdldCB0YXNrcyBmcm9tIGRhdGFmbG93OlwiLCBlcnJvcik7XHJcblx0XHRcdFx0YWxsVGFza3MgPSBbXTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Y29uc3QgdmFsdWVzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblxyXG5cdFx0YWxsVGFza3MuZm9yRWFjaCgodGFzazogYW55KSA9PiB7XHJcblx0XHRcdHN3aXRjaCAoY29sdW1uVHlwZSkge1xyXG5cdFx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0XHR0YXNrLm1ldGFkYXRhLnRhZ3M/LmZvckVhY2goKHRhZzogc3RyaW5nKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0YWcgJiYgdGFnLnRyaW0oKSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIFJlbW92ZSAjIHByZWZpeCBpZiBwcmVzZW50XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2xlYW5UYWcgPSB0YWcuc3RhcnRzV2l0aChcIiNcIilcclxuXHRcdFx0XHRcdFx0XHRcdD8gdGFnLnN1YnN0cmluZygxKVxyXG5cdFx0XHRcdFx0XHRcdFx0OiB0YWc7XHJcblx0XHRcdFx0XHRcdFx0dmFsdWVzLmFkZChjbGVhblRhZyk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0Y2FzZSBcInByb2plY3RcIjpcclxuXHRcdFx0XHRcdGlmICh0YXNrLm1ldGFkYXRhLnByb2plY3QgJiYgdGFzay5tZXRhZGF0YS5wcm9qZWN0LnRyaW0oKSkge1xyXG5cdFx0XHRcdFx0XHR2YWx1ZXMuYWRkKHRhc2subWV0YWRhdGEucHJvamVjdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRjYXNlIFwiY29udGV4dFwiOlxyXG5cdFx0XHRcdFx0aWYgKHRhc2subWV0YWRhdGEuY29udGV4dCAmJiB0YXNrLm1ldGFkYXRhLmNvbnRleHQudHJpbSgpKSB7XHJcblx0XHRcdFx0XHRcdHZhbHVlcy5hZGQodGFzay5tZXRhZGF0YS5jb250ZXh0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gQXJyYXkuZnJvbSh2YWx1ZXMpLnNvcnQoKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhlbHBlciBtZXRob2QgdG8gY29tcGFyZSB0d28gYXJyYXlzIGZvciBlcXVhbGl0eVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXJyYXlzRXF1YWwoYXJyMTogc3RyaW5nW10sIGFycjI6IHN0cmluZ1tdKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoYXJyMS5sZW5ndGggIT09IGFycjIubGVuZ3RoKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTb3J0IGJvdGggYXJyYXlzIGZvciBjb21wYXJpc29uIHRvIGlnbm9yZSBvcmRlciBkaWZmZXJlbmNlc1xyXG5cdFx0Y29uc3Qgc29ydGVkMSA9IFsuLi5hcnIxXS5zb3J0KCk7XHJcblx0XHRjb25zdCBzb3J0ZWQyID0gWy4uLmFycjJdLnNvcnQoKTtcclxuXHJcblx0XHRyZXR1cm4gc29ydGVkMS5ldmVyeSgodmFsdWUsIGluZGV4KSA9PiB2YWx1ZSA9PT0gc29ydGVkMltpbmRleF0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU2F2ZSBjZWxsIHZhbHVlIGhlbHBlciAtIG5vdyB3aXRoIGltcHJvdmVkIGNoYW5nZSBkZXRlY3Rpb25cclxuXHQgKi9cclxuXHRwcml2YXRlIHNhdmVDZWxsVmFsdWUoY2VsbEVsOiBIVE1MRWxlbWVudCwgY2VsbDogVGFibGVDZWxsLCBuZXdWYWx1ZTogYW55KSB7XHJcblx0XHRjb25zdCByb3dJZCA9IGNlbGxFbC5kYXRhc2V0LnJvd0lkO1xyXG5cdFx0aWYgKHJvd0lkICYmIHRoaXMub25DZWxsQ2hhbmdlKSB7XHJcblx0XHRcdC8vIFRoZSBjYWxsZXIgc2hvdWxkIGhhdmUgYWxyZWFkeSB2ZXJpZmllZCB0aGUgdmFsdWUgaGFzIGNoYW5nZWRcclxuXHRcdFx0Ly8gVGhpcyBtZXRob2Qgbm93IGFzc3VtZXMgYSBjaGFuZ2UgaXMgbmVlZGVkXHJcblx0XHRcdHRoaXMub25DZWxsQ2hhbmdlKHJvd0lkLCBjZWxsLmNvbHVtbklkLCBuZXdWYWx1ZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDbGVhciBlbXB0eSBzdGF0ZSBlbGVtZW50IGlmIGl0IGV4aXN0c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2xlYXJFbXB0eVN0YXRlKCkge1xyXG5cdFx0Y29uc3QgZW1wdHlSb3cgPSB0aGlzLmJvZHlFbC5xdWVyeVNlbGVjdG9yKFwiLnRhc2stdGFibGUtZW1wdHktcm93XCIpO1xyXG5cdFx0aWYgKGVtcHR5Um93KSB7XHJcblx0XHRcdGVtcHR5Um93LnJlbW92ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRW5zdXJlIHRyZWUgc3RhdGUgY29uc2lzdGVuY3kgLSBjaGVjayBhbmQgdXBkYXRlIGV4cGFuc2lvbiBidXR0b24gc3RhdGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBlbnN1cmVUcmVlU3RhdGVDb25zaXN0ZW5jeShcclxuXHRcdHJvd0VsOiBIVE1MVGFibGVSb3dFbGVtZW50LFxyXG5cdFx0cm93OiBUYWJsZVJvd1xyXG5cdCkge1xyXG5cdFx0Ly8gRmluZCB0aGUgZXhwYW5zaW9uIGJ1dHRvbiBpbiB0aGUgcm93XHJcblx0XHRjb25zdCBleHBhbmRCdG4gPSByb3dFbC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcIi50YXNrLXRhYmxlLWV4cGFuZC1idG5cIlxyXG5cdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHJcblx0XHRpZiAoZXhwYW5kQnRuICYmIHJvdy5oYXNDaGlsZHJlbikge1xyXG5cdFx0XHQvLyBTaW1wbGUgY2hlY2s6IGp1c3QgdXBkYXRlIHRoZSBpY29uIHRvIGVuc3VyZSBpdCdzIGNvcnJlY3RcclxuXHRcdFx0Ly8gVGhpcyBpcyBzYWZlciB0aGFuIHRyeWluZyB0byBkZXRlY3QgdGhlIGN1cnJlbnQgc3RhdGVcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWRJY29uID0gcm93LmV4cGFuZGVkXHJcblx0XHRcdFx0PyBcImNoZXZyb24tZG93blwiXHJcblx0XHRcdFx0OiBcImNoZXZyb24tcmlnaHRcIjtcclxuXHJcblx0XHRcdC8vIEFsd2F5cyB1cGRhdGUgdGhlIGljb24gdG8gZW5zdXJlIGNvbnNpc3RlbmN5XHJcblx0XHRcdGV4cGFuZEJ0bi5lbXB0eSgpO1xyXG5cdFx0XHRzZXRJY29uKGV4cGFuZEJ0biwgZXhwZWN0ZWRJY29uKTtcclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0b29sdGlwIHRleHRcclxuXHRcdFx0ZXhwYW5kQnRuLnRpdGxlID0gcm93LmV4cGFuZGVkXHJcblx0XHRcdFx0PyByb3cubGV2ZWwgPiAwXHJcblx0XHRcdFx0XHQ/IHQoXCJDb2xsYXBzZVwiKVxyXG5cdFx0XHRcdFx0OiB0KFwiQ29sbGFwc2Ugc3VidGFza3NcIilcclxuXHRcdFx0XHQ6IHJvdy5sZXZlbCA+IDBcclxuXHRcdFx0XHQ/IHQoXCJFeHBhbmRcIilcclxuXHRcdFx0XHQ6IHQoXCJFeHBhbmQgc3VidGFza3NcIik7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==