import { Component, setIcon } from "obsidian";
import { FilterDropdown } from "./filter-dropdown";
import { FilterPill } from "./filter-pill";
import "./filter.css";
import { t } from "@/translations/helper";
import { PRIORITY_MAP } from "@/common/default-symbol";
// Helper function to build filter categories and options from tasks
export function buildFilterOptionsFromTasks(tasks) {
    const statuses = new Set();
    const tags = new Set();
    const projects = new Set();
    const contexts = new Set();
    const priorities = new Set();
    const filePaths = new Set();
    tasks.forEach((task) => {
        // Status (handle potential undefined/null)
        if (task.status)
            statuses.add(task.status);
        // Tags
        task.metadata.tags.forEach((tag) => {
            // Skip non-string tags
            if (typeof tag === "string") {
                tags.add(tag);
            }
        });
        // Project
        if (task.metadata.project)
            projects.add(task.metadata.project);
        // Context
        if (task.metadata.context)
            contexts.add(task.metadata.context);
        // Priority
        if (task.metadata.priority !== undefined)
            priorities.add(task.metadata.priority);
        // File Path
        if (task.filePath)
            filePaths.add(task.filePath);
    });
    // Convert sets to sorted arrays for consistent display
    const sortedStatuses = Array.from(statuses).sort();
    const sortedTags = Array.from(tags).sort();
    const sortedProjects = Array.from(projects).sort();
    const sortedContexts = Array.from(contexts).sort();
    // Create a reverse map (Number -> Icon/Preferred String)
    // Prioritize icons. Handle potential duplicate values (like ⏬️ and ⏬ both mapping to 1).
    const REVERSE_PRIORITY_MAP = {};
    // Define preferred icons
    const PREFERRED_ICONS = {
        5: "🔺",
        4: "⏫",
        3: "🔼",
        2: "🔽",
        1: "⏬", // Choose one variant
    };
    for (const key in PRIORITY_MAP) {
        const value = PRIORITY_MAP[key];
        // Only add if it's the preferred icon or if no entry exists for this number yet
        if (key === PREFERRED_ICONS[value] || !REVERSE_PRIORITY_MAP[value]) {
            REVERSE_PRIORITY_MAP[value] = key;
        }
    }
    // Special handling for cases where the preferred icon might not be in the map if only text was used
    for (const num in PREFERRED_ICONS) {
        if (!REVERSE_PRIORITY_MAP[num]) {
            REVERSE_PRIORITY_MAP[num] = PREFERRED_ICONS[num];
        }
    }
    // Map numerical priorities to icons/strings and sort them based on the number value (descending for priority)
    const sortedPriorityOptions = Array.from(priorities)
        .sort((a, b) => b - a) // Sort descending by number
        .map((num) => REVERSE_PRIORITY_MAP[num] || num.toString()) // Map to icon or fallback to number string
        .filter((val) => !!val); // Ensure no undefined values
    const sortedFilePaths = Array.from(filePaths).sort();
    const categories = [
        {
            id: "status",
            label: t("Status"),
            options: sortedStatuses,
        },
        { id: "tag", label: t("Tag"), options: sortedTags },
        { id: "project", label: t("Project"), options: sortedProjects },
        { id: "context", label: t("Context"), options: sortedContexts },
        {
            id: "priority",
            label: t("Priority"),
            options: sortedPriorityOptions,
        },
        { id: "completed", label: t("Completed"), options: ["Yes", "No"] },
        { id: "filePath", label: t("File Path"), options: sortedFilePaths },
        // Add other categories as needed (e.g., dueDate, startDate)
        // These might require different option generation logic (e.g., date ranges)
    ];
    return categories;
}
export class FilterComponent extends Component {
    constructor(params, plugin) {
        super();
        this.params = params;
        this.plugin = plugin;
        this.activeFilters = [];
        this.filterPills = new Map(); // Store pill components by ID
        this.dropdown = null;
        this.container = params.container;
        this.options = params.options || [];
        this.onChange = params.onChange || (() => { });
    }
    onload() {
        this.render();
        this.setupEventListeners();
        this.loadInitialFilters(); // If any initial filters were set before load
    }
    onunload() {
        // Clear the container managed by this component
        this.container.empty();
        // Child components (pills, dropdown) are automatically unloaded by Component lifecycle
        this.filterPills.clear();
        this.activeFilters = [];
    }
    render() {
        this.container.empty(); // Clear previous content
        const filterElement = this.container.createDiv({
            cls: "filter-component",
        });
        this.filtersContainer = filterElement.createDiv({
            cls: "filter-pills-container",
        });
        this.controlsContainer = filterElement.createDiv({
            cls: "filter-controls",
        });
        this.addFilterButton = this.controlsContainer.createEl("button", {
            cls: "filter-add-button",
        }, (el) => {
            const iconSpan = el.createEl("span", {
                cls: "filter-add-icon",
            });
            setIcon(iconSpan, "plus");
            const textSpan = el.createEl("span", {
                text: t("Add filter"),
            });
        });
        this.clearAllButton = this.controlsContainer.createEl("button", {
            cls: "filter-clear-all-button mod-destructive",
            text: t("Clear all"),
        });
        this.clearAllButton.hide(); // Initially hidden
        this.updateClearAllButton(); // Set initial state
        for (const component of this.params.components || []) {
            this.addChild(component);
        }
    }
    setupEventListeners() {
        this.registerDomEvent(this.addFilterButton, "click", (e) => {
            e.stopPropagation();
            this.showFilterDropdown();
        });
        this.registerDomEvent(this.clearAllButton, "click", () => {
            this.clearAllFilters();
        });
        // Note: The document click/escape listeners are now handled
        // internally by FilterDropdown when it's loaded.
    }
    showFilterDropdown() {
        // If a dropdown already exists, remove it first.
        this.hideFilterDropdown();
        // Determine available options (categories not already active)
        const availableOptions = this.options.filter((option) => option.options.length > 0 && // Only show categories with available options
            !this.activeFilters.some((filter) => filter.category === option.id));
        if (availableOptions.length === 0) {
            // TODO: Use Obsidian's Notice API
            console.log("No more filter categories available or options populated.");
            // import { Notice } from 'obsidian'; new Notice('No more filter categories available.');
            return;
        }
        // Create and register the dropdown as a child component
        this.dropdown = new FilterDropdown({
            options: availableOptions,
            anchorElement: this.addFilterButton,
            onSelect: (categoryId, value) => {
                this.addFilter(categoryId, value);
                this.hideFilterDropdown(); // Close dropdown after selection
            },
            onClose: () => {
                this.hideFilterDropdown(); // Close dropdown if requested (e.g., Escape key)
            },
        }, this.plugin);
        this.addChild(this.dropdown); // Manage lifecycle
    }
    hideFilterDropdown() {
        if (this.dropdown) {
            this.removeChild(this.dropdown); // This triggers dropdown.onunload
            this.dropdown = null;
        }
    }
    addFilter(categoryId, value) {
        const category = this.options.find((opt) => opt.id === categoryId);
        if (!category)
            return;
        // Prevent adding the exact same category/value pair if desired (optional)
        // const exists = this.activeFilters.some(f => f.category === categoryId && f.value === value);
        // if (exists) return;
        // Generate a unique ID for this specific filter instance
        const filterId = `filter-${categoryId}-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 7)}`;
        const newFilter = {
            id: filterId,
            category: categoryId,
            categoryLabel: category.label,
            value: value,
        };
        this.activeFilters.push(newFilter);
        // Create and add the pill component
        const pill = new FilterPill({
            filter: newFilter,
            onRemove: (id) => {
                this.removeFilter(id);
            },
        });
        this.filterPills.set(filterId, pill); // Store the component
        this.addChild(pill); // Manage lifecycle
        this.filtersContainer.appendChild(pill.element); // Append the pill's element
        this.updateClearAllButton();
        this.onChange(this.getActiveFilters());
    }
    removeFilter(id) {
        const index = this.activeFilters.findIndex((f) => f.id === id);
        if (index === -1)
            return;
        // Remove from active filters array
        this.activeFilters.splice(index, 1);
        // Remove the corresponding pill component
        const pillToRemove = this.filterPills.get(id);
        if (pillToRemove) {
            // Removing the child triggers its onunload, but the animation is handled
            // *before* calling onRemove. We need to manually remove the element now.
            pillToRemove.element.remove(); // Remove element from DOM
            this.removeChild(pillToRemove); // Unload the component
            this.filterPills.delete(id); // Remove from map
        }
        this.updateClearAllButton();
        this.onChange(this.getActiveFilters());
    }
    clearAllFilters() {
        // Remove all pill components
        this.filterPills.forEach((pill) => {
            pill.element.remove(); // Remove element first
            this.removeChild(pill); // Then unload
        });
        this.filterPills.clear();
        // Clear active filters array
        this.activeFilters = [];
        this.filtersContainer.empty();
        this.updateClearAllButton();
        this.onChange(this.getActiveFilters());
    }
    updateClearAllButton() {
        if (this.clearAllButton) {
            this.activeFilters.length > 0
                ? this.clearAllButton.show()
                : this.clearAllButton.hide();
        }
    }
    loadInitialFilters() {
        // If filters were added via setFilters before onload, render them now
        const currentFilters = [...this.activeFilters]; // Copy array
        this.clearAllFilters(); // Clear state but keep the data
        // Re-add filters using the (potentially updated) options
        currentFilters.forEach((f) => {
            const categoryExists = this.options.some((opt) => opt.id === f.category);
            if (categoryExists) {
                // Check if the specific value exists within the updated options for that category
                const categoryWithOptions = this.options.find((opt) => opt.id === f.category);
                if (categoryWithOptions === null || categoryWithOptions === void 0 ? void 0 : categoryWithOptions.options.includes(f.value)) {
                    this.addFilter(f.category, f.value);
                }
                else {
                    console.warn(`Initial filter value "${f.value}" no longer exists for category "${f.category}". Skipping.`);
                }
            }
            else {
                console.warn(`Initial filter category "${f.category}" no longer exists. Skipping filter for value "${f.value}".`);
            }
        });
    }
    // --- Public Methods ---
    /**
     * Updates the available filter categories and their options based on the provided tasks.
     * @param tasks The list of tasks to derive filter options from.
     */
    updateFilterOptions(tasks) {
        this.options = buildFilterOptionsFromTasks(tasks);
    }
    getActiveFilters() {
        // Return a copy to prevent external modification
        return JSON.parse(JSON.stringify(this.activeFilters));
    }
    setFilters(filters) {
        // Clear existing filters and pills cleanly
        this.clearAllFilters();
        // Add each new filter
        filters.forEach((filter) => {
            // Find the category label from options
            const category = this.options.find((opt) => opt.id === filter.category);
            // Check if the specific option value exists within the category
            if (category && category.options.includes(filter.value)) {
                // We call addFilter, which handles adding to activeFilters, creating pills, etc.
                this.addFilter(filter.category, filter.value);
            }
            else if (category) {
                console.warn(`Filter value "${filter.value}" not found in options for category "${filter.category}".`);
            }
            else {
                console.warn(`Filter category "${filter.category}" not found in options.`);
            }
        });
        // If called after onload, ensure UI is updated immediately
        if (this._loaded) {
            this.updateClearAllButton();
            this.onChange(this.getActiveFilters());
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNuRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBTTNDLE9BQU8sY0FBYyxDQUFDO0FBR3RCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFdkQsb0VBQW9FO0FBQ3BFLE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxLQUFhO0lBQ3hELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUNyQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBRXBDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUN0QiwyQ0FBMkM7UUFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTTtZQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTNDLE9BQU87UUFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNsQyx1QkFBdUI7WUFDdkIsSUFBSSxPQUFPLEdBQUcsS0FBSyxRQUFRLEVBQUU7Z0JBQzVCLElBQUks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QUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBzZXRJY29uIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEZpbHRlckRyb3Bkb3duIH0gZnJvbSBcIi4vZmlsdGVyLWRyb3Bkb3duXCI7XHJcbmltcG9ydCB7IEZpbHRlclBpbGwgfSBmcm9tIFwiLi9maWx0ZXItcGlsbFwiO1xyXG5pbXBvcnQge1xyXG5cdEFjdGl2ZUZpbHRlcixcclxuXHRGaWx0ZXJDYXRlZ29yeSxcclxuXHRGaWx0ZXJDb21wb25lbnRPcHRpb25zLFxyXG59IGZyb20gXCIuL2ZpbHRlci10eXBlXCI7XHJcbmltcG9ydCBcIi4vZmlsdGVyLmNzc1wiO1xyXG5pbXBvcnQgeyBUYXNrIH0gZnJvbSBcIkAvdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IFBSSU9SSVRZX01BUCB9IGZyb20gXCJAL2NvbW1vbi9kZWZhdWx0LXN5bWJvbFwiO1xyXG5cclxuLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGJ1aWxkIGZpbHRlciBjYXRlZ29yaWVzIGFuZCBvcHRpb25zIGZyb20gdGFza3NcclxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkRmlsdGVyT3B0aW9uc0Zyb21UYXNrcyh0YXNrczogVGFza1tdKTogRmlsdGVyQ2F0ZWdvcnlbXSB7XHJcblx0Y29uc3Qgc3RhdHVzZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRjb25zdCB0YWdzID0gbmV3IFNldDxzdHJpbmc+KCk7XHJcblx0Y29uc3QgcHJvamVjdHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHRjb25zdCBjb250ZXh0cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xyXG5cdGNvbnN0IHByaW9yaXRpZXMgPSBuZXcgU2V0PG51bWJlcj4oKTtcclxuXHRjb25zdCBmaWxlUGF0aHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0Ly8gU3RhdHVzIChoYW5kbGUgcG90ZW50aWFsIHVuZGVmaW5lZC9udWxsKVxyXG5cdFx0aWYgKHRhc2suc3RhdHVzKSBzdGF0dXNlcy5hZGQodGFzay5zdGF0dXMpO1xyXG5cclxuXHRcdC8vIFRhZ3NcclxuXHRcdHRhc2subWV0YWRhdGEudGFncy5mb3JFYWNoKCh0YWcpID0+IHtcclxuXHRcdFx0Ly8gU2tpcCBub24tc3RyaW5nIHRhZ3NcclxuXHRcdFx0aWYgKHR5cGVvZiB0YWcgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHR0YWdzLmFkZCh0YWcpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBQcm9qZWN0XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5wcm9qZWN0KSBwcm9qZWN0cy5hZGQodGFzay5tZXRhZGF0YS5wcm9qZWN0KTtcclxuXHJcblx0XHQvLyBDb250ZXh0XHJcblx0XHRpZiAodGFzay5tZXRhZGF0YS5jb250ZXh0KSBjb250ZXh0cy5hZGQodGFzay5tZXRhZGF0YS5jb250ZXh0KTtcclxuXHJcblx0XHQvLyBQcmlvcml0eVxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEucHJpb3JpdHkgIT09IHVuZGVmaW5lZClcclxuXHRcdFx0cHJpb3JpdGllcy5hZGQodGFzay5tZXRhZGF0YS5wcmlvcml0eSk7XHJcblxyXG5cdFx0Ly8gRmlsZSBQYXRoXHJcblx0XHRpZiAodGFzay5maWxlUGF0aCkgZmlsZVBhdGhzLmFkZCh0YXNrLmZpbGVQYXRoKTtcclxuXHR9KTtcclxuXHJcblx0Ly8gQ29udmVydCBzZXRzIHRvIHNvcnRlZCBhcnJheXMgZm9yIGNvbnNpc3RlbnQgZGlzcGxheVxyXG5cdGNvbnN0IHNvcnRlZFN0YXR1c2VzID0gQXJyYXkuZnJvbShzdGF0dXNlcykuc29ydCgpO1xyXG5cdGNvbnN0IHNvcnRlZFRhZ3MgPSBBcnJheS5mcm9tKHRhZ3MpLnNvcnQoKTtcclxuXHRjb25zdCBzb3J0ZWRQcm9qZWN0cyA9IEFycmF5LmZyb20ocHJvamVjdHMpLnNvcnQoKTtcclxuXHRjb25zdCBzb3J0ZWRDb250ZXh0cyA9IEFycmF5LmZyb20oY29udGV4dHMpLnNvcnQoKTtcclxuXHJcblx0Ly8gQ3JlYXRlIGEgcmV2ZXJzZSBtYXAgKE51bWJlciAtPiBJY29uL1ByZWZlcnJlZCBTdHJpbmcpXHJcblx0Ly8gUHJpb3JpdGl6ZSBpY29ucy4gSGFuZGxlIHBvdGVudGlhbCBkdXBsaWNhdGUgdmFsdWVzIChsaWtlIOKPrO+4jyBhbmQg4o+sIGJvdGggbWFwcGluZyB0byAxKS5cclxuXHRjb25zdCBSRVZFUlNFX1BSSU9SSVRZX01BUDogUmVjb3JkPG51bWJlciwgc3RyaW5nPiA9IHt9O1xyXG5cdC8vIERlZmluZSBwcmVmZXJyZWQgaWNvbnNcclxuXHRjb25zdCBQUkVGRVJSRURfSUNPTlM6IFJlY29yZDxudW1iZXIsIHN0cmluZz4gPSB7XHJcblx0XHQ1OiBcIvCflLpcIixcclxuXHRcdDQ6IFwi4o+rXCIsXHJcblx0XHQzOiBcIvCflLxcIixcclxuXHRcdDI6IFwi8J+UvVwiLFxyXG5cdFx0MTogXCLij6xcIiwgLy8gQ2hvb3NlIG9uZSB2YXJpYW50XHJcblx0fTtcclxuXHRmb3IgKGNvbnN0IGtleSBpbiBQUklPUklUWV9NQVApIHtcclxuXHRcdGNvbnN0IHZhbHVlID0gUFJJT1JJVFlfTUFQW2tleV07XHJcblx0XHQvLyBPbmx5IGFkZCBpZiBpdCdzIHRoZSBwcmVmZXJyZWQgaWNvbiBvciBpZiBubyBlbnRyeSBleGlzdHMgZm9yIHRoaXMgbnVtYmVyIHlldFxyXG5cdFx0aWYgKGtleSA9PT0gUFJFRkVSUkVEX0lDT05TW3ZhbHVlXSB8fCAhUkVWRVJTRV9QUklPUklUWV9NQVBbdmFsdWVdKSB7XHJcblx0XHRcdFJFVkVSU0VfUFJJT1JJVFlfTUFQW3ZhbHVlXSA9IGtleTtcclxuXHRcdH1cclxuXHR9XHJcblx0Ly8gU3BlY2lhbCBoYW5kbGluZyBmb3IgY2FzZXMgd2hlcmUgdGhlIHByZWZlcnJlZCBpY29uIG1pZ2h0IG5vdCBiZSBpbiB0aGUgbWFwIGlmIG9ubHkgdGV4dCB3YXMgdXNlZFxyXG5cdGZvciAoY29uc3QgbnVtIGluIFBSRUZFUlJFRF9JQ09OUykge1xyXG5cdFx0aWYgKCFSRVZFUlNFX1BSSU9SSVRZX01BUFtudW1dKSB7XHJcblx0XHRcdFJFVkVSU0VfUFJJT1JJVFlfTUFQW251bV0gPSBQUkVGRVJSRURfSUNPTlNbbnVtXTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIE1hcCBudW1lcmljYWwgcHJpb3JpdGllcyB0byBpY29ucy9zdHJpbmdzIGFuZCBzb3J0IHRoZW0gYmFzZWQgb24gdGhlIG51bWJlciB2YWx1ZSAoZGVzY2VuZGluZyBmb3IgcHJpb3JpdHkpXHJcblx0Y29uc3Qgc29ydGVkUHJpb3JpdHlPcHRpb25zID0gQXJyYXkuZnJvbShwcmlvcml0aWVzKVxyXG5cdFx0LnNvcnQoKGEsIGIpID0+IGIgLSBhKSAvLyBTb3J0IGRlc2NlbmRpbmcgYnkgbnVtYmVyXHJcblx0XHQubWFwKChudW0pID0+IFJFVkVSU0VfUFJJT1JJVFlfTUFQW251bV0gfHwgbnVtLnRvU3RyaW5nKCkpIC8vIE1hcCB0byBpY29uIG9yIGZhbGxiYWNrIHRvIG51bWJlciBzdHJpbmdcclxuXHRcdC5maWx0ZXIoKHZhbCk6IHZhbCBpcyBzdHJpbmcgPT4gISF2YWwpOyAvLyBFbnN1cmUgbm8gdW5kZWZpbmVkIHZhbHVlc1xyXG5cclxuXHRjb25zdCBzb3J0ZWRGaWxlUGF0aHMgPSBBcnJheS5mcm9tKGZpbGVQYXRocykuc29ydCgpO1xyXG5cclxuXHRjb25zdCBjYXRlZ29yaWVzOiBGaWx0ZXJDYXRlZ29yeVtdID0gW1xyXG5cdFx0e1xyXG5cdFx0XHRpZDogXCJzdGF0dXNcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJTdGF0dXNcIiksXHJcblx0XHRcdG9wdGlvbnM6IHNvcnRlZFN0YXR1c2VzLFxyXG5cdFx0fSxcclxuXHRcdHsgaWQ6IFwidGFnXCIsIGxhYmVsOiB0KFwiVGFnXCIpLCBvcHRpb25zOiBzb3J0ZWRUYWdzIH0sXHJcblx0XHR7IGlkOiBcInByb2plY3RcIiwgbGFiZWw6IHQoXCJQcm9qZWN0XCIpLCBvcHRpb25zOiBzb3J0ZWRQcm9qZWN0cyB9LFxyXG5cdFx0eyBpZDogXCJjb250ZXh0XCIsIGxhYmVsOiB0KFwiQ29udGV4dFwiKSwgb3B0aW9uczogc29ydGVkQ29udGV4dHMgfSxcclxuXHRcdHtcclxuXHRcdFx0aWQ6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0bGFiZWw6IHQoXCJQcmlvcml0eVwiKSxcclxuXHRcdFx0b3B0aW9uczogc29ydGVkUHJpb3JpdHlPcHRpb25zLFxyXG5cdFx0fSwgLy8gVXNlIHRoZSBtYXBwZWQgJiBzb3J0ZWQgaWNvbnMvc3RyaW5nc1xyXG5cdFx0eyBpZDogXCJjb21wbGV0ZWRcIiwgbGFiZWw6IHQoXCJDb21wbGV0ZWRcIiksIG9wdGlvbnM6IFtcIlllc1wiLCBcIk5vXCJdIH0sIC8vIFN0YXRpYyBvcHRpb25zXHJcblx0XHR7IGlkOiBcImZpbGVQYXRoXCIsIGxhYmVsOiB0KFwiRmlsZSBQYXRoXCIpLCBvcHRpb25zOiBzb3J0ZWRGaWxlUGF0aHMgfSxcclxuXHRcdC8vIEFkZCBvdGhlciBjYXRlZ29yaWVzIGFzIG5lZWRlZCAoZS5nLiwgZHVlRGF0ZSwgc3RhcnREYXRlKVxyXG5cdFx0Ly8gVGhlc2UgbWlnaHQgcmVxdWlyZSBkaWZmZXJlbnQgb3B0aW9uIGdlbmVyYXRpb24gbG9naWMgKGUuZy4sIGRhdGUgcmFuZ2VzKVxyXG5cdF07XHJcblxyXG5cdHJldHVybiBjYXRlZ29yaWVzO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsdGVyQ29tcG9uZW50IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRwcml2YXRlIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBvcHRpb25zOiBGaWx0ZXJDYXRlZ29yeVtdO1xyXG5cdHByaXZhdGUgYWN0aXZlRmlsdGVyczogQWN0aXZlRmlsdGVyW10gPSBbXTtcclxuXHRwcml2YXRlIGZpbHRlclBpbGxzOiBNYXA8c3RyaW5nLCBGaWx0ZXJQaWxsPiA9IG5ldyBNYXAoKTsgLy8gU3RvcmUgcGlsbCBjb21wb25lbnRzIGJ5IElEXHJcblx0cHJpdmF0ZSBmaWx0ZXJzQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNvbnRyb2xzQ29udGFpbmVyOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGFkZEZpbHRlckJ1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBjbGVhckFsbEJ1dHRvbjogSFRNTEJ1dHRvbkVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBkcm9wZG93bjogRmlsdGVyRHJvcGRvd24gfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIG9uQ2hhbmdlOiAoYWN0aXZlRmlsdGVyczogQWN0aXZlRmlsdGVyW10pID0+IHZvaWQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSBwYXJhbXM6IEZpbHRlckNvbXBvbmVudE9wdGlvbnMsXHJcblx0XHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb250YWluZXIgPSBwYXJhbXMuY29udGFpbmVyO1xyXG5cdFx0dGhpcy5vcHRpb25zID0gcGFyYW1zLm9wdGlvbnMgfHwgW107XHJcblx0XHR0aGlzLm9uQ2hhbmdlID0gcGFyYW1zLm9uQ2hhbmdlIHx8ICgoKSA9PiB7fSk7XHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBvbmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0dGhpcy5zZXR1cEV2ZW50TGlzdGVuZXJzKCk7XHJcblx0XHR0aGlzLmxvYWRJbml0aWFsRmlsdGVycygpOyAvLyBJZiBhbnkgaW5pdGlhbCBmaWx0ZXJzIHdlcmUgc2V0IGJlZm9yZSBsb2FkXHJcblx0fVxyXG5cclxuXHRvdmVycmlkZSBvbnVubG9hZCgpOiB2b2lkIHtcclxuXHRcdC8vIENsZWFyIHRoZSBjb250YWluZXIgbWFuYWdlZCBieSB0aGlzIGNvbXBvbmVudFxyXG5cdFx0dGhpcy5jb250YWluZXIuZW1wdHkoKTtcclxuXHRcdC8vIENoaWxkIGNvbXBvbmVudHMgKHBpbGxzLCBkcm9wZG93bikgYXJlIGF1dG9tYXRpY2FsbHkgdW5sb2FkZWQgYnkgQ29tcG9uZW50IGxpZmVjeWNsZVxyXG5cdFx0dGhpcy5maWx0ZXJQaWxscy5jbGVhcigpO1xyXG5cdFx0dGhpcy5hY3RpdmVGaWx0ZXJzID0gW107XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlcigpOiB2b2lkIHtcclxuXHRcdHRoaXMuY29udGFpbmVyLmVtcHR5KCk7IC8vIENsZWFyIHByZXZpb3VzIGNvbnRlbnRcclxuXHJcblx0XHRjb25zdCBmaWx0ZXJFbGVtZW50ID0gdGhpcy5jb250YWluZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1jb21wb25lbnRcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuZmlsdGVyc0NvbnRhaW5lciA9IGZpbHRlckVsZW1lbnQuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1waWxscy1jb250YWluZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuY29udHJvbHNDb250YWluZXIgPSBmaWx0ZXJFbGVtZW50LmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogXCJmaWx0ZXItY29udHJvbHNcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMuYWRkRmlsdGVyQnV0dG9uID0gdGhpcy5jb250cm9sc0NvbnRhaW5lci5jcmVhdGVFbChcclxuXHRcdFx0XCJidXR0b25cIixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItYWRkLWJ1dHRvblwiLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHQoZWwpID0+IHtcclxuXHRcdFx0XHRjb25zdCBpY29uU3BhbiA9IGVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0XHRjbHM6IFwiZmlsdGVyLWFkZC1pY29uXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0c2V0SWNvbihpY29uU3BhbiwgXCJwbHVzXCIpO1xyXG5cdFx0XHRcdGNvbnN0IHRleHRTcGFuID0gZWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJBZGQgZmlsdGVyXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdHRoaXMuY2xlYXJBbGxCdXR0b24gPSB0aGlzLmNvbnRyb2xzQ29udGFpbmVyLmNyZWF0ZUVsKFwiYnV0dG9uXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1jbGVhci1hbGwtYnV0dG9uIG1vZC1kZXN0cnVjdGl2ZVwiLFxyXG5cdFx0XHR0ZXh0OiB0KFwiQ2xlYXIgYWxsXCIpLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLmNsZWFyQWxsQnV0dG9uLmhpZGUoKTsgLy8gSW5pdGlhbGx5IGhpZGRlblxyXG5cclxuXHRcdHRoaXMudXBkYXRlQ2xlYXJBbGxCdXR0b24oKTsgLy8gU2V0IGluaXRpYWwgc3RhdGVcclxuXHJcblx0XHRmb3IgKGNvbnN0IGNvbXBvbmVudCBvZiB0aGlzLnBhcmFtcy5jb21wb25lbnRzIHx8IFtdKSB7XHJcblx0XHRcdHRoaXMuYWRkQ2hpbGQoY29tcG9uZW50KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2V0dXBFdmVudExpc3RlbmVycygpOiB2b2lkIHtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudCh0aGlzLmFkZEZpbHRlckJ1dHRvbiwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG5cdFx0XHR0aGlzLnNob3dGaWx0ZXJEcm9wZG93bigpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHRoaXMuY2xlYXJBbGxCdXR0b24sIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNsZWFyQWxsRmlsdGVycygpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTm90ZTogVGhlIGRvY3VtZW50IGNsaWNrL2VzY2FwZSBsaXN0ZW5lcnMgYXJlIG5vdyBoYW5kbGVkXHJcblx0XHQvLyBpbnRlcm5hbGx5IGJ5IEZpbHRlckRyb3Bkb3duIHdoZW4gaXQncyBsb2FkZWQuXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNob3dGaWx0ZXJEcm9wZG93bigpOiB2b2lkIHtcclxuXHRcdC8vIElmIGEgZHJvcGRvd24gYWxyZWFkeSBleGlzdHMsIHJlbW92ZSBpdCBmaXJzdC5cclxuXHRcdHRoaXMuaGlkZUZpbHRlckRyb3Bkb3duKCk7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIGF2YWlsYWJsZSBvcHRpb25zIChjYXRlZ29yaWVzIG5vdCBhbHJlYWR5IGFjdGl2ZSlcclxuXHRcdGNvbnN0IGF2YWlsYWJsZU9wdGlvbnMgPSB0aGlzLm9wdGlvbnMuZmlsdGVyKFxyXG5cdFx0XHQob3B0aW9uKSA9PlxyXG5cdFx0XHRcdG9wdGlvbi5vcHRpb25zLmxlbmd0aCA+IDAgJiYgLy8gT25seSBzaG93IGNhdGVnb3JpZXMgd2l0aCBhdmFpbGFibGUgb3B0aW9uc1xyXG5cdFx0XHRcdCF0aGlzLmFjdGl2ZUZpbHRlcnMuc29tZShcclxuXHRcdFx0XHRcdChmaWx0ZXIpID0+IGZpbHRlci5jYXRlZ29yeSA9PT0gb3B0aW9uLmlkXHJcblx0XHRcdFx0KVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoYXZhaWxhYmxlT3B0aW9ucy5sZW5ndGggPT09IDApIHtcclxuXHRcdFx0Ly8gVE9ETzogVXNlIE9ic2lkaWFuJ3MgTm90aWNlIEFQSVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0XHRcIk5vIG1vcmUgZmlsdGVyIGNhdGVnb3JpZXMgYXZhaWxhYmxlIG9yIG9wdGlvbnMgcG9wdWxhdGVkLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIGltcG9ydCB7IE5vdGljZSB9IGZyb20gJ29ic2lkaWFuJzsgbmV3IE5vdGljZSgnTm8gbW9yZSBmaWx0ZXIgY2F0ZWdvcmllcyBhdmFpbGFibGUuJyk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDcmVhdGUgYW5kIHJlZ2lzdGVyIHRoZSBkcm9wZG93biBhcyBhIGNoaWxkIGNvbXBvbmVudFxyXG5cdFx0dGhpcy5kcm9wZG93biA9IG5ldyBGaWx0ZXJEcm9wZG93bihcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG9wdGlvbnM6IGF2YWlsYWJsZU9wdGlvbnMsXHJcblx0XHRcdFx0YW5jaG9yRWxlbWVudDogdGhpcy5hZGRGaWx0ZXJCdXR0b24sXHJcblx0XHRcdFx0b25TZWxlY3Q6IChjYXRlZ29yeUlkLCB2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRGaWx0ZXIoY2F0ZWdvcnlJZCwgdmFsdWUpO1xyXG5cdFx0XHRcdFx0dGhpcy5oaWRlRmlsdGVyRHJvcGRvd24oKTsgLy8gQ2xvc2UgZHJvcGRvd24gYWZ0ZXIgc2VsZWN0aW9uXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRvbkNsb3NlOiAoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLmhpZGVGaWx0ZXJEcm9wZG93bigpOyAvLyBDbG9zZSBkcm9wZG93biBpZiByZXF1ZXN0ZWQgKGUuZy4sIEVzY2FwZSBrZXkpXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdCk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMuZHJvcGRvd24pOyAvLyBNYW5hZ2UgbGlmZWN5Y2xlXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGhpZGVGaWx0ZXJEcm9wZG93bigpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmRyb3Bkb3duKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5kcm9wZG93bik7IC8vIFRoaXMgdHJpZ2dlcnMgZHJvcGRvd24ub251bmxvYWRcclxuXHRcdFx0dGhpcy5kcm9wZG93biA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFkZEZpbHRlcihjYXRlZ29yeUlkOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGNhdGVnb3J5ID0gdGhpcy5vcHRpb25zLmZpbmQoKG9wdCkgPT4gb3B0LmlkID09PSBjYXRlZ29yeUlkKTtcclxuXHRcdGlmICghY2F0ZWdvcnkpIHJldHVybjtcclxuXHJcblx0XHQvLyBQcmV2ZW50IGFkZGluZyB0aGUgZXhhY3Qgc2FtZSBjYXRlZ29yeS92YWx1ZSBwYWlyIGlmIGRlc2lyZWQgKG9wdGlvbmFsKVxyXG5cdFx0Ly8gY29uc3QgZXhpc3RzID0gdGhpcy5hY3RpdmVGaWx0ZXJzLnNvbWUoZiA9PiBmLmNhdGVnb3J5ID09PSBjYXRlZ29yeUlkICYmIGYudmFsdWUgPT09IHZhbHVlKTtcclxuXHRcdC8vIGlmIChleGlzdHMpIHJldHVybjtcclxuXHJcblx0XHQvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBJRCBmb3IgdGhpcyBzcGVjaWZpYyBmaWx0ZXIgaW5zdGFuY2VcclxuXHRcdGNvbnN0IGZpbHRlcklkID0gYGZpbHRlci0ke2NhdGVnb3J5SWR9LSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpXHJcblx0XHRcdC50b1N0cmluZygzNilcclxuXHRcdFx0LnN1YnN0cmluZygyLCA3KX1gO1xyXG5cclxuXHRcdGNvbnN0IG5ld0ZpbHRlcjogQWN0aXZlRmlsdGVyID0ge1xyXG5cdFx0XHRpZDogZmlsdGVySWQsXHJcblx0XHRcdGNhdGVnb3J5OiBjYXRlZ29yeUlkLFxyXG5cdFx0XHRjYXRlZ29yeUxhYmVsOiBjYXRlZ29yeS5sYWJlbCxcclxuXHRcdFx0dmFsdWU6IHZhbHVlLFxyXG5cdFx0fTtcclxuXHJcblx0XHR0aGlzLmFjdGl2ZUZpbHRlcnMucHVzaChuZXdGaWx0ZXIpO1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhbmQgYWRkIHRoZSBwaWxsIGNvbXBvbmVudFxyXG5cdFx0Y29uc3QgcGlsbCA9IG5ldyBGaWx0ZXJQaWxsKHtcclxuXHRcdFx0ZmlsdGVyOiBuZXdGaWx0ZXIsXHJcblx0XHRcdG9uUmVtb3ZlOiAoaWQpID0+IHtcclxuXHRcdFx0XHR0aGlzLnJlbW92ZUZpbHRlcihpZCk7XHJcblx0XHRcdH0sXHJcblx0XHR9KTtcclxuXHJcblx0XHR0aGlzLmZpbHRlclBpbGxzLnNldChmaWx0ZXJJZCwgcGlsbCk7IC8vIFN0b3JlIHRoZSBjb21wb25lbnRcclxuXHRcdHRoaXMuYWRkQ2hpbGQocGlsbCk7IC8vIE1hbmFnZSBsaWZlY3ljbGVcclxuXHRcdHRoaXMuZmlsdGVyc0NvbnRhaW5lci5hcHBlbmRDaGlsZChwaWxsLmVsZW1lbnQpOyAvLyBBcHBlbmQgdGhlIHBpbGwncyBlbGVtZW50XHJcblxyXG5cdFx0dGhpcy51cGRhdGVDbGVhckFsbEJ1dHRvbigpO1xyXG5cdFx0dGhpcy5vbkNoYW5nZSh0aGlzLmdldEFjdGl2ZUZpbHRlcnMoKSk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbW92ZUZpbHRlcihpZDogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRjb25zdCBpbmRleCA9IHRoaXMuYWN0aXZlRmlsdGVycy5maW5kSW5kZXgoKGYpID0+IGYuaWQgPT09IGlkKTtcclxuXHRcdGlmIChpbmRleCA9PT0gLTEpIHJldHVybjtcclxuXHJcblx0XHQvLyBSZW1vdmUgZnJvbSBhY3RpdmUgZmlsdGVycyBhcnJheVxyXG5cdFx0dGhpcy5hY3RpdmVGaWx0ZXJzLnNwbGljZShpbmRleCwgMSk7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIHRoZSBjb3JyZXNwb25kaW5nIHBpbGwgY29tcG9uZW50XHJcblx0XHRjb25zdCBwaWxsVG9SZW1vdmUgPSB0aGlzLmZpbHRlclBpbGxzLmdldChpZCk7XHJcblx0XHRpZiAocGlsbFRvUmVtb3ZlKSB7XHJcblx0XHRcdC8vIFJlbW92aW5nIHRoZSBjaGlsZCB0cmlnZ2VycyBpdHMgb251bmxvYWQsIGJ1dCB0aGUgYW5pbWF0aW9uIGlzIGhhbmRsZWRcclxuXHRcdFx0Ly8gKmJlZm9yZSogY2FsbGluZyBvblJlbW92ZS4gV2UgbmVlZCB0byBtYW51YWxseSByZW1vdmUgdGhlIGVsZW1lbnQgbm93LlxyXG5cdFx0XHRwaWxsVG9SZW1vdmUuZWxlbWVudC5yZW1vdmUoKTsgLy8gUmVtb3ZlIGVsZW1lbnQgZnJvbSBET01cclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZChwaWxsVG9SZW1vdmUpOyAvLyBVbmxvYWQgdGhlIGNvbXBvbmVudFxyXG5cdFx0XHR0aGlzLmZpbHRlclBpbGxzLmRlbGV0ZShpZCk7IC8vIFJlbW92ZSBmcm9tIG1hcFxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudXBkYXRlQ2xlYXJBbGxCdXR0b24oKTtcclxuXHRcdHRoaXMub25DaGFuZ2UodGhpcy5nZXRBY3RpdmVGaWx0ZXJzKCkpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjbGVhckFsbEZpbHRlcnMoKTogdm9pZCB7XHJcblx0XHQvLyBSZW1vdmUgYWxsIHBpbGwgY29tcG9uZW50c1xyXG5cdFx0dGhpcy5maWx0ZXJQaWxscy5mb3JFYWNoKChwaWxsKSA9PiB7XHJcblx0XHRcdHBpbGwuZWxlbWVudC5yZW1vdmUoKTsgLy8gUmVtb3ZlIGVsZW1lbnQgZmlyc3RcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZChwaWxsKTsgLy8gVGhlbiB1bmxvYWRcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy5maWx0ZXJQaWxscy5jbGVhcigpO1xyXG5cclxuXHRcdC8vIENsZWFyIGFjdGl2ZSBmaWx0ZXJzIGFycmF5XHJcblx0XHR0aGlzLmFjdGl2ZUZpbHRlcnMgPSBbXTtcclxuXHJcblx0XHR0aGlzLmZpbHRlcnNDb250YWluZXIuZW1wdHkoKTtcclxuXHJcblx0XHR0aGlzLnVwZGF0ZUNsZWFyQWxsQnV0dG9uKCk7XHJcblx0XHR0aGlzLm9uQ2hhbmdlKHRoaXMuZ2V0QWN0aXZlRmlsdGVycygpKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlQ2xlYXJBbGxCdXR0b24oKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy5jbGVhckFsbEJ1dHRvbikge1xyXG5cdFx0XHR0aGlzLmFjdGl2ZUZpbHRlcnMubGVuZ3RoID4gMFxyXG5cdFx0XHRcdD8gdGhpcy5jbGVhckFsbEJ1dHRvbi5zaG93KClcclxuXHRcdFx0XHQ6IHRoaXMuY2xlYXJBbGxCdXR0b24uaGlkZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBsb2FkSW5pdGlhbEZpbHRlcnMoKTogdm9pZCB7XHJcblx0XHQvLyBJZiBmaWx0ZXJzIHdlcmUgYWRkZWQgdmlhIHNldEZpbHRlcnMgYmVmb3JlIG9ubG9hZCwgcmVuZGVyIHRoZW0gbm93XHJcblx0XHRjb25zdCBjdXJyZW50RmlsdGVycyA9IFsuLi50aGlzLmFjdGl2ZUZpbHRlcnNdOyAvLyBDb3B5IGFycmF5XHJcblx0XHR0aGlzLmNsZWFyQWxsRmlsdGVycygpOyAvLyBDbGVhciBzdGF0ZSBidXQga2VlcCB0aGUgZGF0YVxyXG5cdFx0Ly8gUmUtYWRkIGZpbHRlcnMgdXNpbmcgdGhlIChwb3RlbnRpYWxseSB1cGRhdGVkKSBvcHRpb25zXHJcblx0XHRjdXJyZW50RmlsdGVycy5mb3JFYWNoKChmKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNhdGVnb3J5RXhpc3RzID0gdGhpcy5vcHRpb25zLnNvbWUoXHJcblx0XHRcdFx0KG9wdCkgPT4gb3B0LmlkID09PSBmLmNhdGVnb3J5XHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChjYXRlZ29yeUV4aXN0cykge1xyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoZSBzcGVjaWZpYyB2YWx1ZSBleGlzdHMgd2l0aGluIHRoZSB1cGRhdGVkIG9wdGlvbnMgZm9yIHRoYXQgY2F0ZWdvcnlcclxuXHRcdFx0XHRjb25zdCBjYXRlZ29yeVdpdGhPcHRpb25zID0gdGhpcy5vcHRpb25zLmZpbmQoXHJcblx0XHRcdFx0XHQob3B0KSA9PiBvcHQuaWQgPT09IGYuY2F0ZWdvcnlcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChjYXRlZ29yeVdpdGhPcHRpb25zPy5vcHRpb25zLmluY2x1ZGVzKGYudmFsdWUpKSB7XHJcblx0XHRcdFx0XHR0aGlzLmFkZEZpbHRlcihmLmNhdGVnb3J5LCBmLnZhbHVlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRgSW5pdGlhbCBmaWx0ZXIgdmFsdWUgXCIke2YudmFsdWV9XCIgbm8gbG9uZ2VyIGV4aXN0cyBmb3IgY2F0ZWdvcnkgXCIke2YuY2F0ZWdvcnl9XCIuIFNraXBwaW5nLmBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdGBJbml0aWFsIGZpbHRlciBjYXRlZ29yeSBcIiR7Zi5jYXRlZ29yeX1cIiBubyBsb25nZXIgZXhpc3RzLiBTa2lwcGluZyBmaWx0ZXIgZm9yIHZhbHVlIFwiJHtmLnZhbHVlfVwiLmBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBQdWJsaWMgTWV0aG9kcyAtLS1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlcyB0aGUgYXZhaWxhYmxlIGZpbHRlciBjYXRlZ29yaWVzIGFuZCB0aGVpciBvcHRpb25zIGJhc2VkIG9uIHRoZSBwcm92aWRlZCB0YXNrcy5cclxuXHQgKiBAcGFyYW0gdGFza3MgVGhlIGxpc3Qgb2YgdGFza3MgdG8gZGVyaXZlIGZpbHRlciBvcHRpb25zIGZyb20uXHJcblx0ICovXHJcblx0cHVibGljIHVwZGF0ZUZpbHRlck9wdGlvbnModGFza3M6IFRhc2tbXSk6IHZvaWQge1xyXG5cdFx0dGhpcy5vcHRpb25zID0gYnVpbGRGaWx0ZXJPcHRpb25zRnJvbVRhc2tzKHRhc2tzKTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRBY3RpdmVGaWx0ZXJzKCk6IEFjdGl2ZUZpbHRlcltdIHtcclxuXHRcdC8vIFJldHVybiBhIGNvcHkgdG8gcHJldmVudCBleHRlcm5hbCBtb2RpZmljYXRpb25cclxuXHRcdHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHRoaXMuYWN0aXZlRmlsdGVycykpO1xyXG5cdH1cclxuXHJcblx0cHVibGljIHNldEZpbHRlcnMoZmlsdGVyczogeyBjYXRlZ29yeTogc3RyaW5nOyB2YWx1ZTogc3RyaW5nIH1bXSk6IHZvaWQge1xyXG5cdFx0Ly8gQ2xlYXIgZXhpc3RpbmcgZmlsdGVycyBhbmQgcGlsbHMgY2xlYW5seVxyXG5cdFx0dGhpcy5jbGVhckFsbEZpbHRlcnMoKTtcclxuXHJcblx0XHQvLyBBZGQgZWFjaCBuZXcgZmlsdGVyXHJcblx0XHRmaWx0ZXJzLmZvckVhY2goKGZpbHRlcikgPT4ge1xyXG5cdFx0XHQvLyBGaW5kIHRoZSBjYXRlZ29yeSBsYWJlbCBmcm9tIG9wdGlvbnNcclxuXHRcdFx0Y29uc3QgY2F0ZWdvcnkgPSB0aGlzLm9wdGlvbnMuZmluZChcclxuXHRcdFx0XHQob3B0KSA9PiBvcHQuaWQgPT09IGZpbHRlci5jYXRlZ29yeVxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGUgc3BlY2lmaWMgb3B0aW9uIHZhbHVlIGV4aXN0cyB3aXRoaW4gdGhlIGNhdGVnb3J5XHJcblx0XHRcdGlmIChjYXRlZ29yeSAmJiBjYXRlZ29yeS5vcHRpb25zLmluY2x1ZGVzKGZpbHRlci52YWx1ZSkpIHtcclxuXHRcdFx0XHQvLyBXZSBjYWxsIGFkZEZpbHRlciwgd2hpY2ggaGFuZGxlcyBhZGRpbmcgdG8gYWN0aXZlRmlsdGVycywgY3JlYXRpbmcgcGlsbHMsIGV0Yy5cclxuXHRcdFx0XHR0aGlzLmFkZEZpbHRlcihmaWx0ZXIuY2F0ZWdvcnksIGZpbHRlci52YWx1ZSk7XHJcblx0XHRcdH0gZWxzZSBpZiAoY2F0ZWdvcnkpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRgRmlsdGVyIHZhbHVlIFwiJHtmaWx0ZXIudmFsdWV9XCIgbm90IGZvdW5kIGluIG9wdGlvbnMgZm9yIGNhdGVnb3J5IFwiJHtmaWx0ZXIuY2F0ZWdvcnl9XCIuYFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YEZpbHRlciBjYXRlZ29yeSBcIiR7ZmlsdGVyLmNhdGVnb3J5fVwiIG5vdCBmb3VuZCBpbiBvcHRpb25zLmBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJZiBjYWxsZWQgYWZ0ZXIgb25sb2FkLCBlbnN1cmUgVUkgaXMgdXBkYXRlZCBpbW1lZGlhdGVseVxyXG5cdFx0aWYgKHRoaXMuX2xvYWRlZCkge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUNsZWFyQWxsQnV0dG9uKCk7XHJcblx0XHRcdHRoaXMub25DaGFuZ2UodGhpcy5nZXRBY3RpdmVGaWx0ZXJzKCkpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=