/**
 * Canvas task updater for modifying tasks within Canvas files
 */
import { __awaiter } from "tslib";
import { Events, emit } from "../dataflow/events/Events";
import { CanvasParser } from "../dataflow/core/CanvasParser";
/**
 * Utility class for updating tasks within Canvas files
 */
export class CanvasTaskUpdater {
    constructor(vault, plugin) {
        this.vault = vault;
        this.plugin = plugin;
    }
    /**
     * Update a task within a Canvas file
     */
    updateCanvasTask(task, updatedTask) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the Canvas file
                const file = this.vault.getFileByPath(task.filePath);
                if (!file) {
                    return {
                        success: false,
                        error: `Canvas file not found: ${task.filePath}`,
                    };
                }
                // Read the Canvas file content
                const content = yield this.vault.read(file);
                // Use CanvasParser utility to parse JSON
                const canvasData = CanvasParser.parseCanvasJSON(content);
                if (!canvasData) {
                    return {
                        success: false,
                        error: "Failed to parse Canvas JSON",
                    };
                }
                // Find the text node containing the task
                const nodeId = task.metadata.canvasNodeId;
                if (!nodeId) {
                    return {
                        success: false,
                        error: "Task does not have a Canvas node ID",
                    };
                }
                // Use CanvasParser utility to find the text node
                const textNode = CanvasParser.findTextNode(canvasData, nodeId);
                if (!textNode) {
                    return {
                        success: false,
                        error: `Canvas text node not found: ${nodeId}`,
                    };
                }
                // Update the task within the text node
                const updateResult = this.updateTaskInTextNode(textNode, task, updatedTask);
                if (!updateResult.success) {
                    return updateResult;
                }
                if (updatedTask.completed && !task.completed) {
                    // Only trigger event if workspace is available (not in test environment)
                    if ((_a = this.plugin.app) === null || _a === void 0 ? void 0 : _a.workspace) {
                        this.plugin.app.workspace.trigger("task-genius:task-completed", updatedTask);
                    }
                }
                // Write the updated Canvas content back to the file
                const updatedContent = JSON.stringify(canvasData, null, 2);
                console.log("updatedContent", updatedContent);
                // Notify about write operation to trigger data flow update
                if (this.plugin.app) {
                    emit(this.plugin.app, Events.WRITE_OPERATION_START, {
                        path: file.path,
                        taskId: task.id,
                    });
                }
                yield this.vault.modify(file, updatedContent);
                // Notify write operation complete
                if (this.plugin.app) {
                    emit(this.plugin.app, Events.WRITE_OPERATION_COMPLETE, {
                        path: file.path,
                        taskId: task.id,
                    });
                }
                return {
                    success: true,
                    updatedContent,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error updating Canvas task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Update a task within a text node's content
     */
    updateTaskInTextNode(textNode, originalTask, updatedTask) {
        try {
            const lines = textNode.text.split("\n");
            let taskFound = false;
            let updatedLines = [...lines];
            // Find and update the task line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check if this line contains the original task
                if (this.isTaskLine(line) &&
                    this.lineMatchesTask(line, originalTask)) {
                    // Update the entire task line with comprehensive metadata handling
                    const updatedLine = this.updateCompleteTaskLine(line, originalTask, updatedTask);
                    updatedLines[i] = updatedLine;
                    taskFound = true;
                    break;
                }
            }
            if (!taskFound) {
                return {
                    success: false,
                    error: `Task not found in Canvas text node: ${originalTask.originalMarkdown}`,
                };
            }
            // Update the text node content
            textNode.text = updatedLines.join("\n");
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: `Error updating task in text node: ${error.message}`,
            };
        }
    }
    /**
     * Check if a line is a task line
     */
    isTaskLine(line) {
        return /^\s*[-*+]\s*\[[^\]]*\]\s*/.test(line);
    }
    /**
     * Check if a line matches a specific task
     */
    lineMatchesTask(line, task) {
        // First try to match using originalMarkdown if available
        if (task.originalMarkdown) {
            // Remove indentation from both for comparison
            const normalizedLine = line.trim();
            const normalizedOriginal = task.originalMarkdown.trim();
            // Direct match
            if (normalizedLine === normalizedOriginal) {
                return true;
            }
            // Try matching without the checkbox status (in case status changed)
            const lineWithoutStatus = normalizedLine.replace(/^[-*+]\s*\[[^\]]*\]\s*/, "- [ ] ");
            const originalWithoutStatus = normalizedOriginal.replace(/^[-*+]\s*\[[^\]]*\]\s*/, "- [ ] ");
            if (lineWithoutStatus === originalWithoutStatus) {
                return true;
            }
        }
        // Fallback to content matching (legacy behavior)
        // Extract just the core task content, removing metadata
        const lineContent = this.extractCoreTaskContent(line);
        const taskContent = this.extractCoreTaskContent(task.content);
        return lineContent === taskContent;
    }
    /**
     * Extract the core task content, removing common metadata patterns
     * This helps match tasks even when metadata has been added or changed
     */
    extractCoreTaskContent(content) {
        let cleaned = content;
        // Remove checkbox if present
        cleaned = cleaned.replace(/^\s*[-*+]\s*\[[^\]]*\]\s*/, "");
        // Remove common metadata patterns
        // Remove emoji dates
        cleaned = cleaned.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "");
        cleaned = cleaned.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "");
        cleaned = cleaned.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "");
        cleaned = cleaned.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "");
        cleaned = cleaned.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "");
        // Remove emoji priority markers
        cleaned = cleaned.replace(/\s+(🔼|🔽|⏫|⏬|🔺)/g, "");
        // Remove emoji onCompletion and other metadata
        cleaned = cleaned.replace(/🏁\s*[^\s]+/g, ""); // Simple onCompletion
        cleaned = cleaned.replace(/🏁\s*\{[^}]*\}/g, ""); // JSON onCompletion
        cleaned = cleaned.replace(/🔁\s*[^\s]+/g, ""); // Recurrence
        cleaned = cleaned.replace(/🆔\s*[^\s]+/g, ""); // ID
        cleaned = cleaned.replace(/⛔\s*[^\s]+/g, ""); // Depends on
        // Remove dataview format metadata
        cleaned = cleaned.replace(/\[[^:]+::\s*[^\]]+\]/g, "");
        // Remove hashtags and context tags at the end
        cleaned = cleaned.replace(/#[^\s#]+/g, "");
        cleaned = cleaned.replace(/@[^\s@]+/g, "");
        // Clean up extra spaces and trim
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        return cleaned;
    }
    /**
     * Update the task status in a line
     */
    updateTaskStatusInLine(line, newStatus) {
        return line.replace(/(\s*[-*+]\s*\[)[^\]]*(\]\s*)/, `$1${newStatus}$2`);
    }
    /**
     * Update a complete task line with all metadata (comprehensive update)
     * This method mirrors the logic from TaskManager.updateTask for consistency
     */
    updateCompleteTaskLine(taskLine, originalTask, updatedTask) {
        const useDataviewFormat = this.plugin.settings.preferMetadataFormat === "dataview";
        // Extract indentation
        const indentMatch = taskLine.match(/^(\s*)/);
        const indentation = indentMatch ? indentMatch[0] : "";
        let updatedLine = taskLine;
        // Update status if it exists in the updated task
        if (updatedTask.status) {
            updatedLine = updatedLine.replace(/(\s*[-*+]\s*\[)[^\]]*(\]\s*)/, `$1${updatedTask.status}$2`);
        }
        // Otherwise, update completion status if it changed
        else if (originalTask.completed !== updatedTask.completed) {
            const statusMark = updatedTask.completed ? "x" : " ";
            updatedLine = updatedLine.replace(/(\s*[-*+]\s*\[)[^\]]*(\]\s*)/, `$1${statusMark}$2`);
        }
        // Extract the checkbox part and use the new content
        const checkboxMatch = updatedLine.match(/^(\s*[-*+]\s*\[[^\]]*\]\s*)/);
        const checkboxPart = checkboxMatch ? checkboxMatch[1] : "";
        // Start with the checkbox part + new content
        updatedLine = checkboxPart + updatedTask.content;
        // Remove existing metadata (both formats)
        updatedLine = this.removeExistingMetadata(updatedLine);
        // Clean up extra spaces
        updatedLine = updatedLine.replace(/\s+/g, " ").trim();
        // Add updated metadata
        const metadata = this.buildMetadataArray(updatedTask, originalTask, useDataviewFormat);
        // Append all metadata to the line
        if (metadata.length > 0) {
            updatedLine = updatedLine.trim();
            updatedLine = `${updatedLine} ${metadata.join(" ")}`;
        }
        // Ensure indentation is preserved
        if (indentation && !updatedLine.startsWith(indentation)) {
            updatedLine = `${indentation}${updatedLine.trimStart()}`;
        }
        return updatedLine;
    }
    /**
     * Build metadata array for a task
     */
    buildMetadataArray(updatedTask, originalTask, useDataviewFormat) {
        const metadata = [];
        // Helper function to format dates
        const formatDate = (date) => {
            if (!date)
                return undefined;
            const d = new Date(date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        };
        const formattedDueDate = formatDate(updatedTask.metadata.dueDate);
        const formattedStartDate = formatDate(updatedTask.metadata.startDate);
        const formattedScheduledDate = formatDate(updatedTask.metadata.scheduledDate);
        const formattedCompletedDate = formatDate(updatedTask.metadata.completedDate);
        // Helper function to check if project is readonly
        const isProjectReadonly = (task) => {
            var _a;
            return ((_a = task.metadata.tgProject) === null || _a === void 0 ? void 0 : _a.readonly) === true;
        };
        // 1. Add non-project/context tags first
        if (updatedTask.metadata.tags && updatedTask.metadata.tags.length > 0) {
            const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
            const generalTags = updatedTask.metadata.tags.filter((tag) => {
                if (typeof tag !== "string")
                    return false;
                if (tag.startsWith(`#${projectPrefix}/`))
                    return false;
                if (tag.startsWith("@") &&
                    updatedTask.metadata.context &&
                    tag === `@${updatedTask.metadata.context}`)
                    return false;
                return true;
            });
            const uniqueGeneralTags = [...new Set(generalTags)]
                .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                .filter((tag) => tag.length > 1);
            if (uniqueGeneralTags.length > 0) {
                metadata.push(...uniqueGeneralTags);
            }
        }
        // 2. Project - Only write project if it's not a read-only tgProject
        const shouldWriteProject = updatedTask.metadata.project && !isProjectReadonly(originalTask);
        if (shouldWriteProject) {
            if (useDataviewFormat) {
                const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
                const projectField = `[${projectPrefix}:: ${updatedTask.metadata.project}]`;
                if (!metadata.includes(projectField)) {
                    metadata.push(projectField);
                }
            }
            else {
                const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
                const projectTag = `#${projectPrefix}/${updatedTask.metadata.project}`;
                if (!metadata.includes(projectTag)) {
                    metadata.push(projectTag);
                }
            }
        }
        // 3. Context
        if (updatedTask.metadata.context) {
            if (useDataviewFormat) {
                const contextPrefix = this.plugin.settings.contextTagPrefix[this.plugin.settings.preferMetadataFormat] || "context";
                const contextField = `[${contextPrefix}:: ${updatedTask.metadata.context}]`;
                if (!metadata.includes(contextField)) {
                    metadata.push(contextField);
                }
            }
            else {
                const contextTag = `@${updatedTask.metadata.context}`;
                if (!metadata.includes(contextTag)) {
                    metadata.push(contextTag);
                }
            }
        }
        // 4. Priority
        if (updatedTask.metadata.priority) {
            if (useDataviewFormat) {
                let priorityValue;
                switch (updatedTask.metadata.priority) {
                    case 5:
                        priorityValue = "highest";
                        break;
                    case 4:
                        priorityValue = "high";
                        break;
                    case 3:
                        priorityValue = "medium";
                        break;
                    case 2:
                        priorityValue = "low";
                        break;
                    case 1:
                        priorityValue = "lowest";
                        break;
                    default:
                        priorityValue = updatedTask.metadata.priority;
                }
                metadata.push(`[priority:: ${priorityValue}]`);
            }
            else {
                let priorityMarker = "";
                switch (updatedTask.metadata.priority) {
                    case 5:
                        priorityMarker = "🔺";
                        break;
                    case 4:
                        priorityMarker = "⏫";
                        break;
                    case 3:
                        priorityMarker = "🔼";
                        break;
                    case 2:
                        priorityMarker = "🔽";
                        break;
                    case 1:
                        priorityMarker = "⏬";
                        break;
                }
                if (priorityMarker)
                    metadata.push(priorityMarker);
            }
        }
        // 4.5 Depends On (only if non-empty)
        const dependsValue = updatedTask.metadata.dependsOn;
        let dependsList;
        if (Array.isArray(dependsValue)) {
            dependsList = dependsValue.filter((v) => typeof v === "string" && v.trim().length > 0);
        }
        else if (typeof dependsValue === "string") {
            dependsList = dependsValue
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0);
        }
        if (dependsList && dependsList.length > 0) {
            const joined = dependsList.join(", ");
            metadata.push(useDataviewFormat ? `[dependsOn:: ${joined}]` : `⛔ ${joined}`);
        }
        if (updatedTask.metadata.id) {
            metadata.push(useDataviewFormat
                ? `[id:: ${updatedTask.metadata.id}]`
                : `🆔 ${updatedTask.metadata.id}`);
        }
        if (updatedTask.metadata.onCompletion) {
            metadata.push(useDataviewFormat
                ? `[onCompletion:: ${updatedTask.metadata.onCompletion}]`
                : `🏁 ${updatedTask.metadata.onCompletion}`);
        }
        // 5. Recurrence
        if (updatedTask.metadata.recurrence) {
            metadata.push(useDataviewFormat
                ? `[repeat:: ${updatedTask.metadata.recurrence}]`
                : `🔁 ${updatedTask.metadata.recurrence}`);
        }
        // 6. Start Date
        if (formattedStartDate) {
            if (!(updatedTask.metadata.useAsDateType === "start" &&
                formatDate(originalTask.metadata.startDate) ===
                    formattedStartDate)) {
                metadata.push(useDataviewFormat
                    ? `[start:: ${formattedStartDate}]`
                    : `🛫 ${formattedStartDate}`);
            }
        }
        // 7. Scheduled Date
        if (formattedScheduledDate) {
            if (!(updatedTask.metadata.useAsDateType === "scheduled" &&
                formatDate(originalTask.metadata.scheduledDate) ===
                    formattedScheduledDate)) {
                metadata.push(useDataviewFormat
                    ? `[scheduled:: ${formattedScheduledDate}]`
                    : `⏳ ${formattedScheduledDate}`);
            }
        }
        // 8. Due Date
        if (formattedDueDate) {
            if (!(updatedTask.metadata.useAsDateType === "due" &&
                formatDate(originalTask.metadata.dueDate) ===
                    formattedDueDate)) {
                metadata.push(useDataviewFormat
                    ? `[due:: ${formattedDueDate}]`
                    : `📅 ${formattedDueDate}`);
            }
        }
        // 9. Completion Date (only if completed)
        if (formattedCompletedDate && updatedTask.completed) {
            metadata.push(useDataviewFormat
                ? `[completion:: ${formattedCompletedDate}]`
                : `✅ ${formattedCompletedDate}`);
        }
        return metadata;
    }
    /**
     * Remove existing metadata from a task line
     */
    removeExistingMetadata(line) {
        let updatedLine = line;
        // Remove emoji dates
        updatedLine = updatedLine.replace(/📅\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/🛫\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/⏳\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "");
        updatedLine = updatedLine.replace(/➕\s*\d{4}-\d{2}-\d{2}/g, "");
        // Remove dataview dates (inline field format)
        updatedLine = updatedLine.replace(/\[(?:due|🗓️)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:completion|✅)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:created|➕)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:start|🛫)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        updatedLine = updatedLine.replace(/\[(?:scheduled|⏳)::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        // Remove emoji priority markers
        updatedLine = updatedLine.replace(/\s+(🔼|🔽|⏫|⏬|🔺|\[#[A-C]\])/g, "");
        // Remove dataview priority
        updatedLine = updatedLine.replace(/\[priority::\s*\w+\]/gi, "");
        // Remove emoji recurrence
        updatedLine = updatedLine.replace(/🔁\s*[^\s]+/g, "");
        // Remove dataview recurrence
        updatedLine = updatedLine.replace(/\[(?:repeat|recurrence)::\s*[^\]]+\]/gi, "");
        // Remove dataview project and context (using configurable prefixes)
        const projectPrefix = this.plugin.settings.projectTagPrefix[this.plugin.settings.preferMetadataFormat] || "project";
        const contextPrefix = this.plugin.settings.contextTagPrefix[this.plugin.settings.preferMetadataFormat] || "@";
        updatedLine = updatedLine.replace(new RegExp(`\\[${projectPrefix}::\\s*[^\\]]+\\]`, "gi"), "");
        updatedLine = updatedLine.replace(new RegExp(`\\[${contextPrefix}::\\s*[^\\]]+\\]`, "gi"), "");
        // Remove ALL existing tags to prevent duplication
        updatedLine = updatedLine.replace(/#[^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\\s]+/g, "");
        updatedLine = updatedLine.replace(/@[^\s@]+/g, "");
        return updatedLine;
    }
    /**
     * Delete a task from a Canvas file
     */
    deleteCanvasTask(task, deleteChildren = false) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the Canvas file
                const file = this.vault.getFileByPath(task.filePath);
                if (!file) {
                    return {
                        success: false,
                        error: `Canvas file not found: ${task.filePath}`,
                    };
                }
                // Read the Canvas file content
                const content = yield this.vault.read(file);
                // Use CanvasParser utility to parse JSON
                const canvasData = CanvasParser.parseCanvasJSON(content);
                if (!canvasData) {
                    return {
                        success: false,
                        error: "Failed to parse Canvas JSON",
                    };
                }
                // Find the text node containing the task
                const nodeId = task.metadata.canvasNodeId;
                if (!nodeId) {
                    return {
                        success: false,
                        error: "Task does not have a Canvas node ID",
                    };
                }
                // Use CanvasParser utility to find the text node
                const textNode = CanvasParser.findTextNode(canvasData, nodeId);
                if (!textNode) {
                    return {
                        success: false,
                        error: `Canvas text node not found: ${nodeId}`,
                    };
                }
                // Delete the task from the text node
                const deleteResult = this.deleteTaskFromTextNode(textNode, task, deleteChildren);
                if (!deleteResult.success) {
                    return deleteResult;
                }
                // Write the updated Canvas content back to the file
                const updatedContent = JSON.stringify(canvasData, null, 2);
                yield this.vault.modify(file, updatedContent);
                return {
                    success: true,
                    updatedContent,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error deleting Canvas task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Move a task from one Canvas location to another
     */
    moveCanvasTask(task, targetFilePath, targetNodeId, targetSection) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First, get the task content before deletion
                const taskContent = task.originalMarkdown || this.formatTaskLine(task);
                // Delete from source
                const deleteResult = yield this.deleteCanvasTask(task);
                if (!deleteResult.success) {
                    return deleteResult;
                }
                // Add to target
                const addResult = yield this.addTaskToCanvasNode(targetFilePath, taskContent, targetNodeId, targetSection);
                return addResult;
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error moving Canvas task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Duplicate a task within a Canvas file
     */
    duplicateCanvasTask(task, targetFilePath, targetNodeId, targetSection, preserveMetadata = true) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Create duplicate task content
                let duplicateContent = task.originalMarkdown || this.formatTaskLine(task);
                // Reset completion status
                duplicateContent = duplicateContent.replace(/^(\s*[-*+]\s*\[)[xX\-](\])/, "$1 $2");
                if (!preserveMetadata) {
                    // Remove completion-related metadata
                    duplicateContent =
                        this.removeCompletionMetadata(duplicateContent);
                }
                // Add duplicate indicator
                const timestamp = new Date().toISOString().split("T")[0];
                duplicateContent += ` (duplicated ${timestamp})`;
                // Add to target location
                const targetFile = targetFilePath || task.filePath;
                const addResult = yield this.addTaskToCanvasNode(targetFile, duplicateContent, targetNodeId, targetSection);
                return addResult;
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error duplicating Canvas task: ${error.message}`,
                };
            }
        });
    }
    /**
     * Add a task to a Canvas text node
     */
    addTaskToCanvasNode(filePath, taskContent, targetNodeId, targetSection) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get the Canvas file
                const file = this.vault.getFileByPath(filePath);
                if (!file) {
                    return {
                        success: false,
                        error: `Canvas file not found: ${filePath}`,
                    };
                }
                // Read the Canvas file content
                const content = yield this.vault.read(file);
                // Use CanvasParser utility to parse JSON
                const canvasData = CanvasParser.parseCanvasJSON(content);
                if (!canvasData) {
                    return {
                        success: false,
                        error: "Failed to parse Canvas JSON",
                    };
                }
                // Find or create target text node
                let targetNode;
                if (targetNodeId) {
                    const existingNode = canvasData.nodes.find((node) => node.type === "text" && node.id === targetNodeId);
                    if (!existingNode) {
                        return {
                            success: false,
                            error: `Target Canvas text node not found: ${targetNodeId}`,
                        };
                    }
                    targetNode = existingNode;
                }
                else {
                    // Create a new text node if no target specified
                    targetNode = this.createNewTextNode(canvasData);
                    canvasData.nodes.push(targetNode);
                }
                // Add task to the text node
                const addResult = this.addTaskToTextNode(targetNode, taskContent, targetSection);
                if (!addResult.success) {
                    return addResult;
                }
                // Write the updated Canvas content back to the file
                const updatedContent = JSON.stringify(canvasData, null, 2);
                yield this.vault.modify(file, updatedContent);
                return {
                    success: true,
                    updatedContent,
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: `Error adding task to Canvas node: ${error.message}`,
                };
            }
        });
    }
    /**
     * Delete a task from a text node's content
     */
    deleteTaskFromTextNode(textNode, task, deleteChildren = false) {
        try {
            const lines = textNode.text.split("\n");
            let taskFound = false;
            let updatedLines = [...lines];
            let taskIndex = -1;
            // Find the task line
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Check if this line contains the task to delete
                if (this.isTaskLine(line) && this.lineMatchesTask(line, task)) {
                    taskIndex = i;
                    taskFound = true;
                    break;
                }
            }
            if (!taskFound) {
                return {
                    success: false,
                    error: `Task not found in Canvas text node: ${task.originalMarkdown}`,
                };
            }
            const linesToDelete = [taskIndex];
            if (deleteChildren) {
                // Calculate parent indentation
                const parentLine = lines[taskIndex];
                const parentIndent = this.getIndentLevel(parentLine);
                // Find all child tasks (lines with greater indentation following the parent)
                for (let i = taskIndex + 1; i < lines.length; i++) {
                    const line = lines[i];
                    const currentIndent = this.getIndentLevel(line);
                    // Stop if we reach a task at the same or higher level
                    if (this.isTaskLine(line) && currentIndent <= parentIndent) {
                        break;
                    }
                    // Add child task to delete list
                    if (this.isTaskLine(line) && currentIndent > parentIndent) {
                        linesToDelete.push(i);
                    }
                }
            }
            // Sort in reverse order to delete from bottom to top
            linesToDelete.sort((a, b) => b - a);
            // Remove all marked lines
            for (const index of linesToDelete) {
                updatedLines.splice(index, 1);
            }
            // Update the text node content
            textNode.text = updatedLines.join("\n");
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                error: `Error deleting task from text node: ${error.message}`,
            };
        }
    }
    /**
     * Get the indentation level of a line
     */
    getIndentLevel(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }
    /**
     * Add a task to a text node's content
     */
    addTaskToTextNode(textNode, taskContent, targetSection) {
        try {
            const lines = textNode.text.split("\n");
            if (targetSection) {
                // Find the target section and insert after it
                const sectionIndex = this.findSectionIndex(lines, targetSection);
                if (sectionIndex >= 0) {
                    lines.splice(sectionIndex + 1, 0, taskContent);
                }
                else {
                    // Section not found, add at the end
                    lines.push(taskContent);
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
                error: `Error adding task to text node: ${error.message}`,
            };
        }
    }
    /**
     * Create a new text node for Canvas
     */
    createNewTextNode(canvasData) {
        // Generate a unique ID for the new node
        const nodeId = `task-node-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        // Find a good position for the new node (avoid overlaps)
        const existingNodes = canvasData.nodes;
        let x = 0;
        let y = 0;
        if (existingNodes.length > 0) {
            // Position new node to the right of existing nodes
            const maxX = Math.max(...existingNodes.map((node) => node.x + node.width));
            x = maxX + 50;
        }
        return {
            type: "text",
            id: nodeId,
            x,
            y,
            width: 250,
            height: 60,
            text: "",
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
     * Format a task as a markdown line
     */
    formatTaskLine(task) {
        const status = task.completed ? "x" : " ";
        return `- [${status}] ${task.content}`;
    }
    /**
     * Remove completion-related metadata from task content
     */
    removeCompletionMetadata(content) {
        let cleaned = content;
        // Remove completion date
        cleaned = cleaned.replace(/✅\s*\d{4}-\d{2}-\d{2}/g, "");
        cleaned = cleaned.replace(/\[completion::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        // Remove scheduled date if desired
        cleaned = cleaned.replace(/⏰\s*\d{4}-\d{2}-\d{2}/g, "");
        cleaned = cleaned.replace(/\[scheduled::\s*\d{4}-\d{2}-\d{2}\]/gi, "");
        // Clean up extra spaces
        cleaned = cleaned.replace(/\s+/g, " ").trim();
        return cleaned;
    }
    /**
     * Check if a task is a Canvas task
     */
    static isCanvasTask(task) {
        return task.metadata.sourceType === "canvas";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FudmFzLXRhc2stdXBkYXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhbnZhcy10YXNrLXVwZGF0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7O0dBRUc7O0FBTUgsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFXN0Q7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWlCO0lBQzdCLFlBQW9CLEtBQVksRUFBVSxNQUE2QjtRQUFuRCxVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQVUsV0FBTSxHQUFOLE1BQU0sQ0FBdUI7SUFBRyxDQUFDO0lBRTNFOztPQUVHO0lBQ1UsZ0JBQWdCLENBQzVCLElBQThCLEVBQzlCLFdBQXFDOzs7WUFFckMsSUFBSTtnQkFDSCxzQkFBc0I7Z0JBQ3RCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckQsSUFBSSxDQUFDLElBQUksRUFBRTtvQkFDVixPQUFPO3dCQUNOLE9BQU8sRUFBRSxLQUFLO3dCQUNkLEtBQUssRUFBRSwwQkFBMEIsSUFBSSxDQUFDLFFBQVEsRUFBRTtxQkFDaEQsQ0FBQztpQkFDRjtnQkFFRCwrQkFBK0I7Z0JBQy9CLE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBRTVDLHlDQUF5QztnQkFDekMsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDekQsSUFBSSxDQUFDLFVBQVUsRUFBRTtvQkFDaEIsT0FBTzt3QkFDTixPQUFPLEVBQUUsS0FBSzt3QkFDZCxLQUFLLEVBQUUsNkJBQTZCO3FCQUNwQyxDQUFDO2lCQUNGO2dCQUVELHlDQUF5QztnQkFDekMs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O2dCQUNELE9BQU8sQ0FBQyxDQUFDO2FBQ1Q7U0FDRDtRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDWCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxjQUFjLENBQUMsSUFBVTtRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUMxQyxPQUFPLE1BQU0sTUFBTSxLQUFLLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7O09BRUc7SUFDSyx3QkFBd0IsQ0FBQyxPQUFlO1FBQy9DLElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUV0Qix5QkFBeUI7UUFDekIsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEQsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsd0NBQXdDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFeEUsbUNBQW1DO1FBQ25DLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHdCQUF3QixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHVDQUF1QyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLHdCQUF3QjtRQUN4QixPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFOUMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFVO1FBQ3BDLE9BQVEsSUFBSSxDQUFDLFFBQWdCLENBQUMsVUFBVSxLQUFLLFFBQVEsQ0FBQztJQUN2RCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQ2FudmFzIHRhc2sgdXBkYXRlciBmb3IgbW9kaWZ5aW5nIHRhc2tzIHdpdGhpbiBDYW52YXMgZmlsZXNcclxuICovXHJcblxyXG5pbXBvcnQgeyBWYXVsdCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUYXNrLCBDYW52YXNUYXNrTWV0YWRhdGEgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5pbXBvcnQgeyBDYW52YXNEYXRhLCBDYW52YXNUZXh0RGF0YSB9IGZyb20gXCIuLi90eXBlcy9jYW52YXNcIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBFdmVudHMsIGVtaXQgfSBmcm9tIFwiLi4vZGF0YWZsb3cvZXZlbnRzL0V2ZW50c1wiO1xyXG5pbXBvcnQgeyBDYW52YXNQYXJzZXIgfSBmcm9tIFwiLi4vZGF0YWZsb3cvY29yZS9DYW52YXNQYXJzZXJcIjtcclxuXHJcbi8qKlxyXG4gKiBSZXN1bHQgb2YgYSBDYW52YXMgdGFzayB1cGRhdGUgb3BlcmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIENhbnZhc1Rhc2tVcGRhdGVSZXN1bHQge1xyXG5cdHN1Y2Nlc3M6IGJvb2xlYW47XHJcblx0ZXJyb3I/OiBzdHJpbmc7XHJcblx0dXBkYXRlZENvbnRlbnQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVdGlsaXR5IGNsYXNzIGZvciB1cGRhdGluZyB0YXNrcyB3aXRoaW4gQ2FudmFzIGZpbGVzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ2FudmFzVGFza1VwZGF0ZXIge1xyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgdmF1bHQ6IFZhdWx0LCBwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgYSB0YXNrIHdpdGhpbiBhIENhbnZhcyBmaWxlXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIHVwZGF0ZUNhbnZhc1Rhc2soXHJcblx0XHR0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4sXHJcblx0XHR1cGRhdGVkVGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+XHJcblx0KTogUHJvbWlzZTxDYW52YXNUYXNrVXBkYXRlUmVzdWx0PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBHZXQgdGhlIENhbnZhcyBmaWxlXHJcblx0XHRcdGNvbnN0IGZpbGUgPSB0aGlzLnZhdWx0LmdldEZpbGVCeVBhdGgodGFzay5maWxlUGF0aCk7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBgQ2FudmFzIGZpbGUgbm90IGZvdW5kOiAke3Rhc2suZmlsZVBhdGh9YCxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBSZWFkIHRoZSBDYW52YXMgZmlsZSBjb250ZW50XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBhd2FpdCB0aGlzLnZhdWx0LnJlYWQoZmlsZSk7XHJcblxyXG5cdFx0XHQvLyBVc2UgQ2FudmFzUGFyc2VyIHV0aWxpdHkgdG8gcGFyc2UgSlNPTlxyXG5cdFx0XHRjb25zdCBjYW52YXNEYXRhID0gQ2FudmFzUGFyc2VyLnBhcnNlQ2FudmFzSlNPTihjb250ZW50KTtcclxuXHRcdFx0aWYgKCFjYW52YXNEYXRhKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IFwiRmFpbGVkIHRvIHBhcnNlIENhbnZhcyBKU09OXCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgdGV4dCBub2RlIGNvbnRhaW5pbmcgdGhlIHRhc2tcclxuXHRcdFx0Y29uc3Qgbm9kZUlkID0gdGFzay5tZXRhZGF0YS5jYW52YXNOb2RlSWQ7XHJcblx0XHRcdGlmICghbm9kZUlkKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0ZXJyb3I6IFwiVGFzayBkb2VzIG5vdCBoYXZlIGEgQ2FudmFzIG5vZGUgSURcIixcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBVc2UgQ2FudmFzUGFyc2VyIHV0aWxpdHkgdG8gZmluZCB0aGUgdGV4dCBub2RlXHJcblx0XHRcdGNvbnN0IHRleHROb2RlID0gQ2FudmFzUGFyc2VyLmZpbmRUZXh0Tm9kZShjYW52YXNEYXRhLCBub2RlSWQpO1xyXG5cclxuXHRcdFx0aWYgKCF0ZXh0Tm9kZSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBgQ2FudmFzIHRleHQgbm9kZSBub3QgZm91bmQ6ICR7bm9kZUlkfWAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSB0YXNrIHdpdGhpbiB0aGUgdGV4dCBub2RlXHJcblx0XHRcdGNvbnN0IHVwZGF0ZVJlc3VsdCA9IHRoaXMudXBkYXRlVGFza0luVGV4dE5vZGUoXHJcblx0XHRcdFx0dGV4dE5vZGUsXHJcblx0XHRcdFx0dGFzayxcclxuXHRcdFx0XHR1cGRhdGVkVGFza1xyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKCF1cGRhdGVSZXN1bHQuc3VjY2Vzcykge1xyXG5cdFx0XHRcdHJldHVybiB1cGRhdGVSZXN1bHQ7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh1cGRhdGVkVGFzay5jb21wbGV0ZWQgJiYgIXRhc2suY29tcGxldGVkKSB7XHJcblx0XHRcdFx0Ly8gT25seSB0cmlnZ2VyIGV2ZW50IGlmIHdvcmtzcGFjZSBpcyBhdmFpbGFibGUgKG5vdCBpbiB0ZXN0IGVudmlyb25tZW50KVxyXG5cdFx0XHRcdGlmICh0aGlzLnBsdWdpbi5hcHA/LndvcmtzcGFjZSkge1xyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uYXBwLndvcmtzcGFjZS50cmlnZ2VyKFxyXG5cdFx0XHRcdFx0XHRcInRhc2stZ2VuaXVzOnRhc2stY29tcGxldGVkXCIsXHJcblx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV3JpdGUgdGhlIHVwZGF0ZWQgQ2FudmFzIGNvbnRlbnQgYmFjayB0byB0aGUgZmlsZVxyXG5cdFx0XHRjb25zdCB1cGRhdGVkQ29udGVudCA9IEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcInVwZGF0ZWRDb250ZW50XCIsIHVwZGF0ZWRDb250ZW50KTtcclxuXHJcblx0XHRcdC8vIE5vdGlmeSBhYm91dCB3cml0ZSBvcGVyYXRpb24gdG8gdHJpZ2dlciBkYXRhIGZsb3cgdXBkYXRlXHJcblx0XHRcdGlmICh0aGlzLnBsdWdpbi5hcHApIHtcclxuXHRcdFx0XHRlbWl0KHRoaXMucGx1Z2luLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9TVEFSVCwge1xyXG5cdFx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdFx0dGFza0lkOiB0YXNrLmlkLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRhd2FpdCB0aGlzLnZhdWx0Lm1vZGlmeShmaWxlLCB1cGRhdGVkQ29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBOb3RpZnkgd3JpdGUgb3BlcmF0aW9uIGNvbXBsZXRlXHJcblx0XHRcdGlmICh0aGlzLnBsdWdpbi5hcHApIHtcclxuXHRcdFx0XHRlbWl0KHRoaXMucGx1Z2luLmFwcCwgRXZlbnRzLldSSVRFX09QRVJBVElPTl9DT01QTEVURSwge1xyXG5cdFx0XHRcdFx0cGF0aDogZmlsZS5wYXRoLFxyXG5cdFx0XHRcdFx0dGFza0lkOiB0YXNrLmlkLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdFx0dXBkYXRlZENvbnRlbnQsXHJcblx0XHRcdH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBgRXJyb3IgdXBkYXRpbmcgQ2FudmFzIHRhc2s6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIGEgdGFzayB3aXRoaW4gYSB0ZXh0IG5vZGUncyBjb250ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVUYXNrSW5UZXh0Tm9kZShcclxuXHRcdHRleHROb2RlOiBDYW52YXNUZXh0RGF0YSxcclxuXHRcdG9yaWdpbmFsVGFzazogVGFzayxcclxuXHRcdHVwZGF0ZWRUYXNrOiBUYXNrXHJcblx0KTogQ2FudmFzVGFza1VwZGF0ZVJlc3VsdCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCBsaW5lcyA9IHRleHROb2RlLnRleHQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRcdGxldCB0YXNrRm91bmQgPSBmYWxzZTtcclxuXHRcdFx0bGV0IHVwZGF0ZWRMaW5lcyA9IFsuLi5saW5lc107XHJcblxyXG5cdFx0XHQvLyBGaW5kIGFuZCB1cGRhdGUgdGhlIHRhc2sgbGluZVxyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IGxpbmVzW2ldO1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGlzIGxpbmUgY29udGFpbnMgdGhlIG9yaWdpbmFsIHRhc2tcclxuXHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHR0aGlzLmlzVGFza0xpbmUobGluZSkgJiZcclxuXHRcdFx0XHRcdHRoaXMubGluZU1hdGNoZXNUYXNrKGxpbmUsIG9yaWdpbmFsVGFzaylcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIFVwZGF0ZSB0aGUgZW50aXJlIHRhc2sgbGluZSB3aXRoIGNvbXByZWhlbnNpdmUgbWV0YWRhdGEgaGFuZGxpbmdcclxuXHRcdFx0XHRcdGNvbnN0IHVwZGF0ZWRMaW5lID0gdGhpcy51cGRhdGVDb21wbGV0ZVRhc2tMaW5lKFxyXG5cdFx0XHRcdFx0XHRsaW5lLFxyXG5cdFx0XHRcdFx0XHRvcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0XHRcdHVwZGF0ZWRUYXNrXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0dXBkYXRlZExpbmVzW2ldID0gdXBkYXRlZExpbmU7XHJcblx0XHRcdFx0XHR0YXNrRm91bmQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRpZiAoIXRhc2tGb3VuZCkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBgVGFzayBub3QgZm91bmQgaW4gQ2FudmFzIHRleHQgbm9kZTogJHtvcmlnaW5hbFRhc2sub3JpZ2luYWxNYXJrZG93bn1gLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgdGV4dCBub2RlIGNvbnRlbnRcclxuXHRcdFx0dGV4dE5vZGUudGV4dCA9IHVwZGF0ZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYEVycm9yIHVwZGF0aW5nIHRhc2sgaW4gdGV4dCBub2RlOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgbGluZSBpcyBhIHRhc2sgbGluZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgaXNUYXNrTGluZShsaW5lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiAvXlxccypbLSorXVxccypcXFtbXlxcXV0qXFxdXFxzKi8udGVzdChsaW5lKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENoZWNrIGlmIGEgbGluZSBtYXRjaGVzIGEgc3BlY2lmaWMgdGFza1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgbGluZU1hdGNoZXNUYXNrKGxpbmU6IHN0cmluZywgdGFzazogVGFzayk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gRmlyc3QgdHJ5IHRvIG1hdGNoIHVzaW5nIG9yaWdpbmFsTWFya2Rvd24gaWYgYXZhaWxhYmxlXHJcblx0XHRpZiAodGFzay5vcmlnaW5hbE1hcmtkb3duKSB7XHJcblx0XHRcdC8vIFJlbW92ZSBpbmRlbnRhdGlvbiBmcm9tIGJvdGggZm9yIGNvbXBhcmlzb25cclxuXHRcdFx0Y29uc3Qgbm9ybWFsaXplZExpbmUgPSBsaW5lLnRyaW0oKTtcclxuXHRcdFx0Y29uc3Qgbm9ybWFsaXplZE9yaWdpbmFsID0gdGFzay5vcmlnaW5hbE1hcmtkb3duLnRyaW0oKTtcclxuXHJcblx0XHRcdC8vIERpcmVjdCBtYXRjaFxyXG5cdFx0XHRpZiAobm9ybWFsaXplZExpbmUgPT09IG5vcm1hbGl6ZWRPcmlnaW5hbCkge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBUcnkgbWF0Y2hpbmcgd2l0aG91dCB0aGUgY2hlY2tib3ggc3RhdHVzIChpbiBjYXNlIHN0YXR1cyBjaGFuZ2VkKVxyXG5cdFx0XHRjb25zdCBsaW5lV2l0aG91dFN0YXR1cyA9IG5vcm1hbGl6ZWRMaW5lLnJlcGxhY2UoXHJcblx0XHRcdFx0L15bLSorXVxccypcXFtbXlxcXV0qXFxdXFxzKi8sXHJcblx0XHRcdFx0XCItIFsgXSBcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFdpdGhvdXRTdGF0dXMgPSBub3JtYWxpemVkT3JpZ2luYWwucmVwbGFjZShcclxuXHRcdFx0XHQvXlstKitdXFxzKlxcW1teXFxdXSpcXF1cXHMqLyxcclxuXHRcdFx0XHRcIi0gWyBdIFwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRpZiAobGluZVdpdGhvdXRTdGF0dXMgPT09IG9yaWdpbmFsV2l0aG91dFN0YXR1cykge1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmFsbGJhY2sgdG8gY29udGVudCBtYXRjaGluZyAobGVnYWN5IGJlaGF2aW9yKVxyXG5cdFx0Ly8gRXh0cmFjdCBqdXN0IHRoZSBjb3JlIHRhc2sgY29udGVudCwgcmVtb3ZpbmcgbWV0YWRhdGFcclxuXHRcdGNvbnN0IGxpbmVDb250ZW50ID0gdGhpcy5leHRyYWN0Q29yZVRhc2tDb250ZW50KGxpbmUpO1xyXG5cdFx0Y29uc3QgdGFza0NvbnRlbnQgPSB0aGlzLmV4dHJhY3RDb3JlVGFza0NvbnRlbnQodGFzay5jb250ZW50KTtcclxuXHJcblx0XHRyZXR1cm4gbGluZUNvbnRlbnQgPT09IHRhc2tDb250ZW50O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCB0aGUgY29yZSB0YXNrIGNvbnRlbnQsIHJlbW92aW5nIGNvbW1vbiBtZXRhZGF0YSBwYXR0ZXJuc1xyXG5cdCAqIFRoaXMgaGVscHMgbWF0Y2ggdGFza3MgZXZlbiB3aGVuIG1ldGFkYXRhIGhhcyBiZWVuIGFkZGVkIG9yIGNoYW5nZWRcclxuXHQgKi9cclxuXHRwcml2YXRlIGV4dHJhY3RDb3JlVGFza0NvbnRlbnQoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGxldCBjbGVhbmVkID0gY29udGVudDtcclxuXHJcblx0XHQvLyBSZW1vdmUgY2hlY2tib3ggaWYgcHJlc2VudFxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXlxccypbLSorXVxccypcXFtbXlxcXV0qXFxdXFxzKi8sIFwiXCIpO1xyXG5cclxuXHRcdC8vIFJlbW92ZSBjb21tb24gbWV0YWRhdGEgcGF0dGVybnNcclxuXHRcdC8vIFJlbW92ZSBlbW9qaSBkYXRlc1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv8J+ThVxccypcXGR7NH0tXFxkezJ9LVxcZHsyfS9nLCBcIlwiKTtcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL/Cfm6tcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC/ij7NcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC/inIVcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC/inpVcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGVtb2ppIHByaW9yaXR5IG1hcmtlcnNcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL1xccyso8J+UvHzwn5S9fOKPq3zij6x88J+UuikvZywgXCJcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGVtb2ppIG9uQ29tcGxldGlvbiBhbmQgb3RoZXIgbWV0YWRhdGFcclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL/Cfj4FcXHMqW15cXHNdKy9nLCBcIlwiKTsgLy8gU2ltcGxlIG9uQ29tcGxldGlvblxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv8J+PgVxccypcXHtbXn1dKlxcfS9nLCBcIlwiKTsgLy8gSlNPTiBvbkNvbXBsZXRpb25cclxuXHRcdGNsZWFuZWQgPSBjbGVhbmVkLnJlcGxhY2UoL/CflIFcXHMqW15cXHNdKy9nLCBcIlwiKTsgLy8gUmVjdXJyZW5jZVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv8J+GlFxccypbXlxcc10rL2csIFwiXCIpOyAvLyBJRFxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv4puUXFxzKlteXFxzXSsvZywgXCJcIik7IC8vIERlcGVuZHMgb25cclxuXHJcblx0XHQvLyBSZW1vdmUgZGF0YXZpZXcgZm9ybWF0IG1ldGFkYXRhXHJcblx0XHRjbGVhbmVkID0gY2xlYW5lZC5yZXBsYWNlKC9cXFtbXjpdKzo6XFxzKlteXFxdXStcXF0vZywgXCJcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGhhc2h0YWdzIGFuZCBjb250ZXh0IHRhZ3MgYXQgdGhlIGVuZFxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvI1teXFxzI10rL2csIFwiXCIpO1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvQFteXFxzQF0rL2csIFwiXCIpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIGV4dHJhIHNwYWNlcyBhbmQgdHJpbVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG5cclxuXHRcdHJldHVybiBjbGVhbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVXBkYXRlIHRoZSB0YXNrIHN0YXR1cyBpbiBhIGxpbmVcclxuXHQgKi9cclxuXHRwcml2YXRlIHVwZGF0ZVRhc2tTdGF0dXNJbkxpbmUobGluZTogc3RyaW5nLCBuZXdTdGF0dXM6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRyZXR1cm4gbGluZS5yZXBsYWNlKC8oXFxzKlstKitdXFxzKlxcWylbXlxcXV0qKFxcXVxccyopLywgYCQxJHtuZXdTdGF0dXN9JDJgKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSBhIGNvbXBsZXRlIHRhc2sgbGluZSB3aXRoIGFsbCBtZXRhZGF0YSAoY29tcHJlaGVuc2l2ZSB1cGRhdGUpXHJcblx0ICogVGhpcyBtZXRob2QgbWlycm9ycyB0aGUgbG9naWMgZnJvbSBUYXNrTWFuYWdlci51cGRhdGVUYXNrIGZvciBjb25zaXN0ZW5jeVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlQ29tcGxldGVUYXNrTGluZShcclxuXHRcdHRhc2tMaW5lOiBzdHJpbmcsXHJcblx0XHRvcmlnaW5hbFRhc2s6IFRhc2ssXHJcblx0XHR1cGRhdGVkVGFzazogVGFza1xyXG5cdCk6IHN0cmluZyB7XHJcblx0XHRjb25zdCB1c2VEYXRhdmlld0Zvcm1hdCA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0ID09PSBcImRhdGF2aWV3XCI7XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCBpbmRlbnRhdGlvblxyXG5cdFx0Y29uc3QgaW5kZW50TWF0Y2ggPSB0YXNrTGluZS5tYXRjaCgvXihcXHMqKS8pO1xyXG5cdFx0Y29uc3QgaW5kZW50YXRpb24gPSBpbmRlbnRNYXRjaCA/IGluZGVudE1hdGNoWzBdIDogXCJcIjtcclxuXHRcdGxldCB1cGRhdGVkTGluZSA9IHRhc2tMaW5lO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBzdGF0dXMgaWYgaXQgZXhpc3RzIGluIHRoZSB1cGRhdGVkIHRhc2tcclxuXHRcdGlmICh1cGRhdGVkVGFzay5zdGF0dXMpIHtcclxuXHRcdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRcdC8oXFxzKlstKitdXFxzKlxcWylbXlxcXV0qKFxcXVxccyopLyxcclxuXHRcdFx0XHRgJDEke3VwZGF0ZWRUYXNrLnN0YXR1c30kMmBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHRcdC8vIE90aGVyd2lzZSwgdXBkYXRlIGNvbXBsZXRpb24gc3RhdHVzIGlmIGl0IGNoYW5nZWRcclxuXHRcdGVsc2UgaWYgKG9yaWdpbmFsVGFzay5jb21wbGV0ZWQgIT09IHVwZGF0ZWRUYXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRjb25zdCBzdGF0dXNNYXJrID0gdXBkYXRlZFRhc2suY29tcGxldGVkID8gXCJ4XCIgOiBcIiBcIjtcclxuXHRcdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRcdC8oXFxzKlstKitdXFxzKlxcWylbXlxcXV0qKFxcXVxccyopLyxcclxuXHRcdFx0XHRgJDEke3N0YXR1c01hcmt9JDJgXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRXh0cmFjdCB0aGUgY2hlY2tib3ggcGFydCBhbmQgdXNlIHRoZSBuZXcgY29udGVudFxyXG5cdFx0Y29uc3QgY2hlY2tib3hNYXRjaCA9IHVwZGF0ZWRMaW5lLm1hdGNoKC9eKFxccypbLSorXVxccypcXFtbXlxcXV0qXFxdXFxzKikvKTtcclxuXHRcdGNvbnN0IGNoZWNrYm94UGFydCA9IGNoZWNrYm94TWF0Y2ggPyBjaGVja2JveE1hdGNoWzFdIDogXCJcIjtcclxuXHJcblx0XHQvLyBTdGFydCB3aXRoIHRoZSBjaGVja2JveCBwYXJ0ICsgbmV3IGNvbnRlbnRcclxuXHRcdHVwZGF0ZWRMaW5lID0gY2hlY2tib3hQYXJ0ICsgdXBkYXRlZFRhc2suY29udGVudDtcclxuXHJcblx0XHQvLyBSZW1vdmUgZXhpc3RpbmcgbWV0YWRhdGEgKGJvdGggZm9ybWF0cylcclxuXHRcdHVwZGF0ZWRMaW5lID0gdGhpcy5yZW1vdmVFeGlzdGluZ01ldGFkYXRhKHVwZGF0ZWRMaW5lKTtcclxuXHJcblx0XHQvLyBDbGVhbiB1cCBleHRyYSBzcGFjZXNcclxuXHRcdHVwZGF0ZWRMaW5lID0gdXBkYXRlZExpbmUucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG5cclxuXHRcdC8vIEFkZCB1cGRhdGVkIG1ldGFkYXRhXHJcblx0XHRjb25zdCBtZXRhZGF0YSA9IHRoaXMuYnVpbGRNZXRhZGF0YUFycmF5KFxyXG5cdFx0XHR1cGRhdGVkVGFzayxcclxuXHRcdFx0b3JpZ2luYWxUYXNrLFxyXG5cdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBBcHBlbmQgYWxsIG1ldGFkYXRhIHRvIHRoZSBsaW5lXHJcblx0XHRpZiAobWV0YWRhdGEubGVuZ3RoID4gMCkge1xyXG5cdFx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnRyaW0oKTtcclxuXHRcdFx0dXBkYXRlZExpbmUgPSBgJHt1cGRhdGVkTGluZX0gJHttZXRhZGF0YS5qb2luKFwiIFwiKX1gO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEVuc3VyZSBpbmRlbnRhdGlvbiBpcyBwcmVzZXJ2ZWRcclxuXHRcdGlmIChpbmRlbnRhdGlvbiAmJiAhdXBkYXRlZExpbmUuc3RhcnRzV2l0aChpbmRlbnRhdGlvbikpIHtcclxuXHRcdFx0dXBkYXRlZExpbmUgPSBgJHtpbmRlbnRhdGlvbn0ke3VwZGF0ZWRMaW5lLnRyaW1TdGFydCgpfWA7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHVwZGF0ZWRMaW5lO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQnVpbGQgbWV0YWRhdGEgYXJyYXkgZm9yIGEgdGFza1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgYnVpbGRNZXRhZGF0YUFycmF5KFxyXG5cdFx0dXBkYXRlZFRhc2s6IFRhc2ssXHJcblx0XHRvcmlnaW5hbFRhc2s6IFRhc2ssXHJcblx0XHR1c2VEYXRhdmlld0Zvcm1hdDogYm9vbGVhblxyXG5cdCk6IHN0cmluZ1tdIHtcclxuXHRcdGNvbnN0IG1ldGFkYXRhOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuXHRcdC8vIEhlbHBlciBmdW5jdGlvbiB0byBmb3JtYXQgZGF0ZXNcclxuXHRcdGNvbnN0IGZvcm1hdERhdGUgPSAoZGF0ZTogbnVtYmVyIHwgdW5kZWZpbmVkKTogc3RyaW5nIHwgdW5kZWZpbmVkID0+IHtcclxuXHRcdFx0aWYgKCFkYXRlKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHRjb25zdCBkID0gbmV3IERhdGUoZGF0ZSk7XHJcblx0XHRcdHJldHVybiBgJHtkLmdldEZ1bGxZZWFyKCl9LSR7U3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KFxyXG5cdFx0XHRcdDIsXHJcblx0XHRcdFx0XCIwXCJcclxuXHRcdFx0KX0tJHtTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsIFwiMFwiKX1gO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCBmb3JtYXR0ZWREdWVEYXRlID0gZm9ybWF0RGF0ZSh1cGRhdGVkVGFzay5tZXRhZGF0YS5kdWVEYXRlKTtcclxuXHRcdGNvbnN0IGZvcm1hdHRlZFN0YXJ0RGF0ZSA9IGZvcm1hdERhdGUodXBkYXRlZFRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdGNvbnN0IGZvcm1hdHRlZFNjaGVkdWxlZERhdGUgPSBmb3JtYXREYXRlKFxyXG5cdFx0XHR1cGRhdGVkVGFzay5tZXRhZGF0YS5zY2hlZHVsZWREYXRlXHJcblx0XHQpO1xyXG5cdFx0Y29uc3QgZm9ybWF0dGVkQ29tcGxldGVkRGF0ZSA9IGZvcm1hdERhdGUoXHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLmNvbXBsZXRlZERhdGVcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIGNoZWNrIGlmIHByb2plY3QgaXMgcmVhZG9ubHlcclxuXHRcdGNvbnN0IGlzUHJvamVjdFJlYWRvbmx5ID0gKHRhc2s6IFRhc2spOiBib29sZWFuID0+IHtcclxuXHRcdFx0cmV0dXJuIHRhc2subWV0YWRhdGEudGdQcm9qZWN0Py5yZWFkb25seSA9PT0gdHJ1ZTtcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gMS4gQWRkIG5vbi1wcm9qZWN0L2NvbnRleHQgdGFncyBmaXJzdFxyXG5cdFx0aWYgKHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnRhZ3MgJiYgdXBkYXRlZFRhc2subWV0YWRhdGEudGFncy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGNvbnN0IHByb2plY3RQcmVmaXggPVxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXhbXHJcblx0XHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5wcmVmZXJNZXRhZGF0YUZvcm1hdFxyXG5cdFx0XHRcdF0gfHwgXCJwcm9qZWN0XCI7XHJcblx0XHRcdGNvbnN0IGdlbmVyYWxUYWdzID0gdXBkYXRlZFRhc2subWV0YWRhdGEudGFncy5maWx0ZXIoKHRhZykgPT4ge1xyXG5cdFx0XHRcdGlmICh0eXBlb2YgdGFnICE9PSBcInN0cmluZ1wiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdFx0aWYgKHRhZy5zdGFydHNXaXRoKGAjJHtwcm9qZWN0UHJlZml4fS9gKSkgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHRhZy5zdGFydHNXaXRoKFwiQFwiKSAmJlxyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEuY29udGV4dCAmJlxyXG5cdFx0XHRcdFx0dGFnID09PSBgQCR7dXBkYXRlZFRhc2subWV0YWRhdGEuY29udGV4dH1gXHJcblx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHVuaXF1ZUdlbmVyYWxUYWdzID0gWy4uLm5ldyBTZXQoZ2VuZXJhbFRhZ3MpXVxyXG5cdFx0XHRcdC5tYXAoKHRhZykgPT4gKHRhZy5zdGFydHNXaXRoKFwiI1wiKSA/IHRhZyA6IGAjJHt0YWd9YCkpXHJcblx0XHRcdFx0LmZpbHRlcigodGFnKSA9PiB0YWcubGVuZ3RoID4gMSk7XHJcblxyXG5cdFx0XHRpZiAodW5pcXVlR2VuZXJhbFRhZ3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goLi4udW5pcXVlR2VuZXJhbFRhZ3MpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gMi4gUHJvamVjdCAtIE9ubHkgd3JpdGUgcHJvamVjdCBpZiBpdCdzIG5vdCBhIHJlYWQtb25seSB0Z1Byb2plY3RcclxuXHRcdGNvbnN0IHNob3VsZFdyaXRlUHJvamVjdCA9XHJcblx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByb2plY3QgJiYgIWlzUHJvamVjdFJlYWRvbmx5KG9yaWdpbmFsVGFzayk7XHJcblx0XHRpZiAoc2hvdWxkV3JpdGVQcm9qZWN0KSB7XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3RQcmVmaXggPVxyXG5cdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJvamVjdFRhZ1ByZWZpeFtcclxuXHRcdFx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXRcclxuXHRcdFx0XHRcdF0gfHwgXCJwcm9qZWN0XCI7XHJcblx0XHRcdFx0Y29uc3QgcHJvamVjdEZpZWxkID0gYFske3Byb2plY3RQcmVmaXh9OjogJHt1cGRhdGVkVGFzay5tZXRhZGF0YS5wcm9qZWN0fV1gO1xyXG5cdFx0XHRcdGlmICghbWV0YWRhdGEuaW5jbHVkZXMocHJvamVjdEZpZWxkKSkge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEucHVzaChwcm9qZWN0RmllbGQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRjb25zdCBwcm9qZWN0UHJlZml4ID1cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXhbXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRdIHx8IFwicHJvamVjdFwiO1xyXG5cdFx0XHRcdGNvbnN0IHByb2plY3RUYWcgPSBgIyR7cHJvamVjdFByZWZpeH0vJHt1cGRhdGVkVGFzay5tZXRhZGF0YS5wcm9qZWN0fWA7XHJcblx0XHRcdFx0aWYgKCFtZXRhZGF0YS5pbmNsdWRlcyhwcm9qZWN0VGFnKSkge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEucHVzaChwcm9qZWN0VGFnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyAzLiBDb250ZXh0XHJcblx0XHRpZiAodXBkYXRlZFRhc2subWV0YWRhdGEuY29udGV4dCkge1xyXG5cdFx0XHRpZiAodXNlRGF0YXZpZXdGb3JtYXQpIHtcclxuXHRcdFx0XHRjb25zdCBjb250ZXh0UHJlZml4ID1cclxuXHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLmNvbnRleHRUYWdQcmVmaXhbXHJcblx0XHRcdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdFx0XHRdIHx8IFwiY29udGV4dFwiO1xyXG5cdFx0XHRcdGNvbnN0IGNvbnRleHRGaWVsZCA9IGBbJHtjb250ZXh0UHJlZml4fTo6ICR7dXBkYXRlZFRhc2subWV0YWRhdGEuY29udGV4dH1dYDtcclxuXHRcdFx0XHRpZiAoIW1ldGFkYXRhLmluY2x1ZGVzKGNvbnRleHRGaWVsZCkpIHtcclxuXHRcdFx0XHRcdG1ldGFkYXRhLnB1c2goY29udGV4dEZpZWxkKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Y29uc3QgY29udGV4dFRhZyA9IGBAJHt1cGRhdGVkVGFzay5tZXRhZGF0YS5jb250ZXh0fWA7XHJcblx0XHRcdFx0aWYgKCFtZXRhZGF0YS5pbmNsdWRlcyhjb250ZXh0VGFnKSkge1xyXG5cdFx0XHRcdFx0bWV0YWRhdGEucHVzaChjb250ZXh0VGFnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHQvLyA0LiBQcmlvcml0eVxyXG5cdFx0aWYgKHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByaW9yaXR5KSB7XHJcblx0XHRcdGlmICh1c2VEYXRhdmlld0Zvcm1hdCkge1xyXG5cdFx0XHRcdGxldCBwcmlvcml0eVZhbHVlOiBzdHJpbmcgfCBudW1iZXI7XHJcblx0XHRcdFx0c3dpdGNoICh1cGRhdGVkVGFzay5tZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0Y2FzZSA1OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJoaWdoZXN0XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSA0OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJoaWdoXCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAzOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eVZhbHVlID0gXCJtZWRpdW1cIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDI6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5VmFsdWUgPSBcImxvd1wiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgMTpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IFwibG93ZXN0XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlWYWx1ZSA9IHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnByaW9yaXR5O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKGBbcHJpb3JpdHk6OiAke3ByaW9yaXR5VmFsdWV9XWApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGxldCBwcmlvcml0eU1hcmtlciA9IFwiXCI7XHJcblx0XHRcdFx0c3dpdGNoICh1cGRhdGVkVGFzay5tZXRhZGF0YS5wcmlvcml0eSkge1xyXG5cdFx0XHRcdFx0Y2FzZSA1OlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi8J+UulwiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgNDpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIuKPq1wiO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdGNhc2UgMzpcclxuXHRcdFx0XHRcdFx0cHJpb3JpdHlNYXJrZXIgPSBcIvCflLxcIjtcclxuXHRcdFx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdFx0XHRjYXNlIDI6XHJcblx0XHRcdFx0XHRcdHByaW9yaXR5TWFya2VyID0gXCLwn5S9XCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdFx0Y2FzZSAxOlxyXG5cdFx0XHRcdFx0XHRwcmlvcml0eU1hcmtlciA9IFwi4o+sXCI7XHJcblx0XHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAocHJpb3JpdHlNYXJrZXIpIG1ldGFkYXRhLnB1c2gocHJpb3JpdHlNYXJrZXIpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gNC41IERlcGVuZHMgT24gKG9ubHkgaWYgbm9uLWVtcHR5KVxyXG5cdFx0Y29uc3QgZGVwZW5kc1ZhbHVlOiBhbnkgPSAodXBkYXRlZFRhc2subWV0YWRhdGEgYXMgYW55KS5kZXBlbmRzT247XHJcblx0XHRsZXQgZGVwZW5kc0xpc3Q6IHN0cmluZ1tdIHwgdW5kZWZpbmVkO1xyXG5cdFx0aWYgKEFycmF5LmlzQXJyYXkoZGVwZW5kc1ZhbHVlKSkge1xyXG5cdFx0XHRkZXBlbmRzTGlzdCA9IGRlcGVuZHNWYWx1ZS5maWx0ZXIoXHJcblx0XHRcdFx0KHYpID0+IHR5cGVvZiB2ID09PSBcInN0cmluZ1wiICYmIHYudHJpbSgpLmxlbmd0aCA+IDBcclxuXHRcdFx0KTtcclxuXHRcdH0gZWxzZSBpZiAodHlwZW9mIGRlcGVuZHNWYWx1ZSA9PT0gXCJzdHJpbmdcIikge1xyXG5cdFx0XHRkZXBlbmRzTGlzdCA9IGRlcGVuZHNWYWx1ZVxyXG5cdFx0XHRcdC5zcGxpdChcIixcIilcclxuXHRcdFx0XHQubWFwKChzKSA9PiBzLnRyaW0oKSlcclxuXHRcdFx0XHQuZmlsdGVyKChzKSA9PiBzLmxlbmd0aCA+IDApO1xyXG5cdFx0fVxyXG5cdFx0aWYgKGRlcGVuZHNMaXN0ICYmIGRlcGVuZHNMaXN0Lmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Y29uc3Qgam9pbmVkID0gZGVwZW5kc0xpc3Quam9pbihcIiwgXCIpO1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0ID8gYFtkZXBlbmRzT246OiAke2pvaW5lZH1dYCA6IGDim5QgJHtqb2luZWR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh1cGRhdGVkVGFzay5tZXRhZGF0YS5pZCkge1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbaWQ6OiAke3VwZGF0ZWRUYXNrLm1ldGFkYXRhLmlkfV1gXHJcblx0XHRcdFx0XHQ6IGDwn4aUICR7dXBkYXRlZFRhc2subWV0YWRhdGEuaWR9YFxyXG5cdFx0XHQpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh1cGRhdGVkVGFzay5tZXRhZGF0YS5vbkNvbXBsZXRpb24pIHtcclxuXHRcdFx0bWV0YWRhdGEucHVzaChcclxuXHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0PyBgW29uQ29tcGxldGlvbjo6ICR7dXBkYXRlZFRhc2subWV0YWRhdGEub25Db21wbGV0aW9ufV1gXHJcblx0XHRcdFx0XHQ6IGDwn4+BICR7dXBkYXRlZFRhc2subWV0YWRhdGEub25Db21wbGV0aW9ufWBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyA1LiBSZWN1cnJlbmNlXHJcblx0XHRpZiAodXBkYXRlZFRhc2subWV0YWRhdGEucmVjdXJyZW5jZSkge1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbcmVwZWF0OjogJHt1cGRhdGVkVGFzay5tZXRhZGF0YS5yZWN1cnJlbmNlfV1gXHJcblx0XHRcdFx0XHQ6IGDwn5SBICR7dXBkYXRlZFRhc2subWV0YWRhdGEucmVjdXJyZW5jZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gNi4gU3RhcnQgRGF0ZVxyXG5cdFx0aWYgKGZvcm1hdHRlZFN0YXJ0RGF0ZSkge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0IShcclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnVzZUFzRGF0ZVR5cGUgPT09IFwic3RhcnRcIiAmJlxyXG5cdFx0XHRcdFx0Zm9ybWF0RGF0ZShvcmlnaW5hbFRhc2subWV0YWRhdGEuc3RhcnREYXRlKSA9PT1cclxuXHRcdFx0XHRcdFx0Zm9ybWF0dGVkU3RhcnREYXRlXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdFx0PyBgW3N0YXJ0OjogJHtmb3JtYXR0ZWRTdGFydERhdGV9XWBcclxuXHRcdFx0XHRcdFx0OiBg8J+bqyAke2Zvcm1hdHRlZFN0YXJ0RGF0ZX1gXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIDcuIFNjaGVkdWxlZCBEYXRlXHJcblx0XHRpZiAoZm9ybWF0dGVkU2NoZWR1bGVkRGF0ZSkge1xyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0IShcclxuXHRcdFx0XHRcdHVwZGF0ZWRUYXNrLm1ldGFkYXRhLnVzZUFzRGF0ZVR5cGUgPT09IFwic2NoZWR1bGVkXCIgJiZcclxuXHRcdFx0XHRcdGZvcm1hdERhdGUob3JpZ2luYWxUYXNrLm1ldGFkYXRhLnNjaGVkdWxlZERhdGUpID09PVxyXG5cdFx0XHRcdFx0XHRmb3JtYXR0ZWRTY2hlZHVsZWREYXRlXHJcblx0XHRcdFx0KVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdFx0dXNlRGF0YXZpZXdGb3JtYXRcclxuXHRcdFx0XHRcdFx0PyBgW3NjaGVkdWxlZDo6ICR7Zm9ybWF0dGVkU2NoZWR1bGVkRGF0ZX1dYFxyXG5cdFx0XHRcdFx0XHQ6IGDij7MgJHtmb3JtYXR0ZWRTY2hlZHVsZWREYXRlfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gOC4gRHVlIERhdGVcclxuXHRcdGlmIChmb3JtYXR0ZWREdWVEYXRlKSB7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQhKFxyXG5cdFx0XHRcdFx0dXBkYXRlZFRhc2subWV0YWRhdGEudXNlQXNEYXRlVHlwZSA9PT0gXCJkdWVcIiAmJlxyXG5cdFx0XHRcdFx0Zm9ybWF0RGF0ZShvcmlnaW5hbFRhc2subWV0YWRhdGEuZHVlRGF0ZSkgPT09XHJcblx0XHRcdFx0XHRcdGZvcm1hdHRlZER1ZURhdGVcclxuXHRcdFx0XHQpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdG1ldGFkYXRhLnB1c2goXHJcblx0XHRcdFx0XHR1c2VEYXRhdmlld0Zvcm1hdFxyXG5cdFx0XHRcdFx0XHQ/IGBbZHVlOjogJHtmb3JtYXR0ZWREdWVEYXRlfV1gXHJcblx0XHRcdFx0XHRcdDogYPCfk4UgJHtmb3JtYXR0ZWREdWVEYXRlfWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gOS4gQ29tcGxldGlvbiBEYXRlIChvbmx5IGlmIGNvbXBsZXRlZClcclxuXHRcdGlmIChmb3JtYXR0ZWRDb21wbGV0ZWREYXRlICYmIHVwZGF0ZWRUYXNrLmNvbXBsZXRlZCkge1xyXG5cdFx0XHRtZXRhZGF0YS5wdXNoKFxyXG5cdFx0XHRcdHVzZURhdGF2aWV3Rm9ybWF0XHJcblx0XHRcdFx0XHQ/IGBbY29tcGxldGlvbjo6ICR7Zm9ybWF0dGVkQ29tcGxldGVkRGF0ZX1dYFxyXG5cdFx0XHRcdFx0OiBg4pyFICR7Zm9ybWF0dGVkQ29tcGxldGVkRGF0ZX1gXHJcblx0XHRcdCk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIG1ldGFkYXRhO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGV4aXN0aW5nIG1ldGFkYXRhIGZyb20gYSB0YXNrIGxpbmVcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlbW92ZUV4aXN0aW5nTWV0YWRhdGEobGluZTogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdGxldCB1cGRhdGVkTGluZSA9IGxpbmU7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGVtb2ppIGRhdGVzXHJcblx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoL/Cfk4VcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoL/Cfm6tcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoL+KPs1xccypcXGR7NH0tXFxkezJ9LVxcZHsyfS9nLCBcIlwiKTtcclxuXHRcdHVwZGF0ZWRMaW5lID0gdXBkYXRlZExpbmUucmVwbGFjZSgv4pyFXFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9L2csIFwiXCIpO1xyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKC/inpVcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vZywgXCJcIik7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGRhdGF2aWV3IGRhdGVzIChpbmxpbmUgZmllbGQgZm9ybWF0KVxyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHQvXFxbKD86ZHVlfPCfl5PvuI8pOjpcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn1cXF0vZ2ksXHJcblx0XHRcdFwiXCJcclxuXHRcdCk7XHJcblx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoXHJcblx0XHRcdC9cXFsoPzpjb21wbGV0aW9ufOKchSk6OlxccypcXGR7NH0tXFxkezJ9LVxcZHsyfVxcXS9naSxcclxuXHRcdFx0XCJcIlxyXG5cdFx0KTtcclxuXHRcdHVwZGF0ZWRMaW5lID0gdXBkYXRlZExpbmUucmVwbGFjZShcclxuXHRcdFx0L1xcWyg/OmNyZWF0ZWR84p6VKTo6XFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9XFxdL2dpLFxyXG5cdFx0XHRcIlwiXHJcblx0XHQpO1xyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHQvXFxbKD86c3RhcnR88J+bqyk6OlxccypcXGR7NH0tXFxkezJ9LVxcZHsyfVxcXS9naSxcclxuXHRcdFx0XCJcIlxyXG5cdFx0KTtcclxuXHRcdHVwZGF0ZWRMaW5lID0gdXBkYXRlZExpbmUucmVwbGFjZShcclxuXHRcdFx0L1xcWyg/OnNjaGVkdWxlZHzij7MpOjpcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn1cXF0vZ2ksXHJcblx0XHRcdFwiXCJcclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGVtb2ppIHByaW9yaXR5IG1hcmtlcnNcclxuXHRcdHVwZGF0ZWRMaW5lID0gdXBkYXRlZExpbmUucmVwbGFjZShcclxuXHRcdFx0L1xccyso8J+UvHzwn5S9fOKPq3zij6x88J+UunxcXFsjW0EtQ11cXF0pL2csXHJcblx0XHRcdFwiXCJcclxuXHRcdCk7XHJcblx0XHQvLyBSZW1vdmUgZGF0YXZpZXcgcHJpb3JpdHlcclxuXHRcdHVwZGF0ZWRMaW5lID0gdXBkYXRlZExpbmUucmVwbGFjZSgvXFxbcHJpb3JpdHk6OlxccypcXHcrXFxdL2dpLCBcIlwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZW1vamkgcmVjdXJyZW5jZVxyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKC/wn5SBXFxzKlteXFxzXSsvZywgXCJcIik7XHJcblx0XHQvLyBSZW1vdmUgZGF0YXZpZXcgcmVjdXJyZW5jZVxyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHQvXFxbKD86cmVwZWF0fHJlY3VycmVuY2UpOjpcXHMqW15cXF1dK1xcXS9naSxcclxuXHRcdFx0XCJcIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZW1vdmUgZGF0YXZpZXcgcHJvamVjdCBhbmQgY29udGV4dCAodXNpbmcgY29uZmlndXJhYmxlIHByZWZpeGVzKVxyXG5cdFx0Y29uc3QgcHJvamVjdFByZWZpeCA9XHJcblx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByb2plY3RUYWdQcmVmaXhbXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucHJlZmVyTWV0YWRhdGFGb3JtYXRcclxuXHRcdFx0XSB8fCBcInByb2plY3RcIjtcclxuXHRcdGNvbnN0IGNvbnRleHRQcmVmaXggPVxyXG5cdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5jb250ZXh0VGFnUHJlZml4W1xyXG5cdFx0XHRcdHRoaXMucGx1Z2luLnNldHRpbmdzLnByZWZlck1ldGFkYXRhRm9ybWF0XHJcblx0XHRcdF0gfHwgXCJAXCI7XHJcblx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoXHJcblx0XHRcdG5ldyBSZWdFeHAoYFxcXFxbJHtwcm9qZWN0UHJlZml4fTo6XFxcXHMqW15cXFxcXV0rXFxcXF1gLCBcImdpXCIpLFxyXG5cdFx0XHRcIlwiXHJcblx0XHQpO1xyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHRuZXcgUmVnRXhwKGBcXFxcWyR7Y29udGV4dFByZWZpeH06OlxcXFxzKlteXFxcXF1dK1xcXFxdYCwgXCJnaVwiKSxcclxuXHRcdFx0XCJcIlxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZW1vdmUgQUxMIGV4aXN0aW5nIHRhZ3MgdG8gcHJldmVudCBkdXBsaWNhdGlvblxyXG5cdFx0dXBkYXRlZExpbmUgPSB1cGRhdGVkTGluZS5yZXBsYWNlKFxyXG5cdFx0XHQvI1teXFx1MjAwMC1cXHUyMDZGXFx1MkUwMC1cXHUyRTdGJyFcIiMkJSYoKSorLC46Ozw9Pj9AXmB7fH1+XFxbXFxdXFxcXFxcc10rL2csXHJcblx0XHRcdFwiXCJcclxuXHRcdCk7XHJcblx0XHR1cGRhdGVkTGluZSA9IHVwZGF0ZWRMaW5lLnJlcGxhY2UoL0BbXlxcc0BdKy9nLCBcIlwiKTtcclxuXHJcblx0XHRyZXR1cm4gdXBkYXRlZExpbmU7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZWxldGUgYSB0YXNrIGZyb20gYSBDYW52YXMgZmlsZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyBkZWxldGVDYW52YXNUYXNrKFxyXG5cdFx0dGFzazogVGFzazxDYW52YXNUYXNrTWV0YWRhdGE+LFxyXG5cdFx0ZGVsZXRlQ2hpbGRyZW46IGJvb2xlYW4gPSBmYWxzZVxyXG5cdCk6IFByb21pc2U8Q2FudmFzVGFza1VwZGF0ZVJlc3VsdD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gR2V0IHRoZSBDYW52YXMgZmlsZVxyXG5cdFx0XHRjb25zdCBmaWxlID0gdGhpcy52YXVsdC5nZXRGaWxlQnlQYXRoKHRhc2suZmlsZVBhdGgpO1xyXG5cdFx0XHRpZiAoIWZpbGUpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRlcnJvcjogYENhbnZhcyBmaWxlIG5vdCBmb3VuZDogJHt0YXNrLmZpbGVQYXRofWAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhZCB0aGUgQ2FudmFzIGZpbGUgY29udGVudFxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5yZWFkKGZpbGUpO1xyXG5cclxuXHRcdFx0Ly8gVXNlIENhbnZhc1BhcnNlciB1dGlsaXR5IHRvIHBhcnNlIEpTT05cclxuXHRcdFx0Y29uc3QgY2FudmFzRGF0YSA9IENhbnZhc1BhcnNlci5wYXJzZUNhbnZhc0pTT04oY29udGVudCk7XHJcblx0XHRcdGlmICghY2FudmFzRGF0YSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBcIkZhaWxlZCB0byBwYXJzZSBDYW52YXMgSlNPTlwiLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEZpbmQgdGhlIHRleHQgbm9kZSBjb250YWluaW5nIHRoZSB0YXNrXHJcblx0XHRcdGNvbnN0IG5vZGVJZCA9IHRhc2subWV0YWRhdGEuY2FudmFzTm9kZUlkO1xyXG5cdFx0XHRpZiAoIW5vZGVJZCkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBcIlRhc2sgZG9lcyBub3QgaGF2ZSBhIENhbnZhcyBub2RlIElEXCIsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXNlIENhbnZhc1BhcnNlciB1dGlsaXR5IHRvIGZpbmQgdGhlIHRleHQgbm9kZVxyXG5cdFx0XHRjb25zdCB0ZXh0Tm9kZSA9IENhbnZhc1BhcnNlci5maW5kVGV4dE5vZGUoY2FudmFzRGF0YSwgbm9kZUlkKTtcclxuXHJcblx0XHRcdGlmICghdGV4dE5vZGUpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRlcnJvcjogYENhbnZhcyB0ZXh0IG5vZGUgbm90IGZvdW5kOiAke25vZGVJZH1gLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIERlbGV0ZSB0aGUgdGFzayBmcm9tIHRoZSB0ZXh0IG5vZGVcclxuXHRcdFx0Y29uc3QgZGVsZXRlUmVzdWx0ID0gdGhpcy5kZWxldGVUYXNrRnJvbVRleHROb2RlKHRleHROb2RlLCB0YXNrLCBkZWxldGVDaGlsZHJlbik7XHJcblxyXG5cdFx0XHRpZiAoIWRlbGV0ZVJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0cmV0dXJuIGRlbGV0ZVJlc3VsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gV3JpdGUgdGhlIHVwZGF0ZWQgQ2FudmFzIGNvbnRlbnQgYmFjayB0byB0aGUgZmlsZVxyXG5cdFx0XHRjb25zdCB1cGRhdGVkQ29udGVudCA9IEpTT04uc3RyaW5naWZ5KGNhbnZhc0RhdGEsIG51bGwsIDIpO1xyXG5cdFx0XHRhd2FpdCB0aGlzLnZhdWx0Lm1vZGlmeShmaWxlLCB1cGRhdGVkQ29udGVudCk7XHJcblxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IHRydWUsXHJcblx0XHRcdFx0dXBkYXRlZENvbnRlbnQsXHJcblx0XHRcdH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBgRXJyb3IgZGVsZXRpbmcgQ2FudmFzIHRhc2s6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTW92ZSBhIHRhc2sgZnJvbSBvbmUgQ2FudmFzIGxvY2F0aW9uIHRvIGFub3RoZXJcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgbW92ZUNhbnZhc1Rhc2soXHJcblx0XHR0YXNrOiBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4sXHJcblx0XHR0YXJnZXRGaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0dGFyZ2V0Tm9kZUlkPzogc3RyaW5nLFxyXG5cdFx0dGFyZ2V0U2VjdGlvbj86IHN0cmluZ1xyXG5cdCk6IFByb21pc2U8Q2FudmFzVGFza1VwZGF0ZVJlc3VsdD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gRmlyc3QsIGdldCB0aGUgdGFzayBjb250ZW50IGJlZm9yZSBkZWxldGlvblxyXG5cdFx0XHRjb25zdCB0YXNrQ29udGVudCA9XHJcblx0XHRcdFx0dGFzay5vcmlnaW5hbE1hcmtkb3duIHx8IHRoaXMuZm9ybWF0VGFza0xpbmUodGFzayk7XHJcblxyXG5cdFx0XHQvLyBEZWxldGUgZnJvbSBzb3VyY2VcclxuXHRcdFx0Y29uc3QgZGVsZXRlUmVzdWx0ID0gYXdhaXQgdGhpcy5kZWxldGVDYW52YXNUYXNrKHRhc2spO1xyXG5cdFx0XHRpZiAoIWRlbGV0ZVJlc3VsdC5zdWNjZXNzKSB7XHJcblx0XHRcdFx0cmV0dXJuIGRlbGV0ZVJlc3VsdDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIHRvIHRhcmdldFxyXG5cdFx0XHRjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmFkZFRhc2tUb0NhbnZhc05vZGUoXHJcblx0XHRcdFx0dGFyZ2V0RmlsZVBhdGgsXHJcblx0XHRcdFx0dGFza0NvbnRlbnQsXHJcblx0XHRcdFx0dGFyZ2V0Tm9kZUlkLFxyXG5cdFx0XHRcdHRhcmdldFNlY3Rpb25cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdHJldHVybiBhZGRSZXN1bHQ7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdGVycm9yOiBgRXJyb3IgbW92aW5nIENhbnZhcyB0YXNrOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIER1cGxpY2F0ZSBhIHRhc2sgd2l0aGluIGEgQ2FudmFzIGZpbGVcclxuXHQgKi9cclxuXHRwdWJsaWMgYXN5bmMgZHVwbGljYXRlQ2FudmFzVGFzayhcclxuXHRcdHRhc2s6IFRhc2s8Q2FudmFzVGFza01ldGFkYXRhPixcclxuXHRcdHRhcmdldEZpbGVQYXRoPzogc3RyaW5nLFxyXG5cdFx0dGFyZ2V0Tm9kZUlkPzogc3RyaW5nLFxyXG5cdFx0dGFyZ2V0U2VjdGlvbj86IHN0cmluZyxcclxuXHRcdHByZXNlcnZlTWV0YWRhdGE6IGJvb2xlYW4gPSB0cnVlXHJcblx0KTogUHJvbWlzZTxDYW52YXNUYXNrVXBkYXRlUmVzdWx0PiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBDcmVhdGUgZHVwbGljYXRlIHRhc2sgY29udGVudFxyXG5cdFx0XHRsZXQgZHVwbGljYXRlQ29udGVudCA9XHJcblx0XHRcdFx0dGFzay5vcmlnaW5hbE1hcmtkb3duIHx8IHRoaXMuZm9ybWF0VGFza0xpbmUodGFzayk7XHJcblxyXG5cdFx0XHQvLyBSZXNldCBjb21wbGV0aW9uIHN0YXR1c1xyXG5cdFx0XHRkdXBsaWNhdGVDb250ZW50ID0gZHVwbGljYXRlQ29udGVudC5yZXBsYWNlKFxyXG5cdFx0XHRcdC9eKFxccypbLSorXVxccypcXFspW3hYXFwtXShcXF0pLyxcclxuXHRcdFx0XHRcIiQxICQyXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghcHJlc2VydmVNZXRhZGF0YSkge1xyXG5cdFx0XHRcdC8vIFJlbW92ZSBjb21wbGV0aW9uLXJlbGF0ZWQgbWV0YWRhdGFcclxuXHRcdFx0XHRkdXBsaWNhdGVDb250ZW50ID1cclxuXHRcdFx0XHRcdHRoaXMucmVtb3ZlQ29tcGxldGlvbk1ldGFkYXRhKGR1cGxpY2F0ZUNvbnRlbnQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgZHVwbGljYXRlIGluZGljYXRvclxyXG5cdFx0XHRjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoXCJUXCIpWzBdO1xyXG5cdFx0XHRkdXBsaWNhdGVDb250ZW50ICs9IGAgKGR1cGxpY2F0ZWQgJHt0aW1lc3RhbXB9KWA7XHJcblxyXG5cdFx0XHQvLyBBZGQgdG8gdGFyZ2V0IGxvY2F0aW9uXHJcblx0XHRcdGNvbnN0IHRhcmdldEZpbGUgPSB0YXJnZXRGaWxlUGF0aCB8fCB0YXNrLmZpbGVQYXRoO1xyXG5cdFx0XHRjb25zdCBhZGRSZXN1bHQgPSBhd2FpdCB0aGlzLmFkZFRhc2tUb0NhbnZhc05vZGUoXHJcblx0XHRcdFx0dGFyZ2V0RmlsZSxcclxuXHRcdFx0XHRkdXBsaWNhdGVDb250ZW50LFxyXG5cdFx0XHRcdHRhcmdldE5vZGVJZCxcclxuXHRcdFx0XHR0YXJnZXRTZWN0aW9uXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRyZXR1cm4gYWRkUmVzdWx0O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYEVycm9yIGR1cGxpY2F0aW5nIENhbnZhcyB0YXNrOiAke2Vycm9yLm1lc3NhZ2V9YCxcclxuXHRcdFx0fTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEFkZCBhIHRhc2sgdG8gYSBDYW52YXMgdGV4dCBub2RlXHJcblx0ICovXHJcblx0cHVibGljIGFzeW5jIGFkZFRhc2tUb0NhbnZhc05vZGUoXHJcblx0XHRmaWxlUGF0aDogc3RyaW5nLFxyXG5cdFx0dGFza0NvbnRlbnQ6IHN0cmluZyxcclxuXHRcdHRhcmdldE5vZGVJZD86IHN0cmluZyxcclxuXHRcdHRhcmdldFNlY3Rpb24/OiBzdHJpbmdcclxuXHQpOiBQcm9taXNlPENhbnZhc1Rhc2tVcGRhdGVSZXN1bHQ+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdC8vIEdldCB0aGUgQ2FudmFzIGZpbGVcclxuXHRcdFx0Y29uc3QgZmlsZSA9IHRoaXMudmF1bHQuZ2V0RmlsZUJ5UGF0aChmaWxlUGF0aCk7XHJcblx0XHRcdGlmICghZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBgQ2FudmFzIGZpbGUgbm90IGZvdW5kOiAke2ZpbGVQYXRofWAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gUmVhZCB0aGUgQ2FudmFzIGZpbGUgY29udGVudFxyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gYXdhaXQgdGhpcy52YXVsdC5yZWFkKGZpbGUpO1xyXG5cclxuXHRcdFx0Ly8gVXNlIENhbnZhc1BhcnNlciB1dGlsaXR5IHRvIHBhcnNlIEpTT05cclxuXHRcdFx0Y29uc3QgY2FudmFzRGF0YSA9IENhbnZhc1BhcnNlci5wYXJzZUNhbnZhc0pTT04oY29udGVudCk7XHJcblx0XHRcdGlmICghY2FudmFzRGF0YSkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdGVycm9yOiBcIkZhaWxlZCB0byBwYXJzZSBDYW52YXMgSlNPTlwiLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEZpbmQgb3IgY3JlYXRlIHRhcmdldCB0ZXh0IG5vZGVcclxuXHRcdFx0bGV0IHRhcmdldE5vZGU6IENhbnZhc1RleHREYXRhO1xyXG5cclxuXHRcdFx0aWYgKHRhcmdldE5vZGVJZCkge1xyXG5cdFx0XHRcdGNvbnN0IGV4aXN0aW5nTm9kZSA9IGNhbnZhc0RhdGEubm9kZXMuZmluZChcclxuXHRcdFx0XHRcdChub2RlKTogbm9kZSBpcyBDYW52YXNUZXh0RGF0YSA9PlxyXG5cdFx0XHRcdFx0XHRub2RlLnR5cGUgPT09IFwidGV4dFwiICYmIG5vZGUuaWQgPT09IHRhcmdldE5vZGVJZFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdGlmICghZXhpc3RpbmdOb2RlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0ZXJyb3I6IGBUYXJnZXQgQ2FudmFzIHRleHQgbm9kZSBub3QgZm91bmQ6ICR7dGFyZ2V0Tm9kZUlkfWAsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0dGFyZ2V0Tm9kZSA9IGV4aXN0aW5nTm9kZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBDcmVhdGUgYSBuZXcgdGV4dCBub2RlIGlmIG5vIHRhcmdldCBzcGVjaWZpZWRcclxuXHRcdFx0XHR0YXJnZXROb2RlID0gdGhpcy5jcmVhdGVOZXdUZXh0Tm9kZShjYW52YXNEYXRhKTtcclxuXHRcdFx0XHRjYW52YXNEYXRhLm5vZGVzLnB1c2godGFyZ2V0Tm9kZSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIEFkZCB0YXNrIHRvIHRoZSB0ZXh0IG5vZGVcclxuXHRcdFx0Y29uc3QgYWRkUmVzdWx0ID0gdGhpcy5hZGRUYXNrVG9UZXh0Tm9kZShcclxuXHRcdFx0XHR0YXJnZXROb2RlLFxyXG5cdFx0XHRcdHRhc2tDb250ZW50LFxyXG5cdFx0XHRcdHRhcmdldFNlY3Rpb25cclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGlmICghYWRkUmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0XHRyZXR1cm4gYWRkUmVzdWx0O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBXcml0ZSB0aGUgdXBkYXRlZCBDYW52YXMgY29udGVudCBiYWNrIHRvIHRoZSBmaWxlXHJcblx0XHRcdGNvbnN0IHVwZGF0ZWRDb250ZW50ID0gSlNPTi5zdHJpbmdpZnkoY2FudmFzRGF0YSwgbnVsbCwgMik7XHJcblx0XHRcdGF3YWl0IHRoaXMudmF1bHQubW9kaWZ5KGZpbGUsIHVwZGF0ZWRDb250ZW50KTtcclxuXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHR1cGRhdGVkQ29udGVudCxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IGBFcnJvciBhZGRpbmcgdGFzayB0byBDYW52YXMgbm9kZTogJHtlcnJvci5tZXNzYWdlfWAsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEZWxldGUgYSB0YXNrIGZyb20gYSB0ZXh0IG5vZGUncyBjb250ZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSBkZWxldGVUYXNrRnJvbVRleHROb2RlKFxyXG5cdFx0dGV4dE5vZGU6IENhbnZhc1RleHREYXRhLFxyXG5cdFx0dGFzazogVGFzayxcclxuXHRcdGRlbGV0ZUNoaWxkcmVuOiBib29sZWFuID0gZmFsc2VcclxuXHQpOiBDYW52YXNUYXNrVXBkYXRlUmVzdWx0IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gdGV4dE5vZGUudGV4dC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0bGV0IHRhc2tGb3VuZCA9IGZhbHNlO1xyXG5cdFx0XHRsZXQgdXBkYXRlZExpbmVzID0gWy4uLmxpbmVzXTtcclxuXHRcdFx0bGV0IHRhc2tJbmRleCA9IC0xO1xyXG5cclxuXHRcdFx0Ly8gRmluZCB0aGUgdGFzayBsaW5lXHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHRoaXMgbGluZSBjb250YWlucyB0aGUgdGFzayB0byBkZWxldGVcclxuXHRcdFx0XHRpZiAodGhpcy5pc1Rhc2tMaW5lKGxpbmUpICYmIHRoaXMubGluZU1hdGNoZXNUYXNrKGxpbmUsIHRhc2spKSB7XHJcblx0XHRcdFx0XHR0YXNrSW5kZXggPSBpO1xyXG5cdFx0XHRcdFx0dGFza0ZvdW5kID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCF0YXNrRm91bmQpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0XHRlcnJvcjogYFRhc2sgbm90IGZvdW5kIGluIENhbnZhcyB0ZXh0IG5vZGU6ICR7dGFzay5vcmlnaW5hbE1hcmtkb3dufWAsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgbGluZXNUb0RlbGV0ZTogbnVtYmVyW10gPSBbdGFza0luZGV4XTtcclxuXHJcblx0XHRcdGlmIChkZWxldGVDaGlsZHJlbikge1xyXG5cdFx0XHRcdC8vIENhbGN1bGF0ZSBwYXJlbnQgaW5kZW50YXRpb25cclxuXHRcdFx0XHRjb25zdCBwYXJlbnRMaW5lID0gbGluZXNbdGFza0luZGV4XTtcclxuXHRcdFx0XHRjb25zdCBwYXJlbnRJbmRlbnQgPSB0aGlzLmdldEluZGVudExldmVsKHBhcmVudExpbmUpO1xyXG5cclxuXHRcdFx0XHQvLyBGaW5kIGFsbCBjaGlsZCB0YXNrcyAobGluZXMgd2l0aCBncmVhdGVyIGluZGVudGF0aW9uIGZvbGxvd2luZyB0aGUgcGFyZW50KVxyXG5cdFx0XHRcdGZvciAobGV0IGkgPSB0YXNrSW5kZXggKyAxOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRcdGNvbnN0IGxpbmUgPSBsaW5lc1tpXTtcclxuXHRcdFx0XHRcdGNvbnN0IGN1cnJlbnRJbmRlbnQgPSB0aGlzLmdldEluZGVudExldmVsKGxpbmUpO1xyXG5cclxuXHRcdFx0XHRcdC8vIFN0b3AgaWYgd2UgcmVhY2ggYSB0YXNrIGF0IHRoZSBzYW1lIG9yIGhpZ2hlciBsZXZlbFxyXG5cdFx0XHRcdFx0aWYgKHRoaXMuaXNUYXNrTGluZShsaW5lKSAmJiBjdXJyZW50SW5kZW50IDw9IHBhcmVudEluZGVudCkge1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBBZGQgY2hpbGQgdGFzayB0byBkZWxldGUgbGlzdFxyXG5cdFx0XHRcdFx0aWYgKHRoaXMuaXNUYXNrTGluZShsaW5lKSAmJiBjdXJyZW50SW5kZW50ID4gcGFyZW50SW5kZW50KSB7XHJcblx0XHRcdFx0XHRcdGxpbmVzVG9EZWxldGUucHVzaChpKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNvcnQgaW4gcmV2ZXJzZSBvcmRlciB0byBkZWxldGUgZnJvbSBib3R0b20gdG8gdG9wXHJcblx0XHRcdGxpbmVzVG9EZWxldGUuc29ydCgoYSwgYikgPT4gYiAtIGEpO1xyXG5cclxuXHRcdFx0Ly8gUmVtb3ZlIGFsbCBtYXJrZWQgbGluZXNcclxuXHRcdFx0Zm9yIChjb25zdCBpbmRleCBvZiBsaW5lc1RvRGVsZXRlKSB7XHJcblx0XHRcdFx0dXBkYXRlZExpbmVzLnNwbGljZShpbmRleCwgMSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgdGV4dCBub2RlIGNvbnRlbnRcclxuXHRcdFx0dGV4dE5vZGUudGV4dCA9IHVwZGF0ZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0cmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRlcnJvcjogYEVycm9yIGRlbGV0aW5nIHRhc2sgZnJvbSB0ZXh0IG5vZGU6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSBpbmRlbnRhdGlvbiBsZXZlbCBvZiBhIGxpbmVcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldEluZGVudExldmVsKGxpbmU6IHN0cmluZyk6IG51bWJlciB7XHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goL14oXFxzKikvKTtcclxuXHRcdHJldHVybiBtYXRjaCA/IG1hdGNoWzFdLmxlbmd0aCA6IDA7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgYSB0YXNrIHRvIGEgdGV4dCBub2RlJ3MgY29udGVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgYWRkVGFza1RvVGV4dE5vZGUoXHJcblx0XHR0ZXh0Tm9kZTogQ2FudmFzVGV4dERhdGEsXHJcblx0XHR0YXNrQ29udGVudDogc3RyaW5nLFxyXG5cdFx0dGFyZ2V0U2VjdGlvbj86IHN0cmluZ1xyXG5cdCk6IENhbnZhc1Rhc2tVcGRhdGVSZXN1bHQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSB0ZXh0Tm9kZS50ZXh0LnNwbGl0KFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0aWYgKHRhcmdldFNlY3Rpb24pIHtcclxuXHRcdFx0XHQvLyBGaW5kIHRoZSB0YXJnZXQgc2VjdGlvbiBhbmQgaW5zZXJ0IGFmdGVyIGl0XHJcblx0XHRcdFx0Y29uc3Qgc2VjdGlvbkluZGV4ID0gdGhpcy5maW5kU2VjdGlvbkluZGV4KFxyXG5cdFx0XHRcdFx0bGluZXMsXHJcblx0XHRcdFx0XHR0YXJnZXRTZWN0aW9uXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRpZiAoc2VjdGlvbkluZGV4ID49IDApIHtcclxuXHRcdFx0XHRcdGxpbmVzLnNwbGljZShzZWN0aW9uSW5kZXggKyAxLCAwLCB0YXNrQ29udGVudCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIFNlY3Rpb24gbm90IGZvdW5kLCBhZGQgYXQgdGhlIGVuZFxyXG5cdFx0XHRcdFx0bGluZXMucHVzaCh0YXNrQ29udGVudCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEFkZCBhdCB0aGUgZW5kIG9mIHRoZSB0ZXh0IG5vZGVcclxuXHRcdFx0XHRpZiAodGV4dE5vZGUudGV4dC50cmltKCkpIHtcclxuXHRcdFx0XHRcdGxpbmVzLnB1c2godGFza0NvbnRlbnQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRsaW5lc1swXSA9IHRhc2tDb250ZW50O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gVXBkYXRlIHRoZSB0ZXh0IG5vZGUgY29udGVudFxyXG5cdFx0XHR0ZXh0Tm9kZS50ZXh0ID0gbGluZXMuam9pbihcIlxcblwiKTtcclxuXHJcblx0XHRcdHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0ZXJyb3I6IGBFcnJvciBhZGRpbmcgdGFzayB0byB0ZXh0IG5vZGU6ICR7ZXJyb3IubWVzc2FnZX1gLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ3JlYXRlIGEgbmV3IHRleHQgbm9kZSBmb3IgQ2FudmFzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVOZXdUZXh0Tm9kZShjYW52YXNEYXRhOiBDYW52YXNEYXRhKTogQ2FudmFzVGV4dERhdGEge1xyXG5cdFx0Ly8gR2VuZXJhdGUgYSB1bmlxdWUgSUQgZm9yIHRoZSBuZXcgbm9kZVxyXG5cdFx0Y29uc3Qgbm9kZUlkID0gYHRhc2stbm9kZS0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKVxyXG5cdFx0XHQudG9TdHJpbmcoMzYpXHJcblx0XHRcdC5zdWJzdHIoMiwgOSl9YDtcclxuXHJcblx0XHQvLyBGaW5kIGEgZ29vZCBwb3NpdGlvbiBmb3IgdGhlIG5ldyBub2RlIChhdm9pZCBvdmVybGFwcylcclxuXHRcdGNvbnN0IGV4aXN0aW5nTm9kZXMgPSBjYW52YXNEYXRhLm5vZGVzO1xyXG5cdFx0bGV0IHggPSAwO1xyXG5cdFx0bGV0IHkgPSAwO1xyXG5cclxuXHRcdGlmIChleGlzdGluZ05vZGVzLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0Ly8gUG9zaXRpb24gbmV3IG5vZGUgdG8gdGhlIHJpZ2h0IG9mIGV4aXN0aW5nIG5vZGVzXHJcblx0XHRcdGNvbnN0IG1heFggPSBNYXRoLm1heChcclxuXHRcdFx0XHQuLi5leGlzdGluZ05vZGVzLm1hcCgobm9kZSkgPT4gbm9kZS54ICsgbm9kZS53aWR0aClcclxuXHRcdFx0KTtcclxuXHRcdFx0eCA9IG1heFggKyA1MDtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0eXBlOiBcInRleHRcIixcclxuXHRcdFx0aWQ6IG5vZGVJZCxcclxuXHRcdFx0eCxcclxuXHRcdFx0eSxcclxuXHRcdFx0d2lkdGg6IDI1MCxcclxuXHRcdFx0aGVpZ2h0OiA2MCxcclxuXHRcdFx0dGV4dDogXCJcIixcclxuXHRcdH07XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBGaW5kIHNlY3Rpb24gaW5kZXggaW4gdGV4dCBsaW5lc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgZmluZFNlY3Rpb25JbmRleChsaW5lczogc3RyaW5nW10sIHNlY3Rpb25OYW1lOiBzdHJpbmcpOiBudW1iZXIge1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRjb25zdCBsaW5lID0gbGluZXNbaV0udHJpbSgpO1xyXG5cdFx0XHQvLyBDaGVjayBmb3IgbWFya2Rvd24gaGVhZGluZ3NcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdGxpbmUuc3RhcnRzV2l0aChcIiNcIikgJiZcclxuXHRcdFx0XHRsaW5lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMoc2VjdGlvbk5hbWUudG9Mb3dlckNhc2UoKSlcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIGk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiAtMTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEZvcm1hdCBhIHRhc2sgYXMgYSBtYXJrZG93biBsaW5lXHJcblx0ICovXHJcblx0cHJpdmF0ZSBmb3JtYXRUYXNrTGluZSh0YXNrOiBUYXNrKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHN0YXR1cyA9IHRhc2suY29tcGxldGVkID8gXCJ4XCIgOiBcIiBcIjtcclxuXHRcdHJldHVybiBgLSBbJHtzdGF0dXN9XSAke3Rhc2suY29udGVudH1gO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVtb3ZlIGNvbXBsZXRpb24tcmVsYXRlZCBtZXRhZGF0YSBmcm9tIHRhc2sgY29udGVudFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVtb3ZlQ29tcGxldGlvbk1ldGFkYXRhKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHRsZXQgY2xlYW5lZCA9IGNvbnRlbnQ7XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGNvbXBsZXRpb24gZGF0ZVxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv4pyFXFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9L2csIFwiXCIpO1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxbY29tcGxldGlvbjo6XFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9XFxdL2dpLCBcIlwiKTtcclxuXHJcblx0XHQvLyBSZW1vdmUgc2NoZWR1bGVkIGRhdGUgaWYgZGVzaXJlZFxyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgv4o+wXFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9L2csIFwiXCIpO1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxbc2NoZWR1bGVkOjpcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn1cXF0vZ2ksIFwiXCIpO1xyXG5cclxuXHRcdC8vIENsZWFuIHVwIGV4dHJhIHNwYWNlc1xyXG5cdFx0Y2xlYW5lZCA9IGNsZWFuZWQucmVwbGFjZSgvXFxzKy9nLCBcIiBcIikudHJpbSgpO1xyXG5cclxuXHRcdHJldHVybiBjbGVhbmVkO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSB0YXNrIGlzIGEgQ2FudmFzIHRhc2tcclxuXHQgKi9cclxuXHRwdWJsaWMgc3RhdGljIGlzQ2FudmFzVGFzayh0YXNrOiBUYXNrKTogdGFzayBpcyBUYXNrPENhbnZhc1Rhc2tNZXRhZGF0YT4ge1xyXG5cdFx0cmV0dXJuICh0YXNrLm1ldGFkYXRhIGFzIGFueSkuc291cmNlVHlwZSA9PT0gXCJjYW52YXNcIjtcclxuXHR9XHJcbn1cclxuIl19