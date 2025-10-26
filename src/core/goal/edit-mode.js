/**
 * Extract the text content of a task from a markdown line
 *
 * @param lineText The full text of the markdown line containing the task
 * @return The extracted task text or null if no task was found
 */
import { REGEX_GOAL } from "./regex-goal";
function extractTaskText(lineText) {
    if (!lineText)
        return null;
    const taskTextMatch = lineText.match(/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]\s*(.*?)$/);
    if (taskTextMatch && taskTextMatch[3]) {
        return taskTextMatch[3].trim();
    }
    return null;
}
/**
 * Extract the goal value from a task text
 * Supports only g::number or goal::number format
 *
 * @param taskText The task text to extract the goal from
 * @return The extracted goal value or null if no goal found
 */
function extractTaskSpecificGoal(taskText) {
    if (!taskText)
        return null;
    // Match only the patterns g::number or goal::number \b(g|goal):: {0,1}(\d+)\b
    const goalMatch = taskText.match(REGEX_GOAL);
    if (!goalMatch)
        return null;
    return Number(goalMatch[2]);
}
/**
 * Extract task text and goal information from a line
 *
 * @param lineText The full text of the markdown line containing the task
 * @return The extracted goal value or null if no goal found
 */
export function extractTaskAndGoalInfo(lineText) {
    if (!lineText)
        return null;
    // Extract task text
    const taskText = extractTaskText(lineText);
    if (!taskText)
        return null;
    // Check for goal in g::number or goal::number format
    return extractTaskSpecificGoal(taskText);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdC1tb2RlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZWRpdC1tb2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7OztHQUtHO0FBRUgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQztBQUUxQyxTQUFTLGVBQWUsQ0FBQyxRQUFnQjtJQUNyQyxJQUFJLENBQUMsUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRTNCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztJQUNqRixJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDbkMsT0FBTyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7S0FDbEM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBRUgsU0FBUyx1QkFBdUIsQ0FBQyxRQUFnQjtJQUM3QyxJQUFJLENBQUMsUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRTNCLDhFQUE4RTtJQUM5RSxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLElBQUksQ0FBQyxTQUFTO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFFNUIsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQztBQUVEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLHNCQUFzQixDQUFDLFFBQXVCO0lBQzFELElBQUksQ0FBQyxRQUFRO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFFM0Isb0JBQW9CO0lBQ3BCLE1BQU0sUUFBUSxHQUFHLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQyxJQUFJLENBQUMsUUFBUTtRQUFFLE9BQU8sSUFBSSxDQUFDO0lBRTNCLHFEQUFxRDtJQUNyRCxPQUFPLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQzdDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRXh0cmFjdCB0aGUgdGV4dCBjb250ZW50IG9mIGEgdGFzayBmcm9tIGEgbWFya2Rvd24gbGluZVxyXG4gKiBcclxuICogQHBhcmFtIGxpbmVUZXh0IFRoZSBmdWxsIHRleHQgb2YgdGhlIG1hcmtkb3duIGxpbmUgY29udGFpbmluZyB0aGUgdGFza1xyXG4gKiBAcmV0dXJuIFRoZSBleHRyYWN0ZWQgdGFzayB0ZXh0IG9yIG51bGwgaWYgbm8gdGFzayB3YXMgZm91bmRcclxuICovXHJcblxyXG5pbXBvcnQgeyBSRUdFWF9HT0FMIH0gZnJvbSBcIi4vcmVnZXgtZ29hbFwiO1xyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFRhc2tUZXh0KGxpbmVUZXh0OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGlmICghbGluZVRleHQpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IHRhc2tUZXh0TWF0Y2ggPSBsaW5lVGV4dC5tYXRjaCgvXltcXHN8XFx0XSooWy0qK118XFxkK1xcLilcXHNcXFsoLilcXF1cXHMqKC4qPykkLyk7XHJcbiAgICBpZiAodGFza1RleHRNYXRjaCAmJiB0YXNrVGV4dE1hdGNoWzNdKSB7XHJcbiAgICAgICAgcmV0dXJuIHRhc2tUZXh0TWF0Y2hbM10udHJpbSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdCB0aGUgZ29hbCB2YWx1ZSBmcm9tIGEgdGFzayB0ZXh0XHJcbiAqIFN1cHBvcnRzIG9ubHkgZzo6bnVtYmVyIG9yIGdvYWw6Om51bWJlciBmb3JtYXRcclxuICogXHJcbiAqIEBwYXJhbSB0YXNrVGV4dCBUaGUgdGFzayB0ZXh0IHRvIGV4dHJhY3QgdGhlIGdvYWwgZnJvbVxyXG4gKiBAcmV0dXJuIFRoZSBleHRyYWN0ZWQgZ29hbCB2YWx1ZSBvciBudWxsIGlmIG5vIGdvYWwgZm91bmRcclxuICovXHJcblxyXG5mdW5jdGlvbiBleHRyYWN0VGFza1NwZWNpZmljR29hbCh0YXNrVGV4dDogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XHJcbiAgICBpZiAoIXRhc2tUZXh0KSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAvLyBNYXRjaCBvbmx5IHRoZSBwYXR0ZXJucyBnOjpudW1iZXIgb3IgZ29hbDo6bnVtYmVyIFxcYihnfGdvYWwpOjogezAsMX0oXFxkKylcXGJcclxuICAgIGNvbnN0IGdvYWxNYXRjaCA9IHRhc2tUZXh0Lm1hdGNoKFJFR0VYX0dPQUwpO1xyXG4gICAgaWYgKCFnb2FsTWF0Y2gpIHJldHVybiBudWxsO1xyXG5cclxuICAgIHJldHVybiBOdW1iZXIoZ29hbE1hdGNoWzJdKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgdGFzayB0ZXh0IGFuZCBnb2FsIGluZm9ybWF0aW9uIGZyb20gYSBsaW5lXHJcbiAqIFxyXG4gKiBAcGFyYW0gbGluZVRleHQgVGhlIGZ1bGwgdGV4dCBvZiB0aGUgbWFya2Rvd24gbGluZSBjb250YWluaW5nIHRoZSB0YXNrXHJcbiAqIEByZXR1cm4gVGhlIGV4dHJhY3RlZCBnb2FsIHZhbHVlIG9yIG51bGwgaWYgbm8gZ29hbCBmb3VuZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RUYXNrQW5kR29hbEluZm8obGluZVRleHQ6IHN0cmluZyB8IG51bGwpOiBudW1iZXIgfCBudWxsIHtcclxuICAgIGlmICghbGluZVRleHQpIHJldHVybiBudWxsO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgdGFzayB0ZXh0XHJcbiAgICBjb25zdCB0YXNrVGV4dCA9IGV4dHJhY3RUYXNrVGV4dChsaW5lVGV4dCk7XHJcbiAgICBpZiAoIXRhc2tUZXh0KSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgZ29hbCBpbiBnOjpudW1iZXIgb3IgZ29hbDo6bnVtYmVyIGZvcm1hdFxyXG4gICAgcmV0dXJuIGV4dHJhY3RUYXNrU3BlY2lmaWNHb2FsKHRhc2tUZXh0KTtcclxufSJdfQ==