import { Decoration, EditorView, WidgetType, } from "@codemirror/view";
import { StateField, Facet } from "@codemirror/state";
import { editorInfoField, editorEditorField, MarkdownView } from "obsidian";
import { TaskTimerMetadataDetector } from "@/services/timer-metadata-service";
import { TaskTimerManager } from "@/managers/timer-manager";
import { TaskTimerFormatter } from "@/services/timer-format-service";
import { taskStatusChangeAnnotation } from "@/editor-extensions/task-operations/status-switcher";
import "@/styles/task-timer.css";
// Define a Facet to pass configuration to the StateField
const taskTimerConfigFacet = Facet.define({
    combine: (values) => values[0] || null
});
/**
 * Widget for displaying task timer controls above parent tasks
 */
class TaskTimerWidget extends WidgetType {
    constructor(state, settings, timerManager, lineFrom, lineTo, filePath, plugin, existingBlockId) {
        super();
        this.state = state;
        this.settings = settings;
        this.timerManager = timerManager;
        this.lineFrom = lineFrom;
        this.lineTo = lineTo;
        this.filePath = filePath;
        this.plugin = plugin;
        this.existingBlockId = existingBlockId;
        this.dom = null;
        this.updateInterval = null;
        this.timerState = null;
        this.currentTaskStatus = null;
        // If we have a block ID, try to load existing timer state
        if (this.existingBlockId) {
            this.loadTimerState();
        }
    }
    eq(other) {
        // Get current task status from the line
        const line = this.state.doc.lineAt(this.lineFrom);
        const currentStatus = this.getTaskStatus(line.text);
        // Force widget recreation if task status has changed
        if (this.currentTaskStatus && this.currentTaskStatus !== currentStatus) {
            console.log("[TaskTimer] Task status changed from", this.currentTaskStatus, "to", currentStatus);
            return false;
        }
        // Force widget recreation if task becomes completed
        if (currentStatus === 'completed') {
            console.log("[TaskTimer] Task is completed, forcing widget removal");
            return false;
        }
        return (this.lineFrom === other.lineFrom &&
            this.lineTo === other.lineTo &&
            this.filePath === other.filePath &&
            this.existingBlockId === other.existingBlockId);
    }
    toDOM() {
        if (this.dom) {
            this.refreshUI();
            return this.dom;
        }
        // Create a simple text-based widget
        this.dom = createDiv({ cls: 'task-timer-widget' });
        // Get and store current task status
        const line = this.state.doc.lineAt(this.lineFrom);
        this.currentTaskStatus = this.getTaskStatus(line.text);
        // Add debug info
        console.log("[TaskTimer] Creating widget for line", this.lineFrom, "status:", this.currentTaskStatus, "blockId:", this.existingBlockId);
        // Load timer state if we have a block ID
        if (this.existingBlockId) {
            this.loadTimerState();
        }
        else {
            this.updateTimerState();
        }
        this.createContent();
        return this.dom;
    }
    /**
     * Get task status from line text
     */
    getTaskStatus(lineText) {
        var _a, _b;
        // Extract the task marker
        const match = lineText.match(/\[([^\]]+)\]/);
        if (!match)
            return 'pending';
        const marker = match[1];
        const statuses = ((_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.taskStatuses) || {
            completed: "x|X",
            inProgress: ">|/",
            abandoned: "-",
            planned: "?",
            notStarted: " "
        };
        // Check against configured markers
        if (statuses.completed.split('|').includes(marker)) {
            return 'completed';
        }
        else if (statuses.inProgress.split('|').includes(marker)) {
            return 'in-progress';
        }
        else if (statuses.abandoned.split('|').includes(marker)) {
            return 'cancelled';
        }
        else if (statuses.notStarted.split('|').includes(marker) || marker === ' ') {
            return 'pending';
        }
        else {
            // Default to pending for unknown markers
            return 'pending';
        }
    }
    /**
     * Create content based on timer state
     */
    createContent() {
        if (!this.dom)
            return;
        this.dom.empty();
        // Always get fresh task status from current document
        const line = this.state.doc.lineAt(this.lineFrom);
        const taskStatus = this.getTaskStatus(line.text);
        this.currentTaskStatus = taskStatus; // Update stored status
        console.log("[TaskTimer] createContent - current task status:", taskStatus);
        // Don't show timer for completed tasks
        if (taskStatus === 'completed') {
            return;
        }
        // If we have a block ID and a timer state, show the timer regardless of task marker
        if (this.existingBlockId && this.timerState && this.timerState.status !== 'idle') {
            console.log("[TaskTimer] Found active timer for task with block ID");
            // Show timer based on existing state
            // Get total duration from timer manager
            const taskId = this.getTaskId();
            const elapsedMs = taskId ? this.timerManager.getCurrentDuration(taskId) : 0;
            const formattedTime = TaskTimerFormatter.formatDuration(elapsedMs, this.settings.timeFormat);
            const timeSpan = this.dom.createSpan();
            // Show paused state clearly
            if (this.timerState.status === 'paused') {
                timeSpan.setText(`⏸ ${formattedTime} (Paused) `);
            }
            else {
                timeSpan.setText(`⏱ ${formattedTime} `);
            }
            // Add action links based on timer state
            if (this.timerState.status === 'running') {
                this.addActionLink('Pause', () => this.pauseTimer());
                this.dom.appendText(' | ');
                this.addActionLink('Complete', () => this.completeTimer());
                // Start real-time updates
                this.startRealtimeUpdates();
            }
            else if (this.timerState.status === 'paused') {
                this.addActionLink('Resume', () => this.resumeTimer());
                this.dom.appendText(' | ');
                this.addActionLink('Complete', () => this.completeTimer());
            }
            this.dom.appendText(' | ');
            this.addActionLink('Reset', () => this.resetTimer());
            return;
        }
        // For in-progress tasks with existing block IDs
        if (taskStatus === 'in-progress' && this.existingBlockId) {
            // If there's an existing timer state, use it
            if (this.timerState && this.timerState.status !== 'idle') {
                // Show existing timer state
                // Get total duration from timer manager
                const taskId = this.getTaskId();
                const elapsedMs = taskId ? this.timerManager.getCurrentDuration(taskId) : 0;
                const formattedTime = TaskTimerFormatter.formatDuration(elapsedMs, this.settings.timeFormat);
                const timeSpan = this.dom.createSpan();
                // Show paused state clearly
                if (this.timerState.status === 'paused') {
                    timeSpan.setText(`⏸ ${formattedTime} (Paused) `);
                }
                else {
                    timeSpan.setText(`⏱ ${formattedTime} `);
                }
                // Add action links based on timer state
                if (this.timerState.status === 'running') {
                    this.addActionLink('Pause', () => this.pauseTimer());
                    this.dom.appendText(' | ');
                    this.addActionLink('Complete', () => this.completeTimer());
                }
                else if (this.timerState.status === 'paused') {
                    this.addActionLink('Resume', () => this.resumeTimer());
                    this.dom.appendText(' | ');
                    this.addActionLink('Complete', () => this.completeTimer());
                }
                this.dom.appendText(' | ');
                this.addActionLink('Reset', () => this.resetTimer());
            }
            else {
                // Task is in-progress with block ID but no timer state - auto-start timer
                console.log("[TaskTimer] In-progress task with block ID but no timer state, auto-starting");
                this.startTimer();
                // Timer will be shown after state update
                return;
            }
        }
        else if (!this.timerState || this.timerState.status === 'idle') {
            // Create text-style start button
            const startSpan = this.dom.createSpan({ cls: 'task-timer-start' });
            startSpan.setText('Start Task');
            startSpan.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log("[TaskTimer] Start button clicked");
                this.startTimer();
            });
        }
        else {
            // Show elapsed time
            // Get total duration from timer manager
            const taskId = this.getTaskId();
            const elapsedMs = taskId ? this.timerManager.getCurrentDuration(taskId) : 0;
            const formattedTime = TaskTimerFormatter.formatDuration(elapsedMs, this.settings.timeFormat);
            const timeSpan = this.dom.createSpan();
            // Show paused state clearly
            if (this.timerState.status === 'paused') {
                timeSpan.setText(`⏸ ${formattedTime} (Paused) `);
            }
            else {
                timeSpan.setText(`⏱ ${formattedTime} `);
            }
            // Add action links
            if (this.timerState.status === 'running') {
                this.addActionLink('Pause', () => this.pauseTimer());
                this.dom.appendText(' | ');
                this.addActionLink('Complete', () => this.completeTimer());
            }
            else if (this.timerState.status === 'paused') {
                this.addActionLink('Resume', () => this.resumeTimer());
                this.dom.appendText(' | ');
                this.addActionLink('Complete', () => this.completeTimer());
            }
            this.dom.appendText(' | ');
            this.addActionLink('Reset', () => this.resetTimer());
        }
    }
    /**
     * Add clickable action link
     */
    addActionLink(text, action) {
        if (!this.dom)
            return;
        const link = this.dom.createSpan({ cls: 'task-timer-action' });
        link.setText(text);
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            action();
        });
    }
    /**
     * Get the CodeMirror EditorView from various sources
     */
    getEditorView() {
        var _a, _b, _c;
        // Try to get from state field first
        const view = this.state.field(editorEditorField, false);
        if (view) {
            console.log("[TaskTimer] Got EditorView from editorEditorField");
            return view;
        }
        // Try from the plugin's app workspace
        if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.app) {
            const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (activeView === null || activeView === void 0 ? void 0 : activeView.editor) {
                const editor = activeView.editor;
                // For CM6 editor
                if (editor.cm) {
                    console.log("[TaskTimer] Got EditorView from activeView.editor.cm");
                    return editor.cm;
                }
                // Some versions might have it as cm6
                if (editor.cm6) {
                    console.log("[TaskTimer] Got EditorView from activeView.editor.cm6");
                    return editor.cm6;
                }
            }
        }
        // Try from the app's active editor
        const app = window.app;
        const activeLeaf = (_b = app === null || app === void 0 ? void 0 : app.workspace) === null || _b === void 0 ? void 0 : _b.activeLeaf;
        if ((_c = activeLeaf === null || activeLeaf === void 0 ? void 0 : activeLeaf.view) === null || _c === void 0 ? void 0 : _c.editor) {
            const editor = activeLeaf.view.editor;
            // Check for CodeMirror 6
            if (editor.cm) {
                console.log("[TaskTimer] Got EditorView from editor.cm");
                return editor.cm;
            }
            if (editor.cm6) {
                console.log("[TaskTimer] Got EditorView from editor.cm6");
                return editor.cm6;
            }
        }
        // Try to find the view through the widget's DOM element
        if (this.dom && this.dom.parentElement) {
            const cmContent = this.dom.closest('.cm-content');
            if (cmContent) {
                const cmEditor = cmContent.closest('.cm-editor');
                if (cmEditor && cmEditor.cmView) {
                    console.log("[TaskTimer] Got EditorView from DOM element");
                    return cmEditor.cmView.view;
                }
            }
        }
        console.error("[TaskTimer] Could not find EditorView through any method");
        return null;
    }
    /**
     * Update task status marker in the document
     */
    updateTaskStatus(newStatus) {
        var _a, _b, _c;
        const line = this.state.doc.lineAt(this.lineFrom);
        const lineText = line.text;
        // Check if this line contains a task
        const taskRegex = /^[\s|\t]*([-*+]|\d+\.)\s+\[[^]]*\]/;
        const match = lineText.match(taskRegex);
        if (!match) {
            // Not a task line
            return false;
        }
        // Replace task status marker - match any character(s) inside brackets
        const updatedText = lineText.replace(/\[([^\]]*)\]/, newStatus);
        console.log(`[TaskTimer] updateTaskStatus - original: "${lineText}"`);
        console.log(`[TaskTimer] updateTaskStatus - newStatus: "${newStatus}"`);
        console.log(`[TaskTimer] updateTaskStatus - updated: "${updatedText}"`);
        if (updatedText === lineText) {
            // No change needed
            console.log("[TaskTimer] updateTaskStatus - no change needed");
            return false;
        }
        // Get the editor view to use CodeMirror's dispatch
        const view = this.getEditorView();
        if (!view) {
            // Fallback to Obsidian API if no CodeMirror view
            const activeView = (_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.app) === null || _b === void 0 ? void 0 : _b.workspace) === null || _c === void 0 ? void 0 : _c.getActiveViewOfType(MarkdownView);
            if (!(activeView === null || activeView === void 0 ? void 0 : activeView.editor) || !activeView.file) {
                return false;
            }
            // Check if we're updating the correct file
            if (activeView.file.path !== this.filePath) {
                return false;
            }
            // Update the line using Obsidian's editor API
            const lineNum = line.number - 1; // Convert to 0-based
            activeView.editor.setLine(lineNum, updatedText);
            return true;
        }
        // Use CodeMirror dispatch with annotation to prevent cycleCompleteStatus interference
        view.dispatch({
            changes: {
                from: line.from,
                to: line.to,
                insert: updatedText
            },
            annotations: taskStatusChangeAnnotation.of("taskTimer")
        });
        return true;
    }
    /**
     * Start timer
     */
    startTimer() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            let taskId = this.getTaskId();
            // If no existing block ID, generate one and insert it
            if (!taskId) {
                const blockId = this.timerManager.generateBlockId(this.settings.blockRefPrefix);
                // Get EditorView using our helper method
                const view = this.getEditorView();
                console.log("[TaskTimer] EditorView:", view);
                if (view) {
                    const line = this.state.doc.lineAt(this.lineFrom);
                    const lineText = line.text;
                    const blockRef = ` ^${blockId}`;
                    // Also update task status to in-progress
                    const inProgressMarkers = (((_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.taskStatuses) === null || _c === void 0 ? void 0 : _c.inProgress) || ">|/").split('|');
                    const inProgressMarker = inProgressMarkers[0] || '/';
                    const updatedText = lineText
                        .replace(/\[([^\]]+)\]/, `[${inProgressMarker}]`)
                        .trimEnd() + blockRef;
                    console.log(`[TaskTimer] Updating line ${line.number}`);
                    console.log("[TaskTimer] Original text:", lineText);
                    console.log("[TaskTimer] Updated text:", updatedText);
                    try {
                        // Replace the entire line with updated status and block reference
                        view.dispatch({
                            changes: {
                                from: line.from,
                                to: line.to,
                                insert: updatedText
                            },
                            annotations: taskStatusChangeAnnotation.of("taskTimer")
                        });
                        // Update our local reference
                        this.existingBlockId = blockId;
                        taskId = `${this.filePath}#^${blockId}`;
                        // Start the timer after inserting block ID
                        console.log(`[TaskTimer] Starting timer for newly created task: ${taskId}`);
                        this.timerManager.startTimer(this.filePath, blockId);
                        this.startRealtimeUpdates();
                        this.updateTimerState();
                        // Decorations will refresh automatically after text change
                    }
                    catch (err) {
                        console.error("[TaskTimer] Error dispatching change:", err);
                        return;
                    }
                }
                else {
                    console.error("[TaskTimer] No EditorView available");
                    // Fallback: try to get editor from editorInfoField
                    const editorInfo = this.state.field(editorInfoField);
                    console.log("[TaskTimer] Trying editorInfo:", editorInfo);
                    if (editorInfo === null || editorInfo === void 0 ? void 0 : editorInfo.editor) {
                        const line = this.state.doc.lineAt(this.lineFrom);
                        const lineText = line.text;
                        // Also update task status to in-progress
                        const inProgressMarkers = (((_f = (_e = (_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings) === null || _e === void 0 ? void 0 : _e.taskStatuses) === null || _f === void 0 ? void 0 : _f.inProgress) || ">|/").split('|');
                        const inProgressMarker = inProgressMarkers[0] || '/';
                        const updatedText = lineText
                            .replace(/\[([^\]]+)\]/, `[${inProgressMarker}]`)
                            .trimEnd() + ` ^${blockId}`;
                        try {
                            editorInfo.editor.replaceRange(updatedText, { line: line.number - 1, ch: 0 }, { line: line.number - 1, ch: lineText.length });
                            this.existingBlockId = blockId;
                            taskId = `${this.filePath}#^${blockId}`;
                            // Start timer for the fallback path as well
                            console.log(`[TaskTimer] Starting timer for newly created task (fallback): ${taskId}`);
                            this.timerManager.startTimer(this.filePath, blockId);
                            this.startRealtimeUpdates();
                            this.updateTimerState();
                            this.refreshUI();
                        }
                        catch (err) {
                            console.error("[TaskTimer] Fallback also failed:", err);
                            return;
                        }
                    }
                    return;
                }
            }
            // If we already have a task ID, just update the status if needed
            if (taskId && this.existingBlockId) {
                // Check current task status
                const line = this.state.doc.lineAt(this.lineFrom);
                const currentStatus = this.getTaskStatus(line.text);
                // Keep status update for start timer - it makes sense to mark as in-progress
                // This is different from pause/resume where status doesn't necessarily reflect timer state
                if (currentStatus !== 'in-progress') {
                    const inProgressMarkers = (((_j = (_h = (_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings) === null || _h === void 0 ? void 0 : _h.taskStatuses) === null || _j === void 0 ? void 0 : _j.inProgress) || ">|/").split('|');
                    const inProgressMarker = inProgressMarkers[0] || '/';
                    this.updateTaskStatus(`[${inProgressMarker}]`);
                }
                // Start or resume the timer
                console.log(`[TaskTimer] Starting/resuming timer for task: ${taskId}`);
                this.timerManager.startTimer(this.filePath, this.existingBlockId);
                this.updateTimerState();
                this.refreshUI(); // This will start real-time updates if needed
                console.log("[TaskTimer] Timer started successfully");
            }
        }
        catch (error) {
            console.error("[TaskTimer] Error starting timer:", error);
            this.updateTimerState();
        }
    }
    /**
     * Pause timer
     */
    pauseTimer() {
        try {
            // First check if the task is completed - should not pause completed tasks
            const line = this.state.doc.lineAt(this.lineFrom);
            const currentStatus = this.getTaskStatus(line.text);
            if (currentStatus === 'completed') {
                console.warn("[TaskTimer] Cannot pause a completed task");
                return;
            }
            const taskId = this.getTaskId();
            if (!taskId) {
                console.warn("[TaskTimer] Cannot pause timer - no task ID found");
                return;
            }
            console.log(`[TaskTimer] Pausing timer for task: ${taskId}`);
            this.timerManager.pauseTimer(taskId);
            // DON'T update task status - just pause the timer
            // The timer state is stored in localStorage and will persist
            // This avoids conflicts with autoDateManager and other plugins
            console.log("[TaskTimer] Timer paused without changing task status");
            // Stop updates immediately
            this.stopRealtimeUpdates();
            this.updateTimerState();
            this.refreshUI(); // Refresh UI to show paused state
            console.log("[TaskTimer] Timer paused successfully");
        }
        catch (error) {
            console.error("[TaskTimer] Error pausing timer:", error);
            this.updateTimerState();
        }
    }
    /**
     * Resume timer
     */
    resumeTimer() {
        try {
            // First check if the task is completed - should not resume completed tasks
            const line = this.state.doc.lineAt(this.lineFrom);
            const currentStatus = this.getTaskStatus(line.text);
            if (currentStatus === 'completed') {
                console.warn("[TaskTimer] Cannot resume a completed task");
                return;
            }
            const taskId = this.getTaskId();
            if (!taskId) {
                console.warn("[TaskTimer] Cannot resume timer - no task ID found");
                return;
            }
            console.log(`[TaskTimer] Resuming timer for task: ${taskId}`);
            this.timerManager.resumeTimer(taskId);
            // DON'T update task status - just resume the timer
            // The user can manually change status if needed
            console.log("[TaskTimer] Timer resumed without changing task status");
            this.startRealtimeUpdates();
            this.updateTimerState();
            this.refreshUI(); // Refresh UI to show running state immediately
            console.log("[TaskTimer] Timer resumed successfully");
        }
        catch (error) {
            console.error("[TaskTimer] Error resuming timer:", error);
            this.stopRealtimeUpdates();
            this.updateTimerState();
        }
    }
    /**
     * Reset timer
     */
    resetTimer() {
        try {
            const taskId = this.getTaskId();
            if (!taskId) {
                console.warn("[TaskTimer] Cannot reset timer - no task ID found");
                return;
            }
            console.log(`[TaskTimer] Resetting timer for task: ${taskId}`);
            this.timerManager.resetTimer(taskId);
            // DON'T update task status - just reset the timer
            // Let user manually manage task status
            console.log("[TaskTimer] Timer reset without changing task status");
            this.stopRealtimeUpdates();
            this.updateTimerState();
            this.refreshUI(); // Refresh UI to show reset state
            console.log("[TaskTimer] Timer reset successfully");
        }
        catch (error) {
            console.error("[TaskTimer] Error resetting timer:", error);
            this.updateTimerState();
        }
    }
    /**
     * Complete timer and update task
     */
    completeTimer() {
        var _a, _b, _c;
        try {
            // First check if the task is already completed
            const line = this.state.doc.lineAt(this.lineFrom);
            const currentStatus = this.getTaskStatus(line.text);
            if (currentStatus === 'completed') {
                console.warn("[TaskTimer] Task is already completed");
                return;
            }
            const taskId = this.getTaskId();
            if (!taskId) {
                console.warn("[TaskTimer] Cannot complete timer - no task ID found");
                return;
            }
            console.log(`[TaskTimer] Completing timer for task: ${taskId}`);
            // Get the timer state before completing
            const timerState = this.timerManager.getTimerState(taskId);
            if (!timerState) {
                console.warn("[TaskTimer] No timer state found for task:", taskId);
                return;
            }
            // Complete the timer and get the formatted duration
            const formattedDuration = this.timerManager.completeTimer(taskId);
            // Get EditorView to modify document
            const view = this.getEditorView();
            if (view) {
                const line = this.state.doc.lineAt(this.lineFrom);
                const lineText = line.text;
                // Create the updated text using configured completed marker
                const completedMarkers = (((_c = (_b = (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.taskStatuses) === null || _c === void 0 ? void 0 : _c.completed) || "x|X").split('|');
                const completedMarker = completedMarkers[0] || 'x';
                // First update the task status
                let updatedText = lineText.replace(/\[([^\]]+)\]/, `[${completedMarker}]`);
                // Check for block reference ID at the end
                const blockRefMatch = updatedText.match(/\s*\^[\w-]+\s*$/);
                if (blockRefMatch) {
                    // Insert duration before the block reference ID
                    const insertPosition = updatedText.length - blockRefMatch[0].length;
                    updatedText = updatedText.slice(0, insertPosition) + ` (${formattedDuration})` + updatedText.slice(insertPosition);
                }
                else {
                    // No block reference, add duration at the end
                    updatedText = updatedText.replace(/\s*$/, ` (${formattedDuration})`);
                }
                console.log("[TaskTimer] Completing task - original:", lineText);
                console.log("[TaskTimer] Completing task - updated:", updatedText);
                try {
                    // Use dispatch to replace the entire line
                    view.dispatch({
                        changes: {
                            from: line.from,
                            to: line.to,
                            insert: updatedText
                        }
                    });
                }
                catch (err) {
                    console.error("[TaskTimer] Error updating task:", err);
                    // Try fallback
                    const editorInfo = this.state.field(editorInfoField);
                    if (editorInfo === null || editorInfo === void 0 ? void 0 : editorInfo.editor) {
                        editorInfo.editor.replaceRange(updatedText, { line: line.number - 1, ch: 0 }, { line: line.number - 1, ch: lineText.length });
                    }
                }
            }
            else {
                console.error("[TaskTimer] No view available to complete task");
                return;
            }
            this.stopRealtimeUpdates();
            this.updateTimerState();
            console.log(`[TaskTimer] Timer completed successfully: ${formattedDuration}`);
        }
        catch (error) {
            console.error("[TaskTimer] Error completing timer:", error);
            this.updateTimerState();
        }
    }
    /**
     * Load timer state from localStorage
     */
    loadTimerState() {
        if (!this.existingBlockId)
            return;
        // Use TaskTimerManager to get the timer state
        const taskId = this.getTaskId();
        if (taskId) {
            this.timerState = this.timerManager.getTimerState(taskId);
            if (this.timerState) {
                console.log("[TaskTimer] Loaded timer state for", this.filePath, this.existingBlockId, ":", this.timerState);
                // If timer is running, start real-time updates immediately
                if (this.timerState.status === 'running') {
                    this.startRealtimeUpdates();
                }
            }
        }
    }
    /**
     * Update timer state from localStorage
     */
    updateTimerState() {
        const taskId = this.getTaskId();
        if (taskId) {
            this.timerState = this.timerManager.getTimerState(taskId);
        }
    }
    /**
     * Get task ID for this widget
     */
    getTaskId() {
        if (this.existingBlockId) {
            // Use the same format as TaskTimerManager.getStorageKey
            return `taskTimer_${this.filePath}#${this.existingBlockId}`;
        }
        return null;
    }
    /**
     * Start real-time updates for running timer
     */
    startRealtimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.updateInterval = window.setInterval(() => {
            this.createContent(); // Update the entire content
        }, 1000); // Update every second
    }
    /**
     * Stop real-time updates
     */
    stopRealtimeUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    /**
     * Refresh the entire UI (used when state changes significantly)
     */
    refreshUI() {
        if (!this.dom)
            return;
        // Reload timer state if we have a block ID
        if (this.existingBlockId) {
            this.loadTimerState();
        }
        else {
            this.updateTimerState();
        }
        this.createContent();
    }
    destroy() {
        this.stopRealtimeUpdates();
        if (this.dom) {
            this.dom.remove();
            this.dom = null;
        }
    }
}
/**
 * StateField for managing task timer decorations
 * This handles block-level decorations properly in CodeMirror
 */
