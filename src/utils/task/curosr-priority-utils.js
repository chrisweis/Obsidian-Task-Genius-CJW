import { priorityChangeAnnotation } from "../../editor-extensions/ui-widgets/priority-picker";
function setPriorityAtCursor(editor, priority) {
    var _a;
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const lineStart = editor.posToOffset({ line: cursor.line, ch: 0 });
    // Check if this line has a task
    const taskRegex = /^([\s|\t]*[-*+] \[.\].*?)(?:🔺|⏫|🔼|🔽|⏬️|\[#[A-C]\])?(\s*)$/;
    const match = line.match(taskRegex);
    if (match) {
        // Find the priority position
        const priorityRegex = /(?:🔺|⏫|🔼|🔽|⏬️|\[#[A-C]\])/;
        const priorityMatch = line.match(priorityRegex);
        // Replace any existing priority or add the new priority
        // @ts-ignore
        const cm = editor.cm;
        if (priorityMatch) {
            // Replace existing priority
            cm.dispatch({
                changes: {
                    from: lineStart + (priorityMatch.index || 0),
                    to: lineStart +
                        (priorityMatch.index || 0) +
                        (((_a = priorityMatch[0]) === null || _a === void 0 ? void 0 : _a.length) || 0),
                    insert: priority,
                },
                annotations: [priorityChangeAnnotation.of(true)],
            });
        }
        else {
            // Add new priority after task text
            const taskTextEnd = lineStart + match[1].length;
            cm.dispatch({
                changes: {
                    from: taskTextEnd,
                    to: taskTextEnd,
                    insert: ` ${priority}`,
                },
                annotations: [priorityChangeAnnotation.of(true)],
            });
        }
    }
}
// Helper method to remove priority at cursor position
function removePriorityAtCursor(editor) {
    var _a;
    const cursor = editor.getCursor();
    const line = editor.getLine(cursor.line);
    const lineStart = editor.posToOffset({ line: cursor.line, ch: 0 });
    // Check if this line has a task with priority
    const priorityRegex = /(?:🔺|⏫|🔼|🔽|⏬️|\[#[A-C]\])/;
    const match = line.match(priorityRegex);
    if (match) {
        // Remove the priority
        // @ts-ignore
        const cm = editor.cm;
        cm.dispatch({
            changes: {
                from: lineStart + (match.index || 0),
                to: lineStart + (match.index || 0) + (((_a = match[0]) === null || _a === void 0 ? void 0 : _a.length) || 0),
                insert: "",
            },
            annotations: [priorityChangeAnnotation.of(true)],
        });
    }
}
export { setPriorityAtCursor, removePriorityAtCursor };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyb3NyLXByaW9yaXR5LXV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3Vyb3NyLXByaW9yaXR5LXV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLFNBQVMsbUJBQW1CLENBQUMsTUFBYyxFQUFFLFFBQWdCOztJQUM1RCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRW5FLGdDQUFnQztJQUNoQyxNQUFNLFNBQVMsR0FDZCw4REFBOEQsQ0FBQztJQUNoRSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRXBDLElBQUksS0FBSyxFQUFFO1FBQ1YsNkJBQTZCO1FBQzdCLE1BQU0sYUFBYSxHQUFHLDhCQUE4QixDQUFDO1FBQ3JELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFaEQsd0RBQXdEO1FBQ3hELGFBQWE7UUFDYixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFBZ0IsQ0FBQztRQUNuQyxJQUFJLGFBQWEsRUFBRTtZQUNsQiw0QkFBNEI7WUFDNUIsRUFBRSxDQUFDLFFBQVEsQ0FBQztnQkFDWCxPQUFPLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLFNBQVMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO29CQUM1QyxFQUFFLEVBQ0QsU0FBUzt3QkFDVCxDQUFDLGFBQWEsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDO3dCQUMxQixDQUFDLENBQUEsTUFBQSxhQUFhLENBQUMsQ0FBQyxDQUFDLDBDQUFFLE1BQU0sS0FBSSxDQUFDLENBQUM7b0JBQ2hDLE1BQU0sRUFBRSxRQUFRO2lCQUNoQjtnQkFDRCxXQUFXLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEQsQ0FBQyxDQUFDO1NBQ0g7YUFBTTtZQUNOLG1DQUFtQztZQUNuQyxNQUFNLFdBQVcsR0FBRyxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztZQUNoRCxFQUFFLENBQUMsUUFBUSxDQUFDO2dCQUNYLE9BQU8sRUFBRTtvQkFDUixJQUFJLEVBQUUsV0FBVztvQkFDakIsRUFBRSxFQUFFLFdBQVc7b0JBQ2YsTUFBTSxFQUFFLElBQUksUUFBUSxFQUFFO2lCQUN0QjtnQkFDRCxXQUFXLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDaEQsQ0FBQyxDQUFDO1NBQ0g7S0FDRDtBQUNGLENBQUM7QUFFRCxzREFBc0Q7QUFDdEQsU0FBUyxzQkFBc0IsQ0FBQyxNQUFjOztJQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDbEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDekMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBRW5FLDhDQUE4QztJQUM5QyxNQUFNLGFBQWEsR0FBRyw4QkFBOEIsQ0FBQztJQUNyRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBRXhDLElBQUksS0FBSyxFQUFFO1FBQ1Ysc0JBQXNCO1FBQ3RCLGFBQWE7UUFDYixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsRUFBZ0IsQ0FBQztRQUNuQyxFQUFFLENBQUMsUUFBUSxDQUFDO1lBQ1gsT0FBTyxFQUFFO2dCQUNSLElBQUksRUFBRSxTQUFTLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztnQkFDcEMsRUFBRSxFQUFFLFNBQVMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBLE1BQUEsS0FBSyxDQUFDLENBQUMsQ0FBQywwQ0FBRSxNQUFNLEtBQUksQ0FBQyxDQUFDO2dCQUM1RCxNQUFNLEVBQUUsRUFBRTthQUNWO1lBQ0QsV0FBVyxFQUFFLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQ2hELENBQUMsQ0FBQztLQUNIO0FBQ0YsQ0FBQztBQUVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxzQkFBc0IsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRWRpdG9yIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEVkaXRvclZpZXcgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBwcmlvcml0eUNoYW5nZUFubm90YXRpb24gfSBmcm9tIFwiLi4vLi4vZWRpdG9yLWV4dGVuc2lvbnMvdWktd2lkZ2V0cy9wcmlvcml0eS1waWNrZXJcIjtcclxuXHJcbmZ1bmN0aW9uIHNldFByaW9yaXR5QXRDdXJzb3IoZWRpdG9yOiBFZGl0b3IsIHByaW9yaXR5OiBzdHJpbmcpIHtcclxuXHRjb25zdCBjdXJzb3IgPSBlZGl0b3IuZ2V0Q3Vyc29yKCk7XHJcblx0Y29uc3QgbGluZSA9IGVkaXRvci5nZXRMaW5lKGN1cnNvci5saW5lKTtcclxuXHRjb25zdCBsaW5lU3RhcnQgPSBlZGl0b3IucG9zVG9PZmZzZXQoeyBsaW5lOiBjdXJzb3IubGluZSwgY2g6IDAgfSk7XHJcblxyXG5cdC8vIENoZWNrIGlmIHRoaXMgbGluZSBoYXMgYSB0YXNrXHJcblx0Y29uc3QgdGFza1JlZ2V4ID1cclxuXHRcdC9eKFtcXHN8XFx0XSpbLSorXSBcXFsuXFxdLio/KSg/OvCflLp84o+rfPCflLx88J+UvXzij6zvuI98XFxbI1tBLUNdXFxdKT8oXFxzKikkLztcclxuXHRjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2godGFza1JlZ2V4KTtcclxuXHJcblx0aWYgKG1hdGNoKSB7XHJcblx0XHQvLyBGaW5kIHRoZSBwcmlvcml0eSBwb3NpdGlvblxyXG5cdFx0Y29uc3QgcHJpb3JpdHlSZWdleCA9IC8oPzrwn5S6fOKPq3zwn5S8fPCflL184o+s77iPfFxcWyNbQS1DXVxcXSkvO1xyXG5cdFx0Y29uc3QgcHJpb3JpdHlNYXRjaCA9IGxpbmUubWF0Y2gocHJpb3JpdHlSZWdleCk7XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSBhbnkgZXhpc3RpbmcgcHJpb3JpdHkgb3IgYWRkIHRoZSBuZXcgcHJpb3JpdHlcclxuXHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdGNvbnN0IGNtID0gZWRpdG9yLmNtIGFzIEVkaXRvclZpZXc7XHJcblx0XHRpZiAocHJpb3JpdHlNYXRjaCkge1xyXG5cdFx0XHQvLyBSZXBsYWNlIGV4aXN0aW5nIHByaW9yaXR5XHJcblx0XHRcdGNtLmRpc3BhdGNoKHtcclxuXHRcdFx0XHRjaGFuZ2VzOiB7XHJcblx0XHRcdFx0XHRmcm9tOiBsaW5lU3RhcnQgKyAocHJpb3JpdHlNYXRjaC5pbmRleCB8fCAwKSxcclxuXHRcdFx0XHRcdHRvOlxyXG5cdFx0XHRcdFx0XHRsaW5lU3RhcnQgK1xyXG5cdFx0XHRcdFx0XHQocHJpb3JpdHlNYXRjaC5pbmRleCB8fCAwKSArXHJcblx0XHRcdFx0XHRcdChwcmlvcml0eU1hdGNoWzBdPy5sZW5ndGggfHwgMCksXHJcblx0XHRcdFx0XHRpbnNlcnQ6IHByaW9yaXR5LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5ub3RhdGlvbnM6IFtwcmlvcml0eUNoYW5nZUFubm90YXRpb24ub2YodHJ1ZSldLFxyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEFkZCBuZXcgcHJpb3JpdHkgYWZ0ZXIgdGFzayB0ZXh0XHJcblx0XHRcdGNvbnN0IHRhc2tUZXh0RW5kID0gbGluZVN0YXJ0ICsgbWF0Y2hbMV0ubGVuZ3RoO1xyXG5cdFx0XHRjbS5kaXNwYXRjaCh7XHJcblx0XHRcdFx0Y2hhbmdlczoge1xyXG5cdFx0XHRcdFx0ZnJvbTogdGFza1RleHRFbmQsXHJcblx0XHRcdFx0XHR0bzogdGFza1RleHRFbmQsXHJcblx0XHRcdFx0XHRpbnNlcnQ6IGAgJHtwcmlvcml0eX1gLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0YW5ub3RhdGlvbnM6IFtwcmlvcml0eUNoYW5nZUFubm90YXRpb24ub2YodHJ1ZSldLFxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbi8vIEhlbHBlciBtZXRob2QgdG8gcmVtb3ZlIHByaW9yaXR5IGF0IGN1cnNvciBwb3NpdGlvblxyXG5mdW5jdGlvbiByZW1vdmVQcmlvcml0eUF0Q3Vyc29yKGVkaXRvcjogRWRpdG9yKSB7XHJcblx0Y29uc3QgY3Vyc29yID0gZWRpdG9yLmdldEN1cnNvcigpO1xyXG5cdGNvbnN0IGxpbmUgPSBlZGl0b3IuZ2V0TGluZShjdXJzb3IubGluZSk7XHJcblx0Y29uc3QgbGluZVN0YXJ0ID0gZWRpdG9yLnBvc1RvT2Zmc2V0KHsgbGluZTogY3Vyc29yLmxpbmUsIGNoOiAwIH0pO1xyXG5cclxuXHQvLyBDaGVjayBpZiB0aGlzIGxpbmUgaGFzIGEgdGFzayB3aXRoIHByaW9yaXR5XHJcblx0Y29uc3QgcHJpb3JpdHlSZWdleCA9IC8oPzrwn5S6fOKPq3zwn5S8fPCflL184o+s77iPfFxcWyNbQS1DXVxcXSkvO1xyXG5cdGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaChwcmlvcml0eVJlZ2V4KTtcclxuXHJcblx0aWYgKG1hdGNoKSB7XHJcblx0XHQvLyBSZW1vdmUgdGhlIHByaW9yaXR5XHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRjb25zdCBjbSA9IGVkaXRvci5jbSBhcyBFZGl0b3JWaWV3O1xyXG5cdFx0Y20uZGlzcGF0Y2goe1xyXG5cdFx0XHRjaGFuZ2VzOiB7XHJcblx0XHRcdFx0ZnJvbTogbGluZVN0YXJ0ICsgKG1hdGNoLmluZGV4IHx8IDApLFxyXG5cdFx0XHRcdHRvOiBsaW5lU3RhcnQgKyAobWF0Y2guaW5kZXggfHwgMCkgKyAobWF0Y2hbMF0/Lmxlbmd0aCB8fCAwKSxcclxuXHRcdFx0XHRpbnNlcnQ6IFwiXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdGFubm90YXRpb25zOiBbcHJpb3JpdHlDaGFuZ2VBbm5vdGF0aW9uLm9mKHRydWUpXSxcclxuXHRcdH0pO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IHsgc2V0UHJpb3JpdHlBdEN1cnNvciwgcmVtb3ZlUHJpb3JpdHlBdEN1cnNvciB9O1xyXG4iXX0=