/**
 * Convert a flat list of tasks to a hierarchical tree structure
 * @param tasks Flat list of tasks
 * @returns List of root tasks with children populated recursively
 */
export function tasksToTree(tasks) {
    // Create a map for quick task lookup
    const taskMap = new Map();
    tasks.forEach((task) => {
        taskMap.set(task.id, Object.assign({}, task));
    });
    // Find root tasks and build hierarchy
    const rootTasks = [];
    // First pass: connect children to parents
    tasks.forEach((task) => {
        const taskWithChildren = taskMap.get(task.id);
        if (task.metadata.parent && taskMap.has(task.metadata.parent)) {
            // This task has a parent, add it to parent's children
            const parent = taskMap.get(task.metadata.parent);
            if (!parent.metadata.children.includes(task.id)) {
                parent.metadata.children.push(task.id);
            }
        }
        else {
            // No parent or parent not in current set, treat as root
            rootTasks.push(taskWithChildren);
        }
    });
    return rootTasks;
}
/**
 * Flatten a tree of tasks back to a list, with child tasks following their parents
 * @param rootTasks List of root tasks with populated children
 * @param taskMap Map of all tasks by ID for lookup
 * @returns Flattened list of tasks in hierarchical order
 */
export function flattenTaskTree(rootTasks, taskMap) {
    const result = [];
    function addTaskAndChildren(task) {
        result.push(task);
        // Add all children recursively
        task.metadata.children.forEach((childId) => {
            const childTask = taskMap.get(childId);
            if (childTask) {
                addTaskAndChildren(childTask);
            }
        });
    }
    // Process all root tasks
    rootTasks.forEach((task) => {
        addTaskAndChildren(task);
    });
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZS12aWV3LXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidHJlZS12aWV3LXV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBOzs7O0dBSUc7QUFDSCxNQUFNLFVBQVUsV0FBVyxDQUFDLEtBQWE7SUFDeEMscUNBQXFDO0lBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFnQixDQUFDO0lBQ3hDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtRQUN0QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLG9CQUFPLElBQUksRUFBRyxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0lBRUgsc0NBQXNDO0lBQ3RDLE1BQU0sU0FBUyxHQUFXLEVBQUUsQ0FBQztJQUU3QiwwQ0FBMEM7SUFDMUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQ3RCLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFFLENBQUM7UUFFL0MsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDOUQsc0RBQXNEO1lBQ3RELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDaEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN2QztTQUNEO2FBQU07WUFDTix3REFBd0Q7WUFDeEQsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1NBQ2pDO0lBQ0YsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLFNBQVMsQ0FBQztBQUNsQixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsZUFBZSxDQUM5QixTQUFpQixFQUNqQixPQUEwQjtJQUUxQixNQUFNLE1BQU0sR0FBVyxFQUFFLENBQUM7SUFFMUIsU0FBUyxrQkFBa0IsQ0FBQyxJQUFVO1FBQ3JDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFbEIsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzFDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDdkMsSUFBSSxTQUFTLEVBQUU7Z0JBQ2Qsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7YUFDOUI7UUFDRixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCx5QkFBeUI7SUFDekIsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzFCLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcblxyXG4vKipcclxuICogQ29udmVydCBhIGZsYXQgbGlzdCBvZiB0YXNrcyB0byBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZVxyXG4gKiBAcGFyYW0gdGFza3MgRmxhdCBsaXN0IG9mIHRhc2tzXHJcbiAqIEByZXR1cm5zIExpc3Qgb2Ygcm9vdCB0YXNrcyB3aXRoIGNoaWxkcmVuIHBvcHVsYXRlZCByZWN1cnNpdmVseVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRhc2tzVG9UcmVlKHRhc2tzOiBUYXNrW10pOiBUYXNrW10ge1xyXG5cdC8vIENyZWF0ZSBhIG1hcCBmb3IgcXVpY2sgdGFzayBsb29rdXBcclxuXHRjb25zdCB0YXNrTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRhc2s+KCk7XHJcblx0dGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0dGFza01hcC5zZXQodGFzay5pZCwgeyAuLi50YXNrIH0pO1xyXG5cdH0pO1xyXG5cclxuXHQvLyBGaW5kIHJvb3QgdGFza3MgYW5kIGJ1aWxkIGhpZXJhcmNoeVxyXG5cdGNvbnN0IHJvb3RUYXNrczogVGFza1tdID0gW107XHJcblxyXG5cdC8vIEZpcnN0IHBhc3M6IGNvbm5lY3QgY2hpbGRyZW4gdG8gcGFyZW50c1xyXG5cdHRhc2tzLmZvckVhY2goKHRhc2spID0+IHtcclxuXHRcdGNvbnN0IHRhc2tXaXRoQ2hpbGRyZW4gPSB0YXNrTWFwLmdldCh0YXNrLmlkKSE7XHJcblxyXG5cdFx0aWYgKHRhc2subWV0YWRhdGEucGFyZW50ICYmIHRhc2tNYXAuaGFzKHRhc2subWV0YWRhdGEucGFyZW50KSkge1xyXG5cdFx0XHQvLyBUaGlzIHRhc2sgaGFzIGEgcGFyZW50LCBhZGQgaXQgdG8gcGFyZW50J3MgY2hpbGRyZW5cclxuXHRcdFx0Y29uc3QgcGFyZW50ID0gdGFza01hcC5nZXQodGFzay5tZXRhZGF0YS5wYXJlbnQpITtcclxuXHRcdFx0aWYgKCFwYXJlbnQubWV0YWRhdGEuY2hpbGRyZW4uaW5jbHVkZXModGFzay5pZCkpIHtcclxuXHRcdFx0XHRwYXJlbnQubWV0YWRhdGEuY2hpbGRyZW4ucHVzaCh0YXNrLmlkKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gTm8gcGFyZW50IG9yIHBhcmVudCBub3QgaW4gY3VycmVudCBzZXQsIHRyZWF0IGFzIHJvb3RcclxuXHRcdFx0cm9vdFRhc2tzLnB1c2godGFza1dpdGhDaGlsZHJlbik7XHJcblx0XHR9XHJcblx0fSk7XHJcblxyXG5cdHJldHVybiByb290VGFza3M7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGbGF0dGVuIGEgdHJlZSBvZiB0YXNrcyBiYWNrIHRvIGEgbGlzdCwgd2l0aCBjaGlsZCB0YXNrcyBmb2xsb3dpbmcgdGhlaXIgcGFyZW50c1xyXG4gKiBAcGFyYW0gcm9vdFRhc2tzIExpc3Qgb2Ygcm9vdCB0YXNrcyB3aXRoIHBvcHVsYXRlZCBjaGlsZHJlblxyXG4gKiBAcGFyYW0gdGFza01hcCBNYXAgb2YgYWxsIHRhc2tzIGJ5IElEIGZvciBsb29rdXBcclxuICogQHJldHVybnMgRmxhdHRlbmVkIGxpc3Qgb2YgdGFza3MgaW4gaGllcmFyY2hpY2FsIG9yZGVyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZmxhdHRlblRhc2tUcmVlKFxyXG5cdHJvb3RUYXNrczogVGFza1tdLFxyXG5cdHRhc2tNYXA6IE1hcDxzdHJpbmcsIFRhc2s+XHJcbik6IFRhc2tbXSB7XHJcblx0Y29uc3QgcmVzdWx0OiBUYXNrW10gPSBbXTtcclxuXHJcblx0ZnVuY3Rpb24gYWRkVGFza0FuZENoaWxkcmVuKHRhc2s6IFRhc2spIHtcclxuXHRcdHJlc3VsdC5wdXNoKHRhc2spO1xyXG5cclxuXHRcdC8vIEFkZCBhbGwgY2hpbGRyZW4gcmVjdXJzaXZlbHlcclxuXHRcdHRhc2subWV0YWRhdGEuY2hpbGRyZW4uZm9yRWFjaCgoY2hpbGRJZCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjaGlsZFRhc2sgPSB0YXNrTWFwLmdldChjaGlsZElkKTtcclxuXHRcdFx0aWYgKGNoaWxkVGFzaykge1xyXG5cdFx0XHRcdGFkZFRhc2tBbmRDaGlsZHJlbihjaGlsZFRhc2spO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8vIFByb2Nlc3MgYWxsIHJvb3QgdGFza3NcclxuXHRyb290VGFza3MuZm9yRWFjaCgodGFzaykgPT4ge1xyXG5cdFx0YWRkVGFza0FuZENoaWxkcmVuKHRhc2spO1xyXG5cdH0pO1xyXG5cclxuXHRyZXR1cm4gcmVzdWx0O1xyXG59XHJcbiJdfQ==