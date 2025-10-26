import { editorInfoField, TFile, } from "obsidian";
// Helper function to check if progress bars should be hidden
export function shouldHideProgressBarInPreview(plugin, ctx) {
    if (!plugin.settings.hideProgressBarBasedOnConditions) {
        return false;
    }
    const abstractFile = ctx.sourcePath
        ? plugin.app.vault.getFileByPath(ctx.sourcePath)
        : null;
    if (!abstractFile) {
        return false;
    }
    // Check if it's a file and not a folder
    if (!(abstractFile instanceof TFile)) {
        return false;
    }
    const file = abstractFile;
    // Check folder paths
    if (plugin.settings.hideProgressBarFolders) {
        const folders = plugin.settings.hideProgressBarFolders
            .split(",")
            .map((f) => f.trim());
        const filePath = file.path;
        for (const folder of folders) {
            if (folder && filePath.startsWith(folder)) {
                return true;
            }
        }
    }
    // Check tags
    if (plugin.settings.hideProgressBarTags) {
        const tags = plugin.settings.hideProgressBarTags
            .split(",")
            .map((t) => t.trim());
        const fileCache = plugin.app.metadataCache.getFileCache(file);
        if (fileCache && fileCache.tags) {
            for (const tag of tags) {
                if (fileCache.tags.some((t) => t.tag === "#" + tag)) {
                    return true;
                }
            }
        }
    }
    // Check metadata
    if (plugin.settings.hideProgressBarMetadata) {
        const metadataCache = plugin.app.metadataCache.getFileCache(file);
        if (metadataCache && metadataCache.frontmatter) {
            // Parse the metadata string (format: "key: value")
            const key = plugin.settings.hideProgressBarMetadata;
            if (key && metadataCache.frontmatter[key] !== undefined) {
                return !!metadataCache.frontmatter[key];
            }
        }
    }
    return false;
}
// Helper function to check if progress bars should be hidden
export function shouldHideProgressBarInLivePriview(plugin, view) {
    // If progress display mode is set to "none", hide progress bars
    if (plugin.settings.progressBarDisplayMode === "none") {
        return true;
    }
    if (!plugin.settings.hideProgressBarBasedOnConditions) {
        return false;
    }
    // Get the current file
    const editorInfo = view.state.field(editorInfoField);
    if (!editorInfo) {
        return false;
    }
    const file = editorInfo.file;
    if (!file) {
        return false;
    }
    // Check folder paths
    if (plugin.settings.hideProgressBarFolders) {
        const folders = plugin.settings.hideProgressBarFolders
            .split(",")
            .map((f) => f.trim());
        const filePath = file.path;
        for (const folder of folders) {
            if (folder && filePath.startsWith(folder)) {
                return true;
            }
        }
    }
    // Check tags
    if (plugin.settings.hideProgressBarTags) {
        const tags = plugin.settings.hideProgressBarTags
            .split(",")
            .map((t) => t.trim());
        // Try to get cache for tags
        const fileCache = plugin.app.metadataCache.getFileCache(file);
        if (fileCache && fileCache.tags) {
            for (const tag of tags) {
                if (fileCache.tags.some((t) => t.tag === "#" + tag)) {
                    return true;
                }
            }
        }
    }
    // Check metadata
    if (plugin.settings.hideProgressBarMetadata) {
        const metadataCache = plugin.app.metadataCache.getFileCache(file);
        if (metadataCache && metadataCache.frontmatter) {
            // Parse the metadata string (format: "key: value")
            const key = plugin.settings.hideProgressBarMetadata;
            if (key && key in metadataCache.frontmatter) {
                return !!metadataCache.frontmatter[key];
            }
        }
    }
    return false;
}
/**
 * Get tab size from vault configuration
 */
export function getTabSize(app) {
    var _a, _b, _c, _d;
    try {
        const vaultConfig = app.vault;
        const useTab = ((_a = vaultConfig.getConfig) === null || _a === void 0 ? void 0 : _a.call(vaultConfig, "useTab")) === undefined ||
            ((_b = vaultConfig.getConfig) === null || _b === void 0 ? void 0 : _b.call(vaultConfig, "useTab")) === true;
        return useTab
            ? (((_c = vaultConfig.getConfig) === null || _c === void 0 ? void 0 : _c.call(vaultConfig, "tabSize")) || 4) / 4
            : ((_d = vaultConfig.getConfig) === null || _d === void 0 ? void 0 : _d.call(vaultConfig, "tabSize")) || 4;
    }
    catch (e) {
        console.error("Error getting tab size:", e);
        return 4; // Default tab size
    }
}
/**
 * Build indent string based on tab size and using tab or space
 */
