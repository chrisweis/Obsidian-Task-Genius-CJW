/**
 * File Task Manager Implementation
 * Manages tasks at the file level using Bases plugin data
 */
import { __awaiter } from "tslib";
/** Default property mapping for file-level tasks using dataview standard keys */
export const DEFAULT_FILE_TASK_MAPPING = {
    contentProperty: "title",
    statusProperty: "status",
    completedProperty: "completed",
    createdDateProperty: "createdDate",
    startDateProperty: "startDate",
    scheduledDateProperty: "scheduledDate",
    dueDateProperty: "dueDate",
    completedDateProperty: "completionDate",
    recurrenceProperty: "repeat",
    tagsProperty: "tags",
    projectProperty: "project",
    contextProperty: "context",
    priorityProperty: "priority",
    estimatedTimeProperty: "estimatedTime",
    actualTimeProperty: "actualTime",
};
export class FileTaskManagerImpl {
    constructor(app, fileSourceConfig, timeParsingService) {
        this.app = app;
        this.fileSourceConfig = fileSourceConfig;
        this.timeParsingService = timeParsingService;
    }
    /**
     * Convert a BasesEntry to a FileTask
     */
    entryToFileTask(entry, mapping = DEFAULT_FILE_TASK_MAPPING) {
        const properties = entry.properties || {};
        // Generate unique ID based on file path
        const id = `file-task-${entry.file.path}`;
        // Log available properties for debugging (only for first few entries)
        if (Math.random() < 0.1) {
            // Log 10% of entries to avoid spam
            console.log(`[FileTaskManager] Available properties for ${entry.file.name}:`, Object.keys(properties));
        }
        // Extract content from the specified property or use file name without extension
        let content = this.getPropertyValue(entry, mapping.contentProperty);
        if (!content) {
            // Use file name without extension as content
            const fileName = entry.file.name;
            const lastDotIndex = fileName.lastIndexOf(".");
            content =
                lastDotIndex > 0
                    ? fileName.substring(0, lastDotIndex)
                    : fileName;
        }
        // Extract status
        const status = this.getPropertyValue(entry, mapping.statusProperty) || " ";
        // Extract completion state
        const completed = this.getBooleanPropertyValue(entry, mapping.completedProperty) ||
            false;
        // Extract dates
        const createdDate = this.getDatePropertyValue(entry, mapping.createdDateProperty);
        const startDate = this.getDatePropertyValue(entry, mapping.startDateProperty);
        const scheduledDate = this.getDatePropertyValue(entry, mapping.scheduledDateProperty);
        const dueDate = this.getDatePropertyValue(entry, mapping.dueDateProperty);
        const completedDate = this.getDatePropertyValue(entry, mapping.completedDateProperty);
        // Extract other properties
        const recurrence = this.getPropertyValue(entry, mapping.recurrenceProperty);
        const tags = this.getArrayPropertyValue(entry, mapping.tagsProperty) || [];
        const project = this.getPropertyValue(entry, mapping.projectProperty);
        const context = this.getPropertyValue(entry, mapping.contextProperty);
        const priority = this.getNumberPropertyValue(entry, mapping.priorityProperty);
        const estimatedTime = this.getNumberPropertyValue(entry, mapping.estimatedTimeProperty);
        const actualTime = this.getNumberPropertyValue(entry, mapping.actualTimeProperty);
        // Extract time components from content using enhanced time parsing
        const enhancedMetadata = this.extractTimeComponents(content);
        // Combine dates with time components to create enhanced datetime objects
        const enhancedDates = this.combineTimestampsWithTimeComponents({ startDate, dueDate, scheduledDate, completedDate }, enhancedMetadata.timeComponents);
        const fileTask = {
            id,
            content,
            filePath: entry.file.path,
            completed,
            status,
            metadata: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ tags: tags || [], children: [] }, (createdDate && { createdDate })), (startDate && { startDate })), (scheduledDate && { scheduledDate })), (dueDate && { dueDate })), (completedDate && { completedDate })), (recurrence && { recurrence })), (project && { project })), (context && { context })), (priority && { priority })), (estimatedTime && { estimatedTime })), (actualTime && { actualTime })), enhancedMetadata), (enhancedDates && { enhancedDates })),
            sourceEntry: entry,
            isFileTask: true,
        };
        return fileTask;
    }
    /**
     * Convert a FileTask back to property updates
     */
    fileTaskToPropertyUpdates(task, mapping = DEFAULT_FILE_TASK_MAPPING, excludeContent = false) {
        var _a;
        const updates = {};
        // Update content property based on configuration
        // Skip content if it was already handled separately (e.g., in handleContentUpdate)
        if (!excludeContent) {
            const config = (_a = this.fileSourceConfig) === null || _a === void 0 ? void 0 : _a.fileTaskProperties;
            if ((config === null || config === void 0 ? void 0 : config.contentSource) && config.contentSource !== 'filename') {
                // Only update content property if it's not handled by file renaming
                const shouldUpdateProperty = this.shouldUpdateContentProperty(config);
                if (shouldUpdateProperty) {
                    updates[mapping.contentProperty] = task.content;
                }
            }
        }
        // Note: If contentSource is 'filename', content updates are handled by file renaming
        updates[mapping.statusProperty] = task.status;
        updates[mapping.completedProperty] = task.completed;
        // Optional properties
        if (task.metadata.createdDate !== undefined &&
            mapping.createdDateProperty) {
            updates[mapping.createdDateProperty] = this.formatDateForProperty(task.metadata.createdDate);
        }
        if (task.metadata.startDate !== undefined &&
            mapping.startDateProperty) {
            updates[mapping.startDateProperty] = this.formatDateForProperty(task.metadata.startDate);
        }
        if (task.metadata.scheduledDate !== undefined &&
            mapping.scheduledDateProperty) {
            updates[mapping.scheduledDateProperty] = this.formatDateForProperty(task.metadata.scheduledDate);
        }
        if (task.metadata.dueDate !== undefined && mapping.dueDateProperty) {
            updates[mapping.dueDateProperty] = this.formatDateForProperty(task.metadata.dueDate);
        }
        if (task.metadata.completedDate !== undefined &&
            mapping.completedDateProperty) {
            updates[mapping.completedDateProperty] = this.formatDateForProperty(task.metadata.completedDate);
        }
        if (task.metadata.recurrence !== undefined &&
            mapping.recurrenceProperty) {
            updates[mapping.recurrenceProperty] = task.metadata.recurrence;
        }
        if (task.metadata.tags.length > 0 && mapping.tagsProperty) {
            updates[mapping.tagsProperty] = task.metadata.tags;
        }
        if (task.metadata.project !== undefined && mapping.projectProperty) {
            updates[mapping.projectProperty] = task.metadata.project;
        }
        if (task.metadata.context !== undefined && mapping.contextProperty) {
            updates[mapping.contextProperty] = task.metadata.context;
        }
        if (task.metadata.priority !== undefined && mapping.priorityProperty) {
            updates[mapping.priorityProperty] = task.metadata.priority;
        }
        if (task.metadata.estimatedTime !== undefined &&
            mapping.estimatedTimeProperty) {
            updates[mapping.estimatedTimeProperty] =
                task.metadata.estimatedTime;
        }
        if (task.metadata.actualTime !== undefined &&
            mapping.actualTimeProperty) {
            updates[mapping.actualTimeProperty] = task.metadata.actualTime;
        }
        return updates;
    }
    /**
     * Update a file task by updating its properties
     */
    updateFileTask(task, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            // Merge updates into the task
            const updatedTask = Object.assign(Object.assign({}, task), updates);
            let contentHandledSeparately = false;
            // Handle content changes - re-extract time components if content changed
            if (updates.content && updates.content !== task.content) {
                yield this.handleContentUpdate(task, updates.content);
                contentHandledSeparately = true;
                // Re-extract time components from updated content
                const enhancedMetadata = this.extractTimeComponents(updates.content);
                // Update the task's metadata with new time components
                if (enhancedMetadata.timeComponents) {
                    updatedTask.metadata = Object.assign(Object.assign({}, updatedTask.metadata), { timeComponents: enhancedMetadata.timeComponents });
                    // Recombine dates with new time components
                    const enhancedDates = this.combineTimestampsWithTimeComponents({
                        startDate: updatedTask.metadata.startDate,
                        dueDate: updatedTask.metadata.dueDate,
                        scheduledDate: updatedTask.metadata.scheduledDate,
                        completedDate: updatedTask.metadata.completedDate,
                    }, enhancedMetadata.timeComponents);
                    if (enhancedDates) {
                        updatedTask.metadata.enhancedDates = enhancedDates;
                    }
                    // Update the original task object with the new metadata
                    task.metadata = updatedTask.metadata;
                }
            }
            // Convert to property updates (excluding content if it was handled separately)
            const propertyUpdates = this.fileTaskToPropertyUpdates(updatedTask, DEFAULT_FILE_TASK_MAPPING, contentHandledSeparately);
            console.log(`[FileTaskManager] Updating file task ${task.content} with properties:`, propertyUpdates);
            // Update properties through the source entry
            for (const [key, value] of Object.entries(propertyUpdates)) {
                try {
                    // Note: updateProperty might be async, so we await it
                    if (typeof task.sourceEntry.updateProperty === 'function') {
                        yield Promise.resolve(task.sourceEntry.updateProperty(key, value));
                    }
                    else {
                        console.error(`updateProperty method not available on source entry for key: ${key}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to update property ${key}:`, error);
                }
            }
        });
    }
    /**
     * Determine if content should be updated via property update vs file operations
     */
    shouldUpdateContentProperty(config) {
        switch (config.contentSource) {
            case 'title':
                // Only update property if preferFrontmatterTitle is enabled
                return config.preferFrontmatterTitle === true;
            case 'h1':
                // H1 updates are handled by file content modification, not property updates
                return false;
            case 'custom':
                // Custom fields are always updated via properties
                return true;
            case 'filename':
            default:
                // Filename updates are handled by file renaming
                return false;
        }
    }
    /**
     * Handle content update - update frontmatter property, rename file, or update custom field
     */
    handleContentUpdate(task, newContent) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const config = (_a = this.fileSourceConfig) === null || _a === void 0 ? void 0 : _a.fileTaskProperties;
            if (!config) {
                console.warn('[FileTaskManager] No file source config available, skipping content update');
                return;
            }
            switch (config.contentSource) {
                case 'title':
                    if (config.preferFrontmatterTitle) {
                        yield this.updateFrontmatterTitle(task, newContent);
                    }
                    else {
                        yield this.updateFileName(task, newContent);
                    }
                    break;
                case 'h1':
                    // For H1 content source, we need to update the first heading in the file
                    yield this.updateH1Heading(task, newContent);
                    break;
                case 'custom':
                    // For custom content source, update the custom field in frontmatter
                    if (config.customContentField) {
                        yield this.updateCustomContentField(task, newContent, config.customContentField);
                    }
                    else {
                        console.warn('[FileTaskManager] Custom content source specified but no customContentField configured');
                    }
                    break;
                case 'filename':
                default:
                    // For filename content source, rename the file
                    yield this.updateFileName(task, newContent);
                    break;
            }
        });
    }
    /**
     * Update frontmatter title property
     */
    updateFrontmatterTitle(task, newTitle) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update the title property in frontmatter through the source entry
                // Note: updateProperty might be async, so we await it
                if (typeof task.sourceEntry.updateProperty === 'function') {
                    yield Promise.resolve(task.sourceEntry.updateProperty('title', newTitle));
                    console.log(`[FileTaskManager] Updated frontmatter title for ${task.filePath} to: ${newTitle}`);
                }
                else {
                    throw new Error('updateProperty method not available on source entry');
                }
            }
            catch (error) {
                console.error(`[FileTaskManager] Failed to update frontmatter title:`, error);
                // Fallback to file renaming if frontmatter update fails
                yield this.updateFileName(task, newTitle);
            }
        });
    }
    /**
     * Update H1 heading in the file content
     */
    updateH1Heading(task, newHeading) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = this.app.vault.getFileByPath(task.filePath);
                if (!file) {
                    console.error(`[FileTaskManager] File not found: ${task.filePath}`);
                    return;
                }
                const content = yield this.app.vault.read(file);
                const lines = content.split('\n');
                // Find the first H1 heading
                let h1LineIndex = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('# ')) {
                        h1LineIndex = i;
                        break;
                    }
                }
                if (h1LineIndex >= 0) {
                    // Update existing H1
                    lines[h1LineIndex] = `# ${newHeading}`;
                }
                else {
                    // Add new H1 at the beginning (after frontmatter if present)
                    let insertIndex = 0;
                    if (content.startsWith('---')) {
                        // Skip frontmatter
                        const frontmatterEnd = content.indexOf('\n---\n', 3);
                        if (frontmatterEnd >= 0) {
                            const frontmatterLines = content.substring(0, frontmatterEnd + 5).split('\n').length - 1;
                            insertIndex = frontmatterLines;
                        }
                    }
                    lines.splice(insertIndex, 0, `# ${newHeading}`, '');
                }
                const newContent = lines.join('\n');
                yield this.app.vault.modify(file, newContent);
                console.log(`[FileTaskManager] Updated H1 heading for ${task.filePath} to: ${newHeading}`);
            }
            catch (error) {
                console.error(`[FileTaskManager] Failed to update H1 heading:`, error);
            }
        });
    }
    /**
     * Update custom content field in frontmatter
     */
    updateCustomContentField(task, newContent, fieldName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update the custom field in frontmatter through the source entry
                // Note: updateProperty might be async, so we await it
                if (typeof task.sourceEntry.updateProperty === 'function') {
                    yield Promise.resolve(task.sourceEntry.updateProperty(fieldName, newContent));
                    console.log(`[FileTaskManager] Updated custom field '${fieldName}' for ${task.filePath} to: ${newContent}`);
                }
                else {
                    throw new Error('updateProperty method not available on source entry');
                }
            }
            catch (error) {
                console.error(`[FileTaskManager] Failed to update custom field '${fieldName}':`, error);
            }
        });
    }
    /**
     * Update file name when task content changes
     */
    updateFileName(task, newContent) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = this.app.vault.getFileByPath(task.filePath);
                if (file) {
                    const currentPath = task.filePath;
                    const lastSlashIndex = currentPath.lastIndexOf("/");
                    const directory = lastSlashIndex > 0
                        ? currentPath.substring(0, lastSlashIndex)
                        : "";
                    const extension = currentPath.substring(currentPath.lastIndexOf("."));
                    // Ensure newContent doesn't already have the extension
                    let cleanContent = newContent;
                    if (cleanContent.endsWith(extension)) {
                        cleanContent = cleanContent.substring(0, cleanContent.length - extension.length);
                    }
                    const newPath = directory
                        ? `${directory}/${cleanContent}${extension}`
                        : `${cleanContent}${extension}`;
                    // Only rename if the new path is different
                    if (newPath !== currentPath) {
                        yield this.app.fileManager.renameFile(file, newPath);
                        // Update the task's filePath to reflect the new path
                        task.filePath = newPath;
                        console.log(`[FileTaskManager] Renamed file from ${currentPath} to ${newPath}`);
                    }
                }
            }
            catch (error) {
                console.error(`[FileTaskManager] Failed to rename file:`, error);
            }
        });
    }
    /**
     * Get all file tasks from a list of entries
     */
    getFileTasksFromEntries(entries, mapping = DEFAULT_FILE_TASK_MAPPING) {
        // Filter out non-markdown files with robust extension detection
        const markdownEntries = entries.filter((entry) => {
            var _a, _b, _c, _d;
            try {
                let ext = (_a = entry === null || entry === void 0 ? void 0 : entry.file) === null || _a === void 0 ? void 0 : _a.extension;
                if (!ext || typeof ext !== "string") {
                    // Try implicit.ext from Bases
                    ext = (_b = entry === null || entry === void 0 ? void 0 : entry.implicit) === null || _b === void 0 ? void 0 : _b.ext;
                }
                if (!ext || typeof ext !== "string") {
                    // Derive from path
                    const path = (_c = entry === null || entry === void 0 ? void 0 : entry.file) === null || _c === void 0 ? void 0 : _c.path;
                    if (path && path.includes(".")) {
                        ext = path.split(".").pop();
                    }
                }
                if (!ext || typeof ext !== "string") {
                    // Derive from file name
                    const name = (_d = entry === null || entry === void 0 ? void 0 : entry.file) === null || _d === void 0 ? void 0 : _d.name;
                    if (name && name.includes(".")) {
                        ext = name.split(".").pop();
                    }
                }
                return (ext || "").toLowerCase() === "md";
            }
            catch (_e) {
                return false;
            }
        });
        console.log(`[FileTaskManager] Filtered ${entries.length} entries to ${markdownEntries.length} markdown files`);
        return markdownEntries.map((entry) => this.entryToFileTask(entry, mapping));
    }
    /**
     * Filter file tasks based on criteria
     */
    filterFileTasks(tasks, filters) {
        // This is a simplified implementation - you can extend this based on your filtering needs
        return tasks.filter((task) => {
            // Add your filtering logic here
            return true;
        });
    }
    // Helper methods for property extraction
    getPropertyValue(entry, propertyName) {
        var _a;
        if (!propertyName)
            return undefined;
        // 1) Try Bases API
        try {
            const value = entry.getValue({
                type: "property",
                name: propertyName,
            });
            if (value !== null && value !== undefined)
                return String(value);
        }
        catch (_b) {
        }
        // 2) Fallback: direct properties/frontmatter/note.data
        try {
            const anyEntry = entry;
            if ((anyEntry === null || anyEntry === void 0 ? void 0 : anyEntry.properties) &&
                anyEntry.properties[propertyName] !== undefined) {
                return String(anyEntry.properties[propertyName]);
            }
            if ((anyEntry === null || anyEntry === void 0 ? void 0 : anyEntry.frontmatter) &&
                anyEntry.frontmatter[propertyName] !== undefined) {
                return String(anyEntry.frontmatter[propertyName]);
            }
            if (((_a = anyEntry === null || anyEntry === void 0 ? void 0 : anyEntry.note) === null || _a === void 0 ? void 0 : _a.data) &&
                anyEntry.note.data[propertyName] !== undefined) {
                return String(anyEntry.note.data[propertyName]);
            }
        }
        catch (_c) {
        }
        return undefined;
    }
    getBooleanPropertyValue(entry, propertyName) {
        if (!propertyName)
            return undefined;
        try {
            const value = entry.getValue({
                type: "property",
                name: propertyName,
            });
            if (typeof value === "boolean")
                return value;
            if (typeof value === "string") {
                const lower = value.toLowerCase();
                return lower === "true" || lower === "yes" || lower === "1";
            }
            return Boolean(value);
        }
        catch (_a) {
            return undefined;
        }
    }
    getNumberPropertyValue(entry, propertyName) {
        if (!propertyName)
            return undefined;
        try {
            const value = entry.getValue({
                type: "property",
                name: propertyName,
            });
            const num = Number(value);
            return isNaN(num) ? undefined : num;
        }
        catch (_a) {
            return undefined;
        }
    }
    getDatePropertyValue(entry, propertyName) {
        if (!propertyName)
            return undefined;
        try {
            const fallbackNames = {
                createdDate: ["created"],
                startDate: ["start"],
                scheduledDate: ["scheduled"],
                dueDate: ["due"],
                completedDate: ["completion", "completed", "done"],
            };
            const candidateNames = [
                propertyName,
                ...(fallbackNames[propertyName] || []),
            ];
            let value = undefined;
            for (const name of candidateNames) {
                try {
                    value = entry.getValue({
                        type: "property",
                        name,
                    });
                }
                catch (_a) {
                    value = undefined;
                }
                if (value !== undefined && value !== null) {
                    break;
                }
            }
            if (value === null || value === undefined)
                return undefined;
            // Handle timestamp (number)
            if (typeof value === "number")
                return value;
            // Handle date string
            if (typeof value === "string") {
                // Support various date formats commonly used in dataview
                const dateStr = value.trim();
                if (!dateStr)
                    return undefined;
                // Try parsing as ISO date first (YYYY-MM-DD)
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                    // Parse as local date to avoid timezone issues
                    const [year, month, day] = dateStr.split("-").map(Number);
                    const date = new Date(year, month - 1, day);
                    return isNaN(date.getTime()) ? undefined : date.getTime();
                }
                // Try parsing as general date (but be careful about timezone)
                const date = new Date(dateStr);
                return isNaN(date.getTime()) ? undefined : date.getTime();
            }
            // Handle Date object
            if (value instanceof Date) {
                return isNaN(value.getTime()) ? undefined : value.getTime();
            }
            return undefined;
        }
        catch (_b) {
            return undefined;
        }
    }
    getArrayPropertyValue(entry, propertyName) {
        if (!propertyName)
            return undefined;
        try {
            const value = entry.getValue({
                type: "property",
                name: propertyName,
            });
            if (value === null || value === undefined)
                return undefined;
            // Handle array values
            if (Array.isArray(value)) {
                return value
                    .map((v) => String(v))
                    .filter((v) => v.trim().length > 0);
            }
            // Handle string values (comma-separated or space-separated)
            if (typeof value === "string") {
                const str = value.trim();
                if (!str)
                    return undefined;
                // Try to parse as comma-separated values first
                if (str.includes(",")) {
                    return str
                        .split(",")
                        .map((v) => v.trim())
                        .filter((v) => v.length > 0);
                }
                // Try to parse as space-separated values (for tags)
                if (str.includes(" ")) {
                    return str
                        .split(/\s+/)
                        .map((v) => v.trim())
                        .filter((v) => v.length > 0);
                }
                // Single value
                return [str];
            }
            return undefined;
        }
        catch (_a) {
            return undefined;
        }
    }
    formatDateForProperty(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }
    /**
     * Extract time components from task content using enhanced time parsing
     */
    extractTimeComponents(content) {
        if (!this.timeParsingService) {
            return {};
        }
        try {
            // Parse time components from content
            const { timeComponents, errors, warnings } = this.timeParsingService.parseTimeComponents(content);
            // Log warnings if any
            if (warnings.length > 0) {
                console.warn(`[FileTaskManager] Time parsing warnings for "${content}":`, warnings);
            }
            // Log errors if any (but don't fail)
            if (errors.length > 0) {
                console.warn(`[FileTaskManager] Time parsing errors for "${content}":`, errors);
            }
            // Return enhanced metadata with time components
            const enhancedMetadata = {};
            if (Object.keys(timeComponents).length > 0) {
                enhancedMetadata.timeComponents = timeComponents;
            }
            return enhancedMetadata;
        }
        catch (error) {
            console.error(`[FileTaskManager] Failed to extract time components from "${content}":`, error);
            return {};
        }
    }
    /**
     * Combine date timestamps with time components to create enhanced datetime objects
     */
    combineTimestampsWithTimeComponents(dates, timeComponents) {
        var _a, _b, _c, _d, _e;
        if (!timeComponents) {
            return undefined;
        }
        const enhancedDates = {};
        // Helper function to combine date and time component
        const combineDateTime = (dateTimestamp, timeComponent) => {
            if (!dateTimestamp || !timeComponent) {
                return undefined;
            }
            const date = new Date(dateTimestamp);
            const combinedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), timeComponent.hour, timeComponent.minute, timeComponent.second || 0);
            return combinedDate;
        };
        // Combine start date with start time
        if (dates.startDate && timeComponents.startTime) {
            enhancedDates.startDateTime = combineDateTime(dates.startDate, timeComponents.startTime);
        }
        // Fallback for start datetime when explicit start date is missing
        if (!enhancedDates.startDateTime &&
            timeComponents.startTime) {
            const fallbackDate = (_b = (_a = dates.dueDate) !== null && _a !== void 0 ? _a : dates.scheduledDate) !== null && _b !== void 0 ? _b : dates.completedDate;
            if (fallbackDate) {
                enhancedDates.startDateTime = combineDateTime(fallbackDate, timeComponents.startTime);
            }
        }
        // Combine due date with due time
        if (dates.dueDate && timeComponents.dueTime) {
            enhancedDates.dueDateTime = combineDateTime(dates.dueDate, timeComponents.dueTime);
        }
        // Combine scheduled date with scheduled time
        if (dates.scheduledDate && timeComponents.scheduledTime) {
            enhancedDates.scheduledDateTime = combineDateTime(dates.scheduledDate, timeComponents.scheduledTime);
        }
        // If we have a due date but the time component is scheduledTime (common with "at" keyword),
        // create dueDateTime using scheduledTime
        if (dates.dueDate && !timeComponents.dueTime && timeComponents.scheduledTime) {
            enhancedDates.dueDateTime = combineDateTime(dates.dueDate, timeComponents.scheduledTime);
        }
        // If we have a scheduled date but the time component is dueTime,
        // create scheduledDateTime using dueTime
        if (dates.scheduledDate && !timeComponents.scheduledTime && timeComponents.dueTime) {
            enhancedDates.scheduledDateTime = combineDateTime(dates.scheduledDate, timeComponents.dueTime);
        }
        // Handle end time - if we have start date and end time, create end datetime
        if (timeComponents.endTime) {
            const endBaseDate = (_e = (_d = (_c = dates.startDate) !== null && _c !== void 0 ? _c : dates.dueDate) !== null && _d !== void 0 ? _d : dates.scheduledDate) !== null && _e !== void 0 ? _e : dates.completedDate;
            if (endBaseDate) {
                enhancedDates.endDateTime = combineDateTime(endBaseDate, timeComponents.endTime);
            }
        }
        return Object.keys(enhancedDates).length > 0 ? enhancedDates : undefined;
    }
    /**
     * Validate and log property mapping effectiveness
     */
    validatePropertyMapping(entries, mapping = DEFAULT_FILE_TASK_MAPPING) {
        if (entries.length === 0)
            return;
        const propertyUsage = {};
        const availableProperties = new Set();
        // Analyze property usage across all entries
        entries.forEach((entry) => {
            const properties = entry.properties || {};
            Object.keys(properties).forEach((prop) => {
                availableProperties.add(prop);
            });
            // Check which mapping properties are actually found
            Object.entries(mapping).forEach(([key, propName]) => {
                if (propName && properties[propName] !== undefined) {
                    propertyUsage[propName] =
                        (propertyUsage[propName] || 0) + 1;
                }
            });
        });
        // Warn about unused mappings
        Object.entries(mapping).forEach(([key, propName]) => {
            if (propName && !propertyUsage[propName]) {
                console.warn(`[FileTaskManager] Property "${propName}" (${key}) not found in any entries`);
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS10YXNrLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWxlLXRhc2stbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0dBR0c7O0FBd0RILGlGQUFpRjtBQUNqRixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBNEI7SUFDakUsZUFBZSxFQUFFLE9BQU87SUFDeEIsY0FBYyxFQUFFLFFBQVE7SUFDeEIsaUJBQWlCLEVBQUUsV0FBVztJQUM5QixtQkFBbUIsRUFBRSxhQUFhO0lBQ2xDLGlCQUFpQixFQUFFLFdBQVc7SUFDOUIscUJBQXFCLEVBQUUsZUFBZTtJQUN0QyxlQUFlLEVBQUUsU0FBUztJQUMxQixxQkFBcUIsRUFBRSxnQkFBZ0I7SUFDdkMsa0JBQWtCLEVBQUUsUUFBUTtJQUM1QixZQUFZLEVBQUUsTUFBTTtJQUNwQixlQUFlLEVBQUUsU0FBUztJQUMxQixlQUFlLEVBQUUsU0FBUztJQUMxQixnQkFBZ0IsRUFBRSxVQUFVO0lBQzVCLHFCQUFxQixFQUFFLGVBQWU7SUFDdEMsa0JBQWtCLEVBQUUsWUFBWTtDQUNoQyxDQUFDO0FBRUYsTUFBTSxPQUFPLG1CQUFtQjtJQUcvQixZQUNTLEdBQVEsRUFDUixnQkFBMEMsRUFDbEQsa0JBQXVDO1FBRi9CLFFBQUcsR0FBSCxHQUFHLENBQUs7UUFDUixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQTBCO1FBR2xELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztJQUM5QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxlQUFlLENBQ2QsS0FBaUIsRUFDakIsVUFBbUMseUJBQXlCO1FBRTVELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDO1FBRTFDLHdDQUF3QztRQUN4QyxNQUFNLEVBQUUsR0FBRyxhQUFhLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFMUMsc0VBQXNFO1FBQ3RFLElBQUksSUFBSSxD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QUFvRDtZQUNwRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUU7Z0JBQ25ELElBQUksUUFBUSxJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsS0FBSyxTQUFTLEVBQUU7b0JBQ25ELGFBQWEsQ0FBQyxRQUFRLENBQUM7d0JBQ3RCLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztpQkFDcEM7WUFDRixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLEVBQUUsRUFBRTtZQUNuRCxJQUFJLFFBQVEsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsRUFBRTtnQkFDekMsT0FBTyxDQUFDLElBQUksQ0FDWCwrQkFBK0IsUUFBUSxNQUFNLEdBQUcsNEJBQTRCLENBQzVFLENBQUM7YUFDRjtRQUNGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEZpbGUgVGFzayBNYW5hZ2VyIEltcGxlbWVudGF0aW9uXHJcbiAqIE1hbmFnZXMgdGFza3MgYXQgdGhlIGZpbGUgbGV2ZWwgdXNpbmcgQmFzZXMgcGx1Z2luIGRhdGFcclxuICovXHJcblxyXG5pbXBvcnQgeyBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFzaywgRW5oYW5jZWRTdGFuZGFyZFRhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7XHJcblx0RmlsZVRhc2ssXHJcblx0RmlsZVRhc2tNYW5hZ2VyLFxyXG5cdEZpbGVUYXNrUHJvcGVydHlNYXBwaW5nLFxyXG5cdEZpbGVUYXNrVmlld0NvbmZpZyxcclxufSBmcm9tIFwiLi4vdHlwZXMvZmlsZS10YXNrXCI7XHJcbmltcG9ydCB7IFRGaWxlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEZpbGVTb3VyY2VDb25maWd1cmF0aW9uIH0gZnJvbSBcIi4uL3R5cGVzL2ZpbGUtc291cmNlXCI7XHJcbmltcG9ydCB7IFRpbWVQYXJzaW5nU2VydmljZSB9IGZyb20gXCIuLi9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5pbXBvcnQgeyBUaW1lQ29tcG9uZW50LCBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcblxyXG4vLyBCYXNlc0VudHJ5IGludGVyZmFjZSAoY29waWVkIGZyb20gdHlwZXMgdG8gYXZvaWQgaW1wb3J0IGlzc3VlcylcclxuaW50ZXJmYWNlIEJhc2VzRW50cnkge1xyXG5cdGN0eDoge1xyXG5cdFx0X2xvY2FsOiBhbnk7XHJcblx0XHRhcHA6IEFwcDtcclxuXHRcdGZpbHRlcjogYW55O1xyXG5cdFx0Zm9ybXVsYXM6IGFueTtcclxuXHRcdGxvY2FsVXNlZDogYm9vbGVhbjtcclxuXHR9O1xyXG5cdGZpbGU6IHtcclxuXHRcdHBhcmVudDogYW55O1xyXG5cdFx0ZGVsZXRlZDogYm9vbGVhbjtcclxuXHRcdHZhdWx0OiBhbnk7XHJcblx0XHRwYXRoOiBzdHJpbmc7XHJcblx0XHRuYW1lOiBzdHJpbmc7XHJcblx0XHRleHRlbnNpb246IHN0cmluZztcclxuXHRcdGdldFNob3J0TmFtZSgpOiBzdHJpbmc7XHJcblx0fTtcclxuXHRmb3JtdWxhczogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHRpbXBsaWNpdDoge1xyXG5cdFx0ZmlsZTogYW55O1xyXG5cdFx0bmFtZTogc3RyaW5nO1xyXG5cdFx0cGF0aDogc3RyaW5nO1xyXG5cdFx0Zm9sZGVyOiBzdHJpbmc7XHJcblx0XHRleHQ6IHN0cmluZztcclxuXHR9O1xyXG5cdGxhenlFdmFsQ2FjaGU6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblx0cHJvcGVydGllczogUmVjb3JkPHN0cmluZywgYW55PjtcclxuXHJcblx0Z2V0VmFsdWUocHJvcDoge1xyXG5cdFx0dHlwZTogXCJwcm9wZXJ0eVwiIHwgXCJmaWxlXCIgfCBcImZvcm11bGFcIjtcclxuXHRcdG5hbWU6IHN0cmluZztcclxuXHR9KTogYW55O1xyXG5cclxuXHR1cGRhdGVQcm9wZXJ0eShrZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IHZvaWQ7XHJcblxyXG5cdGdldEZvcm11bGFWYWx1ZShmb3JtdWxhOiBzdHJpbmcpOiBhbnk7XHJcblxyXG5cdGdldFByb3BlcnR5S2V5cygpOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqIERlZmF1bHQgcHJvcGVydHkgbWFwcGluZyBmb3IgZmlsZS1sZXZlbCB0YXNrcyB1c2luZyBkYXRhdmlldyBzdGFuZGFyZCBrZXlzICovXHJcbmV4cG9ydCBjb25zdCBERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HOiBGaWxlVGFza1Byb3BlcnR5TWFwcGluZyA9IHtcclxuXHRjb250ZW50UHJvcGVydHk6IFwidGl0bGVcIixcclxuXHRzdGF0dXNQcm9wZXJ0eTogXCJzdGF0dXNcIixcclxuXHRjb21wbGV0ZWRQcm9wZXJ0eTogXCJjb21wbGV0ZWRcIixcclxuXHRjcmVhdGVkRGF0ZVByb3BlcnR5OiBcImNyZWF0ZWREYXRlXCIsIC8vIGRhdGF2aWV3IHN0YW5kYXJkOiBjcmVhdGVkXHJcblx0c3RhcnREYXRlUHJvcGVydHk6IFwic3RhcnREYXRlXCIsIC8vIGRhdGF2aWV3IHN0YW5kYXJkOiBzdGFydFxyXG5cdHNjaGVkdWxlZERhdGVQcm9wZXJ0eTogXCJzY2hlZHVsZWREYXRlXCIsIC8vIGRhdGF2aWV3IHN0YW5kYXJkOiBzY2hlZHVsZWRcclxuXHRkdWVEYXRlUHJvcGVydHk6IFwiZHVlRGF0ZVwiLCAvLyBkYXRhdmlldyBzdGFuZGFyZDogZHVlXHJcblx0Y29tcGxldGVkRGF0ZVByb3BlcnR5OiBcImNvbXBsZXRpb25EYXRlXCIsIC8vIGRhdGF2aWV3IHN0YW5kYXJkOiBjb21wbGV0aW9uXHJcblx0cmVjdXJyZW5jZVByb3BlcnR5OiBcInJlcGVhdFwiLCAvLyBkYXRhdmlldyBzdGFuZGFyZDogcmVwZWF0XHJcblx0dGFnc1Byb3BlcnR5OiBcInRhZ3NcIixcclxuXHRwcm9qZWN0UHJvcGVydHk6IFwicHJvamVjdFwiLFxyXG5cdGNvbnRleHRQcm9wZXJ0eTogXCJjb250ZXh0XCIsXHJcblx0cHJpb3JpdHlQcm9wZXJ0eTogXCJwcmlvcml0eVwiLFxyXG5cdGVzdGltYXRlZFRpbWVQcm9wZXJ0eTogXCJlc3RpbWF0ZWRUaW1lXCIsXHJcblx0YWN0dWFsVGltZVByb3BlcnR5OiBcImFjdHVhbFRpbWVcIixcclxufTtcclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlVGFza01hbmFnZXJJbXBsIGltcGxlbWVudHMgRmlsZVRhc2tNYW5hZ2VyIHtcclxuXHRwcml2YXRlIHRpbWVQYXJzaW5nU2VydmljZT86IFRpbWVQYXJzaW5nU2VydmljZTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRwcml2YXRlIGFwcDogQXBwLFxyXG5cdFx0cHJpdmF0ZSBmaWxlU291cmNlQ29uZmlnPzogRmlsZVNvdXJjZUNvbmZpZ3VyYXRpb24sXHJcblx0XHR0aW1lUGFyc2luZ1NlcnZpY2U/OiBUaW1lUGFyc2luZ1NlcnZpY2VcclxuXHQpIHtcclxuXHRcdHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlID0gdGltZVBhcnNpbmdTZXJ2aWNlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ29udmVydCBhIEJhc2VzRW50cnkgdG8gYSBGaWxlVGFza1xyXG5cdCAqL1xyXG5cdGVudHJ5VG9GaWxlVGFzayhcclxuXHRcdGVudHJ5OiBCYXNlc0VudHJ5LFxyXG5cdFx0bWFwcGluZzogRmlsZVRhc2tQcm9wZXJ0eU1hcHBpbmcgPSBERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HXHJcblx0KTogRmlsZVRhc2sge1xyXG5cdFx0Y29uc3QgcHJvcGVydGllcyA9IGVudHJ5LnByb3BlcnRpZXMgfHwge307XHJcblxyXG5cdFx0Ly8gR2VuZXJhdGUgdW5pcXVlIElEIGJhc2VkIG9uIGZpbGUgcGF0aFxyXG5cdFx0Y29uc3QgaWQgPSBgZmlsZS10YXNrLSR7ZW50cnkuZmlsZS5wYXRofWA7XHJcblxyXG5cdFx0Ly8gTG9nIGF2YWlsYWJsZSBwcm9wZXJ0aWVzIGZvciBkZWJ1Z2dpbmcgKG9ubHkgZm9yIGZpcnN0IGZldyBlbnRyaWVzKVxyXG5cdFx0aWYgKE1hdGgucmFuZG9tKCkgPCAwLjEpIHtcclxuXHRcdFx0Ly8gTG9nIDEwJSBvZiBlbnRyaWVzIHRvIGF2b2lkIHNwYW1cclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFtGaWxlVGFza01hbmFnZXJdIEF2YWlsYWJsZSBwcm9wZXJ0aWVzIGZvciAke2VudHJ5LmZpbGUubmFtZX06YCxcclxuXHRcdFx0XHRPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEV4dHJhY3QgY29udGVudCBmcm9tIHRoZSBzcGVjaWZpZWQgcHJvcGVydHkgb3IgdXNlIGZpbGUgbmFtZSB3aXRob3V0IGV4dGVuc2lvblxyXG5cdFx0bGV0IGNvbnRlbnQgPSB0aGlzLmdldFByb3BlcnR5VmFsdWUoZW50cnksIG1hcHBpbmcuY29udGVudFByb3BlcnR5KTtcclxuXHRcdGlmICghY29udGVudCkge1xyXG5cdFx0XHQvLyBVc2UgZmlsZSBuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uIGFzIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgZmlsZU5hbWUgPSBlbnRyeS5maWxlLm5hbWU7XHJcblx0XHRcdGNvbnN0IGxhc3REb3RJbmRleCA9IGZpbGVOYW1lLmxhc3RJbmRleE9mKFwiLlwiKTtcclxuXHRcdFx0Y29udGVudCA9XHJcblx0XHRcdFx0bGFzdERvdEluZGV4ID4gMFxyXG5cdFx0XHRcdFx0PyBmaWxlTmFtZS5zdWJzdHJpbmcoMCwgbGFzdERvdEluZGV4KVxyXG5cdFx0XHRcdFx0OiBmaWxlTmFtZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBFeHRyYWN0IHN0YXR1c1xyXG5cdFx0Y29uc3Qgc3RhdHVzID1cclxuXHRcdFx0dGhpcy5nZXRQcm9wZXJ0eVZhbHVlKGVudHJ5LCBtYXBwaW5nLnN0YXR1c1Byb3BlcnR5KSB8fCBcIiBcIjtcclxuXHJcblx0XHQvLyBFeHRyYWN0IGNvbXBsZXRpb24gc3RhdGVcclxuXHRcdGNvbnN0IGNvbXBsZXRlZCA9XHJcblx0XHRcdHRoaXMuZ2V0Qm9vbGVhblByb3BlcnR5VmFsdWUoZW50cnksIG1hcHBpbmcuY29tcGxldGVkUHJvcGVydHkpIHx8XHJcblx0XHRcdGZhbHNlO1xyXG5cclxuXHRcdC8vIEV4dHJhY3QgZGF0ZXNcclxuXHRcdGNvbnN0IGNyZWF0ZWREYXRlID0gdGhpcy5nZXREYXRlUHJvcGVydHlWYWx1ZShcclxuXHRcdFx0ZW50cnksXHJcblx0XHRcdG1hcHBpbmcuY3JlYXRlZERhdGVQcm9wZXJ0eVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IHN0YXJ0RGF0ZSA9IHRoaXMuZ2V0RGF0ZVByb3BlcnR5VmFsdWUoXHJcblx0XHRcdGVudHJ5LFxyXG5cdFx0XHRtYXBwaW5nLnN0YXJ0RGF0ZVByb3BlcnR5XHJcblx0XHQpO1xyXG5cdFx0Y29uc3Qgc2NoZWR1bGVkRGF0ZSA9IHRoaXMuZ2V0RGF0ZVByb3BlcnR5VmFsdWUoXHJcblx0XHRcdGVudHJ5LFxyXG5cdFx0XHRtYXBwaW5nLnNjaGVkdWxlZERhdGVQcm9wZXJ0eVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGR1ZURhdGUgPSB0aGlzLmdldERhdGVQcm9wZXJ0eVZhbHVlKFxyXG5cdFx0XHRlbnRyeSxcclxuXHRcdFx0bWFwcGluZy5kdWVEYXRlUHJvcGVydHlcclxuXHRcdCk7XHJcblx0XHRjb25zdCBjb21wbGV0ZWREYXRlID0gdGhpcy5nZXREYXRlUHJvcGVydHlWYWx1ZShcclxuXHRcdFx0ZW50cnksXHJcblx0XHRcdG1hcHBpbmcuY29tcGxldGVkRGF0ZVByb3BlcnR5XHJcblx0XHQpO1xyXG5cclxuXHRcdC8vIEV4dHJhY3Qgb3RoZXIgcHJvcGVydGllc1xyXG5cdFx0Y29uc3QgcmVjdXJyZW5jZSA9IHRoaXMuZ2V0UHJvcGVydHlWYWx1ZShcclxuXHRcdFx0ZW50cnksXHJcblx0XHRcdG1hcHBpbmcucmVjdXJyZW5jZVByb3BlcnR5XHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgdGFncyA9XHJcblx0XHRcdHRoaXMuZ2V0QXJyYXlQcm9wZXJ0eVZhbHVlKGVudHJ5LCBtYXBwaW5nLnRhZ3NQcm9wZXJ0eSkgfHwgW107XHJcblx0XHRjb25zdCBwcm9qZWN0ID0gdGhpcy5nZXRQcm9wZXJ0eVZhbHVlKGVudHJ5LCBtYXBwaW5nLnByb2plY3RQcm9wZXJ0eSk7XHJcblx0XHRjb25zdCBjb250ZXh0ID0gdGhpcy5nZXRQcm9wZXJ0eVZhbHVlKGVudHJ5LCBtYXBwaW5nLmNvbnRleHRQcm9wZXJ0eSk7XHJcblx0XHRjb25zdCBwcmlvcml0eSA9IHRoaXMuZ2V0TnVtYmVyUHJvcGVydHlWYWx1ZShcclxuXHRcdFx0ZW50cnksXHJcblx0XHRcdG1hcHBpbmcucHJpb3JpdHlQcm9wZXJ0eVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGVzdGltYXRlZFRpbWUgPSB0aGlzLmdldE51bWJlclByb3BlcnR5VmFsdWUoXHJcblx0XHRcdGVudHJ5LFxyXG5cdFx0XHRtYXBwaW5nLmVzdGltYXRlZFRpbWVQcm9wZXJ0eVxyXG5cdFx0KTtcclxuXHRcdGNvbnN0IGFjdHVhbFRpbWUgPSB0aGlzLmdldE51bWJlclByb3BlcnR5VmFsdWUoXHJcblx0XHRcdGVudHJ5LFxyXG5cdFx0XHRtYXBwaW5nLmFjdHVhbFRpbWVQcm9wZXJ0eVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBFeHRyYWN0IHRpbWUgY29tcG9uZW50cyBmcm9tIGNvbnRlbnQgdXNpbmcgZW5oYW5jZWQgdGltZSBwYXJzaW5nXHJcblx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhID0gdGhpcy5leHRyYWN0VGltZUNvbXBvbmVudHMoY29udGVudCk7XHJcblxyXG5cdFx0Ly8gQ29tYmluZSBkYXRlcyB3aXRoIHRpbWUgY29tcG9uZW50cyB0byBjcmVhdGUgZW5oYW5jZWQgZGF0ZXRpbWUgb2JqZWN0c1xyXG5cdFx0Y29uc3QgZW5oYW5jZWREYXRlcyA9IHRoaXMuY29tYmluZVRpbWVzdGFtcHNXaXRoVGltZUNvbXBvbmVudHMoXHJcblx0XHRcdHtzdGFydERhdGUsIGR1ZURhdGUsIHNjaGVkdWxlZERhdGUsIGNvbXBsZXRlZERhdGV9LFxyXG5cdFx0XHRlbmhhbmNlZE1ldGFkYXRhLnRpbWVDb21wb25lbnRzXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGZpbGVUYXNrOiBGaWxlVGFzayA9IHtcclxuXHRcdFx0aWQsXHJcblx0XHRcdGNvbnRlbnQsXHJcblx0XHRcdGZpbGVQYXRoOiBlbnRyeS5maWxlLnBhdGgsXHJcblx0XHRcdGNvbXBsZXRlZCxcclxuXHRcdFx0c3RhdHVzLFxyXG5cdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdHRhZ3M6IHRhZ3MgfHwgW10sXHJcblx0XHRcdFx0Y2hpbGRyZW46IFtdLCAvLyBGaWxlIHRhc2tzIGRvbid0IGhhdmUgY2hpbGRyZW4gYnkgZGVmYXVsdFxyXG5cclxuXHRcdFx0XHQvLyBPcHRpb25hbCBwcm9wZXJ0aWVzXHJcblx0XHRcdFx0Li4uKGNyZWF0ZWREYXRlICYmIHtjcmVhdGVkRGF0ZX0pLFxyXG5cdFx0XHRcdC4uLihzdGFydERhdGUgJiYge3N0YXJ0RGF0ZX0pLFxyXG5cdFx0XHRcdC4uLihzY2hlZHVsZWREYXRlICYmIHtzY2hlZHVsZWREYXRlfSksXHJcblx0XHRcdFx0Li4uKGR1ZURhdGUgJiYge2R1ZURhdGV9KSxcclxuXHRcdFx0XHQuLi4oY29tcGxldGVkRGF0ZSAmJiB7Y29tcGxldGVkRGF0ZX0pLFxyXG5cdFx0XHRcdC4uLihyZWN1cnJlbmNlICYmIHtyZWN1cnJlbmNlfSksXHJcblx0XHRcdFx0Li4uKHByb2plY3QgJiYge3Byb2plY3R9KSxcclxuXHRcdFx0XHQuLi4oY29udGV4dCAmJiB7Y29udGV4dH0pLFxyXG5cdFx0XHRcdC4uLihwcmlvcml0eSAmJiB7cHJpb3JpdHl9KSxcclxuXHRcdFx0XHQuLi4oZXN0aW1hdGVkVGltZSAmJiB7ZXN0aW1hdGVkVGltZX0pLFxyXG5cdFx0XHRcdC4uLihhY3R1YWxUaW1lICYmIHthY3R1YWxUaW1lfSksXHJcblxyXG5cdFx0XHRcdC8vIEVuaGFuY2VkIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRcdC4uLmVuaGFuY2VkTWV0YWRhdGEsXHJcblx0XHRcdFx0Li4uKGVuaGFuY2VkRGF0ZXMgJiYge2VuaGFuY2VkRGF0ZXN9KSxcclxuXHRcdFx0fSxcclxuXHRcdFx0c291cmNlRW50cnk6IGVudHJ5LFxyXG5cdFx0XHRpc0ZpbGVUYXNrOiB0cnVlLFxyXG5cdFx0fTtcclxuXHJcblx0XHRyZXR1cm4gZmlsZVRhc2s7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0IGEgRmlsZVRhc2sgYmFjayB0byBwcm9wZXJ0eSB1cGRhdGVzXHJcblx0ICovXHJcblx0ZmlsZVRhc2tUb1Byb3BlcnR5VXBkYXRlcyhcclxuXHRcdHRhc2s6IEZpbGVUYXNrLFxyXG5cdFx0bWFwcGluZzogRmlsZVRhc2tQcm9wZXJ0eU1hcHBpbmcgPSBERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLFxyXG5cdFx0ZXhjbHVkZUNvbnRlbnQ6IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG5cdFx0Y29uc3QgdXBkYXRlczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBjb250ZW50IHByb3BlcnR5IGJhc2VkIG9uIGNvbmZpZ3VyYXRpb25cclxuXHRcdC8vIFNraXAgY29udGVudCBpZiBpdCB3YXMgYWxyZWFkeSBoYW5kbGVkIHNlcGFyYXRlbHkgKGUuZy4sIGluIGhhbmRsZUNvbnRlbnRVcGRhdGUpXHJcblx0XHRpZiAoIWV4Y2x1ZGVDb250ZW50KSB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZmlsZVNvdXJjZUNvbmZpZz8uZmlsZVRhc2tQcm9wZXJ0aWVzO1xyXG5cdFx0XHRpZiAoY29uZmlnPy5jb250ZW50U291cmNlICYmIGNvbmZpZy5jb250ZW50U291cmNlICE9PSAnZmlsZW5hbWUnKSB7XHJcblx0XHRcdFx0Ly8gT25seSB1cGRhdGUgY29udGVudCBwcm9wZXJ0eSBpZiBpdCdzIG5vdCBoYW5kbGVkIGJ5IGZpbGUgcmVuYW1pbmdcclxuXHRcdFx0XHRjb25zdCBzaG91bGRVcGRhdGVQcm9wZXJ0eSA9IHRoaXMuc2hvdWxkVXBkYXRlQ29udGVudFByb3BlcnR5KGNvbmZpZyk7XHJcblx0XHRcdFx0aWYgKHNob3VsZFVwZGF0ZVByb3BlcnR5KSB7XHJcblx0XHRcdFx0XHR1cGRhdGVzW21hcHBpbmcuY29udGVudFByb3BlcnR5XSA9IHRhc2suY29udGVudDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdC8vIE5vdGU6IElmIGNvbnRlbnRTb3VyY2UgaXMgJ2ZpbGVuYW1lJywgY29udGVudCB1cGRhdGVzIGFyZSBoYW5kbGVkIGJ5IGZpbGUgcmVuYW1pbmdcclxuXHJcblx0XHR1cGRhdGVzW21hcHBpbmcuc3RhdHVzUHJvcGVydHldID0gdGFzay5zdGF0dXM7XHJcblx0XHR1cGRhdGVzW21hcHBpbmcuY29tcGxldGVkUHJvcGVydHldID0gdGFzay5jb21wbGV0ZWQ7XHJcblxyXG5cdFx0Ly8gT3B0aW9uYWwgcHJvcGVydGllc1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLmNyZWF0ZWREYXRlICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0bWFwcGluZy5jcmVhdGVkRGF0ZVByb3BlcnR5XHJcblx0XHQpIHtcclxuXHRcdFx0dXBkYXRlc1ttYXBwaW5nLmNyZWF0ZWREYXRlUHJvcGVydHldID0gdGhpcy5mb3JtYXREYXRlRm9yUHJvcGVydHkoXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5jcmVhdGVkRGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKFxyXG5cdFx0XHR0YXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdG1hcHBpbmcuc3RhcnREYXRlUHJvcGVydHlcclxuXHRcdCkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcuc3RhcnREYXRlUHJvcGVydHldID0gdGhpcy5mb3JtYXREYXRlRm9yUHJvcGVydHkoXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5zdGFydERhdGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHRcdGlmIChcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0bWFwcGluZy5zY2hlZHVsZWREYXRlUHJvcGVydHlcclxuXHRcdCkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcuc2NoZWR1bGVkRGF0ZVByb3BlcnR5XSA9IHRoaXMuZm9ybWF0RGF0ZUZvclByb3BlcnR5KFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEuZHVlRGF0ZSAhPT0gdW5kZWZpbmVkICYmIG1hcHBpbmcuZHVlRGF0ZVByb3BlcnR5KSB7XHJcblx0XHRcdHVwZGF0ZXNbbWFwcGluZy5kdWVEYXRlUHJvcGVydHldID0gdGhpcy5mb3JtYXREYXRlRm9yUHJvcGVydHkoXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS5kdWVEYXRlXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblx0XHRpZiAoXHJcblx0XHRcdHRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdG1hcHBpbmcuY29tcGxldGVkRGF0ZVByb3BlcnR5XHJcblx0XHQpIHtcclxuXHRcdFx0dXBkYXRlc1ttYXBwaW5nLmNvbXBsZXRlZERhdGVQcm9wZXJ0eV0gPSB0aGlzLmZvcm1hdERhdGVGb3JQcm9wZXJ0eShcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGVcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHRcdGlmIChcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0bWFwcGluZy5yZWN1cnJlbmNlUHJvcGVydHlcclxuXHRcdCkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcucmVjdXJyZW5jZVByb3BlcnR5XSA9IHRhc2subWV0YWRhdGEucmVjdXJyZW5jZTtcclxuXHRcdH1cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnRhZ3MubGVuZ3RoID4gMCAmJiBtYXBwaW5nLnRhZ3NQcm9wZXJ0eSkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcudGFnc1Byb3BlcnR5XSA9IHRhc2subWV0YWRhdGEudGFncztcclxuXHRcdH1cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnByb2plY3QgIT09IHVuZGVmaW5lZCAmJiBtYXBwaW5nLnByb2plY3RQcm9wZXJ0eSkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcucHJvamVjdFByb3BlcnR5XSA9IHRhc2subWV0YWRhdGEucHJvamVjdDtcclxuXHRcdH1cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLmNvbnRleHQgIT09IHVuZGVmaW5lZCAmJiBtYXBwaW5nLmNvbnRleHRQcm9wZXJ0eSkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcuY29udGV4dFByb3BlcnR5XSA9IHRhc2subWV0YWRhdGEuY29udGV4dDtcclxuXHRcdH1cclxuXHRcdGlmICh0YXNrLm1ldGFkYXRhLnByaW9yaXR5ICE9PSB1bmRlZmluZWQgJiYgbWFwcGluZy5wcmlvcml0eVByb3BlcnR5KSB7XHJcblx0XHRcdHVwZGF0ZXNbbWFwcGluZy5wcmlvcml0eVByb3BlcnR5XSA9IHRhc2subWV0YWRhdGEucHJpb3JpdHk7XHJcblx0XHR9XHJcblx0XHRpZiAoXHJcblx0XHRcdHRhc2subWV0YWRhdGEuZXN0aW1hdGVkVGltZSAhPT0gdW5kZWZpbmVkICYmXHJcblx0XHRcdG1hcHBpbmcuZXN0aW1hdGVkVGltZVByb3BlcnR5XHJcblx0XHQpIHtcclxuXHRcdFx0dXBkYXRlc1ttYXBwaW5nLmVzdGltYXRlZFRpbWVQcm9wZXJ0eV0gPVxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEuZXN0aW1hdGVkVGltZTtcclxuXHRcdH1cclxuXHRcdGlmIChcclxuXHRcdFx0dGFzay5tZXRhZGF0YS5hY3R1YWxUaW1lICE9PSB1bmRlZmluZWQgJiZcclxuXHRcdFx0bWFwcGluZy5hY3R1YWxUaW1lUHJvcGVydHlcclxuXHRcdCkge1xyXG5cdFx0XHR1cGRhdGVzW21hcHBpbmcuYWN0dWFsVGltZVByb3BlcnR5XSA9IHRhc2subWV0YWRhdGEuYWN0dWFsVGltZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdXBkYXRlcztcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIGZpbGUgdGFzayBieSB1cGRhdGluZyBpdHMgcHJvcGVydGllc1xyXG5cdCAqL1xyXG5cdGFzeW5jIHVwZGF0ZUZpbGVUYXNrKFxyXG5cdFx0dGFzazogRmlsZVRhc2ssXHJcblx0XHR1cGRhdGVzOiBQYXJ0aWFsPEZpbGVUYXNrPlxyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Ly8gTWVyZ2UgdXBkYXRlcyBpbnRvIHRoZSB0YXNrXHJcblx0XHRjb25zdCB1cGRhdGVkVGFzayA9IHsuLi50YXNrLCAuLi51cGRhdGVzfTtcclxuXHRcdGxldCBjb250ZW50SGFuZGxlZFNlcGFyYXRlbHkgPSBmYWxzZTtcclxuXHJcblx0XHQvLyBIYW5kbGUgY29udGVudCBjaGFuZ2VzIC0gcmUtZXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgaWYgY29udGVudCBjaGFuZ2VkXHJcblx0XHRpZiAodXBkYXRlcy5jb250ZW50ICYmIHVwZGF0ZXMuY29udGVudCAhPT0gdGFzay5jb250ZW50KSB7XHJcblx0XHRcdGF3YWl0IHRoaXMuaGFuZGxlQ29udGVudFVwZGF0ZSh0YXNrLCB1cGRhdGVzLmNvbnRlbnQpO1xyXG5cdFx0XHRjb250ZW50SGFuZGxlZFNlcGFyYXRlbHkgPSB0cnVlO1xyXG5cclxuXHRcdFx0Ly8gUmUtZXh0cmFjdCB0aW1lIGNvbXBvbmVudHMgZnJvbSB1cGRhdGVkIGNvbnRlbnRcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRNZXRhZGF0YSA9IHRoaXMuZXh0cmFjdFRpbWVDb21wb25lbnRzKHVwZGF0ZXMuY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHRhc2sncyBtZXRhZGF0YSB3aXRoIG5ldyB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0aWYgKGVuaGFuY2VkTWV0YWRhdGEudGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YSA9IHtcclxuXHRcdFx0XHRcdC4uLnVwZGF0ZWRUYXNrLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudHM6IGVuaGFuY2VkTWV0YWRhdGEudGltZUNvbXBvbmVudHMsXHJcblx0XHRcdFx0fTtcclxuXHJcblx0XHRcdFx0Ly8gUmVjb21iaW5lIGRhdGVzIHdpdGggbmV3IHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRcdGNvbnN0IGVuaGFuY2VkRGF0ZXMgPSB0aGlzLmNvbWJpbmVUaW1lc3RhbXBzV2l0aFRpbWVDb21wb25lbnRzKFxyXG5cdFx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0XHRzdGFydERhdGU6IHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnN0YXJ0RGF0ZSxcclxuXHRcdFx0XHRcdFx0ZHVlRGF0ZTogdXBkYXRlZFRhc2subWV0YWRhdGEuZHVlRGF0ZSxcclxuXHRcdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogdXBkYXRlZFRhc2subWV0YWRhdGEuc2NoZWR1bGVkRGF0ZSxcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogdXBkYXRlZFRhc2subWV0YWRhdGEuY29tcGxldGVkRGF0ZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhLnRpbWVDb21wb25lbnRzXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKGVuaGFuY2VkRGF0ZXMpIHtcclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMgPSBlbmhhbmNlZERhdGVzO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVXBkYXRlIHRoZSBvcmlnaW5hbCB0YXNrIG9iamVjdCB3aXRoIHRoZSBuZXcgbWV0YWRhdGFcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhID0gdXBkYXRlZFRhc2subWV0YWRhdGE7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb252ZXJ0IHRvIHByb3BlcnR5IHVwZGF0ZXMgKGV4Y2x1ZGluZyBjb250ZW50IGlmIGl0IHdhcyBoYW5kbGVkIHNlcGFyYXRlbHkpXHJcblx0XHRjb25zdCBwcm9wZXJ0eVVwZGF0ZXMgPSB0aGlzLmZpbGVUYXNrVG9Qcm9wZXJ0eVVwZGF0ZXMoXHJcblx0XHRcdHVwZGF0ZWRUYXNrLFxyXG5cdFx0XHRERUZBVUxUX0ZJTEVfVEFTS19NQVBQSU5HLFxyXG5cdFx0XHRjb250ZW50SGFuZGxlZFNlcGFyYXRlbHlcclxuXHRcdCk7XHJcblxyXG5cdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdGBbRmlsZVRhc2tNYW5hZ2VyXSBVcGRhdGluZyBmaWxlIHRhc2sgJHt0YXNrLmNvbnRlbnR9IHdpdGggcHJvcGVydGllczpgLFxyXG5cdFx0XHRwcm9wZXJ0eVVwZGF0ZXNcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHByb3BlcnRpZXMgdGhyb3VnaCB0aGUgc291cmNlIGVudHJ5XHJcblx0XHRmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhwcm9wZXJ0eVVwZGF0ZXMpKSB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0Ly8gTm90ZTogdXBkYXRlUHJvcGVydHkgbWlnaHQgYmUgYXN5bmMsIHNvIHdlIGF3YWl0IGl0XHJcblx0XHRcdFx0aWYgKHR5cGVvZiB0YXNrLnNvdXJjZUVudHJ5LnVwZGF0ZVByb3BlcnR5ID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0XHRhd2FpdCBQcm9taXNlLnJlc29sdmUodGFzay5zb3VyY2VFbnRyeS51cGRhdGVQcm9wZXJ0eShrZXksIHZhbHVlKSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoYHVwZGF0ZVByb3BlcnR5IG1ldGhvZCBub3QgYXZhaWxhYmxlIG9uIHNvdXJjZSBlbnRyeSBmb3Iga2V5OiAke2tleX1gKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSBwcm9wZXJ0eSAke2tleX06YCwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZXRlcm1pbmUgaWYgY29udGVudCBzaG91bGQgYmUgdXBkYXRlZCB2aWEgcHJvcGVydHkgdXBkYXRlIHZzIGZpbGUgb3BlcmF0aW9uc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2hvdWxkVXBkYXRlQ29udGVudFByb3BlcnR5KGNvbmZpZzogYW55KTogYm9vbGVhbiB7XHJcblx0XHRzd2l0Y2ggKGNvbmZpZy5jb250ZW50U291cmNlKSB7XHJcblx0XHRcdGNhc2UgJ3RpdGxlJzpcclxuXHRcdFx0XHQvLyBPbmx5IHVwZGF0ZSBwcm9wZXJ0eSBpZiBwcmVmZXJGcm9udG1hdHRlclRpdGxlIGlzIGVuYWJsZWRcclxuXHRcdFx0XHRyZXR1cm4gY29uZmlnLnByZWZlckZyb250bWF0dGVyVGl0bGUgPT09IHRydWU7XHJcblx0XHRcdGNhc2UgJ2gxJzpcclxuXHRcdFx0XHQvLyBIMSB1cGRhdGVzIGFyZSBoYW5kbGVkIGJ5IGZpbGUgY29udGVudCBtb2RpZmljYXRpb24sIG5vdCBwcm9wZXJ0eSB1cGRhdGVzXHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRjYXNlICdjdXN0b20nOlxyXG5cdFx0XHRcdC8vIEN1c3RvbSBmaWVsZHMgYXJlIGFsd2F5cyB1cGRhdGVkIHZpYSBwcm9wZXJ0aWVzXHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdGNhc2UgJ2ZpbGVuYW1lJzpcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHQvLyBGaWxlbmFtZSB1cGRhdGVzIGFyZSBoYW5kbGVkIGJ5IGZpbGUgcmVuYW1pbmdcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBIYW5kbGUgY29udGVudCB1cGRhdGUgLSB1cGRhdGUgZnJvbnRtYXR0ZXIgcHJvcGVydHksIHJlbmFtZSBmaWxlLCBvciB1cGRhdGUgY3VzdG9tIGZpZWxkXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyBoYW5kbGVDb250ZW50VXBkYXRlKFxyXG5cdFx0dGFzazogRmlsZVRhc2ssXHJcblx0XHRuZXdDb250ZW50OiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGNvbnN0IGNvbmZpZyA9IHRoaXMuZmlsZVNvdXJjZUNvbmZpZz8uZmlsZVRhc2tQcm9wZXJ0aWVzO1xyXG5cclxuXHRcdGlmICghY29uZmlnKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybignW0ZpbGVUYXNrTWFuYWdlcl0gTm8gZmlsZSBzb3VyY2UgY29uZmlnIGF2YWlsYWJsZSwgc2tpcHBpbmcgY29udGVudCB1cGRhdGUnKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdHN3aXRjaCAoY29uZmlnLmNvbnRlbnRTb3VyY2UpIHtcclxuXHRcdFx0Y2FzZSAndGl0bGUnOlxyXG5cdFx0XHRcdGlmIChjb25maWcucHJlZmVyRnJvbnRtYXR0ZXJUaXRsZSkge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVGcm9udG1hdHRlclRpdGxlKHRhc2ssIG5ld0NvbnRlbnQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRhd2FpdCB0aGlzLnVwZGF0ZUZpbGVOYW1lKHRhc2ssIG5ld0NvbnRlbnQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRicmVhaztcclxuXHJcblx0XHRcdGNhc2UgJ2gxJzpcclxuXHRcdFx0XHQvLyBGb3IgSDEgY29udGVudCBzb3VyY2UsIHdlIG5lZWQgdG8gdXBkYXRlIHRoZSBmaXJzdCBoZWFkaW5nIGluIHRoZSBmaWxlXHJcblx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVIMUhlYWRpbmcodGFzaywgbmV3Q29udGVudCk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0XHRjYXNlICdjdXN0b20nOlxyXG5cdFx0XHRcdC8vIEZvciBjdXN0b20gY29udGVudCBzb3VyY2UsIHVwZGF0ZSB0aGUgY3VzdG9tIGZpZWxkIGluIGZyb250bWF0dGVyXHJcblx0XHRcdFx0aWYgKGNvbmZpZy5jdXN0b21Db250ZW50RmllbGQpIHtcclxuXHRcdFx0XHRcdGF3YWl0IHRoaXMudXBkYXRlQ3VzdG9tQ29udGVudEZpZWxkKHRhc2ssIG5ld0NvbnRlbnQsIGNvbmZpZy5jdXN0b21Db250ZW50RmllbGQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLndhcm4oJ1tGaWxlVGFza01hbmFnZXJdIEN1c3RvbSBjb250ZW50IHNvdXJjZSBzcGVjaWZpZWQgYnV0IG5vIGN1c3RvbUNvbnRlbnRGaWVsZCBjb25maWd1cmVkJyk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdFx0Y2FzZSAnZmlsZW5hbWUnOlxyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdC8vIEZvciBmaWxlbmFtZSBjb250ZW50IHNvdXJjZSwgcmVuYW1lIHRoZSBmaWxlXHJcblx0XHRcdFx0YXdhaXQgdGhpcy51cGRhdGVGaWxlTmFtZSh0YXNrLCBuZXdDb250ZW50KTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBmcm9udG1hdHRlciB0aXRsZSBwcm9wZXJ0eVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYXN5bmMgdXBkYXRlRnJvbnRtYXR0ZXJUaXRsZShcclxuXHRcdHRhc2s6IEZpbGVUYXNrLFxyXG5cdFx0bmV3VGl0bGU6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSB0aXRsZSBwcm9wZXJ0eSBpbiBmcm9udG1hdHRlciB0aHJvdWdoIHRoZSBzb3VyY2UgZW50cnlcclxuXHRcdFx0Ly8gTm90ZTogdXBkYXRlUHJvcGVydHkgbWlnaHQgYmUgYXN5bmMsIHNvIHdlIGF3YWl0IGl0XHJcblx0XHRcdGlmICh0eXBlb2YgdGFzay5zb3VyY2VFbnRyeS51cGRhdGVQcm9wZXJ0eSA9PT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHRcdGF3YWl0IFByb21pc2UucmVzb2x2ZSh0YXNrLnNvdXJjZUVudHJ5LnVwZGF0ZVByb3BlcnR5KCd0aXRsZScsIG5ld1RpdGxlKSk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW0ZpbGVUYXNrTWFuYWdlcl0gVXBkYXRlZCBmcm9udG1hdHRlciB0aXRsZSBmb3IgJHt0YXNrLmZpbGVQYXRofSB0bzogJHtuZXdUaXRsZX1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3VwZGF0ZVByb3BlcnR5IG1ldGhvZCBub3QgYXZhaWxhYmxlIG9uIHNvdXJjZSBlbnRyeScpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBbRmlsZVRhc2tNYW5hZ2VyXSBGYWlsZWQgdG8gdXBkYXRlIGZyb250bWF0dGVyIHRpdGxlOmAsIGVycm9yKTtcclxuXHRcdFx0Ly8gRmFsbGJhY2sgdG8gZmlsZSByZW5hbWluZyBpZiBmcm9udG1hdHRlciB1cGRhdGUgZmFpbHNcclxuXHRcdFx0YXdhaXQgdGhpcy51cGRhdGVGaWxlTmFtZSh0YXNrLCBuZXdUaXRsZSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgSDEgaGVhZGluZyBpbiB0aGUgZmlsZSBjb250ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBhc3luYyB1cGRhdGVIMUhlYWRpbmcoXHJcblx0XHR0YXNrOiBGaWxlVGFzayxcclxuXHRcdG5ld0hlYWRpbmc6IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgodGFzay5maWxlUGF0aCk7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoYFtGaWxlVGFza01hbmFnZXJdIEZpbGUgbm90IGZvdW5kOiAke3Rhc2suZmlsZVBhdGh9YCk7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy5hcHAudmF1bHQucmVhZChmaWxlKTtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KCdcXG4nKTtcclxuXHJcblx0XHRcdC8vIEZpbmQgdGhlIGZpcnN0IEgxIGhlYWRpbmdcclxuXHRcdFx0bGV0IGgxTGluZUluZGV4ID0gLTE7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRpZiAobGluZXNbaV0uc3RhcnRzV2l0aCgnIyAnKSkge1xyXG5cdFx0XHRcdFx0aDFMaW5lSW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoaDFMaW5lSW5kZXggPj0gMCkge1xyXG5cdFx0XHRcdC8vIFVwZGF0ZSBleGlzdGluZyBIMVxyXG5cdFx0XHRcdGxpbmVzW2gxTGluZUluZGV4XSA9IGAjICR7bmV3SGVhZGluZ31gO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEFkZCBuZXcgSDEgYXQgdGhlIGJlZ2lubmluZyAoYWZ0ZXIgZnJvbnRtYXR0ZXIgaWYgcHJlc2VudClcclxuXHRcdFx0XHRsZXQgaW5zZXJ0SW5kZXggPSAwO1xyXG5cdFx0XHRcdGlmIChjb250ZW50LnN0YXJ0c1dpdGgoJy0tLScpKSB7XHJcblx0XHRcdFx0XHQvLyBTa2lwIGZyb250bWF0dGVyXHJcblx0XHRcdFx0XHRjb25zdCBmcm9udG1hdHRlckVuZCA9IGNvbnRlbnQuaW5kZXhPZignXFxuLS0tXFxuJywgMyk7XHJcblx0XHRcdFx0XHRpZiAoZnJvbnRtYXR0ZXJFbmQgPj0gMCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBmcm9udG1hdHRlckxpbmVzID0gY29udGVudC5zdWJzdHJpbmcoMCwgZnJvbnRtYXR0ZXJFbmQgKyA1KS5zcGxpdCgnXFxuJykubGVuZ3RoIC0gMTtcclxuXHRcdFx0XHRcdFx0aW5zZXJ0SW5kZXggPSBmcm9udG1hdHRlckxpbmVzO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRsaW5lcy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIGAjICR7bmV3SGVhZGluZ31gLCAnJyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IG5ld0NvbnRlbnQgPSBsaW5lcy5qb2luKCdcXG4nKTtcclxuXHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIG5ld0NvbnRlbnQpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YFtGaWxlVGFza01hbmFnZXJdIFVwZGF0ZWQgSDEgaGVhZGluZyBmb3IgJHt0YXNrLmZpbGVQYXRofSB0bzogJHtuZXdIZWFkaW5nfWBcclxuXHRcdFx0KTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoYFtGaWxlVGFza01hbmFnZXJdIEZhaWxlZCB0byB1cGRhdGUgSDEgaGVhZGluZzpgLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgY3VzdG9tIGNvbnRlbnQgZmllbGQgaW4gZnJvbnRtYXR0ZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZUN1c3RvbUNvbnRlbnRGaWVsZChcclxuXHRcdHRhc2s6IEZpbGVUYXNrLFxyXG5cdFx0bmV3Q29udGVudDogc3RyaW5nLFxyXG5cdFx0ZmllbGROYW1lOiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgY3VzdG9tIGZpZWxkIGluIGZyb250bWF0dGVyIHRocm91Z2ggdGhlIHNvdXJjZSBlbnRyeVxyXG5cdFx0XHQvLyBOb3RlOiB1cGRhdGVQcm9wZXJ0eSBtaWdodCBiZSBhc3luYywgc28gd2UgYXdhaXQgaXRcclxuXHRcdFx0aWYgKHR5cGVvZiB0YXNrLnNvdXJjZUVudHJ5LnVwZGF0ZVByb3BlcnR5ID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0YXdhaXQgUHJvbWlzZS5yZXNvbHZlKHRhc2suc291cmNlRW50cnkudXBkYXRlUHJvcGVydHkoZmllbGROYW1lLCBuZXdDb250ZW50KSk7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0XHRgW0ZpbGVUYXNrTWFuYWdlcl0gVXBkYXRlZCBjdXN0b20gZmllbGQgJyR7ZmllbGROYW1lfScgZm9yICR7dGFzay5maWxlUGF0aH0gdG86ICR7bmV3Q29udGVudH1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ3VwZGF0ZVByb3BlcnR5IG1ldGhvZCBub3QgYXZhaWxhYmxlIG9uIHNvdXJjZSBlbnRyeScpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBbRmlsZVRhc2tNYW5hZ2VyXSBGYWlsZWQgdG8gdXBkYXRlIGN1c3RvbSBmaWVsZCAnJHtmaWVsZE5hbWV9JzpgLCBlcnJvcik7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgZmlsZSBuYW1lIHdoZW4gdGFzayBjb250ZW50IGNoYW5nZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIHVwZGF0ZUZpbGVOYW1lKFxyXG5cdFx0dGFzazogRmlsZVRhc2ssXHJcblx0XHRuZXdDb250ZW50OiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHRpZiAoZmlsZSkge1xyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRQYXRoID0gdGFzay5maWxlUGF0aDtcclxuXHRcdFx0XHRjb25zdCBsYXN0U2xhc2hJbmRleCA9IGN1cnJlbnRQYXRoLmxhc3RJbmRleE9mKFwiL1wiKTtcclxuXHRcdFx0XHRjb25zdCBkaXJlY3RvcnkgPVxyXG5cdFx0XHRcdFx0bGFzdFNsYXNoSW5kZXggPiAwXHJcblx0XHRcdFx0XHRcdD8gY3VycmVudFBhdGguc3Vic3RyaW5nKDAsIGxhc3RTbGFzaEluZGV4KVxyXG5cdFx0XHRcdFx0XHQ6IFwiXCI7XHJcblx0XHRcdFx0Y29uc3QgZXh0ZW5zaW9uID0gY3VycmVudFBhdGguc3Vic3RyaW5nKFxyXG5cdFx0XHRcdFx0Y3VycmVudFBhdGgubGFzdEluZGV4T2YoXCIuXCIpXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8gRW5zdXJlIG5ld0NvbnRlbnQgZG9lc24ndCBhbHJlYWR5IGhhdmUgdGhlIGV4dGVuc2lvblxyXG5cdFx0XHRcdGxldCBjbGVhbkNvbnRlbnQgPSBuZXdDb250ZW50O1xyXG5cdFx0XHRcdGlmIChjbGVhbkNvbnRlbnQuZW5kc1dpdGgoZXh0ZW5zaW9uKSkge1xyXG5cdFx0XHRcdFx0Y2xlYW5Db250ZW50ID0gY2xlYW5Db250ZW50LnN1YnN0cmluZyhcclxuXHRcdFx0XHRcdFx0MCxcclxuXHRcdFx0XHRcdFx0Y2xlYW5Db250ZW50Lmxlbmd0aCAtIGV4dGVuc2lvbi5sZW5ndGhcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBuZXdQYXRoID0gZGlyZWN0b3J5XHJcblx0XHRcdFx0XHQ/IGAke2RpcmVjdG9yeX0vJHtjbGVhbkNvbnRlbnR9JHtleHRlbnNpb259YFxyXG5cdFx0XHRcdFx0OiBgJHtjbGVhbkNvbnRlbnR9JHtleHRlbnNpb259YDtcclxuXHJcblx0XHRcdFx0Ly8gT25seSByZW5hbWUgaWYgdGhlIG5ldyBwYXRoIGlzIGRpZmZlcmVudFxyXG5cdFx0XHRcdGlmIChuZXdQYXRoICE9PSBjdXJyZW50UGF0aCkge1xyXG5cdFx0XHRcdFx0YXdhaXQgdGhpcy5hcHAuZmlsZU1hbmFnZXIucmVuYW1lRmlsZShmaWxlLCBuZXdQYXRoKTtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgdGFzaydzIGZpbGVQYXRoIHRvIHJlZmxlY3QgdGhlIG5ldyBwYXRoXHJcblx0XHRcdFx0XHR0YXNrLmZpbGVQYXRoID0gbmV3UGF0aDtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0XHRgW0ZpbGVUYXNrTWFuYWdlcl0gUmVuYW1lZCBmaWxlIGZyb20gJHtjdXJyZW50UGF0aH0gdG8gJHtuZXdQYXRofWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKGBbRmlsZVRhc2tNYW5hZ2VyXSBGYWlsZWQgdG8gcmVuYW1lIGZpbGU6YCwgZXJyb3IpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IGFsbCBmaWxlIHRhc2tzIGZyb20gYSBsaXN0IG9mIGVudHJpZXNcclxuXHQgKi9cclxuXHRnZXRGaWxlVGFza3NGcm9tRW50cmllcyhcclxuXHRcdGVudHJpZXM6IEJhc2VzRW50cnlbXSxcclxuXHRcdG1hcHBpbmc6IEZpbGVUYXNrUHJvcGVydHlNYXBwaW5nID0gREVGQVVMVF9GSUxFX1RBU0tfTUFQUElOR1xyXG5cdCk6IEZpbGVUYXNrW10ge1xyXG5cdFx0Ly8gRmlsdGVyIG91dCBub24tbWFya2Rvd24gZmlsZXMgd2l0aCByb2J1c3QgZXh0ZW5zaW9uIGRldGVjdGlvblxyXG5cdFx0Y29uc3QgbWFya2Rvd25FbnRyaWVzID0gZW50cmllcy5maWx0ZXIoKGVudHJ5KSA9PiB7XHJcblx0XHRcdHRyeSB7XHJcblx0XHRcdFx0bGV0IGV4dDogc3RyaW5nIHwgdW5kZWZpbmVkID0gKGVudHJ5IGFzIGFueSk/LmZpbGU/LmV4dGVuc2lvbjtcclxuXHRcdFx0XHRpZiAoIWV4dCB8fCB0eXBlb2YgZXh0ICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHQvLyBUcnkgaW1wbGljaXQuZXh0IGZyb20gQmFzZXNcclxuXHRcdFx0XHRcdGV4dCA9IChlbnRyeSBhcyBhbnkpPy5pbXBsaWNpdD8uZXh0O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIWV4dCB8fCB0eXBlb2YgZXh0ICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHQvLyBEZXJpdmUgZnJvbSBwYXRoXHJcblx0XHRcdFx0XHRjb25zdCBwYXRoOiBzdHJpbmcgfCB1bmRlZmluZWQgPSAoZW50cnkgYXMgYW55KT8uZmlsZT8ucGF0aDtcclxuXHRcdFx0XHRcdGlmIChwYXRoICYmIHBhdGguaW5jbHVkZXMoXCIuXCIpKSB7XHJcblx0XHRcdFx0XHRcdGV4dCA9IHBhdGguc3BsaXQoXCIuXCIpLnBvcCgpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIWV4dCB8fCB0eXBlb2YgZXh0ICE9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0XHQvLyBEZXJpdmUgZnJvbSBmaWxlIG5hbWVcclxuXHRcdFx0XHRcdGNvbnN0IG5hbWU6IHN0cmluZyB8IHVuZGVmaW5lZCA9IChlbnRyeSBhcyBhbnkpPy5maWxlPy5uYW1lO1xyXG5cdFx0XHRcdFx0aWYgKG5hbWUgJiYgbmFtZS5pbmNsdWRlcyhcIi5cIikpIHtcclxuXHRcdFx0XHRcdFx0ZXh0ID0gbmFtZS5zcGxpdChcIi5cIikucG9wKCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdHJldHVybiAoZXh0IHx8IFwiXCIpLnRvTG93ZXJDYXNlKCkgPT09IFwibWRcIjtcclxuXHRcdFx0fSBjYXRjaCB7XHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhcclxuXHRcdFx0YFtGaWxlVGFza01hbmFnZXJdIEZpbHRlcmVkICR7ZW50cmllcy5sZW5ndGh9IGVudHJpZXMgdG8gJHttYXJrZG93bkVudHJpZXMubGVuZ3RofSBtYXJrZG93biBmaWxlc2BcclxuXHRcdCk7XHJcblxyXG5cdFx0cmV0dXJuIG1hcmtkb3duRW50cmllcy5tYXAoKGVudHJ5KSA9PlxyXG5cdFx0XHR0aGlzLmVudHJ5VG9GaWxlVGFzayhlbnRyeSwgbWFwcGluZylcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaWx0ZXIgZmlsZSB0YXNrcyBiYXNlZCBvbiBjcml0ZXJpYVxyXG5cdCAqL1xyXG5cdGZpbHRlckZpbGVUYXNrcyh0YXNrczogRmlsZVRhc2tbXSwgZmlsdGVyczogYW55KTogRmlsZVRhc2tbXSB7XHJcblx0XHQvLyBUaGlzIGlzIGEgc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbiAtIHlvdSBjYW4gZXh0ZW5kIHRoaXMgYmFzZWQgb24geW91ciBmaWx0ZXJpbmcgbmVlZHNcclxuXHRcdHJldHVybiB0YXNrcy5maWx0ZXIoKHRhc2spID0+IHtcclxuXHRcdFx0Ly8gQWRkIHlvdXIgZmlsdGVyaW5nIGxvZ2ljIGhlcmVcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIEhlbHBlciBtZXRob2RzIGZvciBwcm9wZXJ0eSBleHRyYWN0aW9uXHJcblxyXG5cdHByaXZhdGUgZ2V0UHJvcGVydHlWYWx1ZShcclxuXHRcdGVudHJ5OiBCYXNlc0VudHJ5LFxyXG5cdFx0cHJvcGVydHlOYW1lPzogc3RyaW5nXHJcblx0KTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghcHJvcGVydHlOYW1lKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0Ly8gMSkgVHJ5IEJhc2VzIEFQSVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdmFsdWUgPSBlbnRyeS5nZXRWYWx1ZSh7XHJcblx0XHRcdFx0dHlwZTogXCJwcm9wZXJ0eVwiLFxyXG5cdFx0XHRcdG5hbWU6IHByb3BlcnR5TmFtZSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmICh2YWx1ZSAhPT0gbnVsbCAmJiB2YWx1ZSAhPT0gdW5kZWZpbmVkKSByZXR1cm4gU3RyaW5nKHZhbHVlKTtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0fVxyXG5cdFx0Ly8gMikgRmFsbGJhY2s6IGRpcmVjdCBwcm9wZXJ0aWVzL2Zyb250bWF0dGVyL25vdGUuZGF0YVxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgYW55RW50cnk6IGFueSA9IGVudHJ5IGFzIGFueTtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGFueUVudHJ5Py5wcm9wZXJ0aWVzICYmXHJcblx0XHRcdFx0YW55RW50cnkucHJvcGVydGllc1twcm9wZXJ0eU5hbWVdICE9PSB1bmRlZmluZWRcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIFN0cmluZyhhbnlFbnRyeS5wcm9wZXJ0aWVzW3Byb3BlcnR5TmFtZV0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHRhbnlFbnRyeT8uZnJvbnRtYXR0ZXIgJiZcclxuXHRcdFx0XHRhbnlFbnRyeS5mcm9udG1hdHRlcltwcm9wZXJ0eU5hbWVdICE9PSB1bmRlZmluZWRcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIFN0cmluZyhhbnlFbnRyeS5mcm9udG1hdHRlcltwcm9wZXJ0eU5hbWVdKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0YW55RW50cnk/Lm5vdGU/LmRhdGEgJiZcclxuXHRcdFx0XHRhbnlFbnRyeS5ub3RlLmRhdGFbcHJvcGVydHlOYW1lXSAhPT0gdW5kZWZpbmVkXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBTdHJpbmcoYW55RW50cnkubm90ZS5kYXRhW3Byb3BlcnR5TmFtZV0pO1xyXG5cdFx0XHR9XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdH1cclxuXHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEJvb2xlYW5Qcm9wZXJ0eVZhbHVlKFxyXG5cdFx0ZW50cnk6IEJhc2VzRW50cnksXHJcblx0XHRwcm9wZXJ0eU5hbWU/OiBzdHJpbmdcclxuXHQpOiBib29sZWFuIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghcHJvcGVydHlOYW1lKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdmFsdWUgPSBlbnRyeS5nZXRWYWx1ZSh7XHJcblx0XHRcdFx0dHlwZTogXCJwcm9wZXJ0eVwiLFxyXG5cdFx0XHRcdG5hbWU6IHByb3BlcnR5TmFtZSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwiYm9vbGVhblwiKSByZXR1cm4gdmFsdWU7XHJcblx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHRjb25zdCBsb3dlciA9IHZhbHVlLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRcdFx0cmV0dXJuIGxvd2VyID09PSBcInRydWVcIiB8fCBsb3dlciA9PT0gXCJ5ZXNcIiB8fCBsb3dlciA9PT0gXCIxXCI7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIEJvb2xlYW4odmFsdWUpO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldE51bWJlclByb3BlcnR5VmFsdWUoXHJcblx0XHRlbnRyeTogQmFzZXNFbnRyeSxcclxuXHRcdHByb3BlcnR5TmFtZT86IHN0cmluZ1xyXG5cdCk6IG51bWJlciB8IHVuZGVmaW5lZCB7XHJcblx0XHRpZiAoIXByb3BlcnR5TmFtZSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IHZhbHVlID0gZW50cnkuZ2V0VmFsdWUoe1xyXG5cdFx0XHRcdHR5cGU6IFwicHJvcGVydHlcIixcclxuXHRcdFx0XHRuYW1lOiBwcm9wZXJ0eU5hbWUsXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBudW0gPSBOdW1iZXIodmFsdWUpO1xyXG5cdFx0XHRyZXR1cm4gaXNOYU4obnVtKSA/IHVuZGVmaW5lZCA6IG51bTtcclxuXHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBnZXREYXRlUHJvcGVydHlWYWx1ZShcclxuXHRcdGVudHJ5OiBCYXNlc0VudHJ5LFxyXG5cdFx0cHJvcGVydHlOYW1lPzogc3RyaW5nXHJcblx0KTogbnVtYmVyIHwgdW5kZWZpbmVkIHtcclxuXHRcdGlmICghcHJvcGVydHlOYW1lKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZmFsbGJhY2tOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG5cdFx0XHRcdGNyZWF0ZWREYXRlOiBbXCJjcmVhdGVkXCJdLFxyXG5cdFx0XHRcdHN0YXJ0RGF0ZTogW1wic3RhcnRcIl0sXHJcblx0XHRcdFx0c2NoZWR1bGVkRGF0ZTogW1wic2NoZWR1bGVkXCJdLFxyXG5cdFx0XHRcdGR1ZURhdGU6IFtcImR1ZVwiXSxcclxuXHRcdFx0XHRjb21wbGV0ZWREYXRlOiBbXCJjb21wbGV0aW9uXCIsIFwiY29tcGxldGVkXCIsIFwiZG9uZVwiXSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGNhbmRpZGF0ZU5hbWVzID0gW1xyXG5cdFx0XHRcdHByb3BlcnR5TmFtZSxcclxuXHRcdFx0XHQuLi4oZmFsbGJhY2tOYW1lc1twcm9wZXJ0eU5hbWVdIHx8IFtdKSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGxldCB2YWx1ZTogYW55ID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgY2FuZGlkYXRlTmFtZXMpIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0dmFsdWUgPSBlbnRyeS5nZXRWYWx1ZSh7XHJcblx0XHRcdFx0XHRcdHR5cGU6IFwicHJvcGVydHlcIixcclxuXHRcdFx0XHRcdFx0bmFtZSxcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0gY2F0Y2gge1xyXG5cdFx0XHRcdFx0dmFsdWUgPSB1bmRlZmluZWQ7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCkge1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdC8vIEhhbmRsZSB0aW1lc3RhbXAgKG51bWJlcilcclxuXHRcdFx0aWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJudW1iZXJcIikgcmV0dXJuIHZhbHVlO1xyXG5cclxuXHRcdFx0Ly8gSGFuZGxlIGRhdGUgc3RyaW5nXHJcblx0XHRcdGlmICh0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpIHtcclxuXHRcdFx0XHQvLyBTdXBwb3J0IHZhcmlvdXMgZGF0ZSBmb3JtYXRzIGNvbW1vbmx5IHVzZWQgaW4gZGF0YXZpZXdcclxuXHRcdFx0XHRjb25zdCBkYXRlU3RyID0gdmFsdWUudHJpbSgpO1xyXG5cdFx0XHRcdGlmICghZGF0ZVN0cikgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcblx0XHRcdFx0Ly8gVHJ5IHBhcnNpbmcgYXMgSVNPIGRhdGUgZmlyc3QgKFlZWVktTU0tREQpXHJcblx0XHRcdFx0aWYgKC9eXFxkezR9LVxcZHsyfS1cXGR7Mn0kLy50ZXN0KGRhdGVTdHIpKSB7XHJcblx0XHRcdFx0XHQvLyBQYXJzZSBhcyBsb2NhbCBkYXRlIHRvIGF2b2lkIHRpbWV6b25lIGlzc3Vlc1xyXG5cdFx0XHRcdFx0Y29uc3QgW3llYXIsIG1vbnRoLCBkYXldID0gZGF0ZVN0ci5zcGxpdChcIi1cIikubWFwKE51bWJlcik7XHJcblx0XHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoeWVhciwgbW9udGggLSAxLCBkYXkpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIGlzTmFOKGRhdGUuZ2V0VGltZSgpKSA/IHVuZGVmaW5lZCA6IGRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gVHJ5IHBhcnNpbmcgYXMgZ2VuZXJhbCBkYXRlIChidXQgYmUgY2FyZWZ1bCBhYm91dCB0aW1lem9uZSlcclxuXHRcdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoZGF0ZVN0cik7XHJcblx0XHRcdFx0cmV0dXJuIGlzTmFOKGRhdGUuZ2V0VGltZSgpKSA/IHVuZGVmaW5lZCA6IGRhdGUuZ2V0VGltZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgRGF0ZSBvYmplY3RcclxuXHRcdFx0aWYgKHZhbHVlIGluc3RhbmNlb2YgRGF0ZSkge1xyXG5cdFx0XHRcdHJldHVybiBpc05hTih2YWx1ZS5nZXRUaW1lKCkpID8gdW5kZWZpbmVkIDogdmFsdWUuZ2V0VGltZSgpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0fSBjYXRjaCB7XHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGdldEFycmF5UHJvcGVydHlWYWx1ZShcclxuXHRcdGVudHJ5OiBCYXNlc0VudHJ5LFxyXG5cdFx0cHJvcGVydHlOYW1lPzogc3RyaW5nXHJcblx0KTogc3RyaW5nW10gfCB1bmRlZmluZWQge1xyXG5cdFx0aWYgKCFwcm9wZXJ0eU5hbWUpIHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB2YWx1ZSA9IGVudHJ5LmdldFZhbHVlKHtcclxuXHRcdFx0XHR0eXBlOiBcInByb3BlcnR5XCIsXHJcblx0XHRcdFx0bmFtZTogcHJvcGVydHlOYW1lLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0aWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG5cdFx0XHQvLyBIYW5kbGUgYXJyYXkgdmFsdWVzXHJcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KHZhbHVlKSkge1xyXG5cdFx0XHRcdHJldHVybiB2YWx1ZVxyXG5cdFx0XHRcdFx0Lm1hcCgodikgPT4gU3RyaW5nKHYpKVxyXG5cdFx0XHRcdFx0LmZpbHRlcigodikgPT4gdi50cmltKCkubGVuZ3RoID4gMCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEhhbmRsZSBzdHJpbmcgdmFsdWVzIChjb21tYS1zZXBhcmF0ZWQgb3Igc3BhY2Utc2VwYXJhdGVkKVxyXG5cdFx0XHRpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdFx0Y29uc3Qgc3RyID0gdmFsdWUudHJpbSgpO1xyXG5cdFx0XHRcdGlmICghc3RyKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuXHRcdFx0XHQvLyBUcnkgdG8gcGFyc2UgYXMgY29tbWEtc2VwYXJhdGVkIHZhbHVlcyBmaXJzdFxyXG5cdFx0XHRcdGlmIChzdHIuaW5jbHVkZXMoXCIsXCIpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gc3RyXHJcblx0XHRcdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgodikgPT4gdi50cmltKCkpXHJcblx0XHRcdFx0XHRcdC5maWx0ZXIoKHYpID0+IHYubGVuZ3RoID4gMCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBUcnkgdG8gcGFyc2UgYXMgc3BhY2Utc2VwYXJhdGVkIHZhbHVlcyAoZm9yIHRhZ3MpXHJcblx0XHRcdFx0aWYgKHN0ci5pbmNsdWRlcyhcIiBcIikpIHtcclxuXHRcdFx0XHRcdHJldHVybiBzdHJcclxuXHRcdFx0XHRcdFx0LnNwbGl0KC9cXHMrLylcclxuXHRcdFx0XHRcdFx0Lm1hcCgodikgPT4gdi50cmltKCkpXHJcblx0XHRcdFx0XHRcdC5maWx0ZXIoKHYpID0+IHYubGVuZ3RoID4gMCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBTaW5nbGUgdmFsdWVcclxuXHRcdFx0XHRyZXR1cm4gW3N0cl07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZm9ybWF0RGF0ZUZvclByb3BlcnR5KHRpbWVzdGFtcDogbnVtYmVyKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXApO1xyXG5cdFx0Y29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHRcdGNvbnN0IG1vbnRoID0gU3RyaW5nKGRhdGUuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcclxuXHRcdGNvbnN0IGRheSA9IFN0cmluZyhkYXRlLmdldERhdGUoKSkucGFkU3RhcnQoMiwgXCIwXCIpO1xyXG5cdFx0cmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBFeHRyYWN0IHRpbWUgY29tcG9uZW50cyBmcm9tIHRhc2sgY29udGVudCB1c2luZyBlbmhhbmNlZCB0aW1lIHBhcnNpbmdcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RUaW1lQ29tcG9uZW50cyhjb250ZW50OiBzdHJpbmcpOiBQYXJ0aWFsPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+IHtcclxuXHRcdGlmICghdGhpcy50aW1lUGFyc2luZ1NlcnZpY2UpIHtcclxuXHRcdFx0cmV0dXJuIHt9O1xyXG5cdFx0fVxyXG5cclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIFBhcnNlIHRpbWUgY29tcG9uZW50cyBmcm9tIGNvbnRlbnRcclxuXHRcdFx0Y29uc3Qge3RpbWVDb21wb25lbnRzLCBlcnJvcnMsIHdhcm5pbmdzfSA9IHRoaXMudGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUNvbXBvbmVudHMoY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBMb2cgd2FybmluZ3MgaWYgYW55XHJcblx0XHRcdGlmICh3YXJuaW5ncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKGBbRmlsZVRhc2tNYW5hZ2VyXSBUaW1lIHBhcnNpbmcgd2FybmluZ3MgZm9yIFwiJHtjb250ZW50fVwiOmAsIHdhcm5pbmdzKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTG9nIGVycm9ycyBpZiBhbnkgKGJ1dCBkb24ndCBmYWlsKVxyXG5cdFx0XHRpZiAoZXJyb3JzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oYFtGaWxlVGFza01hbmFnZXJdIFRpbWUgcGFyc2luZyBlcnJvcnMgZm9yIFwiJHtjb250ZW50fVwiOmAsIGVycm9ycyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFJldHVybiBlbmhhbmNlZCBtZXRhZGF0YSB3aXRoIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRjb25zdCBlbmhhbmNlZE1ldGFkYXRhOiBQYXJ0aWFsPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge307XHJcblxyXG5cdFx0XHRpZiAoT2JqZWN0LmtleXModGltZUNvbXBvbmVudHMpLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhLnRpbWVDb21wb25lbnRzID0gdGltZUNvbXBvbmVudHM7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiBlbmhhbmNlZE1ldGFkYXRhO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihgW0ZpbGVUYXNrTWFuYWdlcl0gRmFpbGVkIHRvIGV4dHJhY3QgdGltZSBjb21wb25lbnRzIGZyb20gXCIke2NvbnRlbnR9XCI6YCwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4ge307XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb21iaW5lIGRhdGUgdGltZXN0YW1wcyB3aXRoIHRpbWUgY29tcG9uZW50cyB0byBjcmVhdGUgZW5oYW5jZWQgZGF0ZXRpbWUgb2JqZWN0c1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY29tYmluZVRpbWVzdGFtcHNXaXRoVGltZUNvbXBvbmVudHMoXHJcblx0XHRkYXRlczoge1xyXG5cdFx0XHRzdGFydERhdGU/OiBudW1iZXI7XHJcblx0XHRcdGR1ZURhdGU/OiBudW1iZXI7XHJcblx0XHRcdHNjaGVkdWxlZERhdGU/OiBudW1iZXI7XHJcblx0XHRcdGNvbXBsZXRlZERhdGU/OiBudW1iZXI7XHJcblx0XHR9LFxyXG5cdFx0dGltZUNvbXBvbmVudHM6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJ0aW1lQ29tcG9uZW50c1wiXVxyXG5cdCk6IEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGFbXCJlbmhhbmNlZERhdGVzXCJdIHtcclxuXHRcdGlmICghdGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBlbmhhbmNlZERhdGVzOiBFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhW1wiZW5oYW5jZWREYXRlc1wiXSA9IHt9O1xyXG5cclxuXHRcdC8vIEhlbHBlciBmdW5jdGlvbiB0byBjb21iaW5lIGRhdGUgYW5kIHRpbWUgY29tcG9uZW50XHJcblx0XHRjb25zdCBjb21iaW5lRGF0ZVRpbWUgPSAoZGF0ZVRpbWVzdGFtcDogbnVtYmVyIHwgdW5kZWZpbmVkLCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50IHwgdW5kZWZpbmVkKTogRGF0ZSB8IHVuZGVmaW5lZCA9PiB7XHJcblx0XHRcdGlmICghZGF0ZVRpbWVzdGFtcCB8fCAhdGltZUNvbXBvbmVudCkge1xyXG5cdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkYXRlVGltZXN0YW1wKTtcclxuXHRcdFx0Y29uc3QgY29tYmluZWREYXRlID0gbmV3IERhdGUoXHJcblx0XHRcdFx0ZGF0ZS5nZXRGdWxsWWVhcigpLFxyXG5cdFx0XHRcdGRhdGUuZ2V0TW9udGgoKSxcclxuXHRcdFx0XHRkYXRlLmdldERhdGUoKSxcclxuXHRcdFx0XHR0aW1lQ29tcG9uZW50LmhvdXIsXHJcblx0XHRcdFx0dGltZUNvbXBvbmVudC5taW51dGUsXHJcblx0XHRcdFx0dGltZUNvbXBvbmVudC5zZWNvbmQgfHwgMFxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0cmV0dXJuIGNvbWJpbmVkRGF0ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ29tYmluZSBzdGFydCBkYXRlIHdpdGggc3RhcnQgdGltZVxyXG5cdFx0aWYgKGRhdGVzLnN0YXJ0RGF0ZSAmJiB0aW1lQ29tcG9uZW50cy5zdGFydFRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5zdGFydERhdGVUaW1lID0gY29tYmluZURhdGVUaW1lKGRhdGVzLnN0YXJ0RGF0ZSwgdGltZUNvbXBvbmVudHMuc3RhcnRUaW1lKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBGYWxsYmFjayBmb3Igc3RhcnQgZGF0ZXRpbWUgd2hlbiBleHBsaWNpdCBzdGFydCBkYXRlIGlzIG1pc3NpbmdcclxuXHRcdGlmIChcclxuXHRcdFx0IWVuaGFuY2VkRGF0ZXMuc3RhcnREYXRlVGltZSAmJlxyXG5cdFx0XHR0aW1lQ29tcG9uZW50cy5zdGFydFRpbWVcclxuXHRcdCkge1xyXG5cdFx0XHRjb25zdCBmYWxsYmFja0RhdGUgPVxyXG5cdFx0XHRcdGRhdGVzLmR1ZURhdGUgPz9cclxuXHRcdFx0XHRkYXRlcy5zY2hlZHVsZWREYXRlID8/XHJcblx0XHRcdFx0ZGF0ZXMuY29tcGxldGVkRGF0ZTtcclxuXHRcdFx0aWYgKGZhbGxiYWNrRGF0ZSkge1xyXG5cdFx0XHRcdGVuaGFuY2VkRGF0ZXMuc3RhcnREYXRlVGltZSA9IGNvbWJpbmVEYXRlVGltZShcclxuXHRcdFx0XHRcdGZhbGxiYWNrRGF0ZSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnRzLnN0YXJ0VGltZVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21iaW5lIGR1ZSBkYXRlIHdpdGggZHVlIHRpbWVcclxuXHRcdGlmIChkYXRlcy5kdWVEYXRlICYmIHRpbWVDb21wb25lbnRzLmR1ZVRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5kdWVEYXRlVGltZSA9IGNvbWJpbmVEYXRlVGltZShkYXRlcy5kdWVEYXRlLCB0aW1lQ29tcG9uZW50cy5kdWVUaW1lKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDb21iaW5lIHNjaGVkdWxlZCBkYXRlIHdpdGggc2NoZWR1bGVkIHRpbWVcclxuXHRcdGlmIChkYXRlcy5zY2hlZHVsZWREYXRlICYmIHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUpIHtcclxuXHRcdFx0ZW5oYW5jZWREYXRlcy5zY2hlZHVsZWREYXRlVGltZSA9IGNvbWJpbmVEYXRlVGltZShkYXRlcy5zY2hlZHVsZWREYXRlLCB0aW1lQ29tcG9uZW50cy5zY2hlZHVsZWRUaW1lKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3ZSBoYXZlIGEgZHVlIGRhdGUgYnV0IHRoZSB0aW1lIGNvbXBvbmVudCBpcyBzY2hlZHVsZWRUaW1lIChjb21tb24gd2l0aCBcImF0XCIga2V5d29yZCksXHJcblx0XHQvLyBjcmVhdGUgZHVlRGF0ZVRpbWUgdXNpbmcgc2NoZWR1bGVkVGltZVxyXG5cdFx0aWYgKGRhdGVzLmR1ZURhdGUgJiYgIXRpbWVDb21wb25lbnRzLmR1ZVRpbWUgJiYgdGltZUNvbXBvbmVudHMuc2NoZWR1bGVkVGltZSkge1xyXG5cdFx0XHRlbmhhbmNlZERhdGVzLmR1ZURhdGVUaW1lID0gY29tYmluZURhdGVUaW1lKGRhdGVzLmR1ZURhdGUsIHRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHdlIGhhdmUgYSBzY2hlZHVsZWQgZGF0ZSBidXQgdGhlIHRpbWUgY29tcG9uZW50IGlzIGR1ZVRpbWUsXHJcblx0XHQvLyBjcmVhdGUgc2NoZWR1bGVkRGF0ZVRpbWUgdXNpbmcgZHVlVGltZVxyXG5cdFx0aWYgKGRhdGVzLnNjaGVkdWxlZERhdGUgJiYgIXRpbWVDb21wb25lbnRzLnNjaGVkdWxlZFRpbWUgJiYgdGltZUNvbXBvbmVudHMuZHVlVGltZSkge1xyXG5cdFx0XHRlbmhhbmNlZERhdGVzLnNjaGVkdWxlZERhdGVUaW1lID0gY29tYmluZURhdGVUaW1lKGRhdGVzLnNjaGVkdWxlZERhdGUsIHRpbWVDb21wb25lbnRzLmR1ZVRpbWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEhhbmRsZSBlbmQgdGltZSAtIGlmIHdlIGhhdmUgc3RhcnQgZGF0ZSBhbmQgZW5kIHRpbWUsIGNyZWF0ZSBlbmQgZGF0ZXRpbWVcclxuXHRcdGlmICh0aW1lQ29tcG9uZW50cy5lbmRUaW1lKSB7XHJcblx0XHRcdGNvbnN0IGVuZEJhc2VEYXRlID1cclxuXHRcdFx0XHRkYXRlcy5zdGFydERhdGUgPz9cclxuXHRcdFx0XHRkYXRlcy5kdWVEYXRlID8/XHJcblx0XHRcdFx0ZGF0ZXMuc2NoZWR1bGVkRGF0ZSA/P1xyXG5cdFx0XHRcdGRhdGVzLmNvbXBsZXRlZERhdGU7XHJcblx0XHRcdGlmIChlbmRCYXNlRGF0ZSkge1xyXG5cdFx0XHRcdGVuaGFuY2VkRGF0ZXMuZW5kRGF0ZVRpbWUgPSBjb21iaW5lRGF0ZVRpbWUoZW5kQmFzZURhdGUsIHRpbWVDb21wb25lbnRzLmVuZFRpbWUpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIE9iamVjdC5rZXlzKGVuaGFuY2VkRGF0ZXMpLmxlbmd0aCA+IDAgPyBlbmhhbmNlZERhdGVzIDogdW5kZWZpbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGUgYW5kIGxvZyBwcm9wZXJ0eSBtYXBwaW5nIGVmZmVjdGl2ZW5lc3NcclxuXHQgKi9cclxuXHRwdWJsaWMgdmFsaWRhdGVQcm9wZXJ0eU1hcHBpbmcoXHJcblx0XHRlbnRyaWVzOiBCYXNlc0VudHJ5W10sXHJcblx0XHRtYXBwaW5nOiBGaWxlVGFza1Byb3BlcnR5TWFwcGluZyA9IERFRkFVTFRfRklMRV9UQVNLX01BUFBJTkdcclxuXHQpOiB2b2lkIHtcclxuXHRcdGlmIChlbnRyaWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuO1xyXG5cclxuXHRcdGNvbnN0IHByb3BlcnR5VXNhZ2U6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuXHRcdGNvbnN0IGF2YWlsYWJsZVByb3BlcnRpZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcclxuXHJcblx0XHQvLyBBbmFseXplIHByb3BlcnR5IHVzYWdlIGFjcm9zcyBhbGwgZW50cmllc1xyXG5cdFx0ZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xyXG5cdFx0XHRjb25zdCBwcm9wZXJ0aWVzID0gZW50cnkucHJvcGVydGllcyB8fCB7fTtcclxuXHRcdFx0T2JqZWN0LmtleXMocHJvcGVydGllcykuZm9yRWFjaCgocHJvcCkgPT4ge1xyXG5cdFx0XHRcdGF2YWlsYWJsZVByb3BlcnRpZXMuYWRkKHByb3ApO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENoZWNrIHdoaWNoIG1hcHBpbmcgcHJvcGVydGllcyBhcmUgYWN0dWFsbHkgZm91bmRcclxuXHRcdFx0T2JqZWN0LmVudHJpZXMobWFwcGluZykuZm9yRWFjaCgoW2tleSwgcHJvcE5hbWVdKSA9PiB7XHJcblx0XHRcdFx0aWYgKHByb3BOYW1lICYmIHByb3BlcnRpZXNbcHJvcE5hbWVdICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRcdHByb3BlcnR5VXNhZ2VbcHJvcE5hbWVdID1cclxuXHRcdFx0XHRcdFx0KHByb3BlcnR5VXNhZ2VbcHJvcE5hbWVdIHx8IDApICsgMTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gV2FybiBhYm91dCB1bnVzZWQgbWFwcGluZ3NcclxuXHRcdE9iamVjdC5lbnRyaWVzKG1hcHBpbmcpLmZvckVhY2goKFtrZXksIHByb3BOYW1lXSkgPT4ge1xyXG5cdFx0XHRpZiAocHJvcE5hbWUgJiYgIXByb3BlcnR5VXNhZ2VbcHJvcE5hbWVdKSB7XHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YFtGaWxlVGFza01hbmFnZXJdIFByb3BlcnR5IFwiJHtwcm9wTmFtZX1cIiAoJHtrZXl9KSBub3QgZm91bmQgaW4gYW55IGVudHJpZXNgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcbiJdfQ==