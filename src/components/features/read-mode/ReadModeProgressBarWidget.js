import { Component, debounce, } from "obsidian";
import { shouldHideProgressBarInPreview } from "@/utils";
import { formatProgressText } from '@/editor-extensions/ui-widgets/progress-bar-widget';
import { checkIfParentElementHasGoalFormat, extractTaskAndGoalInfoReadMode, getCustomTotalGoalReadMode, } from "@/core/goal/read-mode";
function groupElementsByParent(childrenElements) {
    const parentMap = new Map();
    childrenElements.forEach((child) => {
        const parent = child.parentElement;
        if (parent) {
            if (parentMap.has(parent)) {
                parentMap.get(parent).push(child);
            }
            else {
                parentMap.set(parent, [child]);
            }
        }
    });
    const result = [];
    parentMap.forEach((children, parent) => {
        result.push({ parentElement: parent, childrenElement: children });
    });
    return result;
}
// Group tasks by their heading sections
function groupTasksByHeading(element) {
    var _a;
    const taskItems = element.findAll(".task-list-item");
    const headings = element.findAll("h1, h2, h3, h4, h5, h6");
    const tasksByHeading = new Map();
    // Initialize with an entry for tasks not under any heading
    tasksByHeading.set(null, []);
    // If no headings, return all tasks as not under any heading
    if (headings.length === 0) {
        tasksByHeading.set(null, taskItems);
        return tasksByHeading;
    }
    // Group tasks by their preceding heading
    let currentHeading = null;
    // Sort all elements (headings and tasks) by their position in the document
    const allElements = [...headings, ...taskItems].sort((a, b) => {
        const posA = a.getBoundingClientRect().top;
        const posB = b.getBoundingClientRect().top;
        return posA - posB;
    });
    for (const el of allElements) {
        if (el.matches("h1, h2, h3, h4, h5, h6")) {
            currentHeading = el;
            // Initialize array for this heading if not already done
            if (!tasksByHeading.has(currentHeading)) {
                tasksByHeading.set(currentHeading, []);
            }
        }
        else if (el.matches(".task-list-item")) {
            // Add task to its heading group
            (_a = tasksByHeading.get(currentHeading)) === null || _a === void 0 ? void 0 : _a.push(el);
        }
    }
    return tasksByHeading;
}
function loadProgressbar(plugin, groupedElements, type) {
    var _a, _b;
    for (let group of groupedElements) {
        if (group.parentElement.parentElement &&
            ((_a = group.parentElement) === null || _a === void 0 ? void 0 : _a.parentElement.hasClass("task-list-item"))) {
            const progressBar = new ProgressBar(plugin, group, type).onload();
            const previousSibling = group.parentElement.previousElementSibling;
            if (previousSibling && previousSibling.tagName === "P") {
                // @ts-ignore
                if ((_b = plugin.app.plugins.getPlugin("dataview")) === null || _b === void 0 ? void 0 : _b._loaded) {
                    group.parentElement.parentElement.insertBefore(progressBar, group.parentElement);
                }
                else {
                    previousSibling.appendChild(progressBar);
                }
            }
            else {
                group.parentElement.parentElement.insertBefore(progressBar, group.parentElement);
            }
        }
    }
}
// Add progress bars to headings
function addHeadingProgressBars(plugin, tasksByHeading, type) {
    if (!plugin.settings.addTaskProgressBarToHeading)
        return;
    tasksByHeading.forEach((tasks, heading) => {
        // Skip if heading is null or tasks array is empty
        if (!heading || tasks.length === 0)
            return;
        // Create a group element structure for the progress bar
        const group = {
            parentElement: heading,
            childrenElement: tasks,
        };
        // Create and append the progress bar to the heading
        const progressBar = new ProgressBar(plugin, group, type).onload();
        heading.appendChild(progressBar);
    });
}
export function updateProgressBarInElement({ plugin, element, ctx, }) {
    var _a, _b;
    // Check if progress bars should be hidden based on settings
    if (shouldHideProgressBarInPreview(plugin, ctx)) {
        return;
    }
    // 检查是否需要根据heading显示progress bar
    if ((_a = plugin.settings.showProgressBarBasedOnHeading) === null || _a === void 0 ? void 0 : _a.trim()) {
        const sectionInfo = ctx.getSectionInfo(element);
        console.log(sectionInfo);
        if (sectionInfo) {
            // Read the original text to get the content of the current section
            const lines = sectionInfo.text.split("\n");
            // Find the nearest heading above the section start line
            let nearestHeadingText = null;
            let nearestHeadingPos = -1;
            // Find the nearest heading above the section start line
            for (let i = sectionInfo.lineStart; i >= 0; i--) {
                const line = lines[i];
                const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
                if (headingMatch) {
                    nearestHeadingText = line.trim();
                    nearestHeadingPos = i;
                    break;
                }
            }
            // If there is a heading, check if it is in the showProgressBarBasedOnHeading list
            if (nearestHeadingText) {
                const allowedHeadings = plugin.settings.showProgressBarBasedOnHeading
                    .split(",")
                    .map((h) => h.trim());
                if (!allowedHeadings.includes(nearestHeadingText)) {
                    // Not in the allowed heading list, add no-progress-bar class
                    element.addClass("no-progress-bar");
                    return;
                }
            }
            else {
                element.addClass("no-progress-bar");
            }
        }
    }
    // Handle heading elements directly
    if (plugin.settings.addTaskProgressBarToHeading &&
        element.children[0] &&
        element.children[0].matches("h1, h2, h3, h4, h5, h6")) {
        // Skip if this heading already has a progress bar
        if (element.find(".cm-task-progress-bar")) {
            return;
        }
        // Get section info for this heading
        const sectionInfo = ctx.getSectionInfo(element);
        if (sectionInfo) {
            // Parse the section text to find tasks
            // Get text from the section start line until the next heading of same level or higher
            const lines = sectionInfo.text.split("\n");
            const sectionLines = [];
            const headingText = lines[sectionInfo.lineStart];
            const headingLevel = headingText.match(/^(#{1,6})\s/);
            if (!headingLevel) {
                return;
            }
            const headingNumber = headingLevel[1].length;
            // Start from the heading line and collect all lines until next heading of same or higher level
            let inSection = false;
            for (const line of lines.slice(sectionInfo.lineStart)) {
                // Check if this is a heading line
                const headingMatch = line.match(/^(#{1,6})\s/);
                if (headingMatch) {
                    const currentHeadingLevel = headingMatch[1].length;
                    // If we're already in the section and find a heading of same or higher level, stop
                    if (inSection && currentHeadingLevel <= headingNumber) {
                        break;
                    }
                }
                // Start collecting after we've seen the initial heading
                if (!inSection) {
                    inSection = true;
                }
                sectionLines.push(line);
            }
            // 如果开启了showProgressBarBasedOnHeading设置，检查heading是否在设置列表中
            if ((_b = plugin.settings.showProgressBarBasedOnHeading) === null || _b === void 0 ? void 0 : _b.trim()) {
                const allowedHeadings = plugin.settings.showProgressBarBasedOnHeading
                    .split(",")
                    .map((h) => h.trim());
                if (!allowedHeadings.includes(headingText.trim())) {
                    // 不在允许的heading列表中，添加no-progress-bar类
                    element.addClass("no-progress-bar");
                    return;
                }
            }
            // Filter for task lines
            const taskLines = sectionLines.filter((line) => {
                const trimmed = line.trim();
                // Match both - [ ] and * [ ] task formats
                return trimmed.match(/^([-*+]|\\d+\\.)\s*\[(.)\]/) !== null;
            });
            if (taskLines.length > 0) {
                // Create a virtual task list for processing
                const taskElements = [];
                // Create task list items for each task found
                for (const taskLine of taskLines) {
                    const taskEl = createEl("li", { cls: "task-list-item" });
                    // Extract the task mark to properly set data-task attribute
                    const markMatch = taskLine.match(/\[(.)\]/);
                    if (markMatch && markMatch[1]) {
                        const mark = markMatch[1];
                        taskEl.setAttribute("data-task", mark);
                        // Create a checkbox element for proper structure
                        const checkbox = createEl("input", {
                            cls: "task-list-item-checkbox",
                            type: "checkbox",
                        });
                        // Set checkbox checked state based on completion mark
                        const completedMarks = plugin.settings.taskStatuses.completed.split("|");
                        if (completedMarks.includes(mark)) {
                            checkbox.checked = true;
                        }
                        taskEl.prepend(checkbox);
                    }
                    // Extract the task text (everything after the checkbox)
                    const taskText = taskLine.replace(/^([-*+]|\\d+\\.)\s*\[(.)\]\s*/, "");
                    taskEl.appendChild(createSpan({ text: taskText }));
                    taskElements.push(taskEl);
                }
                // Create group structure for the progress bar
                const group = {
                    parentElement: element.children[0],
                    childrenElement: taskElements,
                };
                // Create and append the progress bar
                const progressBar = new ProgressBar(plugin, group, "normal", {
                    sectionInfo: sectionInfo,
                    ctx: ctx,
                    element: element,
                }).onload();
                element.children[0].appendChild(progressBar);
            }
        }
    }
    // Process task lists (original logic)
    if (element.find("ul.contains-task-list")) {
        const elements = element.findAll(".task-list-item");
        const groupedElements = groupElementsByParent(elements);
        loadProgressbar(plugin, groupedElements, "normal");
        // Add heading progress bars if enabled in settings
        if (plugin.settings.addTaskProgressBarToHeading) {
            const tasksByHeading = groupTasksByHeading(element);
            addHeadingProgressBars(plugin, tasksByHeading, "normal");
        }
    }
    // Process ordered lists with tasks
    else if (element.find("ol.contains-task-list")) {
        const elements = element.findAll(".task-list-item");
        const groupedElements = groupElementsByParent(elements);
        loadProgressbar(plugin, groupedElements, "normal");
        // Add heading progress bars if enabled in settings
        if (plugin.settings.addTaskProgressBarToHeading) {
            const tasksByHeading = groupTasksByHeading(element);
            addHeadingProgressBars(plugin, tasksByHeading, "normal");
        }
    }
    else if (element.closest(".dataview-container")) {
        const parentElement = element.closest(".dataview-container");
        if (!parentElement)
            return;
        if (parentElement.getAttribute("data-task-progress-bar") === "true")
            return;
        const elements = parentElement.findAll(".task-list-item");
        const groupedElements = groupElementsByParent(elements);
        loadProgressbar(plugin, groupedElements, "dataview");
        // Add heading progress bars if enabled in settings
        if (plugin.settings.addTaskProgressBarToHeading) {
            const tasksByHeading = groupTasksByHeading(parentElement);
            addHeadingProgressBars(plugin, tasksByHeading, "dataview");
        }
        parentElement.setAttribute("data-task-progress-bar", "true");
    }
}
class ProgressBar extends Component {
    constructor(plugin, group, type, info) {
        super();
        this.type = type;
        this.debounceUpdateFromModifiedFile = debounce(() => {
            this.updateFromModifiedFile();
        }, 200);
        this.plugin = plugin;
        this.group = group;
        this.info = info;
        this.completed = 0;
        this.total = 0;
        this.inProgress = 0;
        this.abandoned = 0;
        this.notStarted = 0;
        this.planned = 0;
        if (type === "dataview") {
            this.updateCompletedAndTotalDataview();
        }
        else {
            this.updateCompletedAndTotal();
        }
        // Set up event handlers
        for (let el of this.group.childrenElement) {
            if (this.type === "normal") {
                el.on("click", "input", () => {
                    setTimeout(() => {
                        // Update this progress bar
                        this.updateCompletedAndTotal();
                        this.changePercentage();
                        this.changeNumber();
                        // If this is a heading progress bar, we need to refresh the entire view
                        // to update all related task progress bars
                        if (this.group.parentElement.matches("h1, h2, h3, h4, h5, h6")) {
                            const container = this.group.parentElement.closest(".markdown-reading-view");
                            if (container) {
                                // Force refresh of the view by triggering a layout change
                                container.hide();
                                setTimeout(() => {
                                    container.show();
                                }, 10);
                            }
                        }
                    }, 200);
                });
            }
            else if (this.type === "dataview") {
                this.registerDomEvent(el, "mousedown", (ev) => {
                    if (!ev.target)
                        return;
                    if (ev.target.tagName === "INPUT") {
                        setTimeout(() => {
                            // Update this progress bar
                            this.updateCompletedAndTotalDataview();
                            this.changePercentage();
                            this.changeNumber();
                            // If this is a heading progress bar, we need to refresh the entire view
                            // to update all related task progress bars
                            if (this.group.parentElement.matches("h1, h2, h3, h4, h5, h6")) {
                                const container = this.group.parentElement.closest(".markdown-reading-view");
                                if (container) {
                                    // Force refresh of the view by triggering a layout change
                                    container.hide();
                                    setTimeout(() => {
                                        container.show();
                                    }, 10);
                                }
                            }
                        }, 200);
                    }
                });
            }
        }
        // Set up file monitoring
        this.setupFileMonitoring();
    }
    setupFileMonitoring() {
        var _a;
        if (!this.info)
            return;
        const infoFile = (_a = this.info.ctx) === null || _a === void 0 ? void 0 : _a.sourcePath;
        if (!infoFile)
            return;
        this.registerEvent(this.plugin.app.vault.on("modify", (file) => {
            if (infoFile === file.path) {
                // Instead of just unloading, update the progress bar with new data
                this.debounceUpdateFromModifiedFile();
            }
        }));
    }
    updateFromModifiedFile() {
        var _a, _b, _c;
        if (!this.info ||
            !this.info.ctx ||
            !this.info.element ||
            !this.info.sectionInfo) {
            // If missing any required info, just unload the old component
            this.unload();
            return;
        }
        const { ctx, element, sectionInfo } = this.info;
        // Get updated section info
        const updatedSectionInfo = ctx.getSectionInfo(element);
        if (!updatedSectionInfo) {
            this.unload();
            return;
        }
        // Update the stored section info
        this.info.sectionInfo = updatedSectionInfo;
        // Parse the section text to find tasks (similar to the code in updateProgressBarInElement)
        const lines = updatedSectionInfo.text.split("\n");
        const sectionLines = [];
        const headingText = lines[updatedSectionInfo.lineStart];
        const headingLevel = headingText.match(/^(#{1,6})\s/);
        if (!headingLevel) {
            this.unload();
            return;
        }
        const headingNumber = headingLevel[1].length;
        // Start from the heading line and collect all lines until next heading of same or higher level
        let inSection = false;
        for (const line of lines.slice(updatedSectionInfo.lineStart)) {
            // Check if this is a heading line
            const headingMatch = line.match(/^(#{1,6})\s/);
            if (headingMatch) {
                const currentHeadingLevel = headingMatch[1].length;
                // If we're already in the section and find a heading of same or higher level, stop
                if (inSection && currentHeadingLevel <= headingNumber) {
                    break;
                }
            }
            // Start collecting after we've seen the initial heading
            if (!inSection) {
                inSection = true;
            }
            sectionLines.push(line);
        }
        // Filter for task lines
        const taskLines = sectionLines.filter((line) => {
            const trimmed = line.trim();
            // Match both - [ ] and * [ ] task formats
            return trimmed.match(/^([-*+]|\\d+\\.)\s*\[(.)\]/) !== null;
        });
        if (taskLines.length === 0) {
            // No tasks found, remove the progress bar
            this.unload();
            return;
        }
        // Create updated task elements
        const taskElements = [];
        // Create task list items for each task found
        for (const taskLine of taskLines) {
            const taskEl = createEl("li", { cls: "task-list-item" });
            // Extract the task mark to properly set data-task attribute
            const markMatch = taskLine.match(/\[(.)\]/);
            if (markMatch && markMatch[1]) {
                const mark = markMatch[1];
                taskEl.setAttribute("data-task", mark);
                // Create a checkbox element for proper structure
                const checkbox = createEl("input", {
                    cls: "task-list-item-checkbox",
                    type: "checkbox",
                });
                // Set checkbox checked state based on completion mark
                const completedMarks = this.plugin.settings.taskStatuses.completed.split("|");
                if (completedMarks.includes(mark)) {
                    checkbox.checked = true;
                }
                taskEl.prepend(checkbox);
            }
            // Extract the task text (everything after the checkbox)
            const taskText = taskLine.replace(/^([-*+]|\\d+\\.)\s*\[(.)\]\s*/, "");
            taskEl.appendChild(createSpan({ text: taskText }));
            taskElements.push(taskEl);
        }
        // Update the group with new task elements
        this.group.childrenElement = taskElements;
        // Update progress bar stats
        this.updateCompletedAndTotal();
        // If the number of tasks with different statuses has changed,
        // we may need to recreate UI elements
        const needsUIRecreation = (this.inProgress > 0 && !this.inProgressEl) ||
            (this.inProgress === 0 && this.inProgressEl) ||
            (this.abandoned > 0 && !this.abandonedEl) ||
            (this.abandoned === 0 && this.abandonedEl) ||
            (this.planned > 0 && !this.plannedEl) ||
            (this.planned === 0 && this.plannedEl);
        if (needsUIRecreation) {
            // Clean up old elements
            if (this.progressBarEl && this.progressBarEl.parentElement) {
                const parent = this.progressBarEl.parentElement;
                // this.progressBarEl.remove();
                (_a = this.progressBarEl) === null || _a === void 0 ? void 0 : _a.detach();
                // Unload the current component to ensure proper cleanup
                this.onunload();
                // Create new progress bar
                const newProgressBar = this.onload();
                // Remove old element after unloading
                this.progressBarEl.remove();
                parent.appendChild(newProgressBar);
                if (((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.progressBarDisplayMode) === "text" ||
                    ((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.progressBarDisplayMode) === "none") {
                    this.progressBackGroundEl.hide();
                }
            }
        }
        else {
            // Just update values on existing elements
            this.changePercentage();
            this.changeNumber();
        }
    }
    getTaskStatusFromDataTask(dataTask) {
        var _a, _b, _c;
        // Priority 1: If useOnlyCountMarks is enabled
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.useOnlyCountMarks) {
            const onlyCountMarks = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.onlyCountTaskMarks.split("|");
            if (onlyCountMarks.includes(dataTask)) {
                return "completed";
            }
            else {
                // If using onlyCountMarks and the mark is not in the list,
                // determine which other status it belongs to
                return this.determineNonCompletedStatusFromDataTask(dataTask);
            }
        }
        // Priority 2: If the mark is in excludeTaskMarks
        if (((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.excludeTaskMarks) &&
            this.plugin.settings.excludeTaskMarks.includes(dataTask)) {
            // Excluded marks are considered not started
            return "notStarted";
        }
        // Priority 3: Check against specific task statuses
        return this.determineTaskStatusFromDataTask(dataTask);
    }
    getTaskStatus(text) {
        var _a, _b, _c;
        const markMatch = text.match(/\[(.)]/);
        if (!markMatch || !markMatch[1]) {
            return "notStarted";
        }
        const mark = markMatch[1];
        // Priority 1: If useOnlyCountMarks is enabled
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.useOnlyCountMarks) {
            const onlyCountMarks = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.onlyCountTaskMarks.split("|");
            if (onlyCountMarks.includes(mark)) {
                return "completed";
            }
            else {
                // If using onlyCountMarks and the mark is not in the list,
                // determine which other status it belongs to
                return this.determineNonCompletedStatus(mark);
            }
        }
        // Priority 2: If the mark is in excludeTaskMarks
        if (((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.excludeTaskMarks) &&
            this.plugin.settings.excludeTaskMarks.includes(mark)) {
            // Excluded marks are considered not started
            return "notStarted";
        }
        // Priority 3: Check against specific task statuses
        return this.determineTaskStatus(mark);
    }
    determineNonCompletedStatusFromDataTask(dataTask) {
        var _a, _b, _c, _d, _e, _f, _g;
        const inProgressMarks = ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.taskStatuses.inProgress) === null || _b === void 0 ? void 0 : _b.split("|")) || [
            "-",
            "/",
        ];
        if (inProgressMarks.includes(dataTask)) {
            return "inProgress";
        }
        const abandonedMarks = ((_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.taskStatuses.abandoned) === null || _d === void 0 ? void 0 : _d.split("|")) || [">"];
        if (abandonedMarks.includes(dataTask)) {
            return "abandoned";
        }
        const plannedMarks = ((_f = (_e = this.plugin) === null || _e === void 0 ? void 0 : _e.settings.taskStatuses.planned) === null || _f === void 0 ? void 0 : _f.split("|")) || ["?"];
        if (plannedMarks.includes(dataTask)) {
            return "planned";
        }
        // If the mark doesn't match any specific category, use the countOtherStatusesAs setting
        return (((_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings.countOtherStatusesAs) || "notStarted");
    }
    determineNonCompletedStatus(mark) {
        var _a, _b, _c, _d, _e, _f, _g;
        const inProgressMarks = ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.taskStatuses.inProgress) === null || _b === void 0 ? void 0 : _b.split("|")) || [
            "-",
            "/",
        ];
        if (inProgressMarks.includes(mark)) {
            return "inProgress";
        }
        const abandonedMarks = ((_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.taskStatuses.abandoned) === null || _d === void 0 ? void 0 : _d.split("|")) || [">"];
        if (abandonedMarks.includes(mark)) {
            return "abandoned";
        }
        const plannedMarks = ((_f = (_e = this.plugin) === null || _e === void 0 ? void 0 : _e.settings.taskStatuses.planned) === null || _f === void 0 ? void 0 : _f.split("|")) || ["?"];
        if (plannedMarks.includes(mark)) {
            return "planned";
        }
        // If the mark doesn't match any specific category, use the countOtherStatusesAs setting
        return (((_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings.countOtherStatusesAs) || "notStarted");
    }
    determineTaskStatusFromDataTask(dataTask) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const completedMarks = ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.taskStatuses.completed) === null || _b === void 0 ? void 0 : _b.split("|")) || [
            "x",
            "X",
        ];
        if (completedMarks.includes(dataTask)) {
            return "completed";
        }
        const inProgressMarks = ((_d = (_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.taskStatuses.inProgress) === null || _d === void 0 ? void 0 : _d.split("|")) || [
            "-",
            "/",
        ];
        if (inProgressMarks.includes(dataTask)) {
            return "inProgress";
        }
        const abandonedMarks = ((_f = (_e = this.plugin) === null || _e === void 0 ? void 0 : _e.settings.taskStatuses.abandoned) === null || _f === void 0 ? void 0 : _f.split("|")) || [">"];
        if (abandonedMarks.includes(dataTask)) {
            return "abandoned";
        }
        const plannedMarks = ((_h = (_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings.taskStatuses.planned) === null || _h === void 0 ? void 0 : _h.split("|")) || ["?"];
        if (plannedMarks.includes(dataTask)) {
            return "planned";
        }
        // If not matching any specific status, check if it's a not-started mark
        const notStartedMarks = ((_k = (_j = this.plugin) === null || _j === void 0 ? void 0 : _j.settings.taskStatuses.notStarted) === null || _k === void 0 ? void 0 : _k.split("|")) || [" "];
        if (notStartedMarks.includes(dataTask)) {
            return "notStarted";
        }
        // If the mark doesn't match any specific category, use the countOtherStatusesAs setting
        return (((_l = this.plugin) === null || _l === void 0 ? void 0 : _l.settings.countOtherStatusesAs) || "notStarted");
    }
    determineTaskStatus(mark) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const completedMarks = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.taskStatuses.completed.split("|");
        if (completedMarks.includes(mark)) {
            return "completed";
        }
        const inProgressMarks = (_c = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.taskStatuses.inProgress) === null || _c === void 0 ? void 0 : _c.split("|");
        if (inProgressMarks.includes(mark)) {
            return "inProgress";
        }
        const abandonedMarks = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.taskStatuses.abandoned) === null || _e === void 0 ? void 0 : _e.split("|");
        if (abandonedMarks.includes(mark)) {
            return "abandoned";
        }
        const plannedMarks = (_g = (_f = this.plugin) === null || _f === void 0 ? void 0 : _f.settings.taskStatuses.planned) === null || _g === void 0 ? void 0 : _g.split("|");
        if (plannedMarks.includes(mark)) {
            return "planned";
        }
        // If not matching any specific status, check if it's a not-started mark
        const notStartedMarks = (_j = (_h = this.plugin) === null || _h === void 0 ? void 0 : _h.settings.taskStatuses.notStarted) === null || _j === void 0 ? void 0 : _j.split("|");
        if (notStartedMarks.includes(mark)) {
            return "notStarted";
        }
        // Default fallback - any unrecognized mark is considered not started
        return "notStarted";
    }
    isCompletedTaskFromDataTask(dataTask) {
        var _a, _b, _c, _d;
        // Priority 1: If useOnlyCountMarks is enabled, only count tasks with specified marks
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.useOnlyCountMarks) {
            const onlyCountMarks = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.onlyCountTaskMarks.split("|");
            return onlyCountMarks.includes(dataTask);
        }
        // Priority 2: If the mark is in excludeTaskMarks, don't count it
        if (((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.excludeTaskMarks) &&
            this.plugin.settings.excludeTaskMarks.includes(dataTask)) {
            return false;
        }
        // Priority 3: Check against the task statuses
        // We consider a task "completed" if it has a mark from the "completed" status
        const completedMarks = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.taskStatuses.completed.split("|");
        // Return true if the mark is in the completedMarks array
        return completedMarks.includes(dataTask);
    }
    isCompletedTask(text) {
        var _a, _b, _c, _d;
        const markMatch = text.match(/\[(.)]/);
        if (!markMatch || !markMatch[1]) {
            return false;
        }
        const mark = markMatch[1];
        // Priority 1: If useOnlyCountMarks is enabled, only count tasks with specified marks
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.useOnlyCountMarks) {
            const onlyCountMarks = (_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.onlyCountTaskMarks.split("|");
            return onlyCountMarks.includes(mark);
        }
        // Priority 2: If the mark is in excludeTaskMarks, don't count it
        if (((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.excludeTaskMarks) &&
            this.plugin.settings.excludeTaskMarks.includes(mark)) {
            return false;
        }
        // Priority 3: Check against the task statuses
        // We consider a task "completed" if it has a mark from the "completed" status
        const completedMarks = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.taskStatuses.completed.split("|");
        // Return true if the mark is in the completedMarks array
        return completedMarks.includes(mark);
    }
    updateCompletedAndTotalDataview() {
        var _a, _b, _c, _d;
        let completed = 0;
        let inProgress = 0;
        let abandoned = 0;
        let planned = 0;
        let notStarted = 0;
        let total = 0;
        // Get all parent-child relationships to check for indentation
        const parentChildMap = new Map();
        for (let element of this.group.childrenElement) {
            const parent = element.parentElement;
            if (parent) {
                if (!parentChildMap.has(parent)) {
                    parentChildMap.set(parent, []);
                }
                (_a = parentChildMap.get(parent)) === null || _a === void 0 ? void 0 : _a.push(element);
            }
        }
        for (let element of this.group.childrenElement) {
            const checkboxElement = element.querySelector(".task-list-item-checkbox");
            if (!checkboxElement)
                continue;
            // Skip if this is a sublevel task and countSubLevel is disabled
            if (!((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.countSubLevel)) {
                // Check if this task is a subtask by examining its position and parent-child relationships
                const parent = element.parentElement;
                if (parent && parent.classList.contains("task-list-item")) {
                    // This is a subtask (nested under another task), so skip it
                    continue;
                }
                // If this is a heading progress bar, only count top-level tasks
                if (this.group.parentElement.matches("h1, h2, h3, h4, h5, h6")) {
                    // Get indentation by checking the DOM structure or task content
                    const liElement = element.closest("li");
                    if (liElement) {
                        const parentList = liElement.parentElement;
                        const grandParentListItem = (_c = parentList === null || parentList === void 0 ? void 0 : parentList.parentElement) === null || _c === void 0 ? void 0 : _c.closest("li");
                        if (grandParentListItem) {
                            // This is a nested task, so skip it
                            continue;
                        }
                    }
                }
            }
            total++;
            // First try to get status from data-task attribute
            const dataTask = element.getAttribute("data-task");
            if (dataTask) {
                const status = this.getTaskStatusFromDataTask(dataTask);
                if (this.isCompletedTaskFromDataTask(dataTask)) {
                    completed++;
                }
                else if (status === "inProgress") {
                    inProgress++;
                }
                else if (status === "abandoned") {
                    abandoned++;
                }
                else if (status === "planned") {
                    planned++;
                }
                else if (status === "notStarted") {
                    notStarted++;
                }
            }
            else {
                // Fallback to the text content method
                const textContent = ((_d = element.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || "";
                // Extract the task mark
                const markMatch = textContent.match(/\[(.)]/);
                if (markMatch && markMatch[1]) {
                    const status = this.getTaskStatus(textContent);
                    // Count based on status
                    if (this.isCompletedTask(textContent)) {
                        completed++;
                    }
                    else if (status === "inProgress") {
                        inProgress++;
                    }
                    else if (status === "abandoned") {
                        abandoned++;
                    }
                    else if (status === "planned") {
                        planned++;
                    }
                    else if (status === "notStarted") {
                        notStarted++;
                    }
                }
                else {
                    // Fallback to checking if the checkbox is checked
                    const checkbox = checkboxElement;
                    if (checkbox.checked) {
                        completed++;
                    }
                    else {
                        notStarted++;
                    }
                }
            }
        }
        this.completed = completed;
        this.inProgress = inProgress;
        this.abandoned = abandoned;
        this.planned = planned;
        this.notStarted = notStarted;
        this.total = total;
    }
    countTasks(allTasks) {
        var _a, _b, _c;
        let completed = 0;
        let inProgress = 0;
        let abandoned = 0;
        let planned = 0;
        let notStarted = 0;
        let total = 0;
        for (let element of allTasks) {
            // const isParentCustomGoal: boolean = checkIfParentElementHasGoalFormat(element.parentElement)
            let subTaskGoal = null;
            const useTaskGoal = ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.allowCustomProgressGoal) &&
                checkIfParentElementHasGoalFormat((_b = element.parentElement) === null || _b === void 0 ? void 0 : _b.parentElement);
            const checkboxElement = element.querySelector(".task-list-item-checkbox");
            if (!checkboxElement)
                continue;
            // First try to get status from data-task attribute
            const dataTask = element.getAttribute("data-task");
            if (dataTask) {
                const status = this.getTaskStatusFromDataTask(dataTask);
                if (useTaskGoal)
                    subTaskGoal = extractTaskAndGoalInfoReadMode(element);
                if (this.isCompletedTaskFromDataTask(dataTask)) {
                    if (!useTaskGoal)
                        completed++;
                    if (subTaskGoal !== null)
                        completed += subTaskGoal;
                }
                else if (status === "inProgress") {
                    if (!useTaskGoal)
                        inProgress++;
                    if (useTaskGoal && subTaskGoal !== null)
                        inProgress += subTaskGoal;
                }
                else if (status === "abandoned") {
                    if (!useTaskGoal)
                        abandoned++;
                    if (useTaskGoal && subTaskGoal !== null)
                        abandoned += subTaskGoal;
                }
                else if (status === "planned") {
                    if (!useTaskGoal)
                        planned++;
                    if (useTaskGoal && subTaskGoal !== null)
                        planned += subTaskGoal;
                }
                else if (status === "notStarted") {
                    if (!useTaskGoal)
                        notStarted++;
                    if (useTaskGoal && subTaskGoal !== null)
                        notStarted += subTaskGoal;
                }
            }
            else {
                // Fallback to the text content method
                const textContent = ((_c = element.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || "";
                const checkbox = checkboxElement;
                // Extract the task mark
                const markMatch = textContent.match(/\[(.)]/);
                if (markMatch && markMatch[1]) {
                    const status = this.getTaskStatus(textContent);
                    // Count based on status
                    if (this.isCompletedTask(textContent)) {
                        completed++;
                    }
                    else if (status === "inProgress") {
                        inProgress++;
                    }
                    else if (status === "abandoned") {
                        abandoned++;
                    }
                    else if (status === "planned") {
                        planned++;
                    }
                    else if (status === "notStarted") {
                        notStarted++;
                    }
                }
                else if (checkbox.checked) {
                    completed++;
                }
                else {
                    notStarted++;
                }
            }
            total++;
        }
        return { completed, inProgress, abandoned, planned, notStarted, total };
    }
    updateCompletedAndTotal() {
        var _a, _b, _c, _d, _e;
        let total = 0;
        // Get all parent-child relationships to check for indentation
        const parentChildMap = new Map();
        for (let element of this.group.childrenElement) {
            const parent = element.parentElement;
            if (parent) {
                if (!parentChildMap.has(parent)) {
                    parentChildMap.set(parent, []);
                }
                (_a = parentChildMap.get(parent)) === null || _a === void 0 ? void 0 : _a.push(element);
            }
        }
        const allTasks = [];
        // Check if the element is a top-level task or if countSubLevel is enabled
        for (let element of this.group.childrenElement) {
            const checkboxElement = element.querySelector(".task-list-item-checkbox");
            // Get the parent of the current element
            if (!checkboxElement)
                continue;
            allTasks.push(element);
            // Skip if this is a sublevel task and countSubLevel is disabled
            if (!((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.countSubLevel)) {
                // Check if this task is a subtask by examining its position and parent-child relationships
                const parent = element.parentElement;
                if (parent && parent.classList.contains("task-list-item")) {
                    // This is a subtask (nested under another task), so skip it
                    continue;
                }
                // If this is a heading progress bar, only count top-level tasks
                if (this.group.parentElement.matches("h1, h2, h3, h4, h5, h6")) {
                    // Get indentation by checking the DOM structure or task content
                    const liElement = element.closest("li");
                    if (liElement) {
                        const parentList = liElement.parentElement;
                        const grandParentListItem = (_c = parentList === null || parentList === void 0 ? void 0 : parentList.parentElement) === null || _c === void 0 ? void 0 : _c.closest("li");
                        if (grandParentListItem) {
                            // This is a nested task, so skip it
                            continue;
                        }
                    }
                }
            }
            else if ((_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.countSubLevel) {
                const childrenTasks = element.findAll(".task-list-item");
                for (let child of childrenTasks) {
                    total++;
                    allTasks.push(child);
                }
            }
            const parentGoal = getCustomTotalGoalReadMode((_e = element.parentElement) === null || _e === void 0 ? void 0 : _e.parentElement);
            if (parentGoal)
                total = parentGoal;
            else
                total++;
            // total++;
        }
        const { completed, inProgress, abandoned, planned, notStarted } = this.countTasks(allTasks);
        this.completed = completed;
        this.inProgress = inProgress;
        this.abandoned = abandoned;
        this.planned = planned;
        this.notStarted = notStarted;
        this.total = total;
    }
    changePercentage() {
        if (this.total === 0)
            return;
        const completedPercentage = Math.round((this.completed / this.total) * 10000) / 100;
        const inProgressPercentage = Math.round((this.inProgress / this.total) * 10000) / 100;
        const abandonedPercentage = Math.round((this.abandoned / this.total) * 10000) / 100;
        const plannedPercentage = Math.round((this.planned / this.total) * 10000) / 100;
        // Set the completed part
        this.progressEl.style.width = completedPercentage + "%";
        // Set the in-progress part (if it exists)
        if (this.inProgressEl) {
            this.inProgressEl.style.width = inProgressPercentage + "%";
            this.inProgressEl.style.left = completedPercentage + "%";
        }
        // Set the abandoned part (if it exists)
        if (this.abandonedEl) {
            this.abandonedEl.style.width = abandonedPercentage + "%";
            this.abandonedEl.style.left =
                completedPercentage + inProgressPercentage + "%";
        }
        // Set the planned part (if it exists)
        if (this.plannedEl) {
            this.plannedEl.style.width = plannedPercentage + "%";
            this.plannedEl.style.left =
                completedPercentage +
                    inProgressPercentage +
                    abandonedPercentage +
                    "%";
        }
        // Update the class based on progress percentage
        let progressClass = "progress-bar-inline";
        switch (true) {
            case completedPercentage === 0:
                progressClass += " progress-bar-inline-empty";
                break;
            case completedPercentage > 0 && completedPercentage < 25:
                progressClass += " progress-bar-inline-0";
                break;
            case completedPercentage >= 25 && completedPercentage < 50:
                progressClass += " progress-bar-inline-1";
                break;
            case completedPercentage >= 50 && completedPercentage < 75:
                progressClass += " progress-bar-inline-2";
                break;
            case completedPercentage >= 75 && completedPercentage < 100:
                progressClass += " progress-bar-inline-3";
                break;
            case completedPercentage >= 100:
                progressClass += " progress-bar-inline-complete";
                break;
        }
        // Add classes for special states
        if (inProgressPercentage > 0) {
            progressClass += " has-in-progress";
        }
        if (abandonedPercentage > 0) {
            progressClass += " has-abandoned";
        }
        if (plannedPercentage > 0) {
            progressClass += " has-planned";
        }
        this.progressEl.className = progressClass;
    }
    changeNumber() {
        var _a, _b;
        if (((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.progressBarDisplayMode) === "text" ||
            ((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.progressBarDisplayMode) === "both") {
            const text = formatProgressText({
                completed: this.completed,
                total: this.total,
                inProgress: this.inProgress,
                abandoned: this.abandoned,
                notStarted: this.notStarted,
                planned: this.planned,
            }, this.plugin);
            if (!this.numberEl) {
                this.numberEl = this.progressBarEl.createEl("div", {
                    cls: "progress-status",
                    text: text,
                });
            }
            else {
                this.numberEl.innerText = text;
            }
        }
    }
    onload() {
        var _a, _b, _c, _d, _e, _f;
        this.progressBarEl = createSpan(((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.progressBarDisplayMode) === "both" ||
            ((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.progressBarDisplayMode) === "text"
            ? "cm-task-progress-bar with-number"
            : "cm-task-progress-bar");
        this.progressBackGroundEl = this.progressBarEl.createEl("div", {
            cls: "progress-bar-inline-background",
        });
        // Create elements for each status type
        this.progressEl = this.progressBackGroundEl.createEl("div", {
            cls: "progress-bar-inline progress-completed",
        });
        // Only create these elements if we have tasks of these types
        if (this.inProgress > 0) {
            this.inProgressEl = this.progressBackGroundEl.createEl("div", {
                cls: "progress-bar-inline progress-in-progress",
            });
        }
        if (this.abandoned > 0) {
            this.abandonedEl = this.progressBackGroundEl.createEl("div", {
                cls: "progress-bar-inline progress-abandoned",
            });
        }
        if (this.planned > 0) {
            this.plannedEl = this.progressBackGroundEl.createEl("div", {
                cls: "progress-bar-inline progress-planned",
            });
        }
        if (((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.progressBarDisplayMode) === "both" ||
            ((_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.progressBarDisplayMode) === "text") {
            // 使用 formatProgressText 函数生成进度文本
            const text = formatProgressText({
                completed: this.completed,
                total: this.total,
                inProgress: this.inProgress,
                abandoned: this.abandoned,
                notStarted: this.notStarted,
                planned: this.planned,
            }, this.plugin);
            this.numberEl = this.progressBarEl.createEl("div", {
                cls: "progress-status",
                text: text,
            });
        }
        this.changePercentage();
        if (((_e = this.plugin) === null || _e === void 0 ? void 0 : _e.settings.progressBarDisplayMode) === "text" ||
            ((_f = this.plugin) === null || _f === void 0 ? void 0 : _f.settings.progressBarDisplayMode) === "none") {
            this.progressBackGroundEl.hide();
        }
        this.plugin.addChild(this);
        return this.progressBarEl;
    }
    onunload() {
        super.onunload();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVhZE1vZGVQcm9ncmVzc0JhcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlJlYWRNb2RlUHJvZ3Jlc3NCYXJXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUNOLFNBQVMsRUFDVCxRQUFRLEdBSVIsTUFBTSxVQUFVLENBQUM7QUFDbEIsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3hGLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsOEJBQThCLEVBQzlCLDBCQUEwQixHQUMxQixNQUFNLHVCQUF1QixDQUFDO0FBTy9CLFNBQVMscUJBQXFCLENBQUMsZ0JBQStCO0lBQzdELE1BQU0sU0FBUyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7SUFFNUIsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBa0IsRUFBRSxFQUFFO1FBQy9DLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUM7UUFFbkMsSUFBSSxNQUFNLEVBQUU7WUFDWCxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBQzFCLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ2xDO2lCQUFNO2dCQUNOLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzthQUMvQjtTQUNEO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxNQUFNLE1BQU0sR0FBbUIsRUFBRSxDQUFDO0lBQ2xDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLGFBQWEsRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxD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Q0FBRSxRQUFRLENBQUMsc0JBQXNCLE1BQUssTUFBTSxFQUN0RDtZQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztTQUNqQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTNCLE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUMzQixDQUFDO0lBRUQsUUFBUTtRQUNQLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gJ0AvaW5kZXgnO1xyXG5pbXBvcnQge1xyXG5cdENvbXBvbmVudCxcclxuXHRkZWJvdW5jZSxcclxuXHRNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0LFxyXG5cdE1hcmtkb3duU2VjdGlvbkluZm9ybWF0aW9uLFxyXG5cdFRGaWxlLFxyXG59IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBzaG91bGRIaWRlUHJvZ3Jlc3NCYXJJblByZXZpZXcgfSBmcm9tIFwiQC91dGlsc1wiO1xyXG5pbXBvcnQgeyBmb3JtYXRQcm9ncmVzc1RleHQgfSBmcm9tICdAL2VkaXRvci1leHRlbnNpb25zL3VpLXdpZGdldHMvcHJvZ3Jlc3MtYmFyLXdpZGdldCc7XHJcbmltcG9ydCB7XHJcblx0Y2hlY2tJZlBhcmVudEVsZW1lbnRIYXNHb2FsRm9ybWF0LFxyXG5cdGV4dHJhY3RUYXNrQW5kR29hbEluZm9SZWFkTW9kZSxcclxuXHRnZXRDdXN0b21Ub3RhbEdvYWxSZWFkTW9kZSxcclxufSBmcm9tIFwiQC9jb3JlL2dvYWwvcmVhZC1tb2RlXCI7XHJcblxyXG5pbnRlcmZhY2UgR3JvdXBFbGVtZW50IHtcclxuXHRwYXJlbnRFbGVtZW50OiBIVE1MRWxlbWVudDtcclxuXHRjaGlsZHJlbkVsZW1lbnQ6IEhUTUxFbGVtZW50W107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdyb3VwRWxlbWVudHNCeVBhcmVudChjaGlsZHJlbkVsZW1lbnRzOiBIVE1MRWxlbWVudFtdKSB7XHJcblx0Y29uc3QgcGFyZW50TWFwID0gbmV3IE1hcCgpO1xyXG5cclxuXHRjaGlsZHJlbkVsZW1lbnRzLmZvckVhY2goKGNoaWxkOiBIVE1MRWxlbWVudCkgPT4ge1xyXG5cdFx0Y29uc3QgcGFyZW50ID0gY2hpbGQucGFyZW50RWxlbWVudDtcclxuXHJcblx0XHRpZiAocGFyZW50KSB7XHJcblx0XHRcdGlmIChwYXJlbnRNYXAuaGFzKHBhcmVudCkpIHtcclxuXHRcdFx0XHRwYXJlbnRNYXAuZ2V0KHBhcmVudCkucHVzaChjaGlsZCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cGFyZW50TWFwLnNldChwYXJlbnQsIFtjaGlsZF0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdGNvbnN0IHJlc3VsdDogR3JvdXBFbGVtZW50W10gPSBbXTtcclxuXHRwYXJlbnRNYXAuZm9yRWFjaCgoY2hpbGRyZW4sIHBhcmVudCkgPT4ge1xyXG5cdFx0cmVzdWx0LnB1c2goeyBwYXJlbnRFbGVtZW50OiBwYXJlbnQsIGNoaWxkcmVuRWxlbWVudDogY2hpbGRyZW4gfSk7XHJcblx0fSk7XHJcblx0cmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuLy8gR3JvdXAgdGFza3MgYnkgdGhlaXIgaGVhZGluZyBzZWN0aW9uc1xyXG5mdW5jdGlvbiBncm91cFRhc2tzQnlIZWFkaW5nKFxyXG5cdGVsZW1lbnQ6IEhUTUxFbGVtZW50XHJcbik6IE1hcDxIVE1MRWxlbWVudCB8IG51bGwsIEhUTUxFbGVtZW50W10+IHtcclxuXHRjb25zdCB0YXNrSXRlbXMgPSBlbGVtZW50LmZpbmRBbGwoXCIudGFzay1saXN0LWl0ZW1cIik7XHJcblx0Y29uc3QgaGVhZGluZ3MgPSBlbGVtZW50LmZpbmRBbGwoXCJoMSwgaDIsIGgzLCBoNCwgaDUsIGg2XCIpO1xyXG5cdGNvbnN0IHRhc2tzQnlIZWFkaW5nID0gbmV3IE1hcDxIVE1MRWxlbWVudCB8IG51bGwsIEhUTUxFbGVtZW50W10+KCk7XHJcblxyXG5cdC8vIEluaXRpYWxpemUgd2l0aCBhbiBlbnRyeSBmb3IgdGFza3Mgbm90IHVuZGVyIGFueSBoZWFkaW5nXHJcblx0dGFza3NCeUhlYWRpbmcuc2V0KG51bGwsIFtdKTtcclxuXHJcblx0Ly8gSWYgbm8gaGVhZGluZ3MsIHJldHVybiBhbGwgdGFza3MgYXMgbm90IHVuZGVyIGFueSBoZWFkaW5nXHJcblx0aWYgKGhlYWRpbmdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0dGFza3NCeUhlYWRpbmcuc2V0KG51bGwsIHRhc2tJdGVtcyk7XHJcblx0XHRyZXR1cm4gdGFza3NCeUhlYWRpbmc7XHJcblx0fVxyXG5cclxuXHQvLyBHcm91cCB0YXNrcyBieSB0aGVpciBwcmVjZWRpbmcgaGVhZGluZ1xyXG5cdGxldCBjdXJyZW50SGVhZGluZzogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Ly8gU29ydCBhbGwgZWxlbWVudHMgKGhlYWRpbmdzIGFuZCB0YXNrcykgYnkgdGhlaXIgcG9zaXRpb24gaW4gdGhlIGRvY3VtZW50XHJcblx0Y29uc3QgYWxsRWxlbWVudHMgPSBbLi4uaGVhZGluZ3MsIC4uLnRhc2tJdGVtc10uc29ydCgoYSwgYikgPT4ge1xyXG5cdFx0Y29uc3QgcG9zQSA9IGEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xyXG5cdFx0Y29uc3QgcG9zQiA9IGIuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xyXG5cdFx0cmV0dXJuIHBvc0EgLSBwb3NCO1xyXG5cdH0pO1xyXG5cclxuXHRmb3IgKGNvbnN0IGVsIG9mIGFsbEVsZW1lbnRzKSB7XHJcblx0XHRpZiAoZWwubWF0Y2hlcyhcImgxLCBoMiwgaDMsIGg0LCBoNSwgaDZcIikpIHtcclxuXHRcdFx0Y3VycmVudEhlYWRpbmcgPSBlbDtcclxuXHRcdFx0Ly8gSW5pdGlhbGl6ZSBhcnJheSBmb3IgdGhpcyBoZWFkaW5nIGlmIG5vdCBhbHJlYWR5IGRvbmVcclxuXHRcdFx0aWYgKCF0YXNrc0J5SGVhZGluZy5oYXMoY3VycmVudEhlYWRpbmcpKSB7XHJcblx0XHRcdFx0dGFza3NCeUhlYWRpbmcuc2V0KGN1cnJlbnRIZWFkaW5nLCBbXSk7XHJcblx0XHRcdH1cclxuXHRcdH0gZWxzZSBpZiAoZWwubWF0Y2hlcyhcIi50YXNrLWxpc3QtaXRlbVwiKSkge1xyXG5cdFx0XHQvLyBBZGQgdGFzayB0byBpdHMgaGVhZGluZyBncm91cFxyXG5cdFx0XHR0YXNrc0J5SGVhZGluZy5nZXQoY3VycmVudEhlYWRpbmcpPy5wdXNoKGVsKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiB0YXNrc0J5SGVhZGluZztcclxufVxyXG5cclxuZnVuY3Rpb24gbG9hZFByb2dyZXNzYmFyKFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdGdyb3VwZWRFbGVtZW50czogR3JvdXBFbGVtZW50W10sXHJcblx0dHlwZTogXCJkYXRhdmlld1wiIHwgXCJub3JtYWxcIlxyXG4pIHtcclxuXHRmb3IgKGxldCBncm91cCBvZiBncm91cGVkRWxlbWVudHMpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0Z3JvdXAucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50ICYmXHJcblx0XHRcdGdyb3VwLnBhcmVudEVsZW1lbnQ/LnBhcmVudEVsZW1lbnQuaGFzQ2xhc3MoXCJ0YXNrLWxpc3QtaXRlbVwiKVxyXG5cdFx0KSB7XHJcblx0XHRcdGNvbnN0IHByb2dyZXNzQmFyID0gbmV3IFByb2dyZXNzQmFyKHBsdWdpbiwgZ3JvdXAsIHR5cGUpLm9ubG9hZCgpO1xyXG5cclxuXHRcdFx0Y29uc3QgcHJldmlvdXNTaWJsaW5nID0gZ3JvdXAucGFyZW50RWxlbWVudC5wcmV2aW91c0VsZW1lbnRTaWJsaW5nO1xyXG5cdFx0XHRpZiAocHJldmlvdXNTaWJsaW5nICYmIHByZXZpb3VzU2libGluZy50YWdOYW1lID09PSBcIlBcIikge1xyXG5cdFx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0XHRpZiAocGx1Z2luLmFwcC5wbHVnaW5zLmdldFBsdWdpbihcImRhdGF2aWV3XCIpPy5fbG9hZGVkKSB7XHJcblx0XHRcdFx0XHRncm91cC5wYXJlbnRFbGVtZW50LnBhcmVudEVsZW1lbnQuaW5zZXJ0QmVmb3JlKFxyXG5cdFx0XHRcdFx0XHRwcm9ncmVzc0JhcixcclxuXHRcdFx0XHRcdFx0Z3JvdXAucGFyZW50RWxlbWVudFxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0cHJldmlvdXNTaWJsaW5nLmFwcGVuZENoaWxkKHByb2dyZXNzQmFyKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Z3JvdXAucGFyZW50RWxlbWVudC5wYXJlbnRFbGVtZW50Lmluc2VydEJlZm9yZShcclxuXHRcdFx0XHRcdHByb2dyZXNzQmFyLFxyXG5cdFx0XHRcdFx0Z3JvdXAucGFyZW50RWxlbWVudFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vIEFkZCBwcm9ncmVzcyBiYXJzIHRvIGhlYWRpbmdzXHJcbmZ1bmN0aW9uIGFkZEhlYWRpbmdQcm9ncmVzc0JhcnMoXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0dGFza3NCeUhlYWRpbmc6IE1hcDxIVE1MRWxlbWVudCB8IG51bGwsIEhUTUxFbGVtZW50W10+LFxyXG5cdHR5cGU6IFwiZGF0YXZpZXdcIiB8IFwibm9ybWFsXCJcclxuKSB7XHJcblx0aWYgKCFwbHVnaW4uc2V0dGluZ3MuYWRkVGFza1Byb2dyZXNzQmFyVG9IZWFkaW5nKSByZXR1cm47XHJcblx0dGFza3NCeUhlYWRpbmcuZm9yRWFjaCgodGFza3MsIGhlYWRpbmcpID0+IHtcclxuXHRcdC8vIFNraXAgaWYgaGVhZGluZyBpcyBudWxsIG9yIHRhc2tzIGFycmF5IGlzIGVtcHR5XHJcblx0XHRpZiAoIWhlYWRpbmcgfHwgdGFza3MubGVuZ3RoID09PSAwKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGEgZ3JvdXAgZWxlbWVudCBzdHJ1Y3R1cmUgZm9yIHRoZSBwcm9ncmVzcyBiYXJcclxuXHRcdGNvbnN0IGdyb3VwOiBHcm91cEVsZW1lbnQgPSB7XHJcblx0XHRcdHBhcmVudEVsZW1lbnQ6IGhlYWRpbmcsXHJcblx0XHRcdGNoaWxkcmVuRWxlbWVudDogdGFza3MsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIENyZWF0ZSBhbmQgYXBwZW5kIHRoZSBwcm9ncmVzcyBiYXIgdG8gdGhlIGhlYWRpbmdcclxuXHRcdGNvbnN0IHByb2dyZXNzQmFyID0gbmV3IFByb2dyZXNzQmFyKHBsdWdpbiwgZ3JvdXAsIHR5cGUpLm9ubG9hZCgpO1xyXG5cdFx0aGVhZGluZy5hcHBlbmRDaGlsZChwcm9ncmVzc0Jhcik7XHJcblx0fSk7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVQcm9ncmVzc0JhckluRWxlbWVudCh7XHJcblx0cGx1Z2luLFxyXG5cdGVsZW1lbnQsXHJcblx0Y3R4LFxyXG59OiB7XHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0ZWxlbWVudDogSFRNTEVsZW1lbnQ7XHJcblx0Y3R4OiBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0O1xyXG59KSB7XHJcblx0Ly8gQ2hlY2sgaWYgcHJvZ3Jlc3MgYmFycyBzaG91bGQgYmUgaGlkZGVuIGJhc2VkIG9uIHNldHRpbmdzXHJcblx0aWYgKHNob3VsZEhpZGVQcm9ncmVzc0JhckluUHJldmlldyhwbHVnaW4sIGN0eCkpIHtcclxuXHRcdHJldHVybjtcclxuXHR9XHJcblxyXG5cdC8vIOajgOafpeaYr+WQpumcgOimgeagueaNrmhlYWRpbmfmmL7npLpwcm9ncmVzcyBiYXJcclxuXHRpZiAocGx1Z2luLnNldHRpbmdzLnNob3dQcm9ncmVzc0JhckJhc2VkT25IZWFkaW5nPy50cmltKCkpIHtcclxuXHRcdGNvbnN0IHNlY3Rpb25JbmZvID0gY3R4LmdldFNlY3Rpb25JbmZvKGVsZW1lbnQpO1xyXG5cdFx0Y29uc29sZS5sb2coc2VjdGlvbkluZm8pO1xyXG5cdFx0aWYgKHNlY3Rpb25JbmZvKSB7XHJcblx0XHRcdC8vIFJlYWQgdGhlIG9yaWdpbmFsIHRleHQgdG8gZ2V0IHRoZSBjb250ZW50IG9mIHRoZSBjdXJyZW50IHNlY3Rpb25cclxuXHRcdFx0Y29uc3QgbGluZXMgPSBzZWN0aW9uSW5mby50ZXh0LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgbmVhcmVzdCBoZWFkaW5nIGFib3ZlIHRoZSBzZWN0aW9uIHN0YXJ0IGxpbmVcclxuXHRcdFx0bGV0IG5lYXJlc3RIZWFkaW5nVGV4dCA9IG51bGw7XHJcblx0XHRcdGxldCBuZWFyZXN0SGVhZGluZ1BvcyA9IC0xO1xyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgbmVhcmVzdCBoZWFkaW5nIGFib3ZlIHRoZSBzZWN0aW9uIHN0YXJ0IGxpbmVcclxuXHRcdFx0Zm9yIChsZXQgaSA9IHNlY3Rpb25JbmZvLmxpbmVTdGFydDsgaSA+PSAwOyBpLS0pIHtcclxuXHRcdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblx0XHRcdFx0Y29uc3QgaGVhZGluZ01hdGNoID0gbGluZS5tYXRjaCgvXigjezEsNn0pXFxzKyguKykkLyk7XHJcblx0XHRcdFx0aWYgKGhlYWRpbmdNYXRjaCkge1xyXG5cdFx0XHRcdFx0bmVhcmVzdEhlYWRpbmdUZXh0ID0gbGluZS50cmltKCk7XHJcblx0XHRcdFx0XHRuZWFyZXN0SGVhZGluZ1BvcyA9IGk7XHJcblx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHRoZXJlIGlzIGEgaGVhZGluZywgY2hlY2sgaWYgaXQgaXMgaW4gdGhlIHNob3dQcm9ncmVzc0JhckJhc2VkT25IZWFkaW5nIGxpc3RcclxuXHRcdFx0aWYgKG5lYXJlc3RIZWFkaW5nVGV4dCkge1xyXG5cdFx0XHRcdGNvbnN0IGFsbG93ZWRIZWFkaW5ncyA9XHJcblx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3Muc2hvd1Byb2dyZXNzQmFyQmFzZWRPbkhlYWRpbmdcclxuXHRcdFx0XHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHRcdFx0XHQubWFwKChoKSA9PiBoLnRyaW0oKSk7XHJcblx0XHRcdFx0aWYgKCFhbGxvd2VkSGVhZGluZ3MuaW5jbHVkZXMobmVhcmVzdEhlYWRpbmdUZXh0KSkge1xyXG5cdFx0XHRcdFx0Ly8gTm90IGluIHRoZSBhbGxvd2VkIGhlYWRpbmcgbGlzdCwgYWRkIG5vLXByb2dyZXNzLWJhciBjbGFzc1xyXG5cdFx0XHRcdFx0ZWxlbWVudC5hZGRDbGFzcyhcIm5vLXByb2dyZXNzLWJhclwiKTtcclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0ZWxlbWVudC5hZGRDbGFzcyhcIm5vLXByb2dyZXNzLWJhclwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gSGFuZGxlIGhlYWRpbmcgZWxlbWVudHMgZGlyZWN0bHlcclxuXHRpZiAoXHJcblx0XHRwbHVnaW4uc2V0dGluZ3MuYWRkVGFza1Byb2dyZXNzQmFyVG9IZWFkaW5nICYmXHJcblx0XHRlbGVtZW50LmNoaWxkcmVuWzBdICYmXHJcblx0XHRlbGVtZW50LmNoaWxkcmVuWzBdLm1hdGNoZXMoXCJoMSwgaDIsIGgzLCBoNCwgaDUsIGg2XCIpXHJcblx0KSB7XHJcblx0XHQvLyBTa2lwIGlmIHRoaXMgaGVhZGluZyBhbHJlYWR5IGhhcyBhIHByb2dyZXNzIGJhclxyXG5cdFx0aWYgKGVsZW1lbnQuZmluZChcIi5jbS10YXNrLXByb2dyZXNzLWJhclwiKSkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gR2V0IHNlY3Rpb24gaW5mbyBmb3IgdGhpcyBoZWFkaW5nXHJcblx0XHRjb25zdCBzZWN0aW9uSW5mbyA9IGN0eC5nZXRTZWN0aW9uSW5mbyhlbGVtZW50KTtcclxuXHRcdGlmIChzZWN0aW9uSW5mbykge1xyXG5cdFx0XHQvLyBQYXJzZSB0aGUgc2VjdGlvbiB0ZXh0IHRvIGZpbmQgdGFza3NcclxuXHRcdFx0Ly8gR2V0IHRleHQgZnJvbSB0aGUgc2VjdGlvbiBzdGFydCBsaW5lIHVudGlsIHRoZSBuZXh0IGhlYWRpbmcgb2Ygc2FtZSBsZXZlbCBvciBoaWdoZXJcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVzID0gc2VjdGlvbkluZm8udGV4dC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0Y29uc3Qgc2VjdGlvbkxpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0Y29uc3QgaGVhZGluZ1RleHQgPSBsaW5lc1tzZWN0aW9uSW5mby5saW5lU3RhcnRdO1xyXG5cdFx0XHRjb25zdCBoZWFkaW5nTGV2ZWwgPSBoZWFkaW5nVGV4dC5tYXRjaCgvXigjezEsNn0pXFxzLyk7XHJcblxyXG5cdFx0XHRpZiAoIWhlYWRpbmdMZXZlbCkge1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgaGVhZGluZ051bWJlciA9IGhlYWRpbmdMZXZlbFsxXS5sZW5ndGg7XHJcblxyXG5cdFx0XHQvLyBTdGFydCBmcm9tIHRoZSBoZWFkaW5nIGxpbmUgYW5kIGNvbGxlY3QgYWxsIGxpbmVzIHVudGlsIG5leHQgaGVhZGluZyBvZiBzYW1lIG9yIGhpZ2hlciBsZXZlbFxyXG5cdFx0XHRsZXQgaW5TZWN0aW9uID0gZmFsc2U7XHJcblx0XHRcdGZvciAoY29uc3QgbGluZSBvZiBsaW5lcy5zbGljZShzZWN0aW9uSW5mby5saW5lU3RhcnQpKSB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGhlYWRpbmcgbGluZVxyXG5cdFx0XHRcdGNvbnN0IGhlYWRpbmdNYXRjaCA9IGxpbmUubWF0Y2goL14oI3sxLDZ9KVxccy8pO1xyXG5cclxuXHRcdFx0XHRpZiAoaGVhZGluZ01hdGNoKSB7XHJcblx0XHRcdFx0XHRjb25zdCBjdXJyZW50SGVhZGluZ0xldmVsID0gaGVhZGluZ01hdGNoWzFdLmxlbmd0aDtcclxuXHJcblx0XHRcdFx0XHQvLyBJZiB3ZSdyZSBhbHJlYWR5IGluIHRoZSBzZWN0aW9uIGFuZCBmaW5kIGEgaGVhZGluZyBvZiBzYW1lIG9yIGhpZ2hlciBsZXZlbCwgc3RvcFxyXG5cdFx0XHRcdFx0aWYgKGluU2VjdGlvbiAmJiBjdXJyZW50SGVhZGluZ0xldmVsIDw9IGhlYWRpbmdOdW1iZXIpIHtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBTdGFydCBjb2xsZWN0aW5nIGFmdGVyIHdlJ3ZlIHNlZW4gdGhlIGluaXRpYWwgaGVhZGluZ1xyXG5cdFx0XHRcdGlmICghaW5TZWN0aW9uKSB7XHJcblx0XHRcdFx0XHRpblNlY3Rpb24gPSB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0c2VjdGlvbkxpbmVzLnB1c2gobGluZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIOWmguaenOW8gOWQr+S6hnNob3dQcm9ncmVzc0JhckJhc2VkT25IZWFkaW5n6K6+572u77yM5qOA5p+laGVhZGluZ+aYr+WQpuWcqOiuvue9ruWIl+ihqOS4rVxyXG5cdFx0XHRpZiAocGx1Z2luLnNldHRpbmdzLnNob3dQcm9ncmVzc0JhckJhc2VkT25IZWFkaW5nPy50cmltKCkpIHtcclxuXHRcdFx0XHRjb25zdCBhbGxvd2VkSGVhZGluZ3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLnNob3dQcm9ncmVzc0JhckJhc2VkT25IZWFkaW5nXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgoaCkgPT4gaC50cmltKCkpO1xyXG5cdFx0XHRcdGlmICghYWxsb3dlZEhlYWRpbmdzLmluY2x1ZGVzKGhlYWRpbmdUZXh0LnRyaW0oKSkpIHtcclxuXHRcdFx0XHRcdC8vIOS4jeWcqOWFgeiuuOeahGhlYWRpbmfliJfooajkuK3vvIzmt7vliqBuby1wcm9ncmVzcy1iYXLnsbtcclxuXHRcdFx0XHRcdGVsZW1lbnQuYWRkQ2xhc3MoXCJuby1wcm9ncmVzcy1iYXJcIik7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBGaWx0ZXIgZm9yIHRhc2sgbGluZXNcclxuXHRcdFx0Y29uc3QgdGFza0xpbmVzID0gc2VjdGlvbkxpbmVzLmZpbHRlcigobGluZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRyaW1tZWQgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFx0XHQvLyBNYXRjaCBib3RoIC0gWyBdIGFuZCAqIFsgXSB0YXNrIGZvcm1hdHNcclxuXHRcdFx0XHRyZXR1cm4gdHJpbW1lZC5tYXRjaCgvXihbLSorXXxcXFxcZCtcXFxcLilcXHMqXFxbKC4pXFxdLykgIT09IG51bGw7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHRhc2tMaW5lcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGEgdmlydHVhbCB0YXNrIGxpc3QgZm9yIHByb2Nlc3NpbmdcclxuXHRcdFx0XHRjb25zdCB0YXNrRWxlbWVudHM6IEhUTUxFbGVtZW50W10gPSBbXTtcclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIHRhc2sgbGlzdCBpdGVtcyBmb3IgZWFjaCB0YXNrIGZvdW5kXHJcblx0XHRcdFx0Zm9yIChjb25zdCB0YXNrTGluZSBvZiB0YXNrTGluZXMpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tFbCA9IGNyZWF0ZUVsKFwibGlcIiwgeyBjbHM6IFwidGFzay1saXN0LWl0ZW1cIiB9KTtcclxuXHJcblx0XHRcdFx0XHQvLyBFeHRyYWN0IHRoZSB0YXNrIG1hcmsgdG8gcHJvcGVybHkgc2V0IGRhdGEtdGFzayBhdHRyaWJ1dGVcclxuXHRcdFx0XHRcdGNvbnN0IG1hcmtNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKC9cXFsoLilcXF0vKTtcclxuXHRcdFx0XHRcdGlmIChtYXJrTWF0Y2ggJiYgbWFya01hdGNoWzFdKSB7XHJcblx0XHRcdFx0XHRcdGNvbnN0IG1hcmsgPSBtYXJrTWF0Y2hbMV07XHJcblx0XHRcdFx0XHRcdHRhc2tFbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2tcIiwgbWFyayk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBDcmVhdGUgYSBjaGVja2JveCBlbGVtZW50IGZvciBwcm9wZXIgc3RydWN0dXJlXHJcblx0XHRcdFx0XHRcdGNvbnN0IGNoZWNrYm94ID0gY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdFx0XHRcdFx0Y2xzOiBcInRhc2stbGlzdC1pdGVtLWNoZWNrYm94XCIsXHJcblx0XHRcdFx0XHRcdFx0dHlwZTogXCJjaGVja2JveFwiLFxyXG5cdFx0XHRcdFx0XHR9KSBhcyBIVE1MSW5wdXRFbGVtZW50O1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gU2V0IGNoZWNrYm94IGNoZWNrZWQgc3RhdGUgYmFzZWQgb24gY29tcGxldGlvbiBtYXJrXHJcblx0XHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtzID1cclxuXHRcdFx0XHRcdFx0XHRwbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblx0XHRcdFx0XHRcdGlmIChjb21wbGV0ZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0XHRcdGNoZWNrYm94LmNoZWNrZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHR0YXNrRWwucHJlcGVuZChjaGVja2JveCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gRXh0cmFjdCB0aGUgdGFzayB0ZXh0IChldmVyeXRoaW5nIGFmdGVyIHRoZSBjaGVja2JveClcclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tUZXh0ID0gdGFza0xpbmUucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0L14oWy0qK118XFxcXGQrXFxcXC4pXFxzKlxcWyguKVxcXVxccyovLFxyXG5cdFx0XHRcdFx0XHRcIlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dGFza0VsLmFwcGVuZENoaWxkKGNyZWF0ZVNwYW4oeyB0ZXh0OiB0YXNrVGV4dCB9KSk7XHJcblx0XHRcdFx0XHR0YXNrRWxlbWVudHMucHVzaCh0YXNrRWwpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGdyb3VwIHN0cnVjdHVyZSBmb3IgdGhlIHByb2dyZXNzIGJhclxyXG5cdFx0XHRcdGNvbnN0IGdyb3VwOiBHcm91cEVsZW1lbnQgPSB7XHJcblx0XHRcdFx0XHRwYXJlbnRFbGVtZW50OiBlbGVtZW50LmNoaWxkcmVuWzBdIGFzIEhUTUxFbGVtZW50LFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW5FbGVtZW50OiB0YXNrRWxlbWVudHMsXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gQ3JlYXRlIGFuZCBhcHBlbmQgdGhlIHByb2dyZXNzIGJhclxyXG5cdFx0XHRcdGNvbnN0IHByb2dyZXNzQmFyID0gbmV3IFByb2dyZXNzQmFyKHBsdWdpbiwgZ3JvdXAsIFwibm9ybWFsXCIsIHtcclxuXHRcdFx0XHRcdHNlY3Rpb25JbmZvOiBzZWN0aW9uSW5mbyxcclxuXHRcdFx0XHRcdGN0eDogY3R4LFxyXG5cdFx0XHRcdFx0ZWxlbWVudDogZWxlbWVudCxcclxuXHRcdFx0XHR9KS5vbmxvYWQoKTtcclxuXHRcdFx0XHRlbGVtZW50LmNoaWxkcmVuWzBdLmFwcGVuZENoaWxkKHByb2dyZXNzQmFyKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gUHJvY2VzcyB0YXNrIGxpc3RzIChvcmlnaW5hbCBsb2dpYylcclxuXHRpZiAoZWxlbWVudC5maW5kKFwidWwuY29udGFpbnMtdGFzay1saXN0XCIpKSB7XHJcblx0XHRjb25zdCBlbGVtZW50cyA9IGVsZW1lbnQuZmluZEFsbChcIi50YXNrLWxpc3QtaXRlbVwiKTtcclxuXHRcdGNvbnN0IGdyb3VwZWRFbGVtZW50cyA9IGdyb3VwRWxlbWVudHNCeVBhcmVudChlbGVtZW50cyk7XHJcblx0XHRsb2FkUHJvZ3Jlc3NiYXIocGx1Z2luLCBncm91cGVkRWxlbWVudHMsIFwibm9ybWFsXCIpO1xyXG5cclxuXHRcdC8vIEFkZCBoZWFkaW5nIHByb2dyZXNzIGJhcnMgaWYgZW5hYmxlZCBpbiBzZXR0aW5nc1xyXG5cdFx0aWYgKHBsdWdpbi5zZXR0aW5ncy5hZGRUYXNrUHJvZ3Jlc3NCYXJUb0hlYWRpbmcpIHtcclxuXHRcdFx0Y29uc3QgdGFza3NCeUhlYWRpbmcgPSBncm91cFRhc2tzQnlIZWFkaW5nKGVsZW1lbnQpO1xyXG5cdFx0XHRhZGRIZWFkaW5nUHJvZ3Jlc3NCYXJzKHBsdWdpbiwgdGFza3NCeUhlYWRpbmcsIFwibm9ybWFsXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHQvLyBQcm9jZXNzIG9yZGVyZWQgbGlzdHMgd2l0aCB0YXNrc1xyXG5cdGVsc2UgaWYgKGVsZW1lbnQuZmluZChcIm9sLmNvbnRhaW5zLXRhc2stbGlzdFwiKSkge1xyXG5cdFx0Y29uc3QgZWxlbWVudHMgPSBlbGVtZW50LmZpbmRBbGwoXCIudGFzay1saXN0LWl0ZW1cIik7XHJcblx0XHRjb25zdCBncm91cGVkRWxlbWVudHMgPSBncm91cEVsZW1lbnRzQnlQYXJlbnQoZWxlbWVudHMpO1xyXG5cdFx0bG9hZFByb2dyZXNzYmFyKHBsdWdpbiwgZ3JvdXBlZEVsZW1lbnRzLCBcIm5vcm1hbFwiKTtcclxuXHJcblx0XHQvLyBBZGQgaGVhZGluZyBwcm9ncmVzcyBiYXJzIGlmIGVuYWJsZWQgaW4gc2V0dGluZ3NcclxuXHRcdGlmIChwbHVnaW4uc2V0dGluZ3MuYWRkVGFza1Byb2dyZXNzQmFyVG9IZWFkaW5nKSB7XHJcblx0XHRcdGNvbnN0IHRhc2tzQnlIZWFkaW5nID0gZ3JvdXBUYXNrc0J5SGVhZGluZyhlbGVtZW50KTtcclxuXHRcdFx0YWRkSGVhZGluZ1Byb2dyZXNzQmFycyhwbHVnaW4sIHRhc2tzQnlIZWFkaW5nLCBcIm5vcm1hbFwiKTtcclxuXHRcdH1cclxuXHR9IGVsc2UgaWYgKGVsZW1lbnQuY2xvc2VzdChcIi5kYXRhdmlldy1jb250YWluZXJcIikpIHtcclxuXHRcdGNvbnN0IHBhcmVudEVsZW1lbnQgPSBlbGVtZW50LmNsb3Nlc3QoXCIuZGF0YXZpZXctY29udGFpbmVyXCIpO1xyXG5cdFx0aWYgKCFwYXJlbnRFbGVtZW50KSByZXR1cm47XHJcblx0XHRpZiAocGFyZW50RWxlbWVudC5nZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2stcHJvZ3Jlc3MtYmFyXCIpID09PSBcInRydWVcIilcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0Y29uc3QgZWxlbWVudHMgPSBwYXJlbnRFbGVtZW50LmZpbmRBbGwoXCIudGFzay1saXN0LWl0ZW1cIik7XHJcblx0XHRjb25zdCBncm91cGVkRWxlbWVudHMgPSBncm91cEVsZW1lbnRzQnlQYXJlbnQoZWxlbWVudHMpO1xyXG5cdFx0bG9hZFByb2dyZXNzYmFyKHBsdWdpbiwgZ3JvdXBlZEVsZW1lbnRzLCBcImRhdGF2aWV3XCIpO1xyXG5cclxuXHRcdC8vIEFkZCBoZWFkaW5nIHByb2dyZXNzIGJhcnMgaWYgZW5hYmxlZCBpbiBzZXR0aW5nc1xyXG5cdFx0aWYgKHBsdWdpbi5zZXR0aW5ncy5hZGRUYXNrUHJvZ3Jlc3NCYXJUb0hlYWRpbmcpIHtcclxuXHRcdFx0Y29uc3QgdGFza3NCeUhlYWRpbmcgPSBncm91cFRhc2tzQnlIZWFkaW5nKFxyXG5cdFx0XHRcdHBhcmVudEVsZW1lbnQgYXMgSFRNTEVsZW1lbnRcclxuXHRcdFx0KTtcclxuXHRcdFx0YWRkSGVhZGluZ1Byb2dyZXNzQmFycyhwbHVnaW4sIHRhc2tzQnlIZWFkaW5nLCBcImRhdGF2aWV3XCIpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHBhcmVudEVsZW1lbnQuc2V0QXR0cmlidXRlKFwiZGF0YS10YXNrLXByb2dyZXNzLWJhclwiLCBcInRydWVcIik7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBQcm9ncmVzc0JhciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJvZ3Jlc3NCYXJFbDogSFRNTFNwYW5FbGVtZW50O1xyXG5cdHByb2dyZXNzQmFja0dyb3VuZEVsOiBIVE1MRGl2RWxlbWVudDtcclxuXHRwcm9ncmVzc0VsOiBIVE1MRGl2RWxlbWVudDtcclxuXHRpblByb2dyZXNzRWw6IEhUTUxEaXZFbGVtZW50O1xyXG5cdGFiYW5kb25lZEVsOiBIVE1MRGl2RWxlbWVudDtcclxuXHRwbGFubmVkRWw6IEhUTUxEaXZFbGVtZW50O1xyXG5cdG51bWJlckVsOiBIVE1MRGl2RWxlbWVudDtcclxuXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbXBsZXRlZDogbnVtYmVyO1xyXG5cdHRvdGFsOiBudW1iZXI7XHJcblx0aW5Qcm9ncmVzczogbnVtYmVyO1xyXG5cdGFiYW5kb25lZDogbnVtYmVyO1xyXG5cdG5vdFN0YXJ0ZWQ6IG51bWJlcjtcclxuXHRwbGFubmVkOiBudW1iZXI7XHJcblxyXG5cdGdyb3VwOiBHcm91cEVsZW1lbnQ7XHJcblx0aW5mbz86IHtcclxuXHRcdHNlY3Rpb25JbmZvPzogTWFya2Rvd25TZWN0aW9uSW5mb3JtYXRpb247XHJcblx0XHRjdHg/OiBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0O1xyXG5cdFx0ZWxlbWVudD86IEhUTUxFbGVtZW50O1xyXG5cdH07XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRncm91cDogR3JvdXBFbGVtZW50LFxyXG5cdFx0cmVhZG9ubHkgdHlwZTogXCJkYXRhdmlld1wiIHwgXCJub3JtYWxcIixcclxuXHRcdGluZm8/OiB7XHJcblx0XHRcdHNlY3Rpb25JbmZvPzogTWFya2Rvd25TZWN0aW9uSW5mb3JtYXRpb247XHJcblx0XHRcdGN0eD86IE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHQ7XHJcblx0XHRcdGVsZW1lbnQ/OiBIVE1MRWxlbWVudDtcclxuXHRcdH1cclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuZ3JvdXAgPSBncm91cDtcclxuXHRcdHRoaXMuaW5mbyA9IGluZm87XHJcblxyXG5cdFx0dGhpcy5jb21wbGV0ZWQgPSAwO1xyXG5cdFx0dGhpcy50b3RhbCA9IDA7XHJcblx0XHR0aGlzLmluUHJvZ3Jlc3MgPSAwO1xyXG5cdFx0dGhpcy5hYmFuZG9uZWQgPSAwO1xyXG5cdFx0dGhpcy5ub3RTdGFydGVkID0gMDtcclxuXHRcdHRoaXMucGxhbm5lZCA9IDA7XHJcblxyXG5cdFx0aWYgKHR5cGUgPT09IFwiZGF0YXZpZXdcIikge1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUNvbXBsZXRlZEFuZFRvdGFsRGF0YXZpZXcoKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMudXBkYXRlQ29tcGxldGVkQW5kVG90YWwoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgdXAgZXZlbnQgaGFuZGxlcnNcclxuXHRcdGZvciAobGV0IGVsIG9mIHRoaXMuZ3JvdXAuY2hpbGRyZW5FbGVtZW50KSB7XHJcblx0XHRcdGlmICh0aGlzLnR5cGUgPT09IFwibm9ybWFsXCIpIHtcclxuXHRcdFx0XHRlbC5vbihcImNsaWNrXCIsIFwiaW5wdXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGlzIHByb2dyZXNzIGJhclxyXG5cdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUNvbXBsZXRlZEFuZFRvdGFsKCk7XHJcblx0XHRcdFx0XHRcdHRoaXMuY2hhbmdlUGVyY2VudGFnZSgpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLmNoYW5nZU51bWJlcigpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGhlYWRpbmcgcHJvZ3Jlc3MgYmFyLCB3ZSBuZWVkIHRvIHJlZnJlc2ggdGhlIGVudGlyZSB2aWV3XHJcblx0XHRcdFx0XHRcdC8vIHRvIHVwZGF0ZSBhbGwgcmVsYXRlZCB0YXNrIHByb2dyZXNzIGJhcnNcclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuZ3JvdXAucGFyZW50RWxlbWVudC5tYXRjaGVzKFxyXG5cdFx0XHRcdFx0XHRcdFx0XCJoMSwgaDIsIGgzLCBoNCwgaDUsIGg2XCJcclxuXHRcdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNvbnRhaW5lciA9IHRoaXMuZ3JvdXAucGFyZW50RWxlbWVudC5jbG9zZXN0KFxyXG5cdFx0XHRcdFx0XHRcdFx0XCIubWFya2Rvd24tcmVhZGluZy12aWV3XCJcclxuXHRcdFx0XHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdFx0XHRcdGlmIChjb250YWluZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEZvcmNlIHJlZnJlc2ggb2YgdGhlIHZpZXcgYnkgdHJpZ2dlcmluZyBhIGxheW91dCBjaGFuZ2VcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnRhaW5lci5oaWRlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29udGFpbmVyLnNob3coKTtcclxuXHRcdFx0XHRcdFx0XHRcdH0sIDEwKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sIDIwMCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy50eXBlID09PSBcImRhdGF2aWV3XCIpIHtcclxuXHRcdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZWwsIFwibW91c2Vkb3duXCIsIChldikgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKCFldi50YXJnZXQpIHJldHVybjtcclxuXHRcdFx0XHRcdGlmICgoZXYudGFyZ2V0IGFzIEhUTUxFbGVtZW50KS50YWdOYW1lID09PSBcIklOUFVUXCIpIHtcclxuXHRcdFx0XHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gVXBkYXRlIHRoaXMgcHJvZ3Jlc3MgYmFyXHJcblx0XHRcdFx0XHRcdFx0dGhpcy51cGRhdGVDb21wbGV0ZWRBbmRUb3RhbERhdGF2aWV3KCk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jaGFuZ2VQZXJjZW50YWdlKCk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5jaGFuZ2VOdW1iZXIoKTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Ly8gSWYgdGhpcyBpcyBhIGhlYWRpbmcgcHJvZ3Jlc3MgYmFyLCB3ZSBuZWVkIHRvIHJlZnJlc2ggdGhlIGVudGlyZSB2aWV3XHJcblx0XHRcdFx0XHRcdFx0Ly8gdG8gdXBkYXRlIGFsbCByZWxhdGVkIHRhc2sgcHJvZ3Jlc3MgYmFyc1xyXG5cdFx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRcdHRoaXMuZ3JvdXAucGFyZW50RWxlbWVudC5tYXRjaGVzKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcImgxLCBoMiwgaDMsIGg0LCBoNSwgaDZcIlxyXG5cdFx0XHRcdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgY29udGFpbmVyID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dGhpcy5ncm91cC5wYXJlbnRFbGVtZW50LmNsb3Nlc3QoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XCIubWFya2Rvd24tcmVhZGluZy12aWV3XCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRcdFx0XHRcdGlmIChjb250YWluZXIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gRm9yY2UgcmVmcmVzaCBvZiB0aGUgdmlldyBieSB0cmlnZ2VyaW5nIGEgbGF5b3V0IGNoYW5nZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb250YWluZXIuaGlkZSgpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRjb250YWluZXIuc2hvdygpO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9LCAxMCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IHVwIGZpbGUgbW9uaXRvcmluZ1xyXG5cdFx0dGhpcy5zZXR1cEZpbGVNb25pdG9yaW5nKCk7XHJcblx0fVxyXG5cclxuXHRzZXR1cEZpbGVNb25pdG9yaW5nKCkge1xyXG5cdFx0aWYgKCF0aGlzLmluZm8pIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBpbmZvRmlsZSA9IHRoaXMuaW5mby5jdHg/LnNvdXJjZVBhdGg7XHJcblx0XHRpZiAoIWluZm9GaWxlKSByZXR1cm47XHJcblxyXG5cdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAudmF1bHQub24oXCJtb2RpZnlcIiwgKGZpbGUpID0+IHtcclxuXHRcdFx0XHRpZiAoaW5mb0ZpbGUgPT09IGZpbGUucGF0aCkge1xyXG5cdFx0XHRcdFx0Ly8gSW5zdGVhZCBvZiBqdXN0IHVubG9hZGluZywgdXBkYXRlIHRoZSBwcm9ncmVzcyBiYXIgd2l0aCBuZXcgZGF0YVxyXG5cdFx0XHRcdFx0dGhpcy5kZWJvdW5jZVVwZGF0ZUZyb21Nb2RpZmllZEZpbGUoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0ZGVib3VuY2VVcGRhdGVGcm9tTW9kaWZpZWRGaWxlID0gZGVib3VuY2UoKCkgPT4ge1xyXG5cdFx0dGhpcy51cGRhdGVGcm9tTW9kaWZpZWRGaWxlKCk7XHJcblx0fSwgMjAwKTtcclxuXHJcblx0dXBkYXRlRnJvbU1vZGlmaWVkRmlsZSgpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0IXRoaXMuaW5mbyB8fFxyXG5cdFx0XHQhdGhpcy5pbmZvLmN0eCB8fFxyXG5cdFx0XHQhdGhpcy5pbmZvLmVsZW1lbnQgfHxcclxuXHRcdFx0IXRoaXMuaW5mby5zZWN0aW9uSW5mb1xyXG5cdFx0KSB7XHJcblx0XHRcdC8vIElmIG1pc3NpbmcgYW55IHJlcXVpcmVkIGluZm8sIGp1c3QgdW5sb2FkIHRoZSBvbGQgY29tcG9uZW50XHJcblx0XHRcdHRoaXMudW5sb2FkKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB7IGN0eCwgZWxlbWVudCwgc2VjdGlvbkluZm8gfSA9IHRoaXMuaW5mbztcclxuXHJcblx0XHQvLyBHZXQgdXBkYXRlZCBzZWN0aW9uIGluZm9cclxuXHRcdGNvbnN0IHVwZGF0ZWRTZWN0aW9uSW5mbyA9IGN0eC5nZXRTZWN0aW9uSW5mbyhlbGVtZW50KTtcclxuXHRcdGlmICghdXBkYXRlZFNlY3Rpb25JbmZvKSB7XHJcblx0XHRcdHRoaXMudW5sb2FkKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVcGRhdGUgdGhlIHN0b3JlZCBzZWN0aW9uIGluZm9cclxuXHRcdHRoaXMuaW5mby5zZWN0aW9uSW5mbyA9IHVwZGF0ZWRTZWN0aW9uSW5mbztcclxuXHJcblx0XHQvLyBQYXJzZSB0aGUgc2VjdGlvbiB0ZXh0IHRvIGZpbmQgdGFza3MgKHNpbWlsYXIgdG8gdGhlIGNvZGUgaW4gdXBkYXRlUHJvZ3Jlc3NCYXJJbkVsZW1lbnQpXHJcblx0XHRjb25zdCBsaW5lcyA9IHVwZGF0ZWRTZWN0aW9uSW5mby50ZXh0LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0Y29uc3Qgc2VjdGlvbkxpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRpbmdUZXh0ID0gbGluZXNbdXBkYXRlZFNlY3Rpb25JbmZvLmxpbmVTdGFydF07XHJcblx0XHRjb25zdCBoZWFkaW5nTGV2ZWwgPSBoZWFkaW5nVGV4dC5tYXRjaCgvXigjezEsNn0pXFxzLyk7XHJcblxyXG5cdFx0aWYgKCFoZWFkaW5nTGV2ZWwpIHtcclxuXHRcdFx0dGhpcy51bmxvYWQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGhlYWRpbmdOdW1iZXIgPSBoZWFkaW5nTGV2ZWxbMV0ubGVuZ3RoO1xyXG5cclxuXHRcdC8vIFN0YXJ0IGZyb20gdGhlIGhlYWRpbmcgbGluZSBhbmQgY29sbGVjdCBhbGwgbGluZXMgdW50aWwgbmV4dCBoZWFkaW5nIG9mIHNhbWUgb3IgaGlnaGVyIGxldmVsXHJcblx0XHRsZXQgaW5TZWN0aW9uID0gZmFsc2U7XHJcblx0XHRmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMuc2xpY2UodXBkYXRlZFNlY3Rpb25JbmZvLmxpbmVTdGFydCkpIHtcclxuXHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyBpcyBhIGhlYWRpbmcgbGluZVxyXG5cdFx0XHRjb25zdCBoZWFkaW5nTWF0Y2ggPSBsaW5lLm1hdGNoKC9eKCN7MSw2fSlcXHMvKTtcclxuXHJcblx0XHRcdGlmIChoZWFkaW5nTWF0Y2gpIHtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50SGVhZGluZ0xldmVsID0gaGVhZGluZ01hdGNoWzFdLmxlbmd0aDtcclxuXHJcblx0XHRcdFx0Ly8gSWYgd2UncmUgYWxyZWFkeSBpbiB0aGUgc2VjdGlvbiBhbmQgZmluZCBhIGhlYWRpbmcgb2Ygc2FtZSBvciBoaWdoZXIgbGV2ZWwsIHN0b3BcclxuXHRcdFx0XHRpZiAoaW5TZWN0aW9uICYmIGN1cnJlbnRIZWFkaW5nTGV2ZWwgPD0gaGVhZGluZ051bWJlcikge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBTdGFydCBjb2xsZWN0aW5nIGFmdGVyIHdlJ3ZlIHNlZW4gdGhlIGluaXRpYWwgaGVhZGluZ1xyXG5cdFx0XHRpZiAoIWluU2VjdGlvbikge1xyXG5cdFx0XHRcdGluU2VjdGlvbiA9IHRydWU7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHNlY3Rpb25MaW5lcy5wdXNoKGxpbmUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZpbHRlciBmb3IgdGFzayBsaW5lc1xyXG5cdFx0Y29uc3QgdGFza0xpbmVzID0gc2VjdGlvbkxpbmVzLmZpbHRlcigobGluZSkgPT4ge1xyXG5cdFx0XHRjb25zdCB0cmltbWVkID0gbGluZS50cmltKCk7XHJcblx0XHRcdC8vIE1hdGNoIGJvdGggLSBbIF0gYW5kICogWyBdIHRhc2sgZm9ybWF0c1xyXG5cdFx0XHRyZXR1cm4gdHJpbW1lZC5tYXRjaCgvXihbLSorXXxcXFxcZCtcXFxcLilcXHMqXFxbKC4pXFxdLykgIT09IG51bGw7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAodGFza0xpbmVzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHQvLyBObyB0YXNrcyBmb3VuZCwgcmVtb3ZlIHRoZSBwcm9ncmVzcyBiYXJcclxuXHRcdFx0dGhpcy51bmxvYWQoKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSB1cGRhdGVkIHRhc2sgZWxlbWVudHNcclxuXHRcdGNvbnN0IHRhc2tFbGVtZW50czogSFRNTEVsZW1lbnRbXSA9IFtdO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0YXNrIGxpc3QgaXRlbXMgZm9yIGVhY2ggdGFzayBmb3VuZFxyXG5cdFx0Zm9yIChjb25zdCB0YXNrTGluZSBvZiB0YXNrTGluZXMpIHtcclxuXHRcdFx0Y29uc3QgdGFza0VsID0gY3JlYXRlRWwoXCJsaVwiLCB7IGNsczogXCJ0YXNrLWxpc3QtaXRlbVwiIH0pO1xyXG5cclxuXHRcdFx0Ly8gRXh0cmFjdCB0aGUgdGFzayBtYXJrIHRvIHByb3Blcmx5IHNldCBkYXRhLXRhc2sgYXR0cmlidXRlXHJcblx0XHRcdGNvbnN0IG1hcmtNYXRjaCA9IHRhc2tMaW5lLm1hdGNoKC9cXFsoLilcXF0vKTtcclxuXHRcdFx0aWYgKG1hcmtNYXRjaCAmJiBtYXJrTWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRjb25zdCBtYXJrID0gbWFya01hdGNoWzFdO1xyXG5cdFx0XHRcdHRhc2tFbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLXRhc2tcIiwgbWFyayk7XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSBhIGNoZWNrYm94IGVsZW1lbnQgZm9yIHByb3BlciBzdHJ1Y3R1cmVcclxuXHRcdFx0XHRjb25zdCBjaGVja2JveCA9IGNyZWF0ZUVsKFwiaW5wdXRcIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcInRhc2stbGlzdC1pdGVtLWNoZWNrYm94XCIsXHJcblx0XHRcdFx0XHR0eXBlOiBcImNoZWNrYm94XCIsXHJcblx0XHRcdFx0fSkgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHJcblx0XHRcdFx0Ly8gU2V0IGNoZWNrYm94IGNoZWNrZWQgc3RhdGUgYmFzZWQgb24gY29tcGxldGlvbiBtYXJrXHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblx0XHRcdFx0aWYgKGNvbXBsZXRlZE1hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdFx0XHRjaGVja2JveC5jaGVja2VkID0gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRhc2tFbC5wcmVwZW5kKGNoZWNrYm94KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRXh0cmFjdCB0aGUgdGFzayB0ZXh0IChldmVyeXRoaW5nIGFmdGVyIHRoZSBjaGVja2JveClcclxuXHRcdFx0Y29uc3QgdGFza1RleHQgPSB0YXNrTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRcdC9eKFstKitdfFxcXFxkK1xcXFwuKVxccypcXFsoLilcXF1cXHMqLyxcclxuXHRcdFx0XHRcIlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdHRhc2tFbC5hcHBlbmRDaGlsZChjcmVhdGVTcGFuKHsgdGV4dDogdGFza1RleHQgfSkpO1xyXG5cdFx0XHR0YXNrRWxlbWVudHMucHVzaCh0YXNrRWwpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgZ3JvdXAgd2l0aCBuZXcgdGFzayBlbGVtZW50c1xyXG5cdFx0dGhpcy5ncm91cC5jaGlsZHJlbkVsZW1lbnQgPSB0YXNrRWxlbWVudHM7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHByb2dyZXNzIGJhciBzdGF0c1xyXG5cdFx0dGhpcy51cGRhdGVDb21wbGV0ZWRBbmRUb3RhbCgpO1xyXG5cclxuXHRcdC8vIElmIHRoZSBudW1iZXIgb2YgdGFza3Mgd2l0aCBkaWZmZXJlbnQgc3RhdHVzZXMgaGFzIGNoYW5nZWQsXHJcblx0XHQvLyB3ZSBtYXkgbmVlZCB0byByZWNyZWF0ZSBVSSBlbGVtZW50c1xyXG5cdFx0Y29uc3QgbmVlZHNVSVJlY3JlYXRpb24gPVxyXG5cdFx0XHQodGhpcy5pblByb2dyZXNzID4gMCAmJiAhdGhpcy5pblByb2dyZXNzRWwpIHx8XHJcblx0XHRcdCh0aGlzLmluUHJvZ3Jlc3MgPT09IDAgJiYgdGhpcy5pblByb2dyZXNzRWwpIHx8XHJcblx0XHRcdCh0aGlzLmFiYW5kb25lZCA+IDAgJiYgIXRoaXMuYWJhbmRvbmVkRWwpIHx8XHJcblx0XHRcdCh0aGlzLmFiYW5kb25lZCA9PT0gMCAmJiB0aGlzLmFiYW5kb25lZEVsKSB8fFxyXG5cdFx0XHQodGhpcy5wbGFubmVkID4gMCAmJiAhdGhpcy5wbGFubmVkRWwpIHx8XHJcblx0XHRcdCh0aGlzLnBsYW5uZWQgPT09IDAgJiYgdGhpcy5wbGFubmVkRWwpO1xyXG5cclxuXHRcdGlmIChuZWVkc1VJUmVjcmVhdGlvbikge1xyXG5cdFx0XHQvLyBDbGVhbiB1cCBvbGQgZWxlbWVudHNcclxuXHRcdFx0aWYgKHRoaXMucHJvZ3Jlc3NCYXJFbCAmJiB0aGlzLnByb2dyZXNzQmFyRWwucGFyZW50RWxlbWVudCkge1xyXG5cdFx0XHRcdGNvbnN0IHBhcmVudCA9IHRoaXMucHJvZ3Jlc3NCYXJFbC5wYXJlbnRFbGVtZW50O1xyXG5cdFx0XHRcdC8vIHRoaXMucHJvZ3Jlc3NCYXJFbC5yZW1vdmUoKTtcclxuXHRcdFx0XHR0aGlzLnByb2dyZXNzQmFyRWw/LmRldGFjaCgpO1xyXG5cdFx0XHRcdC8vIFVubG9hZCB0aGUgY3VycmVudCBjb21wb25lbnQgdG8gZW5zdXJlIHByb3BlciBjbGVhbnVwXHJcblx0XHRcdFx0dGhpcy5vbnVubG9hZCgpO1xyXG5cdFx0XHRcdC8vIENyZWF0ZSBuZXcgcHJvZ3Jlc3MgYmFyXHJcblx0XHRcdFx0Y29uc3QgbmV3UHJvZ3Jlc3NCYXIgPSB0aGlzLm9ubG9hZCgpO1xyXG5cdFx0XHRcdC8vIFJlbW92ZSBvbGQgZWxlbWVudCBhZnRlciB1bmxvYWRpbmdcclxuXHRcdFx0XHR0aGlzLnByb2dyZXNzQmFyRWwucmVtb3ZlKCk7XHJcblx0XHRcdFx0cGFyZW50LmFwcGVuZENoaWxkKG5ld1Byb2dyZXNzQmFyKTtcclxuXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwidGV4dFwiIHx8XHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJub25lXCJcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHRoaXMucHJvZ3Jlc3NCYWNrR3JvdW5kRWwuaGlkZSgpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gSnVzdCB1cGRhdGUgdmFsdWVzIG9uIGV4aXN0aW5nIGVsZW1lbnRzXHJcblx0XHRcdHRoaXMuY2hhbmdlUGVyY2VudGFnZSgpO1xyXG5cdFx0XHR0aGlzLmNoYW5nZU51bWJlcigpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Z2V0VGFza1N0YXR1c0Zyb21EYXRhVGFzayhcclxuXHRcdGRhdGFUYXNrOiBzdHJpbmdcclxuXHQpOiBcImNvbXBsZXRlZFwiIHwgXCJpblByb2dyZXNzXCIgfCBcImFiYW5kb25lZFwiIHwgXCJwbGFubmVkXCIgfCBcIm5vdFN0YXJ0ZWRcIiB7XHJcblx0XHQvLyBQcmlvcml0eSAxOiBJZiB1c2VPbmx5Q291bnRNYXJrcyBpcyBlbmFibGVkXHJcblx0XHRpZiAodGhpcy5wbHVnaW4/LnNldHRpbmdzLnVzZU9ubHlDb3VudE1hcmtzKSB7XHJcblx0XHRcdGNvbnN0IG9ubHlDb3VudE1hcmtzID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3Mub25seUNvdW50VGFza01hcmtzLnNwbGl0KFwifFwiKTtcclxuXHRcdFx0aWYgKG9ubHlDb3VudE1hcmtzLmluY2x1ZGVzKGRhdGFUYXNrKSkge1xyXG5cdFx0XHRcdHJldHVybiBcImNvbXBsZXRlZFwiO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIElmIHVzaW5nIG9ubHlDb3VudE1hcmtzIGFuZCB0aGUgbWFyayBpcyBub3QgaW4gdGhlIGxpc3QsXHJcblx0XHRcdFx0Ly8gZGV0ZXJtaW5lIHdoaWNoIG90aGVyIHN0YXR1cyBpdCBiZWxvbmdzIHRvXHJcblx0XHRcdFx0cmV0dXJuIHRoaXMuZGV0ZXJtaW5lTm9uQ29tcGxldGVkU3RhdHVzRnJvbURhdGFUYXNrKGRhdGFUYXNrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IElmIHRoZSBtYXJrIGlzIGluIGV4Y2x1ZGVUYXNrTWFya3NcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MgJiZcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcy5pbmNsdWRlcyhkYXRhVGFzaylcclxuXHRcdCkge1xyXG5cdFx0XHQvLyBFeGNsdWRlZCBtYXJrcyBhcmUgY29uc2lkZXJlZCBub3Qgc3RhcnRlZFxyXG5cdFx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMzogQ2hlY2sgYWdhaW5zdCBzcGVjaWZpYyB0YXNrIHN0YXR1c2VzXHJcblx0XHRyZXR1cm4gdGhpcy5kZXRlcm1pbmVUYXNrU3RhdHVzRnJvbURhdGFUYXNrKGRhdGFUYXNrKTtcclxuXHR9XHJcblxyXG5cdGdldFRhc2tTdGF0dXMoXHJcblx0XHR0ZXh0OiBzdHJpbmdcclxuXHQpOiBcImNvbXBsZXRlZFwiIHwgXCJpblByb2dyZXNzXCIgfCBcImFiYW5kb25lZFwiIHwgXCJwbGFubmVkXCIgfCBcIm5vdFN0YXJ0ZWRcIiB7XHJcblx0XHRjb25zdCBtYXJrTWF0Y2ggPSB0ZXh0Lm1hdGNoKC9cXFsoLildLyk7XHJcblx0XHRpZiAoIW1hcmtNYXRjaCB8fCAhbWFya01hdGNoWzFdKSB7XHJcblx0XHRcdHJldHVybiBcIm5vdFN0YXJ0ZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBtYXJrID0gbWFya01hdGNoWzFdO1xyXG5cclxuXHRcdC8vIFByaW9yaXR5IDE6IElmIHVzZU9ubHlDb3VudE1hcmtzIGlzIGVuYWJsZWRcclxuXHRcdGlmICh0aGlzLnBsdWdpbj8uc2V0dGluZ3MudXNlT25seUNvdW50TWFya3MpIHtcclxuXHRcdFx0Y29uc3Qgb25seUNvdW50TWFya3MgPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5vbmx5Q291bnRUYXNrTWFya3Muc3BsaXQoXCJ8XCIpO1xyXG5cdFx0XHRpZiAob25seUNvdW50TWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJjb21wbGV0ZWRcIjtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBJZiB1c2luZyBvbmx5Q291bnRNYXJrcyBhbmQgdGhlIG1hcmsgaXMgbm90IGluIHRoZSBsaXN0LFxyXG5cdFx0XHRcdC8vIGRldGVybWluZSB3aGljaCBvdGhlciBzdGF0dXMgaXQgYmVsb25ncyB0b1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmRldGVybWluZU5vbkNvbXBsZXRlZFN0YXR1cyhtYXJrKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IElmIHRoZSBtYXJrIGlzIGluIGV4Y2x1ZGVUYXNrTWFya3NcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MgJiZcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcy5pbmNsdWRlcyhtYXJrKVxyXG5cdFx0KSB7XHJcblx0XHRcdC8vIEV4Y2x1ZGVkIG1hcmtzIGFyZSBjb25zaWRlcmVkIG5vdCBzdGFydGVkXHJcblx0XHRcdHJldHVybiBcIm5vdFN0YXJ0ZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQcmlvcml0eSAzOiBDaGVjayBhZ2FpbnN0IHNwZWNpZmljIHRhc2sgc3RhdHVzZXNcclxuXHRcdHJldHVybiB0aGlzLmRldGVybWluZVRhc2tTdGF0dXMobWFyayk7XHJcblx0fVxyXG5cclxuXHRkZXRlcm1pbmVOb25Db21wbGV0ZWRTdGF0dXNGcm9tRGF0YVRhc2soXHJcblx0XHRkYXRhVGFzazogc3RyaW5nXHJcblx0KTogXCJpblByb2dyZXNzXCIgfCBcImFiYW5kb25lZFwiIHwgXCJwbGFubmVkXCIgfCBcIm5vdFN0YXJ0ZWRcIiB7XHJcblx0XHRjb25zdCBpblByb2dyZXNzTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzLmluUHJvZ3Jlc3M/LnNwbGl0KFwifFwiKSB8fCBbXHJcblx0XHRcdFx0XCItXCIsXHJcblx0XHRcdFx0XCIvXCIsXHJcblx0XHRcdF07XHJcblx0XHRpZiAoaW5Qcm9ncmVzc01hcmtzLmluY2x1ZGVzKGRhdGFUYXNrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJpblByb2dyZXNzXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgYWJhbmRvbmVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzLmFiYW5kb25lZD8uc3BsaXQoXCJ8XCIpIHx8IFtcIj5cIl07XHJcblx0XHRpZiAoYWJhbmRvbmVkTWFya3MuaW5jbHVkZXMoZGF0YVRhc2spKSB7XHJcblx0XHRcdHJldHVybiBcImFiYW5kb25lZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHBsYW5uZWRNYXJrcyA9IHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMucGxhbm5lZD8uc3BsaXQoXHJcblx0XHRcdFwifFwiXHJcblx0XHQpIHx8IFtcIj9cIl07XHJcblx0XHRpZiAocGxhbm5lZE1hcmtzLmluY2x1ZGVzKGRhdGFUYXNrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJwbGFubmVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgdGhlIG1hcmsgZG9lc24ndCBtYXRjaCBhbnkgc3BlY2lmaWMgY2F0ZWdvcnksIHVzZSB0aGUgY291bnRPdGhlclN0YXR1c2VzQXMgc2V0dGluZ1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0KHRoaXMucGx1Z2luPy5zZXR0aW5ncy5jb3VudE90aGVyU3RhdHVzZXNBcyBhc1xyXG5cdFx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0XHR8IFwiYWJhbmRvbmVkXCJcclxuXHRcdFx0XHR8IFwibm90U3RhcnRlZFwiXHJcblx0XHRcdFx0fCBcInBsYW5uZWRcIikgfHwgXCJub3RTdGFydGVkXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRkZXRlcm1pbmVOb25Db21wbGV0ZWRTdGF0dXMoXHJcblx0XHRtYXJrOiBzdHJpbmdcclxuXHQpOiBcImluUHJvZ3Jlc3NcIiB8IFwiYWJhbmRvbmVkXCIgfCBcInBsYW5uZWRcIiB8IFwibm90U3RhcnRlZFwiIHtcclxuXHRcdGNvbnN0IGluUHJvZ3Jlc3NNYXJrcyA9XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMuaW5Qcm9ncmVzcz8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XHRcIi1cIixcclxuXHRcdFx0XHRcIi9cIixcclxuXHRcdFx0XTtcclxuXHRcdGlmIChpblByb2dyZXNzTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0cmV0dXJuIFwiaW5Qcm9ncmVzc1wiO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGFiYW5kb25lZE1hcmtzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcy5hYmFuZG9uZWQ/LnNwbGl0KFwifFwiKSB8fCBbXCI+XCJdO1xyXG5cdFx0aWYgKGFiYW5kb25lZE1hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdHJldHVybiBcImFiYW5kb25lZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHBsYW5uZWRNYXJrcyA9IHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMucGxhbm5lZD8uc3BsaXQoXHJcblx0XHRcdFwifFwiXHJcblx0XHQpIHx8IFtcIj9cIl07XHJcblx0XHRpZiAocGxhbm5lZE1hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdHJldHVybiBcInBsYW5uZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB0aGUgbWFyayBkb2Vzbid0IG1hdGNoIGFueSBzcGVjaWZpYyBjYXRlZ29yeSwgdXNlIHRoZSBjb3VudE90aGVyU3RhdHVzZXNBcyBzZXR0aW5nXHJcblx0XHRyZXR1cm4gKFxyXG5cdFx0XHQodGhpcy5wbHVnaW4/LnNldHRpbmdzLmNvdW50T3RoZXJTdGF0dXNlc0FzIGFzXHJcblx0XHRcdFx0fCBcImluUHJvZ3Jlc3NcIlxyXG5cdFx0XHRcdHwgXCJhYmFuZG9uZWRcIlxyXG5cdFx0XHRcdHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHR8IFwicGxhbm5lZFwiKSB8fCBcIm5vdFN0YXJ0ZWRcIlxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdGRldGVybWluZVRhc2tTdGF0dXNGcm9tRGF0YVRhc2soXHJcblx0XHRkYXRhVGFzazogc3RyaW5nXHJcblx0KTogXCJjb21wbGV0ZWRcIiB8IFwiaW5Qcm9ncmVzc1wiIHwgXCJhYmFuZG9uZWRcIiB8IFwicGxhbm5lZFwiIHwgXCJub3RTdGFydGVkXCIge1xyXG5cdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZD8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XHRcInhcIixcclxuXHRcdFx0XHRcIlhcIixcclxuXHRcdFx0XTtcclxuXHRcdGlmIChjb21wbGV0ZWRNYXJrcy5pbmNsdWRlcyhkYXRhVGFzaykpIHtcclxuXHRcdFx0cmV0dXJuIFwiY29tcGxldGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaW5Qcm9ncmVzc01hcmtzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcy5pblByb2dyZXNzPy5zcGxpdChcInxcIikgfHwgW1xyXG5cdFx0XHRcdFwiLVwiLFxyXG5cdFx0XHRcdFwiL1wiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdGlmIChpblByb2dyZXNzTWFya3MuaW5jbHVkZXMoZGF0YVRhc2spKSB7XHJcblx0XHRcdHJldHVybiBcImluUHJvZ3Jlc3NcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBhYmFuZG9uZWRNYXJrcyA9XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkPy5zcGxpdChcInxcIikgfHwgW1wiPlwiXTtcclxuXHRcdGlmIChhYmFuZG9uZWRNYXJrcy5pbmNsdWRlcyhkYXRhVGFzaykpIHtcclxuXHRcdFx0cmV0dXJuIFwiYWJhbmRvbmVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcGxhbm5lZE1hcmtzID0gdGhpcy5wbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcy5wbGFubmVkPy5zcGxpdChcclxuXHRcdFx0XCJ8XCJcclxuXHRcdCkgfHwgW1wiP1wiXTtcclxuXHRcdGlmIChwbGFubmVkTWFya3MuaW5jbHVkZXMoZGF0YVRhc2spKSB7XHJcblx0XHRcdHJldHVybiBcInBsYW5uZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBub3QgbWF0Y2hpbmcgYW55IHNwZWNpZmljIHN0YXR1cywgY2hlY2sgaWYgaXQncyBhIG5vdC1zdGFydGVkIG1hcmtcclxuXHRcdGNvbnN0IG5vdFN0YXJ0ZWRNYXJrcyA9XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMubm90U3RhcnRlZD8uc3BsaXQoXCJ8XCIpIHx8IFtcIiBcIl07XHJcblx0XHRpZiAobm90U3RhcnRlZE1hcmtzLmluY2x1ZGVzKGRhdGFUYXNrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gSWYgdGhlIG1hcmsgZG9lc24ndCBtYXRjaCBhbnkgc3BlY2lmaWMgY2F0ZWdvcnksIHVzZSB0aGUgY291bnRPdGhlclN0YXR1c2VzQXMgc2V0dGluZ1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0KHRoaXMucGx1Z2luPy5zZXR0aW5ncy5jb3VudE90aGVyU3RhdHVzZXNBcyBhc1xyXG5cdFx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0XHR8IFwiYWJhbmRvbmVkXCJcclxuXHRcdFx0XHR8IFwibm90U3RhcnRlZFwiXHJcblx0XHRcdFx0fCBcInBsYW5uZWRcIikgfHwgXCJub3RTdGFydGVkXCJcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRkZXRlcm1pbmVUYXNrU3RhdHVzKFxyXG5cdFx0bWFyazogc3RyaW5nXHJcblx0KTogXCJjb21wbGV0ZWRcIiB8IFwiaW5Qcm9ncmVzc1wiIHwgXCJhYmFuZG9uZWRcIiB8IFwicGxhbm5lZFwiIHwgXCJub3RTdGFydGVkXCIge1xyXG5cdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblx0XHRpZiAoY29tcGxldGVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0cmV0dXJuIFwiY29tcGxldGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgaW5Qcm9ncmVzc01hcmtzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcy5pblByb2dyZXNzPy5zcGxpdChcInxcIik7XHJcblx0XHRpZiAoaW5Qcm9ncmVzc01hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdHJldHVybiBcImluUHJvZ3Jlc3NcIjtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBhYmFuZG9uZWRNYXJrcyA9XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMuYWJhbmRvbmVkPy5zcGxpdChcInxcIik7XHJcblx0XHRpZiAoYWJhbmRvbmVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0cmV0dXJuIFwiYWJhbmRvbmVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgcGxhbm5lZE1hcmtzID1cclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcy5wbGFubmVkPy5zcGxpdChcInxcIik7XHJcblx0XHRpZiAocGxhbm5lZE1hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdHJldHVybiBcInBsYW5uZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiBub3QgbWF0Y2hpbmcgYW55IHNwZWNpZmljIHN0YXR1cywgY2hlY2sgaWYgaXQncyBhIG5vdC1zdGFydGVkIG1hcmtcclxuXHRcdGNvbnN0IG5vdFN0YXJ0ZWRNYXJrcyA9XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXMubm90U3RhcnRlZD8uc3BsaXQoXCJ8XCIpO1xyXG5cdFx0aWYgKG5vdFN0YXJ0ZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRGVmYXVsdCBmYWxsYmFjayAtIGFueSB1bnJlY29nbml6ZWQgbWFyayBpcyBjb25zaWRlcmVkIG5vdCBzdGFydGVkXHJcblx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0fVxyXG5cclxuXHRpc0NvbXBsZXRlZFRhc2tGcm9tRGF0YVRhc2soZGF0YVRhc2s6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gUHJpb3JpdHkgMTogSWYgdXNlT25seUNvdW50TWFya3MgaXMgZW5hYmxlZCwgb25seSBjb3VudCB0YXNrcyB3aXRoIHNwZWNpZmllZCBtYXJrc1xyXG5cdFx0aWYgKHRoaXMucGx1Z2luPy5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcykge1xyXG5cdFx0XHRjb25zdCBvbmx5Q291bnRNYXJrcyA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLm9ubHlDb3VudFRhc2tNYXJrcy5zcGxpdChcInxcIik7XHJcblx0XHRcdHJldHVybiBvbmx5Q291bnRNYXJrcy5pbmNsdWRlcyhkYXRhVGFzayk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMjogSWYgdGhlIG1hcmsgaXMgaW4gZXhjbHVkZVRhc2tNYXJrcywgZG9uJ3QgY291bnQgaXRcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MgJiZcclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcy5pbmNsdWRlcyhkYXRhVGFzaylcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMzogQ2hlY2sgYWdhaW5zdCB0aGUgdGFzayBzdGF0dXNlc1xyXG5cdFx0Ly8gV2UgY29uc2lkZXIgYSB0YXNrIFwiY29tcGxldGVkXCIgaWYgaXQgaGFzIGEgbWFyayBmcm9tIHRoZSBcImNvbXBsZXRlZFwiIHN0YXR1c1xyXG5cdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblxyXG5cdFx0Ly8gUmV0dXJuIHRydWUgaWYgdGhlIG1hcmsgaXMgaW4gdGhlIGNvbXBsZXRlZE1hcmtzIGFycmF5XHJcblx0XHRyZXR1cm4gY29tcGxldGVkTWFya3MuaW5jbHVkZXMoZGF0YVRhc2spO1xyXG5cdH1cclxuXHJcblx0aXNDb21wbGV0ZWRUYXNrKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgbWFya01hdGNoID0gdGV4dC5tYXRjaCgvXFxbKC4pXS8pO1xyXG5cdFx0aWYgKCFtYXJrTWF0Y2ggfHwgIW1hcmtNYXRjaFsxXSkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbWFyayA9IG1hcmtNYXRjaFsxXTtcclxuXHJcblx0XHQvLyBQcmlvcml0eSAxOiBJZiB1c2VPbmx5Q291bnRNYXJrcyBpcyBlbmFibGVkLCBvbmx5IGNvdW50IHRhc2tzIHdpdGggc3BlY2lmaWVkIG1hcmtzXHJcblx0XHRpZiAodGhpcy5wbHVnaW4/LnNldHRpbmdzLnVzZU9ubHlDb3VudE1hcmtzKSB7XHJcblx0XHRcdGNvbnN0IG9ubHlDb3VudE1hcmtzID1cclxuXHRcdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3Mub25seUNvdW50VGFza01hcmtzLnNwbGl0KFwifFwiKTtcclxuXHRcdFx0cmV0dXJuIG9ubHlDb3VudE1hcmtzLmluY2x1ZGVzKG1hcmspO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFByaW9yaXR5IDI6IElmIHRoZSBtYXJrIGlzIGluIGV4Y2x1ZGVUYXNrTWFya3MsIGRvbid0IGNvdW50IGl0XHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5leGNsdWRlVGFza01hcmtzICYmXHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MuaW5jbHVkZXMobWFyaylcclxuXHRcdCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUHJpb3JpdHkgMzogQ2hlY2sgYWdhaW5zdCB0aGUgdGFzayBzdGF0dXNlc1xyXG5cdFx0Ly8gV2UgY29uc2lkZXIgYSB0YXNrIFwiY29tcGxldGVkXCIgaWYgaXQgaGFzIGEgbWFyayBmcm9tIHRoZSBcImNvbXBsZXRlZFwiIHN0YXR1c1xyXG5cdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzLmNvbXBsZXRlZC5zcGxpdChcInxcIik7XHJcblxyXG5cdFx0Ly8gUmV0dXJuIHRydWUgaWYgdGhlIG1hcmsgaXMgaW4gdGhlIGNvbXBsZXRlZE1hcmtzIGFycmF5XHJcblx0XHRyZXR1cm4gY29tcGxldGVkTWFya3MuaW5jbHVkZXMobWFyayk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGVDb21wbGV0ZWRBbmRUb3RhbERhdGF2aWV3KCkge1xyXG5cdFx0bGV0IGNvbXBsZXRlZCA9IDA7XHJcblx0XHRsZXQgaW5Qcm9ncmVzcyA9IDA7XHJcblx0XHRsZXQgYWJhbmRvbmVkID0gMDtcclxuXHRcdGxldCBwbGFubmVkID0gMDtcclxuXHRcdGxldCBub3RTdGFydGVkID0gMDtcclxuXHRcdGxldCB0b3RhbCA9IDA7XHJcblxyXG5cdFx0Ly8gR2V0IGFsbCBwYXJlbnQtY2hpbGQgcmVsYXRpb25zaGlwcyB0byBjaGVjayBmb3IgaW5kZW50YXRpb25cclxuXHRcdGNvbnN0IHBhcmVudENoaWxkTWFwID0gbmV3IE1hcDxIVE1MRWxlbWVudCwgSFRNTEVsZW1lbnRbXT4oKTtcclxuXHRcdGZvciAobGV0IGVsZW1lbnQgb2YgdGhpcy5ncm91cC5jaGlsZHJlbkVsZW1lbnQpIHtcclxuXHRcdFx0Y29uc3QgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xyXG5cdFx0XHRpZiAocGFyZW50KSB7XHJcblx0XHRcdFx0aWYgKCFwYXJlbnRDaGlsZE1hcC5oYXMocGFyZW50KSkge1xyXG5cdFx0XHRcdFx0cGFyZW50Q2hpbGRNYXAuc2V0KHBhcmVudCwgW10pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRwYXJlbnRDaGlsZE1hcC5nZXQocGFyZW50KT8ucHVzaChlbGVtZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAobGV0IGVsZW1lbnQgb2YgdGhpcy5ncm91cC5jaGlsZHJlbkVsZW1lbnQpIHtcclxuXHRcdFx0Y29uc3QgY2hlY2tib3hFbGVtZW50ID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yKFxyXG5cdFx0XHRcdFwiLnRhc2stbGlzdC1pdGVtLWNoZWNrYm94XCJcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKCFjaGVja2JveEVsZW1lbnQpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Ly8gU2tpcCBpZiB0aGlzIGlzIGEgc3VibGV2ZWwgdGFzayBhbmQgY291bnRTdWJMZXZlbCBpcyBkaXNhYmxlZFxyXG5cdFx0XHRpZiAoIXRoaXMucGx1Z2luPy5zZXR0aW5ncy5jb3VudFN1YkxldmVsKSB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyB0YXNrIGlzIGEgc3VidGFzayBieSBleGFtaW5pbmcgaXRzIHBvc2l0aW9uIGFuZCBwYXJlbnQtY2hpbGQgcmVsYXRpb25zaGlwc1xyXG5cdFx0XHRcdGNvbnN0IHBhcmVudCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuXHRcdFx0XHRpZiAocGFyZW50ICYmIHBhcmVudC5jbGFzc0xpc3QuY29udGFpbnMoXCJ0YXNrLWxpc3QtaXRlbVwiKSkge1xyXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyBhIHN1YnRhc2sgKG5lc3RlZCB1bmRlciBhbm90aGVyIHRhc2spLCBzbyBza2lwIGl0XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBoZWFkaW5nIHByb2dyZXNzIGJhciwgb25seSBjb3VudCB0b3AtbGV2ZWwgdGFza3NcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0aGlzLmdyb3VwLnBhcmVudEVsZW1lbnQubWF0Y2hlcyhcImgxLCBoMiwgaDMsIGg0LCBoNSwgaDZcIilcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIEdldCBpbmRlbnRhdGlvbiBieSBjaGVja2luZyB0aGUgRE9NIHN0cnVjdHVyZSBvciB0YXNrIGNvbnRlbnRcclxuXHRcdFx0XHRcdGNvbnN0IGxpRWxlbWVudCA9IGVsZW1lbnQuY2xvc2VzdChcImxpXCIpO1xyXG5cdFx0XHRcdFx0aWYgKGxpRWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBwYXJlbnRMaXN0ID0gbGlFbGVtZW50LnBhcmVudEVsZW1lbnQ7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGdyYW5kUGFyZW50TGlzdEl0ZW0gPVxyXG5cdFx0XHRcdFx0XHRcdHBhcmVudExpc3Q/LnBhcmVudEVsZW1lbnQ/LmNsb3Nlc3QoXCJsaVwiKTtcclxuXHRcdFx0XHRcdFx0aWYgKGdyYW5kUGFyZW50TGlzdEl0ZW0pIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBUaGlzIGlzIGEgbmVzdGVkIHRhc2ssIHNvIHNraXAgaXRcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dG90YWwrKztcclxuXHJcblx0XHRcdC8vIEZpcnN0IHRyeSB0byBnZXQgc3RhdHVzIGZyb20gZGF0YS10YXNrIGF0dHJpYnV0ZVxyXG5cdFx0XHRjb25zdCBkYXRhVGFzayA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS10YXNrXCIpO1xyXG5cdFx0XHRpZiAoZGF0YVRhc2spIHtcclxuXHRcdFx0XHRjb25zdCBzdGF0dXMgPSB0aGlzLmdldFRhc2tTdGF0dXNGcm9tRGF0YVRhc2soZGF0YVRhc2spO1xyXG5cclxuXHRcdFx0XHRpZiAodGhpcy5pc0NvbXBsZXRlZFRhc2tGcm9tRGF0YVRhc2soZGF0YVRhc2spKSB7XHJcblx0XHRcdFx0XHRjb21wbGV0ZWQrKztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHtcclxuXHRcdFx0XHRcdGluUHJvZ3Jlc3MrKztcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikge1xyXG5cdFx0XHRcdFx0YWJhbmRvbmVkKys7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChzdGF0dXMgPT09IFwicGxhbm5lZFwiKSB7XHJcblx0XHRcdFx0XHRwbGFubmVkKys7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChzdGF0dXMgPT09IFwibm90U3RhcnRlZFwiKSB7XHJcblx0XHRcdFx0XHRub3RTdGFydGVkKys7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEZhbGxiYWNrIHRvIHRoZSB0ZXh0IGNvbnRlbnQgbWV0aG9kXHJcblx0XHRcdFx0Y29uc3QgdGV4dENvbnRlbnQgPSBlbGVtZW50LnRleHRDb250ZW50Py50cmltKCkgfHwgXCJcIjtcclxuXHRcdFx0XHQvLyBFeHRyYWN0IHRoZSB0YXNrIG1hcmtcclxuXHRcdFx0XHRjb25zdCBtYXJrTWF0Y2ggPSB0ZXh0Q29udGVudC5tYXRjaCgvXFxbKC4pXS8pO1xyXG5cdFx0XHRcdGlmIChtYXJrTWF0Y2ggJiYgbWFya01hdGNoWzFdKSB7XHJcblx0XHRcdFx0XHRjb25zdCBzdGF0dXMgPSB0aGlzLmdldFRhc2tTdGF0dXModGV4dENvbnRlbnQpO1xyXG5cclxuXHRcdFx0XHRcdC8vIENvdW50IGJhc2VkIG9uIHN0YXR1c1xyXG5cdFx0XHRcdFx0aWYgKHRoaXMuaXNDb21wbGV0ZWRUYXNrKHRleHRDb250ZW50KSkge1xyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWQrKztcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzID09PSBcImluUHJvZ3Jlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRpblByb2dyZXNzKys7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikge1xyXG5cdFx0XHRcdFx0XHRhYmFuZG9uZWQrKztcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzID09PSBcInBsYW5uZWRcIikge1xyXG5cdFx0XHRcdFx0XHRwbGFubmVkKys7XHJcblx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJub3RTdGFydGVkXCIpIHtcclxuXHRcdFx0XHRcdFx0bm90U3RhcnRlZCsrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBGYWxsYmFjayB0byBjaGVja2luZyBpZiB0aGUgY2hlY2tib3ggaXMgY2hlY2tlZFxyXG5cdFx0XHRcdFx0Y29uc3QgY2hlY2tib3ggPSBjaGVja2JveEVsZW1lbnQgYXMgSFRNTElucHV0RWxlbWVudDtcclxuXHRcdFx0XHRcdGlmIChjaGVja2JveC5jaGVja2VkKSB7XHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZCsrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0bm90U3RhcnRlZCsrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMuY29tcGxldGVkID0gY29tcGxldGVkO1xyXG5cdFx0dGhpcy5pblByb2dyZXNzID0gaW5Qcm9ncmVzcztcclxuXHRcdHRoaXMuYWJhbmRvbmVkID0gYWJhbmRvbmVkO1xyXG5cdFx0dGhpcy5wbGFubmVkID0gcGxhbm5lZDtcclxuXHRcdHRoaXMubm90U3RhcnRlZCA9IG5vdFN0YXJ0ZWQ7XHJcblx0XHR0aGlzLnRvdGFsID0gdG90YWw7XHJcblx0fVxyXG5cdGNvdW50VGFza3MoYWxsVGFza3M6IEhUTUxFbGVtZW50W10pIHtcclxuXHRcdGxldCBjb21wbGV0ZWQgPSAwO1xyXG5cdFx0bGV0IGluUHJvZ3Jlc3MgPSAwO1xyXG5cdFx0bGV0IGFiYW5kb25lZCA9IDA7XHJcblx0XHRsZXQgcGxhbm5lZCA9IDA7XHJcblx0XHRsZXQgbm90U3RhcnRlZCA9IDA7XHJcblx0XHRsZXQgdG90YWwgPSAwO1xyXG5cclxuXHRcdGZvciAobGV0IGVsZW1lbnQgb2YgYWxsVGFza3MpIHtcclxuXHRcdFx0Ly8gY29uc3QgaXNQYXJlbnRDdXN0b21Hb2FsOiBib29sZWFuID0gY2hlY2tJZlBhcmVudEVsZW1lbnRIYXNHb2FsRm9ybWF0KGVsZW1lbnQucGFyZW50RWxlbWVudClcclxuXHRcdFx0bGV0IHN1YlRhc2tHb2FsOiBudWxsIHwgbnVtYmVyID0gbnVsbDtcclxuXHRcdFx0Y29uc3QgdXNlVGFza0dvYWw6IGJvb2xlYW4gPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5hbGxvd0N1c3RvbVByb2dyZXNzR29hbCAmJlxyXG5cdFx0XHRcdGNoZWNrSWZQYXJlbnRFbGVtZW50SGFzR29hbEZvcm1hdChcclxuXHRcdFx0XHRcdGVsZW1lbnQucGFyZW50RWxlbWVudD8ucGFyZW50RWxlbWVudFxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGNoZWNrYm94RWxlbWVudCA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcihcclxuXHRcdFx0XHRcIi50YXNrLWxpc3QtaXRlbS1jaGVja2JveFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICghY2hlY2tib3hFbGVtZW50KSBjb250aW51ZTtcclxuXHJcblx0XHRcdC8vIEZpcnN0IHRyeSB0byBnZXQgc3RhdHVzIGZyb20gZGF0YS10YXNrIGF0dHJpYnV0ZVxyXG5cdFx0XHRjb25zdCBkYXRhVGFzayA9IGVsZW1lbnQuZ2V0QXR0cmlidXRlKFwiZGF0YS10YXNrXCIpO1xyXG5cdFx0XHRpZiAoZGF0YVRhc2spIHtcclxuXHRcdFx0XHRjb25zdCBzdGF0dXMgPSB0aGlzLmdldFRhc2tTdGF0dXNGcm9tRGF0YVRhc2soZGF0YVRhc2spO1xyXG5cclxuXHRcdFx0XHRpZiAodXNlVGFza0dvYWwpXHJcblx0XHRcdFx0XHRzdWJUYXNrR29hbCA9IGV4dHJhY3RUYXNrQW5kR29hbEluZm9SZWFkTW9kZShlbGVtZW50KTtcclxuXHJcblx0XHRcdFx0aWYgKHRoaXMuaXNDb21wbGV0ZWRUYXNrRnJvbURhdGFUYXNrKGRhdGFUYXNrKSkge1xyXG5cdFx0XHRcdFx0aWYgKCF1c2VUYXNrR29hbCkgY29tcGxldGVkKys7XHJcblx0XHRcdFx0XHRpZiAoc3ViVGFza0dvYWwgIT09IG51bGwpIGNvbXBsZXRlZCArPSBzdWJUYXNrR29hbDtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHtcclxuXHRcdFx0XHRcdGlmICghdXNlVGFza0dvYWwpIGluUHJvZ3Jlc3MrKztcclxuXHRcdFx0XHRcdGlmICh1c2VUYXNrR29hbCAmJiBzdWJUYXNrR29hbCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdFx0aW5Qcm9ncmVzcyArPSBzdWJUYXNrR29hbDtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikge1xyXG5cdFx0XHRcdFx0aWYgKCF1c2VUYXNrR29hbCkgYWJhbmRvbmVkKys7XHJcblx0XHRcdFx0XHRpZiAodXNlVGFza0dvYWwgJiYgc3ViVGFza0dvYWwgIT09IG51bGwpXHJcblx0XHRcdFx0XHRcdGFiYW5kb25lZCArPSBzdWJUYXNrR29hbDtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJwbGFubmVkXCIpIHtcclxuXHRcdFx0XHRcdGlmICghdXNlVGFza0dvYWwpIHBsYW5uZWQrKztcclxuXHRcdFx0XHRcdGlmICh1c2VUYXNrR29hbCAmJiBzdWJUYXNrR29hbCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdFx0cGxhbm5lZCArPSBzdWJUYXNrR29hbDtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJub3RTdGFydGVkXCIpIHtcclxuXHRcdFx0XHRcdGlmICghdXNlVGFza0dvYWwpIG5vdFN0YXJ0ZWQrKztcclxuXHRcdFx0XHRcdGlmICh1c2VUYXNrR29hbCAmJiBzdWJUYXNrR29hbCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdFx0bm90U3RhcnRlZCArPSBzdWJUYXNrR29hbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRmFsbGJhY2sgdG8gdGhlIHRleHQgY29udGVudCBtZXRob2RcclxuXHRcdFx0XHRjb25zdCB0ZXh0Q29udGVudCA9IGVsZW1lbnQudGV4dENvbnRlbnQ/LnRyaW0oKSB8fCBcIlwiO1xyXG5cdFx0XHRcdGNvbnN0IGNoZWNrYm94ID0gY2hlY2tib3hFbGVtZW50IGFzIEhUTUxJbnB1dEVsZW1lbnQ7XHJcblxyXG5cdFx0XHRcdC8vIEV4dHJhY3QgdGhlIHRhc2sgbWFya1xyXG5cdFx0XHRcdGNvbnN0IG1hcmtNYXRjaCA9IHRleHRDb250ZW50Lm1hdGNoKC9cXFsoLildLyk7XHJcblx0XHRcdFx0aWYgKG1hcmtNYXRjaCAmJiBtYXJrTWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRcdGNvbnN0IHN0YXR1cyA9IHRoaXMuZ2V0VGFza1N0YXR1cyh0ZXh0Q29udGVudCk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ291bnQgYmFzZWQgb24gc3RhdHVzXHJcblx0XHRcdFx0XHRpZiAodGhpcy5pc0NvbXBsZXRlZFRhc2sodGV4dENvbnRlbnQpKSB7XHJcblx0XHRcdFx0XHRcdGNvbXBsZXRlZCsrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzdGF0dXMgPT09IFwiaW5Qcm9ncmVzc1wiKSB7XHJcblx0XHRcdFx0XHRcdGluUHJvZ3Jlc3MrKztcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzID09PSBcImFiYW5kb25lZFwiKSB7XHJcblx0XHRcdFx0XHRcdGFiYW5kb25lZCsrO1xyXG5cdFx0XHRcdFx0fSBlbHNlIGlmIChzdGF0dXMgPT09IFwicGxhbm5lZFwiKSB7XHJcblx0XHRcdFx0XHRcdHBsYW5uZWQrKztcclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzID09PSBcIm5vdFN0YXJ0ZWRcIikge1xyXG5cdFx0XHRcdFx0XHRub3RTdGFydGVkKys7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIGlmIChjaGVja2JveC5jaGVja2VkKSB7XHJcblx0XHRcdFx0XHRjb21wbGV0ZWQrKztcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0bm90U3RhcnRlZCsrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dG90YWwrKztcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4geyBjb21wbGV0ZWQsIGluUHJvZ3Jlc3MsIGFiYW5kb25lZCwgcGxhbm5lZCwgbm90U3RhcnRlZCwgdG90YWwgfTtcclxuXHR9XHJcblxyXG5cdHVwZGF0ZUNvbXBsZXRlZEFuZFRvdGFsKCkge1xyXG5cdFx0bGV0IHRvdGFsID0gMDtcclxuXHJcblx0XHQvLyBHZXQgYWxsIHBhcmVudC1jaGlsZCByZWxhdGlvbnNoaXBzIHRvIGNoZWNrIGZvciBpbmRlbnRhdGlvblxyXG5cdFx0Y29uc3QgcGFyZW50Q2hpbGRNYXAgPSBuZXcgTWFwPEhUTUxFbGVtZW50LCBIVE1MRWxlbWVudFtdPigpO1xyXG5cdFx0Zm9yIChsZXQgZWxlbWVudCBvZiB0aGlzLmdyb3VwLmNoaWxkcmVuRWxlbWVudCkge1xyXG5cdFx0XHRjb25zdCBwYXJlbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XHJcblx0XHRcdGlmIChwYXJlbnQpIHtcclxuXHRcdFx0XHRpZiAoIXBhcmVudENoaWxkTWFwLmhhcyhwYXJlbnQpKSB7XHJcblx0XHRcdFx0XHRwYXJlbnRDaGlsZE1hcC5zZXQocGFyZW50LCBbXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHBhcmVudENoaWxkTWFwLmdldChwYXJlbnQpPy5wdXNoKGVsZW1lbnQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgYWxsVGFza3M6IEhUTUxFbGVtZW50W10gPSBbXTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiB0aGUgZWxlbWVudCBpcyBhIHRvcC1sZXZlbCB0YXNrIG9yIGlmIGNvdW50U3ViTGV2ZWwgaXMgZW5hYmxlZFxyXG5cdFx0Zm9yIChsZXQgZWxlbWVudCBvZiB0aGlzLmdyb3VwLmNoaWxkcmVuRWxlbWVudCkge1xyXG5cdFx0XHRjb25zdCBjaGVja2JveEVsZW1lbnQgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoXHJcblx0XHRcdFx0XCIudGFzay1saXN0LWl0ZW0tY2hlY2tib3hcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBHZXQgdGhlIHBhcmVudCBvZiB0aGUgY3VycmVudCBlbGVtZW50XHJcblxyXG5cdFx0XHRpZiAoIWNoZWNrYm94RWxlbWVudCkgY29udGludWU7XHJcblxyXG5cdFx0XHRhbGxUYXNrcy5wdXNoKGVsZW1lbnQpO1xyXG5cclxuXHRcdFx0Ly8gU2tpcCBpZiB0aGlzIGlzIGEgc3VibGV2ZWwgdGFzayBhbmQgY291bnRTdWJMZXZlbCBpcyBkaXNhYmxlZFxyXG5cdFx0XHRpZiAoIXRoaXMucGx1Z2luPy5zZXR0aW5ncy5jb3VudFN1YkxldmVsKSB7XHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhpcyB0YXNrIGlzIGEgc3VidGFzayBieSBleGFtaW5pbmcgaXRzIHBvc2l0aW9uIGFuZCBwYXJlbnQtY2hpbGQgcmVsYXRpb25zaGlwc1xyXG5cdFx0XHRcdGNvbnN0IHBhcmVudCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcclxuXHRcdFx0XHRpZiAocGFyZW50ICYmIHBhcmVudC5jbGFzc0xpc3QuY29udGFpbnMoXCJ0YXNrLWxpc3QtaXRlbVwiKSkge1xyXG5cdFx0XHRcdFx0Ly8gVGhpcyBpcyBhIHN1YnRhc2sgKG5lc3RlZCB1bmRlciBhbm90aGVyIHRhc2spLCBzbyBza2lwIGl0XHJcblx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHRoaXMgaXMgYSBoZWFkaW5nIHByb2dyZXNzIGJhciwgb25seSBjb3VudCB0b3AtbGV2ZWwgdGFza3NcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0aGlzLmdyb3VwLnBhcmVudEVsZW1lbnQubWF0Y2hlcyhcImgxLCBoMiwgaDMsIGg0LCBoNSwgaDZcIilcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIEdldCBpbmRlbnRhdGlvbiBieSBjaGVja2luZyB0aGUgRE9NIHN0cnVjdHVyZSBvciB0YXNrIGNvbnRlbnRcclxuXHRcdFx0XHRcdGNvbnN0IGxpRWxlbWVudCA9IGVsZW1lbnQuY2xvc2VzdChcImxpXCIpO1xyXG5cdFx0XHRcdFx0aWYgKGxpRWxlbWVudCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBwYXJlbnRMaXN0ID0gbGlFbGVtZW50LnBhcmVudEVsZW1lbnQ7XHJcblx0XHRcdFx0XHRcdGNvbnN0IGdyYW5kUGFyZW50TGlzdEl0ZW0gPVxyXG5cdFx0XHRcdFx0XHRcdHBhcmVudExpc3Q/LnBhcmVudEVsZW1lbnQ/LmNsb3Nlc3QoXCJsaVwiKTtcclxuXHRcdFx0XHRcdFx0aWYgKGdyYW5kUGFyZW50TGlzdEl0ZW0pIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBUaGlzIGlzIGEgbmVzdGVkIHRhc2ssIHNvIHNraXAgaXRcclxuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIGlmICh0aGlzLnBsdWdpbj8uc2V0dGluZ3MuY291bnRTdWJMZXZlbCkge1xyXG5cdFx0XHRcdGNvbnN0IGNoaWxkcmVuVGFza3MgPSBlbGVtZW50LmZpbmRBbGwoXCIudGFzay1saXN0LWl0ZW1cIik7XHJcblx0XHRcdFx0Zm9yIChsZXQgY2hpbGQgb2YgY2hpbGRyZW5UYXNrcykge1xyXG5cdFx0XHRcdFx0dG90YWwrKztcclxuXHRcdFx0XHRcdGFsbFRhc2tzLnB1c2goY2hpbGQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBwYXJlbnRHb2FsID0gZ2V0Q3VzdG9tVG90YWxHb2FsUmVhZE1vZGUoXHJcblx0XHRcdFx0ZWxlbWVudC5wYXJlbnRFbGVtZW50Py5wYXJlbnRFbGVtZW50XHJcblx0XHRcdCk7XHJcblx0XHRcdGlmIChwYXJlbnRHb2FsKSB0b3RhbCA9IHBhcmVudEdvYWw7XHJcblx0XHRcdGVsc2UgdG90YWwrKztcclxuXHJcblx0XHRcdC8vIHRvdGFsKys7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgeyBjb21wbGV0ZWQsIGluUHJvZ3Jlc3MsIGFiYW5kb25lZCwgcGxhbm5lZCwgbm90U3RhcnRlZCB9ID1cclxuXHRcdFx0dGhpcy5jb3VudFRhc2tzKGFsbFRhc2tzKTtcclxuXHJcblx0XHR0aGlzLmNvbXBsZXRlZCA9IGNvbXBsZXRlZDtcclxuXHRcdHRoaXMuaW5Qcm9ncmVzcyA9IGluUHJvZ3Jlc3M7XHJcblx0XHR0aGlzLmFiYW5kb25lZCA9IGFiYW5kb25lZDtcclxuXHRcdHRoaXMucGxhbm5lZCA9IHBsYW5uZWQ7XHJcblx0XHR0aGlzLm5vdFN0YXJ0ZWQgPSBub3RTdGFydGVkO1xyXG5cdFx0dGhpcy50b3RhbCA9IHRvdGFsO1xyXG5cdH1cclxuXHJcblx0Y2hhbmdlUGVyY2VudGFnZSgpIHtcclxuXHRcdGlmICh0aGlzLnRvdGFsID09PSAwKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgY29tcGxldGVkUGVyY2VudGFnZSA9XHJcblx0XHRcdE1hdGgucm91bmQoKHRoaXMuY29tcGxldGVkIC8gdGhpcy50b3RhbCkgKiAxMDAwMCkgLyAxMDA7XHJcblx0XHRjb25zdCBpblByb2dyZXNzUGVyY2VudGFnZSA9XHJcblx0XHRcdE1hdGgucm91bmQoKHRoaXMuaW5Qcm9ncmVzcyAvIHRoaXMudG90YWwpICogMTAwMDApIC8gMTAwO1xyXG5cdFx0Y29uc3QgYWJhbmRvbmVkUGVyY2VudGFnZSA9XHJcblx0XHRcdE1hdGgucm91bmQoKHRoaXMuYWJhbmRvbmVkIC8gdGhpcy50b3RhbCkgKiAxMDAwMCkgLyAxMDA7XHJcblx0XHRjb25zdCBwbGFubmVkUGVyY2VudGFnZSA9XHJcblx0XHRcdE1hdGgucm91bmQoKHRoaXMucGxhbm5lZCAvIHRoaXMudG90YWwpICogMTAwMDApIC8gMTAwO1xyXG5cclxuXHRcdC8vIFNldCB0aGUgY29tcGxldGVkIHBhcnRcclxuXHRcdHRoaXMucHJvZ3Jlc3NFbC5zdHlsZS53aWR0aCA9IGNvbXBsZXRlZFBlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHJcblx0XHQvLyBTZXQgdGhlIGluLXByb2dyZXNzIHBhcnQgKGlmIGl0IGV4aXN0cylcclxuXHRcdGlmICh0aGlzLmluUHJvZ3Jlc3NFbCkge1xyXG5cdFx0XHR0aGlzLmluUHJvZ3Jlc3NFbC5zdHlsZS53aWR0aCA9IGluUHJvZ3Jlc3NQZXJjZW50YWdlICsgXCIlXCI7XHJcblx0XHRcdHRoaXMuaW5Qcm9ncmVzc0VsLnN0eWxlLmxlZnQgPSBjb21wbGV0ZWRQZXJjZW50YWdlICsgXCIlXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gU2V0IHRoZSBhYmFuZG9uZWQgcGFydCAoaWYgaXQgZXhpc3RzKVxyXG5cdFx0aWYgKHRoaXMuYWJhbmRvbmVkRWwpIHtcclxuXHRcdFx0dGhpcy5hYmFuZG9uZWRFbC5zdHlsZS53aWR0aCA9IGFiYW5kb25lZFBlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdFx0dGhpcy5hYmFuZG9uZWRFbC5zdHlsZS5sZWZ0ID1cclxuXHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlICsgaW5Qcm9ncmVzc1BlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgdGhlIHBsYW5uZWQgcGFydCAoaWYgaXQgZXhpc3RzKVxyXG5cdFx0aWYgKHRoaXMucGxhbm5lZEVsKSB7XHJcblx0XHRcdHRoaXMucGxhbm5lZEVsLnN0eWxlLndpZHRoID0gcGxhbm5lZFBlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdFx0dGhpcy5wbGFubmVkRWwuc3R5bGUubGVmdCA9XHJcblx0XHRcdFx0Y29tcGxldGVkUGVyY2VudGFnZSArXHJcblx0XHRcdFx0aW5Qcm9ncmVzc1BlcmNlbnRhZ2UgK1xyXG5cdFx0XHRcdGFiYW5kb25lZFBlcmNlbnRhZ2UgK1xyXG5cdFx0XHRcdFwiJVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFVwZGF0ZSB0aGUgY2xhc3MgYmFzZWQgb24gcHJvZ3Jlc3MgcGVyY2VudGFnZVxyXG5cdFx0bGV0IHByb2dyZXNzQ2xhc3MgPSBcInByb2dyZXNzLWJhci1pbmxpbmVcIjtcclxuXHJcblx0XHRzd2l0Y2ggKHRydWUpIHtcclxuXHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID09PSAwOlxyXG5cdFx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgcHJvZ3Jlc3MtYmFyLWlubGluZS1lbXB0eVwiO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPiAwICYmIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPCAyNTpcclxuXHRcdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIHByb2dyZXNzLWJhci1pbmxpbmUtMFwiO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPj0gMjUgJiYgY29tcGxldGVkUGVyY2VudGFnZSA8IDUwOlxyXG5cdFx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgcHJvZ3Jlc3MtYmFyLWlubGluZS0xXCI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA+PSA1MCAmJiBjb21wbGV0ZWRQZXJjZW50YWdlIDwgNzU6XHJcblx0XHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBwcm9ncmVzcy1iYXItaW5saW5lLTJcIjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID49IDc1ICYmIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPCAxMDA6XHJcblx0XHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBwcm9ncmVzcy1iYXItaW5saW5lLTNcIjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID49IDEwMDpcclxuXHRcdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIHByb2dyZXNzLWJhci1pbmxpbmUtY29tcGxldGVcIjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHJcblx0XHQvLyBBZGQgY2xhc3NlcyBmb3Igc3BlY2lhbCBzdGF0ZXNcclxuXHRcdGlmIChpblByb2dyZXNzUGVyY2VudGFnZSA+IDApIHtcclxuXHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBoYXMtaW4tcHJvZ3Jlc3NcIjtcclxuXHRcdH1cclxuXHRcdGlmIChhYmFuZG9uZWRQZXJjZW50YWdlID4gMCkge1xyXG5cdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIGhhcy1hYmFuZG9uZWRcIjtcclxuXHRcdH1cclxuXHRcdGlmIChwbGFubmVkUGVyY2VudGFnZSA+IDApIHtcclxuXHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBoYXMtcGxhbm5lZFwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMucHJvZ3Jlc3NFbC5jbGFzc05hbWUgPSBwcm9ncmVzc0NsYXNzO1xyXG5cdH1cclxuXHJcblx0Y2hhbmdlTnVtYmVyKCkge1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJ0ZXh0XCIgfHxcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwiYm90aFwiXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc3QgdGV4dCA9IGZvcm1hdFByb2dyZXNzVGV4dChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IHRoaXMuY29tcGxldGVkLFxyXG5cdFx0XHRcdFx0dG90YWw6IHRoaXMudG90YWwsXHJcblx0XHRcdFx0XHRpblByb2dyZXNzOiB0aGlzLmluUHJvZ3Jlc3MsXHJcblx0XHRcdFx0XHRhYmFuZG9uZWQ6IHRoaXMuYWJhbmRvbmVkLFxyXG5cdFx0XHRcdFx0bm90U3RhcnRlZDogdGhpcy5ub3RTdGFydGVkLFxyXG5cdFx0XHRcdFx0cGxhbm5lZDogdGhpcy5wbGFubmVkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghdGhpcy5udW1iZXJFbCkge1xyXG5cdFx0XHRcdHRoaXMubnVtYmVyRWwgPSB0aGlzLnByb2dyZXNzQmFyRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcInByb2dyZXNzLXN0YXR1c1wiLFxyXG5cdFx0XHRcdFx0dGV4dDogdGV4dCxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aGlzLm51bWJlckVsLmlubmVyVGV4dCA9IHRleHQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG9ubG9hZCgpIHtcclxuXHRcdHRoaXMucHJvZ3Jlc3NCYXJFbCA9IGNyZWF0ZVNwYW4oXHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcImJvdGhcIiB8fFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcInRleHRcIlxyXG5cdFx0XHRcdD8gXCJjbS10YXNrLXByb2dyZXNzLWJhciB3aXRoLW51bWJlclwiXHJcblx0XHRcdFx0OiBcImNtLXRhc2stcHJvZ3Jlc3MtYmFyXCJcclxuXHRcdCk7XHJcblx0XHR0aGlzLnByb2dyZXNzQmFja0dyb3VuZEVsID0gdGhpcy5wcm9ncmVzc0JhckVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInByb2dyZXNzLWJhci1pbmxpbmUtYmFja2dyb3VuZFwiLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGVsZW1lbnRzIGZvciBlYWNoIHN0YXR1cyB0eXBlXHJcblx0XHR0aGlzLnByb2dyZXNzRWwgPSB0aGlzLnByb2dyZXNzQmFja0dyb3VuZEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0Y2xzOiBcInByb2dyZXNzLWJhci1pbmxpbmUgcHJvZ3Jlc3MtY29tcGxldGVkXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBPbmx5IGNyZWF0ZSB0aGVzZSBlbGVtZW50cyBpZiB3ZSBoYXZlIHRhc2tzIG9mIHRoZXNlIHR5cGVzXHJcblx0XHRpZiAodGhpcy5pblByb2dyZXNzID4gMCkge1xyXG5cdFx0XHR0aGlzLmluUHJvZ3Jlc3NFbCA9IHRoaXMucHJvZ3Jlc3NCYWNrR3JvdW5kRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJwcm9ncmVzcy1iYXItaW5saW5lIHByb2dyZXNzLWluLXByb2dyZXNzXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmFiYW5kb25lZCA+IDApIHtcclxuXHRcdFx0dGhpcy5hYmFuZG9uZWRFbCA9IHRoaXMucHJvZ3Jlc3NCYWNrR3JvdW5kRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJwcm9ncmVzcy1iYXItaW5saW5lIHByb2dyZXNzLWFiYW5kb25lZFwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAodGhpcy5wbGFubmVkID4gMCkge1xyXG5cdFx0XHR0aGlzLnBsYW5uZWRFbCA9IHRoaXMucHJvZ3Jlc3NCYWNrR3JvdW5kRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJwcm9ncmVzcy1iYXItaW5saW5lIHByb2dyZXNzLXBsYW5uZWRcIixcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJib3RoXCIgfHxcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwidGV4dFwiXHJcblx0XHQpIHtcclxuXHRcdFx0Ly8g5L2/55SoIGZvcm1hdFByb2dyZXNzVGV4dCDlh73mlbDnlJ/miJDov5vluqbmlofmnKxcclxuXHRcdFx0Y29uc3QgdGV4dCA9IGZvcm1hdFByb2dyZXNzVGV4dChcclxuXHRcdFx0XHR7XHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IHRoaXMuY29tcGxldGVkLFxyXG5cdFx0XHRcdFx0dG90YWw6IHRoaXMudG90YWwsXHJcblx0XHRcdFx0XHRpblByb2dyZXNzOiB0aGlzLmluUHJvZ3Jlc3MsXHJcblx0XHRcdFx0XHRhYmFuZG9uZWQ6IHRoaXMuYWJhbmRvbmVkLFxyXG5cdFx0XHRcdFx0bm90U3RhcnRlZDogdGhpcy5ub3RTdGFydGVkLFxyXG5cdFx0XHRcdFx0cGxhbm5lZDogdGhpcy5wbGFubmVkLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHRoaXMubnVtYmVyRWwgPSB0aGlzLnByb2dyZXNzQmFyRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdGNsczogXCJwcm9ncmVzcy1zdGF0dXNcIixcclxuXHRcdFx0XHR0ZXh0OiB0ZXh0LFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmNoYW5nZVBlcmNlbnRhZ2UoKTtcclxuXHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcInRleHRcIiB8fFxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJub25lXCJcclxuXHRcdCkge1xyXG5cdFx0XHR0aGlzLnByb2dyZXNzQmFja0dyb3VuZEVsLmhpZGUoKTtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnBsdWdpbi5hZGRDaGlsZCh0aGlzKTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5wcm9ncmVzc0JhckVsO1xyXG5cdH1cclxuXHJcblx0b251bmxvYWQoKSB7XHJcblx0XHRzdXBlci5vbnVubG9hZCgpO1xyXG5cdH1cclxufVxyXG4iXX0=