/**
 * Utility class for Canvas task operations
 * Provides common functionality for Canvas task manipulation across different executors
 */
import { __awaiter } from "tslib";
/**
 * Utility class for Canvas task operations
 */
export class CanvasTaskOperationUtils {
    constructor(app) {
        this.app = app;
    }
    /**
     * Find or create a target text node in a Canvas file
     */
    findOrCreateTargetTextNode(filePath, targetNodeId, targetSection) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = this.app.vault.getFileByPath(filePath);
                if (!file) {
                    return null;
                }
                const content = yield this.app.vault.read(file);
                const canvasData = JSON.parse(content);
                let targetNode;
                if (targetNodeId) {
                    // Find existing node by ID
                    const existingNode = canvasData.nodes.find((node) => node.type === "text" && node.id === targetNodeId);
                    if (!existingNode) {
                        return null;
                    }
                    targetNode = existingNode;
                }
                else {
                    // Find node by section or create new one
                    if (targetSection) {
                        const nodeWithSection = canvasData.nodes.find((node) => node.type === "text" &&
                            node.text
                                .toLowerCase()
                                .includes(targetSection.toLowerCase()));
                        if (nodeWithSection) {
                            targetNode = nodeWithSection;
                        }
                        else {
                            // Create new node with section
                            targetNode = this.createNewTextNode(canvasData, targetSection);
                            canvasData.nodes.push(targetNode);
                        }
                    }
                    else {
                        // Create new node without section
                        targetNode = this.createNewTextNode(canvasData);
                        canvasData.nodes.push(targetNode);
                    }
                }
                return { canvasData, textNode: targetNode };
            }
            catch (error) {
                console.error("Error finding/creating target text node:", error);
                return null;
            }
        });
    }
    /**
     * Insert a task into a specific section within a text node
     */
    insertTaskIntoSection(textNode, taskContent, targetSection) {
        try {
            const lines = textNode.text.split("\n");
            if (targetSection) {
                // Find the target section and insert after it
                const sectionIndex = this.findSectionIndex(lines, targetSection);
                if (sectionIndex >= 0) {
                    // Find the appropriate insertion point after the section header
                    let insertIndex = sectionIndex + 1;
                    // Skip any empty lines after the section header
                    while (insertIndex < lines.length &&
                        lines[insertIndex].trim() === "") {
                        insertIndex++;
                    }
                    // Insert the task content
                    lines.splice(insertIndex, 0, taskContent);
                }
                else {
                    // Section not found, create it and add the task
                    if (textNode.text.trim()) {
                        lines.push("", `## ${targetSection}`, taskContent);
                    }
                    else {
                        lines.splice(0, 1, `## ${targetSection}`, taskContent);
                    }
                }
            }
            else {
                // Add at the end of the text node
                if (textNode.text.trim()) {
                    lines.push(taskContent);
                }
                else {
                    lines[0] = taskContent;
                }
            }
            // Update the text node content
            textNode.text = lines.join("\n");
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: `Error inserting task into section: ${error.message}`,
            };
        }
    }
    /**
     * Format a task for Canvas storage
     */
    formatTaskForCanvas(task, preserveMetadata = true) {
        if (task.originalMarkdown && preserveMetadata) {
            return task.originalMarkdown;
        }
        const status = task.completed ? "x" : " ";
        let formatted = `- [${status}] ${task.content}`;
        if (preserveMetadata && task.metadata) {
            // Add basic metadata
            const metadata = [];
            if (task.metadata.dueDate) {
                const dueDate = new Date(task.metadata.dueDate)
                    .toISOString()
                    .split("T")[0];
                metadata.push(`📅 ${dueDate}`);
            }
            if (task.metadata.priority && task.metadata.priority > 0) {
                const priorityEmoji = this.getPriorityEmoji(task.metadata.priority);
                if (priorityEmoji) {
                    metadata.push(priorityEmoji);
                }
            }
            if (task.metadata.project) {
                metadata.push(`#project/${task.metadata.project}`);
            }
            if (task.metadata.context) {
                metadata.push(`@${task.metadata.context}`);
            }
            if (metadata.length > 0) {
                formatted += ` ${metadata.join(" ")}`;
            }
        }
        return formatted;
    }
    /**
     * Create a new text node for Canvas
     */
    createNewTextNode(canvasData, initialContent) {
        // Generate a unique ID for the new node
        const nodeId = `task-node-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 11)}`;
        // Find a good position for the new node (avoid overlaps)
        const existingNodes = canvasData.nodes;
        let x = 0;
        let y = 0;
        if (existingNodes.length > 0) {
            // Position new node to the right of existing nodes
            const maxX = Math.max(...existingNodes.map((node) => node.x + node.width));
            x = maxX + 50;
        }
        const text = initialContent ? `## ${initialContent}\n\n` : "";
        return {
            type: "text",
            id: nodeId,
            x,
            y,
            width: 250,
            height: 60,
            text,
        };
    }
    /**
     * Find section index in text lines
     */
    findSectionIndex(lines, sectionName) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Check for markdown headings
            if (line.startsWith("#") &&
                line.toLowerCase().includes(sectionName.toLowerCase())) {
                return i;
            }
        }
        return -1;
    }
    /**
     * Get priority emoji based on priority level
     */
    getPriorityEmoji(priority) {
        switch (priority) {
            case 1:
                return "🔽"; // Low
            case 2:
                return ""; // Normal (no emoji)
            case 3:
                return "🔼"; // Medium
            case 4:
                return "⏫"; // High
            case 5:
                return "🔺"; // Highest
            default:
                return "";
        }
    }
    /**
     * Save Canvas data to file
     */
    saveCanvasData(filePath, canvasData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const file = this.app.vault.getFileByPath(filePath);
                if (!file) {
                    return {
                        success: false,
                        error: `Canvas file not found: ${filePath}`,
                    };
                }
                const updatedContent = JSON.stringify(canvasData, null, 2);
                yield this.app.vault.modify(file, updatedContent);
                return {
                    success: true,
                    updatedContent,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error saving Canvas data: ${error.message}`,
                };
            }
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLW9wZXJhdGlvbi11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhbnZhcy1vcGVyYXRpb24tdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQVlIOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHdCQUF3QjtJQUNwQyxZQUFvQixHQUFRO1FBQVIsUUFBRyxHQUFILEdBQUcsQ0FBSztJQUFHLENBQUM7SUFFaEM7O09BRUc7SUFDVSwwQkFBMEIsQ0FDdEMsUUFBZ0IsRUFDaEIsWUFBcUIsRUFDckIsYUFBc0I7O1lBRXRCLElBQUk7Z0JBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNwRCxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUNWLE9BQU8sSUFBSSxDQUFDO2lCQUNaO2dCQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLFVBQVUsR0FBZSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUVuRCxJQUFJLFVBQTBCLENBQUM7Z0JBRS9CLElBQUksWUFBWSxFQUFFO29CQUNqQiwyQkFBMkI7b0JBQzNCLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUN6QyxDQUFDLElBQUksRUFBMEIsRUFBRSxDQUNoQyxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sSUFBSSxJQUFJLENBQUMsRUFBRSxLQUFLLFlBQVksQ0FDakQsQ0FBQztvQkFFRixJQUFJLENBQUMsWUFBWSxFQUFFO3dCQUNsQixPQUFPLElBQUksQ0FBQztxQkFDWjtvQkFFRCxVQUFVLEdBQUcsWUFBWSxDQUFDO2lCQUMxQjtxQkFBTTtvQkFDTix5Q0FBeUM7b0JBQ3pDLElBQUksYUFBYSxFQUFFO3dC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LEdBQUcsQ0FBQyxDQUFDLE9BQU87WUFDcEIsS0FBSyxDQUFDO2dCQUNMLE9BQU8sSUFBSSxDQUFDLENBQUMsVUFBVTtZQUN4QjtnQkFDQyxPQUFPLEVBQUUsQ0FBQztTQUNYO0lBQ0YsQ0FBQztJQUVEOztPQUVHO0lBQ1UsY0FBYyxDQUMxQixRQUFnQixFQUNoQixVQUFzQjs7WUFFdEIsSUFBSTtnQkFDSCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxJQUFJLEVBQUU7b0JBQ1YsT0FBTzt3QkFDTixPQUFPLEVBQUUsS0FBSzt3QkFDZCxLQUFLLEVBQUUsMEJBQTBCLFFBQVEsRUFBRTtxQkFDM0MsQ0FBQztpQkFDRjtnQkFFRCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzNELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztnQkFFbEQsT0FBTztvQkFDTixPQUFPLEVBQUUsSUFBSTtvQkFDYixjQUFjO2lCQUNkLENBQUM7YUFDRjtZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNmLE9BQU87b0JBQ04sT0FBTyxFQUFFLEtBQUs7b0JBQ2QsS0FBSyxFQUFFLDZCQUE2QixLQUFLLENBQUMsT0FBTyxFQUFFO2lCQUNuRCxDQUFDO2FBQ0Y7UUFDRixDQUFDO0tBQUE7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBVdGlsaXR5IGNsYXNzIGZvciBDYW52YXMgdGFzayBvcGVyYXRpb25zXHJcbiAqIFByb3ZpZGVzIGNvbW1vbiBmdW5jdGlvbmFsaXR5IGZvciBDYW52YXMgdGFzayBtYW5pcHVsYXRpb24gYWNyb3NzIGRpZmZlcmVudCBleGVjdXRvcnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBURmlsZSwgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2ssIENhbnZhc1Rhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi8uLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IENhbnZhc0RhdGEsIENhbnZhc1RleHREYXRhIH0gZnJvbSBcIi4uLy4uL3R5cGVzL2NhbnZhc1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDYW52YXNPcGVyYXRpb25SZXN1bHQge1xyXG5cdHN1Y2Nlc3M6IGJvb2xlYW47XHJcblx0ZXJyb3I/OiBzdHJpbmc7XHJcblx0dXBkYXRlZENvbnRlbnQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVdGlsaXR5IGNsYXNzIGZvciBDYW52YXMgdGFzayBvcGVyYXRpb25zXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ2FudmFzVGFza09wZXJhdGlvblV0aWxzIHtcclxuXHRjb25zdHJ1Y3Rvcihwcml2YXRlIGFwcDogQXBwKSB7fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaW5kIG9yIGNyZWF0ZSBhIHRhcmdldCB0ZXh0IG5vZGUgaW4gYSBDYW52YXMgZmlsZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBmaW5kT3JDcmVhdGVUYXJnZXRUZXh0Tm9kZShcclxuXHRcdGZpbGVQYXRoOiBzdHJpbmcsXHJcblx0XHR0YXJnZXROb2RlSWQ/OiBzdHJpbmcsXHJcblx0XHR0YXJnZXRTZWN0aW9uPzogc3RyaW5nXHJcblx0KTogUHJvbWlzZTx7IGNhbnZhc0RhdGE6IENhbnZhc0RhdGE7IHRleHROb2RlOiBDYW52YXNUZXh0RGF0YSB9IHwgbnVsbD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMuYXBwLnZhdWx0LmdldEZpbGVCeVBhdGgoZmlsZVBhdGgpO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IGF3YWl0IHRoaXMuYXBwLnZhdWx0LnJlYWQoZmlsZSk7XHJcblx0XHRcdGNvbnN0IGNhbnZhc0RhdGE6IENhbnZhc0RhdGEgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG5cclxuXHRcdFx0bGV0IHRhcmdldE5vZGU6IENhbnZhc1RleHREYXRhO1xyXG5cclxuXHRcdFx0aWYgKHRhcmdldE5vZGVJZCkge1xyXG5cdFx0XHRcdC8vIEZpbmQgZXhpc3Rpbmcgbm9kZSBieSBJRFxyXG5cdFx0XHRcdGNvbnN0IGV4aXN0aW5nTm9kZSA9IGNhbnZhc0RhdGEubm9kZXMuZmluZChcclxuXHRcdFx0XHRcdChub2RlKTogbm9kZSBpcyBDYW52YXNUZXh0RGF0YSA9PlxyXG5cdFx0XHRcdFx0XHRub2RlLnR5cGUgPT09IFwidGV4dFwiICYmIG5vZGUuaWQgPT09IHRhcmdldE5vZGVJZFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGlmICghZXhpc3RpbmdOb2RlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHRhcmdldE5vZGUgPSBleGlzdGluZ05vZGU7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRmluZCBub2RlIGJ5IHNlY3Rpb24gb3IgY3JlYXRlIG5ldyBvbmVcclxuXHRcdFx0XHRpZiAodGFyZ2V0U2VjdGlvbikge1xyXG5cdFx0XHRcdFx0Y29uc3Qgbm9kZVdpdGhTZWN0aW9uID0gY2FudmFzRGF0YS5ub2Rlcy5maW5kKFxyXG5cdFx0XHRcdFx0XHQobm9kZSk6IG5vZGUgaXMgQ2FudmFzVGV4dERhdGEgPT5cclxuXHRcdFx0XHRcdFx0XHRub2RlLnR5cGUgPT09IFwidGV4dFwiICYmXHJcblx0XHRcdFx0XHRcdFx0bm9kZS50ZXh0XHJcblx0XHRcdFx0XHRcdFx0XHQudG9Mb3dlckNhc2UoKVxyXG5cdFx0XHRcdFx0XHRcdFx0LmluY2x1ZGVzKHRhcmdldFNlY3Rpb24udG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKG5vZGVXaXRoU2VjdGlvbikge1xyXG5cdFx0XHRcdFx0XHR0YXJnZXROb2RlID0gbm9kZVdpdGhTZWN0aW9uO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gQ3JlYXRlIG5ldyBub2RlIHdpdGggc2VjdGlvblxyXG5cdFx0XHRcdFx0XHR0YXJnZXROb2RlID0gdGhpcy5jcmVhdGVOZXdUZXh0Tm9kZShcclxuXHRcdFx0XHRcdFx0XHRjYW52YXNEYXRhLFxyXG5cdFx0XHRcdFx0XHRcdHRhcmdldFNlY3Rpb25cclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0Y2FudmFzRGF0YS5ub2Rlcy5wdXNoKHRhcmdldE5vZGUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHQvLyBDcmVhdGUgbmV3IG5vZGUgd2l0aG91dCBzZWN0aW9uXHJcblx0XHRcdFx0XHR0YXJnZXROb2RlID0gdGhpcy5jcmVhdGVOZXdUZXh0Tm9kZShjYW52YXNEYXRhKTtcclxuXHRcdFx0XHRcdGNhbnZhc0RhdGEubm9kZXMucHVzaCh0YXJnZXROb2RlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHJldHVybiB7IGNhbnZhc0RhdGEsIHRleHROb2RlOiB0YXJnZXROb2RlIH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiRXJyb3IgZmluZGluZy9jcmVhdGluZyB0YXJnZXQgdGV4dCBub2RlOlwiLCBlcnJvcik7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogSW5zZXJ0IGEgdGFzayBpbnRvIGEgc3BlY2lmaWMgc2VjdGlvbiB3aXRoaW4gYSB0ZXh0IG5vZGVcclxuXHQgKi9cclxuXHRwdWJsaWMgaW5zZXJ0VGFza0ludG9TZWN0aW9uKFxyXG5cdFx0dGV4dE5vZGU6IENhbnZhc1RleHREYXRhLFxyXG5cdFx0dGFza0NvbnRlbnQ6IHN0cmluZyxcclxuXHRcdHRhcmdldFNlY3Rpb24/OiBzdHJpbmdcclxuXHQpOiBDYW52YXNPcGVyYXRpb25SZXN1bHQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSB0ZXh0Tm9kZS50ZXh0LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0aWYgKHRhcmdldFNlY3Rpb24pIHtcclxuXHRcdFx0XHQvLyBGaW5kIHRoZSB0YXJnZXQgc2VjdGlvbiBhbmQgaW5zZXJ0IGFmdGVyIGl0XHJcblx0XHRcdFx0Y29uc3Qgc2VjdGlvbkluZGV4ID0gdGhpcy5maW5kU2VjdGlvbkluZGV4KFxyXG5cdFx0XHRcdFx0bGluZXMsXHJcblx0XHRcdFx0XHR0YXJnZXRTZWN0aW9uXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoc2VjdGlvbkluZGV4ID49IDApIHtcclxuXHRcdFx0XHRcdC8vIEZpbmQgdGhlIGFwcHJvcHJpYXRlIGluc2VydGlvbiBwb2ludCBhZnRlciB0aGUgc2VjdGlvbiBoZWFkZXJcclxuXHRcdFx0XHRcdGxldCBpbnNlcnRJbmRleCA9IHNlY3Rpb25JbmRleCArIDE7XHJcblxyXG5cdFx0XHRcdFx0Ly8gU2tpcCBhbnkgZW1wdHkgbGluZXMgYWZ0ZXIgdGhlIHNlY3Rpb24gaGVhZGVyXHJcblx0XHRcdFx0XHR3aGlsZSAoXHJcblx0XHRcdFx0XHRcdGluc2VydEluZGV4IDwgbGluZXMubGVuZ3RoICYmXHJcblx0XHRcdFx0XHRcdGxpbmVzW2luc2VydEluZGV4XS50cmltKCkgPT09IFwiXCJcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRpbnNlcnRJbmRleCsrO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIEluc2VydCB0aGUgdGFzayBjb250ZW50XHJcblx0XHRcdFx0XHRsaW5lcy5zcGxpY2UoaW5zZXJ0SW5kZXgsIDAsIHRhc2tDb250ZW50KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gU2VjdGlvbiBub3QgZm91bmQsIGNyZWF0ZSBpdCBhbmQgYWRkIHRoZSB0YXNrXHJcblx0XHRcdFx0XHRpZiAodGV4dE5vZGUudGV4dC50cmltKCkpIHtcclxuXHRcdFx0XHRcdFx0bGluZXMucHVzaChcIlwiLCBgIyMgJHt0YXJnZXRTZWN0aW9ufWAsIHRhc2tDb250ZW50KTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGxpbmVzLnNwbGljZSgwLCAxLCBgIyMgJHt0YXJnZXRTZWN0aW9ufWAsIHRhc2tDb250ZW50KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gQWRkIGF0IHRoZSBlbmQgb2YgdGhlIHRleHQgbm9kZVxyXG5cdFx0XHRcdGlmICh0ZXh0Tm9kZS50ZXh0LnRyaW0oKSkge1xyXG5cdFx0XHRcdFx0bGluZXMucHVzaCh0YXNrQ29udGVudCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGxpbmVzWzBdID0gdGFza0NvbnRlbnQ7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVcGRhdGUgdGhlIHRleHQgbm9kZSBjb250ZW50XHJcblx0XHRcdHRleHROb2RlLnRleHQgPSBsaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYEVycm9yIGluc2VydGluZyB0YXNrIGludG8gc2VjdGlvbjogJHtlcnJvci5tZXNzYWdlfWAsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGb3JtYXQgYSB0YXNrIGZvciBDYW52YXMgc3RvcmFnZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBmb3JtYXRUYXNrRm9yQ2FudmFzKFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdHByZXNlcnZlTWV0YWRhdGE6IGJvb2xlYW4gPSB0cnVlXHJcblx0KTogc3RyaW5nIHtcclxuXHRcdGlmICh0YXNrLm9yaWdpbmFsTWFya2Rvd24gJiYgcHJlc2VydmVNZXRhZGF0YSkge1xyXG5cdFx0XHRyZXR1cm4gdGFzay5vcmlnaW5hbE1hcmtkb3duO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IHN0YXR1cyA9IHRhc2suY29tcGxldGVkID8gXCJ4XCIgOiBcIiBcIjtcclxuXHRcdGxldCBmb3JtYXR0ZWQgPSBgLSBbJHtzdGF0dXN9XSAke3Rhc2suY29udGVudH1gO1xyXG5cclxuXHRcdGlmIChwcmVzZXJ2ZU1ldGFkYXRhICYmIHRhc2subWV0YWRhdGEpIHtcclxuXHRcdFx0Ly8gQWRkIGJhc2ljIG1ldGFkYXRhXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEuZHVlRGF0ZSkge1xyXG5cdFx0XHRcdGNvbnN0IGR1ZURhdGUgPSBuZXcgRGF0ZSh0YXNrLm1ldGFkYXRhLmR1ZURhdGUpXHJcblx0XHRcdFx0XHQudG9JU09TdHJpbmcoKVxyXG5cdFx0XHRcdFx0LnNwbGl0KFwiVFwiKVswXTtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGDwn5OFICR7ZHVlRGF0ZX1gKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRhc2subWV0YWRhdGEucHJpb3JpdHkgJiYgdGFzay5tZXRhZGF0YS5wcmlvcml0eSA+IDApIHtcclxuXHRcdFx0XHRjb25zdCBwcmlvcml0eUVtb2ppID0gdGhpcy5nZXRQcmlvcml0eUVtb2ppKFxyXG5cdFx0XHRcdFx0dGFzay5tZXRhZGF0YS5wcmlvcml0eVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKHByaW9yaXR5RW1vamkpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhLnB1c2gocHJpb3JpdHlFbW9qaSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAodGFzay5tZXRhZGF0YS5wcm9qZWN0KSB7XHJcblx0XHRcdFx0bWV0YWRhdGEucHVzaChgI3Byb2plY3QvJHt0YXNrLm1ldGFkYXRhLnByb2plY3R9YCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0YXNrLm1ldGFkYXRhLmNvbnRleHQpIHtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGBAJHt0YXNrLm1ldGFkYXRhLmNvbnRleHR9YCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmIChtZXRhZGF0YS5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0Zm9ybWF0dGVkICs9IGAgJHttZXRhZGF0YS5qb2luKFwiIFwiKX1gO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIGZvcm1hdHRlZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBhIG5ldyB0ZXh0IG5vZGUgZm9yIENhbnZhc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY3JlYXRlTmV3VGV4dE5vZGUoXHJcblx0XHRjYW52YXNEYXRhOiBDYW52YXNEYXRhLFxyXG5cdFx0aW5pdGlhbENvbnRlbnQ/OiBzdHJpbmdcclxuXHQpOiBDYW52YXNUZXh0RGF0YSB7XHJcblx0XHQvLyBHZW5lcmF0ZSBhIHVuaXF1ZSBJRCBmb3IgdGhlIG5ldyBub2RlXHJcblx0XHRjb25zdCBub2RlSWQgPSBgdGFzay1ub2RlLSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpXHJcblx0XHRcdC50b1N0cmluZygzNilcclxuXHRcdFx0LnN1YnN0cmluZygyLCAxMSl9YDtcclxuXHJcblx0XHQvLyBGaW5kIGEgZ29vZCBwb3NpdGlvbiBmb3IgdGhlIG5ldyBub2RlIChhdm9pZCBvdmVybGFwcylcclxuXHRcdGNvbnN0IGV4aXN0aW5nTm9kZXMgPSBjYW52YXNEYXRhLm5vZGVzO1xyXG5cdFx0bGV0IHggPSAwO1xyXG5cdFx0bGV0IHkgPSAwO1xyXG5cclxuXHRcdGlmIChleGlzdGluZ05vZGVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Ly8gUG9zaXRpb24gbmV3IG5vZGUgdG8gdGhlIHJpZ2h0IG9mIGV4aXN0aW5nIG5vZGVzXHJcblx0XHRcdGNvbnN0IG1heFggPSBNYXRoLm1heChcclxuXHRcdFx0XHQuLi5leGlzdGluZ05vZGVzLm1hcCgobm9kZSkgPT4gbm9kZS54ICsgbm9kZS53aWR0aClcclxuXHRcdFx0KTtcclxuXHRcdFx0eCA9IG1heFggKyA1MDtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCB0ZXh0ID0gaW5pdGlhbENvbnRlbnQgPyBgIyMgJHtpbml0aWFsQ29udGVudH1cXG5cXG5gIDogXCJcIjtcclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0aWQ6IG5vZGVJZCxcclxuXHRcdFx0eCxcclxuXHRcdFx0eSxcclxuXHRcdFx0d2lkdGg6IDI1MCxcclxuXHRcdFx0aGVpZ2h0OiA2MCxcclxuXHRcdFx0dGV4dCxcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaW5kIHNlY3Rpb24gaW5kZXggaW4gdGV4dCBsaW5lc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmluZFNlY3Rpb25JbmRleChsaW5lczogc3RyaW5nW10sIHNlY3Rpb25OYW1lOiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cdFx0XHQvLyBDaGVjayBmb3IgbWFya2Rvd24gaGVhZGluZ3NcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGxpbmUuc3RhcnRzV2l0aChcIiNcIikgJiZcclxuXHRcdFx0XHRsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VjdGlvbk5hbWUudG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIGk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiAtMTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBwcmlvcml0eSBlbW9qaSBiYXNlZCBvbiBwcmlvcml0eSBsZXZlbFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0UHJpb3JpdHlFbW9qaShwcmlvcml0eTogbnVtYmVyKTogc3RyaW5nIHtcclxuXHRcdHN3aXRjaCAocHJpb3JpdHkpIHtcclxuXHRcdFx0Y2FzZSAxOlxyXG5cdFx0XHRcdHJldHVybiBcIvCflL1cIjsgLy8gTG93XHJcblx0XHRcdGNhc2UgMjpcclxuXHRcdFx0XHRyZXR1cm4gXCJcIjsgLy8gTm9ybWFsIChubyBlbW9qaSlcclxuXHRcdFx0Y2FzZSAzOlxyXG5cdFx0XHRcdHJldHVybiBcIvCflLxcIjsgLy8gTWVkaXVtXHJcblx0XHRcdGNhc2UgNDpcclxuXHRcdFx0XHRyZXR1cm4gXCLij6tcIjsgLy8gSGlnaFxyXG5cdFx0XHRjYXNlIDU6XHJcblx0XHRcdFx0cmV0dXJuIFwi8J+UulwiOyAvLyBIaWdoZXN0XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0cmV0dXJuIFwiXCI7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTYXZlIENhbnZhcyBkYXRhIHRvIGZpbGVcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgc2F2ZUNhbnZhc0RhdGEoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0Y2FudmFzRGF0YTogQ2FudmFzRGF0YVxyXG5cdCk6IFByb21pc2U8Q2FudmFzT3BlcmF0aW9uUmVzdWx0PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy5hcHAudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBgQ2FudmFzIGZpbGUgbm90IGZvdW5kOiAke2ZpbGVQYXRofWAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdXBkYXRlZENvbnRlbnQgPSBKU09OLnN0cmluZ2lmeShjYW52YXNEYXRhLCBudWxsLCAyKTtcclxuXHRcdFx0YXdhaXQgdGhpcy5hcHAudmF1bHQubW9kaWZ5KGZpbGUsIHVwZGF0ZWRDb250ZW50KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHR1cGRhdGVkQ29udGVudCxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IGBFcnJvciBzYXZpbmcgQ2FudmFzIGRhdGE6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=