export function buildIndentString(app) {
    var _a, _b;
    try {
        const vaultConfig = app.vault;
        const useTab = ((_a = vaultConfig.getConfig) === null || _a === void 0 ? void 0 : _a.call(vaultConfig, "useTab")) === undefined ||
            ((_b = vaultConfig.getConfig) === null || _b === void 0 ? void 0 : _b.call(vaultConfig, "useTab")) === true;
        const tabSize = getTabSize(app);
        return useTab ? "\t" : " ".repeat(tabSize);
    }
    catch (e) {
        console.error("Error building indent string:", e);
        return "";
    }
}
export function getTasksAPI(plugin) {
    // @ts-ignore
    const tasksPlugin = plugin.app.plugins.plugins["obsidian-tasks-plugin"];
    if (!tasksPlugin) {
        return null;
    }
    if (!tasksPlugin._loaded) {
        return null;
    }
    // Access the API v1 from the Tasks plugin
    return tasksPlugin.apiV1;
}
/**
 * Format a date using a template string
 * @param date - The date to format
 * @param format - The format string
 * @returns The formatted date string
 */
export function formatDate(date, format) {
    const tokens = {
        YYYY: () => date.getFullYear().toString(),
        MM: () => (date.getMonth() + 1).toString().padStart(2, "0"),
        DD: () => date.getDate().toString().padStart(2, "0"),
        HH: () => date.getHours().toString().padStart(2, "0"),
        mm: () => date.getMinutes().toString().padStart(2, "0"),
        ss: () => date.getSeconds().toString().padStart(2, "0"),
    };
    let result = format;
    for (const [token, func] of Object.entries(tokens)) {
        result = result.replace(token, func());
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQSxPQUFPLEVBRU4sZUFBZSxFQUVmLEtBQUssR0FDTCxNQUFNLFVBQVUsQ0FBQztBQUVsQiw2REFBNkQ7QUFDN0QsTUFBTSxVQUFVLDhCQUE4QixDQUM3QyxNQUE2QixFQUM3QixHQUFpQztJQUVqQyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQ0FBZ0MsRUFBRTtRQUN0RCxPQUFPLEtBQUssQ0FBQztLQUNiO0lBRUQsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFVBQVU7UUFDbEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ2hELENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDUixJQUFJLENBQUMsWUFBWSxFQUFFO1FBQ2xCLE9BQU8sS0FBSyxDQUFDO0tBQ2I7SUFFRCx3Q0FBd0M7SUFDeEMsSUFBSSxDQUFDLENBQUMsWUFBWSxZQUFZLEtBQUssQ0FBQyxFQUFFO1FBQ3JDLE9BQU8sS0FBSyxDQUFDO0tBQ2I7SUFFRCxNQUFNLElBQUksR0FBRyxZQUFxQixDQUFDO0lBRW5DLHFCQUFxQjtJQUNyQixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUU7UUFDM0MsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxzQkFBc0I7YUFDcEQsS0FBSyxDQUFDLEdBQUcsQ0FBQzthQUNWLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUUzQixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtZQUM3QixJQUFJLE1BQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLE1B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RUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1FBQ3ZELEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7S0FDdkQsQ0FBQztJQUVGLElBQUksTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUNwQixLQUFLLE1BQU0sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRTtRQUNuRCxNQUFNLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztLQUN2QztJQUVELE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEVkaXRvclZpZXcgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5cclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLlwiO1xyXG5pbXBvcnQge1xyXG5cdEFwcCxcclxuXHRlZGl0b3JJbmZvRmllbGQsXHJcblx0TWFya2Rvd25Qb3N0UHJvY2Vzc29yQ29udGV4dCxcclxuXHRURmlsZSxcclxufSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbi8vIEhlbHBlciBmdW5jdGlvbiB0byBjaGVjayBpZiBwcm9ncmVzcyBiYXJzIHNob3VsZCBiZSBoaWRkZW5cclxuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZEhpZGVQcm9ncmVzc0JhckluUHJldmlldyhcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRjdHg6IE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHRcclxuKTogYm9vbGVhbiB7XHJcblx0aWYgKCFwbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyQmFzZWRPbkNvbmRpdGlvbnMpIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGFic3RyYWN0RmlsZSA9IGN0eC5zb3VyY2VQYXRoXHJcblx0XHQ/IHBsdWdpbi5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChjdHguc291cmNlUGF0aClcclxuXHRcdDogbnVsbDtcclxuXHRpZiAoIWFic3RyYWN0RmlsZSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgaWYgaXQncyBhIGZpbGUgYW5kIG5vdCBhIGZvbGRlclxyXG5cdGlmICghKGFic3RyYWN0RmlsZSBpbnN0YW5jZW9mIFRGaWxlKSkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgZmlsZSA9IGFic3RyYWN0RmlsZSBhcyBURmlsZTtcclxuXHJcblx0Ly8gQ2hlY2sgZm9sZGVyIHBhdGhzXHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJGb2xkZXJzKSB7XHJcblx0XHRjb25zdCBmb2xkZXJzID0gcGx1Z2luLnNldHRpbmdzLmhpZGVQcm9ncmVzc0JhckZvbGRlcnNcclxuXHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHQubWFwKChmKSA9PiBmLnRyaW0oKSk7XHJcblx0XHRjb25zdCBmaWxlUGF0aCA9IGZpbGUucGF0aDtcclxuXHJcblx0XHRmb3IgKGNvbnN0IGZvbGRlciBvZiBmb2xkZXJzKSB7XHJcblx0XHRcdGlmIChmb2xkZXIgJiYgZmlsZVBhdGguc3RhcnRzV2l0aChmb2xkZXIpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIHRhZ3NcclxuXHRpZiAocGx1Z2luLnNldHRpbmdzLmhpZGVQcm9ncmVzc0JhclRhZ3MpIHtcclxuXHRcdGNvbnN0IHRhZ3MgPSBwbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyVGFnc1xyXG5cdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdC5tYXAoKHQpID0+IHQudHJpbSgpKTtcclxuXHRcdGNvbnN0IGZpbGVDYWNoZSA9IHBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblxyXG5cdFx0aWYgKGZpbGVDYWNoZSAmJiBmaWxlQ2FjaGUudGFncykge1xyXG5cdFx0XHRmb3IgKGNvbnN0IHRhZyBvZiB0YWdzKSB7XHJcblx0XHRcdFx0aWYgKGZpbGVDYWNoZS50YWdzLnNvbWUoKHQpID0+IHQudGFnID09PSBcIiNcIiArIHRhZykpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Ly8gQ2hlY2sgbWV0YWRhdGFcclxuXHRpZiAocGx1Z2luLnNldHRpbmdzLmhpZGVQcm9ncmVzc0Jhck1ldGFkYXRhKSB7XHJcblx0XHRjb25zdCBtZXRhZGF0YUNhY2hlID0gcGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHJcblx0XHRpZiAobWV0YWRhdGFDYWNoZSAmJiBtZXRhZGF0YUNhY2hlLmZyb250bWF0dGVyKSB7XHJcblx0XHRcdC8vIFBhcnNlIHRoZSBtZXRhZGF0YSBzdHJpbmcgKGZvcm1hdDogXCJrZXk6IHZhbHVlXCIpXHJcblx0XHRcdGNvbnN0IGtleSA9IHBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJNZXRhZGF0YTtcclxuXHRcdFx0aWYgKGtleSAmJiBtZXRhZGF0YUNhY2hlLmZyb250bWF0dGVyW2tleV0gIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRcdHJldHVybiAhIW1ldGFkYXRhQ2FjaGUuZnJvbnRtYXR0ZXJba2V5XTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vLyBIZWxwZXIgZnVuY3Rpb24gdG8gY2hlY2sgaWYgcHJvZ3Jlc3MgYmFycyBzaG91bGQgYmUgaGlkZGVuXHJcbmV4cG9ydCBmdW5jdGlvbiBzaG91bGRIaWRlUHJvZ3Jlc3NCYXJJbkxpdmVQcml2aWV3KFxyXG5cdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdHZpZXc6IEVkaXRvclZpZXdcclxuKTogYm9vbGVhbiB7XHJcblx0Ly8gSWYgcHJvZ3Jlc3MgZGlzcGxheSBtb2RlIGlzIHNldCB0byBcIm5vbmVcIiwgaGlkZSBwcm9ncmVzcyBiYXJzXHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcIm5vbmVcIikge1xyXG5cdFx0cmV0dXJuIHRydWU7XHJcblx0fVxyXG5cclxuXHRpZiAoIXBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJCYXNlZE9uQ29uZGl0aW9ucykge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Ly8gR2V0IHRoZSBjdXJyZW50IGZpbGVcclxuXHRjb25zdCBlZGl0b3JJbmZvID0gdmlldy5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpO1xyXG5cdGlmICghZWRpdG9ySW5mbykge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgZmlsZSA9IGVkaXRvckluZm8uZmlsZTtcclxuXHRpZiAoIWZpbGUpIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGZvbGRlciBwYXRoc1xyXG5cdGlmIChwbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyRm9sZGVycykge1xyXG5cdFx0Y29uc3QgZm9sZGVycyA9IHBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJGb2xkZXJzXHJcblx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0Lm1hcCgoZikgPT4gZi50cmltKCkpO1xyXG5cdFx0Y29uc3QgZmlsZVBhdGggPSBmaWxlLnBhdGg7XHJcblxyXG5cdFx0Zm9yIChjb25zdCBmb2xkZXIgb2YgZm9sZGVycykge1xyXG5cdFx0XHRpZiAoZm9sZGVyICYmIGZpbGVQYXRoLnN0YXJ0c1dpdGgoZm9sZGVyKSkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBDaGVjayB0YWdzXHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJUYWdzKSB7XHJcblx0XHRjb25zdCB0YWdzID0gcGx1Z2luLnNldHRpbmdzLmhpZGVQcm9ncmVzc0JhclRhZ3NcclxuXHRcdFx0LnNwbGl0KFwiLFwiKVxyXG5cdFx0XHQubWFwKCh0KSA9PiB0LnRyaW0oKSk7XHJcblxyXG5cdFx0Ly8gVHJ5IHRvIGdldCBjYWNoZSBmb3IgdGFnc1xyXG5cdFx0Y29uc3QgZmlsZUNhY2hlID0gcGx1Z2luLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdGlmIChmaWxlQ2FjaGUgJiYgZmlsZUNhY2hlLnRhZ3MpIHtcclxuXHRcdFx0Zm9yIChjb25zdCB0YWcgb2YgdGFncykge1xyXG5cdFx0XHRcdGlmIChmaWxlQ2FjaGUudGFncy5zb21lKCh0KSA9PiB0LnRhZyA9PT0gXCIjXCIgKyB0YWcpKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIG1ldGFkYXRhXHJcblx0aWYgKHBsdWdpbi5zZXR0aW5ncy5oaWRlUHJvZ3Jlc3NCYXJNZXRhZGF0YSkge1xyXG5cdFx0Y29uc3QgbWV0YWRhdGFDYWNoZSA9IHBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUoZmlsZSk7XHJcblxyXG5cdFx0aWYgKG1ldGFkYXRhQ2FjaGUgJiYgbWV0YWRhdGFDYWNoZS5mcm9udG1hdHRlcikge1xyXG5cdFx0XHQvLyBQYXJzZSB0aGUgbWV0YWRhdGEgc3RyaW5nIChmb3JtYXQ6IFwia2V5OiB2YWx1ZVwiKVxyXG5cdFx0XHRjb25zdCBrZXkgPSBwbHVnaW4uc2V0dGluZ3MuaGlkZVByb2dyZXNzQmFyTWV0YWRhdGE7XHJcblx0XHRcdGlmIChrZXkgJiYga2V5IGluIG1ldGFkYXRhQ2FjaGUuZnJvbnRtYXR0ZXIpIHtcclxuXHRcdFx0XHRyZXR1cm4gISFtZXRhZGF0YUNhY2hlLmZyb250bWF0dGVyW2tleV07XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHJldHVybiBmYWxzZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0YWIgc2l6ZSBmcm9tIHZhdWx0IGNvbmZpZ3VyYXRpb25cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRUYWJTaXplKGFwcDogQXBwKTogbnVtYmVyIHtcclxuXHR0cnkge1xyXG5cdFx0Y29uc3QgdmF1bHRDb25maWcgPSBhcHAudmF1bHQgYXMgYW55O1xyXG5cdFx0Y29uc3QgdXNlVGFiID1cclxuXHRcdFx0dmF1bHRDb25maWcuZ2V0Q29uZmlnPy4oXCJ1c2VUYWJcIikgPT09IHVuZGVmaW5lZCB8fFxyXG5cdFx0XHR2YXVsdENvbmZpZy5nZXRDb25maWc/LihcInVzZVRhYlwiKSA9PT0gdHJ1ZTtcclxuXHRcdHJldHVybiB1c2VUYWJcclxuXHRcdFx0PyAodmF1bHRDb25maWcuZ2V0Q29uZmlnPy4oXCJ0YWJTaXplXCIpIHx8IDQpIC8gNFxyXG5cdFx0XHQ6IHZhdWx0Q29uZmlnLmdldENvbmZpZz8uKFwidGFiU2l6ZVwiKSB8fCA0O1xyXG5cdH0gY2F0Y2ggKGUpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBnZXR0aW5nIHRhYiBzaXplOlwiLCBlKTtcclxuXHRcdHJldHVybiA0OyAvLyBEZWZhdWx0IHRhYiBzaXplXHJcblx0fVxyXG59XHJcblxyXG4vKipcclxuICogQnVpbGQgaW5kZW50IHN0cmluZyBiYXNlZCBvbiB0YWIgc2l6ZSBhbmQgdXNpbmcgdGFiIG9yIHNwYWNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRJbmRlbnRTdHJpbmcoYXBwOiBBcHApOiBzdHJpbmcge1xyXG5cdHRyeSB7XHJcblx0XHRjb25zdCB2YXVsdENvbmZpZyA9IGFwcC52YXVsdCBhcyBhbnk7XHJcblx0XHRjb25zdCB1c2VUYWIgPVxyXG5cdFx0XHR2YXVsdENvbmZpZy5nZXRDb25maWc/LihcInVzZVRhYlwiKSA9PT0gdW5kZWZpbmVkIHx8XHJcblx0XHRcdHZhdWx0Q29uZmlnLmdldENvbmZpZz8uKFwidXNlVGFiXCIpID09PSB0cnVlO1xyXG5cdFx0Y29uc3QgdGFiU2l6ZSA9IGdldFRhYlNpemUoYXBwKTtcclxuXHRcdHJldHVybiB1c2VUYWIgPyBcIlxcdFwiIDogXCIgXCIucmVwZWF0KHRhYlNpemUpO1xyXG5cdH0gY2F0Y2ggKGUpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBidWlsZGluZyBpbmRlbnQgc3RyaW5nOlwiLCBlKTtcclxuXHRcdHJldHVybiBcIlwiO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFRhc2tzQVBJKHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0Ly8gQHRzLWlnbm9yZVxyXG5cdGNvbnN0IHRhc2tzUGx1Z2luID0gcGx1Z2luLmFwcC5wbHVnaW5zLnBsdWdpbnNbXHJcblx0XHRcIm9ic2lkaWFuLXRhc2tzLXBsdWdpblwiXHJcblx0XSBhcyBhbnk7XHJcblxyXG5cdGlmICghdGFza3NQbHVnaW4pIHtcclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH1cclxuXHJcblx0aWYgKCF0YXNrc1BsdWdpbi5fbG9hZGVkKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8vIEFjY2VzcyB0aGUgQVBJIHYxIGZyb20gdGhlIFRhc2tzIHBsdWdpblxyXG5cdHJldHVybiB0YXNrc1BsdWdpbi5hcGlWMTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvcm1hdCBhIGRhdGUgdXNpbmcgYSB0ZW1wbGF0ZSBzdHJpbmdcclxuICogQHBhcmFtIGRhdGUgLSBUaGUgZGF0ZSB0byBmb3JtYXRcclxuICogQHBhcmFtIGZvcm1hdCAtIFRoZSBmb3JtYXQgc3RyaW5nXHJcbiAqIEByZXR1cm5zIFRoZSBmb3JtYXR0ZWQgZGF0ZSBzdHJpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREYXRlKGRhdGU6IERhdGUsIGZvcm1hdDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRjb25zdCB0b2tlbnM6IFJlY29yZDxzdHJpbmcsICgpID0+IHN0cmluZz4gPSB7XHJcblx0XHRZWVlZOiAoKSA9PiBkYXRlLmdldEZ1bGxZZWFyKCkudG9TdHJpbmcoKSxcclxuXHRcdE1NOiAoKSA9PiAoZGF0ZS5nZXRNb250aCgpICsgMSkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCBcIjBcIiksXHJcblx0XHRERDogKCkgPT4gZGF0ZS5nZXREYXRlKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCBcIjBcIiksXHJcblx0XHRISDogKCkgPT4gZGF0ZS5nZXRIb3VycygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgXCIwXCIpLFxyXG5cdFx0bW06ICgpID0+IGRhdGUuZ2V0TWludXRlcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgXCIwXCIpLFxyXG5cdFx0c3M6ICgpID0+IGRhdGUuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgXCIwXCIpLFxyXG5cdH07XHJcblxyXG5cdGxldCByZXN1bHQgPSBmb3JtYXQ7XHJcblx0Zm9yIChjb25zdCBbdG9rZW4sIGZ1bmNdIG9mIE9iamVjdC5lbnRyaWVzKHRva2VucykpIHtcclxuXHRcdHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKHRva2VuLCBmdW5jKCkpO1xyXG5cdH1cclxuXHJcblx0cmV0dXJuIHJlc3VsdDtcclxufVxyXG4iXX0=