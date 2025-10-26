/**
 * Task migration utilities for handling the transition from legacy to new task structure
 */
import { __rest } from "tslib";
/** Get a property value from a task, handling both old and new structures */
export function getTaskProperty(task, key) {
    // Check if this is a BaseTask property
    if (key in task && typeof task[key] !== "undefined") {
        return task[key];
    }
    // Check if this is a metadata property on new structure
    if ("metadata" in task && task.metadata && key in task.metadata) {
        return task.metadata[key];
    }
    // Fallback for legacy structure
    return task[key];
}
/** Set a property value on a task, handling both old and new structures */
export function setTaskProperty(task, key, value) {
    if (!task.metadata) {
        task.metadata = {};
    }
    task.metadata[key] = value;
}
/** Create a new task with the new structure from legacy data */
export function createTaskFromLegacy(legacyData) {
    const { id, content, filePath, line, completed, status, originalMarkdown } = legacyData, metadata = __rest(legacyData, ["id", "content", "filePath", "line", "completed", "status", "originalMarkdown"]);
    return {
        id,
        content,
        filePath,
        line,
        completed,
        status,
        originalMarkdown,
        metadata: Object.assign(Object.assign({}, metadata), { 
            // Ensure required array fields are always arrays
            tags: metadata.tags || [], children: metadata.children || [] }),
    };
}
/** Convert a task to legacy format for backward compatibility */
export function taskToLegacy(task) {
    return Object.assign(Object.assign({}, task), task.metadata);
}
/** Check if a task uses the new structure */
export function isNewTaskStructure(task) {
    return "metadata" in task && typeof task.metadata === "object";
}
/** Safely access metadata properties */
export function getMetadataProperty(task, key) {
    var _a;
    if (isNewTaskStructure(task)) {
        return (_a = task.metadata) === null || _a === void 0 ? void 0 : _a[key];
    }
    return task[key];
}
/** Safely set metadata properties */
export function setMetadataProperty(task, key, value) {
    if (isNewTaskStructure(task)) {
        if (!task.metadata) {
            task.metadata = {};
        }
        task.metadata[key] = value;
    }
    else {
        task[key] = value;
    }
}
/** Create an empty task with the new structure */
export function createEmptyTask(baseData) {
    return {
        id: baseData.id || "",
        content: baseData.content || "",
        filePath: baseData.filePath || "",
        line: baseData.line || 0,
        completed: baseData.completed || false,
        status: baseData.status || " ",
        originalMarkdown: baseData.originalMarkdown || "",
        metadata: {
            tags: [],
            children: [],
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1taWdyYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0YXNrLW1pZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRzs7QUFVSCw2RUFBNkU7QUFDN0UsTUFBTSxVQUFVLGVBQWUsQ0FDOUIsSUFBdUIsRUFDdkIsR0FBTTtJQUVOLHVDQUF1QztJQUN2QyxJQUFJLEdBQUcsSUFBSSxJQUFJLElBQUksT0FBUSxJQUFZLENBQUMsR0FBRyxDQUFDLEtBQUssV0FBVyxFQUFFO1FBQzdELE9BQVEsSUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0tBQzFCO0lBRUQsd0RBQXdEO0lBQ3hELElBQUksVUFBVSxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFpQyxDQUFDLENBQUM7S0FDeEQ7SUFFRCxnQ0FBZ0M7SUFDaEMsT0FBUSxJQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0IsQ0FBQztBQUVELDJFQUEyRTtBQUMzRSxNQUFNLFVBQVUsZUFBZSxDQUM5QixJQUFVLEVBQ1YsR0FBTSxFQUNOLEtBQThCO0lBRTlCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1FBQ25CLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBMEIsQ0FBQztLQUMzQztJQUNELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQzVCLENBQUM7QUFFRCxnRUFBZ0U7QUFDaEUsTUFBTSxVQUFVLG9CQUFvQixDQUFDLFVBQXNCO0lBQzFELE1BQU0sRUFDTCxFQUFFLEVBQ0YsT0FBTyxFQUNQLFFBQVEsRUFDUixJQUFJLEVBQ0osU0FBUyxFQUNULE1BQU0sRUFDTixnQkFBZ0IsS0FFYixVQUFVLEVBRFYsUUFBUSxVQUNSLFVBQVUsRUFUUixnRkFTTCxDQUFhLENBQUM7SUFFZixPQUFPO1FBQ04sRUFBRTtRQUNGLE9BQU87UUFDUCxRQUFRO1FBQ1IsSUFBSTtRQUNKLFNBQVM7UUFDVCxNQUFNO1FBQ04sZ0JBQWdCO1FBQ2hCLFFBQVEsa0NBRUosUUFBUTtZQUNYLGlEQUFpRDtZQUNqRCxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLEVBQ3pCLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxJQUFJLEVBQUUsR0FDakM7S0FDRCxDQUFDO0FBQ0gsQ0FBQztBQUVELGlFQUFpRTtBQUNqRSxNQUFNLFVBQVUsWUFBWSxDQUFDLElBQVU7SUFDdEMsdUNBQ0ksSUFBSSxHQUNKLElBQUksQ0FBQyxRQUFRLEVBQ2Y7QUFDSCxDQUFDO0FBRUQsNkNBQTZDO0FBQzdDLE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxJQUF1QjtJQUN6RCxPQUFPLFVBQVUsSUFBSSxJQUFJLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsQ0FBQztBQUNoRSxDQUFDO0FBRUQsd0NBQXdDO0FBQ3hDLE1BQU0sVUFBVSxtQkFBbUIsQ0FDbEMsSUFBdUIsRUFDdkIsR0FBTTs7SUFFTixJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFO1FBQzdCLE9BQU8sTUFBQSxJQUFJLENBQUMsUUFBUSwwQ0FBRyxHQUFHLENBQUMsQ0FBQztLQUM1QjtJQUNELE9BQVEsSUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzNCLENBQUM7QUFFRCxxQ0FBcUM7QUFDckMsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxJQUF1QixFQUN2QixHQUFNLEVBQ04sS0FBOEI7SUFFOUIsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUM3QixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLEVBQTBCLENBQUM7U0FDM0M7UUFDRCxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztLQUMzQjtTQUFNO1FBQ0wsSUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQztLQUMzQjtBQUNGLENBQUM7QUFFRCxrREFBa0Q7QUFDbEQsTUFBTSxVQUFVLGVBQWUsQ0FBQyxRQUEyQjtJQUMxRCxPQUFPO1FBQ04sRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFLElBQUksRUFBRTtRQUNyQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU8sSUFBSSxFQUFFO1FBQy9CLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUSxJQUFJLEVBQUU7UUFDakMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQztRQUN4QixTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVMsSUFBSSxLQUFLO1FBQ3RDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTSxJQUFJLEdBQUc7UUFDOUIsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLGdCQUFnQixJQUFJLEVBQUU7UUFDakQsUUFBUSxFQUFFO1lBQ1QsSUFBSSxFQUFFLEVBQUU7WUFDUixRQUFRLEVBQUUsRUFBRTtTQUNaO0tBQ0QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogVGFzayBtaWdyYXRpb24gdXRpbGl0aWVzIGZvciBoYW5kbGluZyB0aGUgdHJhbnNpdGlvbiBmcm9tIGxlZ2FjeSB0byBuZXcgdGFzayBzdHJ1Y3R1cmVcclxuICovXHJcblxyXG5pbXBvcnQge1xyXG5cdFRhc2ssXHJcblx0TGVnYWN5VGFzayxcclxuXHRTdGFuZGFyZFRhc2tNZXRhZGF0YSxcclxuXHRCYXNlVGFzayxcclxuXHRUYXNrRmllbGROYW1lLFxyXG59IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcblxyXG4vKiogR2V0IGEgcHJvcGVydHkgdmFsdWUgZnJvbSBhIHRhc2ssIGhhbmRsaW5nIGJvdGggb2xkIGFuZCBuZXcgc3RydWN0dXJlcyAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGFza1Byb3BlcnR5PEsgZXh0ZW5kcyBUYXNrRmllbGROYW1lPihcclxuXHR0YXNrOiBUYXNrIHwgTGVnYWN5VGFzayxcclxuXHRrZXk6IEtcclxuKTogYW55IHtcclxuXHQvLyBDaGVjayBpZiB0aGlzIGlzIGEgQmFzZVRhc2sgcHJvcGVydHlcclxuXHRpZiAoa2V5IGluIHRhc2sgJiYgdHlwZW9mICh0YXNrIGFzIGFueSlba2V5XSAhPT0gXCJ1bmRlZmluZWRcIikge1xyXG5cdFx0cmV0dXJuICh0YXNrIGFzIGFueSlba2V5XTtcclxuXHR9XHJcblxyXG5cdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBtZXRhZGF0YSBwcm9wZXJ0eSBvbiBuZXcgc3RydWN0dXJlXHJcblx0aWYgKFwibWV0YWRhdGFcIiBpbiB0YXNrICYmIHRhc2subWV0YWRhdGEgJiYga2V5IGluIHRhc2subWV0YWRhdGEpIHtcclxuXHRcdHJldHVybiB0YXNrLm1ldGFkYXRhW2tleSBhcyBrZXlvZiBTdGFuZGFyZFRhc2tNZXRhZGF0YV07XHJcblx0fVxyXG5cclxuXHQvLyBGYWxsYmFjayBmb3IgbGVnYWN5IHN0cnVjdHVyZVxyXG5cdHJldHVybiAodGFzayBhcyBhbnkpW2tleV07XHJcbn1cclxuXHJcbi8qKiBTZXQgYSBwcm9wZXJ0eSB2YWx1ZSBvbiBhIHRhc2ssIGhhbmRsaW5nIGJvdGggb2xkIGFuZCBuZXcgc3RydWN0dXJlcyAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2V0VGFza1Byb3BlcnR5PEsgZXh0ZW5kcyBrZXlvZiBTdGFuZGFyZFRhc2tNZXRhZGF0YT4oXHJcblx0dGFzazogVGFzayxcclxuXHRrZXk6IEssXHJcblx0dmFsdWU6IFN0YW5kYXJkVGFza01ldGFkYXRhW0tdXHJcbik6IHZvaWQge1xyXG5cdGlmICghdGFzay5tZXRhZGF0YSkge1xyXG5cdFx0dGFzay5tZXRhZGF0YSA9IHt9IGFzIFN0YW5kYXJkVGFza01ldGFkYXRhO1xyXG5cdH1cclxuXHR0YXNrLm1ldGFkYXRhW2tleV0gPSB2YWx1ZTtcclxufVxyXG5cclxuLyoqIENyZWF0ZSBhIG5ldyB0YXNrIHdpdGggdGhlIG5ldyBzdHJ1Y3R1cmUgZnJvbSBsZWdhY3kgZGF0YSAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlVGFza0Zyb21MZWdhY3kobGVnYWN5RGF0YTogTGVnYWN5VGFzayk6IFRhc2sge1xyXG5cdGNvbnN0IHtcclxuXHRcdGlkLFxyXG5cdFx0Y29udGVudCxcclxuXHRcdGZpbGVQYXRoLFxyXG5cdFx0bGluZSxcclxuXHRcdGNvbXBsZXRlZCxcclxuXHRcdHN0YXR1cyxcclxuXHRcdG9yaWdpbmFsTWFya2Rvd24sXHJcblx0XHQuLi5tZXRhZGF0YVxyXG5cdH0gPSBsZWdhY3lEYXRhO1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0aWQsXHJcblx0XHRjb250ZW50LFxyXG5cdFx0ZmlsZVBhdGgsXHJcblx0XHRsaW5lLFxyXG5cdFx0Y29tcGxldGVkLFxyXG5cdFx0c3RhdHVzLFxyXG5cdFx0b3JpZ2luYWxNYXJrZG93bixcclxuXHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdC8vIEluY2x1ZGUgYWxsIG1ldGFkYXRhIGZpZWxkcyB3aXRoIHByb3BlciBkZWZhdWx0c1xyXG5cdFx0XHQuLi5tZXRhZGF0YSxcclxuXHRcdFx0Ly8gRW5zdXJlIHJlcXVpcmVkIGFycmF5IGZpZWxkcyBhcmUgYWx3YXlzIGFycmF5c1xyXG5cdFx0XHR0YWdzOiBtZXRhZGF0YS50YWdzIHx8IFtdLFxyXG5cdFx0XHRjaGlsZHJlbjogbWV0YWRhdGEuY2hpbGRyZW4gfHwgW10sXHJcblx0XHR9LFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKiBDb252ZXJ0IGEgdGFzayB0byBsZWdhY3kgZm9ybWF0IGZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5ICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0YXNrVG9MZWdhY3kodGFzazogVGFzayk6IExlZ2FjeVRhc2sge1xyXG5cdHJldHVybiB7XHJcblx0XHQuLi50YXNrLFxyXG5cdFx0Li4udGFzay5tZXRhZGF0YSxcclxuXHR9O1xyXG59XHJcblxyXG4vKiogQ2hlY2sgaWYgYSB0YXNrIHVzZXMgdGhlIG5ldyBzdHJ1Y3R1cmUgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzTmV3VGFza1N0cnVjdHVyZSh0YXNrOiBUYXNrIHwgTGVnYWN5VGFzayk6IHRhc2sgaXMgVGFzayB7XHJcblx0cmV0dXJuIFwibWV0YWRhdGFcIiBpbiB0YXNrICYmIHR5cGVvZiB0YXNrLm1ldGFkYXRhID09PSBcIm9iamVjdFwiO1xyXG59XHJcblxyXG4vKiogU2FmZWx5IGFjY2VzcyBtZXRhZGF0YSBwcm9wZXJ0aWVzICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRNZXRhZGF0YVByb3BlcnR5PEsgZXh0ZW5kcyBrZXlvZiBTdGFuZGFyZFRhc2tNZXRhZGF0YT4oXHJcblx0dGFzazogVGFzayB8IExlZ2FjeVRhc2ssXHJcblx0a2V5OiBLXHJcbik6IFN0YW5kYXJkVGFza01ldGFkYXRhW0tdIHwgdW5kZWZpbmVkIHtcclxuXHRpZiAoaXNOZXdUYXNrU3RydWN0dXJlKHRhc2spKSB7XHJcblx0XHRyZXR1cm4gdGFzay5tZXRhZGF0YT8uW2tleV07XHJcblx0fVxyXG5cdHJldHVybiAodGFzayBhcyBhbnkpW2tleV07XHJcbn1cclxuXHJcbi8qKiBTYWZlbHkgc2V0IG1ldGFkYXRhIHByb3BlcnRpZXMgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHNldE1ldGFkYXRhUHJvcGVydHk8SyBleHRlbmRzIGtleW9mIFN0YW5kYXJkVGFza01ldGFkYXRhPihcclxuXHR0YXNrOiBUYXNrIHwgTGVnYWN5VGFzayxcclxuXHRrZXk6IEssXHJcblx0dmFsdWU6IFN0YW5kYXJkVGFza01ldGFkYXRhW0tdXHJcbik6IHZvaWQge1xyXG5cdGlmIChpc05ld1Rhc2tTdHJ1Y3R1cmUodGFzaykpIHtcclxuXHRcdGlmICghdGFzay5tZXRhZGF0YSkge1xyXG5cdFx0XHR0YXNrLm1ldGFkYXRhID0ge30gYXMgU3RhbmRhcmRUYXNrTWV0YWRhdGE7XHJcblx0XHR9XHJcblx0XHR0YXNrLm1ldGFkYXRhW2tleV0gPSB2YWx1ZTtcclxuXHR9IGVsc2Uge1xyXG5cdFx0KHRhc2sgYXMgYW55KVtrZXldID0gdmFsdWU7XHJcblx0fVxyXG59XHJcblxyXG4vKiogQ3JlYXRlIGFuIGVtcHR5IHRhc2sgd2l0aCB0aGUgbmV3IHN0cnVjdHVyZSAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRW1wdHlUYXNrKGJhc2VEYXRhOiBQYXJ0aWFsPEJhc2VUYXNrPik6IFRhc2sge1xyXG5cdHJldHVybiB7XHJcblx0XHRpZDogYmFzZURhdGEuaWQgfHwgXCJcIixcclxuXHRcdGNvbnRlbnQ6IGJhc2VEYXRhLmNvbnRlbnQgfHwgXCJcIixcclxuXHRcdGZpbGVQYXRoOiBiYXNlRGF0YS5maWxlUGF0aCB8fCBcIlwiLFxyXG5cdFx0bGluZTogYmFzZURhdGEubGluZSB8fCAwLFxyXG5cdFx0Y29tcGxldGVkOiBiYXNlRGF0YS5jb21wbGV0ZWQgfHwgZmFsc2UsXHJcblx0XHRzdGF0dXM6IGJhc2VEYXRhLnN0YXR1cyB8fCBcIiBcIixcclxuXHRcdG9yaWdpbmFsTWFya2Rvd246IGJhc2VEYXRhLm9yaWdpbmFsTWFya2Rvd24gfHwgXCJcIixcclxuXHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHR9LFxyXG5cdH07XHJcbn1cclxuIl19