const taskTimerStateField = StateField.define({
    create(state) {
        return createTaskTimerDecorations(state);
    },
    update(decorations, transaction) {
        // Check if this is an undo/redo operation
        const isUndoRedo = transaction.isUserEvent("undo") || transaction.isUserEvent("redo");
        // Recreate decorations on doc changes, state effects, or undo/redo
        if (transaction.docChanged || transaction.effects.length > 0 || isUndoRedo) {
            // Monitor all task status changes, not just undo/redo
            if (transaction.docChanged) {
                handleTaskStatusChange(transaction);
            }
            return createTaskTimerDecorations(transaction.state);
        }
        return decorations;
    },
    provide: (field) => EditorView.decorations.from(field)
});
/**
 * Create task timer decorations for the current state
 */
function createTaskTimerDecorations(state) {
    var _a, _b, _c, _d, _e;
    // Get configuration from facet
    const timerConfig = state.facet(taskTimerConfigFacet);
    console.log("[TaskTimer] Creating decorations, timerConfig:", timerConfig);
    if (!((_a = timerConfig === null || timerConfig === void 0 ? void 0 : timerConfig.settings) === null || _a === void 0 ? void 0 : _a.enabled)) {
        console.log("[TaskTimer] Timer not enabled or no config");
        return Decoration.none;
    }
    // Get editor info to access app and file information
    const editorInfo = state.field(editorInfoField);
    if (!(editorInfo === null || editorInfo === void 0 ? void 0 : editorInfo.app)) {
        console.log("[TaskTimer] No editor info or app");
        return Decoration.none;
    }
    const file = editorInfo.app.workspace.getActiveFile();
    if (!file) {
        console.log("[TaskTimer] No active file");
        return Decoration.none;
    }
    console.log("[TaskTimer] Processing file:", file.path);
    const metadataDetector = new TaskTimerMetadataDetector(timerConfig.settings, timerConfig.metadataCache);
    if (!metadataDetector.isTaskTimerEnabled(file)) {
        console.log("[TaskTimer] Timer not enabled for file:", file.path);
        return Decoration.none;
    }
    console.log("[TaskTimer] Timer enabled for file, processing...");
    const timerManager = new TaskTimerManager(timerConfig.settings);
    const decorations = [];
    const doc = state.doc;
    console.log("[TaskTimer] Document has", doc.lines, "lines");
    // First pass: find the minimum indentation level among all tasks
    let minIndentLevel = Infinity;
    for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        // Check if this line contains a task
        if (isTaskLine(lineText)) {
            const currentIndent = ((_b = lineText.match(/^(\s*)/)) === null || _b === void 0 ? void 0 : _b[1].length) || 0;
            if (currentIndent < minIndentLevel) {
                minIndentLevel = currentIndent;
            }
        }
    }
    console.log("[TaskTimer] Minimum indent level found:", minIndentLevel);
    // Process all lines in the document
    for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const lineText = line.text;
        // Check if this line contains a task
        if (isTaskLine(lineText)) {
            console.log("[TaskTimer] Found task line:", lineText.trim());
            // Check if this is a first-level task
            const currentIndent = ((_c = lineText.match(/^(\s*)/)) === null || _c === void 0 ? void 0 : _c[1].length) || 0;
            const isFirstLevel = currentIndent === minIndentLevel;
            if (isFirstLevel) {
                // Check task status - only skip completed tasks without existing timers
                const taskStatusMatch = lineText.match(/^\s*[-*+]\s+\[([^\]]+)\]/);
                if (taskStatusMatch) {
                    const statusChar = taskStatusMatch[1];
                    const taskStatuses = ((_e = (_d = timerConfig === null || timerConfig === void 0 ? void 0 : timerConfig.plugin) === null || _d === void 0 ? void 0 : _d.settings) === null || _e === void 0 ? void 0 : _e.taskStatuses) || {
                        completed: "x|X",
                        abandoned: "-"
                    };
                    // Skip completed tasks only
                    const completedMarkers = taskStatuses.completed.split('|');
                    if (completedMarkers.includes(statusChar)) {
                        console.log("[TaskTimer] Skipping completed task at line", i);
                        continue;
                    }
                    // For abandoned tasks, check if they have an existing block ID with timer data
                    const abandonedMarkers = taskStatuses.abandoned.split('|');
                    if (abandonedMarkers.includes(statusChar)) {
                        const blockId = extractBlockRef(lineText);
                        if (!blockId) {
                            console.log("[TaskTimer] Skipping abandoned task without block ID at line", i);
                            continue;
                        }
                        // If abandoned task has a block ID, let it continue to show timer
                        console.log("[TaskTimer] Abandoned task with block ID found, checking for timer state");
                    }
                }
                console.log("[TaskTimer] Found first-level task at line", i);
                // Extract existing block reference if present
                const existingBlockId = extractBlockRef(lineText);
                // Create block-level timer widget decoration
                const timerDeco = Decoration.widget({
                    widget: new TaskTimerWidget(state, timerConfig.settings, timerManager, line.from, line.to, file.path, timerConfig.plugin, existingBlockId),
                    side: -1,
                    block: true // This is now allowed in StateField
                });
                // Add decoration at the start of the line (this will appear above the task)
                decorations.push(timerDeco.range(line.from));
                console.log("[TaskTimer] Added timer decoration for first-level task at line:", i);
            }
        }
    }
    console.log("[TaskTimer] Created", decorations.length, "timer decorations");
    return Decoration.set(decorations, true);
}
/**
 * Helper functions
 */
function isTaskLine(lineText) {
    // Match any character inside square brackets
    return /^\s*[-*+]\s+\[[^\]]*\]/.test(lineText);
}
function extractBlockRef(lineText) {
    // Match block reference anywhere in the line, not just at the end
    const match = lineText.match(/\^([a-zA-Z0-9\-_]+)/);
    return match ? match[1] : undefined;
}
/**
 * Handle timer state updates when task status changes
 * This monitors all status changes and automatically manages timers accordingly
 */
function handleTaskStatusChange(transaction) {
    var _a;
    // Get configuration from transaction state
    const timerConfig = transaction.state.facet(taskTimerConfigFacet);
    if (!((_a = timerConfig === null || timerConfig === void 0 ? void 0 : timerConfig.settings) === null || _a === void 0 ? void 0 : _a.enabled) || !timerConfig.plugin) {
        return;
    }
    const editorInfo = transaction.state.field(editorInfoField);
    if (!(editorInfo === null || editorInfo === void 0 ? void 0 : editorInfo.app)) {
        return;
    }
    const file = editorInfo.app.workspace.getActiveFile();
    if (!file) {
        return;
    }
    const timerManager = new TaskTimerManager(timerConfig.settings);
    const doc = transaction.state.doc;
    // Check each changed line for task status changes
    transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        var _a, _b;
        const startLine = doc.lineAt(fromB).number;
        const endLine = doc.lineAt(toB).number;
        for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
            if (lineNum > doc.lines)
                continue;
            const line = doc.line(lineNum);
            const lineText = line.text;
            // Check if this is a task line
            if (!isTaskLine(lineText))
                continue;
            // Extract block reference
            const blockId = extractBlockRef(lineText);
            if (!blockId)
                continue;
            // Check task status
            const statusMatch = lineText.match(/^\s*[-*+]\s+\[([^\]]+)\]/);
            if (!statusMatch)
                continue;
            const statusChar = statusMatch[1];
            const taskStatuses = ((_b = (_a = timerConfig === null || timerConfig === void 0 ? void 0 : timerConfig.plugin) === null || _a === void 0 ? void 0 : _a.settings) === null || _b === void 0 ? void 0 : _b.taskStatuses) || {
                completed: "x|X",
                inProgress: ">|/",
                abandoned: "-",
                notStarted: " "
            };
            // Determine what to do based on the new status
            const inProgressMarkers = taskStatuses.inProgress.split('|');
            const abandonedMarkers = taskStatuses.abandoned.split('|');
            const completedMarkers = taskStatuses.completed.split('|');
            const notStartedMarkers = taskStatuses.notStarted.split('|');
            const taskId = `taskTimer_${file.path}#${blockId}`;
            const existingTimer = timerManager.getTimerState(taskId);
            console.log(`[TaskTimer] Status change detected: "${statusChar}" for task ${taskId}`);
            console.log(`[TaskTimer] Existing timer:`, existingTimer);
            if (inProgressMarkers.includes(statusChar)) {
                // Task is now in progress
                if (!existingTimer || existingTimer.status === 'idle') {
                    console.log("[TaskTimer] Status -> In Progress: Starting new timer");
                    timerManager.startTimer(file.path, blockId);
                }
                else if (existingTimer.status === 'paused') {
                    console.log("[TaskTimer] Status -> In Progress: Resuming paused timer");
                    timerManager.resumeTimer(taskId);
                }
                else if (existingTimer.status === 'running') {
                    console.log("[TaskTimer] Status -> In Progress: Timer already running");
                }
            }
            else if (abandonedMarkers.includes(statusChar)) {
                // Task is now abandoned - pause timer if running
                if (existingTimer && existingTimer.status === 'running') {
                    console.log("[TaskTimer] Status -> Abandoned: Pausing running timer");
                    timerManager.pauseTimer(taskId);
                }
                else if (existingTimer && existingTimer.status === 'paused') {
                    console.log("[TaskTimer] Status -> Abandoned: Timer already paused");
                }
            }
            else if (completedMarkers.includes(statusChar)) {
                // Task is completed - stop and save timer
                if (existingTimer && (existingTimer.status === 'running' || existingTimer.status === 'paused')) {
                    console.log("[TaskTimer] Status -> Completed: Stopping timer and saving time");
                    // Stop timer but preserve the elapsed time
                    timerManager.pauseTimer(taskId);
                }
            }
            else if (notStartedMarkers.includes(statusChar)) {
                // Task is reset to not started - reset timer
                if (existingTimer) {
                    console.log("[TaskTimer] Status -> Not Started: Resetting timer");
                    timerManager.resetTimer(taskId);
                }
            }
        }
    });
}
/**
 * Main task timer extension function
 * Creates a StateField-based extension for proper block decorations
 */
