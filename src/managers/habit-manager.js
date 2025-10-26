import { __awaiter } from "tslib";
import { Component, moment, TFile, } from "obsidian";
import { createDailyNote, getAllDailyNotes, getDailyNote, getDateFromFile, appHasDailyNotesPluginLoaded, getDailyNoteSettings, } from "obsidian-daily-notes-interface";
import { Events, on, emit } from "../dataflow/events/Events";
import { DateInheritanceService } from "../services/date-inheritance-service";
// Helpers for habit processing
const hasValue = (v) => v !== undefined && v !== null && v !== "";
const slugify = (s) => (s !== null && s !== void 0 ? s : "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
export class HabitManager extends Component {
    constructor(plugin) {
        super();
        this.habits = [];
        this.plugin = plugin;
        this.dateInheritanceService = new DateInheritanceService(plugin.app, plugin.app.vault, plugin.app.metadataCache);
    }
    onload() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initializeHabits();
            const useDataflow = (_a = this.plugin.settings) === null || _a === void 0 ? void 0 : _a.enableIndexer;
            if (useDataflow) {
                // Use dataflow's unified TASK_CACHE_UPDATED event (post-index) to track changes
                this.registerEvent(on(this.plugin.app, Events.TASK_CACHE_UPDATED, (payload) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const changed = (payload === null || payload === void 0 ? void 0 : payload.changedFiles) || [];
                        if (!changed.length)
                            return;
                        for (const p of changed) {
                            // Skip non-file markers like 'ics:events'
                            if (!p || p.includes(":"))
                                continue;
                            const f = this.plugin.app.vault.getAbstractFileByPath(p);
                            if (!f)
                                continue;
                            if (!this.isDailyNote(f))
                                continue;
                            const c = this.plugin.app.metadataCache.getFileCache(f);
                            if (c)
                                this.updateHabitCompletions(f, c);
                        }
                    }
                    catch (e) {
                        console.warn("[HabitManager] Failed to handle TASK_CACHE_UPDATED for habits", e);
                    }
                })));
                // Listen for unified FILE_UPDATED events to handle deletions in dataflow mode
                this.registerEvent(on(this.plugin.app, Events.FILE_UPDATED, ({ path, reason }) => {
                    try {
                        if (reason === "delete" &&
                            typeof path === "string" &&
                            this.isDailyNotePath(path)) {
                            this.handleDailyNoteDeletedByPath(path);
                        }
                    }
                    catch (e) {
                        console.warn("[HabitManager] Failed to handle FILE_UPDATED(delete) for habits", e);
                    }
                }));
            }
            else {
                // Fallback for legacy mode without dataflow
                this.registerEvent(this.plugin.app.metadataCache.on("changed", (file, _data, cache) => {
                    if (this.isDailyNote(file)) {
                        this.updateHabitCompletions(file, cache);
                    }
                }));
                // Also listen for file deletions in legacy mode
                this.registerEvent(this.plugin.app.vault.on("delete", (file) => {
                    if (file instanceof TFile && this.isDailyNote(file)) {
                        this.handleDailyNoteDeleted(file);
                    }
                }));
            }
        });
    }
    initializeHabits() {
        return __awaiter(this, void 0, void 0, function* () {
            const dailyNotes = yield this.getDailyNotes();
            const processedHabits = yield this.processHabits(dailyNotes);
            console.log("processedHabits", processedHabits);
            this.habits = processedHabits;
            this.plugin.app.workspace.trigger("task-genius:habit-index-updated", this.habits);
        });
    }
    convertBaseHabitsToHabitProps(baseHabits) {
        return baseHabits.map((baseHabit) => {
            switch (baseHabit.type) {
                case "daily": {
                    const dailyHabit = baseHabit;
                    return {
                        id: dailyHabit.id,
                        name: dailyHabit.name,
                        description: dailyHabit.description,
                        icon: dailyHabit.icon,
                        property: hasValue(dailyHabit.property)
                            ? dailyHabit.property
                            : slugify(dailyHabit.name),
                        type: dailyHabit.type,
                        completionText: dailyHabit.completionText,
                        completions: {},
                    };
                }
                case "count": {
                    const countHabit = baseHabit;
                    return {
                        id: countHabit.id,
                        name: countHabit.name,
                        description: countHabit.description,
                        icon: countHabit.icon,
                        property: hasValue(countHabit.property)
                            ? countHabit.property
                            : slugify(countHabit.name),
                        type: countHabit.type,
                        min: countHabit.min,
                        max: countHabit.max,
                        notice: countHabit.notice,
                        countUnit: countHabit.countUnit,
                        completions: {},
                    };
                }
                case "scheduled": {
                    const scheduledHabit = baseHabit;
                    return {
                        id: scheduledHabit.id,
                        name: scheduledHabit.name,
                        description: scheduledHabit.description,
                        icon: scheduledHabit.icon,
                        type: scheduledHabit.type,
                        events: scheduledHabit.events,
                        propertiesMap: scheduledHabit.propertiesMap,
                        completions: {},
                    };
                }
                case "mapping": {
                    const mappingHabit = baseHabit;
                    return {
                        id: mappingHabit.id,
                        name: mappingHabit.name,
                        description: mappingHabit.description,
                        icon: mappingHabit.icon,
                        property: hasValue(mappingHabit.property)
                            ? mappingHabit.property
                            : slugify(mappingHabit.name),
                        type: mappingHabit.type,
                        mapping: mappingHabit.mapping,
                        completions: {},
                    };
                }
            }
        });
    }
    getDailyNotes() {
        return __awaiter(this, void 0, void 0, function* () {
            const files = getAllDailyNotes();
            return Object.values(files);
        });
    }
    isDailyNote(file) {
        try {
            // Use 'day' to specifically target daily notes if weekly/monthly are handled differently
            return getDateFromFile(file, "day") !== null;
        }
        catch (e) {
            // Handle cases where getDateFromFile might throw error for non-note files
            // console.warn(`Could not determine if file is a daily note: ${file.path}`, e);
            return false;
        }
    }
    processHabits(dailyNotes) {
        return __awaiter(this, void 0, void 0, function* () {
            const habitsWithoutCompletions = this.plugin.settings.habit.habits;
            const convertedHabits = this.convertBaseHabitsToHabitProps(habitsWithoutCompletions);
            for (const note of dailyNotes) {
                if (!this.isDailyNote(note))
                    continue; // Skip non-daily notes
                const cache = this.plugin.app.metadataCache.getFileCache(note);
                const frontmatter = cache === null || cache === void 0 ? void 0 : cache.frontmatter;
                if (frontmatter) {
                    const dateMoment = getDateFromFile(note, "day");
                    if (!dateMoment)
                        continue; // Should not happen due to isDailyNote check, but belts and suspenders
                    const date = dateMoment.format("YYYY-MM-DD");
                    for (const habit of convertedHabits) {
                        if (!habit.completions)
                            habit.completions = {}; // Ensure completions object exists
                        switch (habit.type) {
                            case "scheduled":
                                // Handle scheduled habits (journey habits)
                                const scheduledHabit = habit;
                                const eventMap = habit.propertiesMap || {};
                                if (!scheduledHabit.completions[date])
                                    scheduledHabit.completions[date] = {};
                                for (const [eventName, propertyKey,] of Object.entries(eventMap)) {
                                    if (propertyKey &&
                                        hasValue(frontmatter[propertyKey])) {
                                        const value = frontmatter[propertyKey];
                                        // 只有当值不为空时才添加到completions
                                        if (hasValue(value)) {
                                            // Store the raw value or format it as needed
                                            scheduledHabit.completions[date][eventName] = value;
                                        }
                                    }
                                }
                                break;
                            case "daily":
                                // Handle daily habits with custom completion text
                                const dailyHabit = habit;
                                if (habit.property &&
                                    hasValue(frontmatter[habit.property])) {
                                    const value = frontmatter[habit.property];
                                    // If completionText is defined, check if value matches it
                                    if (dailyHabit.completionText) {
                                        // If value matches completionText, mark as completed (1)
                                        // Otherwise, store the actual text value
                                        if (value === dailyHabit.completionText) {
                                            dailyHabit.completions[date] = 1;
                                        }
                                        else {
                                            dailyHabit.completions[date] =
                                                value;
                                        }
                                    }
                                    else {
                                        // Default behavior: boolean value for completion
                                        dailyHabit.completions[date] =
                                            value === true || value === "true";
                                    }
                                    break; // Use the first found property
                                }
                                break;
                            case "count":
                                // Handle count habits
                                const countHabit = habit;
                                if (countHabit.property &&
                                    hasValue(frontmatter[countHabit.property])) {
                                    const value = frontmatter[countHabit.property];
                                    // For count habits, try to parse as number
                                    const numValue = Number(value);
                                    if (!isNaN(numValue)) {
                                        countHabit.completions[date] = numValue;
                                    }
                                }
                                break;
                            case "mapping":
                                // Handle mapping habits
                                const mappingHabit = habit;
                                if (mappingHabit.property &&
                                    hasValue(frontmatter[mappingHabit.property])) {
                                    const value = frontmatter[mappingHabit.property];
                                    // For mapping habits, try to parse as number
                                    const numValue = Number(value);
                                    if (!isNaN(numValue) &&
                                        mappingHabit.mapping[numValue]) {
                                        mappingHabit.completions[date] = numValue;
                                    }
                                }
                                break;
                        }
                    }
                }
            }
            return convertedHabits;
        });
    }
    handleDailyNoteDeleted(file) {
        const dateMoment = getDateFromFile(file, "day");
        if (!dateMoment)
            return; // Not a daily note
        const dateStr = dateMoment.format("YYYY-MM-DD");
        let habitsChanged = false;
        // Remove completions for this date from all habits
        this.habits = this.habits.map((habit) => {
            const habitClone = JSON.parse(JSON.stringify(habit));
            if (habitClone.completions &&
                habitClone.completions[dateStr] !== undefined) {
                delete habitClone.completions[dateStr];
                habitsChanged = true;
            }
            return habitClone;
        });
        if (habitsChanged) {
            // Trigger update event to refresh the UI
            this.plugin.app.workspace.trigger("task-genius:habit-index-updated", this.habits);
        }
    }
    isDailyNotePath(path) {
        try {
            return !!this.dateInheritanceService.extractDailyNoteDate(path);
        }
        catch (e) {
            return false;
        }
    }
    handleDailyNoteDeletedByPath(path) {
        try {
            const date = this.dateInheritanceService.extractDailyNoteDate(path);
            if (!date)
                return;
            const dateStr = moment(date).format("YYYY-MM-DD");
            let habitsChanged = false;
            this.habits = this.habits.map((habit) => {
                const habitClone = JSON.parse(JSON.stringify(habit));
                if (habitClone.completions &&
                    habitClone.completions[dateStr] !== undefined) {
                    delete habitClone.completions[dateStr];
                    habitsChanged = true;
                }
                return habitClone;
            });
            if (habitsChanged) {
                this.plugin.app.workspace.trigger("task-genius:habit-index-updated", this.habits);
            }
        }
        catch (e) {
            console.warn("[HabitManager] Failed to handle daily note deletion by path", e);
        }
    }
    updateHabitCompletions(file, cache) {
        if (!(cache === null || cache === void 0 ? void 0 : cache.frontmatter))
            return;
        const dateMoment = getDateFromFile(file, "day");
        if (!dateMoment)
            return; // Not a daily note
        const dateStr = dateMoment.format("YYYY-MM-DD");
        let habitsChanged = false;
        // 添加一个标记，防止在同一个事件循环中重复更新
        if (this._isUpdatingFromToggle) {
            this._isUpdatingFromToggle = false;
            return;
        }
        const updatedHabits = this.habits.map((habit) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const habitClone = JSON.parse(JSON.stringify(habit)); // Work on a clone
            if (!habitClone.completions)
                habitClone.completions = {};
            switch (habitClone.type) {
                case "scheduled":
                    // Handle scheduled habits (journey habits)
                    const scheduledHabit = habitClone;
                    const eventMap = habitClone.propertiesMap || {};
                    if (!scheduledHabit.completions[dateStr])
                        scheduledHabit.completions[dateStr] = {};
                    let eventChanged = false;
                    for (const [eventName, propertyKey] of Object.entries(eventMap)) {
                        if (propertyKey &&
                            hasValue((_a = cache.frontmatter) === null || _a === void 0 ? void 0 : _a[propertyKey])) {
                            const newValue = (_c = (_b = cache.frontmatter) === null || _b === void 0 ? void 0 : _b[propertyKey]) !== null && _c !== void 0 ? _c : "";
                            if (hasValue(newValue) &&
                                scheduledHabit.completions[dateStr][eventName] !== newValue) {
                                scheduledHabit.completions[dateStr][eventName] =
                                    newValue;
                                eventChanged = true;
                            }
                            else if (!hasValue(newValue) &&
                                ((_d = scheduledHabit.completions[dateStr]) === null || _d === void 0 ? void 0 : _d[eventName]) !== undefined) {
                                delete scheduledHabit.completions[dateStr][eventName];
                                eventChanged = true;
                            }
                        }
                        else if (((_e = scheduledHabit.completions[dateStr]) === null || _e === void 0 ? void 0 : _e[eventName]) !==
                            undefined) {
                            delete scheduledHabit.completions[dateStr][eventName];
                            eventChanged = true;
                        }
                    }
                    if (eventChanged)
                        habitsChanged = true;
                    break;
                case "daily":
                    // Handle daily habits with custom completion text
                    const dailyHabit = habitClone;
                    let foundDailyProperty = false;
                    if (dailyHabit.property &&
                        ((_f = cache.frontmatter) === null || _f === void 0 ? void 0 : _f[dailyHabit.property]) !==
                            undefined &&
                        ((_g = cache.frontmatter) === null || _g === void 0 ? void 0 : _g[dailyHabit.property]) !== "") {
                        foundDailyProperty = true;
                        const value = cache.frontmatter[dailyHabit.property];
                        // If completionText is defined, check if value matches it
                        if (dailyHabit.completionText) {
                            const newValue = value === dailyHabit.completionText
                                ? 1
                                : value;
                            if (dailyHabit.completions[dateStr] !== newValue) {
                                dailyHabit.completions[dateStr] = newValue;
                                habitsChanged = true;
                            }
                        }
                        else {
                            // Default behavior: boolean value for completion
                            const newValue = value === true || value === "true";
                            if (dailyHabit.completions[dateStr] !== newValue) {
                                dailyHabit.completions[dateStr] = newValue;
                                habitsChanged = true;
                            }
                        }
                        break; // Use the first found property
                    }
                    if (!foundDailyProperty &&
                        dailyHabit.completions[dateStr] !== undefined) {
                        delete dailyHabit.completions[dateStr];
                        habitsChanged = true;
                    }
                    break;
                case "count":
                    // Handle count habits
                    const countHabit = habitClone;
                    let foundCountProperty = false;
                    if (countHabit.property &&
                        ((_h = cache.frontmatter) === null || _h === void 0 ? void 0 : _h[countHabit.property]) !==
                            undefined &&
                        ((_j = cache.frontmatter) === null || _j === void 0 ? void 0 : _j[countHabit.property]) !== "") {
                        foundCountProperty = true;
                        const value = cache.frontmatter[countHabit.property];
                        const numValue = Number(value);
                        if (!isNaN(numValue) &&
                            countHabit.completions[dateStr] !== numValue) {
                            countHabit.completions[dateStr] = numValue;
                            habitsChanged = true;
                        }
                        break; // Use the first found property
                    }
                    if (!foundCountProperty &&
                        countHabit.completions[dateStr] !== undefined) {
                        delete countHabit.completions[dateStr];
                        habitsChanged = true;
                    }
                    break;
                case "mapping":
                    // Handle mapping habits
                    const mappingHabit = habitClone;
                    let foundMappingProperty = false;
                    if (mappingHabit.property &&
                        ((_k = cache.frontmatter) === null || _k === void 0 ? void 0 : _k[mappingHabit.property]) !==
                            undefined &&
                        ((_l = cache.frontmatter) === null || _l === void 0 ? void 0 : _l[mappingHabit.property]) !== "") {
                        foundMappingProperty = true;
                        const value = cache.frontmatter[mappingHabit.property];
                        const numValue = Number(value);
                        if (!isNaN(numValue) &&
                            mappingHabit.mapping[numValue] &&
                            mappingHabit.completions[dateStr] !== numValue) {
                            mappingHabit.completions[dateStr] = numValue;
                            habitsChanged = true;
                        }
                        break; // Use the first found property
                    }
                    if (!foundMappingProperty &&
                        mappingHabit.completions[dateStr] !== undefined) {
                        delete mappingHabit.completions[dateStr];
                        habitsChanged = true;
                    }
                    break;
            }
            return habitClone; // Return the updated clone
        });
        if (habitsChanged) {
            // Update state without tracking in history for background updates
            this.habits = updatedHabits;
            this.plugin.app.workspace.trigger("task-genius:habit-index-updated", this.habits);
        }
    }
    updateHabitInObsidian(updatedHabit, date) {
        return __awaiter(this, void 0, void 0, function* () {
            const app = this.plugin.app;
            const momentDate = moment(date, "YYYY-MM-DD").set("hour", 12);
            console.log(momentDate);
            if (!momentDate.isValid()) {
                console.error(`Invalid date format provided: ${date}. Expected YYYY-MM-DD.`);
                return;
            }
            // 先更新内存中的习惯状态，避免触发 metadata change 事件时状态不一致
            const habitIndex = this.habits.findIndex((h) => h.id === updatedHabit.id);
            if (habitIndex !== -1) {
                this.habits[habitIndex] = JSON.parse(JSON.stringify(updatedHabit));
                // 设置标记，防止 metadata change 事件重复更新
                this._isUpdatingFromToggle = true;
                // 立刻触发一次刷新，确保 UI 即时更新
                this.plugin.app.workspace.trigger("task-genius:habit-index-updated", this.habits);
            }
            let dailyNote = null;
            try {
                console.log(getAllDailyNotes());
                dailyNote = getDailyNote(momentDate, getAllDailyNotes());
                if (!dailyNote) {
                    if (!appHasDailyNotesPluginLoaded()) {
                        console.error("Daily notes plugin is not loaded. Please enable the Daily Notes plugin in Obsidian.");
                        return;
                    }
                    const settings = getDailyNoteSettings();
                    if (!settings.folder) {
                        console.error("Daily notes folder is not set. Please configure the Daily Notes plugin in Obsidian.");
                        return;
                    }
                    try {
                        dailyNote = yield createDailyNote(momentDate);
                    }
                    catch (error) {
                        console.error("Trying to use obsidian default create daily note function", error);
                        this.plugin.app.commands.executeCommandById("daily-notes");
                        console.log(getAllDailyNotes());
                        dailyNote = getDailyNote(momentDate, getAllDailyNotes());
                    }
                }
            }
            catch (error) {
                console.error("Error getting or creating daily note:", error);
                return;
            }
            if (dailyNote) {
                try {
                    // Notify dataflow write start to avoid event loops
                    emit(this.plugin.app, Events.WRITE_OPERATION_START, {
                        path: dailyNote.path,
                    });
                    yield app.fileManager.processFrontMatter(dailyNote, (frontmatter) => {
                        const completion = updatedHabit.completions[date];
                        switch (updatedHabit.type) {
                            case "scheduled":
                                // Handle scheduled habits (journey habits)
                                const eventMap = updatedHabit.propertiesMap || {};
                                for (const [eventName, propertyKey,] of Object.entries(eventMap)) {
                                    if (propertyKey) {
                                        // Only update if a property key is defined
                                        if (typeof completion === "object" &&
                                            (completion === null || completion === void 0 ? void 0 : completion[eventName]) !==
                                                undefined &&
                                            (completion === null || completion === void 0 ? void 0 : completion[eventName]) !== "") {
                                            frontmatter[propertyKey] =
                                                completion[eventName];
                                        }
                                        else {
                                            // 如果completion不存在，事件名缺失或值为空字符串，删除该属性
                                            delete frontmatter[propertyKey];
                                        }
                                    }
                                }
                                break;
                            case "daily":
                                // Handle daily habits with custom completion text
                                const dailyHabit = updatedHabit;
                                if (dailyHabit.property) {
                                    const keyToUpdate = dailyHabit.property; // Update the primary property
                                    if (completion !== undefined &&
                                        completion !== null) {
                                        // If completionText is defined and completion is 1, use the completionText
                                        if (dailyHabit.completionText &&
                                            completion === 1) {
                                            frontmatter[keyToUpdate] =
                                                dailyHabit.completionText;
                                        }
                                        else if (!dailyHabit.completionText &&
                                            typeof completion === "boolean") {
                                            // For simple daily habits, use boolean value
                                            frontmatter[keyToUpdate] =
                                                completion;
                                        }
                                        else {
                                            // Otherwise use the raw value
                                            frontmatter[keyToUpdate] =
                                                completion;
                                        }
                                    }
                                    else {
                                        // If completion is undefined, remove the property
                                        delete frontmatter[keyToUpdate];
                                    }
                                }
                                else {
                                    console.warn(`Habit ${updatedHabit.id} has no properties defined in habitKeyMap.`);
                                }
                                break;
                            case "count":
                                const countHabit = updatedHabit;
                                // Handle count habits
                                if (countHabit.property) {
                                    const keyToUpdate = countHabit.property; // Update the primary property
                                    if (completion !== undefined) {
                                        frontmatter[keyToUpdate] = completion;
                                    }
                                    else {
                                        // If completion is undefined, remove the property
                                        delete frontmatter[keyToUpdate];
                                    }
                                }
                                else {
                                    console.warn(`Habit ${updatedHabit.id} has no properties defined in habitKeyMap.`);
                                }
                                break;
                            case "mapping":
                                // Handle mapping habits
                                const mappingHabit = updatedHabit;
                                if (mappingHabit.property) {
                                    const keyToUpdate = mappingHabit.property; // Update the primary property
                                    if (completion !== undefined &&
                                        typeof completion === "number" &&
                                        mappingHabit.mapping[completion]) {
                                        frontmatter[keyToUpdate] = completion;
                                    }
                                    else {
                                        // If completion is undefined or invalid, remove the property
                                        delete frontmatter[keyToUpdate];
                                    }
                                }
                                else {
                                    console.warn(`Habit ${updatedHabit.id} has no properties defined in habitKeyMap.`);
                                }
                                break;
                        }
                    });
                    // Notify dataflow write complete
                    emit(this.plugin.app, Events.WRITE_OPERATION_COMPLETE, {
                        path: dailyNote.path,
                    });
                }
                catch (error) {
                    console.error(`Error processing frontmatter for ${dailyNote.path}:`, error);
                }
            }
            else {
                console.warn(`Daily note could not be found or created for date: ${date}`);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFiaXQtbWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImhhYml0LW1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFHTixTQUFTLEVBR1QsTUFBTSxFQUNOLEtBQUssR0FDTCxNQUFNLFVBQVUsQ0FBQztBQWVsQixPQUFPLEVBQ04sZUFBZSxFQUNmLGdCQUFnQixFQUNoQixZQUFZLEVBQ1osZUFBZSxFQUNmLDRCQUE0QixFQUM1QixvQkFBb0IsR0FDcEIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4QyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUU5RSwrQkFBK0I7QUFDL0IsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFNLEVBQVcsRUFBRSxDQUFDLENBQUMsS0FBSyxTQUFTLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2hGLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBUyxFQUFVLEVBQUUsQ0FDckMsQ0FBQyxDQUFDLGFBQUQsQ0FBQyxjQUFELENBQUMsR0FBSSxFQUFFLENBQUM7S0FDUCxRQUFRLEVBQUU7S0FDVixJQUFJLEVBQUU7S0FDTixXQUFXLEVBQUU7S0FDYixPQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQztLQUN4QixPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRXhCLE1BQU0sT0FBTyxZQUFhLFNBQVEsU0FBUztJQUsxQyxZQUFZLE1BQTZCO1FBQ3hDLEtBQUssRUFBRSxDQUFDO1FBSlQsV0FBTSxHQUFpQixFQUFFLENBQUM7UUFLekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksc0JBQXNCLENBQ3ZELE1BQU0sQ0FBQyxH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RixDQUFDO0tBQUE7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0QXBwLFxyXG5cdENhY2hlZE1ldGFkYXRhLFxyXG5cdENvbXBvbmVudCxcclxuXHRkZWJvdW5jZSxcclxuXHRGcm9udE1hdHRlckNhY2hlLFxyXG5cdG1vbWVudCxcclxuXHRURmlsZSxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRIYWJpdFByb3BzLFxyXG5cdFNjaGVkdWxlZEhhYml0UHJvcHMsXHJcblx0RGFpbHlIYWJpdFByb3BzLFxyXG5cdENvdW50SGFiaXRQcm9wcyxcclxuXHRNYXBwaW5nSGFiaXRQcm9wcyxcclxuXHRCYXNlSGFiaXRQcm9wcyxcclxuXHRCYXNlSGFiaXREYXRhLFxyXG5cdEJhc2VEYWlseUhhYml0RGF0YSxcclxuXHRCYXNlQ291bnRIYWJpdERhdGEsXHJcblx0QmFzZVNjaGVkdWxlZEhhYml0RGF0YSxcclxuXHRCYXNlTWFwcGluZ0hhYml0RGF0YSxcclxufSBmcm9tIFwiLi4vdHlwZXMvaGFiaXQtY2FyZFwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiOyAvLyBBc3N1bWluZyBIYWJpdFRyYWNrZXIgaXMgdGhlIG1haW4gcGx1Z2luIGNsYXNzXHJcbmltcG9ydCB7XHJcblx0Y3JlYXRlRGFpbHlOb3RlLFxyXG5cdGdldEFsbERhaWx5Tm90ZXMsXHJcblx0Z2V0RGFpbHlOb3RlLFxyXG5cdGdldERhdGVGcm9tRmlsZSxcclxuXHRhcHBIYXNEYWlseU5vdGVzUGx1Z2luTG9hZGVkLFxyXG5cdGdldERhaWx5Tm90ZVNldHRpbmdzLFxyXG59IGZyb20gXCJvYnNpZGlhbi1kYWlseS1ub3Rlcy1pbnRlcmZhY2VcIjtcclxuaW1wb3J0IHsgRXZlbnRzLCBvbiwgZW1pdCB9IGZyb20gXCIuLi9kYXRhZmxvdy9ldmVudHMvRXZlbnRzXCI7XHJcbmltcG9ydCB7IERhdGVJbmhlcml0YW5jZVNlcnZpY2UgfSBmcm9tIFwiLi4vc2VydmljZXMvZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlXCI7XHJcblxyXG4vLyBIZWxwZXJzIGZvciBoYWJpdCBwcm9jZXNzaW5nXHJcbmNvbnN0IGhhc1ZhbHVlID0gKHY6IGFueSk6IGJvb2xlYW4gPT4gdiAhPT0gdW5kZWZpbmVkICYmIHYgIT09IG51bGwgJiYgdiAhPT0gXCJcIjtcclxuY29uc3Qgc2x1Z2lmeSA9IChzOiBzdHJpbmcpOiBzdHJpbmcgPT5cclxuXHQocyA/PyBcIlwiKVxyXG5cdFx0LnRvU3RyaW5nKClcclxuXHRcdC50cmltKClcclxuXHRcdC50b0xvd2VyQ2FzZSgpXHJcblx0XHQucmVwbGFjZSgvW15cXHdcXHMtXS9nLCBcIlwiKVxyXG5cdFx0LnJlcGxhY2UoL1xccysvZywgXCItXCIpO1xyXG5cclxuZXhwb3J0IGNsYXNzIEhhYml0TWFuYWdlciBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHRoYWJpdHM6IEhhYml0UHJvcHNbXSA9IFtdO1xyXG5cdHByaXZhdGUgZGF0ZUluaGVyaXRhbmNlU2VydmljZTogRGF0ZUluaGVyaXRhbmNlU2VydmljZTtcclxuXHJcblx0Y29uc3RydWN0b3IocGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuZGF0ZUluaGVyaXRhbmNlU2VydmljZSA9IG5ldyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlKFxyXG5cdFx0XHRwbHVnaW4uYXBwLFxyXG5cdFx0XHRwbHVnaW4uYXBwLnZhdWx0LFxyXG5cdFx0XHRwbHVnaW4uYXBwLm1ldGFkYXRhQ2FjaGVcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbmxvYWQoKSB7XHJcblx0XHRhd2FpdCB0aGlzLmluaXRpYWxpemVIYWJpdHMoKTtcclxuXHJcblx0XHRjb25zdCB1c2VEYXRhZmxvdyA9ICh0aGlzLnBsdWdpbiBhcyBhbnkpLnNldHRpbmdzPy5lbmFibGVJbmRleGVyO1xyXG5cdFx0aWYgKHVzZURhdGFmbG93KSB7XHJcblx0XHRcdC8vIFVzZSBkYXRhZmxvdydzIHVuaWZpZWQgVEFTS19DQUNIRV9VUERBVEVEIGV2ZW50IChwb3N0LWluZGV4KSB0byB0cmFjayBjaGFuZ2VzXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0XHRvbihcclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHRcdEV2ZW50cy5UQVNLX0NBQ0hFX1VQREFURUQsXHJcblx0XHRcdFx0XHRhc3luYyAocGF5bG9hZDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgY2hhbmdlZCA9XHJcblx0XHRcdFx0XHRcdFx0XHQocGF5bG9hZD8uY2hhbmdlZEZpbGVzIGFzIHN0cmluZ1tdKSB8fCBbXTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIWNoYW5nZWQubGVuZ3RoKSByZXR1cm47XHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBwIG9mIGNoYW5nZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdC8vIFNraXAgbm9uLWZpbGUgbWFya2VycyBsaWtlICdpY3M6ZXZlbnRzJ1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFwIHx8IHAuaW5jbHVkZXMoXCI6XCIpKSBjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGYgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAudmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHBcclxuXHRcdFx0XHRcdFx0XHRcdFx0KSBhcyBURmlsZTtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghZikgY29udGludWU7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXRoaXMuaXNEYWlseU5vdGUoZikpIGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgYyA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoYykgdGhpcy51cGRhdGVIYWJpdENvbXBsZXRpb25zKGYsIGMpO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcdFx0XHRcdFwiW0hhYml0TWFuYWdlcl0gRmFpbGVkIHRvIGhhbmRsZSBUQVNLX0NBQ0hFX1VQREFURUQgZm9yIGhhYml0c1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0ZVxyXG5cdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBMaXN0ZW4gZm9yIHVuaWZpZWQgRklMRV9VUERBVEVEIGV2ZW50cyB0byBoYW5kbGUgZGVsZXRpb25zIGluIGRhdGFmbG93IG1vZGVcclxuXHRcdFx0dGhpcy5yZWdpc3RlckV2ZW50KFxyXG5cdFx0XHRcdG9uKHRoaXMucGx1Z2luLmFwcCwgRXZlbnRzLkZJTEVfVVBEQVRFRCwgKHsgcGF0aCwgcmVhc29uIH0pID0+IHtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRyZWFzb24gPT09IFwiZGVsZXRlXCIgJiZcclxuXHRcdFx0XHRcdFx0XHR0eXBlb2YgcGF0aCA9PT0gXCJzdHJpbmdcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaXNEYWlseU5vdGVQYXRoKHBhdGgpXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaGFuZGxlRGFpbHlOb3RlRGVsZXRlZEJ5UGF0aChwYXRoKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XCJbSGFiaXRNYW5hZ2VyXSBGYWlsZWQgdG8gaGFuZGxlIEZJTEVfVVBEQVRFRChkZWxldGUpIGZvciBoYWJpdHNcIixcclxuXHRcdFx0XHRcdFx0XHRlXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEZhbGxiYWNrIGZvciBsZWdhY3kgbW9kZSB3aXRob3V0IGRhdGFmbG93XHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZS5vbihcclxuXHRcdFx0XHRcdFwiY2hhbmdlZFwiLFxyXG5cdFx0XHRcdFx0KGZpbGU6IFRGaWxlLCBfZGF0YTogc3RyaW5nLCBjYWNoZTogQ2FjaGVkTWV0YWRhdGEpID0+IHtcclxuXHRcdFx0XHRcdFx0aWYgKHRoaXMuaXNEYWlseU5vdGUoZmlsZSkpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLnVwZGF0ZUhhYml0Q29tcGxldGlvbnMoZmlsZSwgY2FjaGUpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0Ly8gQWxzbyBsaXN0ZW4gZm9yIGZpbGUgZGVsZXRpb25zIGluIGxlZ2FjeSBtb2RlXHJcblx0XHRcdHRoaXMucmVnaXN0ZXJFdmVudChcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAudmF1bHQub24oXCJkZWxldGVcIiwgKGZpbGUpID0+IHtcclxuXHRcdFx0XHRcdGlmIChmaWxlIGluc3RhbmNlb2YgVEZpbGUgJiYgdGhpcy5pc0RhaWx5Tm90ZShmaWxlKSkge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmhhbmRsZURhaWx5Tm90ZURlbGV0ZWQoZmlsZSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSlcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFzeW5jIGluaXRpYWxpemVIYWJpdHMoKTogUHJvbWlzZTx2b2lkPiB7XHJcblx0XHRjb25zdCBkYWlseU5vdGVzID0gYXdhaXQgdGhpcy5nZXREYWlseU5vdGVzKCk7XHJcblx0XHRjb25zdCBwcm9jZXNzZWRIYWJpdHMgPSBhd2FpdCB0aGlzLnByb2Nlc3NIYWJpdHMoZGFpbHlOb3Rlcyk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXCJwcm9jZXNzZWRIYWJpdHNcIiwgcHJvY2Vzc2VkSGFiaXRzKTtcclxuXHRcdHRoaXMuaGFiaXRzID0gcHJvY2Vzc2VkSGFiaXRzO1xyXG5cclxuXHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UudHJpZ2dlcihcclxuXHRcdFx0XCJ0YXNrLWdlbml1czpoYWJpdC1pbmRleC11cGRhdGVkXCIsXHJcblx0XHRcdHRoaXMuaGFiaXRzXHJcblx0XHQpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBjb252ZXJ0QmFzZUhhYml0c1RvSGFiaXRQcm9wcyhcclxuXHRcdGJhc2VIYWJpdHM6IEJhc2VIYWJpdERhdGFbXVxyXG5cdCk6IEhhYml0UHJvcHNbXSB7XHJcblx0XHRyZXR1cm4gYmFzZUhhYml0cy5tYXAoKGJhc2VIYWJpdCkgPT4ge1xyXG5cdFx0XHRzd2l0Y2ggKGJhc2VIYWJpdC50eXBlKSB7XHJcblx0XHRcdFx0Y2FzZSBcImRhaWx5XCI6IHtcclxuXHRcdFx0XHRcdGNvbnN0IGRhaWx5SGFiaXQgPSBiYXNlSGFiaXQgYXMgQmFzZURhaWx5SGFiaXREYXRhO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0aWQ6IGRhaWx5SGFiaXQuaWQsXHJcblx0XHRcdFx0XHRcdG5hbWU6IGRhaWx5SGFiaXQubmFtZSxcclxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IGRhaWx5SGFiaXQuZGVzY3JpcHRpb24sXHJcblx0XHRcdFx0XHRcdGljb246IGRhaWx5SGFiaXQuaWNvbixcclxuXHRcdFx0XHRcdFx0cHJvcGVydHk6IGhhc1ZhbHVlKGRhaWx5SGFiaXQucHJvcGVydHkpXHJcblx0XHRcdFx0XHRcdFx0PyBkYWlseUhhYml0LnByb3BlcnR5XHJcblx0XHRcdFx0XHRcdFx0OiBzbHVnaWZ5KGRhaWx5SGFiaXQubmFtZSksXHJcblx0XHRcdFx0XHRcdHR5cGU6IGRhaWx5SGFiaXQudHlwZSxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGlvblRleHQ6IGRhaWx5SGFiaXQuY29tcGxldGlvblRleHQsXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRpb25zOiB7fSxcclxuXHRcdFx0XHRcdH0gYXMgRGFpbHlIYWJpdFByb3BzO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y2FzZSBcImNvdW50XCI6IHtcclxuXHRcdFx0XHRcdGNvbnN0IGNvdW50SGFiaXQgPSBiYXNlSGFiaXQgYXMgQmFzZUNvdW50SGFiaXREYXRhO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdFx0aWQ6IGNvdW50SGFiaXQuaWQsXHJcblx0XHRcdFx0XHRcdG5hbWU6IGNvdW50SGFiaXQubmFtZSxcclxuXHRcdFx0XHRcdFx0ZGVzY3JpcHRpb246IGNvdW50SGFiaXQuZGVzY3JpcHRpb24sXHJcblx0XHRcdFx0XHRcdGljb246IGNvdW50SGFiaXQuaWNvbixcclxuXHRcdFx0XHRcdFx0cHJvcGVydHk6IGhhc1ZhbHVlKGNvdW50SGFiaXQucHJvcGVydHkpXHJcblx0XHRcdFx0XHRcdFx0PyBjb3VudEhhYml0LnByb3BlcnR5XHJcblx0XHRcdFx0XHRcdFx0OiBzbHVnaWZ5KGNvdW50SGFiaXQubmFtZSksXHJcblx0XHRcdFx0XHRcdHR5cGU6IGNvdW50SGFiaXQudHlwZSxcclxuXHRcdFx0XHRcdFx0bWluOiBjb3VudEhhYml0Lm1pbixcclxuXHRcdFx0XHRcdFx0bWF4OiBjb3VudEhhYml0Lm1heCxcclxuXHRcdFx0XHRcdFx0bm90aWNlOiBjb3VudEhhYml0Lm5vdGljZSxcclxuXHRcdFx0XHRcdFx0Y291bnRVbml0OiBjb3VudEhhYml0LmNvdW50VW5pdCxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGlvbnM6IHt9LFxyXG5cdFx0XHRcdFx0fSBhcyBDb3VudEhhYml0UHJvcHM7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjYXNlIFwic2NoZWR1bGVkXCI6IHtcclxuXHRcdFx0XHRcdGNvbnN0IHNjaGVkdWxlZEhhYml0ID0gYmFzZUhhYml0IGFzIEJhc2VTY2hlZHVsZWRIYWJpdERhdGE7XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRpZDogc2NoZWR1bGVkSGFiaXQuaWQsXHJcblx0XHRcdFx0XHRcdG5hbWU6IHNjaGVkdWxlZEhhYml0Lm5hbWUsXHJcblx0XHRcdFx0XHRcdGRlc2NyaXB0aW9uOiBzY2hlZHVsZWRIYWJpdC5kZXNjcmlwdGlvbixcclxuXHRcdFx0XHRcdFx0aWNvbjogc2NoZWR1bGVkSGFiaXQuaWNvbixcclxuXHRcdFx0XHRcdFx0dHlwZTogc2NoZWR1bGVkSGFiaXQudHlwZSxcclxuXHRcdFx0XHRcdFx0ZXZlbnRzOiBzY2hlZHVsZWRIYWJpdC5ldmVudHMsXHJcblx0XHRcdFx0XHRcdHByb3BlcnRpZXNNYXA6IHNjaGVkdWxlZEhhYml0LnByb3BlcnRpZXNNYXAsXHJcblx0XHRcdFx0XHRcdGNvbXBsZXRpb25zOiB7fSxcclxuXHRcdFx0XHRcdH0gYXMgU2NoZWR1bGVkSGFiaXRQcm9wcztcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNhc2UgXCJtYXBwaW5nXCI6IHtcclxuXHRcdFx0XHRcdGNvbnN0IG1hcHBpbmdIYWJpdCA9IGJhc2VIYWJpdCBhcyBCYXNlTWFwcGluZ0hhYml0RGF0YTtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdGlkOiBtYXBwaW5nSGFiaXQuaWQsXHJcblx0XHRcdFx0XHRcdG5hbWU6IG1hcHBpbmdIYWJpdC5uYW1lLFxyXG5cdFx0XHRcdFx0XHRkZXNjcmlwdGlvbjogbWFwcGluZ0hhYml0LmRlc2NyaXB0aW9uLFxyXG5cdFx0XHRcdFx0XHRpY29uOiBtYXBwaW5nSGFiaXQuaWNvbixcclxuXHRcdFx0XHRcdFx0cHJvcGVydHk6IGhhc1ZhbHVlKG1hcHBpbmdIYWJpdC5wcm9wZXJ0eSlcclxuXHRcdFx0XHRcdFx0XHQ/IG1hcHBpbmdIYWJpdC5wcm9wZXJ0eVxyXG5cdFx0XHRcdFx0XHRcdDogc2x1Z2lmeShtYXBwaW5nSGFiaXQubmFtZSksXHJcblx0XHRcdFx0XHRcdHR5cGU6IG1hcHBpbmdIYWJpdC50eXBlLFxyXG5cdFx0XHRcdFx0XHRtYXBwaW5nOiBtYXBwaW5nSGFiaXQubWFwcGluZyxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGlvbnM6IHt9LFxyXG5cdFx0XHRcdFx0fSBhcyBNYXBwaW5nSGFiaXRQcm9wcztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBnZXREYWlseU5vdGVzKCk6IFByb21pc2U8VEZpbGVbXT4ge1xyXG5cdFx0Y29uc3QgZmlsZXMgPSBnZXRBbGxEYWlseU5vdGVzKCk7XHJcblx0XHRyZXR1cm4gT2JqZWN0LnZhbHVlcyhmaWxlcyk7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGlzRGFpbHlOb3RlKGZpbGU6IFRGaWxlKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBVc2UgJ2RheScgdG8gc3BlY2lmaWNhbGx5IHRhcmdldCBkYWlseSBub3RlcyBpZiB3ZWVrbHkvbW9udGhseSBhcmUgaGFuZGxlZCBkaWZmZXJlbnRseVxyXG5cdFx0XHRyZXR1cm4gZ2V0RGF0ZUZyb21GaWxlKGZpbGUsIFwiZGF5XCIpICE9PSBudWxsO1xyXG5cdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHQvLyBIYW5kbGUgY2FzZXMgd2hlcmUgZ2V0RGF0ZUZyb21GaWxlIG1pZ2h0IHRocm93IGVycm9yIGZvciBub24tbm90ZSBmaWxlc1xyXG5cdFx0XHQvLyBjb25zb2xlLndhcm4oYENvdWxkIG5vdCBkZXRlcm1pbmUgaWYgZmlsZSBpcyBhIGRhaWx5IG5vdGU6ICR7ZmlsZS5wYXRofWAsIGUpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIHByb2Nlc3NIYWJpdHMoZGFpbHlOb3RlczogVEZpbGVbXSk6IFByb21pc2U8SGFiaXRQcm9wc1tdPiB7XHJcblx0XHRjb25zdCBoYWJpdHNXaXRob3V0Q29tcGxldGlvbnMgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5oYWJpdC5oYWJpdHM7XHJcblxyXG5cdFx0Y29uc3QgY29udmVydGVkSGFiaXRzID0gdGhpcy5jb252ZXJ0QmFzZUhhYml0c1RvSGFiaXRQcm9wcyhcclxuXHRcdFx0aGFiaXRzV2l0aG91dENvbXBsZXRpb25zXHJcblx0XHQpO1xyXG5cclxuXHRcdGZvciAoY29uc3Qgbm90ZSBvZiBkYWlseU5vdGVzKSB7XHJcblx0XHRcdGlmICghdGhpcy5pc0RhaWx5Tm90ZShub3RlKSkgY29udGludWU7IC8vIFNraXAgbm9uLWRhaWx5IG5vdGVzXHJcblxyXG5cdFx0XHRjb25zdCBjYWNoZSA9IHRoaXMucGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShub3RlKTtcclxuXHRcdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSBjYWNoZT8uZnJvbnRtYXR0ZXI7XHJcblxyXG5cdFx0XHRpZiAoZnJvbnRtYXR0ZXIpIHtcclxuXHRcdFx0XHRjb25zdCBkYXRlTW9tZW50ID0gZ2V0RGF0ZUZyb21GaWxlKG5vdGUsIFwiZGF5XCIpO1xyXG5cdFx0XHRcdGlmICghZGF0ZU1vbWVudCkgY29udGludWU7IC8vIFNob3VsZCBub3QgaGFwcGVuIGR1ZSB0byBpc0RhaWx5Tm90ZSBjaGVjaywgYnV0IGJlbHRzIGFuZCBzdXNwZW5kZXJzXHJcblx0XHRcdFx0Y29uc3QgZGF0ZSA9IGRhdGVNb21lbnQuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHJcblx0XHRcdFx0Zm9yIChjb25zdCBoYWJpdCBvZiBjb252ZXJ0ZWRIYWJpdHMpIHtcclxuXHRcdFx0XHRcdGlmICghaGFiaXQuY29tcGxldGlvbnMpIGhhYml0LmNvbXBsZXRpb25zID0ge307IC8vIEVuc3VyZSBjb21wbGV0aW9ucyBvYmplY3QgZXhpc3RzXHJcblxyXG5cdFx0XHRcdFx0c3dpdGNoIChoYWJpdC50eXBlKSB7XHJcblx0XHRcdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWRcIjpcclxuXHRcdFx0XHRcdFx0XHQvLyBIYW5kbGUgc2NoZWR1bGVkIGhhYml0cyAoam91cm5leSBoYWJpdHMpXHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc2NoZWR1bGVkSGFiaXQgPSBoYWJpdCBhcyBTY2hlZHVsZWRIYWJpdFByb3BzO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGV2ZW50TWFwID0gaGFiaXQucHJvcGVydGllc01hcCB8fCB7fTtcclxuXHRcdFx0XHRcdFx0XHRpZiAoIXNjaGVkdWxlZEhhYml0LmNvbXBsZXRpb25zW2RhdGVdKVxyXG5cdFx0XHRcdFx0XHRcdFx0c2NoZWR1bGVkSGFiaXQuY29tcGxldGlvbnNbZGF0ZV0gPSB7fTtcclxuXHJcblx0XHRcdFx0XHRcdFx0Zm9yIChjb25zdCBbXHJcblx0XHRcdFx0XHRcdFx0XHRldmVudE5hbWUsXHJcblx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0eUtleSxcclxuXHRcdFx0XHRcdFx0XHRdIG9mIE9iamVjdC5lbnRyaWVzKGV2ZW50TWFwKSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0eUtleSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRoYXNWYWx1ZShmcm9udG1hdHRlcltwcm9wZXJ0eUtleSBhcyBzdHJpbmddKVxyXG5cdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcm9udG1hdHRlcltwcm9wZXJ0eUtleSBhcyBzdHJpbmddO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyDlj6rmnInlvZPlgLzkuI3kuLrnqbrml7bmiY3mt7vliqDliLBjb21wbGV0aW9uc1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoaGFzVmFsdWUodmFsdWUpKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gU3RvcmUgdGhlIHJhdyB2YWx1ZSBvciBmb3JtYXQgaXQgYXMgbmVlZGVkXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2NoZWR1bGVkSGFiaXQuY29tcGxldGlvbnNbZGF0ZV1bXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRldmVudE5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRdID0gdmFsdWUgYXMgYW55O1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcImRhaWx5XCI6XHJcblx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGRhaWx5IGhhYml0cyB3aXRoIGN1c3RvbSBjb21wbGV0aW9uIHRleHRcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBkYWlseUhhYml0ID0gaGFiaXQgYXMgRGFpbHlIYWJpdFByb3BzO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRoYWJpdC5wcm9wZXJ0eSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0aGFzVmFsdWUoZnJvbnRtYXR0ZXJbaGFiaXQucHJvcGVydHldKVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPSBmcm9udG1hdHRlcltoYWJpdC5wcm9wZXJ0eV07XHJcblx0XHRcdFx0XHRcdFx0XHQvLyBJZiBjb21wbGV0aW9uVGV4dCBpcyBkZWZpbmVkLCBjaGVjayBpZiB2YWx1ZSBtYXRjaGVzIGl0XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoZGFpbHlIYWJpdC5jb21wbGV0aW9uVGV4dCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiB2YWx1ZSBtYXRjaGVzIGNvbXBsZXRpb25UZXh0LCBtYXJrIGFzIGNvbXBsZXRlZCAoMSlcclxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gT3RoZXJ3aXNlLCBzdG9yZSB0aGUgYWN0dWFsIHRleHQgdmFsdWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKHZhbHVlID09PSBkYWlseUhhYml0LmNvbXBsZXRpb25UZXh0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZGFpbHlIYWJpdC5jb21wbGV0aW9uc1tkYXRlXSA9IDE7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZGFpbHlIYWJpdC5jb21wbGV0aW9uc1tkYXRlXSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR2YWx1ZSBhcyBzdHJpbmc7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdC8vIERlZmF1bHQgYmVoYXZpb3I6IGJvb2xlYW4gdmFsdWUgZm9yIGNvbXBsZXRpb25cclxuXHRcdFx0XHRcdFx0XHRcdFx0ZGFpbHlIYWJpdC5jb21wbGV0aW9uc1tkYXRlXSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IFwidHJ1ZVwiO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7IC8vIFVzZSB0aGUgZmlyc3QgZm91bmQgcHJvcGVydHlcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0Y2FzZSBcImNvdW50XCI6XHJcblx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGNvdW50IGhhYml0c1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGNvdW50SGFiaXQgPSBoYWJpdCBhcyBDb3VudEhhYml0UHJvcHM7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0Y291bnRIYWJpdC5wcm9wZXJ0eSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0aGFzVmFsdWUoZnJvbnRtYXR0ZXJbY291bnRIYWJpdC5wcm9wZXJ0eV0pXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCB2YWx1ZSA9IGZyb250bWF0dGVyW2NvdW50SGFiaXQucHJvcGVydHldO1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gRm9yIGNvdW50IGhhYml0cywgdHJ5IHRvIHBhcnNlIGFzIG51bWJlclxyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgbnVtVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCFpc05hTihudW1WYWx1ZSkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y291bnRIYWJpdC5jb21wbGV0aW9uc1tkYXRlXSA9IG51bVZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdGNhc2UgXCJtYXBwaW5nXCI6XHJcblx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIG1hcHBpbmcgaGFiaXRzXHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbWFwcGluZ0hhYml0ID0gaGFiaXQgYXMgTWFwcGluZ0hhYml0UHJvcHM7XHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0bWFwcGluZ0hhYml0LnByb3BlcnR5ICYmXHJcblx0XHRcdFx0XHRcdFx0XHRoYXNWYWx1ZShmcm9udG1hdHRlclttYXBwaW5nSGFiaXQucHJvcGVydHldKVxyXG5cdFx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgdmFsdWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRmcm9udG1hdHRlclttYXBwaW5nSGFiaXQucHJvcGVydHldO1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gRm9yIG1hcHBpbmcgaGFiaXRzLCB0cnkgdG8gcGFyc2UgYXMgbnVtYmVyXHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBudW1WYWx1ZSA9IE51bWJlcih2YWx1ZSk7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdCFpc05hTihudW1WYWx1ZSkgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0bWFwcGluZ0hhYml0Lm1hcHBpbmdbbnVtVmFsdWVdXHJcblx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0bWFwcGluZ0hhYml0LmNvbXBsZXRpb25zW2RhdGVdID0gbnVtVmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNvbnZlcnRlZEhhYml0cztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlRGFpbHlOb3RlRGVsZXRlZChmaWxlOiBURmlsZSk6IHZvaWQge1xyXG5cdFx0Y29uc3QgZGF0ZU1vbWVudCA9IGdldERhdGVGcm9tRmlsZShmaWxlLCBcImRheVwiKTtcclxuXHRcdGlmICghZGF0ZU1vbWVudCkgcmV0dXJuOyAvLyBOb3QgYSBkYWlseSBub3RlXHJcblxyXG5cdFx0Y29uc3QgZGF0ZVN0ciA9IGRhdGVNb21lbnQuZm9ybWF0KFwiWVlZWS1NTS1ERFwiKTtcclxuXHRcdGxldCBoYWJpdHNDaGFuZ2VkID0gZmFsc2U7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGNvbXBsZXRpb25zIGZvciB0aGlzIGRhdGUgZnJvbSBhbGwgaGFiaXRzXHJcblx0XHR0aGlzLmhhYml0cyA9IHRoaXMuaGFiaXRzLm1hcCgoaGFiaXQpID0+IHtcclxuXHRcdFx0Y29uc3QgaGFiaXRDbG9uZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaGFiaXQpKSBhcyBIYWJpdFByb3BzO1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0aGFiaXRDbG9uZS5jb21wbGV0aW9ucyAmJlxyXG5cdFx0XHRcdGhhYml0Q2xvbmUuY29tcGxldGlvbnNbZGF0ZVN0cl0gIT09IHVuZGVmaW5lZFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRkZWxldGUgaGFiaXRDbG9uZS5jb21wbGV0aW9uc1tkYXRlU3RyXTtcclxuXHRcdFx0XHRoYWJpdHNDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gaGFiaXRDbG9uZTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGlmIChoYWJpdHNDaGFuZ2VkKSB7XHJcblx0XHRcdC8vIFRyaWdnZXIgdXBkYXRlIGV2ZW50IHRvIHJlZnJlc2ggdGhlIFVJXHJcblx0XHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UudHJpZ2dlcihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOmhhYml0LWluZGV4LXVwZGF0ZWRcIixcclxuXHRcdFx0XHR0aGlzLmhhYml0c1xyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBpc0RhaWx5Tm90ZVBhdGgocGF0aDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRyZXR1cm4gISF0aGlzLmRhdGVJbmhlcml0YW5jZVNlcnZpY2UuZXh0cmFjdERhaWx5Tm90ZURhdGUocGF0aCk7XHJcblx0XHR9IGNhdGNoIChlKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlRGFpbHlOb3RlRGVsZXRlZEJ5UGF0aChwYXRoOiBzdHJpbmcpOiB2b2lkIHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGRhdGUgPSB0aGlzLmRhdGVJbmhlcml0YW5jZVNlcnZpY2UuZXh0cmFjdERhaWx5Tm90ZURhdGUocGF0aCk7XHJcblx0XHRcdGlmICghZGF0ZSkgcmV0dXJuO1xyXG5cdFx0XHRjb25zdCBkYXRlU3RyID0gbW9tZW50KGRhdGUpLmZvcm1hdChcIllZWVktTU0tRERcIik7XHJcblx0XHRcdGxldCBoYWJpdHNDaGFuZ2VkID0gZmFsc2U7XHJcblxyXG5cdFx0XHR0aGlzLmhhYml0cyA9IHRoaXMuaGFiaXRzLm1hcCgoaGFiaXQpID0+IHtcclxuXHRcdFx0XHRjb25zdCBoYWJpdENsb25lID0gSlNPTi5wYXJzZShcclxuXHRcdFx0XHRcdEpTT04uc3RyaW5naWZ5KGhhYml0KVxyXG5cdFx0XHRcdCkgYXMgSGFiaXRQcm9wcztcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRoYWJpdENsb25lLmNvbXBsZXRpb25zICYmXHJcblx0XHRcdFx0XHRoYWJpdENsb25lLmNvbXBsZXRpb25zW2RhdGVTdHJdICE9PSB1bmRlZmluZWRcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdGRlbGV0ZSBoYWJpdENsb25lLmNvbXBsZXRpb25zW2RhdGVTdHJdO1xyXG5cdFx0XHRcdFx0aGFiaXRzQ2hhbmdlZCA9IHRydWU7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiBoYWJpdENsb25lO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGlmIChoYWJpdHNDaGFuZ2VkKSB7XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XCJ0YXNrLWdlbml1czpoYWJpdC1pbmRleC11cGRhdGVkXCIsXHJcblx0XHRcdFx0XHR0aGlzLmhhYml0c1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFwiW0hhYml0TWFuYWdlcl0gRmFpbGVkIHRvIGhhbmRsZSBkYWlseSBub3RlIGRlbGV0aW9uIGJ5IHBhdGhcIixcclxuXHRcdFx0XHRlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHVwZGF0ZUhhYml0Q29tcGxldGlvbnMoZmlsZTogVEZpbGUsIGNhY2hlOiBDYWNoZWRNZXRhZGF0YSk6IHZvaWQge1xyXG5cdFx0aWYgKCFjYWNoZT8uZnJvbnRtYXR0ZXIpIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBkYXRlTW9tZW50ID0gZ2V0RGF0ZUZyb21GaWxlKGZpbGUsIFwiZGF5XCIpO1xyXG5cdFx0aWYgKCFkYXRlTW9tZW50KSByZXR1cm47IC8vIE5vdCBhIGRhaWx5IG5vdGVcclxuXHJcblx0XHRjb25zdCBkYXRlU3RyID0gZGF0ZU1vbWVudC5mb3JtYXQoXCJZWVlZLU1NLUREXCIpO1xyXG5cdFx0bGV0IGhhYml0c0NoYW5nZWQgPSBmYWxzZTtcclxuXHJcblx0XHQvLyDmt7vliqDkuIDkuKrmoIforrDvvIzpmLLmraLlnKjlkIzkuIDkuKrkuovku7blvqrnjq/kuK3ph43lpI3mm7TmlrBcclxuXHRcdGlmICgodGhpcyBhcyBhbnkpLl9pc1VwZGF0aW5nRnJvbVRvZ2dsZSkge1xyXG5cdFx0XHQodGhpcyBhcyBhbnkpLl9pc1VwZGF0aW5nRnJvbVRvZ2dsZSA9IGZhbHNlO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgdXBkYXRlZEhhYml0cyA9IHRoaXMuaGFiaXRzLm1hcCgoaGFiaXQpID0+IHtcclxuXHRcdFx0Y29uc3QgaGFiaXRDbG9uZSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoaGFiaXQpKSBhcyBIYWJpdFByb3BzOyAvLyBXb3JrIG9uIGEgY2xvbmVcclxuXHRcdFx0aWYgKCFoYWJpdENsb25lLmNvbXBsZXRpb25zKSBoYWJpdENsb25lLmNvbXBsZXRpb25zID0ge307XHJcblxyXG5cdFx0XHRzd2l0Y2ggKGhhYml0Q2xvbmUudHlwZSkge1xyXG5cdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWRcIjpcclxuXHRcdFx0XHRcdC8vIEhhbmRsZSBzY2hlZHVsZWQgaGFiaXRzIChqb3VybmV5IGhhYml0cylcclxuXHRcdFx0XHRcdGNvbnN0IHNjaGVkdWxlZEhhYml0ID0gaGFiaXRDbG9uZSBhcyBTY2hlZHVsZWRIYWJpdFByb3BzO1xyXG5cdFx0XHRcdFx0Y29uc3QgZXZlbnRNYXAgPSBoYWJpdENsb25lLnByb3BlcnRpZXNNYXAgfHwge307XHJcblx0XHRcdFx0XHRpZiAoIXNjaGVkdWxlZEhhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdKVxyXG5cdFx0XHRcdFx0XHRzY2hlZHVsZWRIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXSA9IHt9O1xyXG5cdFx0XHRcdFx0bGV0IGV2ZW50Q2hhbmdlZCA9IGZhbHNlO1xyXG5cclxuXHRcdFx0XHRcdGZvciAoY29uc3QgW2V2ZW50TmFtZSwgcHJvcGVydHlLZXldIG9mIE9iamVjdC5lbnRyaWVzKFxyXG5cdFx0XHRcdFx0XHRldmVudE1hcFxyXG5cdFx0XHRcdFx0KSkge1xyXG5cdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0cHJvcGVydHlLZXkgJiZcclxuXHRcdFx0XHRcdFx0XHRoYXNWYWx1ZShjYWNoZS5mcm9udG1hdHRlcj8uW3Byb3BlcnR5S2V5IGFzIHN0cmluZ10pXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG5ld1ZhbHVlID1cclxuXHRcdFx0XHRcdFx0XHRcdGNhY2hlLmZyb250bWF0dGVyPy5bcHJvcGVydHlLZXkgYXMgc3RyaW5nXSA/P1xyXG5cdFx0XHRcdFx0XHRcdFx0XCJcIjtcclxuXHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRoYXNWYWx1ZShuZXdWYWx1ZSkgJiZcclxuXHRcdFx0XHRcdFx0XHRcdHNjaGVkdWxlZEhhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdW1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRldmVudE5hbWVcclxuXHRcdFx0XHRcdFx0XHRcdF0gIT09IG5ld1ZhbHVlXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRzY2hlZHVsZWRIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXVtldmVudE5hbWVdID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0bmV3VmFsdWUgYXMgYW55O1xyXG5cdFx0XHRcdFx0XHRcdFx0ZXZlbnRDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0IWhhc1ZhbHVlKG5ld1ZhbHVlKSAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0c2NoZWR1bGVkSGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl0/LltcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZXZlbnROYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRdICE9PSB1bmRlZmluZWRcclxuXHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSBzY2hlZHVsZWRIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXVtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZXZlbnROYW1lXHJcblx0XHRcdFx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0XHRcdFx0ZXZlbnRDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0XHRcdFx0c2NoZWR1bGVkSGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl0/LltldmVudE5hbWVdICE9PVxyXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRkZWxldGUgc2NoZWR1bGVkSGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl1bXHJcblx0XHRcdFx0XHRcdFx0XHRldmVudE5hbWVcclxuXHRcdFx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0XHRcdGV2ZW50Q2hhbmdlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGlmIChldmVudENoYW5nZWQpIGhhYml0c0NoYW5nZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdGNhc2UgXCJkYWlseVwiOlxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIGRhaWx5IGhhYml0cyB3aXRoIGN1c3RvbSBjb21wbGV0aW9uIHRleHRcclxuXHRcdFx0XHRcdGNvbnN0IGRhaWx5SGFiaXQgPSBoYWJpdENsb25lIGFzIERhaWx5SGFiaXRQcm9wcztcclxuXHRcdFx0XHRcdGxldCBmb3VuZERhaWx5UHJvcGVydHkgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGRhaWx5SGFiaXQucHJvcGVydHkgJiZcclxuXHRcdFx0XHRcdFx0Y2FjaGUuZnJvbnRtYXR0ZXI/LltkYWlseUhhYml0LnByb3BlcnR5XSAhPT1cclxuXHRcdFx0XHRcdFx0XHR1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdFx0Y2FjaGUuZnJvbnRtYXR0ZXI/LltkYWlseUhhYml0LnByb3BlcnR5XSAhPT0gXCJcIlxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGZvdW5kRGFpbHlQcm9wZXJ0eSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gY2FjaGUuZnJvbnRtYXR0ZXJbZGFpbHlIYWJpdC5wcm9wZXJ0eV07XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBJZiBjb21wbGV0aW9uVGV4dCBpcyBkZWZpbmVkLCBjaGVjayBpZiB2YWx1ZSBtYXRjaGVzIGl0XHJcblx0XHRcdFx0XHRcdGlmIChkYWlseUhhYml0LmNvbXBsZXRpb25UZXh0KSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbmV3VmFsdWUgPVxyXG5cdFx0XHRcdFx0XHRcdFx0dmFsdWUgPT09IGRhaWx5SGFiaXQuY29tcGxldGlvblRleHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0PyAxXHJcblx0XHRcdFx0XHRcdFx0XHRcdDogKHZhbHVlIGFzIHN0cmluZyk7XHJcblx0XHRcdFx0XHRcdFx0aWYgKGRhaWx5SGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl0gIT09IG5ld1ZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRkYWlseUhhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdID0gbmV3VmFsdWU7XHJcblx0XHRcdFx0XHRcdFx0XHRoYWJpdHNDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gRGVmYXVsdCBiZWhhdmlvcjogYm9vbGVhbiB2YWx1ZSBmb3IgY29tcGxldGlvblxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG5ld1ZhbHVlID0gdmFsdWUgPT09IHRydWUgfHwgdmFsdWUgPT09IFwidHJ1ZVwiO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChkYWlseUhhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdICE9PSBuZXdWYWx1ZSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZGFpbHlIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXSA9IG5ld1ZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdFx0aGFiaXRzQ2hhbmdlZCA9IHRydWU7XHJcblx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBVc2UgdGhlIGZpcnN0IGZvdW5kIHByb3BlcnR5XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHQhZm91bmREYWlseVByb3BlcnR5ICYmXHJcblx0XHRcdFx0XHRcdGRhaWx5SGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl0gIT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSBkYWlseUhhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdO1xyXG5cdFx0XHRcdFx0XHRoYWJpdHNDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlIFwiY291bnRcIjpcclxuXHRcdFx0XHRcdC8vIEhhbmRsZSBjb3VudCBoYWJpdHNcclxuXHRcdFx0XHRcdGNvbnN0IGNvdW50SGFiaXQgPSBoYWJpdENsb25lIGFzIENvdW50SGFiaXRQcm9wcztcclxuXHRcdFx0XHRcdGxldCBmb3VuZENvdW50UHJvcGVydHkgPSBmYWxzZTtcclxuXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdGNvdW50SGFiaXQucHJvcGVydHkgJiZcclxuXHRcdFx0XHRcdFx0Y2FjaGUuZnJvbnRtYXR0ZXI/Lltjb3VudEhhYml0LnByb3BlcnR5XSAhPT1cclxuXHRcdFx0XHRcdFx0XHR1bmRlZmluZWQgJiZcclxuXHRcdFx0XHRcdFx0Y2FjaGUuZnJvbnRtYXR0ZXI/Lltjb3VudEhhYml0LnByb3BlcnR5XSAhPT0gXCJcIlxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGZvdW5kQ291bnRQcm9wZXJ0eSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gY2FjaGUuZnJvbnRtYXR0ZXJbY291bnRIYWJpdC5wcm9wZXJ0eV07XHJcblx0XHRcdFx0XHRcdGNvbnN0IG51bVZhbHVlID0gTnVtYmVyKHZhbHVlKTtcclxuXHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHQhaXNOYU4obnVtVmFsdWUpICYmXHJcblx0XHRcdFx0XHRcdFx0Y291bnRIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXSAhPT0gbnVtVmFsdWVcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0Y291bnRIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXSA9IG51bVZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdGhhYml0c0NoYW5nZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBVc2UgdGhlIGZpcnN0IGZvdW5kIHByb3BlcnR5XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHQhZm91bmRDb3VudFByb3BlcnR5ICYmXHJcblx0XHRcdFx0XHRcdGNvdW50SGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl0gIT09IHVuZGVmaW5lZFxyXG5cdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdGRlbGV0ZSBjb3VudEhhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdO1xyXG5cdFx0XHRcdFx0XHRoYWJpdHNDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRjYXNlIFwibWFwcGluZ1wiOlxyXG5cdFx0XHRcdFx0Ly8gSGFuZGxlIG1hcHBpbmcgaGFiaXRzXHJcblx0XHRcdFx0XHRjb25zdCBtYXBwaW5nSGFiaXQgPSBoYWJpdENsb25lIGFzIE1hcHBpbmdIYWJpdFByb3BzO1xyXG5cdFx0XHRcdFx0bGV0IGZvdW5kTWFwcGluZ1Byb3BlcnR5ID0gZmFsc2U7XHJcblxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRtYXBwaW5nSGFiaXQucHJvcGVydHkgJiZcclxuXHRcdFx0XHRcdFx0Y2FjaGUuZnJvbnRtYXR0ZXI/LlttYXBwaW5nSGFiaXQucHJvcGVydHldICE9PVxyXG5cdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCAmJlxyXG5cdFx0XHRcdFx0XHRjYWNoZS5mcm9udG1hdHRlcj8uW21hcHBpbmdIYWJpdC5wcm9wZXJ0eV0gIT09IFwiXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRmb3VuZE1hcHBpbmdQcm9wZXJ0eSA9IHRydWU7XHJcblx0XHRcdFx0XHRcdGNvbnN0IHZhbHVlID0gY2FjaGUuZnJvbnRtYXR0ZXJbbWFwcGluZ0hhYml0LnByb3BlcnR5XTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbnVtVmFsdWUgPSBOdW1iZXIodmFsdWUpO1xyXG5cclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdCFpc05hTihudW1WYWx1ZSkgJiZcclxuXHRcdFx0XHRcdFx0XHRtYXBwaW5nSGFiaXQubWFwcGluZ1tudW1WYWx1ZV0gJiZcclxuXHRcdFx0XHRcdFx0XHRtYXBwaW5nSGFiaXQuY29tcGxldGlvbnNbZGF0ZVN0cl0gIT09IG51bVZhbHVlXHJcblx0XHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRcdG1hcHBpbmdIYWJpdC5jb21wbGV0aW9uc1tkYXRlU3RyXSA9IG51bVZhbHVlO1xyXG5cdFx0XHRcdFx0XHRcdGhhYml0c0NoYW5nZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdGJyZWFrOyAvLyBVc2UgdGhlIGZpcnN0IGZvdW5kIHByb3BlcnR5XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHQhZm91bmRNYXBwaW5nUHJvcGVydHkgJiZcclxuXHRcdFx0XHRcdFx0bWFwcGluZ0hhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdICE9PSB1bmRlZmluZWRcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRkZWxldGUgbWFwcGluZ0hhYml0LmNvbXBsZXRpb25zW2RhdGVTdHJdO1xyXG5cdFx0XHRcdFx0XHRoYWJpdHNDaGFuZ2VkID0gdHJ1ZTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gaGFiaXRDbG9uZTsgLy8gUmV0dXJuIHRoZSB1cGRhdGVkIGNsb25lXHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAoaGFiaXRzQ2hhbmdlZCkge1xyXG5cdFx0XHQvLyBVcGRhdGUgc3RhdGUgd2l0aG91dCB0cmFja2luZyBpbiBoaXN0b3J5IGZvciBiYWNrZ3JvdW5kIHVwZGF0ZXNcclxuXHRcdFx0dGhpcy5oYWJpdHMgPSB1cGRhdGVkSGFiaXRzO1xyXG5cdFx0XHR0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLnRyaWdnZXIoXHJcblx0XHRcdFx0XCJ0YXNrLWdlbml1czpoYWJpdC1pbmRleC11cGRhdGVkXCIsXHJcblx0XHRcdFx0dGhpcy5oYWJpdHNcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGFzeW5jIHVwZGF0ZUhhYml0SW5PYnNpZGlhbihcclxuXHRcdHVwZGF0ZWRIYWJpdDogSGFiaXRQcm9wcyxcclxuXHRcdGRhdGU6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgYXBwOiBBcHAgPSB0aGlzLnBsdWdpbi5hcHA7XHJcblx0XHRjb25zdCBtb21lbnREYXRlID0gbW9tZW50KGRhdGUsIFwiWVlZWS1NTS1ERFwiKS5zZXQoXCJob3VyXCIsIDEyKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhtb21lbnREYXRlKTtcclxuXHRcdGlmICghbW9tZW50RGF0ZS5pc1ZhbGlkKCkpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRgSW52YWxpZCBkYXRlIGZvcm1hdCBwcm92aWRlZDogJHtkYXRlfS4gRXhwZWN0ZWQgWVlZWS1NTS1ERC5gXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyDlhYjmm7TmlrDlhoXlrZjkuK3nmoTkuaDmg6/nirbmgIHvvIzpgb/lhY3op6blj5EgbWV0YWRhdGEgY2hhbmdlIOS6i+S7tuaXtueKtuaAgeS4jeS4gOiHtFxyXG5cdFx0Y29uc3QgaGFiaXRJbmRleCA9IHRoaXMuaGFiaXRzLmZpbmRJbmRleChcclxuXHRcdFx0KGgpID0+IGguaWQgPT09IHVwZGF0ZWRIYWJpdC5pZFxyXG5cdFx0KTtcclxuXHRcdGlmIChoYWJpdEluZGV4ICE9PSAtMSkge1xyXG5cdFx0XHR0aGlzLmhhYml0c1toYWJpdEluZGV4XSA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkodXBkYXRlZEhhYml0KSk7XHJcblx0XHRcdC8vIOiuvue9ruagh+iusO+8jOmYsuatoiBtZXRhZGF0YSBjaGFuZ2Ug5LqL5Lu26YeN5aSN5pu05pawXHJcblx0XHRcdCh0aGlzIGFzIGFueSkuX2lzVXBkYXRpbmdGcm9tVG9nZ2xlID0gdHJ1ZTtcclxuXHJcblx0XHRcdC8vIOeri+WIu+inpuWPkeS4gOasoeWIt+aWsO+8jOehruS/nSBVSSDljbPml7bmm7TmlrBcclxuXHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFwidGFzay1nZW5pdXM6aGFiaXQtaW5kZXgtdXBkYXRlZFwiLFxyXG5cdFx0XHRcdHRoaXMuaGFiaXRzXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0bGV0IGRhaWx5Tm90ZTogVEZpbGUgfCBudWxsID0gbnVsbDtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKGdldEFsbERhaWx5Tm90ZXMoKSk7XHJcblx0XHRcdGRhaWx5Tm90ZSA9IGdldERhaWx5Tm90ZShtb21lbnREYXRlLCBnZXRBbGxEYWlseU5vdGVzKCkpO1xyXG5cclxuXHRcdFx0aWYgKCFkYWlseU5vdGUpIHtcclxuXHRcdFx0XHRpZiAoIWFwcEhhc0RhaWx5Tm90ZXNQbHVnaW5Mb2FkZWQoKSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFx0XCJEYWlseSBub3RlcyBwbHVnaW4gaXMgbm90IGxvYWRlZC4gUGxlYXNlIGVuYWJsZSB0aGUgRGFpbHkgTm90ZXMgcGx1Z2luIGluIE9ic2lkaWFuLlwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3Qgc2V0dGluZ3MgPSBnZXREYWlseU5vdGVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdGlmICghc2V0dGluZ3MuZm9sZGVyKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcIkRhaWx5IG5vdGVzIGZvbGRlciBpcyBub3Qgc2V0LiBQbGVhc2UgY29uZmlndXJlIHRoZSBEYWlseSBOb3RlcyBwbHVnaW4gaW4gT2JzaWRpYW4uXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0ZGFpbHlOb3RlID0gYXdhaXQgY3JlYXRlRGFpbHlOb3RlKG1vbWVudERhdGUpO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdFx0XHRcIlRyeWluZyB0byB1c2Ugb2JzaWRpYW4gZGVmYXVsdCBjcmVhdGUgZGFpbHkgbm90ZSBmdW5jdGlvblwiLFxyXG5cdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5hcHAuY29tbWFuZHMuZXhlY3V0ZUNvbW1hbmRCeUlkKFwiZGFpbHktbm90ZXNcIik7XHJcblxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZ2V0QWxsRGFpbHlOb3RlcygpKTtcclxuXHJcblx0XHRcdFx0XHRkYWlseU5vdGUgPSBnZXREYWlseU5vdGUobW9tZW50RGF0ZSwgZ2V0QWxsRGFpbHlOb3RlcygpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBnZXR0aW5nIG9yIGNyZWF0aW5nIGRhaWx5IG5vdGU6XCIsIGVycm9yKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChkYWlseU5vdGUpIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHQvLyBOb3RpZnkgZGF0YWZsb3cgd3JpdGUgc3RhcnQgdG8gYXZvaWQgZXZlbnQgbG9vcHNcclxuXHRcdFx0XHRlbWl0KHRoaXMucGx1Z2luLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9TVEFSVCwge1xyXG5cdFx0XHRcdFx0cGF0aDogZGFpbHlOb3RlLnBhdGgsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0YXdhaXQgYXBwLmZpbGVNYW5hZ2VyLnByb2Nlc3NGcm9udE1hdHRlcihcclxuXHRcdFx0XHRcdGRhaWx5Tm90ZSxcclxuXHRcdFx0XHRcdChmcm9udG1hdHRlcikgPT4ge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBjb21wbGV0aW9uID0gdXBkYXRlZEhhYml0LmNvbXBsZXRpb25zW2RhdGVdO1xyXG5cclxuXHRcdFx0XHRcdFx0c3dpdGNoICh1cGRhdGVkSGFiaXQudHlwZSkge1xyXG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJzY2hlZHVsZWRcIjpcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBzY2hlZHVsZWQgaGFiaXRzIChqb3VybmV5IGhhYml0cylcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGV2ZW50TWFwID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZEhhYml0LnByb3BlcnRpZXNNYXAgfHwge307XHJcblx0XHRcdFx0XHRcdFx0XHRmb3IgKGNvbnN0IFtcclxuXHRcdFx0XHRcdFx0XHRcdFx0ZXZlbnROYW1lLFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRwcm9wZXJ0eUtleSxcclxuXHRcdFx0XHRcdFx0XHRcdF0gb2YgT2JqZWN0LmVudHJpZXMoZXZlbnRNYXApKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChwcm9wZXJ0eUtleSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIE9ubHkgdXBkYXRlIGlmIGEgcHJvcGVydHkga2V5IGlzIGRlZmluZWRcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHR0eXBlb2YgY29tcGxldGlvbiA9PT0gXCJvYmplY3RcIiAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbj8uW2V2ZW50TmFtZV0gIT09XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdHVuZGVmaW5lZCAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbj8uW2V2ZW50TmFtZV0gIT09IFwiXCJcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZyb250bWF0dGVyW3Byb3BlcnR5S2V5IGFzIHN0cmluZ10gPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb21wbGV0aW9uW2V2ZW50TmFtZV07XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIOWmguaenGNvbXBsZXRpb27kuI3lrZjlnKjvvIzkuovku7blkI3nvLrlpLHmiJblgLzkuLrnqbrlrZfnrKbkuLLvvIzliKDpmaTor6XlsZ7mgKdcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGRlbGV0ZSBmcm9udG1hdHRlcltcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0cHJvcGVydHlLZXkgYXMgc3RyaW5nXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRcdFx0XHRcdGNhc2UgXCJkYWlseVwiOlxyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGRhaWx5IGhhYml0cyB3aXRoIGN1c3RvbSBjb21wbGV0aW9uIHRleHRcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGRhaWx5SGFiaXQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkSGFiaXQgYXMgRGFpbHlIYWJpdFByb3BzO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRcdGlmIChkYWlseUhhYml0LnByb3BlcnR5KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbnN0IGtleVRvVXBkYXRlID0gZGFpbHlIYWJpdC5wcm9wZXJ0eTsgLy8gVXBkYXRlIHRoZSBwcmltYXJ5IHByb3BlcnR5XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbiAhPT0gbnVsbFxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBJZiBjb21wbGV0aW9uVGV4dCBpcyBkZWZpbmVkIGFuZCBjb21wbGV0aW9uIGlzIDEsIHVzZSB0aGUgY29tcGxldGlvblRleHRcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkYWlseUhhYml0LmNvbXBsZXRpb25UZXh0ICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRjb21wbGV0aW9uID09PSAxXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRmcm9udG1hdHRlcltrZXlUb1VwZGF0ZV0gPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRkYWlseUhhYml0LmNvbXBsZXRpb25UZXh0O1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQhZGFpbHlIYWJpdC5jb21wbGV0aW9uVGV4dCAmJlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZW9mIGNvbXBsZXRpb24gPT09IFwiYm9vbGVhblwiXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHQvLyBGb3Igc2ltcGxlIGRhaWx5IGhhYml0cywgdXNlIGJvb2xlYW4gdmFsdWVcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdGZyb250bWF0dGVyW2tleVRvVXBkYXRlXSA9XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRpb247XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdC8vIE90aGVyd2lzZSB1c2UgdGhlIHJhdyB2YWx1ZVxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0ZnJvbnRtYXR0ZXJba2V5VG9VcGRhdGVdID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbjtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Ly8gSWYgY29tcGxldGlvbiBpcyB1bmRlZmluZWQsIHJlbW92ZSB0aGUgcHJvcGVydHlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkZWxldGUgZnJvbnRtYXR0ZXJba2V5VG9VcGRhdGVdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0YEhhYml0ICR7dXBkYXRlZEhhYml0LmlkfSBoYXMgbm8gcHJvcGVydGllcyBkZWZpbmVkIGluIGhhYml0S2V5TWFwLmBcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0XHRcdFx0XHRjYXNlIFwiY291bnRcIjpcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGNvdW50SGFiaXQgPVxyXG5cdFx0XHRcdFx0XHRcdFx0XHR1cGRhdGVkSGFiaXQgYXMgQ291bnRIYWJpdFByb3BzO1xyXG5cdFx0XHRcdFx0XHRcdFx0Ly8gSGFuZGxlIGNvdW50IGhhYml0c1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKGNvdW50SGFiaXQucHJvcGVydHkpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc3Qga2V5VG9VcGRhdGUgPSBjb3VudEhhYml0LnByb3BlcnR5OyAvLyBVcGRhdGUgdGhlIHByaW1hcnkgcHJvcGVydHlcclxuXHJcblx0XHRcdFx0XHRcdFx0XHRcdGlmIChjb21wbGV0aW9uICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcm9udG1hdHRlcltrZXlUb1VwZGF0ZV0gPSBjb21wbGV0aW9uO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIElmIGNvbXBsZXRpb24gaXMgdW5kZWZpbmVkLCByZW1vdmUgdGhlIHByb3BlcnR5XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZGVsZXRlIGZyb250bWF0dGVyW2tleVRvVXBkYXRlXTtcclxuXHRcdFx0XHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGBIYWJpdCAke3VwZGF0ZWRIYWJpdC5pZH0gaGFzIG5vIHByb3BlcnRpZXMgZGVmaW5lZCBpbiBoYWJpdEtleU1hcC5gXHJcblx0XHRcdFx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdFx0XHRcdFx0Y2FzZSBcIm1hcHBpbmdcIjpcclxuXHRcdFx0XHRcdFx0XHRcdC8vIEhhbmRsZSBtYXBwaW5nIGhhYml0c1xyXG5cdFx0XHRcdFx0XHRcdFx0Y29uc3QgbWFwcGluZ0hhYml0ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0dXBkYXRlZEhhYml0IGFzIE1hcHBpbmdIYWJpdFByb3BzO1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKG1hcHBpbmdIYWJpdC5wcm9wZXJ0eSkge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zdCBrZXlUb1VwZGF0ZSA9IG1hcHBpbmdIYWJpdC5wcm9wZXJ0eTsgLy8gVXBkYXRlIHRoZSBwcmltYXJ5IHByb3BlcnR5XHJcblxyXG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0Y29tcGxldGlvbiAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0dHlwZW9mIGNvbXBsZXRpb24gPT09IFwibnVtYmVyXCIgJiZcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRtYXBwaW5nSGFiaXQubWFwcGluZ1tjb21wbGV0aW9uXVxyXG5cdFx0XHRcdFx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRmcm9udG1hdHRlcltrZXlUb1VwZGF0ZV0gPSBjb21wbGV0aW9uO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdC8vIElmIGNvbXBsZXRpb24gaXMgdW5kZWZpbmVkIG9yIGludmFsaWQsIHJlbW92ZSB0aGUgcHJvcGVydHlcclxuXHRcdFx0XHRcdFx0XHRcdFx0XHRkZWxldGUgZnJvbnRtYXR0ZXJba2V5VG9VcGRhdGVdO1xyXG5cdFx0XHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0YEhhYml0ICR7dXBkYXRlZEhhYml0LmlkfSBoYXMgbm8gcHJvcGVydGllcyBkZWZpbmVkIGluIGhhYml0S2V5TWFwLmBcclxuXHRcdFx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHQvLyBOb3RpZnkgZGF0YWZsb3cgd3JpdGUgY29tcGxldGVcclxuXHRcdFx0XHRlbWl0KHRoaXMucGx1Z2luLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwge1xyXG5cdFx0XHRcdFx0cGF0aDogZGFpbHlOb3RlLnBhdGgsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdGBFcnJvciBwcm9jZXNzaW5nIGZyb250bWF0dGVyIGZvciAke2RhaWx5Tm90ZS5wYXRofTpgLFxyXG5cdFx0XHRcdFx0ZXJyb3JcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXHJcblx0XHRcdFx0YERhaWx5IG5vdGUgY291bGQgbm90IGJlIGZvdW5kIG9yIGNyZWF0ZWQgZm9yIGRhdGU6ICR7ZGF0ZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==