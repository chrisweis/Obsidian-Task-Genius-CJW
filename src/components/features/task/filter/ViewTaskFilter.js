import { Component, ExtraButtonComponent, setIcon, DropdownComponent, setTooltip, } from "obsidian";
import Sortable from "sortablejs";
import { t } from "@/translations/helper"; // Adjusted path assuming helper.ts is in src/translations
import "@/styles/global-filter.css";
import { FilterConfigModal } from "./FilterConfigModal";
export class TaskFilterComponent extends Component {
    constructor(hostEl, app, leafId, plugin) {
        super();
        this.leafId = leafId;
        this.hostEl = hostEl;
        this.app = app;
        this.plugin = plugin;
    }
    onload() {
        const savedState = this.leafId
            ? this.app.loadLocalStorage(`task-genius-view-filter-${this.leafId}`)
            : this.app.loadLocalStorage("task-genius-view-filter");
        console.log("savedState", savedState, this.leafId);
        if (savedState &&
            typeof savedState.rootCondition === "string" &&
            Array.isArray(savedState.filterGroups)) {
            // Basic validation passed
            this.rootFilterState = savedState;
        }
        else {
            if (savedState) {
                // If it exists but failed validation
                console.warn("Task Filter: Invalid data in local storage. Resetting to default state.");
            }
            // Initialize with default state
            this.rootFilterState = {
                rootCondition: "any",
                filterGroups: [],
            };
        }
        // Render first to initialize DOM elements
        this.render();
    }
    onunload() {
        var _a, _b;
        // Destroy sortable instances
        (_a = this.groupsSortable) === null || _a === void 0 ? void 0 : _a.destroy();
        (_b = this.filterGroupsContainerEl) === null || _b === void 0 ? void 0 : _b.querySelectorAll(".filters-list").forEach((listEl) => {
            if (listEl.sortableInstance) {
                listEl.sortableInstance.destroy();
            }
        });
        // Clear the host element
        this.hostEl.empty(); // Obsidian's way to clear innerHTML and managed children
    }
    close() {
        this.onunload();
    }
    generateId() {
        return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    render() {
        this.hostEl.empty();
        this.hostEl.addClass("task-filter-root-container");
        const mainPanel = this.hostEl.createDiv({
            cls: "task-filter-main-panel",
        });
        const rootFilterSetupSection = mainPanel.createDiv({
            attr: { id: "root-filter-setup-section" },
        });
        rootFilterSetupSection.addClass("root-filter-setup-section");
        // Root Condition Section
        const rootConditionSection = rootFilterSetupSection.createDiv({});
        rootConditionSection.addClass("root-condition-section");
        rootConditionSection.createEl("label", {
            text: t("Match"),
            attr: { for: "task-filter-root-condition" },
            cls: ["compact-text", "root-condition-label"],
        });
        const rootConditionDropdown = new DropdownComponent(rootConditionSection)
            .addOptions({
            any: t("Any"),
            all: t("All"),
            none: t("None"),
        })
            .setValue(this.rootFilterState.rootCondition)
            .onChange((value) => {
            this.rootFilterState.rootCondition = value;
            this.saveStateToLocalStorage();
            this.updateGroupSeparators();
        });
        rootConditionDropdown.selectEl.toggleClass("compact-select", true);
        rootConditionSection.createEl("span", {
            cls: ["compact-text", "root-condition-span"],
            text: t("filter group"),
        });
        // Filter Groups Container
        this.filterGroupsContainerEl = rootFilterSetupSection.createDiv({
            attr: { id: "task-filter-groups-container" },
            cls: "filter-groups-container",
        });
        // Add Filter Group Button Section
        const addGroupSection = rootFilterSetupSection.createDiv({
            cls: "add-group-section",
        });
        addGroupSection.createEl("div", {
            cls: ["add-filter-group-btn", "compact-btn"],
        }, (el) => {
            el.createEl("span", {
                cls: "add-filter-group-btn-icon",
            }, (iconEl) => {
                setIcon(iconEl, "plus");
            });
            el.createEl("span", {
                cls: "add-filter-group-btn-text",
                text: t("Add filter group"),
            });
            this.registerDomEvent(el, "click", () => {
                this.addFilterGroup();
            });
        });
        // Filter Configuration Buttons Section (only show if plugin is available)
        if (this.plugin) {
            const configSection = addGroupSection.createDiv({
                cls: "filter-config-section",
            });
            // Save Configuration Button
            configSection.createEl("div", {
                cls: ["save-filter-config-btn", "compact-btn"],
            }, (el) => {
                el.createEl("span", {
                    cls: "save-filter-config-btn-icon",
                }, (iconEl) => {
                    setIcon(iconEl, "save");
                    setTooltip(el, t("Save Current Filter"));
                });
                this.registerDomEvent(el, "click", () => {
                    this.openSaveConfigModal();
                });
            });
            // Load Configuration Button
            configSection.createEl("div", {
                cls: ["load-filter-config-btn", "compact-btn"],
            }, (el) => {
                el.createEl("span", {
                    cls: "load-filter-config-btn-icon",
                }, (iconEl) => {
                    setIcon(iconEl, "folder-open");
                    setTooltip(el, t("Load Saved Filter"));
                });
                this.registerDomEvent(el, "click", () => {
                    this.openLoadConfigModal();
                });
            });
        }
        // Re-populate filter groups from state
        this.rootFilterState.filterGroups.forEach((groupData) => {
            const groupElement = this.createFilterGroupElement(groupData);
            this.filterGroupsContainerEl.appendChild(groupElement);
        });
        this.updateGroupSeparators();
        this.makeSortableGroups();
    }
    // --- Filter Group Management ---
    createFilterGroupElement(groupData) {
        const newGroupEl = this.hostEl.createEl("div", {
            attr: { id: groupData.id },
            cls: ["filter-group"],
        });
        const groupHeader = newGroupEl.createDiv({
            cls: ["filter-group-header"],
        });
        const groupHeaderLeft = groupHeader.createDiv({
            cls: ["filter-group-header-left"],
        });
        // Drag Handle - kept as custom SVG for now
        groupHeaderLeft.createDiv({
            cls: "drag-handle-container",
        }, (el) => {
            el.createEl("span", {
                cls: "drag-handle",
            }, (iconEl) => {
                setIcon(iconEl, "grip-vertical");
            });
        });
        groupHeaderLeft.createEl("label", {
            cls: ["compact-text"],
            text: t("Match"),
        });
        const groupConditionSelect = new DropdownComponent(groupHeaderLeft)
            .addOptions({
            all: t("All"),
            any: t("Any"),
            none: t("None"),
        })
            .onChange((value) => {
            const selectedValue = value;
            groupData.groupCondition = selectedValue;
            this.saveStateToLocalStorage();
            this.updateFilterConjunctions(newGroupEl.querySelector(".filters-list"), selectedValue);
        })
            .setValue(groupData.groupCondition);
        groupConditionSelect.selectEl.toggleClass(["group-condition-select", "compact-select"], true);
        groupHeaderLeft.createEl("span", {
            cls: ["compact-text"],
            text: t("filter in this group"),
        });
        const groupHeaderRight = groupHeader.createDiv({
            cls: ["filter-group-header-right"],
        });
        const duplicateGroupBtn = new ExtraButtonComponent(groupHeaderRight)
            .setIcon("copy")
            .setTooltip(t("Duplicate filter group"))
            .onClick(() => {
            const newGroupId = this.generateId();
            const duplicatedFilters = groupData.filters.map((f) => (Object.assign(Object.assign({}, f), { id: this.generateId() })));
            const duplicatedGroupData = Object.assign(Object.assign({}, groupData), { id: newGroupId, filters: duplicatedFilters });
            this.addFilterGroup(duplicatedGroupData, newGroupEl);
        });
        duplicateGroupBtn.extraSettingsEl.addClasses([
            "duplicate-group-btn",
            "clickable-icon",
        ]);
        const removeGroupBtn = new ExtraButtonComponent(groupHeaderRight)
            .setIcon("trash-2")
            .setTooltip(t("Remove filter group"))
            .onClick(() => {
            const filtersListElForSortable = newGroupEl.querySelector(".filters-list");
            if (filtersListElForSortable &&
                filtersListElForSortable.sortableInstance) {
                filtersListElForSortable
                    .sortableInstance.destroy();
            }
            this.rootFilterState.filterGroups =
                this.rootFilterState.filterGroups.filter((g) => g.id !== groupData.id);
            this.saveStateToLocalStorage();
            newGroupEl.remove();
            const nextSibling = newGroupEl.nextElementSibling;
            if (nextSibling &&
                nextSibling.classList.contains("filter-group-separator-container")) {
                nextSibling.remove();
            }
            else {
                const prevSibling = newGroupEl.previousElementSibling;
                if (prevSibling &&
                    prevSibling.classList.contains("filter-group-separator-container")) {
                    prevSibling.remove();
                }
            }
            this.updateGroupSeparators();
        });
        removeGroupBtn.extraSettingsEl.addClasses([
            "remove-group-btn",
            "clickable-icon",
        ]);
        const filtersListEl = newGroupEl.createDiv({
            cls: ["filters-list"],
        });
        groupData.filters.forEach((filterData) => {
            const filterElement = this.createFilterItemElement(filterData, groupData);
            filtersListEl.appendChild(filterElement);
        });
        this.updateFilterConjunctions(filtersListEl, groupData.groupCondition);
        const groupFooter = newGroupEl.createDiv({
            cls: ["group-footer"],
        });
        groupFooter.createEl("div", {
            cls: ["add-filter-btn", "compact-btn"],
        }, (el) => {
            el.createEl("span", {
                cls: "add-filter-btn-icon",
            }, (iconEl) => {
                setIcon(iconEl, "plus");
            });
            el.createEl("span", {
                cls: "add-filter-btn-text",
                text: t("Add filter"),
            });
            this.registerDomEvent(el, "click", () => {
                this.addFilterToGroup(groupData, filtersListEl);
            });
        });
        return newGroupEl;
    }
    addFilterGroup(groupDataToClone = null, insertAfterElement = null) {
        // Ensure the container is initialized
        if (!this.filterGroupsContainerEl) {
            console.warn("TaskFilterComponent: filterGroupsContainerEl not initialized yet");
            return;
        }
        const newGroupId = groupDataToClone
            ? groupDataToClone.id
            : this.generateId();
        let newGroupData;
        if (groupDataToClone && insertAfterElement) {
            newGroupData = {
                id: newGroupId,
                groupCondition: groupDataToClone.groupCondition,
                filters: groupDataToClone.filters.map((f) => (Object.assign(Object.assign({}, f), { id: this.generateId() }))),
            };
        }
        else {
            newGroupData = {
                id: newGroupId,
                groupCondition: "all",
                filters: [],
            };
        }
        const groupIndex = insertAfterElement
            ? this.rootFilterState.filterGroups.findIndex((g) => g.id === insertAfterElement.id) + 1
            : this.rootFilterState.filterGroups.length;
        this.rootFilterState.filterGroups.splice(groupIndex, 0, newGroupData);
        this.saveStateToLocalStorage();
        const newGroupElement = this.createFilterGroupElement(newGroupData);
        if (insertAfterElement &&
            insertAfterElement.parentNode === this.filterGroupsContainerEl) {
            this.filterGroupsContainerEl.insertBefore(newGroupElement, insertAfterElement.nextSibling);
        }
        else {
            this.filterGroupsContainerEl.appendChild(newGroupElement);
        }
        if ((!groupDataToClone || groupDataToClone.filters.length === 0) &&
            !insertAfterElement) {
            this.addFilterToGroup(newGroupData, newGroupElement.querySelector(".filters-list"));
        }
        else if (groupDataToClone &&
            groupDataToClone.filters.length === 0 &&
            insertAfterElement) {
            this.addFilterToGroup(newGroupData, newGroupElement.querySelector(".filters-list"));
        }
        this.updateGroupSeparators();
        this.makeSortableGroups();
    }
    // --- Filter Item Management ---
    createFilterItemElement(filterData, groupData) {
        const newFilterEl = this.hostEl.createEl("div", {
            attr: { id: filterData.id },
            cls: ["filter-item"],
        });
        if (groupData.groupCondition === "any") {
            newFilterEl.createEl("span", {
                cls: ["filter-conjunction"],
                text: t("OR"),
            });
        }
        else if (groupData.groupCondition === "none") {
            newFilterEl.createEl("span", {
                cls: ["filter-conjunction"],
                text: t("AND NOT"),
            });
        }
        else {
            newFilterEl.createEl("span", {
                cls: ["filter-conjunction"],
                text: t("AND"),
            });
        }
        const propertySelect = new DropdownComponent(newFilterEl);
        propertySelect.selectEl.addClasses([
            "filter-property-select",
            "compact-select",
        ]);
        const conditionSelect = new DropdownComponent(newFilterEl);
        conditionSelect.selectEl.addClasses([
            "filter-condition-select",
            "compact-select",
        ]);
        const valueInput = newFilterEl.createEl("input", {
            cls: ["filter-value-input", "compact-input"],
        });
        valueInput.hide();
        propertySelect.onChange((value) => {
            filterData.property = value;
            this.saveStateToLocalStorage(false); // 不立即触发更新
            setTimeout(() => this.saveStateToLocalStorage(true), 300);
            this.updateFilterPropertyOptions(newFilterEl, filterData, propertySelect, conditionSelect, valueInput);
        });
        const toggleValueInputVisibility = (currentCond, propertyType) => {
            const conditionsRequiringValue = [
                "equals",
                "contains",
                "doesNotContain",
                "startsWith",
                "endsWith",
                "is",
                "isNot",
                ">",
                "<",
                ">=",
                "<=",
            ];
            let valueActuallyNeeded = conditionsRequiringValue.includes(currentCond);
            if (propertyType === "completed" &&
                (currentCond === "isTrue" || currentCond === "isFalse")) {
                valueActuallyNeeded = false;
            }
            if (currentCond === "isEmpty" || currentCond === "isNotEmpty") {
                valueActuallyNeeded = false;
            }
            valueInput.style.display = valueActuallyNeeded ? "block" : "none";
            if (!valueActuallyNeeded && filterData.value !== undefined) {
                filterData.value = undefined;
                this.saveStateToLocalStorage();
                valueInput.value = "";
            }
        };
        conditionSelect.onChange((newCondition) => {
            filterData.condition = newCondition;
            this.saveStateToLocalStorage(false); // 不立即触发更新
            setTimeout(() => this.saveStateToLocalStorage(true), 300);
            toggleValueInputVisibility(newCondition, filterData.property);
            if (valueInput.style.display === "none" &&
                valueInput.value !== "") {
                // If input is hidden, value should be undefined as per toggleValueInputVisibility
                // This part might need re-evaluation of logic if filterData.value should be set here.
                // For now, assuming toggleValueInputVisibility handles setting filterData.value correctly.
            }
        });
        valueInput.value = filterData.value || "";
        let valueInputTimeout;
        this.registerDomEvent(valueInput, "input", (event) => {
            filterData.value = event.target.value;
            // 在输入时不立即触发实时更新，只保存状态
            this.saveStateToLocalStorage(false);
            // 延迟触发实时更新
            clearTimeout(valueInputTimeout);
            valueInputTimeout = setTimeout(() => {
                this.saveStateToLocalStorage(true);
            }, 400); // 400ms 防抖
        });
        const removeFilterBtn = new ExtraButtonComponent(newFilterEl)
            .setIcon("trash-2")
            .setTooltip(t("Remove filter"))
            .onClick(() => {
            groupData.filters = groupData.filters.filter((f) => f.id !== filterData.id);
            this.saveStateToLocalStorage();
            newFilterEl.remove();
            this.updateFilterConjunctions(newFilterEl.parentElement, groupData.groupCondition);
        });
        removeFilterBtn.extraSettingsEl.addClasses([
            "remove-filter-btn",
            "clickable-icon",
        ]);
        this.updateFilterPropertyOptions(newFilterEl, filterData, propertySelect, conditionSelect, valueInput);
        return newFilterEl;
    }
    addFilterToGroup(groupData, filtersListEl) {
        const newFilterId = this.generateId();
        const newFilterData = {
            id: newFilterId,
            property: "content",
            condition: "contains",
            value: "",
        };
        groupData.filters.push(newFilterData);
        this.saveStateToLocalStorage();
        const newFilterElement = this.createFilterItemElement(newFilterData, groupData);
        filtersListEl.appendChild(newFilterElement);
        this.updateFilterConjunctions(filtersListEl, groupData.groupCondition);
    }
    updateFilterPropertyOptions(filterItemEl, filterData, propertySelect, conditionSelect, valueInput) {
        const property = filterData.property;
        if (propertySelect.selectEl.options.length === 0) {
            propertySelect.addOptions({
                content: t("Content"),
                status: t("Status"),
                priority: t("Priority"),
                dueDate: t("Due Date"),
                startDate: t("Start Date"),
                scheduledDate: t("Scheduled Date"),
                tags: t("Tags"),
                filePath: t("File Path"),
                project: t("Project"),
                completed: t("Completed"),
            });
        }
        propertySelect.setValue(property);
        let conditionOptions = [];
        valueInput.type = "text";
        switch (property) {
            case "content":
            case "filePath":
            case "status":
            case "project":
                conditionOptions = [
                    {
                        value: "contains",
                        text: t("contains"),
                    },
                    {
                        value: "doesNotContain",
                        text: t("does not contain"),
                    },
                    { value: "is", text: t("is") },
                    {
                        value: "isNot",
                        text: t("is not"),
                    },
                    {
                        value: "startsWith",
                        text: t("starts with"),
                    },
                    {
                        value: "endsWith",
                        text: t("ends with"),
                    },
                    {
                        value: "isEmpty",
                        text: t("is empty"),
                    },
                    {
                        value: "isNotEmpty",
                        text: t("is not empty"),
                    },
                ];
                break;
            case "priority":
                conditionOptions = [
                    {
                        value: "is",
                        text: t("is"),
                    },
                    {
                        value: "isNot",
                        text: t("is not"),
                    },
                    {
                        value: "isEmpty",
                        text: t("is empty"),
                    },
                    {
                        value: "isNotEmpty",
                        text: t("is not empty"),
                    },
                ];
                break;
            case "dueDate":
            case "startDate":
            case "scheduledDate":
                valueInput.type = "date";
                conditionOptions = [
                    { value: "is", text: t("is") },
                    {
                        value: "isNot",
                        text: t("is not"),
                    },
                    {
                        value: ">",
                        text: ">",
                    },
                    {
                        value: "<",
                        text: "<",
                    },
                    {
                        value: ">=",
                        text: ">=",
                    },
                    {
                        value: "<=",
                        text: "<=",
                    },
                    {
                        value: "isEmpty",
                        text: t("is empty"),
                    },
                    {
                        value: "isNotEmpty",
                        text: t("is not empty"),
                    },
                ];
                break;
            case "tags":
                conditionOptions = [
                    {
                        value: "contains",
                        text: t("contains"),
                    },
                    {
                        value: "doesNotContain",
                        text: t("does not contain"),
                    },
                    {
                        value: "isEmpty",
                        text: t("is empty"),
                    },
                    {
                        value: "isNotEmpty",
                        text: t("is not empty"),
                    },
                ];
                break;
            case "completed":
                conditionOptions = [
                    {
                        value: "isTrue",
                        text: t("is true"),
                    },
                    {
                        value: "isFalse",
                        text: t("is false"),
                    },
                ];
                break;
            default:
                conditionOptions = [
                    {
                        value: "isSet",
                        text: t("is set"),
                    },
                    {
                        value: "isNotSet",
                        text: t("is not set"),
                    },
                    {
                        value: "equals",
                        text: t("equals"),
                    },
                    {
                        value: "contains",
                        text: t("contains"),
                    },
                ];
        }
        conditionSelect.selectEl.empty();
        conditionOptions.forEach((opt) => conditionSelect.addOption(opt.value, opt.text));
        const currentSelectedCondition = filterData.condition;
        let conditionChanged = false;
        if (conditionOptions.some((opt) => opt.value === currentSelectedCondition)) {
            conditionSelect.setValue(currentSelectedCondition);
        }
        else if (conditionOptions.length > 0) {
            conditionSelect.setValue(conditionOptions[0].value);
            filterData.condition = conditionOptions[0].value;
            conditionChanged = true;
        }
        const finalConditionVal = conditionSelect.getValue();
        const conditionsRequiringValue = [
            "equals",
            "contains",
            "doesNotContain",
            "startsWith",
            "endsWith",
            "is",
            "isNot",
            ">",
            "<",
            ">=",
            "<=",
        ];
        let valueActuallyNeeded = conditionsRequiringValue.includes(finalConditionVal);
        if (property === "completed" &&
            (finalConditionVal === "isTrue" || finalConditionVal === "isFalse")) {
            valueActuallyNeeded = false;
        }
        if (finalConditionVal === "isEmpty" ||
            finalConditionVal === "isNotEmpty") {
            valueActuallyNeeded = false;
        }
        let valueChanged = false;
        valueInput.style.display = valueActuallyNeeded ? "block" : "none";
        if (valueActuallyNeeded) {
            if (filterData.value !== undefined) {
                valueInput.value = filterData.value;
            }
            else {
                if (valueInput.value !== "") {
                    valueInput.value = "";
                }
            }
        }
        else {
            valueInput.value = "";
            if (filterData.value !== undefined) {
                filterData.value = undefined;
                valueChanged = true;
            }
        }
        if (conditionChanged || valueChanged) {
            this.saveStateToLocalStorage();
        }
    }
    // --- UI Updates (Conjunctions, Separators) ---
    updateFilterConjunctions(filtersListEl, groupCondition = "all") {
        if (!filtersListEl)
            return;
        const filters = filtersListEl.querySelectorAll(".filter-item");
        filters.forEach((filter, index) => {
            const conjunctionElement = filter.querySelector(".filter-conjunction");
            if (conjunctionElement) {
                if (index !== 0) {
                    conjunctionElement.show();
                    if (groupCondition === "any") {
                        conjunctionElement.textContent = t("OR");
                    }
                    else if (groupCondition === "none") {
                        conjunctionElement.textContent = t("NOR");
                    }
                    else {
                        conjunctionElement.textContent = t("AND");
                    }
                }
                else {
                    conjunctionElement.hide();
                    if (groupCondition === "any") {
                        conjunctionElement.textContent = t("OR");
                    }
                    else if (groupCondition === "none") {
                        conjunctionElement.textContent = t("NOR");
                    }
                    else {
                        conjunctionElement.textContent = t("AND");
                    }
                }
            }
        });
    }
    updateGroupSeparators() {
        var _a, _b;
        (_a = this.filterGroupsContainerEl) === null || _a === void 0 ? void 0 : _a.querySelectorAll(".filter-group-separator-container").forEach((sep) => sep.remove());
        const groups = Array.from(((_b = this.filterGroupsContainerEl) === null || _b === void 0 ? void 0 : _b.children) || []).filter((child) => child.classList.contains("filter-group"));
        if (groups.length > 1) {
            groups.forEach((group, index) => {
                var _a;
                if (index < groups.length - 1) {
                    const separatorContainer = createEl("div", {
                        cls: "filter-group-separator-container",
                    });
                    const separator = separatorContainer.createDiv({
                        cls: "filter-group-separator",
                    });
                    const rootCond = this.rootFilterState.rootCondition;
                    let separatorText = t("OR");
                    if (rootCond === "all")
                        separatorText = t("AND");
                    else if (rootCond === "none")
                        separatorText = t("AND NOT");
                    separator.textContent = separatorText.toUpperCase();
                    (_a = group.parentNode) === null || _a === void 0 ? void 0 : _a.insertBefore(separatorContainer, group.nextSibling);
                }
            });
        }
    }
    // --- SortableJS Integration ---
    makeSortableGroups() {
        if (this.groupsSortable) {
            this.groupsSortable.destroy();
            this.groupsSortable = undefined;
        }
        if (!this.filterGroupsContainerEl)
            return;
        this.groupsSortable = new Sortable(this.filterGroupsContainerEl, {
            animation: 150,
            handle: ".drag-handle",
            filter: ".filter-group-separator-container",
            preventOnFilter: true,
            ghostClass: "dragging-placeholder",
            onEnd: (evt) => {
                const sortableEvent = evt;
                if (sortableEvent.oldDraggableIndex === undefined ||
                    sortableEvent.newDraggableIndex === undefined)
                    return;
                const movedGroup = this.rootFilterState.filterGroups.splice(sortableEvent.oldDraggableIndex, 1)[0];
                this.rootFilterState.filterGroups.splice(sortableEvent.newDraggableIndex, 0, movedGroup);
                this.saveStateToLocalStorage();
                this.updateGroupSeparators();
            },
        });
    }
    // --- Filter State Management ---
    updateFilterState(filterGroups, rootCondition) {
        this.rootFilterState.filterGroups = filterGroups;
        this.rootFilterState.rootCondition = rootCondition;
        this.saveStateToLocalStorage();
    }
    // Public method to get current filter state
    getFilterState() {
        // Handle case where rootFilterState might not be initialized
        if (!this.rootFilterState) {
            return {
                rootCondition: "any",
                filterGroups: [],
            };
        }
        return JSON.parse(JSON.stringify(this.rootFilterState));
    }
    // Public method to load filter state
    loadFilterState(state) {
        var _a;
        // Safely destroy sortable instances
        try {
            if (this.groupsSortable) {
                this.groupsSortable.destroy();
                this.groupsSortable = undefined;
            }
        }
        catch (error) {
            console.warn("Error destroying groups sortable:", error);
            this.groupsSortable = undefined;
        }
        // Safely destroy filter list sortable instances
        (_a = this.filterGroupsContainerEl) === null || _a === void 0 ? void 0 : _a.querySelectorAll(".filters-list").forEach((listEl) => {
            try {
                if (listEl.sortableInstance) {
                    listEl.sortableInstance.destroy();
                    listEl.sortableInstance = undefined;
                }
            }
            catch (error) {
                console.warn("Error destroying filter list sortable:", error);
                listEl.sortableInstance = undefined;
            }
        });
        this.rootFilterState = JSON.parse(JSON.stringify(state));
        this.saveStateToLocalStorage();
        this.render();
    }
    // --- Local Storage Management ---
    saveStateToLocalStorage(triggerRealtimeUpdate = true) {
        if (this.app) {
            this.app.saveLocalStorage(this.leafId
                ? `task-genius-view-filter-${this.leafId}`
                : "task-genius-view-filter", this.rootFilterState);
            // 只有在需要实时更新时才触发事件
            if (triggerRealtimeUpdate) {
                // 触发过滤器变更事件，传递当前的过滤器状态
                this.app.workspace.trigger("task-genius:filter-changed", this.rootFilterState, this.leafId || undefined);
            }
        }
    }
    // --- Filter Configuration Management ---
    openSaveConfigModal() {
        if (!this.plugin)
            return;
        const modal = new FilterConfigModal(this.app, this.plugin, "save", this.getFilterState(), (config) => {
            // Optional: Handle successful save
            console.log("Filter configuration saved:", config.name);
        });
        modal.open();
    }
    openLoadConfigModal() {
        if (!this.plugin)
            return;
        const modal = new FilterConfigModal(this.app, this.plugin, "load", undefined, undefined, (config) => {
            // Load the configuration
            this.loadFilterState(config.filterState);
            console.log("Filter configuration loaded:", config.name);
        });
        modal.open();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld1Rhc2tGaWx0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJWaWV3VGFza0ZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ04sU0FBUyxFQUNULG9CQUFvQixFQUNwQixPQUFPLEVBQ1AsaUJBQWlCLEVBSWpCLFVBQVUsR0FDVixNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLFFBQVEsTUFBTSxZQUFZLENBQUM7QUFDbEMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDLENBQUMsMERBQTBEO0FBQ3JHLE9BQU8sNEJBQTRCLENBQUM7QUFDcEMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUF1Q3hELE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxTQUFTO0lBVWpELFlBQ0MsTUFBbUIsRUFDbkIsR0FBUSxFQUNBLE1BQTJCLEVBQ25DLE1BQThCO1FBRTlCLEtBQUssRUFBRSxDQUFDO1FBSEEsV0FBTSxHQUFOLE1BQU0sQ0FBcUI7UUFJbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFDZixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTTtRQUNMLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNO1lBQzdCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUN6QiwyQkFBMkIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUN2QztZQUNILENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFFeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNuRCxJQUNDLFVBQVU7WUFDVixPQUFPLFVBQVUsQ0FBQyxh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QUFHLElBQUksaUJBQWlCLENBQ2xDLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxNQUFNLEVBQ04sSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUNyQixDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ1YsbUNBQW1DO1lBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FDRCxDQUFDO1FBQ0YsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2QsQ0FBQztJQUVPLG1CQUFtQjtRQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFPO1FBRXpCLE1BQU0sS0FBSyxHQUFHLElBQUksaUJBQWlCLENBQ2xDLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxNQUFNLEVBQ04sU0FBUyxFQUNULFNBQVMsRUFDVCxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ1YseUJBQXlCO1lBQ3pCLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzFELENBQUMsQ0FDRCxDQUFDO1FBQ0YsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2QsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRDb21wb25lbnQsXHJcblx0RXh0cmFCdXR0b25Db21wb25lbnQsXHJcblx0c2V0SWNvbixcclxuXHREcm9wZG93bkNvbXBvbmVudCxcclxuXHRCdXR0b25Db21wb25lbnQsXHJcblx0Q2xvc2VhYmxlQ29tcG9uZW50LFxyXG5cdEFwcCxcclxuXHRzZXRUb29sdGlwLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgU29ydGFibGUgZnJvbSBcInNvcnRhYmxlanNcIjtcclxuaW1wb3J0IHsgdCB9IGZyb20gXCJAL3RyYW5zbGF0aW9ucy9oZWxwZXJcIjsgLy8gQWRqdXN0ZWQgcGF0aCBhc3N1bWluZyBoZWxwZXIudHMgaXMgaW4gc3JjL3RyYW5zbGF0aW9uc1xyXG5pbXBvcnQgXCJAL3N0eWxlcy9nbG9iYWwtZmlsdGVyLmNzc1wiO1xyXG5pbXBvcnQgeyBGaWx0ZXJDb25maWdNb2RhbCB9IGZyb20gXCIuL0ZpbHRlckNvbmZpZ01vZGFsXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiQC9pbmRleFwiO1xyXG5cclxuLy8gLS0tIEludGVyZmFjZXMgKGZyb20gZm9jdXMubWQgYW5kIGV4YW1wbGUgSFRNTCkgLS0tXHJcbi8vIChVc2luZyAnYW55JyBmb3IgcHJvcGVydHkgdHlwZXMgZm9yIG5vdywgd2lsbCByZWZpbmUgYmFzZWQgb24gZm9jdXMubWQgcHJvcGVydHkgbGlzdClcclxuZXhwb3J0IGludGVyZmFjZSBGaWx0ZXIge1xyXG5cdGlkOiBzdHJpbmc7XHJcblx0cHJvcGVydHk6IHN0cmluZzsgLy8gZS5nLiwgJ2NvbnRlbnQnLCAnZHVlRGF0ZScsICdwcmlvcml0eSdcclxuXHRjb25kaXRpb246IHN0cmluZzsgLy8gZS5nLiwgJ2lzU2V0JywgJ2VxdWFscycsICdjb250YWlucydcclxuXHR2YWx1ZT86IGFueTtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWx0ZXJHcm91cCB7XHJcblx0aWQ6IHN0cmluZztcclxuXHRncm91cENvbmRpdGlvbjogXCJhbGxcIiB8IFwiYW55XCIgfCBcIm5vbmVcIjsgLy8gSG93IGZpbHRlcnMgd2l0aGluIHRoaXMgZ3JvdXAgYXJlIGNvbWJpbmVkXHJcblx0ZmlsdGVyczogRmlsdGVyW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUm9vdEZpbHRlclN0YXRlIHtcclxuXHRyb290Q29uZGl0aW9uOiBcImFsbFwiIHwgXCJhbnlcIiB8IFwibm9uZVwiOyAvLyBIb3cgZmlsdGVyIGdyb3VwcyBhcmUgY29tYmluZWRcclxuXHRmaWx0ZXJHcm91cHM6IEZpbHRlckdyb3VwW107XHJcbn1cclxuXHJcbi8vIFJlcHJlc2VudHMgYSBzaW5nbGUgZmlsdGVyIGNvbmRpdGlvbiBVSSByb3cgZnJvbSBmb2N1cy5tZFxyXG5pbnRlcmZhY2UgRmlsdGVyQ29uZGl0aW9uSXRlbSB7XHJcblx0cHJvcGVydHk6IHN0cmluZzsgLy8gZS5nLiwgJ2NvbnRlbnQnLCAnZHVlRGF0ZScsICdwcmlvcml0eScsICd0YWdzLm15VGFnJ1xyXG5cdG9wZXJhdG9yOiBzdHJpbmc7IC8vIGUuZy4sICdjb250YWlucycsICdpcycsICc+PScsICdpc0VtcHR5J1xyXG5cdHZhbHVlPzogYW55OyAvLyBWYWx1ZSBmb3IgdGhlIGNvbmRpdGlvbiwgdHlwZSBkZXBlbmRzIG9uIHByb3BlcnR5IGFuZCBvcGVyYXRvclxyXG59XHJcblxyXG4vLyBSZXByZXNlbnRzIGEgZ3JvdXAgb2YgZmlsdGVyIGNvbmRpdGlvbnMgaW4gdGhlIFVJIGZyb20gZm9jdXMubWRcclxuaW50ZXJmYWNlIEZpbHRlckdyb3VwSXRlbSB7XHJcblx0bG9naWNhbE9wZXJhdG9yOiBcIkFORFwiIHwgXCJPUlwiOyAvLyBIb3cgY29uZGl0aW9ucy9ncm91cHMgd2l0aGluIHRoaXMgZ3JvdXAgYXJlIGNvbWJpbmVkXHJcblx0aXRlbXM6IChGaWx0ZXJDb25kaXRpb25JdGVtIHwgRmlsdGVyR3JvdXBJdGVtKVtdOyAvLyBDYW4gY29udGFpbiBjb25kaXRpb25zIG9yIG5lc3RlZCBncm91cHNcclxufVxyXG5cclxuLy8gVG9wLWxldmVsIGZpbHRlciBjb25maWd1cmF0aW9uIGZyb20gdGhlIFVJIGZyb20gZm9jdXMubWRcclxudHlwZSBGaWx0ZXJDb25maWcgPSBGaWx0ZXJHcm91cEl0ZW07XHJcblxyXG5leHBvcnQgY2xhc3MgVGFza0ZpbHRlckNvbXBvbmVudCBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBob3N0RWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcm9vdEZpbHRlclN0YXRlITogUm9vdEZpbHRlclN0YXRlO1xyXG5cdHByaXZhdGUgYXBwOiBBcHA7XHJcblx0cHJpdmF0ZSBmaWx0ZXJHcm91cHNDb250YWluZXJFbCE6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgcGx1Z2luPzogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuXHQvLyBTb3J0YWJsZSBpbnN0YW5jZXNcclxuXHRwcml2YXRlIGdyb3Vwc1NvcnRhYmxlPzogU29ydGFibGU7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0aG9zdEVsOiBIVE1MRWxlbWVudCxcclxuXHRcdGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBsZWFmSWQ/OiBzdHJpbmcgfCB1bmRlZmluZWQsXHJcblx0XHRwbHVnaW4/OiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLmhvc3RFbCA9IGhvc3RFbDtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0dGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKSB7XHJcblx0XHRjb25zdCBzYXZlZFN0YXRlID0gdGhpcy5sZWFmSWRcclxuXHRcdFx0PyB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlKFxyXG5cdFx0XHRcdFx0YHRhc2stZ2VuaXVzLXZpZXctZmlsdGVyLSR7dGhpcy5sZWFmSWR9YFxyXG5cdFx0XHQgIClcclxuXHRcdFx0OiB0aGlzLmFwcC5sb2FkTG9jYWxTdG9yYWdlKFwidGFzay1nZW5pdXMtdmlldy1maWx0ZXJcIik7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJzYXZlZFN0YXRlXCIsIHNhdmVkU3RhdGUsIHRoaXMubGVhZklkKTtcclxuXHRcdGlmIChcclxuXHRcdFx0c2F2ZWRTdGF0ZSAmJlxyXG5cdFx0XHR0eXBlb2Ygc2F2ZWRTdGF0ZS5yb290Q29uZGl0aW9uID09PSBcInN0cmluZ1wiICYmXHJcblx0XHRcdEFycmF5LmlzQXJyYXkoc2F2ZWRTdGF0ZS5maWx0ZXJHcm91cHMpXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8gQmFzaWMgdmFsaWRhdGlvbiBwYXNzZWRcclxuXHRcdFx0dGhpcy5yb290RmlsdGVyU3RhdGUgPSBzYXZlZFN0YXRlIGFzIFJvb3RGaWx0ZXJTdGF0ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGlmIChzYXZlZFN0YXRlKSB7XHJcblx0XHRcdFx0Ly8gSWYgaXQgZXhpc3RzIGJ1dCBmYWlsZWQgdmFsaWRhdGlvblxyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFwiVGFzayBGaWx0ZXI6IEludmFsaWQgZGF0YSBpbiBsb2NhbCBzdG9yYWdlLiBSZXNldHRpbmcgdG8gZGVmYXVsdCBzdGF0ZS5cIlxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSB3aXRoIGRlZmF1bHQgc3RhdGVcclxuXHRcdFx0dGhpcy5yb290RmlsdGVyU3RhdGUgPSB7XHJcblx0XHRcdFx0cm9vdENvbmRpdGlvbjogXCJhbnlcIixcclxuXHRcdFx0XHRmaWx0ZXJHcm91cHM6IFtdLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbmRlciBmaXJzdCB0byBpbml0aWFsaXplIERPTSBlbGVtZW50c1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdG9udW5sb2FkKCkge1xyXG5cdFx0Ly8gRGVzdHJveSBzb3J0YWJsZSBpbnN0YW5jZXNcclxuXHRcdHRoaXMuZ3JvdXBzU29ydGFibGU/LmRlc3Ryb3koKTtcclxuXHRcdHRoaXMuZmlsdGVyR3JvdXBzQ29udGFpbmVyRWxcclxuXHRcdFx0Py5xdWVyeVNlbGVjdG9yQWxsKFwiLmZpbHRlcnMtbGlzdFwiKVxyXG5cdFx0XHQuZm9yRWFjaCgobGlzdEVsKSA9PiB7XHJcblx0XHRcdFx0aWYgKChsaXN0RWwgYXMgYW55KS5zb3J0YWJsZUluc3RhbmNlKSB7XHJcblx0XHRcdFx0XHQoKGxpc3RFbCBhcyBhbnkpLnNvcnRhYmxlSW5zdGFuY2UgYXMgU29ydGFibGUpLmRlc3Ryb3koKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdC8vIENsZWFyIHRoZSBob3N0IGVsZW1lbnRcclxuXHRcdHRoaXMuaG9zdEVsLmVtcHR5KCk7IC8vIE9ic2lkaWFuJ3Mgd2F5IHRvIGNsZWFyIGlubmVySFRNTCBhbmQgbWFuYWdlZCBjaGlsZHJlblxyXG5cdH1cclxuXHJcblx0Y2xvc2UoKSB7XHJcblx0XHR0aGlzLm9udW5sb2FkKCk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdlbmVyYXRlSWQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBgaWQtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSByZW5kZXIoKTogdm9pZCB7XHJcblx0XHR0aGlzLmhvc3RFbC5lbXB0eSgpO1xyXG5cdFx0dGhpcy5ob3N0RWwuYWRkQ2xhc3MoXCJ0YXNrLWZpbHRlci1yb290LWNvbnRhaW5lclwiKTtcclxuXHJcblx0XHRjb25zdCBtYWluUGFuZWwgPSB0aGlzLmhvc3RFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGFzay1maWx0ZXItbWFpbi1wYW5lbFwiLFxyXG5cdFx0fSk7XHJcblx0XHRjb25zdCByb290RmlsdGVyU2V0dXBTZWN0aW9uID0gbWFpblBhbmVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGF0dHI6IHsgaWQ6IFwicm9vdC1maWx0ZXItc2V0dXAtc2VjdGlvblwiIH0sXHJcblx0XHR9KTtcclxuXHRcdHJvb3RGaWx0ZXJTZXR1cFNlY3Rpb24uYWRkQ2xhc3MoXCJyb290LWZpbHRlci1zZXR1cC1zZWN0aW9uXCIpO1xyXG5cclxuXHRcdC8vIFJvb3QgQ29uZGl0aW9uIFNlY3Rpb25cclxuXHRcdGNvbnN0IHJvb3RDb25kaXRpb25TZWN0aW9uID0gcm9vdEZpbHRlclNldHVwU2VjdGlvbi5jcmVhdGVEaXYoe30pO1xyXG5cdFx0cm9vdENvbmRpdGlvblNlY3Rpb24uYWRkQ2xhc3MoXCJyb290LWNvbmRpdGlvbi1zZWN0aW9uXCIpO1xyXG5cclxuXHRcdHJvb3RDb25kaXRpb25TZWN0aW9uLmNyZWF0ZUVsKFwibGFiZWxcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiTWF0Y2hcIiksXHJcblx0XHRcdGF0dHI6IHsgZm9yOiBcInRhc2stZmlsdGVyLXJvb3QtY29uZGl0aW9uXCIgfSxcclxuXHRcdFx0Y2xzOiBbXCJjb21wYWN0LXRleHRcIiwgXCJyb290LWNvbmRpdGlvbi1sYWJlbFwiXSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHJvb3RDb25kaXRpb25Ecm9wZG93biA9IG5ldyBEcm9wZG93bkNvbXBvbmVudChcclxuXHRcdFx0cm9vdENvbmRpdGlvblNlY3Rpb25cclxuXHRcdClcclxuXHRcdFx0LmFkZE9wdGlvbnMoe1xyXG5cdFx0XHRcdGFueTogdChcIkFueVwiKSxcclxuXHRcdFx0XHRhbGw6IHQoXCJBbGxcIiksXHJcblx0XHRcdFx0bm9uZTogdChcIk5vbmVcIiksXHJcblx0XHRcdH0pXHJcblx0XHRcdC5zZXRWYWx1ZSh0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9uKVxyXG5cdFx0XHQub25DaGFuZ2UoKHZhbHVlKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5yb290RmlsdGVyU3RhdGUucm9vdENvbmRpdGlvbiA9IHZhbHVlIGFzXHJcblx0XHRcdFx0XHR8IFwiYWxsXCJcclxuXHRcdFx0XHRcdHwgXCJhbnlcIlxyXG5cdFx0XHRcdFx0fCBcIm5vbmVcIjtcclxuXHRcdFx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVHcm91cFNlcGFyYXRvcnMoKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0cm9vdENvbmRpdGlvbkRyb3Bkb3duLnNlbGVjdEVsLnRvZ2dsZUNsYXNzKFwiY29tcGFjdC1zZWxlY3RcIiwgdHJ1ZSk7XHJcblxyXG5cdFx0cm9vdENvbmRpdGlvblNlY3Rpb24uY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0Y2xzOiBbXCJjb21wYWN0LXRleHRcIiwgXCJyb290LWNvbmRpdGlvbi1zcGFuXCJdLFxyXG5cdFx0XHR0ZXh0OiB0KFwiZmlsdGVyIGdyb3VwXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRmlsdGVyIEdyb3VwcyBDb250YWluZXJcclxuXHRcdHRoaXMuZmlsdGVyR3JvdXBzQ29udGFpbmVyRWwgPSByb290RmlsdGVyU2V0dXBTZWN0aW9uLmNyZWF0ZURpdih7XHJcblx0XHRcdGF0dHI6IHsgaWQ6IFwidGFzay1maWx0ZXItZ3JvdXBzLWNvbnRhaW5lclwiIH0sXHJcblx0XHRcdGNsczogXCJmaWx0ZXItZ3JvdXBzLWNvbnRhaW5lclwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQWRkIEZpbHRlciBHcm91cCBCdXR0b24gU2VjdGlvblxyXG5cdFx0Y29uc3QgYWRkR3JvdXBTZWN0aW9uID0gcm9vdEZpbHRlclNldHVwU2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwiYWRkLWdyb3VwLXNlY3Rpb25cIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGFkZEdyb3VwU2VjdGlvbi5jcmVhdGVFbChcclxuXHRcdFx0XCJkaXZcIixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogW1wiYWRkLWZpbHRlci1ncm91cC1idG5cIiwgXCJjb21wYWN0LWJ0blwiXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0ZWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcInNwYW5cIixcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBcImFkZC1maWx0ZXItZ3JvdXAtYnRuLWljb25cIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHQoaWNvbkVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldEljb24oaWNvbkVsLCBcInBsdXNcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRlbC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcImFkZC1maWx0ZXItZ3JvdXAtYnRuLXRleHRcIixcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJBZGQgZmlsdGVyIGdyb3VwXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWwsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRGaWx0ZXJHcm91cCgpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEZpbHRlciBDb25maWd1cmF0aW9uIEJ1dHRvbnMgU2VjdGlvbiAob25seSBzaG93IGlmIHBsdWdpbiBpcyBhdmFpbGFibGUpXHJcblx0XHRpZiAodGhpcy5wbHVnaW4pIHtcclxuXHRcdFx0Y29uc3QgY29uZmlnU2VjdGlvbiA9IGFkZEdyb3VwU2VjdGlvbi5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJmaWx0ZXItY29uZmlnLXNlY3Rpb25cIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTYXZlIENvbmZpZ3VyYXRpb24gQnV0dG9uXHJcblx0XHRcdGNvbmZpZ1NlY3Rpb24uY3JlYXRlRWwoXHJcblx0XHRcdFx0XCJkaXZcIixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbHM6IFtcInNhdmUtZmlsdGVyLWNvbmZpZy1idG5cIiwgXCJjb21wYWN0LWJ0blwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0ZWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInNhdmUtZmlsdGVyLWNvbmZpZy1idG4taWNvblwiLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHQoaWNvbkVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0SWNvbihpY29uRWwsIFwic2F2ZVwiKTtcclxuXHRcdFx0XHRcdFx0XHRzZXRUb29sdGlwKGVsLCB0KFwiU2F2ZSBDdXJyZW50IEZpbHRlclwiKSk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KGVsLCBcImNsaWNrXCIsICgpID0+IHtcclxuXHRcdFx0XHRcdFx0dGhpcy5vcGVuU2F2ZUNvbmZpZ01vZGFsKCk7XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBMb2FkIENvbmZpZ3VyYXRpb24gQnV0dG9uXHJcblx0XHRcdGNvbmZpZ1NlY3Rpb24uY3JlYXRlRWwoXHJcblx0XHRcdFx0XCJkaXZcIixcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjbHM6IFtcImxvYWQtZmlsdGVyLWNvbmZpZy1idG5cIiwgXCJjb21wYWN0LWJ0blwiXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdFx0ZWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcdFwic3BhblwiLFxyXG5cdFx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcImxvYWQtZmlsdGVyLWNvbmZpZy1idG4taWNvblwiLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHQoaWNvbkVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0c2V0SWNvbihpY29uRWwsIFwiZm9sZGVyLW9wZW5cIik7XHJcblx0XHRcdFx0XHRcdFx0c2V0VG9vbHRpcChlbCwgdChcIkxvYWQgU2F2ZWQgRmlsdGVyXCIpKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWwsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHR0aGlzLm9wZW5Mb2FkQ29uZmlnTW9kYWwoKTtcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZS1wb3B1bGF0ZSBmaWx0ZXIgZ3JvdXBzIGZyb20gc3RhdGVcclxuXHRcdHRoaXMucm9vdEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5mb3JFYWNoKChncm91cERhdGEpID0+IHtcclxuXHRcdFx0Y29uc3QgZ3JvdXBFbGVtZW50ID0gdGhpcy5jcmVhdGVGaWx0ZXJHcm91cEVsZW1lbnQoZ3JvdXBEYXRhKTtcclxuXHRcdFx0dGhpcy5maWx0ZXJHcm91cHNDb250YWluZXJFbC5hcHBlbmRDaGlsZChncm91cEVsZW1lbnQpO1xyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnVwZGF0ZUdyb3VwU2VwYXJhdG9ycygpO1xyXG5cdFx0dGhpcy5tYWtlU29ydGFibGVHcm91cHMoKTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBGaWx0ZXIgR3JvdXAgTWFuYWdlbWVudCAtLS1cclxuXHRwcml2YXRlIGNyZWF0ZUZpbHRlckdyb3VwRWxlbWVudChncm91cERhdGE6IEZpbHRlckdyb3VwKTogSFRNTEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgbmV3R3JvdXBFbCA9IHRoaXMuaG9zdEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0YXR0cjogeyBpZDogZ3JvdXBEYXRhLmlkIH0sXHJcblx0XHRcdGNsczogW1wiZmlsdGVyLWdyb3VwXCJdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZ3JvdXBIZWFkZXIgPSBuZXdHcm91cEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogW1wiZmlsdGVyLWdyb3VwLWhlYWRlclwiXSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IGdyb3VwSGVhZGVyTGVmdCA9IGdyb3VwSGVhZGVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogW1wiZmlsdGVyLWdyb3VwLWhlYWRlci1sZWZ0XCJdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gRHJhZyBIYW5kbGUgLSBrZXB0IGFzIGN1c3RvbSBTVkcgZm9yIG5vd1xyXG5cdFx0Z3JvdXBIZWFkZXJMZWZ0LmNyZWF0ZURpdihcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogXCJkcmFnLWhhbmRsZS1jb250YWluZXJcIixcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0ZWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcInNwYW5cIixcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBcImRyYWctaGFuZGxlXCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0KGljb25FbCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRzZXRJY29uKGljb25FbCwgXCJncmlwLXZlcnRpY2FsXCIpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Z3JvdXBIZWFkZXJMZWZ0LmNyZWF0ZUVsKFwibGFiZWxcIiwge1xyXG5cdFx0XHRjbHM6IFtcImNvbXBhY3QtdGV4dFwiXSxcclxuXHRcdFx0dGV4dDogdChcIk1hdGNoXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZ3JvdXBDb25kaXRpb25TZWxlY3QgPSBuZXcgRHJvcGRvd25Db21wb25lbnQoZ3JvdXBIZWFkZXJMZWZ0KVxyXG5cdFx0XHQuYWRkT3B0aW9ucyh7XHJcblx0XHRcdFx0YWxsOiB0KFwiQWxsXCIpLFxyXG5cdFx0XHRcdGFueTogdChcIkFueVwiKSxcclxuXHRcdFx0XHRub25lOiB0KFwiTm9uZVwiKSxcclxuXHRcdFx0fSlcclxuXHRcdFx0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHNlbGVjdGVkVmFsdWUgPSB2YWx1ZSBhcyBcImFsbFwiIHwgXCJhbnlcIiB8IFwibm9uZVwiO1xyXG5cdFx0XHRcdGdyb3VwRGF0YS5ncm91cENvbmRpdGlvbiA9IHNlbGVjdGVkVmFsdWU7XHJcblx0XHRcdFx0dGhpcy5zYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpO1xyXG5cdFx0XHRcdHRoaXMudXBkYXRlRmlsdGVyQ29uanVuY3Rpb25zKFxyXG5cdFx0XHRcdFx0bmV3R3JvdXBFbC5xdWVyeVNlbGVjdG9yKFwiLmZpbHRlcnMtbGlzdFwiKSBhcyBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHRcdHNlbGVjdGVkVmFsdWVcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHQuc2V0VmFsdWUoZ3JvdXBEYXRhLmdyb3VwQ29uZGl0aW9uKTtcclxuXHRcdGdyb3VwQ29uZGl0aW9uU2VsZWN0LnNlbGVjdEVsLnRvZ2dsZUNsYXNzKFxyXG5cdFx0XHRbXCJncm91cC1jb25kaXRpb24tc2VsZWN0XCIsIFwiY29tcGFjdC1zZWxlY3RcIl0sXHJcblx0XHRcdHRydWVcclxuXHRcdCk7XHJcblxyXG5cdFx0Z3JvdXBIZWFkZXJMZWZ0LmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdGNsczogW1wiY29tcGFjdC10ZXh0XCJdLFxyXG5cdFx0XHR0ZXh0OiB0KFwiZmlsdGVyIGluIHRoaXMgZ3JvdXBcIiksXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCBncm91cEhlYWRlclJpZ2h0ID0gZ3JvdXBIZWFkZXIuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBbXCJmaWx0ZXItZ3JvdXAtaGVhZGVyLXJpZ2h0XCJdLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgZHVwbGljYXRlR3JvdXBCdG4gPSBuZXcgRXh0cmFCdXR0b25Db21wb25lbnQoZ3JvdXBIZWFkZXJSaWdodClcclxuXHRcdFx0LnNldEljb24oXCJjb3B5XCIpXHJcblx0XHRcdC5zZXRUb29sdGlwKHQoXCJEdXBsaWNhdGUgZmlsdGVyIGdyb3VwXCIpKVxyXG5cdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbmV3R3JvdXBJZCA9IHRoaXMuZ2VuZXJhdGVJZCgpO1xyXG5cdFx0XHRcdGNvbnN0IGR1cGxpY2F0ZWRGaWx0ZXJzID0gZ3JvdXBEYXRhLmZpbHRlcnMubWFwKChmKSA9PiAoe1xyXG5cdFx0XHRcdFx0Li4uZixcclxuXHRcdFx0XHRcdGlkOiB0aGlzLmdlbmVyYXRlSWQoKSxcclxuXHRcdFx0XHR9KSk7XHJcblx0XHRcdFx0Y29uc3QgZHVwbGljYXRlZEdyb3VwRGF0YTogRmlsdGVyR3JvdXAgPSB7XHJcblx0XHRcdFx0XHQuLi5ncm91cERhdGEsXHJcblx0XHRcdFx0XHRpZDogbmV3R3JvdXBJZCxcclxuXHRcdFx0XHRcdGZpbHRlcnM6IGR1cGxpY2F0ZWRGaWx0ZXJzLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dGhpcy5hZGRGaWx0ZXJHcm91cChkdXBsaWNhdGVkR3JvdXBEYXRhLCBuZXdHcm91cEVsKTtcclxuXHRcdFx0fSk7XHJcblx0XHRkdXBsaWNhdGVHcm91cEJ0bi5leHRyYVNldHRpbmdzRWwuYWRkQ2xhc3NlcyhbXHJcblx0XHRcdFwiZHVwbGljYXRlLWdyb3VwLWJ0blwiLFxyXG5cdFx0XHRcImNsaWNrYWJsZS1pY29uXCIsXHJcblx0XHRdKTtcclxuXHJcblx0XHRjb25zdCByZW1vdmVHcm91cEJ0biA9IG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChncm91cEhlYWRlclJpZ2h0KVxyXG5cdFx0XHQuc2V0SWNvbihcInRyYXNoLTJcIilcclxuXHRcdFx0LnNldFRvb2x0aXAodChcIlJlbW92ZSBmaWx0ZXIgZ3JvdXBcIikpXHJcblx0XHRcdC5vbkNsaWNrKCgpID0+IHtcclxuXHRcdFx0XHRjb25zdCBmaWx0ZXJzTGlzdEVsRm9yU29ydGFibGUgPSBuZXdHcm91cEVsLnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XHRcIi5maWx0ZXJzLWxpc3RcIlxyXG5cdFx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0ZmlsdGVyc0xpc3RFbEZvclNvcnRhYmxlICYmXHJcblx0XHRcdFx0XHQoZmlsdGVyc0xpc3RFbEZvclNvcnRhYmxlIGFzIGFueSkuc29ydGFibGVJbnN0YW5jZVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0KFxyXG5cdFx0XHRcdFx0XHQoZmlsdGVyc0xpc3RFbEZvclNvcnRhYmxlIGFzIGFueSlcclxuXHRcdFx0XHRcdFx0XHQuc29ydGFibGVJbnN0YW5jZSBhcyBTb3J0YWJsZVxyXG5cdFx0XHRcdFx0KS5kZXN0cm95KCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgPVxyXG5cdFx0XHRcdFx0dGhpcy5yb290RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLmZpbHRlcihcclxuXHRcdFx0XHRcdFx0KGcpID0+IGcuaWQgIT09IGdyb3VwRGF0YS5pZFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XHJcblx0XHRcdFx0bmV3R3JvdXBFbC5yZW1vdmUoKTtcclxuXHRcdFx0XHRjb25zdCBuZXh0U2libGluZyA9IG5ld0dyb3VwRWwubmV4dEVsZW1lbnRTaWJsaW5nO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdG5leHRTaWJsaW5nICYmXHJcblx0XHRcdFx0XHRuZXh0U2libGluZy5jbGFzc0xpc3QuY29udGFpbnMoXHJcblx0XHRcdFx0XHRcdFwiZmlsdGVyLWdyb3VwLXNlcGFyYXRvci1jb250YWluZXJcIlxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0bmV4dFNpYmxpbmcucmVtb3ZlKCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnN0IHByZXZTaWJsaW5nID0gbmV3R3JvdXBFbC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRwcmV2U2libGluZyAmJlxyXG5cdFx0XHRcdFx0XHRwcmV2U2libGluZy5jbGFzc0xpc3QuY29udGFpbnMoXHJcblx0XHRcdFx0XHRcdFx0XCJmaWx0ZXItZ3JvdXAtc2VwYXJhdG9yLWNvbnRhaW5lclwiXHJcblx0XHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRwcmV2U2libGluZy5yZW1vdmUoKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy51cGRhdGVHcm91cFNlcGFyYXRvcnMoKTtcclxuXHRcdFx0fSk7XHJcblx0XHRyZW1vdmVHcm91cEJ0bi5leHRyYVNldHRpbmdzRWwuYWRkQ2xhc3NlcyhbXHJcblx0XHRcdFwicmVtb3ZlLWdyb3VwLWJ0blwiLFxyXG5cdFx0XHRcImNsaWNrYWJsZS1pY29uXCIsXHJcblx0XHRdKTtcclxuXHJcblx0XHRjb25zdCBmaWx0ZXJzTGlzdEVsID0gbmV3R3JvdXBFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFtcImZpbHRlcnMtbGlzdFwiXSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGdyb3VwRGF0YS5maWx0ZXJzLmZvckVhY2goKGZpbHRlckRhdGEpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsdGVyRWxlbWVudCA9IHRoaXMuY3JlYXRlRmlsdGVySXRlbUVsZW1lbnQoXHJcblx0XHRcdFx0ZmlsdGVyRGF0YSxcclxuXHRcdFx0XHRncm91cERhdGFcclxuXHRcdFx0KTtcclxuXHRcdFx0ZmlsdGVyc0xpc3RFbC5hcHBlbmRDaGlsZChmaWx0ZXJFbGVtZW50KTtcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy51cGRhdGVGaWx0ZXJDb25qdW5jdGlvbnMoZmlsdGVyc0xpc3RFbCwgZ3JvdXBEYXRhLmdyb3VwQ29uZGl0aW9uKTtcclxuXHJcblx0XHRjb25zdCBncm91cEZvb3RlciA9IG5ld0dyb3VwRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBbXCJncm91cC1mb290ZXJcIl0sXHJcblx0XHR9KTtcclxuXHJcblx0XHRncm91cEZvb3Rlci5jcmVhdGVFbChcclxuXHRcdFx0XCJkaXZcIixcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGNsczogW1wiYWRkLWZpbHRlci1idG5cIiwgXCJjb21wYWN0LWJ0blwiXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0ZWwuY3JlYXRlRWwoXHJcblx0XHRcdFx0XHRcInNwYW5cIixcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBcImFkZC1maWx0ZXItYnRuLWljb25cIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHQoaWNvbkVsKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNldEljb24oaWNvbkVsLCBcInBsdXNcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRlbC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcImFkZC1maWx0ZXItYnRuLXRleHRcIixcclxuXHRcdFx0XHRcdHRleHQ6IHQoXCJBZGQgZmlsdGVyXCIpLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWwsIFwiY2xpY2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRGaWx0ZXJUb0dyb3VwKGdyb3VwRGF0YSwgZmlsdGVyc0xpc3RFbCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIG5ld0dyb3VwRWw7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFkZEZpbHRlckdyb3VwKFxyXG5cdFx0Z3JvdXBEYXRhVG9DbG9uZTogRmlsdGVyR3JvdXAgfCBudWxsID0gbnVsbCxcclxuXHRcdGluc2VydEFmdGVyRWxlbWVudDogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gRW5zdXJlIHRoZSBjb250YWluZXIgaXMgaW5pdGlhbGl6ZWRcclxuXHRcdGlmICghdGhpcy5maWx0ZXJHcm91cHNDb250YWluZXJFbCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XCJUYXNrRmlsdGVyQ29tcG9uZW50OiBmaWx0ZXJHcm91cHNDb250YWluZXJFbCBub3QgaW5pdGlhbGl6ZWQgeWV0XCJcclxuXHRcdFx0KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IG5ld0dyb3VwSWQgPSBncm91cERhdGFUb0Nsb25lXHJcblx0XHRcdD8gZ3JvdXBEYXRhVG9DbG9uZS5pZFxyXG5cdFx0XHQ6IHRoaXMuZ2VuZXJhdGVJZCgpO1xyXG5cclxuXHRcdGxldCBuZXdHcm91cERhdGE6IEZpbHRlckdyb3VwO1xyXG5cdFx0aWYgKGdyb3VwRGF0YVRvQ2xvbmUgJiYgaW5zZXJ0QWZ0ZXJFbGVtZW50KSB7XHJcblx0XHRcdG5ld0dyb3VwRGF0YSA9IHtcclxuXHRcdFx0XHRpZDogbmV3R3JvdXBJZCxcclxuXHRcdFx0XHRncm91cENvbmRpdGlvbjogZ3JvdXBEYXRhVG9DbG9uZS5ncm91cENvbmRpdGlvbixcclxuXHRcdFx0XHRmaWx0ZXJzOiBncm91cERhdGFUb0Nsb25lLmZpbHRlcnMubWFwKChmKSA9PiAoe1xyXG5cdFx0XHRcdFx0Li4uZixcclxuXHRcdFx0XHRcdGlkOiB0aGlzLmdlbmVyYXRlSWQoKSxcclxuXHRcdFx0XHR9KSksXHJcblx0XHRcdH07XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRuZXdHcm91cERhdGEgPSB7XHJcblx0XHRcdFx0aWQ6IG5ld0dyb3VwSWQsXHJcblx0XHRcdFx0Z3JvdXBDb25kaXRpb246IFwiYWxsXCIsXHJcblx0XHRcdFx0ZmlsdGVyczogW10sXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZ3JvdXBJbmRleCA9IGluc2VydEFmdGVyRWxlbWVudFxyXG5cdFx0XHQ/IHRoaXMucm9vdEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5maW5kSW5kZXgoXHJcblx0XHRcdFx0XHQoZykgPT4gZy5pZCA9PT0gaW5zZXJ0QWZ0ZXJFbGVtZW50LmlkXHJcblx0XHRcdCAgKSArIDFcclxuXHRcdFx0OiB0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMubGVuZ3RoO1xyXG5cclxuXHRcdHRoaXMucm9vdEZpbHRlclN0YXRlLmZpbHRlckdyb3Vwcy5zcGxpY2UoZ3JvdXBJbmRleCwgMCwgbmV3R3JvdXBEYXRhKTtcclxuXHRcdHRoaXMuc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTtcclxuXHRcdGNvbnN0IG5ld0dyb3VwRWxlbWVudCA9IHRoaXMuY3JlYXRlRmlsdGVyR3JvdXBFbGVtZW50KG5ld0dyb3VwRGF0YSk7XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHRpbnNlcnRBZnRlckVsZW1lbnQgJiZcclxuXHRcdFx0aW5zZXJ0QWZ0ZXJFbGVtZW50LnBhcmVudE5vZGUgPT09IHRoaXMuZmlsdGVyR3JvdXBzQ29udGFpbmVyRWxcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLmZpbHRlckdyb3Vwc0NvbnRhaW5lckVsLmluc2VydEJlZm9yZShcclxuXHRcdFx0XHRuZXdHcm91cEVsZW1lbnQsXHJcblx0XHRcdFx0aW5zZXJ0QWZ0ZXJFbGVtZW50Lm5leHRTaWJsaW5nXHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR0aGlzLmZpbHRlckdyb3Vwc0NvbnRhaW5lckVsLmFwcGVuZENoaWxkKG5ld0dyb3VwRWxlbWVudCk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHQoIWdyb3VwRGF0YVRvQ2xvbmUgfHwgZ3JvdXBEYXRhVG9DbG9uZS5maWx0ZXJzLmxlbmd0aCA9PT0gMCkgJiZcclxuXHRcdFx0IWluc2VydEFmdGVyRWxlbWVudFxyXG5cdFx0KSB7XHJcblx0XHRcdHRoaXMuYWRkRmlsdGVyVG9Hcm91cChcclxuXHRcdFx0XHRuZXdHcm91cERhdGEsXHJcblx0XHRcdFx0bmV3R3JvdXBFbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuZmlsdGVycy1saXN0XCIpIGFzIEhUTUxFbGVtZW50XHJcblx0XHRcdCk7XHJcblx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRncm91cERhdGFUb0Nsb25lICYmXHJcblx0XHRcdGdyb3VwRGF0YVRvQ2xvbmUuZmlsdGVycy5sZW5ndGggPT09IDAgJiZcclxuXHRcdFx0aW5zZXJ0QWZ0ZXJFbGVtZW50XHJcblx0XHQpIHtcclxuXHRcdFx0dGhpcy5hZGRGaWx0ZXJUb0dyb3VwKFxyXG5cdFx0XHRcdG5ld0dyb3VwRGF0YSxcclxuXHRcdFx0XHRuZXdHcm91cEVsZW1lbnQucXVlcnlTZWxlY3RvcihcIi5maWx0ZXJzLWxpc3RcIikgYXMgSFRNTEVsZW1lbnRcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnVwZGF0ZUdyb3VwU2VwYXJhdG9ycygpO1xyXG5cdFx0dGhpcy5tYWtlU29ydGFibGVHcm91cHMoKTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBGaWx0ZXIgSXRlbSBNYW5hZ2VtZW50IC0tLVxyXG5cdHByaXZhdGUgY3JlYXRlRmlsdGVySXRlbUVsZW1lbnQoXHJcblx0XHRmaWx0ZXJEYXRhOiBGaWx0ZXIsXHJcblx0XHRncm91cERhdGE6IEZpbHRlckdyb3VwXHJcblx0KTogSFRNTEVsZW1lbnQge1xyXG5cdFx0Y29uc3QgbmV3RmlsdGVyRWwgPSB0aGlzLmhvc3RFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdGF0dHI6IHsgaWQ6IGZpbHRlckRhdGEuaWQgfSxcclxuXHRcdFx0Y2xzOiBbXCJmaWx0ZXItaXRlbVwiXSxcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChncm91cERhdGEuZ3JvdXBDb25kaXRpb24gPT09IFwiYW55XCIpIHtcclxuXHRcdFx0bmV3RmlsdGVyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFtcImZpbHRlci1jb25qdW5jdGlvblwiXSxcclxuXHRcdFx0XHR0ZXh0OiB0KFwiT1JcIiksXHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIGlmIChncm91cERhdGEuZ3JvdXBDb25kaXRpb24gPT09IFwibm9uZVwiKSB7XHJcblx0XHRcdG5ld0ZpbHRlckVsLmNyZWF0ZUVsKFwic3BhblwiLCB7XHJcblx0XHRcdFx0Y2xzOiBbXCJmaWx0ZXItY29uanVuY3Rpb25cIl0sXHJcblx0XHRcdFx0dGV4dDogdChcIkFORCBOT1RcIiksXHJcblx0XHRcdH0pO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0bmV3RmlsdGVyRWwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0XHRjbHM6IFtcImZpbHRlci1jb25qdW5jdGlvblwiXSxcclxuXHRcdFx0XHR0ZXh0OiB0KFwiQU5EXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBwcm9wZXJ0eVNlbGVjdCA9IG5ldyBEcm9wZG93bkNvbXBvbmVudChuZXdGaWx0ZXJFbCk7XHJcblx0XHRwcm9wZXJ0eVNlbGVjdC5zZWxlY3RFbC5hZGRDbGFzc2VzKFtcclxuXHRcdFx0XCJmaWx0ZXItcHJvcGVydHktc2VsZWN0XCIsXHJcblx0XHRcdFwiY29tcGFjdC1zZWxlY3RcIixcclxuXHRcdF0pO1xyXG5cclxuXHRcdGNvbnN0IGNvbmRpdGlvblNlbGVjdCA9IG5ldyBEcm9wZG93bkNvbXBvbmVudChuZXdGaWx0ZXJFbCk7XHJcblx0XHRjb25kaXRpb25TZWxlY3Quc2VsZWN0RWwuYWRkQ2xhc3NlcyhbXHJcblx0XHRcdFwiZmlsdGVyLWNvbmRpdGlvbi1zZWxlY3RcIixcclxuXHRcdFx0XCJjb21wYWN0LXNlbGVjdFwiLFxyXG5cdFx0XSk7XHJcblxyXG5cdFx0Y29uc3QgdmFsdWVJbnB1dCA9IG5ld0ZpbHRlckVsLmNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRjbHM6IFtcImZpbHRlci12YWx1ZS1pbnB1dFwiLCBcImNvbXBhY3QtaW5wdXRcIl0sXHJcblx0XHR9KTtcclxuXHRcdHZhbHVlSW5wdXQuaGlkZSgpO1xyXG5cclxuXHRcdHByb3BlcnR5U2VsZWN0Lm9uQ2hhbmdlKCh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRmaWx0ZXJEYXRhLnByb3BlcnR5ID0gdmFsdWU7XHJcblx0XHRcdHRoaXMuc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoZmFsc2UpOyAvLyDkuI3nq4vljbPop6blj5Hmm7TmlrBcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKHRydWUpLCAzMDApO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUZpbHRlclByb3BlcnR5T3B0aW9ucyhcclxuXHRcdFx0XHRuZXdGaWx0ZXJFbCxcclxuXHRcdFx0XHRmaWx0ZXJEYXRhLFxyXG5cdFx0XHRcdHByb3BlcnR5U2VsZWN0LFxyXG5cdFx0XHRcdGNvbmRpdGlvblNlbGVjdCxcclxuXHRcdFx0XHR2YWx1ZUlucHV0XHJcblx0XHRcdCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCB0b2dnbGVWYWx1ZUlucHV0VmlzaWJpbGl0eSA9IChcclxuXHRcdFx0Y3VycmVudENvbmQ6IHN0cmluZyxcclxuXHRcdFx0cHJvcGVydHlUeXBlOiBzdHJpbmdcclxuXHRcdCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25kaXRpb25zUmVxdWlyaW5nVmFsdWUgPSBbXHJcblx0XHRcdFx0XCJlcXVhbHNcIixcclxuXHRcdFx0XHRcImNvbnRhaW5zXCIsXHJcblx0XHRcdFx0XCJkb2VzTm90Q29udGFpblwiLFxyXG5cdFx0XHRcdFwic3RhcnRzV2l0aFwiLFxyXG5cdFx0XHRcdFwiZW5kc1dpdGhcIixcclxuXHRcdFx0XHRcImlzXCIsXHJcblx0XHRcdFx0XCJpc05vdFwiLFxyXG5cdFx0XHRcdFwiPlwiLFxyXG5cdFx0XHRcdFwiPFwiLFxyXG5cdFx0XHRcdFwiPj1cIixcclxuXHRcdFx0XHRcIjw9XCIsXHJcblx0XHRcdF07XHJcblx0XHRcdGxldCB2YWx1ZUFjdHVhbGx5TmVlZGVkID1cclxuXHRcdFx0XHRjb25kaXRpb25zUmVxdWlyaW5nVmFsdWUuaW5jbHVkZXMoY3VycmVudENvbmQpO1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHByb3BlcnR5VHlwZSA9PT0gXCJjb21wbGV0ZWRcIiAmJlxyXG5cdFx0XHRcdChjdXJyZW50Q29uZCA9PT0gXCJpc1RydWVcIiB8fCBjdXJyZW50Q29uZCA9PT0gXCJpc0ZhbHNlXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHZhbHVlQWN0dWFsbHlOZWVkZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoY3VycmVudENvbmQgPT09IFwiaXNFbXB0eVwiIHx8IGN1cnJlbnRDb25kID09PSBcImlzTm90RW1wdHlcIikge1xyXG5cdFx0XHRcdHZhbHVlQWN0dWFsbHlOZWVkZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dmFsdWVJbnB1dC5zdHlsZS5kaXNwbGF5ID0gdmFsdWVBY3R1YWxseU5lZWRlZCA/IFwiYmxvY2tcIiA6IFwibm9uZVwiO1xyXG5cdFx0XHRpZiAoIXZhbHVlQWN0dWFsbHlOZWVkZWQgJiYgZmlsdGVyRGF0YS52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0ZmlsdGVyRGF0YS52YWx1ZSA9IHVuZGVmaW5lZDtcclxuXHRcdFx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XHJcblx0XHRcdFx0dmFsdWVJbnB1dC52YWx1ZSA9IFwiXCI7XHJcblx0XHRcdH1cclxuXHRcdH07XHJcblxyXG5cdFx0Y29uZGl0aW9uU2VsZWN0Lm9uQ2hhbmdlKChuZXdDb25kaXRpb24pID0+IHtcclxuXHRcdFx0ZmlsdGVyRGF0YS5jb25kaXRpb24gPSBuZXdDb25kaXRpb247XHJcblx0XHRcdHRoaXMuc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoZmFsc2UpOyAvLyDkuI3nq4vljbPop6blj5Hmm7TmlrBcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKHRydWUpLCAzMDApO1xyXG5cdFx0XHR0b2dnbGVWYWx1ZUlucHV0VmlzaWJpbGl0eShuZXdDb25kaXRpb24sIGZpbHRlckRhdGEucHJvcGVydHkpO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0dmFsdWVJbnB1dC5zdHlsZS5kaXNwbGF5ID09PSBcIm5vbmVcIiAmJlxyXG5cdFx0XHRcdHZhbHVlSW5wdXQudmFsdWUgIT09IFwiXCJcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0Ly8gSWYgaW5wdXQgaXMgaGlkZGVuLCB2YWx1ZSBzaG91bGQgYmUgdW5kZWZpbmVkIGFzIHBlciB0b2dnbGVWYWx1ZUlucHV0VmlzaWJpbGl0eVxyXG5cdFx0XHRcdC8vIFRoaXMgcGFydCBtaWdodCBuZWVkIHJlLWV2YWx1YXRpb24gb2YgbG9naWMgaWYgZmlsdGVyRGF0YS52YWx1ZSBzaG91bGQgYmUgc2V0IGhlcmUuXHJcblx0XHRcdFx0Ly8gRm9yIG5vdywgYXNzdW1pbmcgdG9nZ2xlVmFsdWVJbnB1dFZpc2liaWxpdHkgaGFuZGxlcyBzZXR0aW5nIGZpbHRlckRhdGEudmFsdWUgY29ycmVjdGx5LlxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHR2YWx1ZUlucHV0LnZhbHVlID0gZmlsdGVyRGF0YS52YWx1ZSB8fCBcIlwiO1xyXG5cclxuXHRcdGxldCB2YWx1ZUlucHV0VGltZW91dDogTm9kZUpTLlRpbWVvdXQ7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodmFsdWVJbnB1dCwgXCJpbnB1dFwiLCAoZXZlbnQpID0+IHtcclxuXHRcdFx0ZmlsdGVyRGF0YS52YWx1ZSA9IChldmVudC50YXJnZXQgYXMgSFRNTElucHV0RWxlbWVudCkudmFsdWU7XHJcblx0XHRcdC8vIOWcqOi+k+WFpeaXtuS4jeeri+WNs+inpuWPkeWunuaXtuabtOaWsO+8jOWPquS/neWtmOeKtuaAgVxyXG5cdFx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKGZhbHNlKTtcclxuXHRcdFx0Ly8g5bu26L+f6Kem5Y+R5a6e5pe25pu05pawXHJcblx0XHRcdGNsZWFyVGltZW91dCh2YWx1ZUlucHV0VGltZW91dCk7XHJcblx0XHRcdHZhbHVlSW5wdXRUaW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0dGhpcy5zYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSh0cnVlKTtcclxuXHRcdFx0fSwgNDAwKTsgLy8gNDAwbXMg6Ziy5oqWXHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zdCByZW1vdmVGaWx0ZXJCdG4gPSBuZXcgRXh0cmFCdXR0b25Db21wb25lbnQobmV3RmlsdGVyRWwpXHJcblx0XHRcdC5zZXRJY29uKFwidHJhc2gtMlwiKVxyXG5cdFx0XHQuc2V0VG9vbHRpcCh0KFwiUmVtb3ZlIGZpbHRlclwiKSlcclxuXHRcdFx0Lm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdGdyb3VwRGF0YS5maWx0ZXJzID0gZ3JvdXBEYXRhLmZpbHRlcnMuZmlsdGVyKFxyXG5cdFx0XHRcdFx0KGYpID0+IGYuaWQgIT09IGZpbHRlckRhdGEuaWRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHRoaXMuc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTtcclxuXHRcdFx0XHRuZXdGaWx0ZXJFbC5yZW1vdmUoKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZUZpbHRlckNvbmp1bmN0aW9ucyhcclxuXHRcdFx0XHRcdG5ld0ZpbHRlckVsLnBhcmVudEVsZW1lbnQgYXMgSFRNTEVsZW1lbnQsXHJcblx0XHRcdFx0XHRncm91cERhdGEuZ3JvdXBDb25kaXRpb25cclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdHJlbW92ZUZpbHRlckJ0bi5leHRyYVNldHRpbmdzRWwuYWRkQ2xhc3NlcyhbXHJcblx0XHRcdFwicmVtb3ZlLWZpbHRlci1idG5cIixcclxuXHRcdFx0XCJjbGlja2FibGUtaWNvblwiLFxyXG5cdFx0XSk7XHJcblxyXG5cdFx0dGhpcy51cGRhdGVGaWx0ZXJQcm9wZXJ0eU9wdGlvbnMoXHJcblx0XHRcdG5ld0ZpbHRlckVsLFxyXG5cdFx0XHRmaWx0ZXJEYXRhLFxyXG5cdFx0XHRwcm9wZXJ0eVNlbGVjdCxcclxuXHRcdFx0Y29uZGl0aW9uU2VsZWN0LFxyXG5cdFx0XHR2YWx1ZUlucHV0XHJcblx0XHQpO1xyXG5cclxuXHRcdHJldHVybiBuZXdGaWx0ZXJFbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYWRkRmlsdGVyVG9Hcm91cChcclxuXHRcdGdyb3VwRGF0YTogRmlsdGVyR3JvdXAsXHJcblx0XHRmaWx0ZXJzTGlzdEVsOiBIVE1MRWxlbWVudFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgbmV3RmlsdGVySWQgPSB0aGlzLmdlbmVyYXRlSWQoKTtcclxuXHRcdGNvbnN0IG5ld0ZpbHRlckRhdGE6IEZpbHRlciA9IHtcclxuXHRcdFx0aWQ6IG5ld0ZpbHRlcklkLFxyXG5cdFx0XHRwcm9wZXJ0eTogXCJjb250ZW50XCIsXHJcblx0XHRcdGNvbmRpdGlvbjogXCJjb250YWluc1wiLFxyXG5cdFx0XHR2YWx1ZTogXCJcIixcclxuXHRcdH07XHJcblx0XHRncm91cERhdGEuZmlsdGVycy5wdXNoKG5ld0ZpbHRlckRhdGEpO1xyXG5cdFx0dGhpcy5zYXZlU3RhdGVUb0xvY2FsU3RvcmFnZSgpO1xyXG5cclxuXHRcdGNvbnN0IG5ld0ZpbHRlckVsZW1lbnQgPSB0aGlzLmNyZWF0ZUZpbHRlckl0ZW1FbGVtZW50KFxyXG5cdFx0XHRuZXdGaWx0ZXJEYXRhLFxyXG5cdFx0XHRncm91cERhdGFcclxuXHRcdCk7XHJcblx0XHRmaWx0ZXJzTGlzdEVsLmFwcGVuZENoaWxkKG5ld0ZpbHRlckVsZW1lbnQpO1xyXG5cclxuXHRcdHRoaXMudXBkYXRlRmlsdGVyQ29uanVuY3Rpb25zKGZpbHRlcnNMaXN0RWwsIGdyb3VwRGF0YS5ncm91cENvbmRpdGlvbik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUZpbHRlclByb3BlcnR5T3B0aW9ucyhcclxuXHRcdGZpbHRlckl0ZW1FbDogSFRNTEVsZW1lbnQsXHJcblx0XHRmaWx0ZXJEYXRhOiBGaWx0ZXIsXHJcblx0XHRwcm9wZXJ0eVNlbGVjdDogRHJvcGRvd25Db21wb25lbnQsXHJcblx0XHRjb25kaXRpb25TZWxlY3Q6IERyb3Bkb3duQ29tcG9uZW50LFxyXG5cdFx0dmFsdWVJbnB1dDogSFRNTElucHV0RWxlbWVudFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Y29uc3QgcHJvcGVydHkgPSBmaWx0ZXJEYXRhLnByb3BlcnR5O1xyXG5cclxuXHRcdGlmIChwcm9wZXJ0eVNlbGVjdC5zZWxlY3RFbC5vcHRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRwcm9wZXJ0eVNlbGVjdC5hZGRPcHRpb25zKHtcclxuXHRcdFx0XHRjb250ZW50OiB0KFwiQ29udGVudFwiKSxcclxuXHRcdFx0XHRzdGF0dXM6IHQoXCJTdGF0dXNcIiksXHJcblx0XHRcdFx0cHJpb3JpdHk6IHQoXCJQcmlvcml0eVwiKSxcclxuXHRcdFx0XHRkdWVEYXRlOiB0KFwiRHVlIERhdGVcIiksXHJcblx0XHRcdFx0c3RhcnREYXRlOiB0KFwiU3RhcnQgRGF0ZVwiKSxcclxuXHRcdFx0XHRzY2hlZHVsZWREYXRlOiB0KFwiU2NoZWR1bGVkIERhdGVcIiksXHJcblx0XHRcdFx0dGFnczogdChcIlRhZ3NcIiksXHJcblx0XHRcdFx0ZmlsZVBhdGg6IHQoXCJGaWxlIFBhdGhcIiksXHJcblx0XHRcdFx0cHJvamVjdDogdChcIlByb2plY3RcIiksXHJcblx0XHRcdFx0Y29tcGxldGVkOiB0KFwiQ29tcGxldGVkXCIpLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHByb3BlcnR5U2VsZWN0LnNldFZhbHVlKHByb3BlcnR5KTtcclxuXHJcblx0XHRsZXQgY29uZGl0aW9uT3B0aW9uczogeyB2YWx1ZTogc3RyaW5nOyB0ZXh0OiBzdHJpbmcgfVtdID0gW107XHJcblx0XHR2YWx1ZUlucHV0LnR5cGUgPSBcInRleHRcIjtcclxuXHJcblx0XHRzd2l0Y2ggKHByb3BlcnR5KSB7XHJcblx0XHRcdGNhc2UgXCJjb250ZW50XCI6XHJcblx0XHRcdGNhc2UgXCJmaWxlUGF0aFwiOlxyXG5cdFx0XHRjYXNlIFwic3RhdHVzXCI6XHJcblx0XHRcdGNhc2UgXCJwcm9qZWN0XCI6XHJcblx0XHRcdFx0Y29uZGl0aW9uT3B0aW9ucyA9IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiY29udGFpbnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImNvbnRhaW5zXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiZG9lc05vdENvbnRhaW5cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImRvZXMgbm90IGNvbnRhaW5cIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0eyB2YWx1ZTogXCJpc1wiLCB0ZXh0OiB0KFwiaXNcIikgfSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiaXNOb3RcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImlzIG5vdFwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcInN0YXJ0c1dpdGhcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcInN0YXJ0cyB3aXRoXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiZW5kc1dpdGhcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImVuZHMgd2l0aFwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcImlzRW1wdHlcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImlzIGVtcHR5XCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiaXNOb3RFbXB0eVwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXMgbm90IGVtcHR5XCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFwicHJpb3JpdHlcIjpcclxuXHRcdFx0XHRjb25kaXRpb25PcHRpb25zID0gW1xyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJpc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXNcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJpc05vdFwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXMgbm90XCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiaXNFbXB0eVwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXMgZW1wdHlcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJpc05vdEVtcHR5XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXCJpcyBub3QgZW1wdHlcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF07XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJkdWVEYXRlXCI6XHJcblx0XHRcdGNhc2UgXCJzdGFydERhdGVcIjpcclxuXHRcdFx0Y2FzZSBcInNjaGVkdWxlZERhdGVcIjpcclxuXHRcdFx0XHR2YWx1ZUlucHV0LnR5cGUgPSBcImRhdGVcIjtcclxuXHRcdFx0XHRjb25kaXRpb25PcHRpb25zID0gW1xyXG5cdFx0XHRcdFx0eyB2YWx1ZTogXCJpc1wiLCB0ZXh0OiB0KFwiaXNcIikgfSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiaXNOb3RcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImlzIG5vdFwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcIj5cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCI+XCIsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCI8XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IFwiPFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiPj1cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCI+PVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiPD1cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogXCI8PVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiaXNFbXB0eVwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXMgZW1wdHlcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJpc05vdEVtcHR5XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXCJpcyBub3QgZW1wdHlcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdF07XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgXCJ0YWdzXCI6XHJcblx0XHRcdFx0Y29uZGl0aW9uT3B0aW9ucyA9IFtcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiY29udGFpbnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImNvbnRhaW5zXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiZG9lc05vdENvbnRhaW5cIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImRvZXMgbm90IGNvbnRhaW5cIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJpc0VtcHR5XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXCJpcyBlbXB0eVwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcImlzTm90RW1wdHlcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImlzIG5vdCBlbXB0eVwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBcImNvbXBsZXRlZFwiOlxyXG5cdFx0XHRcdGNvbmRpdGlvbk9wdGlvbnMgPSBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcImlzVHJ1ZVwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXMgdHJ1ZVwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcImlzRmFsc2VcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImlzIGZhbHNlXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdGNvbmRpdGlvbk9wdGlvbnMgPSBbXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcImlzU2V0XCIsXHJcblx0XHRcdFx0XHRcdHRleHQ6IHQoXCJpcyBzZXRcIiksXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHR2YWx1ZTogXCJpc05vdFNldFwiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiaXMgbm90IHNldFwiKSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR7XHJcblx0XHRcdFx0XHRcdHZhbHVlOiBcImVxdWFsc1wiLFxyXG5cdFx0XHRcdFx0XHR0ZXh0OiB0KFwiZXF1YWxzXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdHtcclxuXHRcdFx0XHRcdFx0dmFsdWU6IFwiY29udGFpbnNcIixcclxuXHRcdFx0XHRcdFx0dGV4dDogdChcImNvbnRhaW5zXCIpLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRdO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbmRpdGlvblNlbGVjdC5zZWxlY3RFbC5lbXB0eSgpO1xyXG5cdFx0Y29uZGl0aW9uT3B0aW9ucy5mb3JFYWNoKChvcHQpID0+XHJcblx0XHRcdGNvbmRpdGlvblNlbGVjdC5hZGRPcHRpb24ob3B0LnZhbHVlLCBvcHQudGV4dClcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc3QgY3VycmVudFNlbGVjdGVkQ29uZGl0aW9uID0gZmlsdGVyRGF0YS5jb25kaXRpb247XHJcblx0XHRsZXQgY29uZGl0aW9uQ2hhbmdlZCA9IGZhbHNlO1xyXG5cdFx0aWYgKFxyXG5cdFx0XHRjb25kaXRpb25PcHRpb25zLnNvbWUoXHJcblx0XHRcdFx0KG9wdCkgPT4gb3B0LnZhbHVlID09PSBjdXJyZW50U2VsZWN0ZWRDb25kaXRpb25cclxuXHRcdFx0KVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbmRpdGlvblNlbGVjdC5zZXRWYWx1ZShjdXJyZW50U2VsZWN0ZWRDb25kaXRpb24pO1xyXG5cdFx0fSBlbHNlIGlmIChjb25kaXRpb25PcHRpb25zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uZGl0aW9uU2VsZWN0LnNldFZhbHVlKGNvbmRpdGlvbk9wdGlvbnNbMF0udmFsdWUpO1xyXG5cdFx0XHRmaWx0ZXJEYXRhLmNvbmRpdGlvbiA9IGNvbmRpdGlvbk9wdGlvbnNbMF0udmFsdWU7XHJcblx0XHRcdGNvbmRpdGlvbkNoYW5nZWQgPSB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGZpbmFsQ29uZGl0aW9uVmFsID0gY29uZGl0aW9uU2VsZWN0LmdldFZhbHVlKCk7XHJcblx0XHRjb25zdCBjb25kaXRpb25zUmVxdWlyaW5nVmFsdWUgPSBbXHJcblx0XHRcdFwiZXF1YWxzXCIsXHJcblx0XHRcdFwiY29udGFpbnNcIixcclxuXHRcdFx0XCJkb2VzTm90Q29udGFpblwiLFxyXG5cdFx0XHRcInN0YXJ0c1dpdGhcIixcclxuXHRcdFx0XCJlbmRzV2l0aFwiLFxyXG5cdFx0XHRcImlzXCIsXHJcblx0XHRcdFwiaXNOb3RcIixcclxuXHRcdFx0XCI+XCIsXHJcblx0XHRcdFwiPFwiLFxyXG5cdFx0XHRcIj49XCIsXHJcblx0XHRcdFwiPD1cIixcclxuXHRcdF07XHJcblx0XHRsZXQgdmFsdWVBY3R1YWxseU5lZWRlZCA9XHJcblx0XHRcdGNvbmRpdGlvbnNSZXF1aXJpbmdWYWx1ZS5pbmNsdWRlcyhmaW5hbENvbmRpdGlvblZhbCk7XHJcblx0XHRpZiAoXHJcblx0XHRcdHByb3BlcnR5ID09PSBcImNvbXBsZXRlZFwiICYmXHJcblx0XHRcdChmaW5hbENvbmRpdGlvblZhbCA9PT0gXCJpc1RydWVcIiB8fCBmaW5hbENvbmRpdGlvblZhbCA9PT0gXCJpc0ZhbHNlXCIpXHJcblx0XHQpIHtcclxuXHRcdFx0dmFsdWVBY3R1YWxseU5lZWRlZCA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0aWYgKFxyXG5cdFx0XHRmaW5hbENvbmRpdGlvblZhbCA9PT0gXCJpc0VtcHR5XCIgfHxcclxuXHRcdFx0ZmluYWxDb25kaXRpb25WYWwgPT09IFwiaXNOb3RFbXB0eVwiXHJcblx0XHQpIHtcclxuXHRcdFx0dmFsdWVBY3R1YWxseU5lZWRlZCA9IGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGxldCB2YWx1ZUNoYW5nZWQgPSBmYWxzZTtcclxuXHRcdHZhbHVlSW5wdXQuc3R5bGUuZGlzcGxheSA9IHZhbHVlQWN0dWFsbHlOZWVkZWQgPyBcImJsb2NrXCIgOiBcIm5vbmVcIjtcclxuXHRcdGlmICh2YWx1ZUFjdHVhbGx5TmVlZGVkKSB7XHJcblx0XHRcdGlmIChmaWx0ZXJEYXRhLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHR2YWx1ZUlucHV0LnZhbHVlID0gZmlsdGVyRGF0YS52YWx1ZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRpZiAodmFsdWVJbnB1dC52YWx1ZSAhPT0gXCJcIikge1xyXG5cdFx0XHRcdFx0dmFsdWVJbnB1dC52YWx1ZSA9IFwiXCI7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR2YWx1ZUlucHV0LnZhbHVlID0gXCJcIjtcclxuXHRcdFx0aWYgKGZpbHRlckRhdGEudmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdGZpbHRlckRhdGEudmFsdWUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0dmFsdWVDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChjb25kaXRpb25DaGFuZ2VkIHx8IHZhbHVlQ2hhbmdlZCkge1xyXG5cdFx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gVUkgVXBkYXRlcyAoQ29uanVuY3Rpb25zLCBTZXBhcmF0b3JzKSAtLS1cclxuXHRwcml2YXRlIHVwZGF0ZUZpbHRlckNvbmp1bmN0aW9ucyhcclxuXHRcdGZpbHRlcnNMaXN0RWw6IEhUTUxFbGVtZW50IHwgbnVsbCxcclxuXHRcdGdyb3VwQ29uZGl0aW9uOiBcImFsbFwiIHwgXCJhbnlcIiB8IFwibm9uZVwiID0gXCJhbGxcIlxyXG5cdCk6IHZvaWQge1xyXG5cdFx0aWYgKCFmaWx0ZXJzTGlzdEVsKSByZXR1cm47XHJcblx0XHRjb25zdCBmaWx0ZXJzID0gZmlsdGVyc0xpc3RFbC5xdWVyeVNlbGVjdG9yQWxsKFwiLmZpbHRlci1pdGVtXCIpO1xyXG5cdFx0ZmlsdGVycy5mb3JFYWNoKChmaWx0ZXIsIGluZGV4KSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmp1bmN0aW9uRWxlbWVudCA9IGZpbHRlci5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFwiLmZpbHRlci1jb25qdW5jdGlvblwiXHJcblx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGlmIChjb25qdW5jdGlvbkVsZW1lbnQpIHtcclxuXHRcdFx0XHRpZiAoaW5kZXggIT09IDApIHtcclxuXHRcdFx0XHRcdGNvbmp1bmN0aW9uRWxlbWVudC5zaG93KCk7XHJcblx0XHRcdFx0XHRpZiAoZ3JvdXBDb25kaXRpb24gPT09IFwiYW55XCIpIHtcclxuXHRcdFx0XHRcdFx0Y29uanVuY3Rpb25FbGVtZW50LnRleHRDb250ZW50ID0gdChcIk9SXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChncm91cENvbmRpdGlvbiA9PT0gXCJub25lXCIpIHtcclxuXHRcdFx0XHRcdFx0Y29uanVuY3Rpb25FbGVtZW50LnRleHRDb250ZW50ID0gdChcIk5PUlwiKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGNvbmp1bmN0aW9uRWxlbWVudC50ZXh0Q29udGVudCA9IHQoXCJBTkRcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbmp1bmN0aW9uRWxlbWVudC5oaWRlKCk7XHJcblx0XHRcdFx0XHRpZiAoZ3JvdXBDb25kaXRpb24gPT09IFwiYW55XCIpIHtcclxuXHRcdFx0XHRcdFx0Y29uanVuY3Rpb25FbGVtZW50LnRleHRDb250ZW50ID0gdChcIk9SXCIpO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChncm91cENvbmRpdGlvbiA9PT0gXCJub25lXCIpIHtcclxuXHRcdFx0XHRcdFx0Y29uanVuY3Rpb25FbGVtZW50LnRleHRDb250ZW50ID0gdChcIk5PUlwiKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGNvbmp1bmN0aW9uRWxlbWVudC50ZXh0Q29udGVudCA9IHQoXCJBTkRcIik7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdXBkYXRlR3JvdXBTZXBhcmF0b3JzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5maWx0ZXJHcm91cHNDb250YWluZXJFbFxyXG5cdFx0XHQ/LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuZmlsdGVyLWdyb3VwLXNlcGFyYXRvci1jb250YWluZXJcIilcclxuXHRcdFx0LmZvckVhY2goKHNlcCkgPT4gc2VwLnJlbW92ZSgpKTtcclxuXHJcblx0XHRjb25zdCBncm91cHMgPSBBcnJheS5mcm9tKFxyXG5cdFx0XHR0aGlzLmZpbHRlckdyb3Vwc0NvbnRhaW5lckVsPy5jaGlsZHJlbiB8fCBbXVxyXG5cdFx0KS5maWx0ZXIoKGNoaWxkKSA9PiBjaGlsZC5jbGFzc0xpc3QuY29udGFpbnMoXCJmaWx0ZXItZ3JvdXBcIikpO1xyXG5cclxuXHRcdGlmIChncm91cHMubGVuZ3RoID4gMSkge1xyXG5cdFx0XHRncm91cHMuZm9yRWFjaCgoZ3JvdXAsIGluZGV4KSA9PiB7XHJcblx0XHRcdFx0aWYgKGluZGV4IDwgZ3JvdXBzLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHNlcGFyYXRvckNvbnRhaW5lciA9IGNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRcdFx0Y2xzOiBcImZpbHRlci1ncm91cC1zZXBhcmF0b3ItY29udGFpbmVyXCIsXHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdGNvbnN0IHNlcGFyYXRvciA9IHNlcGFyYXRvckNvbnRhaW5lci5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdFx0XHRjbHM6IFwiZmlsdGVyLWdyb3VwLXNlcGFyYXRvclwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3Qgcm9vdENvbmQgPSB0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9uO1xyXG5cdFx0XHRcdFx0bGV0IHNlcGFyYXRvclRleHQgPSB0KFwiT1JcIik7XHJcblx0XHRcdFx0XHRpZiAocm9vdENvbmQgPT09IFwiYWxsXCIpIHNlcGFyYXRvclRleHQgPSB0KFwiQU5EXCIpO1xyXG5cdFx0XHRcdFx0ZWxzZSBpZiAocm9vdENvbmQgPT09IFwibm9uZVwiKSBzZXBhcmF0b3JUZXh0ID0gdChcIkFORCBOT1RcIik7XHJcblxyXG5cdFx0XHRcdFx0c2VwYXJhdG9yLnRleHRDb250ZW50ID0gc2VwYXJhdG9yVGV4dC50b1VwcGVyQ2FzZSgpO1xyXG5cdFx0XHRcdFx0Z3JvdXAucGFyZW50Tm9kZT8uaW5zZXJ0QmVmb3JlKFxyXG5cdFx0XHRcdFx0XHRzZXBhcmF0b3JDb250YWluZXIsXHJcblx0XHRcdFx0XHRcdGdyb3VwLm5leHRTaWJsaW5nXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gU29ydGFibGVKUyBJbnRlZ3JhdGlvbiAtLS1cclxuXHRwcml2YXRlIG1ha2VTb3J0YWJsZUdyb3VwcygpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmdyb3Vwc1NvcnRhYmxlKSB7XHJcblx0XHRcdHRoaXMuZ3JvdXBzU29ydGFibGUuZGVzdHJveSgpO1xyXG5cdFx0XHR0aGlzLmdyb3Vwc1NvcnRhYmxlID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdFx0aWYgKCF0aGlzLmZpbHRlckdyb3Vwc0NvbnRhaW5lckVsKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5ncm91cHNTb3J0YWJsZSA9IG5ldyBTb3J0YWJsZSh0aGlzLmZpbHRlckdyb3Vwc0NvbnRhaW5lckVsLCB7XHJcblx0XHRcdGFuaW1hdGlvbjogMTUwLFxyXG5cdFx0XHRoYW5kbGU6IFwiLmRyYWctaGFuZGxlXCIsXHJcblx0XHRcdGZpbHRlcjogXCIuZmlsdGVyLWdyb3VwLXNlcGFyYXRvci1jb250YWluZXJcIixcclxuXHRcdFx0cHJldmVudE9uRmlsdGVyOiB0cnVlLFxyXG5cdFx0XHRnaG9zdENsYXNzOiBcImRyYWdnaW5nLXBsYWNlaG9sZGVyXCIsXHJcblx0XHRcdG9uRW5kOiAoZXZ0OiBFdmVudCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHNvcnRhYmxlRXZlbnQgPSBldnQgYXMgYW55O1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHNvcnRhYmxlRXZlbnQub2xkRHJhZ2dhYmxlSW5kZXggPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHRcdFx0c29ydGFibGVFdmVudC5uZXdEcmFnZ2FibGVJbmRleCA9PT0gdW5kZWZpbmVkXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cclxuXHRcdFx0XHRjb25zdCBtb3ZlZEdyb3VwID0gdGhpcy5yb290RmlsdGVyU3RhdGUuZmlsdGVyR3JvdXBzLnNwbGljZShcclxuXHRcdFx0XHRcdHNvcnRhYmxlRXZlbnQub2xkRHJhZ2dhYmxlSW5kZXgsXHJcblx0XHRcdFx0XHQxXHJcblx0XHRcdFx0KVswXTtcclxuXHRcdFx0XHR0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMuc3BsaWNlKFxyXG5cdFx0XHRcdFx0c29ydGFibGVFdmVudC5uZXdEcmFnZ2FibGVJbmRleCxcclxuXHRcdFx0XHRcdDAsXHJcblx0XHRcdFx0XHRtb3ZlZEdyb3VwXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XHJcblx0XHRcdFx0dGhpcy51cGRhdGVHcm91cFNlcGFyYXRvcnMoKTtcclxuXHRcdFx0fSxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0Ly8gLS0tIEZpbHRlciBTdGF0ZSBNYW5hZ2VtZW50IC0tLVxyXG5cdHByaXZhdGUgdXBkYXRlRmlsdGVyU3RhdGUoXHJcblx0XHRmaWx0ZXJHcm91cHM6IEZpbHRlckdyb3VwW10sXHJcblx0XHRyb290Q29uZGl0aW9uOiBcImFsbFwiIHwgXCJhbnlcIiB8IFwibm9uZVwiXHJcblx0KTogdm9pZCB7XHJcblx0XHR0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5maWx0ZXJHcm91cHMgPSBmaWx0ZXJHcm91cHM7XHJcblx0XHR0aGlzLnJvb3RGaWx0ZXJTdGF0ZS5yb290Q29uZGl0aW9uID0gcm9vdENvbmRpdGlvbjtcclxuXHRcdHRoaXMuc2F2ZVN0YXRlVG9Mb2NhbFN0b3JhZ2UoKTtcclxuXHR9XHJcblxyXG5cdC8vIFB1YmxpYyBtZXRob2QgdG8gZ2V0IGN1cnJlbnQgZmlsdGVyIHN0YXRlXHJcblx0cHVibGljIGdldEZpbHRlclN0YXRlKCk6IFJvb3RGaWx0ZXJTdGF0ZSB7XHJcblx0XHQvLyBIYW5kbGUgY2FzZSB3aGVyZSByb290RmlsdGVyU3RhdGUgbWlnaHQgbm90IGJlIGluaXRpYWxpemVkXHJcblx0XHRpZiAoIXRoaXMucm9vdEZpbHRlclN0YXRlKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0cm9vdENvbmRpdGlvbjogXCJhbnlcIixcclxuXHRcdFx0XHRmaWx0ZXJHcm91cHM6IFtdLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodGhpcy5yb290RmlsdGVyU3RhdGUpKTtcclxuXHR9XHJcblxyXG5cdC8vIFB1YmxpYyBtZXRob2QgdG8gbG9hZCBmaWx0ZXIgc3RhdGVcclxuXHRwdWJsaWMgbG9hZEZpbHRlclN0YXRlKHN0YXRlOiBSb290RmlsdGVyU3RhdGUpOiB2b2lkIHtcclxuXHRcdC8vIFNhZmVseSBkZXN0cm95IHNvcnRhYmxlIGluc3RhbmNlc1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0aWYgKHRoaXMuZ3JvdXBzU29ydGFibGUpIHtcclxuXHRcdFx0XHR0aGlzLmdyb3Vwc1NvcnRhYmxlLmRlc3Ryb3koKTtcclxuXHRcdFx0XHR0aGlzLmdyb3Vwc1NvcnRhYmxlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJFcnJvciBkZXN0cm95aW5nIGdyb3VwcyBzb3J0YWJsZTpcIiwgZXJyb3IpO1xyXG5cdFx0XHR0aGlzLmdyb3Vwc1NvcnRhYmxlID0gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNhZmVseSBkZXN0cm95IGZpbHRlciBsaXN0IHNvcnRhYmxlIGluc3RhbmNlc1xyXG5cdFx0dGhpcy5maWx0ZXJHcm91cHNDb250YWluZXJFbFxyXG5cdFx0XHQ/LnF1ZXJ5U2VsZWN0b3JBbGwoXCIuZmlsdGVycy1saXN0XCIpXHJcblx0XHRcdC5mb3JFYWNoKChsaXN0RWwpID0+IHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0aWYgKChsaXN0RWwgYXMgYW55KS5zb3J0YWJsZUluc3RhbmNlKSB7XHJcblx0XHRcdFx0XHRcdChcclxuXHRcdFx0XHRcdFx0XHQobGlzdEVsIGFzIGFueSkuc29ydGFibGVJbnN0YW5jZSBhcyBTb3J0YWJsZVxyXG5cdFx0XHRcdFx0XHQpLmRlc3Ryb3koKTtcclxuXHRcdFx0XHRcdFx0KGxpc3RFbCBhcyBhbnkpLnNvcnRhYmxlSW5zdGFuY2UgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XCJFcnJvciBkZXN0cm95aW5nIGZpbHRlciBsaXN0IHNvcnRhYmxlOlwiLFxyXG5cdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdChsaXN0RWwgYXMgYW55KS5zb3J0YWJsZUluc3RhbmNlID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0dGhpcy5yb290RmlsdGVyU3RhdGUgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHN0YXRlKSk7XHJcblx0XHR0aGlzLnNhdmVTdGF0ZVRvTG9jYWxTdG9yYWdlKCk7XHJcblxyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdC8vIC0tLSBMb2NhbCBTdG9yYWdlIE1hbmFnZW1lbnQgLS0tXHJcblx0cHJpdmF0ZSBzYXZlU3RhdGVUb0xvY2FsU3RvcmFnZShcclxuXHRcdHRyaWdnZXJSZWFsdGltZVVwZGF0ZTogYm9vbGVhbiA9IHRydWVcclxuXHQpOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmFwcCkge1xyXG5cdFx0XHR0aGlzLmFwcC5zYXZlTG9jYWxTdG9yYWdlKFxyXG5cdFx0XHRcdHRoaXMubGVhZklkXHJcblx0XHRcdFx0XHQ/IGB0YXNrLWdlbml1cy12aWV3LWZpbHRlci0ke3RoaXMubGVhZklkfWBcclxuXHRcdFx0XHRcdDogXCJ0YXNrLWdlbml1cy12aWV3LWZpbHRlclwiLFxyXG5cdFx0XHRcdHRoaXMucm9vdEZpbHRlclN0YXRlXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyDlj6rmnInlnKjpnIDopoHlrp7ml7bmm7TmlrDml7bmiY3op6blj5Hkuovku7ZcclxuXHRcdFx0aWYgKHRyaWdnZXJSZWFsdGltZVVwZGF0ZSkge1xyXG5cdFx0XHRcdC8vIOinpuWPkei/h+a7pOWZqOWPmOabtOS6i+S7tu+8jOS8oOmAkuW9k+WJjeeahOi/h+a7pOWZqOeKtuaAgVxyXG5cdFx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XCJ0YXNrLWdlbml1czpmaWx0ZXItY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0dGhpcy5yb290RmlsdGVyU3RhdGUsXHJcblx0XHRcdFx0XHR0aGlzLmxlYWZJZCB8fCB1bmRlZmluZWRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyAtLS0gRmlsdGVyIENvbmZpZ3VyYXRpb24gTWFuYWdlbWVudCAtLS1cclxuXHRwcml2YXRlIG9wZW5TYXZlQ29uZmlnTW9kYWwoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMucGx1Z2luKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgbW9kYWwgPSBuZXcgRmlsdGVyQ29uZmlnTW9kYWwoXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLnBsdWdpbixcclxuXHRcdFx0XCJzYXZlXCIsXHJcblx0XHRcdHRoaXMuZ2V0RmlsdGVyU3RhdGUoKSxcclxuXHRcdFx0KGNvbmZpZykgPT4ge1xyXG5cdFx0XHRcdC8vIE9wdGlvbmFsOiBIYW5kbGUgc3VjY2Vzc2Z1bCBzYXZlXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJGaWx0ZXIgY29uZmlndXJhdGlvbiBzYXZlZDpcIiwgY29uZmlnLm5hbWUpO1xyXG5cdFx0XHR9XHJcblx0XHQpO1xyXG5cdFx0bW9kYWwub3BlbigpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBvcGVuTG9hZENvbmZpZ01vZGFsKCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLnBsdWdpbikgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IG1vZGFsID0gbmV3IEZpbHRlckNvbmZpZ01vZGFsKFxyXG5cdFx0XHR0aGlzLmFwcCxcclxuXHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdFwibG9hZFwiLFxyXG5cdFx0XHR1bmRlZmluZWQsXHJcblx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0KGNvbmZpZykgPT4ge1xyXG5cdFx0XHRcdC8vIExvYWQgdGhlIGNvbmZpZ3VyYXRpb25cclxuXHRcdFx0XHR0aGlzLmxvYWRGaWx0ZXJTdGF0ZShjb25maWcuZmlsdGVyU3RhdGUpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiRmlsdGVyIGNvbmZpZ3VyYXRpb24gbG9hZGVkOlwiLCBjb25maWcubmFtZSk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHRtb2RhbC5vcGVuKCk7XHJcblx0fVxyXG59XHJcbiJdfQ==