export function taskTimerExtension(plugin) {
    // Create configuration object
    const config = {
        settings: plugin.settings.taskTimer,
        metadataCache: plugin.app.metadataCache,
        plugin
    };
    // Return both the facet configuration and the state field
    return [
        taskTimerConfigFacet.of(config),
        taskTimerStateField
    ];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay10aW1lci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRhc2stdGltZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNOLFVBQVUsRUFFVixVQUFVLEVBQ1YsVUFBVSxHQUNWLE1BQU0sa0JBQWtCLENBQUM7QUFDMUIsT0FBTyxFQUFzQixVQUFVLEVBQWUsS0FBSyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDdkYsT0FBTyxFQUFpQixlQUFlLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRzNGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBYyxNQUFNLDBCQUEwQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pHLE9BQU8seUJBQXlCLENBQUM7QUFTakMseURBQXlEO0FBQ3pELE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBbUM7SUFDM0UsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSTtDQUN0QyxDQUFDLENBQUM7QUFFSDs7R0FFRztBQUNILE1BQU0sZUFBZ0IsU0FBUSxVQUFVO0lBTXZDLFlBQ2tCLEtBQWtCLEVBQ2xCLFFBQTJCLEVBQzNCLFlBQThCLEVBQzlCLFFBQWdCLEVBQ2hCLE1BQWMsRUFDZCxRQUFnQixFQUNoQixNQUE4QixFQUN2QyxlQUF3QjtRQUVoQyxLQUFLLEVBQUUsQ0FBQztRQVRTLFVBQUssR0FBTCxLQUFLLENBQWE7UUFDbEIsYUFBUSxHQUFSLFFBQVEsQ0FBbUI7UUFDM0IsaUJBQVksR0FBWixZQUFZLENBQWtCO1FBQzlCLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIs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LEVBQUU7b0JBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQztvQkFDbEUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztpQkFDaEM7YUFDRDtTQUNEO0lBQ0YsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBR0Q7OztHQUdHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxNQUE2QjtJQUU3Qiw4QkFBOEI7SUFDOUIsTUFBTSxNQUFNLEdBQW9CO1FBQy9CLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVM7UUFDbkMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsYUFBYTtRQUN2QyxNQUFNO0tBQ04sQ0FBQztJQUVGLDBEQUEwRDtJQUMxRCxPQUFPO1FBQ04sb0JBQW9CLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUMvQixtQkFBbUI7S0FDbkIsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdERlY29yYXRpb24sXHJcblx0RGVjb3JhdGlvblNldCxcclxuXHRFZGl0b3JWaWV3LFxyXG5cdFdpZGdldFR5cGUsXHJcbn0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgRWRpdG9yU3RhdGUsIFJhbmdlLCBTdGF0ZUZpZWxkLCBUcmFuc2FjdGlvbiwgRmFjZXQgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IHsgTWV0YWRhdGFDYWNoZSwgZWRpdG9ySW5mb0ZpZWxkLCBlZGl0b3JFZGl0b3JGaWVsZCwgTWFya2Rvd25WaWV3IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgVGFza1RpbWVyU2V0dGluZ3MgfSBmcm9tIFwiLi4vLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyBUYXNrVGltZXJNZXRhZGF0YURldGVjdG9yIH0gZnJvbSBcIkAvc2VydmljZXMvdGltZXItbWV0YWRhdGEtc2VydmljZVwiO1xyXG5pbXBvcnQgeyBUYXNrVGltZXJNYW5hZ2VyLCBUaW1lclN0YXRlIH0gZnJvbSBcIkAvbWFuYWdlcnMvdGltZXItbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBUYXNrVGltZXJGb3JtYXR0ZXIgfSBmcm9tIFwiQC9zZXJ2aWNlcy90aW1lci1mb3JtYXQtc2VydmljZVwiO1xyXG5pbXBvcnQgeyB0YXNrU3RhdHVzQ2hhbmdlQW5ub3RhdGlvbiB9IGZyb20gXCJAL2VkaXRvci1leHRlbnNpb25zL3Rhc2stb3BlcmF0aW9ucy9zdGF0dXMtc3dpdGNoZXJcIjtcclxuaW1wb3J0IFwiQC9zdHlsZXMvdGFzay10aW1lci5jc3NcIjtcclxuXHJcbi8vIEV4dGVuc2lvbiBjb25maWd1cmF0aW9uIGZvciBTdGF0ZUZpZWxkIGFjY2Vzc1xyXG5pbnRlcmZhY2UgVGFza1RpbWVyQ29uZmlnIHtcclxuXHRzZXR0aW5nczogVGFza1RpbWVyU2V0dGluZ3M7XHJcblx0bWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZTtcclxuXHRwbHVnaW4/OiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47IC8vIEFkZCBwbHVnaW4gcmVmZXJlbmNlXHJcbn1cclxuXHJcbi8vIERlZmluZSBhIEZhY2V0IHRvIHBhc3MgY29uZmlndXJhdGlvbiB0byB0aGUgU3RhdGVGaWVsZFxyXG5jb25zdCB0YXNrVGltZXJDb25maWdGYWNldCA9IEZhY2V0LmRlZmluZTxUYXNrVGltZXJDb25maWcsIFRhc2tUaW1lckNvbmZpZz4oe1xyXG5cdGNvbWJpbmU6ICh2YWx1ZXMpID0+IHZhbHVlc1swXSB8fCBudWxsXHJcbn0pO1xyXG5cclxuLyoqXHJcbiAqIFdpZGdldCBmb3IgZGlzcGxheWluZyB0YXNrIHRpbWVyIGNvbnRyb2xzIGFib3ZlIHBhcmVudCB0YXNrc1xyXG4gKi9cclxuY2xhc3MgVGFza1RpbWVyV2lkZ2V0IGV4dGVuZHMgV2lkZ2V0VHlwZSB7XHJcblx0cHJpdmF0ZSBkb206IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB1cGRhdGVJbnRlcnZhbDogbnVtYmVyIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSB0aW1lclN0YXRlOiBUaW1lclN0YXRlIHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBjdXJyZW50VGFza1N0YXR1czogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cHJpdmF0ZSByZWFkb25seSBzdGF0ZTogRWRpdG9yU3RhdGUsXHJcblx0XHRwcml2YXRlIHJlYWRvbmx5IHNldHRpbmdzOiBUYXNrVGltZXJTZXR0aW5ncyxcclxuXHRcdHByaXZhdGUgcmVhZG9ubHkgdGltZXJNYW5hZ2VyOiBUYXNrVGltZXJNYW5hZ2VyLFxyXG5cdFx0cHJpdmF0ZSByZWFkb25seSBsaW5lRnJvbTogbnVtYmVyLFxyXG5cdFx0cHJpdmF0ZSByZWFkb25seSBsaW5lVG86IG51bWJlcixcclxuXHRcdHByaXZhdGUgcmVhZG9ubHkgZmlsZVBhdGg6IHN0cmluZyxcclxuXHRcdHByaXZhdGUgcmVhZG9ubHkgcGx1Z2luPzogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0cHJpdmF0ZSBleGlzdGluZ0Jsb2NrSWQ/OiBzdHJpbmdcclxuXHQpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYmxvY2sgSUQsIHRyeSB0byBsb2FkIGV4aXN0aW5nIHRpbWVyIHN0YXRlXHJcblx0XHRpZiAodGhpcy5leGlzdGluZ0Jsb2NrSWQpIHtcclxuXHRcdFx0dGhpcy5sb2FkVGltZXJTdGF0ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0ZXEob3RoZXI6IFRhc2tUaW1lcldpZGdldCkge1xyXG5cdFx0Ly8gR2V0IGN1cnJlbnQgdGFzayBzdGF0dXMgZnJvbSB0aGUgbGluZVxyXG5cdFx0Y29uc3QgbGluZSA9IHRoaXMuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmxpbmVGcm9tKTtcclxuXHRcdGNvbnN0IGN1cnJlbnRTdGF0dXMgPSB0aGlzLmdldFRhc2tTdGF0dXMobGluZS50ZXh0KTtcclxuXHJcblx0XHQvLyBGb3JjZSB3aWRnZXQgcmVjcmVhdGlvbiBpZiB0YXNrIHN0YXR1cyBoYXMgY2hhbmdlZFxyXG5cdFx0aWYgKHRoaXMuY3VycmVudFRhc2tTdGF0dXMgJiYgdGhpcy5jdXJyZW50VGFza1N0YXR1cyAhPT0gY3VycmVudFN0YXR1cykge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRhc2sgc3RhdHVzIGNoYW5nZWQgZnJvbVwiLCB0aGlzLmN1cnJlbnRUYXNrU3RhdHVzLCBcInRvXCIsIGN1cnJlbnRTdGF0dXMpO1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRm9yY2Ugd2lkZ2V0IHJlY3JlYXRpb24gaWYgdGFzayBiZWNvbWVzIGNvbXBsZXRlZFxyXG5cdFx0aWYgKGN1cnJlbnRTdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gVGFzayBpcyBjb21wbGV0ZWQsIGZvcmNpbmcgd2lkZ2V0IHJlbW92YWxcIik7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gKFxyXG5cdFx0XHR0aGlzLmxpbmVGcm9tID09PSBvdGhlci5saW5lRnJvbSAmJlxyXG5cdFx0XHR0aGlzLmxpbmVUbyA9PT0gb3RoZXIubGluZVRvICYmXHJcblx0XHRcdHRoaXMuZmlsZVBhdGggPT09IG90aGVyLmZpbGVQYXRoICYmXHJcblx0XHRcdHRoaXMuZXhpc3RpbmdCbG9ja0lkID09PSBvdGhlci5leGlzdGluZ0Jsb2NrSWRcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHR0b0RPTSgpOiBIVE1MRWxlbWVudCB7XHJcblx0XHRpZiAodGhpcy5kb20pIHtcclxuXHRcdFx0dGhpcy5yZWZyZXNoVUkoKTtcclxuXHRcdFx0cmV0dXJuIHRoaXMuZG9tO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENyZWF0ZSBhIHNpbXBsZSB0ZXh0LWJhc2VkIHdpZGdldFxyXG5cdFx0dGhpcy5kb20gPSBjcmVhdGVEaXYoe2NsczogJ3Rhc2stdGltZXItd2lkZ2V0J30pO1xyXG5cclxuXHRcdC8vIEdldCBhbmQgc3RvcmUgY3VycmVudCB0YXNrIHN0YXR1c1xyXG5cdFx0Y29uc3QgbGluZSA9IHRoaXMuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmxpbmVGcm9tKTtcclxuXHRcdHRoaXMuY3VycmVudFRhc2tTdGF0dXMgPSB0aGlzLmdldFRhc2tTdGF0dXMobGluZS50ZXh0KTtcclxuXHJcblx0XHQvLyBBZGQgZGVidWcgaW5mb1xyXG5cdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBDcmVhdGluZyB3aWRnZXQgZm9yIGxpbmVcIiwgdGhpcy5saW5lRnJvbSwgXCJzdGF0dXM6XCIsIHRoaXMuY3VycmVudFRhc2tTdGF0dXMsIFwiYmxvY2tJZDpcIiwgdGhpcy5leGlzdGluZ0Jsb2NrSWQpO1xyXG5cclxuXHRcdC8vIExvYWQgdGltZXIgc3RhdGUgaWYgd2UgaGF2ZSBhIGJsb2NrIElEXHJcblx0XHRpZiAodGhpcy5leGlzdGluZ0Jsb2NrSWQpIHtcclxuXHRcdFx0dGhpcy5sb2FkVGltZXJTdGF0ZSgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy51cGRhdGVUaW1lclN0YXRlKCk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5jcmVhdGVDb250ZW50KCk7XHJcblx0XHRyZXR1cm4gdGhpcy5kb207XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBHZXQgdGFzayBzdGF0dXMgZnJvbSBsaW5lIHRleHRcclxuXHQgKi9cclxuXHRwcml2YXRlIGdldFRhc2tTdGF0dXMobGluZVRleHQ6IHN0cmluZyk6ICdwZW5kaW5nJyB8ICdpbi1wcm9ncmVzcycgfCAnY29tcGxldGVkJyB8ICdjYW5jZWxsZWQnIHtcclxuXHRcdC8vIEV4dHJhY3QgdGhlIHRhc2sgbWFya2VyXHJcblx0XHRjb25zdCBtYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKC9cXFsoW15cXF1dKylcXF0vKTtcclxuXHRcdGlmICghbWF0Y2gpIHJldHVybiAncGVuZGluZyc7XHJcblxyXG5cdFx0Y29uc3QgbWFya2VyID0gbWF0Y2hbMV07XHJcblx0XHRjb25zdCBzdGF0dXNlcyA9IHRoaXMucGx1Z2luPy5zZXR0aW5ncz8udGFza1N0YXR1c2VzIHx8IHtcclxuXHRcdFx0Y29tcGxldGVkOiBcInh8WFwiLFxyXG5cdFx0XHRpblByb2dyZXNzOiBcIj58L1wiLFxyXG5cdFx0XHRhYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0XHRwbGFubmVkOiBcIj9cIixcclxuXHRcdFx0bm90U3RhcnRlZDogXCIgXCJcclxuXHRcdH07XHJcblxyXG5cdFx0Ly8gQ2hlY2sgYWdhaW5zdCBjb25maWd1cmVkIG1hcmtlcnNcclxuXHRcdGlmIChzdGF0dXNlcy5jb21wbGV0ZWQuc3BsaXQoJ3wnKS5pbmNsdWRlcyhtYXJrZXIpKSB7XHJcblx0XHRcdHJldHVybiAnY29tcGxldGVkJztcclxuXHRcdH0gZWxzZSBpZiAoc3RhdHVzZXMuaW5Qcm9ncmVzcy5zcGxpdCgnfCcpLmluY2x1ZGVzKG1hcmtlcikpIHtcclxuXHRcdFx0cmV0dXJuICdpbi1wcm9ncmVzcyc7XHJcblx0XHR9IGVsc2UgaWYgKHN0YXR1c2VzLmFiYW5kb25lZC5zcGxpdCgnfCcpLmluY2x1ZGVzKG1hcmtlcikpIHtcclxuXHRcdFx0cmV0dXJuICdjYW5jZWxsZWQnO1xyXG5cdFx0fSBlbHNlIGlmIChzdGF0dXNlcy5ub3RTdGFydGVkLnNwbGl0KCd8JykuaW5jbHVkZXMobWFya2VyKSB8fCBtYXJrZXIgPT09ICcgJykge1xyXG5cdFx0XHRyZXR1cm4gJ3BlbmRpbmcnO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gRGVmYXVsdCB0byBwZW5kaW5nIGZvciB1bmtub3duIG1hcmtlcnNcclxuXHRcdFx0cmV0dXJuICdwZW5kaW5nJztcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIENyZWF0ZSBjb250ZW50IGJhc2VkIG9uIHRpbWVyIHN0YXRlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBjcmVhdGVDb250ZW50KCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLmRvbSkgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuZG9tLmVtcHR5KCk7XHJcblxyXG5cdFx0Ly8gQWx3YXlzIGdldCBmcmVzaCB0YXNrIHN0YXR1cyBmcm9tIGN1cnJlbnQgZG9jdW1lbnRcclxuXHRcdGNvbnN0IGxpbmUgPSB0aGlzLnN0YXRlLmRvYy5saW5lQXQodGhpcy5saW5lRnJvbSk7XHJcblx0XHRjb25zdCB0YXNrU3RhdHVzID0gdGhpcy5nZXRUYXNrU3RhdHVzKGxpbmUudGV4dCk7XHJcblx0XHR0aGlzLmN1cnJlbnRUYXNrU3RhdHVzID0gdGFza1N0YXR1czsgLy8gVXBkYXRlIHN0b3JlZCBzdGF0dXNcclxuXHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gY3JlYXRlQ29udGVudCAtIGN1cnJlbnQgdGFzayBzdGF0dXM6XCIsIHRhc2tTdGF0dXMpO1xyXG5cclxuXHRcdC8vIERvbid0IHNob3cgdGltZXIgZm9yIGNvbXBsZXRlZCB0YXNrc1xyXG5cdFx0aWYgKHRhc2tTdGF0dXMgPT09ICdjb21wbGV0ZWQnKSB7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBJZiB3ZSBoYXZlIGEgYmxvY2sgSUQgYW5kIGEgdGltZXIgc3RhdGUsIHNob3cgdGhlIHRpbWVyIHJlZ2FyZGxlc3Mgb2YgdGFzayBtYXJrZXJcclxuXHRcdGlmICh0aGlzLmV4aXN0aW5nQmxvY2tJZCAmJiB0aGlzLnRpbWVyU3RhdGUgJiYgdGhpcy50aW1lclN0YXRlLnN0YXR1cyAhPT0gJ2lkbGUnKSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gRm91bmQgYWN0aXZlIHRpbWVyIGZvciB0YXNrIHdpdGggYmxvY2sgSURcIik7XHJcblx0XHRcdC8vIFNob3cgdGltZXIgYmFzZWQgb24gZXhpc3Rpbmcgc3RhdGVcclxuXHRcdFx0Ly8gR2V0IHRvdGFsIGR1cmF0aW9uIGZyb20gdGltZXIgbWFuYWdlclxyXG5cdFx0XHRjb25zdCB0YXNrSWQgPSB0aGlzLmdldFRhc2tJZCgpO1xyXG5cdFx0XHRjb25zdCBlbGFwc2VkTXMgPSB0YXNrSWQgPyB0aGlzLnRpbWVyTWFuYWdlci5nZXRDdXJyZW50RHVyYXRpb24odGFza0lkKSA6IDA7XHJcblxyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWRUaW1lID0gVGFza1RpbWVyRm9ybWF0dGVyLmZvcm1hdER1cmF0aW9uKGVsYXBzZWRNcywgdGhpcy5zZXR0aW5ncy50aW1lRm9ybWF0KTtcclxuXHRcdFx0Y29uc3QgdGltZVNwYW4gPSB0aGlzLmRvbS5jcmVhdGVTcGFuKCk7XHJcblxyXG5cdFx0XHQvLyBTaG93IHBhdXNlZCBzdGF0ZSBjbGVhcmx5XHJcblx0XHRcdGlmICh0aGlzLnRpbWVyU3RhdGUuc3RhdHVzID09PSAncGF1c2VkJykge1xyXG5cdFx0XHRcdHRpbWVTcGFuLnNldFRleHQoYOKPuCAke2Zvcm1hdHRlZFRpbWV9IChQYXVzZWQpIGApO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRpbWVTcGFuLnNldFRleHQoYOKPsSAke2Zvcm1hdHRlZFRpbWV9IGApO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBBZGQgYWN0aW9uIGxpbmtzIGJhc2VkIG9uIHRpbWVyIHN0YXRlXHJcblx0XHRcdGlmICh0aGlzLnRpbWVyU3RhdGUuc3RhdHVzID09PSAncnVubmluZycpIHtcclxuXHRcdFx0XHR0aGlzLmFkZEFjdGlvbkxpbmsoJ1BhdXNlJywgKCkgPT4gdGhpcy5wYXVzZVRpbWVyKCkpO1xyXG5cdFx0XHRcdHRoaXMuZG9tLmFwcGVuZFRleHQoJyB8ICcpO1xyXG5cdFx0XHRcdHRoaXMuYWRkQWN0aW9uTGluaygnQ29tcGxldGUnLCAoKSA9PiB0aGlzLmNvbXBsZXRlVGltZXIoKSk7XHJcblx0XHRcdFx0Ly8gU3RhcnQgcmVhbC10aW1lIHVwZGF0ZXNcclxuXHRcdFx0XHR0aGlzLnN0YXJ0UmVhbHRpbWVVcGRhdGVzKCk7XHJcblx0XHRcdH0gZWxzZSBpZiAodGhpcy50aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHR0aGlzLmFkZEFjdGlvbkxpbmsoJ1Jlc3VtZScsICgpID0+IHRoaXMucmVzdW1lVGltZXIoKSk7XHJcblx0XHRcdFx0dGhpcy5kb20uYXBwZW5kVGV4dCgnIHwgJyk7XHJcblx0XHRcdFx0dGhpcy5hZGRBY3Rpb25MaW5rKCdDb21wbGV0ZScsICgpID0+IHRoaXMuY29tcGxldGVUaW1lcigpKTtcclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLmRvbS5hcHBlbmRUZXh0KCcgfCAnKTtcclxuXHRcdFx0dGhpcy5hZGRBY3Rpb25MaW5rKCdSZXNldCcsICgpID0+IHRoaXMucmVzZXRUaW1lcigpKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZvciBpbi1wcm9ncmVzcyB0YXNrcyB3aXRoIGV4aXN0aW5nIGJsb2NrIElEc1xyXG5cdFx0aWYgKHRhc2tTdGF0dXMgPT09ICdpbi1wcm9ncmVzcycgJiYgdGhpcy5leGlzdGluZ0Jsb2NrSWQpIHtcclxuXHRcdFx0Ly8gSWYgdGhlcmUncyBhbiBleGlzdGluZyB0aW1lciBzdGF0ZSwgdXNlIGl0XHJcblx0XHRcdGlmICh0aGlzLnRpbWVyU3RhdGUgJiYgdGhpcy50aW1lclN0YXRlLnN0YXR1cyAhPT0gJ2lkbGUnKSB7XHJcblx0XHRcdFx0Ly8gU2hvdyBleGlzdGluZyB0aW1lciBzdGF0ZVxyXG5cdFx0XHRcdC8vIEdldCB0b3RhbCBkdXJhdGlvbiBmcm9tIHRpbWVyIG1hbmFnZXJcclxuXHRcdFx0XHRjb25zdCB0YXNrSWQgPSB0aGlzLmdldFRhc2tJZCgpO1xyXG5cdFx0XHRcdGNvbnN0IGVsYXBzZWRNcyA9IHRhc2tJZCA/IHRoaXMudGltZXJNYW5hZ2VyLmdldEN1cnJlbnREdXJhdGlvbih0YXNrSWQpIDogMDtcclxuXHJcblx0XHRcdFx0Y29uc3QgZm9ybWF0dGVkVGltZSA9IFRhc2tUaW1lckZvcm1hdHRlci5mb3JtYXREdXJhdGlvbihlbGFwc2VkTXMsIHRoaXMuc2V0dGluZ3MudGltZUZvcm1hdCk7XHJcblx0XHRcdFx0Y29uc3QgdGltZVNwYW4gPSB0aGlzLmRvbS5jcmVhdGVTcGFuKCk7XHJcblxyXG5cdFx0XHRcdC8vIFNob3cgcGF1c2VkIHN0YXRlIGNsZWFybHlcclxuXHRcdFx0XHRpZiAodGhpcy50aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHRcdHRpbWVTcGFuLnNldFRleHQoYOKPuCAke2Zvcm1hdHRlZFRpbWV9IChQYXVzZWQpIGApO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHR0aW1lU3Bhbi5zZXRUZXh0KGDij7EgJHtmb3JtYXR0ZWRUaW1lfSBgKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIEFkZCBhY3Rpb24gbGlua3MgYmFzZWQgb24gdGltZXIgc3RhdGVcclxuXHRcdFx0XHRpZiAodGhpcy50aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3J1bm5pbmcnKSB7XHJcblx0XHRcdFx0XHR0aGlzLmFkZEFjdGlvbkxpbmsoJ1BhdXNlJywgKCkgPT4gdGhpcy5wYXVzZVRpbWVyKCkpO1xyXG5cdFx0XHRcdFx0dGhpcy5kb20uYXBwZW5kVGV4dCgnIHwgJyk7XHJcblx0XHRcdFx0XHR0aGlzLmFkZEFjdGlvbkxpbmsoJ0NvbXBsZXRlJywgKCkgPT4gdGhpcy5jb21wbGV0ZVRpbWVyKCkpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAodGhpcy50aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHRcdHRoaXMuYWRkQWN0aW9uTGluaygnUmVzdW1lJywgKCkgPT4gdGhpcy5yZXN1bWVUaW1lcigpKTtcclxuXHRcdFx0XHRcdHRoaXMuZG9tLmFwcGVuZFRleHQoJyB8ICcpO1xyXG5cdFx0XHRcdFx0dGhpcy5hZGRBY3Rpb25MaW5rKCdDb21wbGV0ZScsICgpID0+IHRoaXMuY29tcGxldGVUaW1lcigpKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0dGhpcy5kb20uYXBwZW5kVGV4dCgnIHwgJyk7XHJcblx0XHRcdFx0dGhpcy5hZGRBY3Rpb25MaW5rKCdSZXNldCcsICgpID0+IHRoaXMucmVzZXRUaW1lcigpKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHQvLyBUYXNrIGlzIGluLXByb2dyZXNzIHdpdGggYmxvY2sgSUQgYnV0IG5vIHRpbWVyIHN0YXRlIC0gYXV0by1zdGFydCB0aW1lclxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gSW4tcHJvZ3Jlc3MgdGFzayB3aXRoIGJsb2NrIElEIGJ1dCBubyB0aW1lciBzdGF0ZSwgYXV0by1zdGFydGluZ1wiKTtcclxuXHRcdFx0XHR0aGlzLnN0YXJ0VGltZXIoKTtcclxuXHRcdFx0XHQvLyBUaW1lciB3aWxsIGJlIHNob3duIGFmdGVyIHN0YXRlIHVwZGF0ZVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cdFx0fSBlbHNlIGlmICghdGhpcy50aW1lclN0YXRlIHx8IHRoaXMudGltZXJTdGF0ZS5zdGF0dXMgPT09ICdpZGxlJykge1xyXG5cdFx0XHQvLyBDcmVhdGUgdGV4dC1zdHlsZSBzdGFydCBidXR0b25cclxuXHRcdFx0Y29uc3Qgc3RhcnRTcGFuID0gdGhpcy5kb20uY3JlYXRlU3Bhbih7Y2xzOiAndGFzay10aW1lci1zdGFydCd9KTtcclxuXHRcdFx0c3RhcnRTcGFuLnNldFRleHQoJ1N0YXJ0IFRhc2snKTtcclxuXHRcdFx0c3RhcnRTcGFuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XHJcblx0XHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFN0YXJ0IGJ1dHRvbiBjbGlja2VkXCIpO1xyXG5cdFx0XHRcdHRoaXMuc3RhcnRUaW1lcigpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFNob3cgZWxhcHNlZCB0aW1lXHJcblx0XHRcdC8vIEdldCB0b3RhbCBkdXJhdGlvbiBmcm9tIHRpbWVyIG1hbmFnZXJcclxuXHRcdFx0Y29uc3QgdGFza0lkID0gdGhpcy5nZXRUYXNrSWQoKTtcclxuXHRcdFx0Y29uc3QgZWxhcHNlZE1zID0gdGFza0lkID8gdGhpcy50aW1lck1hbmFnZXIuZ2V0Q3VycmVudER1cmF0aW9uKHRhc2tJZCkgOiAwO1xyXG5cclxuXHRcdFx0Y29uc3QgZm9ybWF0dGVkVGltZSA9IFRhc2tUaW1lckZvcm1hdHRlci5mb3JtYXREdXJhdGlvbihlbGFwc2VkTXMsIHRoaXMuc2V0dGluZ3MudGltZUZvcm1hdCk7XHJcblx0XHRcdGNvbnN0IHRpbWVTcGFuID0gdGhpcy5kb20uY3JlYXRlU3BhbigpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdyBwYXVzZWQgc3RhdGUgY2xlYXJseVxyXG5cdFx0XHRpZiAodGhpcy50aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHR0aW1lU3Bhbi5zZXRUZXh0KGDij7ggJHtmb3JtYXR0ZWRUaW1lfSAoUGF1c2VkKSBgKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHR0aW1lU3Bhbi5zZXRUZXh0KGDij7EgJHtmb3JtYXR0ZWRUaW1lfSBgKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIGFjdGlvbiBsaW5rc1xyXG5cdFx0XHRpZiAodGhpcy50aW1lclN0YXRlLnN0YXR1cyA9PT0gJ3J1bm5pbmcnKSB7XHJcblx0XHRcdFx0dGhpcy5hZGRBY3Rpb25MaW5rKCdQYXVzZScsICgpID0+IHRoaXMucGF1c2VUaW1lcigpKTtcclxuXHRcdFx0XHR0aGlzLmRvbS5hcHBlbmRUZXh0KCcgfCAnKTtcclxuXHRcdFx0XHR0aGlzLmFkZEFjdGlvbkxpbmsoJ0NvbXBsZXRlJywgKCkgPT4gdGhpcy5jb21wbGV0ZVRpbWVyKCkpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMudGltZXJTdGF0ZS5zdGF0dXMgPT09ICdwYXVzZWQnKSB7XHJcblx0XHRcdFx0dGhpcy5hZGRBY3Rpb25MaW5rKCdSZXN1bWUnLCAoKSA9PiB0aGlzLnJlc3VtZVRpbWVyKCkpO1xyXG5cdFx0XHRcdHRoaXMuZG9tLmFwcGVuZFRleHQoJyB8ICcpO1xyXG5cdFx0XHRcdHRoaXMuYWRkQWN0aW9uTGluaygnQ29tcGxldGUnLCAoKSA9PiB0aGlzLmNvbXBsZXRlVGltZXIoKSk7XHJcblx0XHRcdH1cclxuXHRcdFx0dGhpcy5kb20uYXBwZW5kVGV4dCgnIHwgJyk7XHJcblx0XHRcdHRoaXMuYWRkQWN0aW9uTGluaygnUmVzZXQnLCAoKSA9PiB0aGlzLnJlc2V0VGltZXIoKSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBBZGQgY2xpY2thYmxlIGFjdGlvbiBsaW5rXHJcblx0ICovXHJcblx0cHJpdmF0ZSBhZGRBY3Rpb25MaW5rKHRleHQ6IHN0cmluZywgYWN0aW9uOiAoKSA9PiB2b2lkKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuZG9tKSByZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgbGluayA9IHRoaXMuZG9tLmNyZWF0ZVNwYW4oe2NsczogJ3Rhc2stdGltZXItYWN0aW9uJ30pO1xyXG5cdFx0bGluay5zZXRUZXh0KHRleHQpO1xyXG5cdFx0bGluay5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XHJcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuXHRcdFx0YWN0aW9uKCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0aGUgQ29kZU1pcnJvciBFZGl0b3JWaWV3IGZyb20gdmFyaW91cyBzb3VyY2VzXHJcblx0ICovXHJcblx0cHJpdmF0ZSBnZXRFZGl0b3JWaWV3KCk6IEVkaXRvclZpZXcgfCBudWxsIHtcclxuXHRcdC8vIFRyeSB0byBnZXQgZnJvbSBzdGF0ZSBmaWVsZCBmaXJzdFxyXG5cdFx0Y29uc3QgdmlldyA9IHRoaXMuc3RhdGUuZmllbGQoZWRpdG9yRWRpdG9yRmllbGQsIGZhbHNlKTtcclxuXHRcdGlmICh2aWV3KSB7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gR290IEVkaXRvclZpZXcgZnJvbSBlZGl0b3JFZGl0b3JGaWVsZFwiKTtcclxuXHRcdFx0cmV0dXJuIHZpZXc7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVHJ5IGZyb20gdGhlIHBsdWdpbidzIGFwcCB3b3Jrc3BhY2VcclxuXHRcdGlmICh0aGlzLnBsdWdpbj8uYXBwKSB7XHJcblx0XHRcdGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLnBsdWdpbi5hcHAud29ya3NwYWNlLmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuXHRcdFx0aWYgKGFjdGl2ZVZpZXc/LmVkaXRvcikge1xyXG5cdFx0XHRcdGNvbnN0IGVkaXRvciA9IGFjdGl2ZVZpZXcuZWRpdG9yO1xyXG5cdFx0XHRcdC8vIEZvciBDTTYgZWRpdG9yXHJcblx0XHRcdFx0aWYgKChlZGl0b3IgYXMgYW55KS5jbSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBHb3QgRWRpdG9yVmlldyBmcm9tIGFjdGl2ZVZpZXcuZWRpdG9yLmNtXCIpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIChlZGl0b3IgYXMgYW55KS5jbTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gU29tZSB2ZXJzaW9ucyBtaWdodCBoYXZlIGl0IGFzIGNtNlxyXG5cdFx0XHRcdGlmICgoZWRpdG9yIGFzIGFueSkuY202KSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIEdvdCBFZGl0b3JWaWV3IGZyb20gYWN0aXZlVmlldy5lZGl0b3IuY202XCIpO1xyXG5cdFx0XHRcdFx0cmV0dXJuIChlZGl0b3IgYXMgYW55KS5jbTY7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVHJ5IGZyb20gdGhlIGFwcCdzIGFjdGl2ZSBlZGl0b3JcclxuXHRcdGNvbnN0IGFwcCA9ICh3aW5kb3cgYXMgYW55KS5hcHA7XHJcblx0XHRjb25zdCBhY3RpdmVMZWFmID0gYXBwPy53b3Jrc3BhY2U/LmFjdGl2ZUxlYWY7XHJcblxyXG5cdFx0aWYgKGFjdGl2ZUxlYWY/LnZpZXc/LmVkaXRvcikge1xyXG5cdFx0XHRjb25zdCBlZGl0b3IgPSBhY3RpdmVMZWFmLnZpZXcuZWRpdG9yO1xyXG5cdFx0XHQvLyBDaGVjayBmb3IgQ29kZU1pcnJvciA2XHJcblx0XHRcdGlmIChlZGl0b3IuY20pIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIEdvdCBFZGl0b3JWaWV3IGZyb20gZWRpdG9yLmNtXCIpO1xyXG5cdFx0XHRcdHJldHVybiBlZGl0b3IuY207XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGVkaXRvci5jbTYpIHtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIEdvdCBFZGl0b3JWaWV3IGZyb20gZWRpdG9yLmNtNlwiKTtcclxuXHRcdFx0XHRyZXR1cm4gZWRpdG9yLmNtNjtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFRyeSB0byBmaW5kIHRoZSB2aWV3IHRocm91Z2ggdGhlIHdpZGdldCdzIERPTSBlbGVtZW50XHJcblx0XHRpZiAodGhpcy5kb20gJiYgdGhpcy5kb20ucGFyZW50RWxlbWVudCkge1xyXG5cdFx0XHRjb25zdCBjbUNvbnRlbnQgPSB0aGlzLmRvbS5jbG9zZXN0KCcuY20tY29udGVudCcpO1xyXG5cdFx0XHRpZiAoY21Db250ZW50KSB7XHJcblx0XHRcdFx0Y29uc3QgY21FZGl0b3IgPSBjbUNvbnRlbnQuY2xvc2VzdCgnLmNtLWVkaXRvcicpO1xyXG5cdFx0XHRcdGlmIChjbUVkaXRvciAmJiAoY21FZGl0b3IgYXMgYW55KS5jbVZpZXcpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gR290IEVkaXRvclZpZXcgZnJvbSBET00gZWxlbWVudFwiKTtcclxuXHRcdFx0XHRcdHJldHVybiAoY21FZGl0b3IgYXMgYW55KS5jbVZpZXcudmlldztcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zb2xlLmVycm9yKFwiW1Rhc2tUaW1lcl0gQ291bGQgbm90IGZpbmQgRWRpdG9yVmlldyB0aHJvdWdoIGFueSBtZXRob2RcIik7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0YXNrIHN0YXR1cyBtYXJrZXIgaW4gdGhlIGRvY3VtZW50XHJcblx0ICovXHJcblx0cHJpdmF0ZSB1cGRhdGVUYXNrU3RhdHVzKG5ld1N0YXR1czogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRjb25zdCBsaW5lID0gdGhpcy5zdGF0ZS5kb2MubGluZUF0KHRoaXMubGluZUZyb20pO1xyXG5cdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsaW5lIGNvbnRhaW5zIGEgdGFza1xyXG5cdFx0Y29uc3QgdGFza1JlZ2V4ID0gL15bXFxzfFxcdF0qKFstKitdfFxcZCtcXC4pXFxzK1xcW1teXV0qXFxdLztcclxuXHRcdGNvbnN0IG1hdGNoID0gbGluZVRleHQubWF0Y2godGFza1JlZ2V4KTtcclxuXHJcblx0XHRpZiAoIW1hdGNoKSB7XHJcblx0XHRcdC8vIE5vdCBhIHRhc2sgbGluZVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVwbGFjZSB0YXNrIHN0YXR1cyBtYXJrZXIgLSBtYXRjaCBhbnkgY2hhcmFjdGVyKHMpIGluc2lkZSBicmFja2V0c1xyXG5cdFx0Y29uc3QgdXBkYXRlZFRleHQgPSBsaW5lVGV4dC5yZXBsYWNlKC9cXFsoW15cXF1dKilcXF0vLCBuZXdTdGF0dXMpO1xyXG5cclxuXHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyXSB1cGRhdGVUYXNrU3RhdHVzIC0gb3JpZ2luYWw6IFwiJHtsaW5lVGV4dH1cImApO1xyXG5cdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIHVwZGF0ZVRhc2tTdGF0dXMgLSBuZXdTdGF0dXM6IFwiJHtuZXdTdGF0dXN9XCJgKTtcclxuXHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyXSB1cGRhdGVUYXNrU3RhdHVzIC0gdXBkYXRlZDogXCIke3VwZGF0ZWRUZXh0fVwiYCk7XHJcblxyXG5cdFx0aWYgKHVwZGF0ZWRUZXh0ID09PSBsaW5lVGV4dCkge1xyXG5cdFx0XHQvLyBObyBjaGFuZ2UgbmVlZGVkXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gdXBkYXRlVGFza1N0YXR1cyAtIG5vIGNoYW5nZSBuZWVkZWRcIik7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBHZXQgdGhlIGVkaXRvciB2aWV3IHRvIHVzZSBDb2RlTWlycm9yJ3MgZGlzcGF0Y2hcclxuXHRcdGNvbnN0IHZpZXcgPSB0aGlzLmdldEVkaXRvclZpZXcoKTtcclxuXHRcdGlmICghdmlldykge1xyXG5cdFx0XHQvLyBGYWxsYmFjayB0byBPYnNpZGlhbiBBUEkgaWYgbm8gQ29kZU1pcnJvciB2aWV3XHJcblx0XHRcdGNvbnN0IGFjdGl2ZVZpZXcgPSB0aGlzLnBsdWdpbj8uYXBwPy53b3Jrc3BhY2U/LmdldEFjdGl2ZVZpZXdPZlR5cGUoTWFya2Rvd25WaWV3KTtcclxuXHRcdFx0aWYgKCFhY3RpdmVWaWV3Py5lZGl0b3IgfHwgIWFjdGl2ZVZpZXcuZmlsZSkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgd2UncmUgdXBkYXRpbmcgdGhlIGNvcnJlY3QgZmlsZVxyXG5cdFx0XHRpZiAoYWN0aXZlVmlldy5maWxlLnBhdGggIT09IHRoaXMuZmlsZVBhdGgpIHtcclxuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVwZGF0ZSB0aGUgbGluZSB1c2luZyBPYnNpZGlhbidzIGVkaXRvciBBUElcclxuXHRcdFx0Y29uc3QgbGluZU51bSA9IGxpbmUubnVtYmVyIC0gMTsgLy8gQ29udmVydCB0byAwLWJhc2VkXHJcblx0XHRcdGFjdGl2ZVZpZXcuZWRpdG9yLnNldExpbmUobGluZU51bSwgdXBkYXRlZFRleHQpO1xyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVc2UgQ29kZU1pcnJvciBkaXNwYXRjaCB3aXRoIGFubm90YXRpb24gdG8gcHJldmVudCBjeWNsZUNvbXBsZXRlU3RhdHVzIGludGVyZmVyZW5jZVxyXG5cdFx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdGNoYW5nZXM6IHtcclxuXHRcdFx0XHRmcm9tOiBsaW5lLmZyb20sXHJcblx0XHRcdFx0dG86IGxpbmUudG8sXHJcblx0XHRcdFx0aW5zZXJ0OiB1cGRhdGVkVGV4dFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ0YXNrVGltZXJcIilcclxuXHRcdH0pO1xyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogU3RhcnQgdGltZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXJ0VGltZXIoKTogdm9pZCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRsZXQgdGFza0lkID0gdGhpcy5nZXRUYXNrSWQoKTtcclxuXHJcblx0XHRcdC8vIElmIG5vIGV4aXN0aW5nIGJsb2NrIElELCBnZW5lcmF0ZSBvbmUgYW5kIGluc2VydCBpdFxyXG5cdFx0XHRpZiAoIXRhc2tJZCkge1xyXG5cdFx0XHRcdGNvbnN0IGJsb2NrSWQgPSB0aGlzLnRpbWVyTWFuYWdlci5nZW5lcmF0ZUJsb2NrSWQodGhpcy5zZXR0aW5ncy5ibG9ja1JlZlByZWZpeCk7XHJcblxyXG5cdFx0XHRcdC8vIEdldCBFZGl0b3JWaWV3IHVzaW5nIG91ciBoZWxwZXIgbWV0aG9kXHJcblx0XHRcdFx0Y29uc3QgdmlldyA9IHRoaXMuZ2V0RWRpdG9yVmlldygpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gRWRpdG9yVmlldzpcIiwgdmlldyk7XHJcblxyXG5cdFx0XHRcdGlmICh2aWV3KSB7XHJcblx0XHRcdFx0XHRjb25zdCBsaW5lID0gdGhpcy5zdGF0ZS5kb2MubGluZUF0KHRoaXMubGluZUZyb20pO1xyXG5cdFx0XHRcdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblx0XHRcdFx0XHRjb25zdCBibG9ja1JlZiA9IGAgXiR7YmxvY2tJZH1gO1xyXG5cclxuXHRcdFx0XHRcdC8vIEFsc28gdXBkYXRlIHRhc2sgc3RhdHVzIHRvIGluLXByb2dyZXNzXHJcblx0XHRcdFx0XHRjb25zdCBpblByb2dyZXNzTWFya2VycyA9ICh0aGlzLnBsdWdpbj8uc2V0dGluZ3M/LnRhc2tTdGF0dXNlcz8uaW5Qcm9ncmVzcyB8fCBcIj58L1wiKS5zcGxpdCgnfCcpO1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5Qcm9ncmVzc01hcmtlciA9IGluUHJvZ3Jlc3NNYXJrZXJzWzBdIHx8ICcvJztcclxuXHRcdFx0XHRcdGNvbnN0IHVwZGF0ZWRUZXh0ID0gbGluZVRleHRcclxuXHRcdFx0XHRcdFx0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXS8sIGBbJHtpblByb2dyZXNzTWFya2VyfV1gKVxyXG5cdFx0XHRcdFx0XHQudHJpbUVuZCgpICsgYmxvY2tSZWY7XHJcblxyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIFVwZGF0aW5nIGxpbmUgJHtsaW5lLm51bWJlcn1gKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gT3JpZ2luYWwgdGV4dDpcIiwgbGluZVRleHQpO1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBVcGRhdGVkIHRleHQ6XCIsIHVwZGF0ZWRUZXh0KTtcclxuXHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHQvLyBSZXBsYWNlIHRoZSBlbnRpcmUgbGluZSB3aXRoIHVwZGF0ZWQgc3RhdHVzIGFuZCBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0XHRcdFx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdFx0Y2hhbmdlczoge1xyXG5cdFx0XHRcdFx0XHRcdFx0ZnJvbTogbGluZS5mcm9tLFxyXG5cdFx0XHRcdFx0XHRcdFx0dG86IGxpbmUudG8sXHJcblx0XHRcdFx0XHRcdFx0XHRpbnNlcnQ6IHVwZGF0ZWRUZXh0XHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRhbm5vdGF0aW9uczogdGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24ub2YoXCJ0YXNrVGltZXJcIilcclxuXHRcdFx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBVcGRhdGUgb3VyIGxvY2FsIHJlZmVyZW5jZVxyXG5cdFx0XHRcdFx0XHR0aGlzLmV4aXN0aW5nQmxvY2tJZCA9IGJsb2NrSWQ7XHJcblx0XHRcdFx0XHRcdHRhc2tJZCA9IGAke3RoaXMuZmlsZVBhdGh9I14ke2Jsb2NrSWR9YDtcclxuXHJcblx0XHRcdFx0XHRcdC8vIFN0YXJ0IHRoZSB0aW1lciBhZnRlciBpbnNlcnRpbmcgYmxvY2sgSURcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIFN0YXJ0aW5nIHRpbWVyIGZvciBuZXdseSBjcmVhdGVkIHRhc2s6ICR7dGFza0lkfWApO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnRpbWVyTWFuYWdlci5zdGFydFRpbWVyKHRoaXMuZmlsZVBhdGgsIGJsb2NrSWQpO1xyXG5cdFx0XHRcdFx0XHR0aGlzLnN0YXJ0UmVhbHRpbWVVcGRhdGVzKCk7XHJcblx0XHRcdFx0XHRcdHRoaXMudXBkYXRlVGltZXJTdGF0ZSgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gRGVjb3JhdGlvbnMgd2lsbCByZWZyZXNoIGF1dG9tYXRpY2FsbHkgYWZ0ZXIgdGV4dCBjaGFuZ2VcclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmVycm9yKFwiW1Rhc2tUaW1lcl0gRXJyb3IgZGlzcGF0Y2hpbmcgY2hhbmdlOlwiLCBlcnIpO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyXSBObyBFZGl0b3JWaWV3IGF2YWlsYWJsZVwiKTtcclxuXHRcdFx0XHRcdC8vIEZhbGxiYWNrOiB0cnkgdG8gZ2V0IGVkaXRvciBmcm9tIGVkaXRvckluZm9GaWVsZFxyXG5cdFx0XHRcdFx0Y29uc3QgZWRpdG9ySW5mbyA9IHRoaXMuc3RhdGUuZmllbGQoZWRpdG9ySW5mb0ZpZWxkKTtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gVHJ5aW5nIGVkaXRvckluZm86XCIsIGVkaXRvckluZm8pO1xyXG5cclxuXHRcdFx0XHRcdGlmIChlZGl0b3JJbmZvPy5lZGl0b3IpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbGluZSA9IHRoaXMuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmxpbmVGcm9tKTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBBbHNvIHVwZGF0ZSB0YXNrIHN0YXR1cyB0byBpbi1wcm9ncmVzc1xyXG5cdFx0XHRcdFx0XHRjb25zdCBpblByb2dyZXNzTWFya2VycyA9ICh0aGlzLnBsdWdpbj8uc2V0dGluZ3M/LnRhc2tTdGF0dXNlcz8uaW5Qcm9ncmVzcyB8fCBcIj58L1wiKS5zcGxpdCgnfCcpO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBpblByb2dyZXNzTWFya2VyID0gaW5Qcm9ncmVzc01hcmtlcnNbMF0gfHwgJy8nO1xyXG5cdFx0XHRcdFx0XHRjb25zdCB1cGRhdGVkVGV4dCA9IGxpbmVUZXh0XHJcblx0XHRcdFx0XHRcdFx0LnJlcGxhY2UoL1xcWyhbXlxcXV0rKVxcXS8sIGBbJHtpblByb2dyZXNzTWFya2VyfV1gKVxyXG5cdFx0XHRcdFx0XHRcdC50cmltRW5kKCkgKyBgIF4ke2Jsb2NrSWR9YDtcclxuXHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0ZWRpdG9ySW5mby5lZGl0b3IucmVwbGFjZVJhbmdlKHVwZGF0ZWRUZXh0LFxyXG5cdFx0XHRcdFx0XHRcdFx0e2xpbmU6IGxpbmUubnVtYmVyIC0gMSwgY2g6IDB9LFxyXG5cdFx0XHRcdFx0XHRcdFx0e2xpbmU6IGxpbmUubnVtYmVyIC0gMSwgY2g6IGxpbmVUZXh0Lmxlbmd0aH1cclxuXHRcdFx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdFx0XHR0aGlzLmV4aXN0aW5nQmxvY2tJZCA9IGJsb2NrSWQ7XHJcblx0XHRcdFx0XHRcdFx0dGFza0lkID0gYCR7dGhpcy5maWxlUGF0aH0jXiR7YmxvY2tJZH1gO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBTdGFydCB0aW1lciBmb3IgdGhlIGZhbGxiYWNrIHBhdGggYXMgd2VsbFxyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyXSBTdGFydGluZyB0aW1lciBmb3IgbmV3bHkgY3JlYXRlZCB0YXNrIChmYWxsYmFjayk6ICR7dGFza0lkfWApO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudGltZXJNYW5hZ2VyLnN0YXJ0VGltZXIodGhpcy5maWxlUGF0aCwgYmxvY2tJZCk7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5zdGFydFJlYWx0aW1lVXBkYXRlcygpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMudXBkYXRlVGltZXJTdGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucmVmcmVzaFVJKCk7XHJcblx0XHRcdFx0XHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyXSBGYWxsYmFjayBhbHNvIGZhaWxlZDpcIiwgZXJyKTtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIElmIHdlIGFscmVhZHkgaGF2ZSBhIHRhc2sgSUQsIGp1c3QgdXBkYXRlIHRoZSBzdGF0dXMgaWYgbmVlZGVkXHJcblx0XHRcdGlmICh0YXNrSWQgJiYgdGhpcy5leGlzdGluZ0Jsb2NrSWQpIHtcclxuXHRcdFx0XHQvLyBDaGVjayBjdXJyZW50IHRhc2sgc3RhdHVzXHJcblx0XHRcdFx0Y29uc3QgbGluZSA9IHRoaXMuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmxpbmVGcm9tKTtcclxuXHRcdFx0XHRjb25zdCBjdXJyZW50U3RhdHVzID0gdGhpcy5nZXRUYXNrU3RhdHVzKGxpbmUudGV4dCk7XHJcblxyXG5cdFx0XHRcdC8vIEtlZXAgc3RhdHVzIHVwZGF0ZSBmb3Igc3RhcnQgdGltZXIgLSBpdCBtYWtlcyBzZW5zZSB0byBtYXJrIGFzIGluLXByb2dyZXNzXHJcblx0XHRcdFx0Ly8gVGhpcyBpcyBkaWZmZXJlbnQgZnJvbSBwYXVzZS9yZXN1bWUgd2hlcmUgc3RhdHVzIGRvZXNuJ3QgbmVjZXNzYXJpbHkgcmVmbGVjdCB0aW1lciBzdGF0ZVxyXG5cdFx0XHRcdGlmIChjdXJyZW50U3RhdHVzICE9PSAnaW4tcHJvZ3Jlc3MnKSB7XHJcblx0XHRcdFx0XHRjb25zdCBpblByb2dyZXNzTWFya2VycyA9ICh0aGlzLnBsdWdpbj8uc2V0dGluZ3M/LnRhc2tTdGF0dXNlcz8uaW5Qcm9ncmVzcyB8fCBcIj58L1wiKS5zcGxpdCgnfCcpO1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5Qcm9ncmVzc01hcmtlciA9IGluUHJvZ3Jlc3NNYXJrZXJzWzBdIHx8ICcvJztcclxuXHRcdFx0XHRcdHRoaXMudXBkYXRlVGFza1N0YXR1cyhgWyR7aW5Qcm9ncmVzc01hcmtlcn1dYCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBTdGFydCBvciByZXN1bWUgdGhlIHRpbWVyXHJcblx0XHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIFN0YXJ0aW5nL3Jlc3VtaW5nIHRpbWVyIGZvciB0YXNrOiAke3Rhc2tJZH1gKTtcclxuXHRcdFx0XHR0aGlzLnRpbWVyTWFuYWdlci5zdGFydFRpbWVyKHRoaXMuZmlsZVBhdGgsIHRoaXMuZXhpc3RpbmdCbG9ja0lkKTtcclxuXHRcdFx0XHR0aGlzLnVwZGF0ZVRpbWVyU3RhdGUoKTtcclxuXHRcdFx0XHR0aGlzLnJlZnJlc2hVSSgpOyAvLyBUaGlzIHdpbGwgc3RhcnQgcmVhbC10aW1lIHVwZGF0ZXMgaWYgbmVlZGVkXHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBUaW1lciBzdGFydGVkIHN1Y2Nlc3NmdWxseVwiKTtcclxuXHRcdFx0fVxyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIltUYXNrVGltZXJdIEVycm9yIHN0YXJ0aW5nIHRpbWVyOlwiLCBlcnJvcik7XHJcblx0XHRcdHRoaXMudXBkYXRlVGltZXJTdGF0ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUGF1c2UgdGltZXJcclxuXHQgKi9cclxuXHRwcml2YXRlIHBhdXNlVGltZXIoKTogdm9pZCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBGaXJzdCBjaGVjayBpZiB0aGUgdGFzayBpcyBjb21wbGV0ZWQgLSBzaG91bGQgbm90IHBhdXNlIGNvbXBsZXRlZCB0YXNrc1xyXG5cdFx0XHRjb25zdCBsaW5lID0gdGhpcy5zdGF0ZS5kb2MubGluZUF0KHRoaXMubGluZUZyb20pO1xyXG5cdFx0XHRjb25zdCBjdXJyZW50U3RhdHVzID0gdGhpcy5nZXRUYXNrU3RhdHVzKGxpbmUudGV4dCk7XHJcblx0XHRcdGlmIChjdXJyZW50U3RhdHVzID09PSAnY29tcGxldGVkJykge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIltUYXNrVGltZXJdIENhbm5vdCBwYXVzZSBhIGNvbXBsZXRlZCB0YXNrXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgdGFza0lkID0gdGhpcy5nZXRUYXNrSWQoKTtcclxuXHRcdFx0aWYgKCF0YXNrSWQpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJbVGFza1RpbWVyXSBDYW5ub3QgcGF1c2UgdGltZXIgLSBubyB0YXNrIElEIGZvdW5kXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIFBhdXNpbmcgdGltZXIgZm9yIHRhc2s6ICR7dGFza0lkfWApO1xyXG5cdFx0XHR0aGlzLnRpbWVyTWFuYWdlci5wYXVzZVRpbWVyKHRhc2tJZCk7XHJcblxyXG5cdFx0XHQvLyBET04nVCB1cGRhdGUgdGFzayBzdGF0dXMgLSBqdXN0IHBhdXNlIHRoZSB0aW1lclxyXG5cdFx0XHQvLyBUaGUgdGltZXIgc3RhdGUgaXMgc3RvcmVkIGluIGxvY2FsU3RvcmFnZSBhbmQgd2lsbCBwZXJzaXN0XHJcblx0XHRcdC8vIFRoaXMgYXZvaWRzIGNvbmZsaWN0cyB3aXRoIGF1dG9EYXRlTWFuYWdlciBhbmQgb3RoZXIgcGx1Z2luc1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRpbWVyIHBhdXNlZCB3aXRob3V0IGNoYW5naW5nIHRhc2sgc3RhdHVzXCIpO1xyXG5cclxuXHRcdFx0Ly8gU3RvcCB1cGRhdGVzIGltbWVkaWF0ZWx5XHJcblx0XHRcdHRoaXMuc3RvcFJlYWx0aW1lVXBkYXRlcygpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRpbWVyU3RhdGUoKTtcclxuXHRcdFx0dGhpcy5yZWZyZXNoVUkoKTsgLy8gUmVmcmVzaCBVSSB0byBzaG93IHBhdXNlZCBzdGF0ZVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRpbWVyIHBhdXNlZCBzdWNjZXNzZnVsbHlcIik7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiW1Rhc2tUaW1lcl0gRXJyb3IgcGF1c2luZyB0aW1lcjpcIiwgZXJyb3IpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRpbWVyU3RhdGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc3VtZSB0aW1lclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgcmVzdW1lVGltZXIoKTogdm9pZCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBGaXJzdCBjaGVjayBpZiB0aGUgdGFzayBpcyBjb21wbGV0ZWQgLSBzaG91bGQgbm90IHJlc3VtZSBjb21wbGV0ZWQgdGFza3NcclxuXHRcdFx0Y29uc3QgbGluZSA9IHRoaXMuc3RhdGUuZG9jLmxpbmVBdCh0aGlzLmxpbmVGcm9tKTtcclxuXHRcdFx0Y29uc3QgY3VycmVudFN0YXR1cyA9IHRoaXMuZ2V0VGFza1N0YXR1cyhsaW5lLnRleHQpO1xyXG5cdFx0XHRpZiAoY3VycmVudFN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJbVGFza1RpbWVyXSBDYW5ub3QgcmVzdW1lIGEgY29tcGxldGVkIHRhc2tcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrSWQgPSB0aGlzLmdldFRhc2tJZCgpO1xyXG5cdFx0XHRpZiAoIXRhc2tJZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIltUYXNrVGltZXJdIENhbm5vdCByZXN1bWUgdGltZXIgLSBubyB0YXNrIElEIGZvdW5kXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIFJlc3VtaW5nIHRpbWVyIGZvciB0YXNrOiAke3Rhc2tJZH1gKTtcclxuXHRcdFx0dGhpcy50aW1lck1hbmFnZXIucmVzdW1lVGltZXIodGFza0lkKTtcclxuXHJcblx0XHRcdC8vIERPTidUIHVwZGF0ZSB0YXNrIHN0YXR1cyAtIGp1c3QgcmVzdW1lIHRoZSB0aW1lclxyXG5cdFx0XHQvLyBUaGUgdXNlciBjYW4gbWFudWFsbHkgY2hhbmdlIHN0YXR1cyBpZiBuZWVkZWRcclxuXHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBUaW1lciByZXN1bWVkIHdpdGhvdXQgY2hhbmdpbmcgdGFzayBzdGF0dXNcIik7XHJcblxyXG5cdFx0XHR0aGlzLnN0YXJ0UmVhbHRpbWVVcGRhdGVzKCk7XHJcblx0XHRcdHRoaXMudXBkYXRlVGltZXJTdGF0ZSgpO1xyXG5cdFx0XHR0aGlzLnJlZnJlc2hVSSgpOyAvLyBSZWZyZXNoIFVJIHRvIHNob3cgcnVubmluZyBzdGF0ZSBpbW1lZGlhdGVseVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRpbWVyIHJlc3VtZWQgc3VjY2Vzc2Z1bGx5XCIpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIltUYXNrVGltZXJdIEVycm9yIHJlc3VtaW5nIHRpbWVyOlwiLCBlcnJvcik7XHJcblx0XHRcdHRoaXMuc3RvcFJlYWx0aW1lVXBkYXRlcygpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZVRpbWVyU3RhdGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlc2V0IHRpbWVyXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZXNldFRpbWVyKCk6IHZvaWQge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdGFza0lkID0gdGhpcy5nZXRUYXNrSWQoKTtcclxuXHRcdFx0aWYgKCF0YXNrSWQpIHtcclxuXHRcdFx0XHRjb25zb2xlLndhcm4oXCJbVGFza1RpbWVyXSBDYW5ub3QgcmVzZXQgdGltZXIgLSBubyB0YXNrIElEIGZvdW5kXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIFJlc2V0dGluZyB0aW1lciBmb3IgdGFzazogJHt0YXNrSWR9YCk7XHJcblx0XHRcdHRoaXMudGltZXJNYW5hZ2VyLnJlc2V0VGltZXIodGFza0lkKTtcclxuXHJcblx0XHRcdC8vIERPTidUIHVwZGF0ZSB0YXNrIHN0YXR1cyAtIGp1c3QgcmVzZXQgdGhlIHRpbWVyXHJcblx0XHRcdC8vIExldCB1c2VyIG1hbnVhbGx5IG1hbmFnZSB0YXNrIHN0YXR1c1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRpbWVyIHJlc2V0IHdpdGhvdXQgY2hhbmdpbmcgdGFzayBzdGF0dXNcIik7XHJcblxyXG5cdFx0XHR0aGlzLnN0b3BSZWFsdGltZVVwZGF0ZXMoKTtcclxuXHRcdFx0dGhpcy51cGRhdGVUaW1lclN0YXRlKCk7XHJcblx0XHRcdHRoaXMucmVmcmVzaFVJKCk7IC8vIFJlZnJlc2ggVUkgdG8gc2hvdyByZXNldCBzdGF0ZVxyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRpbWVyIHJlc2V0IHN1Y2Nlc3NmdWxseVwiKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyXSBFcnJvciByZXNldHRpbmcgdGltZXI6XCIsIGVycm9yKTtcclxuXHRcdFx0dGhpcy51cGRhdGVUaW1lclN0YXRlKCk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDb21wbGV0ZSB0aW1lciBhbmQgdXBkYXRlIHRhc2tcclxuXHQgKi9cclxuXHRwcml2YXRlIGNvbXBsZXRlVGltZXIoKTogdm9pZCB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHQvLyBGaXJzdCBjaGVjayBpZiB0aGUgdGFzayBpcyBhbHJlYWR5IGNvbXBsZXRlZFxyXG5cdFx0XHRjb25zdCBsaW5lID0gdGhpcy5zdGF0ZS5kb2MubGluZUF0KHRoaXMubGluZUZyb20pO1xyXG5cdFx0XHRjb25zdCBjdXJyZW50U3RhdHVzID0gdGhpcy5nZXRUYXNrU3RhdHVzKGxpbmUudGV4dCk7XHJcblx0XHRcdGlmIChjdXJyZW50U3RhdHVzID09PSAnY29tcGxldGVkJykge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIltUYXNrVGltZXJdIFRhc2sgaXMgYWxyZWFkeSBjb21wbGV0ZWRcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCB0YXNrSWQgPSB0aGlzLmdldFRhc2tJZCgpO1xyXG5cdFx0XHRpZiAoIXRhc2tJZCkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIltUYXNrVGltZXJdIENhbm5vdCBjb21wbGV0ZSB0aW1lciAtIG5vIHRhc2sgSUQgZm91bmRcIik7XHJcblx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgW1Rhc2tUaW1lcl0gQ29tcGxldGluZyB0aW1lciBmb3IgdGFzazogJHt0YXNrSWR9YCk7XHJcblxyXG5cdFx0XHQvLyBHZXQgdGhlIHRpbWVyIHN0YXRlIGJlZm9yZSBjb21wbGV0aW5nXHJcblx0XHRcdGNvbnN0IHRpbWVyU3RhdGUgPSB0aGlzLnRpbWVyTWFuYWdlci5nZXRUaW1lclN0YXRlKHRhc2tJZCk7XHJcblx0XHRcdGlmICghdGltZXJTdGF0ZSkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIltUYXNrVGltZXJdIE5vIHRpbWVyIHN0YXRlIGZvdW5kIGZvciB0YXNrOlwiLCB0YXNrSWQpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ29tcGxldGUgdGhlIHRpbWVyIGFuZCBnZXQgdGhlIGZvcm1hdHRlZCBkdXJhdGlvblxyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWREdXJhdGlvbiA9IHRoaXMudGltZXJNYW5hZ2VyLmNvbXBsZXRlVGltZXIodGFza0lkKTtcclxuXHJcblx0XHRcdC8vIEdldCBFZGl0b3JWaWV3IHRvIG1vZGlmeSBkb2N1bWVudFxyXG5cdFx0XHRjb25zdCB2aWV3ID0gdGhpcy5nZXRFZGl0b3JWaWV3KCk7XHJcblxyXG5cdFx0XHRpZiAodmlldykge1xyXG5cdFx0XHRcdGNvbnN0IGxpbmUgPSB0aGlzLnN0YXRlLmRvYy5saW5lQXQodGhpcy5saW5lRnJvbSk7XHJcblx0XHRcdFx0Y29uc3QgbGluZVRleHQgPSBsaW5lLnRleHQ7XHJcblxyXG5cdFx0XHRcdC8vIENyZWF0ZSB0aGUgdXBkYXRlZCB0ZXh0IHVzaW5nIGNvbmZpZ3VyZWQgY29tcGxldGVkIG1hcmtlclxyXG5cdFx0XHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtlcnMgPSAodGhpcy5wbHVnaW4/LnNldHRpbmdzPy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZCB8fCBcInh8WFwiKS5zcGxpdCgnfCcpO1xyXG5cdFx0XHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtlciA9IGNvbXBsZXRlZE1hcmtlcnNbMF0gfHwgJ3gnO1xyXG5cclxuXHRcdFx0XHQvLyBGaXJzdCB1cGRhdGUgdGhlIHRhc2sgc3RhdHVzXHJcblx0XHRcdFx0bGV0IHVwZGF0ZWRUZXh0ID0gbGluZVRleHQucmVwbGFjZSgvXFxbKFteXFxdXSspXFxdLywgYFske2NvbXBsZXRlZE1hcmtlcn1dYCk7XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGZvciBibG9jayByZWZlcmVuY2UgSUQgYXQgdGhlIGVuZFxyXG5cdFx0XHRcdGNvbnN0IGJsb2NrUmVmTWF0Y2ggPSB1cGRhdGVkVGV4dC5tYXRjaCgvXFxzKlxcXltcXHctXStcXHMqJC8pO1xyXG5cdFx0XHRcdGlmIChibG9ja1JlZk1hdGNoKSB7XHJcblx0XHRcdFx0XHQvLyBJbnNlcnQgZHVyYXRpb24gYmVmb3JlIHRoZSBibG9jayByZWZlcmVuY2UgSURcclxuXHRcdFx0XHRcdGNvbnN0IGluc2VydFBvc2l0aW9uID0gdXBkYXRlZFRleHQubGVuZ3RoIC0gYmxvY2tSZWZNYXRjaFswXS5sZW5ndGg7XHJcblx0XHRcdFx0XHR1cGRhdGVkVGV4dCA9IHVwZGF0ZWRUZXh0LnNsaWNlKDAsIGluc2VydFBvc2l0aW9uKSArIGAgKCR7Zm9ybWF0dGVkRHVyYXRpb259KWAgKyB1cGRhdGVkVGV4dC5zbGljZShpbnNlcnRQb3NpdGlvbik7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIE5vIGJsb2NrIHJlZmVyZW5jZSwgYWRkIGR1cmF0aW9uIGF0IHRoZSBlbmRcclxuXHRcdFx0XHRcdHVwZGF0ZWRUZXh0ID0gdXBkYXRlZFRleHQucmVwbGFjZSgvXFxzKiQvLCBgICgke2Zvcm1hdHRlZER1cmF0aW9ufSlgKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gQ29tcGxldGluZyB0YXNrIC0gb3JpZ2luYWw6XCIsIGxpbmVUZXh0KTtcclxuXHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIENvbXBsZXRpbmcgdGFzayAtIHVwZGF0ZWQ6XCIsIHVwZGF0ZWRUZXh0KTtcclxuXHJcblx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdC8vIFVzZSBkaXNwYXRjaCB0byByZXBsYWNlIHRoZSBlbnRpcmUgbGluZVxyXG5cdFx0XHRcdFx0dmlldy5kaXNwYXRjaCh7XHJcblx0XHRcdFx0XHRcdGNoYW5nZXM6IHtcclxuXHRcdFx0XHRcdFx0XHRmcm9tOiBsaW5lLmZyb20sXHJcblx0XHRcdFx0XHRcdFx0dG86IGxpbmUudG8sXHJcblx0XHRcdFx0XHRcdFx0aW5zZXJ0OiB1cGRhdGVkVGV4dFxyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHR9IGNhdGNoIChlcnIpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyXSBFcnJvciB1cGRhdGluZyB0YXNrOlwiLCBlcnIpO1xyXG5cdFx0XHRcdFx0Ly8gVHJ5IGZhbGxiYWNrXHJcblx0XHRcdFx0XHRjb25zdCBlZGl0b3JJbmZvID0gdGhpcy5zdGF0ZS5maWVsZChlZGl0b3JJbmZvRmllbGQpO1xyXG5cdFx0XHRcdFx0aWYgKGVkaXRvckluZm8/LmVkaXRvcikge1xyXG5cdFx0XHRcdFx0XHRlZGl0b3JJbmZvLmVkaXRvci5yZXBsYWNlUmFuZ2UodXBkYXRlZFRleHQsXHJcblx0XHRcdFx0XHRcdFx0e2xpbmU6IGxpbmUubnVtYmVyIC0gMSwgY2g6IDB9LFxyXG5cdFx0XHRcdFx0XHRcdHtsaW5lOiBsaW5lLm51bWJlciAtIDEsIGNoOiBsaW5lVGV4dC5sZW5ndGh9XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyXSBObyB2aWV3IGF2YWlsYWJsZSB0byBjb21wbGV0ZSB0YXNrXCIpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0dGhpcy5zdG9wUmVhbHRpbWVVcGRhdGVzKCk7XHJcblx0XHRcdHRoaXMudXBkYXRlVGltZXJTdGF0ZSgpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgW1Rhc2tUaW1lcl0gVGltZXIgY29tcGxldGVkIHN1Y2Nlc3NmdWxseTogJHtmb3JtYXR0ZWREdXJhdGlvbn1gKTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdGNvbnNvbGUuZXJyb3IoXCJbVGFza1RpbWVyXSBFcnJvciBjb21wbGV0aW5nIHRpbWVyOlwiLCBlcnJvcik7XHJcblx0XHRcdHRoaXMudXBkYXRlVGltZXJTdGF0ZSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogTG9hZCB0aW1lciBzdGF0ZSBmcm9tIGxvY2FsU3RvcmFnZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgbG9hZFRpbWVyU3RhdGUoKTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuZXhpc3RpbmdCbG9ja0lkKSByZXR1cm47XHJcblxyXG5cdFx0Ly8gVXNlIFRhc2tUaW1lck1hbmFnZXIgdG8gZ2V0IHRoZSB0aW1lciBzdGF0ZVxyXG5cdFx0Y29uc3QgdGFza0lkID0gdGhpcy5nZXRUYXNrSWQoKTtcclxuXHRcdGlmICh0YXNrSWQpIHtcclxuXHRcdFx0dGhpcy50aW1lclN0YXRlID0gdGhpcy50aW1lck1hbmFnZXIuZ2V0VGltZXJTdGF0ZSh0YXNrSWQpO1xyXG5cdFx0XHRpZiAodGhpcy50aW1lclN0YXRlKSB7XHJcblx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBMb2FkZWQgdGltZXIgc3RhdGUgZm9yXCIsIHRoaXMuZmlsZVBhdGgsIHRoaXMuZXhpc3RpbmdCbG9ja0lkLCBcIjpcIiwgdGhpcy50aW1lclN0YXRlKTtcclxuXHRcdFx0XHQvLyBJZiB0aW1lciBpcyBydW5uaW5nLCBzdGFydCByZWFsLXRpbWUgdXBkYXRlcyBpbW1lZGlhdGVseVxyXG5cdFx0XHRcdGlmICh0aGlzLnRpbWVyU3RhdGUuc3RhdHVzID09PSAncnVubmluZycpIHtcclxuXHRcdFx0XHRcdHRoaXMuc3RhcnRSZWFsdGltZVVwZGF0ZXMoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZSB0aW1lciBzdGF0ZSBmcm9tIGxvY2FsU3RvcmFnZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgdXBkYXRlVGltZXJTdGF0ZSgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IHRhc2tJZCA9IHRoaXMuZ2V0VGFza0lkKCk7XHJcblx0XHRpZiAodGFza0lkKSB7XHJcblx0XHRcdHRoaXMudGltZXJTdGF0ZSA9IHRoaXMudGltZXJNYW5hZ2VyLmdldFRpbWVyU3RhdGUodGFza0lkKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCB0YXNrIElEIGZvciB0aGlzIHdpZGdldFxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZ2V0VGFza0lkKCk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0aWYgKHRoaXMuZXhpc3RpbmdCbG9ja0lkKSB7XHJcblx0XHRcdC8vIFVzZSB0aGUgc2FtZSBmb3JtYXQgYXMgVGFza1RpbWVyTWFuYWdlci5nZXRTdG9yYWdlS2V5XHJcblx0XHRcdHJldHVybiBgdGFza1RpbWVyXyR7dGhpcy5maWxlUGF0aH0jJHt0aGlzLmV4aXN0aW5nQmxvY2tJZH1gO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBTdGFydCByZWFsLXRpbWUgdXBkYXRlcyBmb3IgcnVubmluZyB0aW1lclxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhcnRSZWFsdGltZVVwZGF0ZXMoKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy51cGRhdGVJbnRlcnZhbCkge1xyXG5cdFx0XHRjbGVhckludGVydmFsKHRoaXMudXBkYXRlSW50ZXJ2YWwpO1xyXG5cdFx0fVxyXG5cclxuXHRcdHRoaXMudXBkYXRlSW50ZXJ2YWwgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoKCkgPT4ge1xyXG5cdFx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTsgLy8gVXBkYXRlIHRoZSBlbnRpcmUgY29udGVudFxyXG5cdFx0fSwgMTAwMCk7IC8vIFVwZGF0ZSBldmVyeSBzZWNvbmRcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFN0b3AgcmVhbC10aW1lIHVwZGF0ZXNcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0b3BSZWFsdGltZVVwZGF0ZXMoKTogdm9pZCB7XHJcblx0XHRpZiAodGhpcy51cGRhdGVJbnRlcnZhbCkge1xyXG5cdFx0XHRjbGVhckludGVydmFsKHRoaXMudXBkYXRlSW50ZXJ2YWwpO1xyXG5cdFx0XHR0aGlzLnVwZGF0ZUludGVydmFsID0gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFJlZnJlc2ggdGhlIGVudGlyZSBVSSAodXNlZCB3aGVuIHN0YXRlIGNoYW5nZXMgc2lnbmlmaWNhbnRseSlcclxuXHQgKi9cclxuXHRwcml2YXRlIHJlZnJlc2hVSSgpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5kb20pIHJldHVybjtcclxuXHJcblx0XHQvLyBSZWxvYWQgdGltZXIgc3RhdGUgaWYgd2UgaGF2ZSBhIGJsb2NrIElEXHJcblx0XHRpZiAodGhpcy5leGlzdGluZ0Jsb2NrSWQpIHtcclxuXHRcdFx0dGhpcy5sb2FkVGltZXJTdGF0ZSgpO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy51cGRhdGVUaW1lclN0YXRlKCk7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNyZWF0ZUNvbnRlbnQoKTtcclxuXHR9XHJcblxyXG5cdGRlc3Ryb3koKSB7XHJcblx0XHR0aGlzLnN0b3BSZWFsdGltZVVwZGF0ZXMoKTtcclxuXHRcdGlmICh0aGlzLmRvbSkge1xyXG5cdFx0XHR0aGlzLmRvbS5yZW1vdmUoKTtcclxuXHRcdFx0dGhpcy5kb20gPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YXRlRmllbGQgZm9yIG1hbmFnaW5nIHRhc2sgdGltZXIgZGVjb3JhdGlvbnNcclxuICogVGhpcyBoYW5kbGVzIGJsb2NrLWxldmVsIGRlY29yYXRpb25zIHByb3Blcmx5IGluIENvZGVNaXJyb3JcclxuICovXHJcbmNvbnN0IHRhc2tUaW1lclN0YXRlRmllbGQgPSBTdGF0ZUZpZWxkLmRlZmluZTxEZWNvcmF0aW9uU2V0Pih7XHJcblx0Y3JlYXRlKHN0YXRlOiBFZGl0b3JTdGF0ZSk6IERlY29yYXRpb25TZXQge1xyXG5cdFx0cmV0dXJuIGNyZWF0ZVRhc2tUaW1lckRlY29yYXRpb25zKHN0YXRlKTtcclxuXHR9LFxyXG5cdHVwZGF0ZShkZWNvcmF0aW9uczogRGVjb3JhdGlvblNldCwgdHJhbnNhY3Rpb246IFRyYW5zYWN0aW9uKTogRGVjb3JhdGlvblNldCB7XHJcblx0XHQvLyBDaGVjayBpZiB0aGlzIGlzIGFuIHVuZG8vcmVkbyBvcGVyYXRpb25cclxuXHRcdGNvbnN0IGlzVW5kb1JlZG8gPSB0cmFuc2FjdGlvbi5pc1VzZXJFdmVudChcInVuZG9cIikgfHwgdHJhbnNhY3Rpb24uaXNVc2VyRXZlbnQoXCJyZWRvXCIpO1xyXG5cclxuXHRcdC8vIFJlY3JlYXRlIGRlY29yYXRpb25zIG9uIGRvYyBjaGFuZ2VzLCBzdGF0ZSBlZmZlY3RzLCBvciB1bmRvL3JlZG9cclxuXHRcdGlmICh0cmFuc2FjdGlvbi5kb2NDaGFuZ2VkIHx8IHRyYW5zYWN0aW9uLmVmZmVjdHMubGVuZ3RoID4gMCB8fCBpc1VuZG9SZWRvKSB7XHJcblx0XHRcdC8vIE1vbml0b3IgYWxsIHRhc2sgc3RhdHVzIGNoYW5nZXMsIG5vdCBqdXN0IHVuZG8vcmVkb1xyXG5cdFx0XHRpZiAodHJhbnNhY3Rpb24uZG9jQ2hhbmdlZCkge1xyXG5cdFx0XHRcdGhhbmRsZVRhc2tTdGF0dXNDaGFuZ2UodHJhbnNhY3Rpb24pO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJldHVybiBjcmVhdGVUYXNrVGltZXJEZWNvcmF0aW9ucyh0cmFuc2FjdGlvbi5zdGF0ZSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gZGVjb3JhdGlvbnM7XHJcblx0fSxcclxuXHRwcm92aWRlOiAoZmllbGQ6IFN0YXRlRmllbGQ8RGVjb3JhdGlvblNldD4pID0+IEVkaXRvclZpZXcuZGVjb3JhdGlvbnMuZnJvbShmaWVsZClcclxufSk7XHJcblxyXG4vKipcclxuICogQ3JlYXRlIHRhc2sgdGltZXIgZGVjb3JhdGlvbnMgZm9yIHRoZSBjdXJyZW50IHN0YXRlXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVUYXNrVGltZXJEZWNvcmF0aW9ucyhzdGF0ZTogRWRpdG9yU3RhdGUpOiBEZWNvcmF0aW9uU2V0IHtcclxuXHQvLyBHZXQgY29uZmlndXJhdGlvbiBmcm9tIGZhY2V0XHJcblx0Y29uc3QgdGltZXJDb25maWcgPSBzdGF0ZS5mYWNldCh0YXNrVGltZXJDb25maWdGYWNldCk7XHJcblx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBDcmVhdGluZyBkZWNvcmF0aW9ucywgdGltZXJDb25maWc6XCIsIHRpbWVyQ29uZmlnKTtcclxuXHJcblx0aWYgKCF0aW1lckNvbmZpZz8uc2V0dGluZ3M/LmVuYWJsZWQpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gVGltZXIgbm90IGVuYWJsZWQgb3Igbm8gY29uZmlnXCIpO1xyXG5cdFx0cmV0dXJuIERlY29yYXRpb24ubm9uZTtcclxuXHR9XHJcblxyXG5cdC8vIEdldCBlZGl0b3IgaW5mbyB0byBhY2Nlc3MgYXBwIGFuZCBmaWxlIGluZm9ybWF0aW9uXHJcblx0Y29uc3QgZWRpdG9ySW5mbyA9IHN0YXRlLmZpZWxkKGVkaXRvckluZm9GaWVsZCk7XHJcblx0aWYgKCFlZGl0b3JJbmZvPy5hcHApIHtcclxuXHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gTm8gZWRpdG9yIGluZm8gb3IgYXBwXCIpO1xyXG5cdFx0cmV0dXJuIERlY29yYXRpb24ubm9uZTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IGZpbGUgPSBlZGl0b3JJbmZvLmFwcC53b3Jrc3BhY2UuZ2V0QWN0aXZlRmlsZSgpO1xyXG5cdGlmICghZmlsZSkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBObyBhY3RpdmUgZmlsZVwiKTtcclxuXHRcdHJldHVybiBEZWNvcmF0aW9uLm5vbmU7XHJcblx0fVxyXG5cclxuXHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFByb2Nlc3NpbmcgZmlsZTpcIiwgZmlsZS5wYXRoKTtcclxuXHJcblx0Y29uc3QgbWV0YWRhdGFEZXRlY3RvciA9IG5ldyBUYXNrVGltZXJNZXRhZGF0YURldGVjdG9yKFxyXG5cdFx0dGltZXJDb25maWcuc2V0dGluZ3MsXHJcblx0XHR0aW1lckNvbmZpZy5tZXRhZGF0YUNhY2hlXHJcblx0KTtcclxuXHJcblx0aWYgKCFtZXRhZGF0YURldGVjdG9yLmlzVGFza1RpbWVyRW5hYmxlZChmaWxlKSkge1xyXG5cdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBUaW1lciBub3QgZW5hYmxlZCBmb3IgZmlsZTpcIiwgZmlsZS5wYXRoKTtcclxuXHRcdHJldHVybiBEZWNvcmF0aW9uLm5vbmU7XHJcblx0fVxyXG5cclxuXHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFRpbWVyIGVuYWJsZWQgZm9yIGZpbGUsIHByb2Nlc3NpbmcuLi5cIik7XHJcblxyXG5cdGNvbnN0IHRpbWVyTWFuYWdlciA9IG5ldyBUYXNrVGltZXJNYW5hZ2VyKHRpbWVyQ29uZmlnLnNldHRpbmdzKTtcclxuXHRjb25zdCBkZWNvcmF0aW9uczogUmFuZ2U8RGVjb3JhdGlvbj5bXSA9IFtdO1xyXG5cdGNvbnN0IGRvYyA9IHN0YXRlLmRvYztcclxuXHJcblx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBEb2N1bWVudCBoYXNcIiwgZG9jLmxpbmVzLCBcImxpbmVzXCIpO1xyXG5cclxuXHQvLyBGaXJzdCBwYXNzOiBmaW5kIHRoZSBtaW5pbXVtIGluZGVudGF0aW9uIGxldmVsIGFtb25nIGFsbCB0YXNrc1xyXG5cdGxldCBtaW5JbmRlbnRMZXZlbCA9IEluZmluaXR5O1xyXG5cdGZvciAobGV0IGkgPSAxOyBpIDw9IGRvYy5saW5lczsgaSsrKSB7XHJcblx0XHRjb25zdCBsaW5lID0gZG9jLmxpbmUoaSk7XHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHRcdFxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhpcyBsaW5lIGNvbnRhaW5zIGEgdGFza1xyXG5cdFx0aWYgKGlzVGFza0xpbmUobGluZVRleHQpKSB7XHJcblx0XHRcdGNvbnN0IGN1cnJlbnRJbmRlbnQgPSBsaW5lVGV4dC5tYXRjaCgvXihcXHMqKS8pPy5bMV0ubGVuZ3RoIHx8IDA7XHJcblx0XHRcdGlmIChjdXJyZW50SW5kZW50IDwgbWluSW5kZW50TGV2ZWwpIHtcclxuXHRcdFx0XHRtaW5JbmRlbnRMZXZlbCA9IGN1cnJlbnRJbmRlbnQ7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gTWluaW11bSBpbmRlbnQgbGV2ZWwgZm91bmQ6XCIsIG1pbkluZGVudExldmVsKTtcclxuXHJcblx0Ly8gUHJvY2VzcyBhbGwgbGluZXMgaW4gdGhlIGRvY3VtZW50XHJcblx0Zm9yIChsZXQgaSA9IDE7IGkgPD0gZG9jLmxpbmVzOyBpKyspIHtcclxuXHRcdGNvbnN0IGxpbmUgPSBkb2MubGluZShpKTtcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gbGluZS50ZXh0O1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIHRoaXMgbGluZSBjb250YWlucyBhIHRhc2tcclxuXHRcdGlmIChpc1Rhc2tMaW5lKGxpbmVUZXh0KSkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIEZvdW5kIHRhc2sgbGluZTpcIiwgbGluZVRleHQudHJpbSgpKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSBmaXJzdC1sZXZlbCB0YXNrXHJcblx0XHRcdGNvbnN0IGN1cnJlbnRJbmRlbnQgPSBsaW5lVGV4dC5tYXRjaCgvXihcXHMqKS8pPy5bMV0ubGVuZ3RoIHx8IDA7XHJcblx0XHRcdGNvbnN0IGlzRmlyc3RMZXZlbCA9IGN1cnJlbnRJbmRlbnQgPT09IG1pbkluZGVudExldmVsO1xyXG5cclxuXHRcdFx0aWYgKGlzRmlyc3RMZXZlbCkge1xyXG5cdFx0XHRcdC8vIENoZWNrIHRhc2sgc3RhdHVzIC0gb25seSBza2lwIGNvbXBsZXRlZCB0YXNrcyB3aXRob3V0IGV4aXN0aW5nIHRpbWVyc1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tTdGF0dXNNYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKC9eXFxzKlstKitdXFxzK1xcWyhbXlxcXV0rKVxcXS8pO1xyXG5cdFx0XHRcdGlmICh0YXNrU3RhdHVzTWF0Y2gpIHtcclxuXHRcdFx0XHRcdGNvbnN0IHN0YXR1c0NoYXIgPSB0YXNrU3RhdHVzTWF0Y2hbMV07XHJcblx0XHRcdFx0XHRjb25zdCB0YXNrU3RhdHVzZXMgPSB0aW1lckNvbmZpZz8ucGx1Z2luPy5zZXR0aW5ncz8udGFza1N0YXR1c2VzIHx8IHtcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkOiBcInh8WFwiLFxyXG5cdFx0XHRcdFx0XHRhYmFuZG9uZWQ6IFwiLVwiXHJcblx0XHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRcdC8vIFNraXAgY29tcGxldGVkIHRhc2tzIG9ubHlcclxuXHRcdFx0XHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtlcnMgPSB0YXNrU3RhdHVzZXMuY29tcGxldGVkLnNwbGl0KCd8Jyk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGNvbXBsZXRlZE1hcmtlcnMuaW5jbHVkZXMoc3RhdHVzQ2hhcikpIHtcclxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBTa2lwcGluZyBjb21wbGV0ZWQgdGFzayBhdCBsaW5lXCIsIGkpO1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBGb3IgYWJhbmRvbmVkIHRhc2tzLCBjaGVjayBpZiB0aGV5IGhhdmUgYW4gZXhpc3RpbmcgYmxvY2sgSUQgd2l0aCB0aW1lciBkYXRhXHJcblx0XHRcdFx0XHRjb25zdCBhYmFuZG9uZWRNYXJrZXJzID0gdGFza1N0YXR1c2VzLmFiYW5kb25lZC5zcGxpdCgnfCcpO1xyXG5cdFx0XHRcdFx0aWYgKGFiYW5kb25lZE1hcmtlcnMuaW5jbHVkZXMoc3RhdHVzQ2hhcikpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgYmxvY2tJZCA9IGV4dHJhY3RCbG9ja1JlZihsaW5lVGV4dCk7XHJcblx0XHRcdFx0XHRcdGlmICghYmxvY2tJZCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gU2tpcHBpbmcgYWJhbmRvbmVkIHRhc2sgd2l0aG91dCBibG9jayBJRCBhdCBsaW5lXCIsIGkpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdC8vIElmIGFiYW5kb25lZCB0YXNrIGhhcyBhIGJsb2NrIElELCBsZXQgaXQgY29udGludWUgdG8gc2hvdyB0aW1lclxyXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIEFiYW5kb25lZCB0YXNrIHdpdGggYmxvY2sgSUQgZm91bmQsIGNoZWNraW5nIGZvciB0aW1lciBzdGF0ZVwiKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gRm91bmQgZmlyc3QtbGV2ZWwgdGFzayBhdCBsaW5lXCIsIGkpO1xyXG5cdFx0XHRcdC8vIEV4dHJhY3QgZXhpc3RpbmcgYmxvY2sgcmVmZXJlbmNlIGlmIHByZXNlbnRcclxuXHRcdFx0XHRjb25zdCBleGlzdGluZ0Jsb2NrSWQgPSBleHRyYWN0QmxvY2tSZWYobGluZVRleHQpO1xyXG5cclxuXHRcdFx0XHQvLyBDcmVhdGUgYmxvY2stbGV2ZWwgdGltZXIgd2lkZ2V0IGRlY29yYXRpb25cclxuXHRcdFx0XHRjb25zdCB0aW1lckRlY28gPSBEZWNvcmF0aW9uLndpZGdldCh7XHJcblx0XHRcdFx0XHR3aWRnZXQ6IG5ldyBUYXNrVGltZXJXaWRnZXQoXHJcblx0XHRcdFx0XHRcdHN0YXRlLFxyXG5cdFx0XHRcdFx0XHR0aW1lckNvbmZpZy5zZXR0aW5ncyxcclxuXHRcdFx0XHRcdFx0dGltZXJNYW5hZ2VyLFxyXG5cdFx0XHRcdFx0XHRsaW5lLmZyb20sXHJcblx0XHRcdFx0XHRcdGxpbmUudG8sXHJcblx0XHRcdFx0XHRcdGZpbGUucGF0aCxcclxuXHRcdFx0XHRcdFx0dGltZXJDb25maWcucGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRleGlzdGluZ0Jsb2NrSWRcclxuXHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRzaWRlOiAtMSwgLy8gUGxhY2UgYmVmb3JlIHRoZSBsaW5lXHJcblx0XHRcdFx0XHRibG9jazogdHJ1ZSAvLyBUaGlzIGlzIG5vdyBhbGxvd2VkIGluIFN0YXRlRmllbGRcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gQWRkIGRlY29yYXRpb24gYXQgdGhlIHN0YXJ0IG9mIHRoZSBsaW5lICh0aGlzIHdpbGwgYXBwZWFyIGFib3ZlIHRoZSB0YXNrKVxyXG5cdFx0XHRcdGRlY29yYXRpb25zLnB1c2godGltZXJEZWNvLnJhbmdlKGxpbmUuZnJvbSkpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gQWRkZWQgdGltZXIgZGVjb3JhdGlvbiBmb3IgZmlyc3QtbGV2ZWwgdGFzayBhdCBsaW5lOlwiLCBpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBDcmVhdGVkXCIsIGRlY29yYXRpb25zLmxlbmd0aCwgXCJ0aW1lciBkZWNvcmF0aW9uc1wiKTtcclxuXHRyZXR1cm4gRGVjb3JhdGlvbi5zZXQoZGVjb3JhdGlvbnMsIHRydWUpO1xyXG59XHJcblxyXG4vKipcclxuICogSGVscGVyIGZ1bmN0aW9uc1xyXG4gKi9cclxuZnVuY3Rpb24gaXNUYXNrTGluZShsaW5lVGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0Ly8gTWF0Y2ggYW55IGNoYXJhY3RlciBpbnNpZGUgc3F1YXJlIGJyYWNrZXRzXHJcblx0cmV0dXJuIC9eXFxzKlstKitdXFxzK1xcW1teXFxdXSpcXF0vLnRlc3QobGluZVRleHQpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEJsb2NrUmVmKGxpbmVUZXh0OiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG5cdC8vIE1hdGNoIGJsb2NrIHJlZmVyZW5jZSBhbnl3aGVyZSBpbiB0aGUgbGluZSwgbm90IGp1c3QgYXQgdGhlIGVuZFxyXG5cdGNvbnN0IG1hdGNoID0gbGluZVRleHQubWF0Y2goL1xcXihbYS16QS1aMC05XFwtX10rKS8pO1xyXG5cdHJldHVybiBtYXRjaCA/IG1hdGNoWzFdIDogdW5kZWZpbmVkO1xyXG59XHJcblxyXG4vKipcclxuICogSGFuZGxlIHRpbWVyIHN0YXRlIHVwZGF0ZXMgd2hlbiB0YXNrIHN0YXR1cyBjaGFuZ2VzXHJcbiAqIFRoaXMgbW9uaXRvcnMgYWxsIHN0YXR1cyBjaGFuZ2VzIGFuZCBhdXRvbWF0aWNhbGx5IG1hbmFnZXMgdGltZXJzIGFjY29yZGluZ2x5XHJcbiAqL1xyXG5mdW5jdGlvbiBoYW5kbGVUYXNrU3RhdHVzQ2hhbmdlKHRyYW5zYWN0aW9uOiBUcmFuc2FjdGlvbik6IHZvaWQge1xyXG5cdC8vIEdldCBjb25maWd1cmF0aW9uIGZyb20gdHJhbnNhY3Rpb24gc3RhdGVcclxuXHRjb25zdCB0aW1lckNvbmZpZyA9IHRyYW5zYWN0aW9uLnN0YXRlLmZhY2V0KHRhc2tUaW1lckNvbmZpZ0ZhY2V0KTtcclxuXHRpZiAoIXRpbWVyQ29uZmlnPy5zZXR0aW5ncz8uZW5hYmxlZCB8fCAhdGltZXJDb25maWcucGx1Z2luKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCBlZGl0b3JJbmZvID0gdHJhbnNhY3Rpb24uc3RhdGUuZmllbGQoZWRpdG9ySW5mb0ZpZWxkKTtcclxuXHRpZiAoIWVkaXRvckluZm8/LmFwcCkge1xyXG5cdFx0cmV0dXJuO1xyXG5cdH1cclxuXHJcblx0Y29uc3QgZmlsZSA9IGVkaXRvckluZm8uYXBwLndvcmtzcGFjZS5nZXRBY3RpdmVGaWxlKCk7XHJcblx0aWYgKCFmaWxlKSB7XHJcblx0XHRyZXR1cm47XHJcblx0fVxyXG5cclxuXHRjb25zdCB0aW1lck1hbmFnZXIgPSBuZXcgVGFza1RpbWVyTWFuYWdlcih0aW1lckNvbmZpZy5zZXR0aW5ncyk7XHJcblx0Y29uc3QgZG9jID0gdHJhbnNhY3Rpb24uc3RhdGUuZG9jO1xyXG5cclxuXHQvLyBDaGVjayBlYWNoIGNoYW5nZWQgbGluZSBmb3IgdGFzayBzdGF0dXMgY2hhbmdlc1xyXG5cdHRyYW5zYWN0aW9uLmNoYW5nZXMuaXRlckNoYW5nZWRSYW5nZXMoKGZyb21BOiBudW1iZXIsIHRvQTogbnVtYmVyLCBmcm9tQjogbnVtYmVyLCB0b0I6IG51bWJlcikgPT4ge1xyXG5cdFx0Y29uc3Qgc3RhcnRMaW5lID0gZG9jLmxpbmVBdChmcm9tQikubnVtYmVyO1xyXG5cdFx0Y29uc3QgZW5kTGluZSA9IGRvYy5saW5lQXQodG9CKS5udW1iZXI7XHJcblxyXG5cdFx0Zm9yIChsZXQgbGluZU51bSA9IHN0YXJ0TGluZTsgbGluZU51bSA8PSBlbmRMaW5lOyBsaW5lTnVtKyspIHtcclxuXHRcdFx0aWYgKGxpbmVOdW0gPiBkb2MubGluZXMpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Y29uc3QgbGluZSA9IGRvYy5saW5lKGxpbmVOdW0pO1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IGxpbmUudGV4dDtcclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIHRoaXMgaXMgYSB0YXNrIGxpbmVcclxuXHRcdFx0aWYgKCFpc1Rhc2tMaW5lKGxpbmVUZXh0KSkgY29udGludWU7XHJcblxyXG5cdFx0XHQvLyBFeHRyYWN0IGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0XHRjb25zdCBibG9ja0lkID0gZXh0cmFjdEJsb2NrUmVmKGxpbmVUZXh0KTtcclxuXHRcdFx0aWYgKCFibG9ja0lkKSBjb250aW51ZTtcclxuXHJcblx0XHRcdC8vIENoZWNrIHRhc2sgc3RhdHVzXHJcblx0XHRcdGNvbnN0IHN0YXR1c01hdGNoID0gbGluZVRleHQubWF0Y2goL15cXHMqWy0qK11cXHMrXFxbKFteXFxdXSspXFxdLyk7XHJcblx0XHRcdGlmICghc3RhdHVzTWF0Y2gpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhdHVzQ2hhciA9IHN0YXR1c01hdGNoWzFdO1xyXG5cdFx0XHRjb25zdCB0YXNrU3RhdHVzZXMgPSB0aW1lckNvbmZpZz8ucGx1Z2luPy5zZXR0aW5ncz8udGFza1N0YXR1c2VzIHx8IHtcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRcdFx0aW5Qcm9ncmVzczogXCI+fC9cIixcclxuXHRcdFx0XHRhYmFuZG9uZWQ6IFwiLVwiLFxyXG5cdFx0XHRcdG5vdFN0YXJ0ZWQ6IFwiIFwiXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHQvLyBEZXRlcm1pbmUgd2hhdCB0byBkbyBiYXNlZCBvbiB0aGUgbmV3IHN0YXR1c1xyXG5cdFx0XHRjb25zdCBpblByb2dyZXNzTWFya2VycyA9IHRhc2tTdGF0dXNlcy5pblByb2dyZXNzLnNwbGl0KCd8Jyk7XHJcblx0XHRcdGNvbnN0IGFiYW5kb25lZE1hcmtlcnMgPSB0YXNrU3RhdHVzZXMuYWJhbmRvbmVkLnNwbGl0KCd8Jyk7XHJcblx0XHRcdGNvbnN0IGNvbXBsZXRlZE1hcmtlcnMgPSB0YXNrU3RhdHVzZXMuY29tcGxldGVkLnNwbGl0KCd8Jyk7XHJcblx0XHRcdGNvbnN0IG5vdFN0YXJ0ZWRNYXJrZXJzID0gdGFza1N0YXR1c2VzLm5vdFN0YXJ0ZWQuc3BsaXQoJ3wnKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tJZCA9IGB0YXNrVGltZXJfJHtmaWxlLnBhdGh9IyR7YmxvY2tJZH1gO1xyXG5cdFx0XHRjb25zdCBleGlzdGluZ1RpbWVyID0gdGltZXJNYW5hZ2VyLmdldFRpbWVyU3RhdGUodGFza0lkKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBbVGFza1RpbWVyXSBTdGF0dXMgY2hhbmdlIGRldGVjdGVkOiBcIiR7c3RhdHVzQ2hhcn1cIiBmb3IgdGFzayAke3Rhc2tJZH1gKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFtUYXNrVGltZXJdIEV4aXN0aW5nIHRpbWVyOmAsIGV4aXN0aW5nVGltZXIpO1xyXG5cclxuXHRcdFx0aWYgKGluUHJvZ3Jlc3NNYXJrZXJzLmluY2x1ZGVzKHN0YXR1c0NoYXIpKSB7XHJcblx0XHRcdFx0Ly8gVGFzayBpcyBub3cgaW4gcHJvZ3Jlc3NcclxuXHRcdFx0XHRpZiAoIWV4aXN0aW5nVGltZXIgfHwgZXhpc3RpbmdUaW1lci5zdGF0dXMgPT09ICdpZGxlJykge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBTdGF0dXMgLT4gSW4gUHJvZ3Jlc3M6IFN0YXJ0aW5nIG5ldyB0aW1lclwiKTtcclxuXHRcdFx0XHRcdHRpbWVyTWFuYWdlci5zdGFydFRpbWVyKGZpbGUucGF0aCwgYmxvY2tJZCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChleGlzdGluZ1RpbWVyLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gU3RhdHVzIC0+IEluIFByb2dyZXNzOiBSZXN1bWluZyBwYXVzZWQgdGltZXJcIik7XHJcblx0XHRcdFx0XHR0aW1lck1hbmFnZXIucmVzdW1lVGltZXIodGFza0lkKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKGV4aXN0aW5nVGltZXIuc3RhdHVzID09PSAncnVubmluZycpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gU3RhdHVzIC0+IEluIFByb2dyZXNzOiBUaW1lciBhbHJlYWR5IHJ1bm5pbmdcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKGFiYW5kb25lZE1hcmtlcnMuaW5jbHVkZXMoc3RhdHVzQ2hhcikpIHtcclxuXHRcdFx0XHQvLyBUYXNrIGlzIG5vdyBhYmFuZG9uZWQgLSBwYXVzZSB0aW1lciBpZiBydW5uaW5nXHJcblx0XHRcdFx0aWYgKGV4aXN0aW5nVGltZXIgJiYgZXhpc3RpbmdUaW1lci5zdGF0dXMgPT09ICdydW5uaW5nJykge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coXCJbVGFza1RpbWVyXSBTdGF0dXMgLT4gQWJhbmRvbmVkOiBQYXVzaW5nIHJ1bm5pbmcgdGltZXJcIik7XHJcblx0XHRcdFx0XHR0aW1lck1hbmFnZXIucGF1c2VUaW1lcih0YXNrSWQpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAoZXhpc3RpbmdUaW1lciAmJiBleGlzdGluZ1RpbWVyLnN0YXR1cyA9PT0gJ3BhdXNlZCcpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gU3RhdHVzIC0+IEFiYW5kb25lZDogVGltZXIgYWxyZWFkeSBwYXVzZWRcIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKGNvbXBsZXRlZE1hcmtlcnMuaW5jbHVkZXMoc3RhdHVzQ2hhcikpIHtcclxuXHRcdFx0XHQvLyBUYXNrIGlzIGNvbXBsZXRlZCAtIHN0b3AgYW5kIHNhdmUgdGltZXJcclxuXHRcdFx0XHRpZiAoZXhpc3RpbmdUaW1lciAmJiAoZXhpc3RpbmdUaW1lci5zdGF0dXMgPT09ICdydW5uaW5nJyB8fCBleGlzdGluZ1RpbWVyLnN0YXR1cyA9PT0gJ3BhdXNlZCcpKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIltUYXNrVGltZXJdIFN0YXR1cyAtPiBDb21wbGV0ZWQ6IFN0b3BwaW5nIHRpbWVyIGFuZCBzYXZpbmcgdGltZVwiKTtcclxuXHRcdFx0XHRcdC8vIFN0b3AgdGltZXIgYnV0IHByZXNlcnZlIHRoZSBlbGFwc2VkIHRpbWVcclxuXHRcdFx0XHRcdHRpbWVyTWFuYWdlci5wYXVzZVRpbWVyKHRhc2tJZCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9IGVsc2UgaWYgKG5vdFN0YXJ0ZWRNYXJrZXJzLmluY2x1ZGVzKHN0YXR1c0NoYXIpKSB7XHJcblx0XHRcdFx0Ly8gVGFzayBpcyByZXNldCB0byBub3Qgc3RhcnRlZCAtIHJlc2V0IHRpbWVyXHJcblx0XHRcdFx0aWYgKGV4aXN0aW5nVGltZXIpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUubG9nKFwiW1Rhc2tUaW1lcl0gU3RhdHVzIC0+IE5vdCBTdGFydGVkOiBSZXNldHRpbmcgdGltZXJcIik7XHJcblx0XHRcdFx0XHR0aW1lck1hbmFnZXIucmVzZXRUaW1lcih0YXNrSWQpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH0pO1xyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqIE1haW4gdGFzayB0aW1lciBleHRlbnNpb24gZnVuY3Rpb25cclxuICogQ3JlYXRlcyBhIFN0YXRlRmllbGQtYmFzZWQgZXh0ZW5zaW9uIGZvciBwcm9wZXIgYmxvY2sgZGVjb3JhdGlvbnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0YXNrVGltZXJFeHRlbnNpb24oXHJcblx0cGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuKSB7XHJcblx0Ly8gQ3JlYXRlIGNvbmZpZ3VyYXRpb24gb2JqZWN0XHJcblx0Y29uc3QgY29uZmlnOiBUYXNrVGltZXJDb25maWcgPSB7XHJcblx0XHRzZXR0aW5nczogcGx1Z2luLnNldHRpbmdzLnRhc2tUaW1lcixcclxuXHRcdG1ldGFkYXRhQ2FjaGU6IHBsdWdpbi5hcHAubWV0YWRhdGFDYWNoZSxcclxuXHRcdHBsdWdpblxyXG5cdH07XHJcblxyXG5cdC8vIFJldHVybiBib3RoIHRoZSBmYWNldCBjb25maWd1cmF0aW9uIGFuZCB0aGUgc3RhdGUgZmllbGRcclxuXHRyZXR1cm4gW1xyXG5cdFx0dGFza1RpbWVyQ29uZmlnRmFjZXQub2YoY29uZmlnKSxcclxuXHRcdHRhc2tUaW1lclN0YXRlRmllbGRcclxuXHRdO1xyXG59XHJcbiJdfQ==