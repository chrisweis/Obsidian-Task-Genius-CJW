/**
 * Service for detecting whether task timer functionality should be enabled
 * for a specific file based on metadata conditions
 */
export class TaskTimerMetadataDetector {
    constructor(settings, metadataCache) {
        this.settings = settings;
        this.metadataCache = metadataCache;
    }
    /**
     * Check if task timer is enabled for the given file
     * @param file The file to check
     * @returns true if task timer should be enabled for this file
     */
    isTaskTimerEnabled(file) {
        if (!this.settings.enabled) {
            return false;
        }
        if (!file) {
            return false;
        }
        // Check all enabled detection methods
        return (this.checkFrontmatterCondition(file) ||
            this.checkFolderCondition(file) ||
            this.checkTagCondition(file));
    }
    /**
     * Check if frontmatter condition is met
     * @param file The file to check
     * @returns true if frontmatter condition is satisfied
     */
    checkFrontmatterCondition(file) {
        if (!this.settings.metadataDetection.frontmatter) {
            return false;
        }
        const fileCache = this.metadataCache.getFileCache(file);
        if (!fileCache || !fileCache.frontmatter) {
            return false;
        }
        const frontmatterKey = this.settings.metadataDetection.frontmatter;
        const frontmatterValue = fileCache.frontmatter[frontmatterKey];
        // Check if the frontmatter field exists and is truthy
        return Boolean(frontmatterValue);
    }
    /**
     * Check if folder condition is met
     * @param file The file to check
     * @returns true if folder condition is satisfied
     */
    checkFolderCondition(file) {
        const folders = this.settings.metadataDetection.folders;
        if (!folders || folders.length === 0) {
            return false;
        }
        const filePath = file.path;
        // Check if file path starts with any of the configured folders
        return folders.some((folder) => {
            if (!folder.trim()) {
                return false;
            }
            // Normalize folder path (ensure it ends with /)
            const normalizedFolder = folder.endsWith("/") ? folder : folder + "/";
            return filePath.startsWith(normalizedFolder) || filePath.startsWith(folder);
        });
    }
    /**
     * Check if tag condition is met
     * @param file The file to check
     * @returns true if tag condition is satisfied
     */
    checkTagCondition(file) {
        const tags = this.settings.metadataDetection.tags;
        if (!tags || tags.length === 0) {
            return false;
        }
        const fileCache = this.metadataCache.getFileCache(file);
        if (!fileCache || !fileCache.tags) {
            return false;
        }
        const fileTags = fileCache.tags.map((t) => t.tag.replace("#", ""));
        // Check if any of the configured tags exist in the file
        return tags.some((configTag) => {
            const normalizedConfigTag = configTag.replace("#", "");
            return fileTags.includes(normalizedConfigTag);
        });
    }
    /**
     * Update settings for this detector instance
     * @param settings New settings to use
     */
    updateSettings(settings) {
        this.settings = settings;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZXItbWV0YWRhdGEtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpbWVyLW1ldGFkYXRhLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBR0E7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLHlCQUF5QjtJQUlyQyxZQUFZLFFBQTJCLEVBQUUsYUFBNEI7UUFDcEUsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUM7SUFDcEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxrQkFBa0IsQ0FBQyxJQUFXO1FBQzdCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRTtZQUMzQixPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNWLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUNOLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUM7WUFDcEMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQztZQUMvQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQzVCLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILHlCQUF5QixDQUFDLElBQVc7UUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFO1lBQ2pELE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRTtZQUN6QyxPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUM7UUFDbkUsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRS9ELHNEQUFzRDtRQUN0RCxPQUFPLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsb0JBQW9CLENBQUMsSUFBVztRQUMvQixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQ3JDLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRTNCLCtEQUErRDtRQUMvRCxPQUFPLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFO2dCQUNuQixPQUFPLEtBQUssQ0FBQzthQUNiO1lBQ0QsZ0RBQWdEO1lBQ2hELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO1lBQ3RFLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGlCQUFpQixDQUFDLElBQVc7UUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7UUFDbEQsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUMvQixPQUFPLEtBQUssQ0FBQztTQUNiO1FBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUU7WUFDbEMsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUVELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVuRSx3REFBd0Q7UUFDeEQsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDOUIsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2RCxPQUFPLFFBQVEsQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMvQyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7O09BR0c7SUFDSCxjQUFjLENBQUMsUUFBMkI7UUFDekMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVEZpbGUsIE1ldGFkYXRhQ2FjaGUgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFza1RpbWVyU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuLyoqXHJcbiAqIFNlcnZpY2UgZm9yIGRldGVjdGluZyB3aGV0aGVyIHRhc2sgdGltZXIgZnVuY3Rpb25hbGl0eSBzaG91bGQgYmUgZW5hYmxlZFxyXG4gKiBmb3IgYSBzcGVjaWZpYyBmaWxlIGJhc2VkIG9uIG1ldGFkYXRhIGNvbmRpdGlvbnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBUYXNrVGltZXJNZXRhZGF0YURldGVjdG9yIHtcclxuXHRwcml2YXRlIHNldHRpbmdzOiBUYXNrVGltZXJTZXR0aW5ncztcclxuXHRwcml2YXRlIG1ldGFkYXRhQ2FjaGU6IE1ldGFkYXRhQ2FjaGU7XHJcblxyXG5cdGNvbnN0cnVjdG9yKHNldHRpbmdzOiBUYXNrVGltZXJTZXR0aW5ncywgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZSkge1xyXG5cdFx0dGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG5cdFx0dGhpcy5tZXRhZGF0YUNhY2hlID0gbWV0YWRhdGFDYWNoZTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIHRhc2sgdGltZXIgaXMgZW5hYmxlZCBmb3IgdGhlIGdpdmVuIGZpbGVcclxuXHQgKiBAcGFyYW0gZmlsZSBUaGUgZmlsZSB0byBjaGVja1xyXG5cdCAqIEByZXR1cm5zIHRydWUgaWYgdGFzayB0aW1lciBzaG91bGQgYmUgZW5hYmxlZCBmb3IgdGhpcyBmaWxlXHJcblx0ICovXHJcblx0aXNUYXNrVGltZXJFbmFibGVkKGZpbGU6IFRGaWxlKTogYm9vbGVhbiB7XHJcblx0XHRpZiAoIXRoaXMuc2V0dGluZ3MuZW5hYmxlZCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCFmaWxlKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBhbGwgZW5hYmxlZCBkZXRlY3Rpb24gbWV0aG9kc1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0dGhpcy5jaGVja0Zyb250bWF0dGVyQ29uZGl0aW9uKGZpbGUpIHx8XHJcblx0XHRcdHRoaXMuY2hlY2tGb2xkZXJDb25kaXRpb24oZmlsZSkgfHxcclxuXHRcdFx0dGhpcy5jaGVja1RhZ0NvbmRpdGlvbihmaWxlKVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGZyb250bWF0dGVyIGNvbmRpdGlvbiBpcyBtZXRcclxuXHQgKiBAcGFyYW0gZmlsZSBUaGUgZmlsZSB0byBjaGVja1xyXG5cdCAqIEByZXR1cm5zIHRydWUgaWYgZnJvbnRtYXR0ZXIgY29uZGl0aW9uIGlzIHNhdGlzZmllZFxyXG5cdCAqL1xyXG5cdGNoZWNrRnJvbnRtYXR0ZXJDb25kaXRpb24oZmlsZTogVEZpbGUpOiBib29sZWFuIHtcclxuXHRcdGlmICghdGhpcy5zZXR0aW5ncy5tZXRhZGF0YURldGVjdGlvbi5mcm9udG1hdHRlcikge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdGlmICghZmlsZUNhY2hlIHx8ICFmaWxlQ2FjaGUuZnJvbnRtYXR0ZXIpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGZyb250bWF0dGVyS2V5ID0gdGhpcy5zZXR0aW5ncy5tZXRhZGF0YURldGVjdGlvbi5mcm9udG1hdHRlcjtcclxuXHRcdGNvbnN0IGZyb250bWF0dGVyVmFsdWUgPSBmaWxlQ2FjaGUuZnJvbnRtYXR0ZXJbZnJvbnRtYXR0ZXJLZXldO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoZSBmcm9udG1hdHRlciBmaWVsZCBleGlzdHMgYW5kIGlzIHRydXRoeVxyXG5cdFx0cmV0dXJuIEJvb2xlYW4oZnJvbnRtYXR0ZXJWYWx1ZSk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDaGVjayBpZiBmb2xkZXIgY29uZGl0aW9uIGlzIG1ldFxyXG5cdCAqIEBwYXJhbSBmaWxlIFRoZSBmaWxlIHRvIGNoZWNrXHJcblx0ICogQHJldHVybnMgdHJ1ZSBpZiBmb2xkZXIgY29uZGl0aW9uIGlzIHNhdGlzZmllZFxyXG5cdCAqL1xyXG5cdGNoZWNrRm9sZGVyQ29uZGl0aW9uKGZpbGU6IFRGaWxlKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBmb2xkZXJzID0gdGhpcy5zZXR0aW5ncy5tZXRhZGF0YURldGVjdGlvbi5mb2xkZXJzO1xyXG5cdFx0aWYgKCFmb2xkZXJzIHx8IGZvbGRlcnMubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBmaWxlUGF0aCA9IGZpbGUucGF0aDtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBmaWxlIHBhdGggc3RhcnRzIHdpdGggYW55IG9mIHRoZSBjb25maWd1cmVkIGZvbGRlcnNcclxuXHRcdHJldHVybiBmb2xkZXJzLnNvbWUoKGZvbGRlcikgPT4ge1xyXG5cdFx0XHRpZiAoIWZvbGRlci50cmltKCkpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gTm9ybWFsaXplIGZvbGRlciBwYXRoIChlbnN1cmUgaXQgZW5kcyB3aXRoIC8pXHJcblx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRGb2xkZXIgPSBmb2xkZXIuZW5kc1dpdGgoXCIvXCIpID8gZm9sZGVyIDogZm9sZGVyICsgXCIvXCI7XHJcblx0XHRcdHJldHVybiBmaWxlUGF0aC5zdGFydHNXaXRoKG5vcm1hbGl6ZWRGb2xkZXIpIHx8IGZpbGVQYXRoLnN0YXJ0c1dpdGgoZm9sZGVyKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgdGFnIGNvbmRpdGlvbiBpcyBtZXRcclxuXHQgKiBAcGFyYW0gZmlsZSBUaGUgZmlsZSB0byBjaGVja1xyXG5cdCAqIEByZXR1cm5zIHRydWUgaWYgdGFnIGNvbmRpdGlvbiBpcyBzYXRpc2ZpZWRcclxuXHQgKi9cclxuXHRjaGVja1RhZ0NvbmRpdGlvbihmaWxlOiBURmlsZSk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgdGFncyA9IHRoaXMuc2V0dGluZ3MubWV0YWRhdGFEZXRlY3Rpb24udGFncztcclxuXHRcdGlmICghdGFncyB8fCB0YWdzLmxlbmd0aCA9PT0gMCkge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZmlsZUNhY2hlID0gdGhpcy5tZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZShmaWxlKTtcclxuXHRcdGlmICghZmlsZUNhY2hlIHx8ICFmaWxlQ2FjaGUudGFncykge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZmlsZVRhZ3MgPSBmaWxlQ2FjaGUudGFncy5tYXAoKHQpID0+IHQudGFnLnJlcGxhY2UoXCIjXCIsIFwiXCIpKTtcclxuXHJcblx0XHQvLyBDaGVjayBpZiBhbnkgb2YgdGhlIGNvbmZpZ3VyZWQgdGFncyBleGlzdCBpbiB0aGUgZmlsZVxyXG5cdFx0cmV0dXJuIHRhZ3Muc29tZSgoY29uZmlnVGFnKSA9PiB7XHJcblx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRDb25maWdUYWcgPSBjb25maWdUYWcucmVwbGFjZShcIiNcIiwgXCJcIik7XHJcblx0XHRcdHJldHVybiBmaWxlVGFncy5pbmNsdWRlcyhub3JtYWxpemVkQ29uZmlnVGFnKTtcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHNldHRpbmdzIGZvciB0aGlzIGRldGVjdG9yIGluc3RhbmNlXHJcblx0ICogQHBhcmFtIHNldHRpbmdzIE5ldyBzZXR0aW5ncyB0byB1c2VcclxuXHQgKi9cclxuXHR1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogVGFza1RpbWVyU2V0dGluZ3MpOiB2b2lkIHtcclxuXHRcdHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcclxuXHR9XHJcbn0iXX0=