import { Component, debounce, setIcon } from "obsidian";
import { t } from "@/translations/helper";
export class FilterDropdown extends Component {
    constructor(options, plugin) {
        super();
        this.plugin = plugin;
        this.currentCategory = null;
        this.options = options.options;
        this.anchorElement = options.anchorElement;
        this.onSelect = options.onSelect;
        this.onClose = options.onClose; // Parent calls this to trigger unload
    }
    onload() {
        this.element = this.createDropdownElement();
        this.searchInput = this.element.querySelector(".filter-dropdown-search");
        this.listContainer = this.element.querySelector(".filter-dropdown-list");
        this.renderCategoryList();
        this.setupEventListeners();
        // Append to body
        document.body.appendChild(this.element);
        // Add animation class after a short delay
        setTimeout(() => {
            this.element.classList.add("filter-dropdown-visible");
            this.positionDropdown();
        }, 10);
        // Focus search after a short delay
        setTimeout(() => {
            this.searchInput.focus();
        }, 50);
    }
    onunload() {
        // Remove the dropdown with animation
        this.element.classList.remove("filter-dropdown-visible");
        // Remove element after animation completes
        // Use a timer matching the animation duration
        setTimeout(() => {
            this.element.remove();
        }, 150); // Match CSS animation duration
    }
    createDropdownElement() {
        const dropdown = createEl("div", { cls: "filter-dropdown" });
        const header = dropdown.createEl("div", {
            cls: "filter-dropdown-header",
        });
        header.createEl("input", {
            type: "text",
            cls: "filter-dropdown-search",
            attr: { placeholder: "Filter..." },
        });
        dropdown.createEl("div", { cls: "filter-dropdown-list" });
        return dropdown;
    }
    positionDropdown() {
        const rect = this.anchorElement.getBoundingClientRect();
        const { innerHeight, innerWidth } = window;
        // Recalculate dropdown dimensions *after* potential content changes
        this.element.style.visibility = "hidden"; // Temporarily hide to measure
        this.element.style.display = "flex"; // Ensure it's laid out
        const dropdownHeight = this.element.offsetHeight;
        const dropdownWidth = this.element.offsetWidth;
        this.element.style.display = ""; // Reset display
        this.element.style.visibility = ""; // Make visible again
        // Default position below the anchor
        let top = rect.bottom + 8;
        let left = rect.left;
        // Check if dropdown goes off bottom edge
        if (top + dropdownHeight > innerHeight - 16) {
            top = rect.top - dropdownHeight - 8;
        }
        // Check if dropdown goes off top edge (ensure it's not negative)
        if (top < 16) {
            top = 16;
        }
        // Check if dropdown goes off right edge
        if (left + dropdownWidth > innerWidth - 16) {
            left = innerWidth - dropdownWidth - 16;
        }
        // Check if dropdown goes off left edge
        if (left < 16) {
            left = 16;
        }
        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
    }
    renderCategoryList() {
        this.listContainer.empty(); // Use empty() instead of innerHTML = ""
        this.searchInput.placeholder = "Filter categories...";
        this.searchInput.value = ""; // Ensure search is cleared when showing categories
        this.options.forEach((category) => {
            const item = this.createListItem(category.label, () => this.showCategoryValues(category), true, // has arrow
            false, // not back button
            false, // not value item
            category.id);
            this.listContainer.appendChild(item);
        });
        this.positionDropdown(); // Reposition after rendering
    }
    showCategoryValues(category) {
        this.currentCategory = category;
        this.searchInput.value = ""; // Clear search on category change
        this.searchInput.placeholder = `Filter ${category.label.toLowerCase()}...`;
        this.listContainer.empty(); // Use empty() instead of innerHTML = ""
        // Add back button
        const backButton = this.createListItem(t("Back to categories"), () => {
            this.currentCategory = null;
            this.renderCategoryList();
        }, false, // no arrow
        true // is back button
        );
        this.listContainer.appendChild(backButton);
        // Add separator
        this.listContainer.createEl("div", {
            cls: "filter-dropdown-separator",
        });
        // Render values for the selected category
        this.renderFilterValues(category.options);
        this.positionDropdown(); // Reposition after rendering
        this.searchInput.focus(); // Keep focus on search
    }
    renderFilterValues(values, searchTerm = "") {
        // Remove existing value items and empty state, keeping back button and separator
        const itemsToRemove = this.listContainer.querySelectorAll(".filter-dropdown-value-item, .filter-dropdown-empty");
        itemsToRemove.forEach((item) => item.remove());
        const filteredValues = searchTerm
            ? values.filter((value) => value.toLowerCase().includes(searchTerm.toLowerCase()))
            : values;
        if (filteredValues.length === 0) {
            this.listContainer.createEl("div", {
                cls: "filter-dropdown-empty",
                text: t("No matching options found"),
            });
        }
        else {
            filteredValues.forEach((value) => {
                const item = this.createListItem(value, () => {
                    if (this.currentCategory) {
                        this.onSelect(this.currentCategory.id, value);
                        // onClose will be called by the parent to unload this component
                    }
                }, false, // no arrow
                false, // not back button
                true // is value item
                );
                this.listContainer.appendChild(item);
            });
        }
        this.positionDropdown(); // Reposition after potentially changing list height
    }
    // Helper to create list items consistently
    createListItem(label, onClick, hasArrow = false, isBackButton = false, isValueItem = false, categoryId = "") {
        const item = createEl("div", { cls: "filter-dropdown-item" });
        if (isBackButton)
            item.classList.add("filter-dropdown-back");
        if (isValueItem)
            item.classList.add("filter-dropdown-value-item");
        item.setAttr("tabindex", 0); // Make items focusable
        if (isBackButton) {
            const backArrow = item.createEl("span", {
                cls: "filter-dropdown-item-arrow back",
            });
            setIcon(backArrow, "chevron-left");
        }
        item.createEl("span", {
            cls: "filter-dropdown-item-label",
            text: label,
        });
        if (hasArrow) {
            const forwardArrow = item.createEl("span", {
                cls: "filter-dropdown-item-arrow",
            });
            setIcon(forwardArrow, "chevron-right");
        }
        this.registerDomEvent(item, "click", onClick);
        // Handle Enter key press for accessibility
        this.registerDomEvent(item, "keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                onClick();
            }
        });
        return item;
    }
    setupEventListeners() {
        // Debounced search input handler
        const debouncedSearch = debounce(() => {
            const searchTerm = this.searchInput.value.trim();
            if (this.currentCategory) {
                this.renderFilterValues(this.currentCategory.options, searchTerm);
            }
            else {
                this.filterCategoryList(searchTerm);
            }
        }, 150, false // Changed to false: debounce triggers after user stops typing
        );
        this.registerDomEvent(this.searchInput, "input", debouncedSearch);
        // Close dropdown when clicking outside of it
        this.registerDomEvent(document, "click", (e) => {
            if (!e.composedPath().includes(this.element)) {
                this.onClose(); // Request parent to close
            }
        });
        // Handle keyboard navigation and actions
        this.registerDomEvent(this.element, "keydown", (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                this.onClose(); // Request parent to close
            }
            else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                // If focus is on search input and user presses down, focus first item
                if (e.key === "ArrowDown" &&
                    document.activeElement === this.searchInput) {
                    this.focusFirstItem();
                }
                else {
                    this.navigateItems(e.key === "ArrowDown");
                }
            }
            else if (e.key === "Enter" &&
                document.activeElement === this.searchInput) {
                // Handle enter on search input - maybe select first visible item?
                // Or do nothing, requiring explicit selection. Let's stick to explicit for now.
                this.selectFirstVisibleItem();
            }
            // Enter key on list items is handled by createListItem's keydown listener
            else if (e.key === "Backspace" &&
                this.searchInput.value === "" &&
                this.currentCategory) {
                // Go back if backspace is pressed in empty search within a category
                const backButton = this.listContainer.querySelector(".filter-dropdown-back");
                backButton === null || backButton === void 0 ? void 0 : backButton.click(); // Simulate click on back button
            }
        });
        // Click handling on preview items moved to filterCategoryList where they are created
    }
    // Handles filtering the main category list
    filterCategoryList(searchTerm) {
        this.listContainer.empty(); // Use empty()
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filteredOptions = this.options.filter((category) => category.label.toLowerCase().includes(lowerSearchTerm) ||
            category.options.some((option) => option.toLowerCase().includes(lowerSearchTerm)));
        if (filteredOptions.length === 0) {
            this.listContainer.createEl("div", {
                cls: "filter-dropdown-empty",
                text: t("No matching filters found"),
            });
        }
        else {
            filteredOptions.forEach((category) => {
                const matchingValues = category.options.filter((option) => option.toLowerCase().includes(lowerSearchTerm));
                const itemContainer = this.listContainer.createEl("div", {
                    cls: "filter-dropdown-item-container",
                }); // Wrapper for styling/focus
                if (matchingValues.length > 0 && searchTerm) {
                    // Show category label and matching values directly
                    itemContainer.createEl("div", {
                        cls: "filter-dropdown-category-header",
                        text: category.label,
                    });
                    matchingValues.forEach((value) => {
                        const valuePreview = itemContainer.createEl("div", {
                            cls: "filter-dropdown-value-preview",
                            text: value,
                            attr: {
                                tabindex: 0,
                                "data-category": category.id,
                                "data-value": value,
                            },
                        });
                        // Handle click directly on the preview item
                        this.registerDomEvent(valuePreview, "click", (e) => {
                            e.stopPropagation(); // Prevent potential outer clicks
                            this.onSelect(category.id, value);
                        });
                        // Handle Enter key press for accessibility
                        this.registerDomEvent(valuePreview, "keydown", (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                this.onSelect(category.id, value);
                            }
                        });
                    });
                }
                else {
                    // Show regular category item (clickable to show values)
                    const categoryItem = this.createListItem(category.label, () => this.showCategoryValues(category), true // has arrow
                    );
                    itemContainer.appendChild(categoryItem);
                }
            });
        }
        this.positionDropdown(); // Reposition after filtering
    }
    getVisibleFocusableItems() {
        return Array.from(this.listContainer.querySelectorAll(`.filter-dropdown-item, .filter-dropdown-value-preview`)).filter((el) => el.offsetParent !== null &&
            window.getComputedStyle(el).visibility !== "hidden" &&
            window.getComputedStyle(el).display !== "none");
    }
    focusFirstItem() {
        var _a;
        const items = this.getVisibleFocusableItems();
        (_a = items[0]) === null || _a === void 0 ? void 0 : _a.focus();
    }
    selectFirstVisibleItem() {
        var _a;
        const items = this.getVisibleFocusableItems();
        (_a = items[0]) === null || _a === void 0 ? void 0 : _a.click(); // Simulate click on the first item
    }
    // Handles Arrow Up/Down navigation
    navigateItems(down) {
        var _a;
        const items = this.getVisibleFocusableItems();
        if (items.length === 0)
            return;
        const currentFocus = document.activeElement;
        let currentIndex = -1;
        // Check if the currently focused element is one of our items
        if (currentFocus && items.includes(currentFocus)) {
            currentIndex = items.findIndex((item) => item === currentFocus);
        }
        else if (currentFocus === this.searchInput) {
            // If focus is on search, ArrowDown goes to first item, ArrowUp goes to last
            currentIndex = down ? -1 : items.length; // Acts as index before first or after last
        }
        let nextIndex;
        if (down) {
            nextIndex = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
        }
        else {
            // Up
            nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
        }
        // Check if nextIndex is valid before focusing
        if (nextIndex >= 0 && nextIndex < items.length) {
            (_a = items[nextIndex]) === null || _a === void 0 ? void 0 : _a.focus();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyLWRyb3Bkb3duLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZmlsdGVyLWRyb3Bkb3duLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUd4RCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUMsTUFBTSxPQUFPLGNBQWUsU0FBUSxTQUFTO0lBVTVDLFlBQ0MsT0FBOEIsRUFDdEIsTUFBNkI7UUFFckMsS0FBSyxFQUFFLENBQUM7UUFGQSxXQUFNLEdBQU4sTUFBTSxDQUF1QjtRQU45QixvQkFBZSxHQUEwQixJQUFJLENBQUM7UUFTckQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUMzQyxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsc0NBQXNDO0lBQ3ZFLENBQUM7SUFFUSxNQUFNO1FBQ2QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUM1QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUM1Qyx5QkFBeUIsQ0FDTCxDQUFDO1FBQ3RCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQzlDLHVCQUF1QixDQUNSLENBQUM7UUFFakIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFFMUIsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFFM0IsaUJBQWlCO1FBQ2pCLFFBQVEsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENB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dCwgZGVib3VuY2UsIHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgRmlsdGVyQ2F0ZWdvcnksIEZpbHRlckRyb3Bkb3duT3B0aW9ucyB9IGZyb20gXCIuL2ZpbHRlci10eXBlXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBGaWx0ZXJEcm9wZG93biBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBvcHRpb25zOiBGaWx0ZXJDYXRlZ29yeVtdO1xyXG5cdHByaXZhdGUgYW5jaG9yRWxlbWVudDogSFRNTEVsZW1lbnQ7XHJcblx0cHVibGljIGVsZW1lbnQ6IEhUTUxFbGVtZW50OyAvLyBEcm9wZG93biBlbGVtZW50LCBwdWJsaWMgZm9yIHBvc2l0aW9uaW5nIGNoZWNrcyBpZiBuZWVkZWQgZWxzZXdoZXJlXHJcblx0cHJpdmF0ZSBzZWFyY2hJbnB1dDogSFRNTElucHV0RWxlbWVudDtcclxuXHRwcml2YXRlIGxpc3RDb250YWluZXI6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY3VycmVudENhdGVnb3J5OiBGaWx0ZXJDYXRlZ29yeSB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgb25TZWxlY3Q6IChjYXRlZ29yeTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgb25DbG9zZTogKCkgPT4gdm9pZDsgLy8gS2VlcCBvbkNsb3NlIGZvciBleHBsaWNpdCBjbG9zZSByZXF1ZXN0c1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdG9wdGlvbnM6IEZpbHRlckRyb3Bkb3duT3B0aW9ucyxcclxuXHRcdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zLm9wdGlvbnM7XHJcblx0XHR0aGlzLmFuY2hvckVsZW1lbnQgPSBvcHRpb25zLmFuY2hvckVsZW1lbnQ7XHJcblx0XHR0aGlzLm9uU2VsZWN0ID0gb3B0aW9ucy5vblNlbGVjdDtcclxuXHRcdHRoaXMub25DbG9zZSA9IG9wdGlvbnMub25DbG9zZTsgLy8gUGFyZW50IGNhbGxzIHRoaXMgdG8gdHJpZ2dlciB1bmxvYWRcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9ubG9hZCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuZWxlbWVudCA9IHRoaXMuY3JlYXRlRHJvcGRvd25FbGVtZW50KCk7XHJcblx0XHR0aGlzLnNlYXJjaElucHV0ID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLmZpbHRlci1kcm9wZG93bi1zZWFyY2hcIlxyXG5cdFx0KSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG5cdFx0dGhpcy5saXN0Q29udGFpbmVyID0gdGhpcy5lbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFwiLmZpbHRlci1kcm9wZG93bi1saXN0XCJcclxuXHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblxyXG5cdFx0dGhpcy5yZW5kZXJDYXRlZ29yeUxpc3QoKTtcclxuXHJcblx0XHR0aGlzLnNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcclxuXHJcblx0XHQvLyBBcHBlbmQgdG8gYm9keVxyXG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0aGlzLmVsZW1lbnQpO1xyXG5cclxuXHRcdC8vIEFkZCBhbmltYXRpb24gY2xhc3MgYWZ0ZXIgYSBzaG9ydCBkZWxheVxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMuZWxlbWVudC5jbGFzc0xpc3QuYWRkKFwiZmlsdGVyLWRyb3Bkb3duLXZpc2libGVcIik7XHJcblx0XHRcdHRoaXMucG9zaXRpb25Ecm9wZG93bigpO1xyXG5cdFx0fSwgMTApO1xyXG5cclxuXHRcdC8vIEZvY3VzIHNlYXJjaCBhZnRlciBhIHNob3J0IGRlbGF5XHJcblx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0dGhpcy5zZWFyY2hJbnB1dC5mb2N1cygpO1xyXG5cdFx0fSwgNTApO1xyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb251bmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBSZW1vdmUgdGhlIGRyb3Bkb3duIHdpdGggYW5pbWF0aW9uXHJcblx0XHR0aGlzLmVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShcImZpbHRlci1kcm9wZG93bi12aXNpYmxlXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBlbGVtZW50IGFmdGVyIGFuaW1hdGlvbiBjb21wbGV0ZXNcclxuXHRcdC8vIFVzZSBhIHRpbWVyIG1hdGNoaW5nIHRoZSBhbmltYXRpb24gZHVyYXRpb25cclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmVsZW1lbnQucmVtb3ZlKCk7XHJcblx0XHR9LCAxNTApOyAvLyBNYXRjaCBDU1MgYW5pbWF0aW9uIGR1cmF0aW9uXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGNyZWF0ZURyb3Bkb3duRWxlbWVudCgpOiBIVE1MRWxlbWVudCB7XHJcblx0XHRjb25zdCBkcm9wZG93biA9IGNyZWF0ZUVsKFwiZGl2XCIsIHsgY2xzOiBcImZpbHRlci1kcm9wZG93blwiIH0pO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlciA9IGRyb3Bkb3duLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1kcm9wZG93bi1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cdFx0aGVhZGVyLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1kcm9wZG93bi1zZWFyY2hcIixcclxuXHRcdFx0YXR0cjogeyBwbGFjZWhvbGRlcjogXCJGaWx0ZXIuLi5cIiB9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0ZHJvcGRvd24uY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLWxpc3RcIiB9KTtcclxuXHJcblx0XHRyZXR1cm4gZHJvcGRvd247XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHBvc2l0aW9uRHJvcGRvd24oKTogdm9pZCB7XHJcblx0XHRjb25zdCByZWN0ID0gdGhpcy5hbmNob3JFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0Y29uc3QgeyBpbm5lckhlaWdodCwgaW5uZXJXaWR0aCB9ID0gd2luZG93O1xyXG5cclxuXHRcdC8vIFJlY2FsY3VsYXRlIGRyb3Bkb3duIGRpbWVuc2lvbnMgKmFmdGVyKiBwb3RlbnRpYWwgY29udGVudCBjaGFuZ2VzXHJcblx0XHR0aGlzLmVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7IC8vIFRlbXBvcmFyaWx5IGhpZGUgdG8gbWVhc3VyZVxyXG5cdFx0dGhpcy5lbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIjsgLy8gRW5zdXJlIGl0J3MgbGFpZCBvdXRcclxuXHRcdGNvbnN0IGRyb3Bkb3duSGVpZ2h0ID0gdGhpcy5lbGVtZW50Lm9mZnNldEhlaWdodDtcclxuXHRcdGNvbnN0IGRyb3Bkb3duV2lkdGggPSB0aGlzLmVsZW1lbnQub2Zmc2V0V2lkdGg7XHJcblx0XHR0aGlzLmVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwiXCI7IC8vIFJlc2V0IGRpc3BsYXlcclxuXHRcdHRoaXMuZWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gXCJcIjsgLy8gTWFrZSB2aXNpYmxlIGFnYWluXHJcblxyXG5cdFx0Ly8gRGVmYXVsdCBwb3NpdGlvbiBiZWxvdyB0aGUgYW5jaG9yXHJcblx0XHRsZXQgdG9wID0gcmVjdC5ib3R0b20gKyA4O1xyXG5cdFx0bGV0IGxlZnQgPSByZWN0LmxlZnQ7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZHJvcGRvd24gZ29lcyBvZmYgYm90dG9tIGVkZ2VcclxuXHRcdGlmICh0b3AgKyBkcm9wZG93bkhlaWdodCA+IGlubmVySGVpZ2h0IC0gMTYpIHtcclxuXHRcdFx0dG9wID0gcmVjdC50b3AgLSBkcm9wZG93bkhlaWdodCAtIDg7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZHJvcGRvd24gZ29lcyBvZmYgdG9wIGVkZ2UgKGVuc3VyZSBpdCdzIG5vdCBuZWdhdGl2ZSlcclxuXHRcdGlmICh0b3AgPCAxNikge1xyXG5cdFx0XHR0b3AgPSAxNjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiBkcm9wZG93biBnb2VzIG9mZiByaWdodCBlZGdlXHJcblx0XHRpZiAobGVmdCArIGRyb3Bkb3duV2lkdGggPiBpbm5lcldpZHRoIC0gMTYpIHtcclxuXHRcdFx0bGVmdCA9IGlubmVyV2lkdGggLSBkcm9wZG93bldpZHRoIC0gMTY7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZHJvcGRvd24gZ29lcyBvZmYgbGVmdCBlZGdlXHJcblx0XHRpZiAobGVmdCA8IDE2KSB7XHJcblx0XHRcdGxlZnQgPSAxNjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmVsZW1lbnQuc3R5bGUudG9wID0gYCR7dG9wfXB4YDtcclxuXHRcdHRoaXMuZWxlbWVudC5zdHlsZS5sZWZ0ID0gYCR7bGVmdH1weGA7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlbmRlckNhdGVnb3J5TGlzdCgpOiB2b2lkIHtcclxuXHRcdHRoaXMubGlzdENvbnRhaW5lci5lbXB0eSgpOyAvLyBVc2UgZW1wdHkoKSBpbnN0ZWFkIG9mIGlubmVySFRNTCA9IFwiXCJcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXQucGxhY2Vob2xkZXIgPSBcIkZpbHRlciBjYXRlZ29yaWVzLi4uXCI7XHJcblx0XHR0aGlzLnNlYXJjaElucHV0LnZhbHVlID0gXCJcIjsgLy8gRW5zdXJlIHNlYXJjaCBpcyBjbGVhcmVkIHdoZW4gc2hvd2luZyBjYXRlZ29yaWVzXHJcblxyXG5cdFx0dGhpcy5vcHRpb25zLmZvckVhY2goKGNhdGVnb3J5KSA9PiB7XHJcblx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLmNyZWF0ZUxpc3RJdGVtKFxyXG5cdFx0XHRcdGNhdGVnb3J5LmxhYmVsLFxyXG5cdFx0XHRcdCgpID0+IHRoaXMuc2hvd0NhdGVnb3J5VmFsdWVzKGNhdGVnb3J5KSxcclxuXHRcdFx0XHR0cnVlLCAvLyBoYXMgYXJyb3dcclxuXHRcdFx0XHRmYWxzZSwgLy8gbm90IGJhY2sgYnV0dG9uXHJcblx0XHRcdFx0ZmFsc2UsIC8vIG5vdCB2YWx1ZSBpdGVtXHJcblx0XHRcdFx0Y2F0ZWdvcnkuaWRcclxuXHRcdFx0KTtcclxuXHRcdFx0dGhpcy5saXN0Q29udGFpbmVyLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnBvc2l0aW9uRHJvcGRvd24oKTsgLy8gUmVwb3NpdGlvbiBhZnRlciByZW5kZXJpbmdcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgc2hvd0NhdGVnb3J5VmFsdWVzKGNhdGVnb3J5OiBGaWx0ZXJDYXRlZ29yeSk6IHZvaWQge1xyXG5cdFx0dGhpcy5jdXJyZW50Q2F0ZWdvcnkgPSBjYXRlZ29yeTtcclxuXHRcdHRoaXMuc2VhcmNoSW5wdXQudmFsdWUgPSBcIlwiOyAvLyBDbGVhciBzZWFyY2ggb24gY2F0ZWdvcnkgY2hhbmdlXHJcblx0XHR0aGlzLnNlYXJjaElucHV0LnBsYWNlaG9sZGVyID0gYEZpbHRlciAke2NhdGVnb3J5LmxhYmVsLnRvTG93ZXJDYXNlKCl9Li4uYDtcclxuXHJcblx0XHR0aGlzLmxpc3RDb250YWluZXIuZW1wdHkoKTsgLy8gVXNlIGVtcHR5KCkgaW5zdGVhZCBvZiBpbm5lckhUTUwgPSBcIlwiXHJcblxyXG5cdFx0Ly8gQWRkIGJhY2sgYnV0dG9uXHJcblx0XHRjb25zdCBiYWNrQnV0dG9uID0gdGhpcy5jcmVhdGVMaXN0SXRlbShcclxuXHRcdFx0dChcIkJhY2sgdG8gY2F0ZWdvcmllc1wiKSxcclxuXHRcdFx0KCkgPT4ge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudENhdGVnb3J5ID0gbnVsbDtcclxuXHRcdFx0XHR0aGlzLnJlbmRlckNhdGVnb3J5TGlzdCgpO1xyXG5cdFx0XHR9LFxyXG5cdFx0XHRmYWxzZSwgLy8gbm8gYXJyb3dcclxuXHRcdFx0dHJ1ZSAvLyBpcyBiYWNrIGJ1dHRvblxyXG5cdFx0KTtcclxuXHRcdHRoaXMubGlzdENvbnRhaW5lci5hcHBlbmRDaGlsZChiYWNrQnV0dG9uKTtcclxuXHJcblx0XHQvLyBBZGQgc2VwYXJhdG9yXHJcblx0XHR0aGlzLmxpc3RDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLXNlcGFyYXRvclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gUmVuZGVyIHZhbHVlcyBmb3IgdGhlIHNlbGVjdGVkIGNhdGVnb3J5XHJcblx0XHR0aGlzLnJlbmRlckZpbHRlclZhbHVlcyhjYXRlZ29yeS5vcHRpb25zKTtcclxuXHRcdHRoaXMucG9zaXRpb25Ecm9wZG93bigpOyAvLyBSZXBvc2l0aW9uIGFmdGVyIHJlbmRlcmluZ1xyXG5cclxuXHRcdHRoaXMuc2VhcmNoSW5wdXQuZm9jdXMoKTsgLy8gS2VlcCBmb2N1cyBvbiBzZWFyY2hcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVuZGVyRmlsdGVyVmFsdWVzKFxyXG5cdFx0dmFsdWVzOiBzdHJpbmdbXSxcclxuXHRcdHNlYXJjaFRlcm06IHN0cmluZyA9IFwiXCJcclxuXHQpOiB2b2lkIHtcclxuXHRcdC8vIFJlbW92ZSBleGlzdGluZyB2YWx1ZSBpdGVtcyBhbmQgZW1wdHkgc3RhdGUsIGtlZXBpbmcgYmFjayBidXR0b24gYW5kIHNlcGFyYXRvclxyXG5cdFx0Y29uc3QgaXRlbXNUb1JlbW92ZSA9IHRoaXMubGlzdENvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFxyXG5cdFx0XHRcIi5maWx0ZXItZHJvcGRvd24tdmFsdWUtaXRlbSwgLmZpbHRlci1kcm9wZG93bi1lbXB0eVwiXHJcblx0XHQpO1xyXG5cdFx0aXRlbXNUb1JlbW92ZS5mb3JFYWNoKChpdGVtKSA9PiBpdGVtLnJlbW92ZSgpKTtcclxuXHJcblx0XHRjb25zdCBmaWx0ZXJlZFZhbHVlcyA9IHNlYXJjaFRlcm1cclxuXHRcdFx0PyB2YWx1ZXMuZmlsdGVyKCh2YWx1ZSkgPT5cclxuXHRcdFx0XHRcdHZhbHVlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VhcmNoVGVybS50b0xvd2VyQ2FzZSgpKVxyXG5cdFx0XHQgIClcclxuXHRcdFx0OiB2YWx1ZXM7XHJcblxyXG5cdFx0aWYgKGZpbHRlcmVkVmFsdWVzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmxpc3RDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItZHJvcGRvd24tZW1wdHlcIixcclxuXHRcdFx0XHR0ZXh0OiB0KFwiTm8gbWF0Y2hpbmcgb3B0aW9ucyBmb3VuZFwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRmaWx0ZXJlZFZhbHVlcy5mb3JFYWNoKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGl0ZW0gPSB0aGlzLmNyZWF0ZUxpc3RJdGVtKFxyXG5cdFx0XHRcdFx0dmFsdWUsXHJcblx0XHRcdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmICh0aGlzLmN1cnJlbnRDYXRlZ29yeSkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMub25TZWxlY3QodGhpcy5jdXJyZW50Q2F0ZWdvcnkuaWQsIHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0XHQvLyBvbkNsb3NlIHdpbGwgYmUgY2FsbGVkIGJ5IHRoZSBwYXJlbnQgdG8gdW5sb2FkIHRoaXMgY29tcG9uZW50XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRmYWxzZSwgLy8gbm8gYXJyb3dcclxuXHRcdFx0XHRcdGZhbHNlLCAvLyBub3QgYmFjayBidXR0b25cclxuXHRcdFx0XHRcdHRydWUgLy8gaXMgdmFsdWUgaXRlbVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0dGhpcy5saXN0Q29udGFpbmVyLmFwcGVuZENoaWxkKGl0ZW0pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHRoaXMucG9zaXRpb25Ecm9wZG93bigpOyAvLyBSZXBvc2l0aW9uIGFmdGVyIHBvdGVudGlhbGx5IGNoYW5naW5nIGxpc3QgaGVpZ2h0XHJcblx0fVxyXG5cclxuXHQvLyBIZWxwZXIgdG8gY3JlYXRlIGxpc3QgaXRlbXMgY29uc2lzdGVudGx5XHJcblx0cHJpdmF0ZSBjcmVhdGVMaXN0SXRlbShcclxuXHRcdGxhYmVsOiBzdHJpbmcsXHJcblx0XHRvbkNsaWNrOiAoKSA9PiB2b2lkLFxyXG5cdFx0aGFzQXJyb3c6IGJvb2xlYW4gPSBmYWxzZSxcclxuXHRcdGlzQmFja0J1dHRvbjogYm9vbGVhbiA9IGZhbHNlLFxyXG5cdFx0aXNWYWx1ZUl0ZW06IGJvb2xlYW4gPSBmYWxzZSxcclxuXHRcdGNhdGVnb3J5SWQ6IHN0cmluZyA9IFwiXCJcclxuXHQpOiBIVE1MRWxlbWVudCB7XHJcblx0XHRjb25zdCBpdGVtID0gY3JlYXRlRWwoXCJkaXZcIiwgeyBjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLWl0ZW1cIiB9KTtcclxuXHRcdGlmIChpc0JhY2tCdXR0b24pIGl0ZW0uY2xhc3NMaXN0LmFkZChcImZpbHRlci1kcm9wZG93bi1iYWNrXCIpO1xyXG5cdFx0aWYgKGlzVmFsdWVJdGVtKSBpdGVtLmNsYXNzTGlzdC5hZGQoXCJmaWx0ZXItZHJvcGRvd24tdmFsdWUtaXRlbVwiKTtcclxuXHJcblx0XHRpdGVtLnNldEF0dHIoXCJ0YWJpbmRleFwiLCAwKTsgLy8gTWFrZSBpdGVtcyBmb2N1c2FibGVcclxuXHJcblx0XHRpZiAoaXNCYWNrQnV0dG9uKSB7XHJcblx0XHRcdGNvbnN0IGJhY2tBcnJvdyA9IGl0ZW0uY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLWl0ZW0tYXJyb3cgYmFja1wiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbihiYWNrQXJyb3csIFwiY2hldnJvbi1sZWZ0XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGl0ZW0uY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1kcm9wZG93bi1pdGVtLWxhYmVsXCIsXHJcblx0XHRcdHRleHQ6IGxhYmVsLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKGhhc0Fycm93KSB7XHJcblx0XHRcdGNvbnN0IGZvcndhcmRBcnJvdyA9IGl0ZW0uY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLWl0ZW0tYXJyb3dcIixcclxuXHRcdFx0fSk7XHJcblx0XHRcdHNldEljb24oZm9yd2FyZEFycm93LCBcImNoZXZyb24tcmlnaHRcIik7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGl0ZW0sIFwiY2xpY2tcIiwgb25DbGljayk7XHJcblx0XHQvLyBIYW5kbGUgRW50ZXIga2V5IHByZXNzIGZvciBhY2Nlc3NpYmlsaXR5XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoaXRlbSwgXCJrZXlkb3duXCIsIChlOiBLZXlib2FyZEV2ZW50KSA9PiB7XHJcblx0XHRcdGlmIChlLmtleSA9PT0gXCJFbnRlclwiKSB7XHJcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdG9uQ2xpY2soKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0cmV0dXJuIGl0ZW07XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTogdm9pZCB7XHJcblx0XHQvLyBEZWJvdW5jZWQgc2VhcmNoIGlucHV0IGhhbmRsZXJcclxuXHRcdGNvbnN0IGRlYm91bmNlZFNlYXJjaCA9IGRlYm91bmNlKFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3Qgc2VhcmNoVGVybSA9IHRoaXMuc2VhcmNoSW5wdXQudmFsdWUudHJpbSgpO1xyXG5cdFx0XHRcdGlmICh0aGlzLmN1cnJlbnRDYXRlZ29yeSkge1xyXG5cdFx0XHRcdFx0dGhpcy5yZW5kZXJGaWx0ZXJWYWx1ZXMoXHJcblx0XHRcdFx0XHRcdHRoaXMuY3VycmVudENhdGVnb3J5Lm9wdGlvbnMsXHJcblx0XHRcdFx0XHRcdHNlYXJjaFRlcm1cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMuZmlsdGVyQ2F0ZWdvcnlMaXN0KHNlYXJjaFRlcm0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0MTUwLFxyXG5cdFx0XHRmYWxzZSAvLyBDaGFuZ2VkIHRvIGZhbHNlOiBkZWJvdW5jZSB0cmlnZ2VycyBhZnRlciB1c2VyIHN0b3BzIHR5cGluZ1xyXG5cdFx0KTtcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5zZWFyY2hJbnB1dCwgXCJpbnB1dFwiLCBkZWJvdW5jZWRTZWFyY2gpO1xyXG5cclxuXHRcdC8vIENsb3NlIGRyb3Bkb3duIHdoZW4gY2xpY2tpbmcgb3V0c2lkZSBvZiBpdFxyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGRvY3VtZW50LCBcImNsaWNrXCIsIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdGlmICghZS5jb21wb3NlZFBhdGgoKS5pbmNsdWRlcyh0aGlzLmVsZW1lbnQpKSB7XHJcblx0XHRcdFx0dGhpcy5vbkNsb3NlKCk7IC8vIFJlcXVlc3QgcGFyZW50IHRvIGNsb3NlXHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIEhhbmRsZSBrZXlib2FyZCBuYXZpZ2F0aW9uIGFuZCBhY3Rpb25zXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy5lbGVtZW50LCBcImtleWRvd25cIiwgKGU6IEtleWJvYXJkRXZlbnQpID0+IHtcclxuXHRcdFx0aWYgKGUua2V5ID09PSBcIkVzY2FwZVwiKSB7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHR0aGlzLm9uQ2xvc2UoKTsgLy8gUmVxdWVzdCBwYXJlbnQgdG8gY2xvc2VcclxuXHRcdFx0fSBlbHNlIGlmIChlLmtleSA9PT0gXCJBcnJvd0Rvd25cIiB8fCBlLmtleSA9PT0gXCJBcnJvd1VwXCIpIHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0Ly8gSWYgZm9jdXMgaXMgb24gc2VhcmNoIGlucHV0IGFuZCB1c2VyIHByZXNzZXMgZG93biwgZm9jdXMgZmlyc3QgaXRlbVxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdGUua2V5ID09PSBcIkFycm93RG93blwiICYmXHJcblx0XHRcdFx0XHRkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGlzLnNlYXJjaElucHV0XHJcblx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHR0aGlzLmZvY3VzRmlyc3RJdGVtKCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHRoaXMubmF2aWdhdGVJdGVtcyhlLmtleSA9PT0gXCJBcnJvd0Rvd25cIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdGUua2V5ID09PSBcIkVudGVyXCIgJiZcclxuXHRcdFx0XHRkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSB0aGlzLnNlYXJjaElucHV0XHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIEhhbmRsZSBlbnRlciBvbiBzZWFyY2ggaW5wdXQgLSBtYXliZSBzZWxlY3QgZmlyc3QgdmlzaWJsZSBpdGVtP1xyXG5cdFx0XHRcdC8vIE9yIGRvIG5vdGhpbmcsIHJlcXVpcmluZyBleHBsaWNpdCBzZWxlY3Rpb24uIExldCdzIHN0aWNrIHRvIGV4cGxpY2l0IGZvciBub3cuXHJcblx0XHRcdFx0dGhpcy5zZWxlY3RGaXJzdFZpc2libGVJdGVtKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gRW50ZXIga2V5IG9uIGxpc3QgaXRlbXMgaXMgaGFuZGxlZCBieSBjcmVhdGVMaXN0SXRlbSdzIGtleWRvd24gbGlzdGVuZXJcclxuXHRcdFx0ZWxzZSBpZiAoXHJcblx0XHRcdFx0ZS5rZXkgPT09IFwiQmFja3NwYWNlXCIgJiZcclxuXHRcdFx0XHR0aGlzLnNlYXJjaElucHV0LnZhbHVlID09PSBcIlwiICYmXHJcblx0XHRcdFx0dGhpcy5jdXJyZW50Q2F0ZWdvcnlcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gR28gYmFjayBpZiBiYWNrc3BhY2UgaXMgcHJlc3NlZCBpbiBlbXB0eSBzZWFyY2ggd2l0aGluIGEgY2F0ZWdvcnlcclxuXHRcdFx0XHRjb25zdCBiYWNrQnV0dG9uID1cclxuXHRcdFx0XHRcdHRoaXMubGlzdENvbnRhaW5lci5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcclxuXHRcdFx0XHRcdFx0XCIuZmlsdGVyLWRyb3Bkb3duLWJhY2tcIlxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRiYWNrQnV0dG9uPy5jbGljaygpOyAvLyBTaW11bGF0ZSBjbGljayBvbiBiYWNrIGJ1dHRvblxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDbGljayBoYW5kbGluZyBvbiBwcmV2aWV3IGl0ZW1zIG1vdmVkIHRvIGZpbHRlckNhdGVnb3J5TGlzdCB3aGVyZSB0aGV5IGFyZSBjcmVhdGVkXHJcblx0fVxyXG5cclxuXHQvLyBIYW5kbGVzIGZpbHRlcmluZyB0aGUgbWFpbiBjYXRlZ29yeSBsaXN0XHJcblx0cHJpdmF0ZSBmaWx0ZXJDYXRlZ29yeUxpc3Qoc2VhcmNoVGVybTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHR0aGlzLmxpc3RDb250YWluZXIuZW1wdHkoKTsgLy8gVXNlIGVtcHR5KClcclxuXHJcblx0XHRjb25zdCBsb3dlclNlYXJjaFRlcm0gPSBzZWFyY2hUZXJtLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRjb25zdCBmaWx0ZXJlZE9wdGlvbnMgPSB0aGlzLm9wdGlvbnMuZmlsdGVyKFxyXG5cdFx0XHQoY2F0ZWdvcnkpID0+XHJcblx0XHRcdFx0Y2F0ZWdvcnkubGFiZWwudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclNlYXJjaFRlcm0pIHx8XHJcblx0XHRcdFx0Y2F0ZWdvcnkub3B0aW9ucy5zb21lKChvcHRpb24pID0+XHJcblx0XHRcdFx0XHRvcHRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclNlYXJjaFRlcm0pXHJcblx0XHRcdFx0KVxyXG5cdFx0KTtcclxuXHJcblx0XHRpZiAoZmlsdGVyZWRPcHRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHR0aGlzLmxpc3RDb250YWluZXIuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItZHJvcGRvd24tZW1wdHlcIixcclxuXHRcdFx0XHR0ZXh0OiB0KFwiTm8gbWF0Y2hpbmcgZmlsdGVycyBmb3VuZFwiKSxcclxuXHRcdFx0fSk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRmaWx0ZXJlZE9wdGlvbnMuZm9yRWFjaCgoY2F0ZWdvcnkpID0+IHtcclxuXHRcdFx0XHRjb25zdCBtYXRjaGluZ1ZhbHVlcyA9IGNhdGVnb3J5Lm9wdGlvbnMuZmlsdGVyKChvcHRpb24pID0+XHJcblx0XHRcdFx0XHRvcHRpb24udG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlclNlYXJjaFRlcm0pXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgaXRlbUNvbnRhaW5lciA9IHRoaXMubGlzdENvbnRhaW5lci5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLWl0ZW0tY29udGFpbmVyXCIsXHJcblx0XHRcdFx0fSk7IC8vIFdyYXBwZXIgZm9yIHN0eWxpbmcvZm9jdXNcclxuXHJcblx0XHRcdFx0aWYgKG1hdGNoaW5nVmFsdWVzLmxlbmd0aCA+IDAgJiYgc2VhcmNoVGVybSkge1xyXG5cdFx0XHRcdFx0Ly8gU2hvdyBjYXRlZ29yeSBsYWJlbCBhbmQgbWF0Y2hpbmcgdmFsdWVzIGRpcmVjdGx5XHJcblx0XHRcdFx0XHRpdGVtQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBcImZpbHRlci1kcm9wZG93bi1jYXRlZ29yeS1oZWFkZXJcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogY2F0ZWdvcnkubGFiZWwsXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRtYXRjaGluZ1ZhbHVlcy5mb3JFYWNoKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCB2YWx1ZVByZXZpZXcgPSBpdGVtQ29udGFpbmVyLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRcdFx0XHRjbHM6IFwiZmlsdGVyLWRyb3Bkb3duLXZhbHVlLXByZXZpZXdcIixcclxuXHRcdFx0XHRcdFx0XHR0ZXh0OiB2YWx1ZSxcclxuXHRcdFx0XHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0YWJpbmRleDogMCwgLy8gTWFrZSBmb2N1c2FibGVcclxuXHRcdFx0XHRcdFx0XHRcdFwiZGF0YS1jYXRlZ29yeVwiOiBjYXRlZ29yeS5pZCxcclxuXHRcdFx0XHRcdFx0XHRcdFwiZGF0YS12YWx1ZVwiOiB2YWx1ZSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGNsaWNrIGRpcmVjdGx5IG9uIHRoZSBwcmV2aWV3IGl0ZW1cclxuXHRcdFx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KHZhbHVlUHJldmlldywgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7IC8vIFByZXZlbnQgcG90ZW50aWFsIG91dGVyIGNsaWNrc1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMub25TZWxlY3QoY2F0ZWdvcnkuaWQsIHZhbHVlKTtcclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHRcdC8vIEhhbmRsZSBFbnRlciBrZXkgcHJlc3MgZm9yIGFjY2Vzc2liaWxpdHlcclxuXHRcdFx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHRcdFx0XHRcdHZhbHVlUHJldmlldyxcclxuXHRcdFx0XHRcdFx0XHRcImtleWRvd25cIixcclxuXHRcdFx0XHRcdFx0XHQoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGUua2V5ID09PSBcIkVudGVyXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLm9uU2VsZWN0KGNhdGVnb3J5LmlkLCB2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIFNob3cgcmVndWxhciBjYXRlZ29yeSBpdGVtIChjbGlja2FibGUgdG8gc2hvdyB2YWx1ZXMpXHJcblx0XHRcdFx0XHRjb25zdCBjYXRlZ29yeUl0ZW0gPSB0aGlzLmNyZWF0ZUxpc3RJdGVtKFxyXG5cdFx0XHRcdFx0XHRjYXRlZ29yeS5sYWJlbCxcclxuXHRcdFx0XHRcdFx0KCkgPT4gdGhpcy5zaG93Q2F0ZWdvcnlWYWx1ZXMoY2F0ZWdvcnkpLFxyXG5cdFx0XHRcdFx0XHR0cnVlIC8vIGhhcyBhcnJvd1xyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGl0ZW1Db250YWluZXIuYXBwZW5kQ2hpbGQoY2F0ZWdvcnlJdGVtKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5wb3NpdGlvbkRyb3Bkb3duKCk7IC8vIFJlcG9zaXRpb24gYWZ0ZXIgZmlsdGVyaW5nXHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldFZpc2libGVGb2N1c2FibGVJdGVtcygpOiBIVE1MRWxlbWVudFtdIHtcclxuXHRcdHJldHVybiBBcnJheS5mcm9tKFxyXG5cdFx0XHR0aGlzLmxpc3RDb250YWluZXIucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXHJcblx0XHRcdFx0YC5maWx0ZXItZHJvcGRvd24taXRlbSwgLmZpbHRlci1kcm9wZG93bi12YWx1ZS1wcmV2aWV3YFxyXG5cdFx0XHQpXHJcblx0XHQpLmZpbHRlcihcclxuXHRcdFx0KGVsKSA9PlxyXG5cdFx0XHRcdGVsLm9mZnNldFBhcmVudCAhPT0gbnVsbCAmJlxyXG5cdFx0XHRcdHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsKS52aXNpYmlsaXR5ICE9PSBcImhpZGRlblwiICYmXHJcblx0XHRcdFx0d2luZG93LmdldENvbXB1dGVkU3R5bGUoZWwpLmRpc3BsYXkgIT09IFwibm9uZVwiXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBmb2N1c0ZpcnN0SXRlbSgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IGl0ZW1zID0gdGhpcy5nZXRWaXNpYmxlRm9jdXNhYmxlSXRlbXMoKTtcclxuXHRcdGl0ZW1zWzBdPy5mb2N1cygpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBzZWxlY3RGaXJzdFZpc2libGVJdGVtKCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgaXRlbXMgPSB0aGlzLmdldFZpc2libGVGb2N1c2FibGVJdGVtcygpO1xyXG5cdFx0aXRlbXNbMF0/LmNsaWNrKCk7IC8vIFNpbXVsYXRlIGNsaWNrIG9uIHRoZSBmaXJzdCBpdGVtXHJcblx0fVxyXG5cclxuXHQvLyBIYW5kbGVzIEFycm93IFVwL0Rvd24gbmF2aWdhdGlvblxyXG5cdHByaXZhdGUgbmF2aWdhdGVJdGVtcyhkb3duOiBib29sZWFuKTogdm9pZCB7XHJcblx0XHRjb25zdCBpdGVtcyA9IHRoaXMuZ2V0VmlzaWJsZUZvY3VzYWJsZUl0ZW1zKCk7XHJcblx0XHRpZiAoaXRlbXMubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY3VycmVudEZvY3VzID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCBhcyBIVE1MRWxlbWVudDtcclxuXHRcdGxldCBjdXJyZW50SW5kZXggPSAtMTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0aGUgY3VycmVudGx5IGZvY3VzZWQgZWxlbWVudCBpcyBvbmUgb2Ygb3VyIGl0ZW1zXHJcblx0XHRpZiAoY3VycmVudEZvY3VzICYmIGl0ZW1zLmluY2x1ZGVzKGN1cnJlbnRGb2N1cykpIHtcclxuXHRcdFx0Y3VycmVudEluZGV4ID0gaXRlbXMuZmluZEluZGV4KChpdGVtKSA9PiBpdGVtID09PSBjdXJyZW50Rm9jdXMpO1xyXG5cdFx0fSBlbHNlIGlmIChjdXJyZW50Rm9jdXMgPT09IHRoaXMuc2VhcmNoSW5wdXQpIHtcclxuXHRcdFx0Ly8gSWYgZm9jdXMgaXMgb24gc2VhcmNoLCBBcnJvd0Rvd24gZ29lcyB0byBmaXJzdCBpdGVtLCBBcnJvd1VwIGdvZXMgdG8gbGFzdFxyXG5cdFx0XHRjdXJyZW50SW5kZXggPSBkb3duID8gLTEgOiBpdGVtcy5sZW5ndGg7IC8vIEFjdHMgYXMgaW5kZXggYmVmb3JlIGZpcnN0IG9yIGFmdGVyIGxhc3RcclxuXHRcdH1cclxuXHJcblx0XHRsZXQgbmV4dEluZGV4O1xyXG5cdFx0aWYgKGRvd24pIHtcclxuXHRcdFx0bmV4dEluZGV4ID0gY3VycmVudEluZGV4ID49IGl0ZW1zLmxlbmd0aCAtIDEgPyAwIDogY3VycmVudEluZGV4ICsgMTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFVwXHJcblx0XHRcdG5leHRJbmRleCA9IGN1cnJlbnRJbmRleCA8PSAwID8gaXRlbXMubGVuZ3RoIC0gMSA6IGN1cnJlbnRJbmRleCAtIDE7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgbmV4dEluZGV4IGlzIHZhbGlkIGJlZm9yZSBmb2N1c2luZ1xyXG5cdFx0aWYgKG5leHRJbmRleCA+PSAwICYmIG5leHRJbmRleCA8IGl0ZW1zLmxlbmd0aCkge1xyXG5cdFx0XHRpdGVtc1tuZXh0SW5kZXhdPy5mb2N1cygpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=