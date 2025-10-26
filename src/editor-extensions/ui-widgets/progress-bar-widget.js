import { Decoration, EditorView, ViewPlugin, WidgetType, } from "@codemirror/view";
// @ts-ignore - This import is necessary but TypeScript can't find it
import { foldable, syntaxTree, tokenClassNodeProp } from "@codemirror/language";
import { RegExpCursor } from "@/editor-extensions/core/regex-cursor";
import { shouldHideProgressBarInLivePriview } from "@/utils";
import "../../styles/progressbar.css";
import { extractTaskAndGoalInfo } from "@/core/goal/edit-mode";
import { showPopoverWithProgressBar } from "@/components/ui";
/**
 * Format the progress text according to settings and data
 * Supports various display modes including fraction, percentage, and custom formats
 *
 * This function is exported for use in the settings UI for previews
 */
export function formatProgressText(data, plugin) {
    if (!data.total)
        return "";
    // Calculate percentages
    const completedPercentage = Math.round((data.completed / data.total) * 10000) / 100;
    const inProgressPercentage = data.inProgress
        ? Math.round((data.inProgress / data.total) * 10000) / 100
        : 0;
    const abandonedPercentage = data.abandoned
        ? Math.round((data.abandoned / data.total) * 10000) / 100
        : 0;
    const plannedPercentage = data.planned
        ? Math.round((data.planned / data.total) * 10000) / 100
        : 0;
    // Create a full data object with percentages for expression evaluation
    const fullData = Object.assign(Object.assign({}, data), { percentages: {
            completed: completedPercentage,
            inProgress: inProgressPercentage,
            abandoned: abandonedPercentage,
            planned: plannedPercentage,
            notStarted: data.notStarted
                ? Math.round((data.notStarted / data.total) * 10000) / 100
                : 0,
        } });
    // Get status symbols
    const completedSymbol = "✓";
    const inProgressSymbol = "⟳";
    const abandonedSymbol = "✗";
    const plannedSymbol = "?";
    // Get display mode from settings, with fallbacks for backwards compatibility
    const displayMode = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.displayMode) ||
        ((plugin === null || plugin === void 0 ? void 0 : plugin.settings.progressBarDisplayMode) === "text" ||
            (plugin === null || plugin === void 0 ? void 0 : plugin.settings.progressBarDisplayMode) === "both"
            ? (plugin === null || plugin === void 0 ? void 0 : plugin.settings.showPercentage)
                ? "percentage"
                : "bracketFraction"
            : "bracketFraction");
    // Process text with template formatting
    let resultText = "";
    // Handle different display modes
    switch (displayMode) {
        case "percentage":
            // Simple percentage (e.g., "75%")
            resultText = `${completedPercentage}%`;
            break;
        case "bracketPercentage":
            // Percentage with brackets (e.g., "[75%]")
            resultText = `[${completedPercentage}%]`;
            break;
        case "fraction":
            // Simple fraction (e.g., "3/4")
            resultText = `${data.completed}/${data.total}`;
            break;
        case "bracketFraction":
            // Fraction with brackets (e.g., "[3/4]")
            resultText = `[${data.completed}/${data.total}]`;
            break;
        case "detailed":
            // Detailed format showing all task statuses
            resultText = `[${data.completed}${completedSymbol} ${data.inProgress || 0}${inProgressSymbol} ${data.abandoned || 0}${abandonedSymbol} ${data.planned || 0}${plannedSymbol} / ${data.total}]`;
            break;
        case "custom":
            // Handle custom format if available in settings
            if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.customFormat) {
                resultText = plugin.settings.customFormat
                    .replace(/{{COMPLETED}}/g, data.completed.toString())
                    .replace(/{{TOTAL}}/g, data.total.toString())
                    .replace(/{{IN_PROGRESS}}/g, (data.inProgress || 0).toString())
                    .replace(/{{ABANDONED}}/g, (data.abandoned || 0).toString())
                    .replace(/{{PLANNED}}/g, (data.planned || 0).toString())
                    .replace(/{{NOT_STARTED}}/g, (data.notStarted || 0).toString())
                    .replace(/{{PERCENT}}/g, completedPercentage.toString())
                    .replace(/{{PROGRESS}}/g, completedPercentage.toString())
                    .replace(/{{PERCENT_IN_PROGRESS}}/g, inProgressPercentage.toString())
                    .replace(/{{PERCENT_ABANDONED}}/g, abandonedPercentage.toString())
                    .replace(/{{PERCENT_PLANNED}}/g, plannedPercentage.toString())
                    .replace(/{{COMPLETED_SYMBOL}}/g, completedSymbol)
                    .replace(/{{IN_PROGRESS_SYMBOL}}/g, inProgressSymbol)
                    .replace(/{{ABANDONED_SYMBOL}}/g, abandonedSymbol)
                    .replace(/{{PLANNED_SYMBOL}}/g, plannedSymbol);
            }
            else {
                resultText = `[${data.completed}/${data.total}]`;
            }
            break;
        case "range-based":
            // Check if custom progress ranges are enabled
            if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.customizeProgressRanges) {
                // Find a matching range for the current percentage
                const matchingRange = plugin.settings.progressRanges.find((range) => completedPercentage >= range.min &&
                    completedPercentage <= range.max);
                // If a matching range is found, use its custom text
                if (matchingRange) {
                    resultText = matchingRange.text.replace("{{PROGRESS}}", completedPercentage.toString());
                }
                else {
                    resultText = `${completedPercentage}%`;
                }
            }
            else {
                resultText = `${completedPercentage}%`;
            }
            break;
        default:
            // Legacy behavior for compatibility
            if ((plugin === null || plugin === void 0 ? void 0 : plugin.settings.progressBarDisplayMode) === "text" ||
                (plugin === null || plugin === void 0 ? void 0 : plugin.settings.progressBarDisplayMode) === "both") {
                // If using text mode, check if percentage is preferred
                if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.showPercentage) {
                    resultText = `${completedPercentage}%`;
                }
                else {
                    // Show detailed counts if we have in-progress, abandoned, or planned tasks
                    if ((data.inProgress && data.inProgress > 0) ||
                        (data.abandoned && data.abandoned > 0) ||
                        (data.planned && data.planned > 0)) {
                        resultText = `[${data.completed}✓ ${data.inProgress || 0}⟳ ${data.abandoned || 0}✗ ${data.planned || 0}? / ${data.total}]`;
                    }
                    else {
                        // Simple fraction format with brackets
                        resultText = `[${data.completed}/${data.total}]`;
                    }
                }
            }
            else {
                // Default to bracket fraction if no specific text mode is set
                resultText = `[${data.completed}/${data.total}]`;
            }
    }
    // Process JavaScript expressions enclosed in ${= }
    resultText = resultText.replace(/\${=(.+?)}/g, (match, expr) => {
        try {
            // Create a safe function to evaluate the expression with the data context
            const evalFunc = new Function("data", `return ${expr}`);
            return evalFunc(fullData);
        }
        catch (error) {
            console.error("Error evaluating expression:", expr, error);
            return match; // Return the original match on error
        }
    });
    return resultText;
}
class TaskProgressBarWidget extends WidgetType {
    constructor(app, plugin, view, from, to, completed, total, inProgress = 0, abandoned = 0, notStarted = 0, planned = 0) {
        super();
        this.app = app;
        this.plugin = plugin;
        this.view = view;
        this.from = from;
        this.to = to;
        this.completed = completed;
        this.total = total;
        this.inProgress = inProgress;
        this.abandoned = abandoned;
        this.notStarted = notStarted;
        this.planned = planned;
    }
    eq(other) {
        if (this.from === other.from &&
            this.to === other.to &&
            this.inProgress === other.inProgress &&
            this.abandoned === other.abandoned &&
            this.notStarted === other.notStarted &&
            this.planned === other.planned &&
            this.completed === other.completed &&
            this.total === other.total) {
            return true;
        }
        return (other.completed === this.completed &&
            other.total === this.total &&
            other.inProgress === this.inProgress &&
            other.abandoned === this.abandoned &&
            other.notStarted === this.notStarted &&
            other.planned === this.planned);
    }
    changePercentage() {
        if (this.total === 0)
            return;
        const completedPercentage = Math.round((this.completed / this.total) * 10000) / 100;
        const inProgressPercentage = Math.round((this.inProgress / this.total) * 10000) / 100;
        const abandonedPercentage = Math.round((this.abandoned / this.total) * 10000) / 100;
        const plannedPercentage = Math.round((this.planned / this.total) * 10000) / 100;
        // Set the completed part
        this.progressEl.style.width = completedPercentage + "%";
        // Set the in-progress part (if it exists)
        if (this.inProgressEl) {
            this.inProgressEl.style.width = inProgressPercentage + "%";
            this.inProgressEl.style.left = completedPercentage + "%";
        }
        // Set the abandoned part (if it exists)
        if (this.abandonedEl) {
            this.abandonedEl.style.width = abandonedPercentage + "%";
            this.abandonedEl.style.left =
                completedPercentage + inProgressPercentage + "%";
        }
        // Set the planned part (if it exists)
        if (this.plannedEl) {
            this.plannedEl.style.width = plannedPercentage + "%";
            this.plannedEl.style.left =
                completedPercentage +
                    inProgressPercentage +
                    abandonedPercentage +
                    "%";
        }
        // Update the class based on progress percentage
        // This allows for CSS styling based on progress level
        let progressClass = "progress-bar-inline";
        switch (true) {
            case completedPercentage === 0:
                progressClass += " progress-bar-inline-empty";
                break;
            case completedPercentage > 0 && completedPercentage < 25:
                progressClass += " progress-bar-inline-0";
                break;
            case completedPercentage >= 25 && completedPercentage < 50:
                progressClass += " progress-bar-inline-1";
                break;
            case completedPercentage >= 50 && completedPercentage < 75:
                progressClass += " progress-bar-inline-2";
                break;
            case completedPercentage >= 75 && completedPercentage < 100:
                progressClass += " progress-bar-inline-3";
                break;
            case completedPercentage >= 100:
                progressClass += " progress-bar-inline-complete";
                break;
        }
        // Add classes for special states
        if (inProgressPercentage > 0) {
            progressClass += " has-in-progress";
        }
        if (abandonedPercentage > 0) {
            progressClass += " has-abandoned";
        }
        if (plannedPercentage > 0) {
            progressClass += " has-planned";
        }
        this.progressEl.className = progressClass;
    }
    changeNumber() {
        var _a, _b;
        if (((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.progressBarDisplayMode) === "both" ||
            ((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.progressBarDisplayMode) === "text") {
            let text = formatProgressText({
                completed: this.completed,
                total: this.total,
                inProgress: this.inProgress,
                abandoned: this.abandoned,
                notStarted: this.notStarted,
                planned: this.planned,
            }, this.plugin);
            if (!this.numberEl) {
                this.numberEl = this.progressBarEl.createEl("div", {
                    cls: "progress-status",
                    text: text,
                });
            }
            else {
                this.numberEl.innerText = text;
            }
        }
    }
    toDOM() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.progressBarDisplayMode) === "both" ||
            ((_b = this.plugin) === null || _b === void 0 ? void 0 : _b.settings.progressBarDisplayMode) === "text") {
            if (this.numberEl !== undefined) {
                this.numberEl.detach();
            }
        }
        if (this.progressBarEl !== undefined) {
            this.changePercentage();
            if (this.numberEl !== undefined)
                this.changeNumber();
            return this.progressBarEl;
        }
        this.progressBarEl = createSpan(((_c = this.plugin) === null || _c === void 0 ? void 0 : _c.settings.progressBarDisplayMode) === "both" ||
            ((_d = this.plugin) === null || _d === void 0 ? void 0 : _d.settings.progressBarDisplayMode) === "text"
            ? "cm-task-progress-bar with-number"
            : "cm-task-progress-bar", (el) => {
            var _a;
            el.dataset.completed = this.completed.toString();
            el.dataset.total = this.total.toString();
            el.dataset.inProgress = this.inProgress.toString();
            el.dataset.abandoned = this.abandoned.toString();
            el.dataset.notStarted = this.notStarted.toString();
            el.dataset.planned = this.planned.toString();
            if ((_a = this.plugin) === null || _a === void 0 ? void 0 : _a.settings.supportHoverToShowProgressInfo) {
                el.onmouseover = () => {
                    showPopoverWithProgressBar(this.plugin, {
                        progressBar: el,
                        data: {
                            completed: this.completed.toString(),
                            total: this.total.toString(),
                            inProgress: this.inProgress.toString(),
                            abandoned: this.abandoned.toString(),
                            notStarted: this.notStarted.toString(),
                            planned: this.planned.toString(),
                        },
                        view: this.view,
                    });
                };
            }
        });
        // Check if graphical progress bar should be shown
        const showGraphicalBar = ((_e = this.plugin) === null || _e === void 0 ? void 0 : _e.settings.progressBarDisplayMode) === "graphical" ||
            ((_f = this.plugin) === null || _f === void 0 ? void 0 : _f.settings.progressBarDisplayMode) === "both";
        if (showGraphicalBar) {
            this.progressBackGroundEl = this.progressBarEl.createEl("div", {
                cls: "progress-bar-inline-background",
            });
            // Create elements for each status type
            this.progressEl = this.progressBackGroundEl.createEl("div", {
                cls: "progress-bar-inline progress-completed",
            });
            // Only create these elements if we have tasks of these types
            if (this.inProgress > 0) {
                this.inProgressEl = this.progressBackGroundEl.createEl("div", {
                    cls: "progress-bar-inline progress-in-progress",
                });
            }
            if (this.abandoned > 0) {
                this.abandonedEl = this.progressBackGroundEl.createEl("div", {
                    cls: "progress-bar-inline progress-abandoned",
                });
            }
            if (this.planned > 0) {
                this.plannedEl = this.progressBackGroundEl.createEl("div", {
                    cls: "progress-bar-inline progress-planned",
                });
            }
            this.changePercentage();
        }
        // Check if text progress should be shown (either as the only option or together with graphic bar)
        const showText = ((_g = this.plugin) === null || _g === void 0 ? void 0 : _g.settings.progressBarDisplayMode) === "text" ||
            ((_h = this.plugin) === null || _h === void 0 ? void 0 : _h.settings.progressBarDisplayMode) === "both";
        if (showText && this.total) {
            const text = formatProgressText({
                completed: this.completed,
                total: this.total,
                inProgress: this.inProgress,
                abandoned: this.abandoned,
                notStarted: this.notStarted,
                planned: this.planned,
            }, this.plugin);
            this.numberEl = this.progressBarEl.createEl("div", {
                cls: "progress-status",
                text: text,
            });
        }
        return this.progressBarEl;
    }
    ignoreEvent() {
        return false;
    }
}
export function taskProgressBarExtension(app, plugin) {
    return ViewPlugin.fromClass(class {
        constructor(view) {
            this.view = view;
            this.progressDecorations = Decoration.none;
            let { progress } = this.getDeco(view);
            this.progressDecorations = progress;
        }
        update(update) {
            if (update.docChanged || update.viewportChanged) {
                let { progress } = this.getDeco(update.view);
                this.progressDecorations = progress;
            }
        }
        getDeco(view) {
            let { state } = view, progressDecos = [];
            // Check if progress bars should be hidden based on settings
            if (shouldHideProgressBarInLivePriview(plugin, view)) {
                return {
                    progress: Decoration.none,
                };
            }
            for (let part of view.visibleRanges) {
                let taskBulletCursor;
                let headingCursor;
                let nonTaskBulletCursor;
                try {
                    taskBulletCursor = new RegExpCursor(state.doc, "^[\\t|\\s]*([-*+]|\\d+\\.)\\s\\[(.)\\]", {}, part.from, part.to);
                }
                catch (err) {
                    console.debug(err);
                    continue;
                }
                // Process headings if enabled in settings
                if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.addTaskProgressBarToHeading) {
                    try {
                        headingCursor = new RegExpCursor(state.doc, "^(#){1,6} ", {}, part.from, part.to);
                    }
                    catch (err) {
                        console.debug(err);
                        continue;
                    }
                    // Process headings
                    this.processHeadings(headingCursor, progressDecos, view);
                }
                // Process non-task bullets if enabled in settings
                if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.addProgressBarToNonTaskBullet) {
                    try {
                        // Pattern to match bullets without task markers
                        nonTaskBulletCursor = new RegExpCursor(state.doc, "^[\\t|\\s]*([-*+]|\\d+\\.)\\s(?!\\[.\\])", {}, part.from, part.to);
                    }
                    catch (err) {
                        console.debug(err);
                        continue;
                    }
                    // Process non-task bullets
                    this.processNonTaskBullets(nonTaskBulletCursor, progressDecos, view);
                }
                // Process task bullets
                this.processBullets(taskBulletCursor, progressDecos, view);
            }
            return {
                progress: Decoration.set(progressDecos.sort((a, b) => a.from - b.from)),
            };
        }
        /**
         * Process heading matches and add decorations
         */
        processHeadings(cursor, decorations, view) {
            while (!cursor.next().done) {
                let { from, to } = cursor.value;
                const headingLine = view.state.doc.lineAt(from);
                if (!this.isPositionEnabledByHeading(view.state, headingLine.from)) {
                    continue;
                }
                const range = this.calculateRangeForTransform(view.state, headingLine.from);
                if (!range)
                    continue;
                const tasksNum = this.extractTasksFromRange(range, view.state, false);
                if (tasksNum.total === 0)
                    continue;
                let startDeco = Decoration.widget({
                    widget: new TaskProgressBarWidget(app, plugin, view, headingLine.to, headingLine.to, tasksNum.completed, tasksNum.total, tasksNum.inProgress || 0, tasksNum.abandoned || 0, tasksNum.notStarted || 0, tasksNum.planned || 0),
                });
                decorations.push(startDeco.range(headingLine.to, headingLine.to));
            }
        }
        /**
         * Process bullet matches and add decorations
         */
        processBullets(cursor, decorations, view) {
            var _a;
            while (!cursor.next().done) {
                let { from } = cursor.value;
                const linePos = (_a = view.state.doc.lineAt(from)) === null || _a === void 0 ? void 0 : _a.from;
                if (!this.isPositionEnabledByHeading(view.state, linePos)) {
                    continue;
                }
                // Don't parse any tasks in code blocks or frontmatter
                const syntaxNode = syntaxTree(view.state).resolveInner(linePos + 1);
                const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
                const excludedSection = [
                    "hmd-codeblock",
                    "hmd-frontmatter",
                ].find((token) => nodeProps === null || nodeProps === void 0 ? void 0 : nodeProps.split(" ").includes(token));
                if (excludedSection)
                    continue;
                const line = view.state.doc.lineAt(linePos);
                // Check if line is a task
                const lineText = this.getDocumentText(view.state.doc, line.from, line.to);
                // [CustomGoalFeature] Extract the task text and check for goal information
                const customGoal = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.allowCustomProgressGoal)
                    ? extractTaskAndGoalInfo(lineText)
                    : null;
                if (!lineText ||
                    !/^[\s|\t]*([-*+]|\d+\.)\s\[(.)\]/.test(lineText)) {
                    continue;
                }
                const range = this.calculateRangeForTransform(view.state, line.to);
                if (!range)
                    continue;
                const rangeText = this.getDocumentText(view.state.doc, range.from, range.to);
                if (!rangeText || rangeText.length === 1)
                    continue;
                const tasksNum = this.extractTasksFromRange(range, view.state, true, customGoal);
                if (tasksNum.total === 0)
                    continue;
                let startDeco = Decoration.widget({
                    widget: new TaskProgressBarWidget(app, plugin, view, line.to, line.to, tasksNum.completed, tasksNum.total, tasksNum.inProgress || 0, tasksNum.abandoned || 0, tasksNum.notStarted || 0, tasksNum.planned || 0),
                    side: 1,
                });
                decorations.push(startDeco.range(line.to, line.to));
            }
        }
        /**
         * Process non-task bullet matches and add decorations
         * This handles regular list items (not tasks) that have child tasks
         * For non-task bullets, we still calculate progress based on child tasks
         * and add a progress bar widget to show completion status
         */
        processNonTaskBullets(cursor, decorations, view) {
            var _a;
            while (!cursor.next().done) {
                let { from } = cursor.value;
                const linePos = (_a = view.state.doc.lineAt(from)) === null || _a === void 0 ? void 0 : _a.from;
                if (!this.isPositionEnabledByHeading(view.state, linePos)) {
                    continue;
                }
                // Don't parse any bullets in code blocks or frontmatter
                const syntaxNode = syntaxTree(view.state).resolveInner(linePos + 1);
                const nodeProps = syntaxNode.type.prop(tokenClassNodeProp);
                const excludedSection = [
                    "hmd-codeblock",
                    "hmd-frontmatter",
                ].find((token) => nodeProps === null || nodeProps === void 0 ? void 0 : nodeProps.split(" ").includes(token));
                if (excludedSection)
                    continue;
                const line = view.state.doc.lineAt(linePos);
                // Get the complete line text
                const lineText = this.getDocumentText(view.state.doc, line.from, line.to);
                if (!lineText)
                    continue;
                const range = this.calculateRangeForTransform(view.state, line.to);
                if (!range)
                    continue;
                const rangeText = this.getDocumentText(view.state.doc, range.from, range.to);
                if (!rangeText || rangeText.length === 1)
                    continue;
                const tasksNum = this.extractTasksFromRange(range, view.state, true);
                if (tasksNum.total === 0)
                    continue;
                let startDeco = Decoration.widget({
                    widget: new TaskProgressBarWidget(app, plugin, view, line.to, line.to, tasksNum.completed, tasksNum.total, tasksNum.inProgress || 0, tasksNum.abandoned || 0, tasksNum.notStarted || 0, tasksNum.planned || 0),
                    side: 1,
                });
                decorations.push(startDeco.range(line.to, line.to));
            }
        }
        /**
         * Extract tasks count from a document range
         */
        extractTasksFromRange(range, state, isBullet, customGoal // [CustomGoalFeature]
        ) {
            const textArray = this.getDocumentTextArray(state.doc, range.from, range.to);
            return this.calculateTasksNum(textArray, isBullet, customGoal);
        }
        /**
         * Safely extract text from a document range
         */
        getDocumentText(doc, from, to) {
            try {
                return doc.sliceString(from, to);
            }
            catch (e) {
                console.error("Error getting document text:", e);
                return null;
            }
        }
        /**
         * Get an array of text lines from a document range
         */
        getDocumentTextArray(doc, from, to) {
            const text = this.getDocumentText(doc, from, to);
            if (!text)
                return [];
            return text.split("\n");
        }
        /**
         * Calculate the foldable range for a position
         */
        calculateRangeForTransform(state, pos) {
            const line = state.doc.lineAt(pos);
            const foldRange = foldable(state, line.from, line.to);
            if (!foldRange) {
                return null;
            }
            return { from: line.from, to: foldRange.to };
        }
        /**
         * Create regex for counting total tasks
         */
        createTotalTaskRegex(isHeading, level = 0, tabSize = 4) {
            // Check if we're using only specific marks for counting
            if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.useOnlyCountMarks) {
                const onlyCountMarks = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.onlyCountTaskMarks) || "";
                // If onlyCountMarks is empty, return a regex that won't match anything
                if (!onlyCountMarks.trim()) {
                    return new RegExp("^$"); // This won't match any tasks
                }
                // Include the specified marks and space (for not started tasks)
                const markPattern = `\\[([ ${onlyCountMarks}])\\]`;
                if (isHeading) {
                    // For headings, we'll still match any task format, but filter by indentation level later
                    return new RegExp(`^[\\t|\\s]*([-*+]|\\d+\\.)\\s${markPattern}`);
                }
                else {
                    // If counting sublevels, use a more relaxed regex that matches any indentation
                    if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel) {
                        return new RegExp(`^[\\t|\\s]*?([-*+]|\\d+\\.)\\s${markPattern}`);
                    }
                    else {
                        // When not counting sublevels, we'll check the actual indentation level separately
                        // So the regex should match tasks at any indentation level
                        return new RegExp(`^[\\t|\\s]*([-*+]|\\d+\\.)\\s${markPattern}`);
                    }
                }
            }
            // Get excluded task marks
            const excludePattern = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.excludeTaskMarks) || "";
            // Build the task marker pattern
            let markPattern = "\\[(.)\\]";
            // If there are excluded marks, modify the pattern
            if (excludePattern && excludePattern.length > 0) {
                // Build a pattern that doesn't match excluded marks
                const excludeChars = excludePattern
                    .split("")
                    .map((c) => "\\" + c)
                    .join("");
                markPattern = `\\[([^${excludeChars}])\\]`;
            }
            if (isHeading) {
                // For headings, we'll still match any task format, but filter by indentation level later
                return new RegExp(`^[\\t|\\s]*([-*+]|\\d+\\.)\\s${markPattern}`);
            }
            else {
                // If counting sublevels, use a more relaxed regex
                if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel) {
                    return new RegExp(`^[\\t|\\s]*?([-*+]|\\d+\\.)\\s${markPattern}`);
                }
                else {
                    // When not counting sublevels, we'll check the actual indentation level separately
                    // So the regex should match tasks at any indentation level
                    return new RegExp(`^[\\t|\\s]*([-*+]|\\d+\\.)\\s${markPattern}`);
                }
            }
        }
        /**
         * Create regex for matching completed tasks
         */
        createCompletedTaskRegex(plugin, isHeading, level = 0, tabSize = 4) {
            var _a;
            // Extract settings
            const useOnlyCountMarks = plugin === null || plugin === void 0 ? void 0 : plugin.settings.useOnlyCountMarks;
            const onlyCountPattern = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.onlyCountTaskMarks) || "x|X";
            // If onlyCountMarks is enabled but the pattern is empty, return a regex that won't match anything
            if (useOnlyCountMarks && !onlyCountPattern.trim()) {
                return new RegExp("^$"); // This won't match any tasks
            }
            const excludePattern = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.excludeTaskMarks) || "";
            const completedMarks = ((_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) || "x|X";
            // Default patterns - adjust for sublevel counting
            const basePattern = isHeading
                ? "^[\\t|\\s]*" // For headings, match any indentation (will be filtered later)
                : (plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel)
                    ? "^[\\t|\\s]*?" // For sublevel counting, use non-greedy match for any indentation
                    : "^[\\t|\\s]*"; // For no sublevel counting, still match any indentation level
            const bulletPrefix = isHeading
                ? "([-*+]|\\d+\\.)\\s" // For headings, just match the bullet
                : (plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel)
                    ? "([-*+]|\\d+\\.)\\s" // Simplified prefix for sublevel counting
                    : "([-*+]|\\d+\\.)\\s"; // For no sublevel counting, just match the bullet
            // If "only count specific marks" is enabled
            if (useOnlyCountMarks) {
                return new RegExp(basePattern +
                    bulletPrefix +
                    "\\[(" +
                    onlyCountPattern +
                    ")\\]");
            }
            // When using the completed task marks
            if (excludePattern) {
                // Filter completed marks based on exclusions
                const completedMarksArray = completedMarks.split("|");
                const excludeMarksArray = excludePattern.split("");
                const filteredMarks = completedMarksArray
                    .filter((mark) => !excludeMarksArray.includes(mark))
                    .join("|");
                return new RegExp(basePattern +
                    bulletPrefix +
                    "\\[(" +
                    filteredMarks +
                    ")\\]");
            }
            else {
                return new RegExp(basePattern +
                    bulletPrefix +
                    "\\[(" +
                    completedMarks +
                    ")\\]");
            }
        }
        /**
         * Check if a task should be counted as completed
         */
        isCompletedTask(text) {
            var _a, _b;
            const markMatch = text.match(/\[(.)]/);
            if (!markMatch || !markMatch[1]) {
                return false;
            }
            const mark = markMatch[1];
            // Priority 1: If useOnlyCountMarks is enabled, only count tasks with specified marks
            if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.useOnlyCountMarks) {
                const onlyCountMarks = plugin === null || plugin === void 0 ? void 0 : plugin.settings.onlyCountTaskMarks.split("|");
                return onlyCountMarks.includes(mark);
            }
            // Priority 2: If the mark is in excludeTaskMarks, don't count it
            if ((plugin === null || plugin === void 0 ? void 0 : plugin.settings.excludeTaskMarks) &&
                plugin.settings.excludeTaskMarks.includes(mark)) {
                return false;
            }
            // Priority 3: Check against the task statuses
            // We consider a task "completed" if it has a mark from the "completed" status
            const completedMarks = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) === null || _b === void 0 ? void 0 : _b.split("|")) || [
                "x",
                "X",
            ];
            // Return true if the mark is in the completedMarks array
            return completedMarks.includes(mark);
        }
        /**
         * Get the task status of a task
         */
        getTaskStatus(text) {
            const markMatch = text.match(/\[(.)]/);
            if (!markMatch || !markMatch[1]) {
                return "notStarted";
            }
            const mark = markMatch[1];
            // Priority 1: If useOnlyCountMarks is enabled
            if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.useOnlyCountMarks) {
                const onlyCountMarks = plugin === null || plugin === void 0 ? void 0 : plugin.settings.onlyCountTaskMarks.split("|");
                if (onlyCountMarks.includes(mark)) {
                    return "completed";
                }
                else {
                    // If using onlyCountMarks and the mark is not in the list,
                    // determine which other status it belongs to
                    return this.determineNonCompletedStatus(mark);
                }
            }
            // Priority 2: If the mark is in excludeTaskMarks
            if ((plugin === null || plugin === void 0 ? void 0 : plugin.settings.excludeTaskMarks) &&
                plugin.settings.excludeTaskMarks.includes(mark)) {
                // Excluded marks are considered not started
                return "notStarted";
            }
            // Priority 3: Check against specific task statuses
            return this.determineTaskStatus(mark);
        }
        /**
         * Helper to determine the non-completed status of a task mark
         */
        determineNonCompletedStatus(mark) {
            var _a, _b, _c, _d, _e, _f;
            const inProgressMarks = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.inProgress) === null || _b === void 0 ? void 0 : _b.split("|")) || [
                "-",
                "/",
            ];
            if (inProgressMarks.includes(mark)) {
                return "inProgress";
            }
            const abandonedMarks = ((_d = (_c = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _c === void 0 ? void 0 : _c.abandoned) === null || _d === void 0 ? void 0 : _d.split("|")) || [
                ">",
            ];
            if (abandonedMarks.includes(mark)) {
                return "abandoned";
            }
            const plannedMarks = ((_f = (_e = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _e === void 0 ? void 0 : _e.planned) === null || _f === void 0 ? void 0 : _f.split("|")) || ["?"];
            if (plannedMarks.includes(mark)) {
                return "planned";
            }
            // If the mark doesn't match any specific category, use the countOtherStatusesAs setting
            return ((plugin === null || plugin === void 0 ? void 0 : plugin.settings.countOtherStatusesAs) || "notStarted");
        }
        /**
         * Helper to determine the specific status of a task mark
         */
        determineTaskStatus(mark) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const completedMarks = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _a === void 0 ? void 0 : _a.completed) === null || _b === void 0 ? void 0 : _b.split("|")) || [
                "x",
                "X",
            ];
            if (completedMarks.includes(mark)) {
                return "completed";
            }
            const inProgressMarks = ((_d = (_c = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _c === void 0 ? void 0 : _c.inProgress) === null || _d === void 0 ? void 0 : _d.split("|")) || [
                "-",
                "/",
            ];
            if (inProgressMarks.includes(mark)) {
                return "inProgress";
            }
            const abandonedMarks = ((_f = (_e = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _e === void 0 ? void 0 : _e.abandoned) === null || _f === void 0 ? void 0 : _f.split("|")) || [
                ">",
            ];
            if (abandonedMarks.includes(mark)) {
                return "abandoned";
            }
            const plannedMarks = ((_h = (_g = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _g === void 0 ? void 0 : _g.planned) === null || _h === void 0 ? void 0 : _h.split("|")) || ["?"];
            if (plannedMarks.includes(mark)) {
                return "planned";
            }
            // If not matching any specific status, check if it's a not-started mark
            const notStartedMarks = ((_k = (_j = plugin === null || plugin === void 0 ? void 0 : plugin.settings.taskStatuses) === null || _j === void 0 ? void 0 : _j.notStarted) === null || _k === void 0 ? void 0 : _k.split("|")) || [
                " ",
            ];
            if (notStartedMarks.includes(mark)) {
                return "notStarted";
            }
            // If we get here, the mark doesn't match any of our defined categories
            // Use the countOtherStatusesAs setting to determine how to count it
            return ((plugin === null || plugin === void 0 ? void 0 : plugin.settings.countOtherStatusesAs) || "notStarted");
        }
        /**
         * Check if a task marker should be excluded from counting
         */
        shouldExcludeTask(text) {
            // If no exclusion settings, return false
            if (!(plugin === null || plugin === void 0 ? void 0 : plugin.settings.excludeTaskMarks) ||
                plugin.settings.excludeTaskMarks.length === 0) {
                return false;
            }
            // Check if task mark is in the exclusion list
            const taskMarkMatch = text.match(/\[(.)]/);
            if (taskMarkMatch && taskMarkMatch[1]) {
                const taskMark = taskMarkMatch[1];
                return plugin.settings.excludeTaskMarks.includes(taskMark);
            }
            return false;
        }
        /**
         * Get tab size from vault configuration
         */
        getTabSize() {
            var _a, _b, _c;
            try {
                const vaultConfig = app.vault;
                const useTab = ((_a = vaultConfig.getConfig) === null || _a === void 0 ? void 0 : _a.call(vaultConfig, "useTab")) === undefined ||
                    ((_b = vaultConfig.getConfig) === null || _b === void 0 ? void 0 : _b.call(vaultConfig, "useTab")) === true;
                const tabSize = (_c = vaultConfig.getConfig) === null || _c === void 0 ? void 0 : _c.call(vaultConfig, "tabSize");
                const numericTabSize = typeof tabSize === "number" ? tabSize : 4;
                return useTab ? numericTabSize / 4 : numericTabSize;
            }
            catch (e) {
                console.error("Error getting tab size:", e);
                return 4; // Default tab size
            }
        }
        /**
         * Check the nearest preceding heading text
         * @param state EditorState
         * @param position The current position to check
         * @returns The heading text or null
         */
        findNearestPrecedingHeadingText(state, position) {
            // 首先检查当前行是否是标题
            const currentLine = state.doc.lineAt(position);
            const currentLineText = state.doc.sliceString(currentLine.from, currentLine.to);
            // 检查当前行是否是标题格式（以 # 开头）
            if (/^#{1,6}\s+/.test(currentLineText.trim())) {
                return currentLineText.trim();
            }
            let nearestHeadingText = null;
            let nearestHeadingPos = -1;
            syntaxTree(state).iterate({
                to: position,
                enter: (nodeRef) => {
                    // Check if the node type is a heading (ATXHeading1, ATXHeading2, ...)
                    if (nodeRef.type.name.startsWith("header")) {
                        // Ensure the heading is before the current position and closer than the last found
                        if (nodeRef.from < position &&
                            nodeRef.from > nearestHeadingPos) {
                            nearestHeadingPos = nodeRef.from;
                            const line = state.doc.lineAt(nodeRef.from);
                            nearestHeadingText = state.doc
                                .sliceString(line.from, line.to)
                                .trim();
                        }
                    }
                },
            });
            return nearestHeadingText;
        }
        /**
         * Check if the position is disabled by heading
         * @param state EditorState
         * @param position The position to check (usually the start of the line)
         * @returns boolean
         */
        isPositionEnabledByHeading(state, position) {
            var _a;
            // Check if the feature is enabled and the disabled list is valid
            if (!((_a = plugin.settings.showProgressBarBasedOnHeading) === null || _a === void 0 ? void 0 : _a.trim())) {
                return true;
            }
            const headingText = this.findNearestPrecedingHeadingText(state, position);
            if (headingText &&
                plugin.settings.showProgressBarBasedOnHeading
                    .split(",")
                    .includes(headingText)) {
                return true;
            }
            return false;
        }
        calculateTasksNum(textArray, bullet, customGoalTotal // [CustomGoalFeature]
        ) {
            var _a, _b;
            if (!textArray || textArray.length === 0) {
                return {
                    completed: 0,
                    total: 0,
                    inProgress: 0,
                    abandoned: 0,
                    notStarted: 0,
                    planned: 0,
                };
            }
            // Check if the next line has the same indentation as the first line
            // If so, return zero tasks
            if (textArray.length > 1 && bullet) {
                const firstLineIndent = ((_a = textArray[0].match(/^[\s|\t]*/)) === null || _a === void 0 ? void 0 : _a[0]) || "";
                const secondLineIndent = ((_b = textArray[1].match(/^[\s|\t]*/)) === null || _b === void 0 ? void 0 : _b[0]) || "";
                if (firstLineIndent === secondLineIndent) {
                    return {
                        completed: 0,
                        total: 0,
                        inProgress: 0,
                        abandoned: 0,
                        notStarted: 0,
                        planned: 0,
                    };
                }
            }
            let completed = 0;
            let inProgress = 0;
            let abandoned = 0;
            let notStarted = 0;
            let planned = 0;
            let total = 0;
            let level = 0;
            // Get tab size from vault config
            const tabSize = this.getTabSize();
            // For debugging - collect task marks and their statuses
            const taskDebug = [];
            // Determine indentation level for bullets
            if (!(plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel) && bullet && textArray[0]) {
                const indentMatch = textArray[0].match(/^[\s|\t]*/);
                if (indentMatch) {
                    level = indentMatch[0].length / tabSize;
                }
            }
            // Create regexes based on settings and context
            const bulletTotalRegex = this.createTotalTaskRegex(false, level, tabSize);
            const headingTotalRegex = this.createTotalTaskRegex(true);
            // [CustomGoalFeature] - Check to use custom goal
            const useTaskGoal = (plugin === null || plugin === void 0 ? void 0 : plugin.settings.allowCustomProgressGoal) &&
                customGoalTotal !== null;
            // Count tasks
            for (let i = 0; i < textArray.length; i++) {
                if (i === 0)
                    continue; // Skip the first line
                if (bullet) {
                    const lineText = textArray[i];
                    const lineTextTrimmed = lineText.trim();
                    // If countSubLevel is false, check the indentation level directly
                    if (!(plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel)) {
                        const indentMatch = lineText.match(/^[\s|\t]*/);
                        const lineLevel = indentMatch
                            ? indentMatch[0].length / tabSize
                            : 0;
                        // Only count this task if it's exactly one level deeper
                        if (lineLevel !== level + 1) {
                            continue;
                        }
                    }
                    // First check if it matches task format, then check if it should be excluded
                    if (lineTextTrimmed &&
                        lineText.match(bulletTotalRegex) &&
                        !this.shouldExcludeTask(lineTextTrimmed)) {
                        total++;
                        // Get the task status
                        const status = this.getTaskStatus(lineTextTrimmed);
                        // Extract the mark for debugging
                        const markMatch = lineTextTrimmed.match(/\[(.)]/);
                        if (markMatch && markMatch[1]) {
                            taskDebug.push({
                                mark: markMatch[1],
                                status: status,
                                lineText: lineTextTrimmed,
                            });
                        }
                        const taskGoal = extractTaskAndGoalInfo(lineTextTrimmed); // Check for task-specific goal [CustomGoalFeature]
                        // Count based on status
                        if (status === "completed") {
                            if (!useTaskGoal)
                                completed++;
                            if (useTaskGoal && taskGoal !== null)
                                completed += taskGoal;
                        }
                        else if (status === "inProgress") {
                            if (!useTaskGoal)
                                inProgress++;
                            if (useTaskGoal && taskGoal !== null)
                                inProgress += taskGoal;
                        }
                        else if (status === "abandoned") {
                            if (!useTaskGoal)
                                abandoned++;
                            if (useTaskGoal && taskGoal !== null)
                                abandoned += taskGoal;
                        }
                        else if (status === "planned") {
                            if (!useTaskGoal)
                                planned++;
                            if (useTaskGoal && taskGoal !== null)
                                planned += taskGoal;
                        }
                        else if (status === "notStarted") {
                            if (!useTaskGoal)
                                notStarted++;
                            if (useTaskGoal && taskGoal !== null)
                                notStarted += taskGoal;
                        }
                    }
                }
                else if (plugin === null || plugin === void 0 ? void 0 : plugin.settings.addTaskProgressBarToHeading) {
                    const lineText = textArray[i];
                    const lineTextTrimmed = lineText.trim();
                    // For headings, if countSubLevel is false, only count top-level tasks (no indentation)
                    if (!(plugin === null || plugin === void 0 ? void 0 : plugin.settings.countSubLevel)) {
                        const indentMatch = lineText.match(/^[\s|\t]*/);
                        const lineLevel = indentMatch
                            ? indentMatch[0].length / tabSize
                            : 0;
                        // For headings, only count tasks with no indentation when countSubLevel is false
                        if (lineLevel !== 0) {
                            continue;
                        }
                    }
                    // Also use shouldExcludeTask for additional validation
                    if (lineTextTrimmed &&
                        lineText.match(headingTotalRegex) &&
                        !this.shouldExcludeTask(lineTextTrimmed)) {
                        total++;
                        // Get the task status
                        const status = this.getTaskStatus(lineTextTrimmed);
                        // Extract the mark for debugging
                        const markMatch = lineTextTrimmed.match(/\[(.)]/);
                        if (markMatch && markMatch[1]) {
                            taskDebug.push({
                                mark: markMatch[1],
                                status: status,
                                lineText: lineTextTrimmed,
                            });
                        }
                        // Count based on status
                        if (status === "completed") {
                            completed++;
                        }
                        else if (status === "inProgress") {
                            inProgress++;
                        }
                        else if (status === "abandoned") {
                            abandoned++;
                        }
                        else if (status === "planned") {
                            planned++;
                        }
                        else if (status === "notStarted") {
                            notStarted++;
                        }
                    }
                }
            }
            // [CustomGoalFeature] - Check bullet to skip when the progress is in heading. Implement in the future
            if (useTaskGoal && bullet)
                total = customGoalTotal || 0;
            // Ensure counts don't exceed total
            completed = Math.min(completed, total);
            inProgress = Math.min(inProgress, total - completed);
            abandoned = Math.min(abandoned, total - completed - inProgress);
            planned = Math.min(planned, total - completed - inProgress - abandoned);
            notStarted =
                total - completed - inProgress - abandoned - planned;
            return {
                completed,
                total,
                inProgress,
                abandoned,
                notStarted,
                planned,
            };
        }
    }, {
        provide: (plugin) => [
            EditorView.decorations.of((v) => { var _a; return ((_a = v.plugin(plugin)) === null || _a === void 0 ? void 0 : _a.progressDecorations) || Decoration.none; }),
        ],
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MtYmFyLXdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2dyZXNzLWJhci13aWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUNOLFVBQVUsRUFFVixVQUFVLEVBQ1YsVUFBVSxFQUVWLFVBQVUsR0FDVixNQUFNLGtCQUFrQixDQUFDO0FBSTFCLHFFQUFxRTtBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxTQUFTLENBQUM7QUFDN0QsT0FBTyw4QkFBOEIsQ0FBQztBQUN0QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQThCN0Q7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsa0JBQWtCLENBQ2pDLElBQWtCLEVBQ2xCLE1BQTZCO0lBRTdCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRTNCLHdCQUF3QjtJQUN4QixNQUFNLG1CQUFtQixHQUN4QixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3pELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFVBQVU7UUFDM0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHO1FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxNQUFNLG1CQUFt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QUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQztZQUNyRCxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxHQUFHLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQztZQUNoRSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FDakIsT0FBTyxFQUNQLEtBQUssR0FBRyxTQUFTLEdBQUcsVUFBVSxHQUFHLFNBQVMsQ0FDMUMsQ0FBQztZQUNGLFVBQVU7Z0JBQ1QsS0FBSyxHQUFHLFNBQVMsR0FBRyxVQUFVLEdBQUcsU0FBUyxHQUFHLE9BQU8sQ0FBQztZQUV0RCxPQUFPO2dCQUNOLFNBQVM7Z0JBQ1QsS0FBSztnQkFDTCxVQUFVO2dCQUNWLFNBQVM7Z0JBQ1QsVUFBVTtnQkFDVixPQUFPO2FBQ1AsQ0FBQztRQUNILENBQUM7S0FDRCxFQUNEO1FBQ0MsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNwQixVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FDeEIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUNMLE9BQUEsQ0FBQSxNQUFBLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLDBDQUFFLG1CQUFtQixLQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUEsRUFBQSxDQUN6RDtTQUNEO0tBQ0QsQ0FDRCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XHJcblx0RGVjb3JhdGlvbixcclxuXHREZWNvcmF0aW9uU2V0LFxyXG5cdEVkaXRvclZpZXcsXHJcblx0Vmlld1BsdWdpbixcclxuXHRWaWV3VXBkYXRlLFxyXG5cdFdpZGdldFR5cGUsXHJcbn0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgU2VhcmNoQ3Vyc29yIH0gZnJvbSBcIkBjb2RlbWlycm9yL3NlYXJjaFwiO1xyXG5pbXBvcnQgeyBBcHAsIFZhdWx0IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEVkaXRvclN0YXRlLCBSYW5nZSwgVGV4dCB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG4vLyBAdHMtaWdub3JlIC0gVGhpcyBpbXBvcnQgaXMgbmVjZXNzYXJ5IGJ1dCBUeXBlU2NyaXB0IGNhbid0IGZpbmQgaXRcclxuaW1wb3J0IHsgZm9sZGFibGUsIHN5bnRheFRyZWUsIHRva2VuQ2xhc3NOb2RlUHJvcCB9IGZyb20gXCJAY29kZW1pcnJvci9sYW5ndWFnZVwiO1xyXG5pbXBvcnQgeyBSZWdFeHBDdXJzb3IgfSBmcm9tIFwiQC9lZGl0b3ItZXh0ZW5zaW9ucy9jb3JlL3JlZ2V4LWN1cnNvclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IHNob3VsZEhpZGVQcm9ncmVzc0JhckluTGl2ZVByaXZpZXcgfSBmcm9tIFwiQC91dGlsc1wiO1xyXG5pbXBvcnQgXCIuLi8uLi9zdHlsZXMvcHJvZ3Jlc3NiYXIuY3NzXCI7XHJcbmltcG9ydCB7IGV4dHJhY3RUYXNrQW5kR29hbEluZm8gfSBmcm9tIFwiQC9jb3JlL2dvYWwvZWRpdC1tb2RlXCI7XHJcbmltcG9ydCB7IHNob3dQb3BvdmVyV2l0aFByb2dyZXNzQmFyIH0gZnJvbSBcIkAvY29tcG9uZW50cy91aVwiO1xyXG5cclxuaW50ZXJmYWNlIFRhc2tzIHtcclxuXHRjb21wbGV0ZWQ6IG51bWJlcjtcclxuXHR0b3RhbDogbnVtYmVyO1xyXG5cdGluUHJvZ3Jlc3M/OiBudW1iZXI7XHJcblx0YWJhbmRvbmVkPzogbnVtYmVyO1xyXG5cdG5vdFN0YXJ0ZWQ/OiBudW1iZXI7XHJcblx0cGxhbm5lZD86IG51bWJlcjtcclxufVxyXG5cclxuLy8gVHlwZSB0byByZXByZXNlbnQgYSB0ZXh0IHJhbmdlIGZvciBzYWZlIGFjY2Vzc1xyXG5pbnRlcmZhY2UgVGV4dFJhbmdlIHtcclxuXHRmcm9tOiBudW1iZXI7XHJcblx0dG86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIVE1MRWxlbWVudFdpdGhWaWV3IGV4dGVuZHMgSFRNTEVsZW1lbnQge1xyXG5cdHZpZXc6IEVkaXRvclZpZXc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3Jlc3NEYXRhIHtcclxuXHRjb21wbGV0ZWQ6IG51bWJlcjtcclxuXHR0b3RhbDogbnVtYmVyO1xyXG5cdGluUHJvZ3Jlc3M/OiBudW1iZXI7XHJcblx0YWJhbmRvbmVkPzogbnVtYmVyO1xyXG5cdG5vdFN0YXJ0ZWQ/OiBudW1iZXI7XHJcblx0cGxhbm5lZD86IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvcm1hdCB0aGUgcHJvZ3Jlc3MgdGV4dCBhY2NvcmRpbmcgdG8gc2V0dGluZ3MgYW5kIGRhdGFcclxuICogU3VwcG9ydHMgdmFyaW91cyBkaXNwbGF5IG1vZGVzIGluY2x1ZGluZyBmcmFjdGlvbiwgcGVyY2VudGFnZSwgYW5kIGN1c3RvbSBmb3JtYXRzXHJcbiAqXHJcbiAqIFRoaXMgZnVuY3Rpb24gaXMgZXhwb3J0ZWQgZm9yIHVzZSBpbiB0aGUgc2V0dGluZ3MgVUkgZm9yIHByZXZpZXdzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0UHJvZ3Jlc3NUZXh0KFxyXG5cdGRhdGE6IFByb2dyZXNzRGF0YSxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pOiBzdHJpbmcge1xyXG5cdGlmICghZGF0YS50b3RhbCkgcmV0dXJuIFwiXCI7XHJcblxyXG5cdC8vIENhbGN1bGF0ZSBwZXJjZW50YWdlc1xyXG5cdGNvbnN0IGNvbXBsZXRlZFBlcmNlbnRhZ2UgPVxyXG5cdFx0TWF0aC5yb3VuZCgoZGF0YS5jb21wbGV0ZWQgLyBkYXRhLnRvdGFsKSAqIDEwMDAwKSAvIDEwMDtcclxuXHRjb25zdCBpblByb2dyZXNzUGVyY2VudGFnZSA9IGRhdGEuaW5Qcm9ncmVzc1xyXG5cdFx0PyBNYXRoLnJvdW5kKChkYXRhLmluUHJvZ3Jlc3MgLyBkYXRhLnRvdGFsKSAqIDEwMDAwKSAvIDEwMFxyXG5cdFx0OiAwO1xyXG5cdGNvbnN0IGFiYW5kb25lZFBlcmNlbnRhZ2UgPSBkYXRhLmFiYW5kb25lZFxyXG5cdFx0PyBNYXRoLnJvdW5kKChkYXRhLmFiYW5kb25lZCAvIGRhdGEudG90YWwpICogMTAwMDApIC8gMTAwXHJcblx0XHQ6IDA7XHJcblx0Y29uc3QgcGxhbm5lZFBlcmNlbnRhZ2UgPSBkYXRhLnBsYW5uZWRcclxuXHRcdD8gTWF0aC5yb3VuZCgoZGF0YS5wbGFubmVkIC8gZGF0YS50b3RhbCkgKiAxMDAwMCkgLyAxMDBcclxuXHRcdDogMDtcclxuXHJcblx0Ly8gQ3JlYXRlIGEgZnVsbCBkYXRhIG9iamVjdCB3aXRoIHBlcmNlbnRhZ2VzIGZvciBleHByZXNzaW9uIGV2YWx1YXRpb25cclxuXHRjb25zdCBmdWxsRGF0YSA9IHtcclxuXHRcdC4uLmRhdGEsXHJcblx0XHRwZXJjZW50YWdlczoge1xyXG5cdFx0XHRjb21wbGV0ZWQ6IGNvbXBsZXRlZFBlcmNlbnRhZ2UsXHJcblx0XHRcdGluUHJvZ3Jlc3M6IGluUHJvZ3Jlc3NQZXJjZW50YWdlLFxyXG5cdFx0XHRhYmFuZG9uZWQ6IGFiYW5kb25lZFBlcmNlbnRhZ2UsXHJcblx0XHRcdHBsYW5uZWQ6IHBsYW5uZWRQZXJjZW50YWdlLFxyXG5cdFx0XHRub3RTdGFydGVkOiBkYXRhLm5vdFN0YXJ0ZWRcclxuXHRcdFx0XHQ/IE1hdGgucm91bmQoKGRhdGEubm90U3RhcnRlZCAvIGRhdGEudG90YWwpICogMTAwMDApIC8gMTAwXHJcblx0XHRcdFx0OiAwLFxyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHQvLyBHZXQgc3RhdHVzIHN5bWJvbHNcclxuXHRjb25zdCBjb21wbGV0ZWRTeW1ib2wgPSBcIuKck1wiO1xyXG5cdGNvbnN0IGluUHJvZ3Jlc3NTeW1ib2wgPSBcIuKfs1wiO1xyXG5cdGNvbnN0IGFiYW5kb25lZFN5bWJvbCA9IFwi4pyXXCI7XHJcblx0Y29uc3QgcGxhbm5lZFN5bWJvbCA9IFwiP1wiO1xyXG5cclxuXHQvLyBHZXQgZGlzcGxheSBtb2RlIGZyb20gc2V0dGluZ3MsIHdpdGggZmFsbGJhY2tzIGZvciBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxyXG5cdGNvbnN0IGRpc3BsYXlNb2RlID1cclxuXHRcdHBsdWdpbj8uc2V0dGluZ3MuZGlzcGxheU1vZGUgfHxcclxuXHRcdChwbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwidGV4dFwiIHx8XHJcblx0XHRwbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwiYm90aFwiXHJcblx0XHRcdD8gcGx1Z2luPy5zZXR0aW5ncy5zaG93UGVyY2VudGFnZVxyXG5cdFx0XHRcdD8gXCJwZXJjZW50YWdlXCJcclxuXHRcdFx0XHQ6IFwiYnJhY2tldEZyYWN0aW9uXCJcclxuXHRcdFx0OiBcImJyYWNrZXRGcmFjdGlvblwiKTtcclxuXHJcblx0Ly8gUHJvY2VzcyB0ZXh0IHdpdGggdGVtcGxhdGUgZm9ybWF0dGluZ1xyXG5cdGxldCByZXN1bHRUZXh0ID0gXCJcIjtcclxuXHJcblx0Ly8gSGFuZGxlIGRpZmZlcmVudCBkaXNwbGF5IG1vZGVzXHJcblx0c3dpdGNoIChkaXNwbGF5TW9kZSkge1xyXG5cdFx0Y2FzZSBcInBlcmNlbnRhZ2VcIjpcclxuXHRcdFx0Ly8gU2ltcGxlIHBlcmNlbnRhZ2UgKGUuZy4sIFwiNzUlXCIpXHJcblx0XHRcdHJlc3VsdFRleHQgPSBgJHtjb21wbGV0ZWRQZXJjZW50YWdlfSVgO1xyXG5cdFx0XHRicmVhaztcclxuXHJcblx0XHRjYXNlIFwiYnJhY2tldFBlcmNlbnRhZ2VcIjpcclxuXHRcdFx0Ly8gUGVyY2VudGFnZSB3aXRoIGJyYWNrZXRzIChlLmcuLCBcIls3NSVdXCIpXHJcblx0XHRcdHJlc3VsdFRleHQgPSBgWyR7Y29tcGxldGVkUGVyY2VudGFnZX0lXWA7XHJcblx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdGNhc2UgXCJmcmFjdGlvblwiOlxyXG5cdFx0XHQvLyBTaW1wbGUgZnJhY3Rpb24gKGUuZy4sIFwiMy80XCIpXHJcblx0XHRcdHJlc3VsdFRleHQgPSBgJHtkYXRhLmNvbXBsZXRlZH0vJHtkYXRhLnRvdGFsfWA7XHJcblx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdGNhc2UgXCJicmFja2V0RnJhY3Rpb25cIjpcclxuXHRcdFx0Ly8gRnJhY3Rpb24gd2l0aCBicmFja2V0cyAoZS5nLiwgXCJbMy80XVwiKVxyXG5cdFx0XHRyZXN1bHRUZXh0ID0gYFske2RhdGEuY29tcGxldGVkfS8ke2RhdGEudG90YWx9XWA7XHJcblx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdGNhc2UgXCJkZXRhaWxlZFwiOlxyXG5cdFx0XHQvLyBEZXRhaWxlZCBmb3JtYXQgc2hvd2luZyBhbGwgdGFzayBzdGF0dXNlc1xyXG5cdFx0XHRyZXN1bHRUZXh0ID0gYFske2RhdGEuY29tcGxldGVkfSR7Y29tcGxldGVkU3ltYm9sfSAke1xyXG5cdFx0XHRcdGRhdGEuaW5Qcm9ncmVzcyB8fCAwXHJcblx0XHRcdH0ke2luUHJvZ3Jlc3NTeW1ib2x9ICR7ZGF0YS5hYmFuZG9uZWQgfHwgMH0ke2FiYW5kb25lZFN5bWJvbH0gJHtcclxuXHRcdFx0XHRkYXRhLnBsYW5uZWQgfHwgMFxyXG5cdFx0XHR9JHtwbGFubmVkU3ltYm9sfSAvICR7ZGF0YS50b3RhbH1dYDtcclxuXHRcdFx0YnJlYWs7XHJcblxyXG5cdFx0Y2FzZSBcImN1c3RvbVwiOlxyXG5cdFx0XHQvLyBIYW5kbGUgY3VzdG9tIGZvcm1hdCBpZiBhdmFpbGFibGUgaW4gc2V0dGluZ3NcclxuXHRcdFx0aWYgKHBsdWdpbj8uc2V0dGluZ3MuY3VzdG9tRm9ybWF0KSB7XHJcblx0XHRcdFx0cmVzdWx0VGV4dCA9IHBsdWdpbi5zZXR0aW5ncy5jdXN0b21Gb3JtYXRcclxuXHRcdFx0XHRcdC5yZXBsYWNlKC97e0NPTVBMRVRFRH19L2csIGRhdGEuY29tcGxldGVkLnRvU3RyaW5nKCkpXHJcblx0XHRcdFx0XHQucmVwbGFjZSgve3tUT1RBTH19L2csIGRhdGEudG90YWwudG9TdHJpbmcoKSlcclxuXHRcdFx0XHRcdC5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHQve3tJTl9QUk9HUkVTU319L2csXHJcblx0XHRcdFx0XHRcdChkYXRhLmluUHJvZ3Jlc3MgfHwgMCkudG9TdHJpbmcoKVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoL3t7QUJBTkRPTkVEfX0vZywgKGRhdGEuYWJhbmRvbmVkIHx8IDApLnRvU3RyaW5nKCkpXHJcblx0XHRcdFx0XHQucmVwbGFjZSgve3tQTEFOTkVEfX0vZywgKGRhdGEucGxhbm5lZCB8fCAwKS50b1N0cmluZygpKVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoXHJcblx0XHRcdFx0XHRcdC97e05PVF9TVEFSVEVEfX0vZyxcclxuXHRcdFx0XHRcdFx0KGRhdGEubm90U3RhcnRlZCB8fCAwKS50b1N0cmluZygpXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQucmVwbGFjZSgve3tQRVJDRU5UfX0vZywgY29tcGxldGVkUGVyY2VudGFnZS50b1N0cmluZygpKVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoL3t7UFJPR1JFU1N9fS9nLCBjb21wbGV0ZWRQZXJjZW50YWdlLnRvU3RyaW5nKCkpXHJcblx0XHRcdFx0XHQucmVwbGFjZShcclxuXHRcdFx0XHRcdFx0L3t7UEVSQ0VOVF9JTl9QUk9HUkVTU319L2csXHJcblx0XHRcdFx0XHRcdGluUHJvZ3Jlc3NQZXJjZW50YWdlLnRvU3RyaW5nKClcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHQve3tQRVJDRU5UX0FCQU5ET05FRH19L2csXHJcblx0XHRcdFx0XHRcdGFiYW5kb25lZFBlcmNlbnRhZ2UudG9TdHJpbmcoKVxyXG5cdFx0XHRcdFx0KVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoXHJcblx0XHRcdFx0XHRcdC97e1BFUkNFTlRfUExBTk5FRH19L2csXHJcblx0XHRcdFx0XHRcdHBsYW5uZWRQZXJjZW50YWdlLnRvU3RyaW5nKClcclxuXHRcdFx0XHRcdClcclxuXHRcdFx0XHRcdC5yZXBsYWNlKC97e0NPTVBMRVRFRF9TWU1CT0x9fS9nLCBjb21wbGV0ZWRTeW1ib2wpXHJcblx0XHRcdFx0XHQucmVwbGFjZSgve3tJTl9QUk9HUkVTU19TWU1CT0x9fS9nLCBpblByb2dyZXNzU3ltYm9sKVxyXG5cdFx0XHRcdFx0LnJlcGxhY2UoL3t7QUJBTkRPTkVEX1NZTUJPTH19L2csIGFiYW5kb25lZFN5bWJvbClcclxuXHRcdFx0XHRcdC5yZXBsYWNlKC97e1BMQU5ORURfU1lNQk9MfX0vZywgcGxhbm5lZFN5bWJvbCk7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmVzdWx0VGV4dCA9IGBbJHtkYXRhLmNvbXBsZXRlZH0vJHtkYXRhLnRvdGFsfV1gO1xyXG5cdFx0XHR9XHJcblx0XHRcdGJyZWFrO1xyXG5cclxuXHRcdGNhc2UgXCJyYW5nZS1iYXNlZFwiOlxyXG5cdFx0XHQvLyBDaGVjayBpZiBjdXN0b20gcHJvZ3Jlc3MgcmFuZ2VzIGFyZSBlbmFibGVkXHJcblx0XHRcdGlmIChwbHVnaW4/LnNldHRpbmdzLmN1c3RvbWl6ZVByb2dyZXNzUmFuZ2VzKSB7XHJcblx0XHRcdFx0Ly8gRmluZCBhIG1hdGNoaW5nIHJhbmdlIGZvciB0aGUgY3VycmVudCBwZXJjZW50YWdlXHJcblx0XHRcdFx0Y29uc3QgbWF0Y2hpbmdSYW5nZSA9IHBsdWdpbi5zZXR0aW5ncy5wcm9ncmVzc1Jhbmdlcy5maW5kKFxyXG5cdFx0XHRcdFx0KHJhbmdlKSA9PlxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlID49IHJhbmdlLm1pbiAmJlxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlIDw9IHJhbmdlLm1heFxyXG5cdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdC8vIElmIGEgbWF0Y2hpbmcgcmFuZ2UgaXMgZm91bmQsIHVzZSBpdHMgY3VzdG9tIHRleHRcclxuXHRcdFx0XHRpZiAobWF0Y2hpbmdSYW5nZSkge1xyXG5cdFx0XHRcdFx0cmVzdWx0VGV4dCA9IG1hdGNoaW5nUmFuZ2UudGV4dC5yZXBsYWNlKFxyXG5cdFx0XHRcdFx0XHRcInt7UFJPR1JFU1N9fVwiLFxyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlLnRvU3RyaW5nKClcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJlc3VsdFRleHQgPSBgJHtjb21wbGV0ZWRQZXJjZW50YWdlfSVgO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRyZXN1bHRUZXh0ID0gYCR7Y29tcGxldGVkUGVyY2VudGFnZX0lYDtcclxuXHRcdFx0fVxyXG5cdFx0XHRicmVhaztcclxuXHJcblx0XHRkZWZhdWx0OlxyXG5cdFx0XHQvLyBMZWdhY3kgYmVoYXZpb3IgZm9yIGNvbXBhdGliaWxpdHlcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJ0ZXh0XCIgfHxcclxuXHRcdFx0XHRwbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwiYm90aFwiXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdC8vIElmIHVzaW5nIHRleHQgbW9kZSwgY2hlY2sgaWYgcGVyY2VudGFnZSBpcyBwcmVmZXJyZWRcclxuXHRcdFx0XHRpZiAocGx1Z2luPy5zZXR0aW5ncy5zaG93UGVyY2VudGFnZSkge1xyXG5cdFx0XHRcdFx0cmVzdWx0VGV4dCA9IGAke2NvbXBsZXRlZFBlcmNlbnRhZ2V9JWA7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIFNob3cgZGV0YWlsZWQgY291bnRzIGlmIHdlIGhhdmUgaW4tcHJvZ3Jlc3MsIGFiYW5kb25lZCwgb3IgcGxhbm5lZCB0YXNrc1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHQoZGF0YS5pblByb2dyZXNzICYmIGRhdGEuaW5Qcm9ncmVzcyA+IDApIHx8XHJcblx0XHRcdFx0XHRcdChkYXRhLmFiYW5kb25lZCAmJiBkYXRhLmFiYW5kb25lZCA+IDApIHx8XHJcblx0XHRcdFx0XHRcdChkYXRhLnBsYW5uZWQgJiYgZGF0YS5wbGFubmVkID4gMClcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRyZXN1bHRUZXh0ID0gYFske2RhdGEuY29tcGxldGVkfeKckyAke1xyXG5cdFx0XHRcdFx0XHRcdGRhdGEuaW5Qcm9ncmVzcyB8fCAwXHJcblx0XHRcdFx0XHRcdH3in7MgJHtkYXRhLmFiYW5kb25lZCB8fCAwfeKclyAke2RhdGEucGxhbm5lZCB8fCAwfT8gLyAke1xyXG5cdFx0XHRcdFx0XHRcdGRhdGEudG90YWxcclxuXHRcdFx0XHRcdFx0fV1gO1xyXG5cdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0Ly8gU2ltcGxlIGZyYWN0aW9uIGZvcm1hdCB3aXRoIGJyYWNrZXRzXHJcblx0XHRcdFx0XHRcdHJlc3VsdFRleHQgPSBgWyR7ZGF0YS5jb21wbGV0ZWR9LyR7ZGF0YS50b3RhbH1dYDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0Ly8gRGVmYXVsdCB0byBicmFja2V0IGZyYWN0aW9uIGlmIG5vIHNwZWNpZmljIHRleHQgbW9kZSBpcyBzZXRcclxuXHRcdFx0XHRyZXN1bHRUZXh0ID0gYFske2RhdGEuY29tcGxldGVkfS8ke2RhdGEudG90YWx9XWA7XHJcblx0XHRcdH1cclxuXHR9XHJcblxyXG5cdC8vIFByb2Nlc3MgSmF2YVNjcmlwdCBleHByZXNzaW9ucyBlbmNsb3NlZCBpbiAkez0gfVxyXG5cdHJlc3VsdFRleHQgPSByZXN1bHRUZXh0LnJlcGxhY2UoL1xcJHs9KC4rPyl9L2csIChtYXRjaCwgZXhwcikgPT4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGEgc2FmZSBmdW5jdGlvbiB0byBldmFsdWF0ZSB0aGUgZXhwcmVzc2lvbiB3aXRoIHRoZSBkYXRhIGNvbnRleHRcclxuXHRcdFx0Y29uc3QgZXZhbEZ1bmMgPSBuZXcgRnVuY3Rpb24oXCJkYXRhXCIsIGByZXR1cm4gJHtleHByfWApO1xyXG5cdFx0XHRyZXR1cm4gZXZhbEZ1bmMoZnVsbERhdGEpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGV2YWx1YXRpbmcgZXhwcmVzc2lvbjpcIiwgZXhwciwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gbWF0Y2g7IC8vIFJldHVybiB0aGUgb3JpZ2luYWwgbWF0Y2ggb24gZXJyb3JcclxuXHRcdH1cclxuXHR9KTtcclxuXHJcblx0cmV0dXJuIHJlc3VsdFRleHQ7XHJcbn1cclxuXHJcbmNsYXNzIFRhc2tQcm9ncmVzc0JhcldpZGdldCBleHRlbmRzIFdpZGdldFR5cGUge1xyXG5cdHByb2dyZXNzQmFyRWw6IEhUTUxTcGFuRWxlbWVudDtcclxuXHRwcm9ncmVzc0JhY2tHcm91bmRFbDogSFRNTERpdkVsZW1lbnQ7XHJcblx0cHJvZ3Jlc3NFbDogSFRNTERpdkVsZW1lbnQ7XHJcblx0aW5Qcm9ncmVzc0VsOiBIVE1MRGl2RWxlbWVudDtcclxuXHRhYmFuZG9uZWRFbDogSFRNTERpdkVsZW1lbnQ7XHJcblx0cGxhbm5lZEVsOiBIVE1MRGl2RWxlbWVudDtcclxuXHRudW1iZXJFbDogSFRNTERpdkVsZW1lbnQ7XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0cmVhZG9ubHkgYXBwOiBBcHAsXHJcblx0XHRyZWFkb25seSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdHJlYWRvbmx5IHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRyZWFkb25seSBmcm9tOiBudW1iZXIsXHJcblx0XHRyZWFkb25seSB0bzogbnVtYmVyLFxyXG5cdFx0cmVhZG9ubHkgY29tcGxldGVkOiBudW1iZXIsXHJcblx0XHRyZWFkb25seSB0b3RhbDogbnVtYmVyLFxyXG5cdFx0cmVhZG9ubHkgaW5Qcm9ncmVzczogbnVtYmVyID0gMCxcclxuXHRcdHJlYWRvbmx5IGFiYW5kb25lZDogbnVtYmVyID0gMCxcclxuXHRcdHJlYWRvbmx5IG5vdFN0YXJ0ZWQ6IG51bWJlciA9IDAsXHJcblx0XHRyZWFkb25seSBwbGFubmVkOiBudW1iZXIgPSAwXHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdH1cclxuXHJcblx0ZXEob3RoZXI6IFRhc2tQcm9ncmVzc0JhcldpZGdldCkge1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0aGlzLmZyb20gPT09IG90aGVyLmZyb20gJiZcclxuXHRcdFx0dGhpcy50byA9PT0gb3RoZXIudG8gJiZcclxuXHRcdFx0dGhpcy5pblByb2dyZXNzID09PSBvdGhlci5pblByb2dyZXNzICYmXHJcblx0XHRcdHRoaXMuYWJhbmRvbmVkID09PSBvdGhlci5hYmFuZG9uZWQgJiZcclxuXHRcdFx0dGhpcy5ub3RTdGFydGVkID09PSBvdGhlci5ub3RTdGFydGVkICYmXHJcblx0XHRcdHRoaXMucGxhbm5lZCA9PT0gb3RoZXIucGxhbm5lZCAmJlxyXG5cdFx0XHR0aGlzLmNvbXBsZXRlZCA9PT0gb3RoZXIuY29tcGxldGVkICYmXHJcblx0XHRcdHRoaXMudG90YWwgPT09IG90aGVyLnRvdGFsXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gKFxyXG5cdFx0XHRvdGhlci5jb21wbGV0ZWQgPT09IHRoaXMuY29tcGxldGVkICYmXHJcblx0XHRcdG90aGVyLnRvdGFsID09PSB0aGlzLnRvdGFsICYmXHJcblx0XHRcdG90aGVyLmluUHJvZ3Jlc3MgPT09IHRoaXMuaW5Qcm9ncmVzcyAmJlxyXG5cdFx0XHRvdGhlci5hYmFuZG9uZWQgPT09IHRoaXMuYWJhbmRvbmVkICYmXHJcblx0XHRcdG90aGVyLm5vdFN0YXJ0ZWQgPT09IHRoaXMubm90U3RhcnRlZCAmJlxyXG5cdFx0XHRvdGhlci5wbGFubmVkID09PSB0aGlzLnBsYW5uZWRcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRjaGFuZ2VQZXJjZW50YWdlKCkge1xyXG5cdFx0aWYgKHRoaXMudG90YWwgPT09IDApIHJldHVybjtcclxuXHJcblx0XHRjb25zdCBjb21wbGV0ZWRQZXJjZW50YWdlID1cclxuXHRcdFx0TWF0aC5yb3VuZCgodGhpcy5jb21wbGV0ZWQgLyB0aGlzLnRvdGFsKSAqIDEwMDAwKSAvIDEwMDtcclxuXHRcdGNvbnN0IGluUHJvZ3Jlc3NQZXJjZW50YWdlID1cclxuXHRcdFx0TWF0aC5yb3VuZCgodGhpcy5pblByb2dyZXNzIC8gdGhpcy50b3RhbCkgKiAxMDAwMCkgLyAxMDA7XHJcblx0XHRjb25zdCBhYmFuZG9uZWRQZXJjZW50YWdlID1cclxuXHRcdFx0TWF0aC5yb3VuZCgodGhpcy5hYmFuZG9uZWQgLyB0aGlzLnRvdGFsKSAqIDEwMDAwKSAvIDEwMDtcclxuXHRcdGNvbnN0IHBsYW5uZWRQZXJjZW50YWdlID1cclxuXHRcdFx0TWF0aC5yb3VuZCgodGhpcy5wbGFubmVkIC8gdGhpcy50b3RhbCkgKiAxMDAwMCkgLyAxMDA7XHJcblxyXG5cdFx0Ly8gU2V0IHRoZSBjb21wbGV0ZWQgcGFydFxyXG5cdFx0dGhpcy5wcm9ncmVzc0VsLnN0eWxlLndpZHRoID0gY29tcGxldGVkUGVyY2VudGFnZSArIFwiJVwiO1xyXG5cclxuXHRcdC8vIFNldCB0aGUgaW4tcHJvZ3Jlc3MgcGFydCAoaWYgaXQgZXhpc3RzKVxyXG5cdFx0aWYgKHRoaXMuaW5Qcm9ncmVzc0VsKSB7XHJcblx0XHRcdHRoaXMuaW5Qcm9ncmVzc0VsLnN0eWxlLndpZHRoID0gaW5Qcm9ncmVzc1BlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdFx0dGhpcy5pblByb2dyZXNzRWwuc3R5bGUubGVmdCA9IGNvbXBsZXRlZFBlcmNlbnRhZ2UgKyBcIiVcIjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBTZXQgdGhlIGFiYW5kb25lZCBwYXJ0IChpZiBpdCBleGlzdHMpXHJcblx0XHRpZiAodGhpcy5hYmFuZG9uZWRFbCkge1xyXG5cdFx0XHR0aGlzLmFiYW5kb25lZEVsLnN0eWxlLndpZHRoID0gYWJhbmRvbmVkUGVyY2VudGFnZSArIFwiJVwiO1xyXG5cdFx0XHR0aGlzLmFiYW5kb25lZEVsLnN0eWxlLmxlZnQgPVxyXG5cdFx0XHRcdGNvbXBsZXRlZFBlcmNlbnRhZ2UgKyBpblByb2dyZXNzUGVyY2VudGFnZSArIFwiJVwiO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFNldCB0aGUgcGxhbm5lZCBwYXJ0IChpZiBpdCBleGlzdHMpXHJcblx0XHRpZiAodGhpcy5wbGFubmVkRWwpIHtcclxuXHRcdFx0dGhpcy5wbGFubmVkRWwuc3R5bGUud2lkdGggPSBwbGFubmVkUGVyY2VudGFnZSArIFwiJVwiO1xyXG5cdFx0XHR0aGlzLnBsYW5uZWRFbC5zdHlsZS5sZWZ0ID1cclxuXHRcdFx0XHRjb21wbGV0ZWRQZXJjZW50YWdlICtcclxuXHRcdFx0XHRpblByb2dyZXNzUGVyY2VudGFnZSArXHJcblx0XHRcdFx0YWJhbmRvbmVkUGVyY2VudGFnZSArXHJcblx0XHRcdFx0XCIlXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gVXBkYXRlIHRoZSBjbGFzcyBiYXNlZCBvbiBwcm9ncmVzcyBwZXJjZW50YWdlXHJcblx0XHQvLyBUaGlzIGFsbG93cyBmb3IgQ1NTIHN0eWxpbmcgYmFzZWQgb24gcHJvZ3Jlc3MgbGV2ZWxcclxuXHRcdGxldCBwcm9ncmVzc0NsYXNzID0gXCJwcm9ncmVzcy1iYXItaW5saW5lXCI7XHJcblxyXG5cdFx0c3dpdGNoICh0cnVlKSB7XHJcblx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA9PT0gMDpcclxuXHRcdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIHByb2dyZXNzLWJhci1pbmxpbmUtZW1wdHlcIjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID4gMCAmJiBjb21wbGV0ZWRQZXJjZW50YWdlIDwgMjU6XHJcblx0XHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBwcm9ncmVzcy1iYXItaW5saW5lLTBcIjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBjb21wbGV0ZWRQZXJjZW50YWdlID49IDI1ICYmIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPCA1MDpcclxuXHRcdFx0XHRwcm9ncmVzc0NsYXNzICs9IFwiIHByb2dyZXNzLWJhci1pbmxpbmUtMVwiO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIGNvbXBsZXRlZFBlcmNlbnRhZ2UgPj0gNTAgJiYgY29tcGxldGVkUGVyY2VudGFnZSA8IDc1OlxyXG5cdFx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgcHJvZ3Jlc3MtYmFyLWlubGluZS0yXCI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA+PSA3NSAmJiBjb21wbGV0ZWRQZXJjZW50YWdlIDwgMTAwOlxyXG5cdFx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgcHJvZ3Jlc3MtYmFyLWlubGluZS0zXCI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgY29tcGxldGVkUGVyY2VudGFnZSA+PSAxMDA6XHJcblx0XHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBwcm9ncmVzcy1iYXItaW5saW5lLWNvbXBsZXRlXCI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIGNsYXNzZXMgZm9yIHNwZWNpYWwgc3RhdGVzXHJcblx0XHRpZiAoaW5Qcm9ncmVzc1BlcmNlbnRhZ2UgPiAwKSB7XHJcblx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgaGFzLWluLXByb2dyZXNzXCI7XHJcblx0XHR9XHJcblx0XHRpZiAoYWJhbmRvbmVkUGVyY2VudGFnZSA+IDApIHtcclxuXHRcdFx0cHJvZ3Jlc3NDbGFzcyArPSBcIiBoYXMtYWJhbmRvbmVkXCI7XHJcblx0XHR9XHJcblx0XHRpZiAocGxhbm5lZFBlcmNlbnRhZ2UgPiAwKSB7XHJcblx0XHRcdHByb2dyZXNzQ2xhc3MgKz0gXCIgaGFzLXBsYW5uZWRcIjtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnByb2dyZXNzRWwuY2xhc3NOYW1lID0gcHJvZ3Jlc3NDbGFzcztcclxuXHR9XHJcblxyXG5cdGNoYW5nZU51bWJlcigpIHtcclxuXHRcdGlmIChcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwiYm90aFwiIHx8XHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcInRleHRcIlxyXG5cdFx0KSB7XHJcblx0XHRcdGxldCB0ZXh0ID0gZm9ybWF0UHJvZ3Jlc3NUZXh0KFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogdGhpcy5jb21wbGV0ZWQsXHJcblx0XHRcdFx0XHR0b3RhbDogdGhpcy50b3RhbCxcclxuXHRcdFx0XHRcdGluUHJvZ3Jlc3M6IHRoaXMuaW5Qcm9ncmVzcyxcclxuXHRcdFx0XHRcdGFiYW5kb25lZDogdGhpcy5hYmFuZG9uZWQsXHJcblx0XHRcdFx0XHRub3RTdGFydGVkOiB0aGlzLm5vdFN0YXJ0ZWQsXHJcblx0XHRcdFx0XHRwbGFubmVkOiB0aGlzLnBsYW5uZWQsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHR0aGlzLnBsdWdpblxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0aWYgKCF0aGlzLm51bWJlckVsKSB7XHJcblx0XHRcdFx0dGhpcy5udW1iZXJFbCA9IHRoaXMucHJvZ3Jlc3NCYXJFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3Mtc3RhdHVzXCIsXHJcblx0XHRcdFx0XHR0ZXh0OiB0ZXh0LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMubnVtYmVyRWwuaW5uZXJUZXh0ID0gdGV4dDtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0dG9ET00oKSB7XHJcblx0XHRpZiAoXHJcblx0XHRcdHRoaXMucGx1Z2luPy5zZXR0aW5ncy5wcm9ncmVzc0JhckRpc3BsYXlNb2RlID09PSBcImJvdGhcIiB8fFxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJ0ZXh0XCJcclxuXHRcdCkge1xyXG5cdFx0XHRpZiAodGhpcy5udW1iZXJFbCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdFx0dGhpcy5udW1iZXJFbC5kZXRhY2goKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLnByb2dyZXNzQmFyRWwgIT09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aGlzLmNoYW5nZVBlcmNlbnRhZ2UoKTtcclxuXHRcdFx0aWYgKHRoaXMubnVtYmVyRWwgIT09IHVuZGVmaW5lZCkgdGhpcy5jaGFuZ2VOdW1iZXIoKTtcclxuXHRcdFx0cmV0dXJuIHRoaXMucHJvZ3Jlc3NCYXJFbDtcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnByb2dyZXNzQmFyRWwgPSBjcmVhdGVTcGFuKFxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJib3RoXCIgfHxcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwidGV4dFwiXHJcblx0XHRcdFx0PyBcImNtLXRhc2stcHJvZ3Jlc3MtYmFyIHdpdGgtbnVtYmVyXCJcclxuXHRcdFx0XHQ6IFwiY20tdGFzay1wcm9ncmVzcy1iYXJcIixcclxuXHRcdFx0KGVsKSA9PiB7XHJcblx0XHRcdFx0ZWwuZGF0YXNldC5jb21wbGV0ZWQgPSB0aGlzLmNvbXBsZXRlZC50b1N0cmluZygpO1xyXG5cdFx0XHRcdGVsLmRhdGFzZXQudG90YWwgPSB0aGlzLnRvdGFsLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0ZWwuZGF0YXNldC5pblByb2dyZXNzID0gdGhpcy5pblByb2dyZXNzLnRvU3RyaW5nKCk7XHJcblx0XHRcdFx0ZWwuZGF0YXNldC5hYmFuZG9uZWQgPSB0aGlzLmFiYW5kb25lZC50b1N0cmluZygpO1xyXG5cdFx0XHRcdGVsLmRhdGFzZXQubm90U3RhcnRlZCA9IHRoaXMubm90U3RhcnRlZC50b1N0cmluZygpO1xyXG5cdFx0XHRcdGVsLmRhdGFzZXQucGxhbm5lZCA9IHRoaXMucGxhbm5lZC50b1N0cmluZygpO1xyXG5cclxuXHRcdFx0XHRpZiAodGhpcy5wbHVnaW4/LnNldHRpbmdzLnN1cHBvcnRIb3ZlclRvU2hvd1Byb2dyZXNzSW5mbykge1xyXG5cdFx0XHRcdFx0ZWwub25tb3VzZW92ZXIgPSAoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHNob3dQb3BvdmVyV2l0aFByb2dyZXNzQmFyKHRoaXMucGx1Z2luLCB7XHJcblx0XHRcdFx0XHRcdFx0cHJvZ3Jlc3NCYXI6IGVsLFxyXG5cdFx0XHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZDogdGhpcy5jb21wbGV0ZWQudG9TdHJpbmcoKSxcclxuXHRcdFx0XHRcdFx0XHRcdHRvdGFsOiB0aGlzLnRvdGFsLnRvU3RyaW5nKCksXHJcblx0XHRcdFx0XHRcdFx0XHRpblByb2dyZXNzOiB0aGlzLmluUHJvZ3Jlc3MudG9TdHJpbmcoKSxcclxuXHRcdFx0XHRcdFx0XHRcdGFiYW5kb25lZDogdGhpcy5hYmFuZG9uZWQudG9TdHJpbmcoKSxcclxuXHRcdFx0XHRcdFx0XHRcdG5vdFN0YXJ0ZWQ6IHRoaXMubm90U3RhcnRlZC50b1N0cmluZygpLFxyXG5cdFx0XHRcdFx0XHRcdFx0cGxhbm5lZDogdGhpcy5wbGFubmVkLnRvU3RyaW5nKCksXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHR2aWV3OiB0aGlzLnZpZXcsXHJcblx0XHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZ3JhcGhpY2FsIHByb2dyZXNzIGJhciBzaG91bGQgYmUgc2hvd25cclxuXHRcdGNvbnN0IHNob3dHcmFwaGljYWxCYXIgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJncmFwaGljYWxcIiB8fFxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJib3RoXCI7XHJcblxyXG5cdFx0aWYgKHNob3dHcmFwaGljYWxCYXIpIHtcclxuXHRcdFx0dGhpcy5wcm9ncmVzc0JhY2tHcm91bmRFbCA9IHRoaXMucHJvZ3Jlc3NCYXJFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0Y2xzOiBcInByb2dyZXNzLWJhci1pbmxpbmUtYmFja2dyb3VuZFwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBlbGVtZW50cyBmb3IgZWFjaCBzdGF0dXMgdHlwZVxyXG5cdFx0XHR0aGlzLnByb2dyZXNzRWwgPSB0aGlzLnByb2dyZXNzQmFja0dyb3VuZEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3MtYmFyLWlubGluZSBwcm9ncmVzcy1jb21wbGV0ZWRcIixcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBPbmx5IGNyZWF0ZSB0aGVzZSBlbGVtZW50cyBpZiB3ZSBoYXZlIHRhc2tzIG9mIHRoZXNlIHR5cGVzXHJcblx0XHRcdGlmICh0aGlzLmluUHJvZ3Jlc3MgPiAwKSB7XHJcblx0XHRcdFx0dGhpcy5pblByb2dyZXNzRWwgPSB0aGlzLnByb2dyZXNzQmFja0dyb3VuZEVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRcdGNsczogXCJwcm9ncmVzcy1iYXItaW5saW5lIHByb2dyZXNzLWluLXByb2dyZXNzXCIsXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICh0aGlzLmFiYW5kb25lZCA+IDApIHtcclxuXHRcdFx0XHR0aGlzLmFiYW5kb25lZEVsID0gdGhpcy5wcm9ncmVzc0JhY2tHcm91bmRFbC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3MtYmFyLWlubGluZSBwcm9ncmVzcy1hYmFuZG9uZWRcIixcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKHRoaXMucGxhbm5lZCA+IDApIHtcclxuXHRcdFx0XHR0aGlzLnBsYW5uZWRFbCA9IHRoaXMucHJvZ3Jlc3NCYWNrR3JvdW5kRWwuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdFx0Y2xzOiBcInByb2dyZXNzLWJhci1pbmxpbmUgcHJvZ3Jlc3MtcGxhbm5lZFwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR0aGlzLmNoYW5nZVBlcmNlbnRhZ2UoKTtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBDaGVjayBpZiB0ZXh0IHByb2dyZXNzIHNob3VsZCBiZSBzaG93biAoZWl0aGVyIGFzIHRoZSBvbmx5IG9wdGlvbiBvciB0b2dldGhlciB3aXRoIGdyYXBoaWMgYmFyKVxyXG5cdFx0Y29uc3Qgc2hvd1RleHQgPVxyXG5cdFx0XHR0aGlzLnBsdWdpbj8uc2V0dGluZ3MucHJvZ3Jlc3NCYXJEaXNwbGF5TW9kZSA9PT0gXCJ0ZXh0XCIgfHxcclxuXHRcdFx0dGhpcy5wbHVnaW4/LnNldHRpbmdzLnByb2dyZXNzQmFyRGlzcGxheU1vZGUgPT09IFwiYm90aFwiO1xyXG5cclxuXHRcdGlmIChzaG93VGV4dCAmJiB0aGlzLnRvdGFsKSB7XHJcblx0XHRcdGNvbnN0IHRleHQgPSBmb3JtYXRQcm9ncmVzc1RleHQoXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiB0aGlzLmNvbXBsZXRlZCxcclxuXHRcdFx0XHRcdHRvdGFsOiB0aGlzLnRvdGFsLFxyXG5cdFx0XHRcdFx0aW5Qcm9ncmVzczogdGhpcy5pblByb2dyZXNzLFxyXG5cdFx0XHRcdFx0YWJhbmRvbmVkOiB0aGlzLmFiYW5kb25lZCxcclxuXHRcdFx0XHRcdG5vdFN0YXJ0ZWQ6IHRoaXMubm90U3RhcnRlZCxcclxuXHRcdFx0XHRcdHBsYW5uZWQ6IHRoaXMucGxhbm5lZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHR0aGlzLm51bWJlckVsID0gdGhpcy5wcm9ncmVzc0JhckVsLmNyZWF0ZUVsKFwiZGl2XCIsIHtcclxuXHRcdFx0XHRjbHM6IFwicHJvZ3Jlc3Mtc3RhdHVzXCIsXHJcblx0XHRcdFx0dGV4dDogdGV4dCxcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblxyXG5cdFx0cmV0dXJuIHRoaXMucHJvZ3Jlc3NCYXJFbDtcclxuXHR9XHJcblxyXG5cdGlnbm9yZUV2ZW50KCkge1xyXG5cdFx0cmV0dXJuIGZhbHNlO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHRhc2tQcm9ncmVzc0JhckV4dGVuc2lvbihcclxuXHRhcHA6IEFwcCxcclxuXHRwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG4pIHtcclxuXHRyZXR1cm4gVmlld1BsdWdpbi5mcm9tQ2xhc3MoXHJcblx0XHRjbGFzcyB7XHJcblx0XHRcdHByb2dyZXNzRGVjb3JhdGlvbnM6IERlY29yYXRpb25TZXQgPSBEZWNvcmF0aW9uLm5vbmU7XHJcblxyXG5cdFx0XHRjb25zdHJ1Y3RvcihwdWJsaWMgdmlldzogRWRpdG9yVmlldykge1xyXG5cdFx0XHRcdGxldCB7cHJvZ3Jlc3N9ID0gdGhpcy5nZXREZWNvKHZpZXcpO1xyXG5cdFx0XHRcdHRoaXMucHJvZ3Jlc3NEZWNvcmF0aW9ucyA9IHByb2dyZXNzO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR1cGRhdGUodXBkYXRlOiBWaWV3VXBkYXRlKSB7XHJcblx0XHRcdFx0aWYgKHVwZGF0ZS5kb2NDaGFuZ2VkIHx8IHVwZGF0ZS52aWV3cG9ydENoYW5nZWQpIHtcclxuXHRcdFx0XHRcdGxldCB7cHJvZ3Jlc3N9ID0gdGhpcy5nZXREZWNvKHVwZGF0ZS52aWV3KTtcclxuXHRcdFx0XHRcdHRoaXMucHJvZ3Jlc3NEZWNvcmF0aW9ucyA9IHByb2dyZXNzO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Z2V0RGVjbyh2aWV3OiBFZGl0b3JWaWV3KToge1xyXG5cdFx0XHRcdHByb2dyZXNzOiBEZWNvcmF0aW9uU2V0O1xyXG5cdFx0XHR9IHtcclxuXHRcdFx0XHRsZXQge3N0YXRlfSA9IHZpZXcsXHJcblx0XHRcdFx0XHRwcm9ncmVzc0RlY29zOiBSYW5nZTxEZWNvcmF0aW9uPltdID0gW107XHJcblxyXG5cdFx0XHRcdC8vIENoZWNrIGlmIHByb2dyZXNzIGJhcnMgc2hvdWxkIGJlIGhpZGRlbiBiYXNlZCBvbiBzZXR0aW5nc1xyXG5cdFx0XHRcdGlmIChzaG91bGRIaWRlUHJvZ3Jlc3NCYXJJbkxpdmVQcml2aWV3KHBsdWdpbiwgdmlldykpIHtcclxuXHRcdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRcdHByb2dyZXNzOiBEZWNvcmF0aW9uLm5vbmUsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Zm9yIChsZXQgcGFydCBvZiB2aWV3LnZpc2libGVSYW5nZXMpIHtcclxuXHRcdFx0XHRcdGxldCB0YXNrQnVsbGV0Q3Vyc29yOiBSZWdFeHBDdXJzb3IgfCBTZWFyY2hDdXJzb3I7XHJcblx0XHRcdFx0XHRsZXQgaGVhZGluZ0N1cnNvcjogUmVnRXhwQ3Vyc29yIHwgU2VhcmNoQ3Vyc29yO1xyXG5cdFx0XHRcdFx0bGV0IG5vblRhc2tCdWxsZXRDdXJzb3I6IFJlZ0V4cEN1cnNvciB8IFNlYXJjaEN1cnNvcjtcclxuXHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdHRhc2tCdWxsZXRDdXJzb3IgPSBuZXcgUmVnRXhwQ3Vyc29yKFxyXG5cdFx0XHRcdFx0XHRcdHN0YXRlLmRvYyxcclxuXHRcdFx0XHRcdFx0XHRcIl5bXFxcXHR8XFxcXHNdKihbLSorXXxcXFxcZCtcXFxcLilcXFxcc1xcXFxbKC4pXFxcXF1cIixcclxuXHRcdFx0XHRcdFx0XHR7fSxcclxuXHRcdFx0XHRcdFx0XHRwYXJ0LmZyb20sXHJcblx0XHRcdFx0XHRcdFx0cGFydC50b1xyXG5cdFx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdFx0XHRcdGNvbnNvbGUuZGVidWcoZXJyKTtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gUHJvY2VzcyBoZWFkaW5ncyBpZiBlbmFibGVkIGluIHNldHRpbmdzXHJcblx0XHRcdFx0XHRpZiAocGx1Z2luPy5zZXR0aW5ncy5hZGRUYXNrUHJvZ3Jlc3NCYXJUb0hlYWRpbmcpIHtcclxuXHRcdFx0XHRcdFx0dHJ5IHtcclxuXHRcdFx0XHRcdFx0XHRoZWFkaW5nQ3Vyc29yID0gbmV3IFJlZ0V4cEN1cnNvcihcclxuXHRcdFx0XHRcdFx0XHRcdHN0YXRlLmRvYyxcclxuXHRcdFx0XHRcdFx0XHRcdFwiXigjKXsxLDZ9IFwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0e30sXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJ0LmZyb20sXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJ0LnRvXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhlcnIpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBQcm9jZXNzIGhlYWRpbmdzXHJcblx0XHRcdFx0XHRcdHRoaXMucHJvY2Vzc0hlYWRpbmdzKFxyXG5cdFx0XHRcdFx0XHRcdGhlYWRpbmdDdXJzb3IsXHJcblx0XHRcdFx0XHRcdFx0cHJvZ3Jlc3NEZWNvcyxcclxuXHRcdFx0XHRcdFx0XHR2aWV3XHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Ly8gUHJvY2VzcyBub24tdGFzayBidWxsZXRzIGlmIGVuYWJsZWQgaW4gc2V0dGluZ3NcclxuXHRcdFx0XHRcdGlmIChwbHVnaW4/LnNldHRpbmdzLmFkZFByb2dyZXNzQmFyVG9Ob25UYXNrQnVsbGV0KSB7XHJcblx0XHRcdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRcdFx0Ly8gUGF0dGVybiB0byBtYXRjaCBidWxsZXRzIHdpdGhvdXQgdGFzayBtYXJrZXJzXHJcblx0XHRcdFx0XHRcdFx0bm9uVGFza0J1bGxldEN1cnNvciA9IG5ldyBSZWdFeHBDdXJzb3IoXHJcblx0XHRcdFx0XHRcdFx0XHRzdGF0ZS5kb2MsXHJcblx0XHRcdFx0XHRcdFx0XHRcIl5bXFxcXHR8XFxcXHNdKihbLSorXXxcXFxcZCtcXFxcLilcXFxccyg/IVxcXFxbLlxcXFxdKVwiLFxyXG5cdFx0XHRcdFx0XHRcdFx0e30sXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJ0LmZyb20sXHJcblx0XHRcdFx0XHRcdFx0XHRwYXJ0LnRvXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc29sZS5kZWJ1ZyhlcnIpO1xyXG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHQvLyBQcm9jZXNzIG5vbi10YXNrIGJ1bGxldHNcclxuXHRcdFx0XHRcdFx0dGhpcy5wcm9jZXNzTm9uVGFza0J1bGxldHMoXHJcblx0XHRcdFx0XHRcdFx0bm9uVGFza0J1bGxldEN1cnNvcixcclxuXHRcdFx0XHRcdFx0XHRwcm9ncmVzc0RlY29zLFxyXG5cdFx0XHRcdFx0XHRcdHZpZXdcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBQcm9jZXNzIHRhc2sgYnVsbGV0c1xyXG5cdFx0XHRcdFx0dGhpcy5wcm9jZXNzQnVsbGV0cyh0YXNrQnVsbGV0Q3Vyc29yLCBwcm9ncmVzc0RlY29zLCB2aWV3KTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHRwcm9ncmVzczogRGVjb3JhdGlvbi5zZXQoXHJcblx0XHRcdFx0XHRcdHByb2dyZXNzRGVjb3Muc29ydCgoYSwgYikgPT4gYS5mcm9tIC0gYi5mcm9tKVxyXG5cdFx0XHRcdFx0KSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogUHJvY2VzcyBoZWFkaW5nIG1hdGNoZXMgYW5kIGFkZCBkZWNvcmF0aW9uc1xyXG5cdFx0XHQgKi9cclxuXHRcdFx0cHJpdmF0ZSBwcm9jZXNzSGVhZGluZ3MoXHJcblx0XHRcdFx0Y3Vyc29yOiBSZWdFeHBDdXJzb3IgfCBTZWFyY2hDdXJzb3IsXHJcblx0XHRcdFx0ZGVjb3JhdGlvbnM6IFJhbmdlPERlY29yYXRpb24+W10sXHJcblx0XHRcdFx0dmlldzogRWRpdG9yVmlld1xyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR3aGlsZSAoIWN1cnNvci5uZXh0KCkuZG9uZSkge1xyXG5cdFx0XHRcdFx0bGV0IHtmcm9tLCB0b30gPSBjdXJzb3IudmFsdWU7XHJcblx0XHRcdFx0XHRjb25zdCBoZWFkaW5nTGluZSA9IHZpZXcuc3RhdGUuZG9jLmxpbmVBdChmcm9tKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoXHJcblx0XHRcdFx0XHRcdCF0aGlzLmlzUG9zaXRpb25FbmFibGVkQnlIZWFkaW5nKFxyXG5cdFx0XHRcdFx0XHRcdHZpZXcuc3RhdGUsXHJcblx0XHRcdFx0XHRcdFx0aGVhZGluZ0xpbmUuZnJvbVxyXG5cdFx0XHRcdFx0XHQpXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0Y29udGludWU7XHJcblx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgcmFuZ2UgPSB0aGlzLmNhbGN1bGF0ZVJhbmdlRm9yVHJhbnNmb3JtKFxyXG5cdFx0XHRcdFx0XHR2aWV3LnN0YXRlLFxyXG5cdFx0XHRcdFx0XHRoZWFkaW5nTGluZS5mcm9tXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmICghcmFuZ2UpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tzTnVtID0gdGhpcy5leHRyYWN0VGFza3NGcm9tUmFuZ2UoXHJcblx0XHRcdFx0XHRcdHJhbmdlLFxyXG5cdFx0XHRcdFx0XHR2aWV3LnN0YXRlLFxyXG5cdFx0XHRcdFx0XHRmYWxzZVxyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRpZiAodGFza3NOdW0udG90YWwgPT09IDApIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdGxldCBzdGFydERlY28gPSBEZWNvcmF0aW9uLndpZGdldCh7XHJcblx0XHRcdFx0XHRcdHdpZGdldDogbmV3IFRhc2tQcm9ncmVzc0JhcldpZGdldChcclxuXHRcdFx0XHRcdFx0XHRhcHAsXHJcblx0XHRcdFx0XHRcdFx0cGx1Z2luLFxyXG5cdFx0XHRcdFx0XHRcdHZpZXcsXHJcblx0XHRcdFx0XHRcdFx0aGVhZGluZ0xpbmUudG8sXHJcblx0XHRcdFx0XHRcdFx0aGVhZGluZ0xpbmUudG8sXHJcblx0XHRcdFx0XHRcdFx0dGFza3NOdW0uY29tcGxldGVkLFxyXG5cdFx0XHRcdFx0XHRcdHRhc2tzTnVtLnRvdGFsLFxyXG5cdFx0XHRcdFx0XHRcdHRhc2tzTnVtLmluUHJvZ3Jlc3MgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR0YXNrc051bS5hYmFuZG9uZWQgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR0YXNrc051bS5ub3RTdGFydGVkIHx8IDAsXHJcblx0XHRcdFx0XHRcdFx0dGFza3NOdW0ucGxhbm5lZCB8fCAwXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRkZWNvcmF0aW9ucy5wdXNoKFxyXG5cdFx0XHRcdFx0XHRzdGFydERlY28ucmFuZ2UoaGVhZGluZ0xpbmUudG8sIGhlYWRpbmdMaW5lLnRvKVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8qKlxyXG5cdFx0XHQgKiBQcm9jZXNzIGJ1bGxldCBtYXRjaGVzIGFuZCBhZGQgZGVjb3JhdGlvbnNcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgcHJvY2Vzc0J1bGxldHMoXHJcblx0XHRcdFx0Y3Vyc29yOiBSZWdFeHBDdXJzb3IgfCBTZWFyY2hDdXJzb3IsXHJcblx0XHRcdFx0ZGVjb3JhdGlvbnM6IFJhbmdlPERlY29yYXRpb24+W10sXHJcblx0XHRcdFx0dmlldzogRWRpdG9yVmlld1xyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR3aGlsZSAoIWN1cnNvci5uZXh0KCkuZG9uZSkge1xyXG5cdFx0XHRcdFx0bGV0IHtmcm9tfSA9IGN1cnNvci52YWx1ZTtcclxuXHRcdFx0XHRcdGNvbnN0IGxpbmVQb3MgPSB2aWV3LnN0YXRlLmRvYy5saW5lQXQoZnJvbSk/LmZyb207XHJcblxyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzUG9zaXRpb25FbmFibGVkQnlIZWFkaW5nKHZpZXcuc3RhdGUsIGxpbmVQb3MpKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0Ly8gRG9uJ3QgcGFyc2UgYW55IHRhc2tzIGluIGNvZGUgYmxvY2tzIG9yIGZyb250bWF0dGVyXHJcblx0XHRcdFx0XHRjb25zdCBzeW50YXhOb2RlID0gc3ludGF4VHJlZSh2aWV3LnN0YXRlKS5yZXNvbHZlSW5uZXIoXHJcblx0XHRcdFx0XHRcdGxpbmVQb3MgKyAxXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0Y29uc3Qgbm9kZVByb3BzID0gc3ludGF4Tm9kZS50eXBlLnByb3AodG9rZW5DbGFzc05vZGVQcm9wKTtcclxuXHRcdFx0XHRcdGNvbnN0IGV4Y2x1ZGVkU2VjdGlvbiA9IFtcclxuXHRcdFx0XHRcdFx0XCJobWQtY29kZWJsb2NrXCIsXHJcblx0XHRcdFx0XHRcdFwiaG1kLWZyb250bWF0dGVyXCIsXHJcblx0XHRcdFx0XHRdLmZpbmQoKHRva2VuKSA9PiBub2RlUHJvcHM/LnNwbGl0KFwiIFwiKS5pbmNsdWRlcyh0b2tlbikpO1xyXG5cclxuXHRcdFx0XHRcdGlmIChleGNsdWRlZFNlY3Rpb24pIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IGxpbmUgPSB2aWV3LnN0YXRlLmRvYy5saW5lQXQobGluZVBvcyk7XHJcblxyXG5cdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgbGluZSBpcyBhIHRhc2tcclxuXHRcdFx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gdGhpcy5nZXREb2N1bWVudFRleHQoXHJcblx0XHRcdFx0XHRcdHZpZXcuc3RhdGUuZG9jLFxyXG5cdFx0XHRcdFx0XHRsaW5lLmZyb20sXHJcblx0XHRcdFx0XHRcdGxpbmUudG9cclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHQvLyBbQ3VzdG9tR29hbEZlYXR1cmVdIEV4dHJhY3QgdGhlIHRhc2sgdGV4dCBhbmQgY2hlY2sgZm9yIGdvYWwgaW5mb3JtYXRpb25cclxuXHRcdFx0XHRcdGNvbnN0IGN1c3RvbUdvYWwgPSBwbHVnaW4/LnNldHRpbmdzLmFsbG93Q3VzdG9tUHJvZ3Jlc3NHb2FsXHJcblx0XHRcdFx0XHRcdD8gZXh0cmFjdFRhc2tBbmRHb2FsSW5mbyhsaW5lVGV4dClcclxuXHRcdFx0XHRcdFx0OiBudWxsO1xyXG5cdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHQhbGluZVRleHQgfHxcclxuXHRcdFx0XHRcdFx0IS9eW1xcc3xcXHRdKihbLSorXXxcXGQrXFwuKVxcc1xcWyguKVxcXS8udGVzdChsaW5lVGV4dClcclxuXHRcdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRjb25zdCByYW5nZSA9IHRoaXMuY2FsY3VsYXRlUmFuZ2VGb3JUcmFuc2Zvcm0oXHJcblx0XHRcdFx0XHRcdHZpZXcuc3RhdGUsXHJcblx0XHRcdFx0XHRcdGxpbmUudG9cclxuXHRcdFx0XHRcdCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKCFyYW5nZSkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdFx0Y29uc3QgcmFuZ2VUZXh0ID0gdGhpcy5nZXREb2N1bWVudFRleHQoXHJcblx0XHRcdFx0XHRcdHZpZXcuc3RhdGUuZG9jLFxyXG5cdFx0XHRcdFx0XHRyYW5nZS5mcm9tLFxyXG5cdFx0XHRcdFx0XHRyYW5nZS50b1xyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdGlmICghcmFuZ2VUZXh0IHx8IHJhbmdlVGV4dC5sZW5ndGggPT09IDEpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tzTnVtID0gdGhpcy5leHRyYWN0VGFza3NGcm9tUmFuZ2UoXHJcblx0XHRcdFx0XHRcdHJhbmdlLFxyXG5cdFx0XHRcdFx0XHR2aWV3LnN0YXRlLFxyXG5cdFx0XHRcdFx0XHR0cnVlLFxyXG5cdFx0XHRcdFx0XHRjdXN0b21Hb2FsXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmICh0YXNrc051bS50b3RhbCA9PT0gMCkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdFx0bGV0IHN0YXJ0RGVjbyA9IERlY29yYXRpb24ud2lkZ2V0KHtcclxuXHRcdFx0XHRcdFx0d2lkZ2V0OiBuZXcgVGFza1Byb2dyZXNzQmFyV2lkZ2V0KFxyXG5cdFx0XHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdFx0XHRsaW5lLnRvLFxyXG5cdFx0XHRcdFx0XHRcdGxpbmUudG8sXHJcblx0XHRcdFx0XHRcdFx0dGFza3NOdW0uY29tcGxldGVkLFxyXG5cdFx0XHRcdFx0XHRcdHRhc2tzTnVtLnRvdGFsLFxyXG5cdFx0XHRcdFx0XHRcdHRhc2tzTnVtLmluUHJvZ3Jlc3MgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR0YXNrc051bS5hYmFuZG9uZWQgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR0YXNrc051bS5ub3RTdGFydGVkIHx8IDAsXHJcblx0XHRcdFx0XHRcdFx0dGFza3NOdW0ucGxhbm5lZCB8fCAwXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdHNpZGU6IDEsXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRkZWNvcmF0aW9ucy5wdXNoKHN0YXJ0RGVjby5yYW5nZShsaW5lLnRvLCBsaW5lLnRvKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogUHJvY2VzcyBub24tdGFzayBidWxsZXQgbWF0Y2hlcyBhbmQgYWRkIGRlY29yYXRpb25zXHJcblx0XHRcdCAqIFRoaXMgaGFuZGxlcyByZWd1bGFyIGxpc3QgaXRlbXMgKG5vdCB0YXNrcykgdGhhdCBoYXZlIGNoaWxkIHRhc2tzXHJcblx0XHRcdCAqIEZvciBub24tdGFzayBidWxsZXRzLCB3ZSBzdGlsbCBjYWxjdWxhdGUgcHJvZ3Jlc3MgYmFzZWQgb24gY2hpbGQgdGFza3NcclxuXHRcdFx0ICogYW5kIGFkZCBhIHByb2dyZXNzIGJhciB3aWRnZXQgdG8gc2hvdyBjb21wbGV0aW9uIHN0YXR1c1xyXG5cdFx0XHQgKi9cclxuXHRcdFx0cHJpdmF0ZSBwcm9jZXNzTm9uVGFza0J1bGxldHMoXHJcblx0XHRcdFx0Y3Vyc29yOiBSZWdFeHBDdXJzb3IgfCBTZWFyY2hDdXJzb3IsXHJcblx0XHRcdFx0ZGVjb3JhdGlvbnM6IFJhbmdlPERlY29yYXRpb24+W10sXHJcblx0XHRcdFx0dmlldzogRWRpdG9yVmlld1xyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHR3aGlsZSAoIWN1cnNvci5uZXh0KCkuZG9uZSkge1xyXG5cdFx0XHRcdFx0bGV0IHtmcm9tfSA9IGN1cnNvci52YWx1ZTtcclxuXHRcdFx0XHRcdGNvbnN0IGxpbmVQb3MgPSB2aWV3LnN0YXRlLmRvYy5saW5lQXQoZnJvbSk/LmZyb207XHJcblxyXG5cdFx0XHRcdFx0aWYgKCF0aGlzLmlzUG9zaXRpb25FbmFibGVkQnlIZWFkaW5nKHZpZXcuc3RhdGUsIGxpbmVQb3MpKSB7XHJcblx0XHRcdFx0XHRcdGNvbnRpbnVlO1xyXG5cdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdC8vIERvbid0IHBhcnNlIGFueSBidWxsZXRzIGluIGNvZGUgYmxvY2tzIG9yIGZyb250bWF0dGVyXHJcblx0XHRcdFx0XHRjb25zdCBzeW50YXhOb2RlID0gc3ludGF4VHJlZSh2aWV3LnN0YXRlKS5yZXNvbHZlSW5uZXIoXHJcblx0XHRcdFx0XHRcdGxpbmVQb3MgKyAxXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IG5vZGVQcm9wcyA9IHN5bnRheE5vZGUudHlwZS5wcm9wKHRva2VuQ2xhc3NOb2RlUHJvcCk7XHJcblx0XHRcdFx0XHRjb25zdCBleGNsdWRlZFNlY3Rpb24gPSBbXHJcblx0XHRcdFx0XHRcdFwiaG1kLWNvZGVibG9ja1wiLFxyXG5cdFx0XHRcdFx0XHRcImhtZC1mcm9udG1hdHRlclwiLFxyXG5cdFx0XHRcdFx0XS5maW5kKCh0b2tlbikgPT4gbm9kZVByb3BzPy5zcGxpdChcIiBcIikuaW5jbHVkZXModG9rZW4pKTtcclxuXHJcblx0XHRcdFx0XHRpZiAoZXhjbHVkZWRTZWN0aW9uKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCBsaW5lID0gdmlldy5zdGF0ZS5kb2MubGluZUF0KGxpbmVQb3MpO1xyXG5cclxuXHRcdFx0XHRcdC8vIEdldCB0aGUgY29tcGxldGUgbGluZSB0ZXh0XHJcblx0XHRcdFx0XHRjb25zdCBsaW5lVGV4dCA9IHRoaXMuZ2V0RG9jdW1lbnRUZXh0KFxyXG5cdFx0XHRcdFx0XHR2aWV3LnN0YXRlLmRvYyxcclxuXHRcdFx0XHRcdFx0bGluZS5mcm9tLFxyXG5cdFx0XHRcdFx0XHRsaW5lLnRvXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmICghbGluZVRleHQpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHJhbmdlID0gdGhpcy5jYWxjdWxhdGVSYW5nZUZvclRyYW5zZm9ybShcclxuXHRcdFx0XHRcdFx0dmlldy5zdGF0ZSxcclxuXHRcdFx0XHRcdFx0bGluZS50b1xyXG5cdFx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0XHRpZiAoIXJhbmdlKSBjb250aW51ZTtcclxuXHJcblx0XHRcdFx0XHRjb25zdCByYW5nZVRleHQgPSB0aGlzLmdldERvY3VtZW50VGV4dChcclxuXHRcdFx0XHRcdFx0dmlldy5zdGF0ZS5kb2MsXHJcblx0XHRcdFx0XHRcdHJhbmdlLmZyb20sXHJcblx0XHRcdFx0XHRcdHJhbmdlLnRvXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmICghcmFuZ2VUZXh0IHx8IHJhbmdlVGV4dC5sZW5ndGggPT09IDEpIGNvbnRpbnVlO1xyXG5cclxuXHRcdFx0XHRcdGNvbnN0IHRhc2tzTnVtID0gdGhpcy5leHRyYWN0VGFza3NGcm9tUmFuZ2UoXHJcblx0XHRcdFx0XHRcdHJhbmdlLFxyXG5cdFx0XHRcdFx0XHR2aWV3LnN0YXRlLFxyXG5cdFx0XHRcdFx0XHR0cnVlXHJcblx0XHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRcdGlmICh0YXNrc051bS50b3RhbCA9PT0gMCkgY29udGludWU7XHJcblxyXG5cdFx0XHRcdFx0bGV0IHN0YXJ0RGVjbyA9IERlY29yYXRpb24ud2lkZ2V0KHtcclxuXHRcdFx0XHRcdFx0d2lkZ2V0OiBuZXcgVGFza1Byb2dyZXNzQmFyV2lkZ2V0KFxyXG5cdFx0XHRcdFx0XHRcdGFwcCxcclxuXHRcdFx0XHRcdFx0XHRwbHVnaW4sXHJcblx0XHRcdFx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRcdFx0XHRsaW5lLnRvLFxyXG5cdFx0XHRcdFx0XHRcdGxpbmUudG8sXHJcblx0XHRcdFx0XHRcdFx0dGFza3NOdW0uY29tcGxldGVkLFxyXG5cdFx0XHRcdFx0XHRcdHRhc2tzTnVtLnRvdGFsLFxyXG5cdFx0XHRcdFx0XHRcdHRhc2tzTnVtLmluUHJvZ3Jlc3MgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR0YXNrc051bS5hYmFuZG9uZWQgfHwgMCxcclxuXHRcdFx0XHRcdFx0XHR0YXNrc051bS5ub3RTdGFydGVkIHx8IDAsXHJcblx0XHRcdFx0XHRcdFx0dGFza3NOdW0ucGxhbm5lZCB8fCAwXHJcblx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdHNpZGU6IDEsXHJcblx0XHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0XHRkZWNvcmF0aW9ucy5wdXNoKHN0YXJ0RGVjby5yYW5nZShsaW5lLnRvLCBsaW5lLnRvKSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogRXh0cmFjdCB0YXNrcyBjb3VudCBmcm9tIGEgZG9jdW1lbnQgcmFuZ2VcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgZXh0cmFjdFRhc2tzRnJvbVJhbmdlKFxyXG5cdFx0XHRcdHJhbmdlOiBUZXh0UmFuZ2UsXHJcblx0XHRcdFx0c3RhdGU6IEVkaXRvclN0YXRlLFxyXG5cdFx0XHRcdGlzQnVsbGV0OiBib29sZWFuLFxyXG5cdFx0XHRcdGN1c3RvbUdvYWw/OiBudW1iZXIgfCBudWxsIC8vIFtDdXN0b21Hb2FsRmVhdHVyZV1cclxuXHRcdFx0KTogVGFza3Mge1xyXG5cdFx0XHRcdGNvbnN0IHRleHRBcnJheSA9IHRoaXMuZ2V0RG9jdW1lbnRUZXh0QXJyYXkoXHJcblx0XHRcdFx0XHRzdGF0ZS5kb2MsXHJcblx0XHRcdFx0XHRyYW5nZS5mcm9tLFxyXG5cdFx0XHRcdFx0cmFuZ2UudG9cclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdHJldHVybiB0aGlzLmNhbGN1bGF0ZVRhc2tzTnVtKHRleHRBcnJheSwgaXNCdWxsZXQsIGN1c3RvbUdvYWwpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogU2FmZWx5IGV4dHJhY3QgdGV4dCBmcm9tIGEgZG9jdW1lbnQgcmFuZ2VcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgZ2V0RG9jdW1lbnRUZXh0KFxyXG5cdFx0XHRcdGRvYzogVGV4dCxcclxuXHRcdFx0XHRmcm9tOiBudW1iZXIsXHJcblx0XHRcdFx0dG86IG51bWJlclxyXG5cdFx0XHQpOiBzdHJpbmcgfCBudWxsIHtcclxuXHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGRvYy5zbGljZVN0cmluZyhmcm9tLCB0byk7XHJcblx0XHRcdFx0fSBjYXRjaCAoZSkge1xyXG5cdFx0XHRcdFx0Y29uc29sZS5lcnJvcihcIkVycm9yIGdldHRpbmcgZG9jdW1lbnQgdGV4dDpcIiwgZSk7XHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8qKlxyXG5cdFx0XHQgKiBHZXQgYW4gYXJyYXkgb2YgdGV4dCBsaW5lcyBmcm9tIGEgZG9jdW1lbnQgcmFuZ2VcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgZ2V0RG9jdW1lbnRUZXh0QXJyYXkoXHJcblx0XHRcdFx0ZG9jOiBUZXh0LFxyXG5cdFx0XHRcdGZyb206IG51bWJlcixcclxuXHRcdFx0XHR0bzogbnVtYmVyXHJcblx0XHRcdCk6IHN0cmluZ1tdIHtcclxuXHRcdFx0XHRjb25zdCB0ZXh0ID0gdGhpcy5nZXREb2N1bWVudFRleHQoZG9jLCBmcm9tLCB0byk7XHJcblx0XHRcdFx0aWYgKCF0ZXh0KSByZXR1cm4gW107XHJcblx0XHRcdFx0cmV0dXJuIHRleHQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8qKlxyXG5cdFx0XHQgKiBDYWxjdWxhdGUgdGhlIGZvbGRhYmxlIHJhbmdlIGZvciBhIHBvc2l0aW9uXHJcblx0XHRcdCAqL1xyXG5cdFx0XHRwdWJsaWMgY2FsY3VsYXRlUmFuZ2VGb3JUcmFuc2Zvcm0oXHJcblx0XHRcdFx0c3RhdGU6IEVkaXRvclN0YXRlLFxyXG5cdFx0XHRcdHBvczogbnVtYmVyXHJcblx0XHRcdCk6IFRleHRSYW5nZSB8IG51bGwge1xyXG5cdFx0XHRcdGNvbnN0IGxpbmUgPSBzdGF0ZS5kb2MubGluZUF0KHBvcyk7XHJcblx0XHRcdFx0Y29uc3QgZm9sZFJhbmdlID0gZm9sZGFibGUoc3RhdGUsIGxpbmUuZnJvbSwgbGluZS50byk7XHJcblxyXG5cdFx0XHRcdGlmICghZm9sZFJhbmdlKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiB7ZnJvbTogbGluZS5mcm9tLCB0bzogZm9sZFJhbmdlLnRvfTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIENyZWF0ZSByZWdleCBmb3IgY291bnRpbmcgdG90YWwgdGFza3NcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgY3JlYXRlVG90YWxUYXNrUmVnZXgoXHJcblx0XHRcdFx0aXNIZWFkaW5nOiBib29sZWFuLFxyXG5cdFx0XHRcdGxldmVsOiBudW1iZXIgPSAwLFxyXG5cdFx0XHRcdHRhYlNpemU6IG51bWJlciA9IDRcclxuXHRcdFx0KTogUmVnRXhwIHtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiB3ZSdyZSB1c2luZyBvbmx5IHNwZWNpZmljIG1hcmtzIGZvciBjb3VudGluZ1xyXG5cdFx0XHRcdGlmIChwbHVnaW4/LnNldHRpbmdzLnVzZU9ubHlDb3VudE1hcmtzKSB7XHJcblx0XHRcdFx0XHRjb25zdCBvbmx5Q291bnRNYXJrcyA9XHJcblx0XHRcdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3Mub25seUNvdW50VGFza01hcmtzIHx8IFwiXCI7XHJcblx0XHRcdFx0XHQvLyBJZiBvbmx5Q291bnRNYXJrcyBpcyBlbXB0eSwgcmV0dXJuIGEgcmVnZXggdGhhdCB3b24ndCBtYXRjaCBhbnl0aGluZ1xyXG5cdFx0XHRcdFx0aWYgKCFvbmx5Q291bnRNYXJrcy50cmltKCkpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBSZWdFeHAoXCJeJFwiKTsgLy8gVGhpcyB3b24ndCBtYXRjaCBhbnkgdGFza3NcclxuXHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHQvLyBJbmNsdWRlIHRoZSBzcGVjaWZpZWQgbWFya3MgYW5kIHNwYWNlIChmb3Igbm90IHN0YXJ0ZWQgdGFza3MpXHJcblx0XHRcdFx0XHRjb25zdCBtYXJrUGF0dGVybiA9IGBcXFxcWyhbICR7b25seUNvdW50TWFya3N9XSlcXFxcXWA7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGlzSGVhZGluZykge1xyXG5cdFx0XHRcdFx0XHQvLyBGb3IgaGVhZGluZ3MsIHdlJ2xsIHN0aWxsIG1hdGNoIGFueSB0YXNrIGZvcm1hdCwgYnV0IGZpbHRlciBieSBpbmRlbnRhdGlvbiBsZXZlbCBsYXRlclxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdFx0XHRgXltcXFxcdHxcXFxcc10qKFstKitdfFxcXFxkK1xcXFwuKVxcXFxzJHttYXJrUGF0dGVybn1gXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBJZiBjb3VudGluZyBzdWJsZXZlbHMsIHVzZSBhIG1vcmUgcmVsYXhlZCByZWdleCB0aGF0IG1hdGNoZXMgYW55IGluZGVudGF0aW9uXHJcblx0XHRcdFx0XHRcdGlmIChwbHVnaW4/LnNldHRpbmdzLmNvdW50U3ViTGV2ZWwpIHtcclxuXHRcdFx0XHRcdFx0XHRyZXR1cm4gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdFx0XHRcdGBeW1xcXFx0fFxcXFxzXSo/KFstKitdfFxcXFxkK1xcXFwuKVxcXFxzJHttYXJrUGF0dGVybn1gXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdFx0XHQvLyBXaGVuIG5vdCBjb3VudGluZyBzdWJsZXZlbHMsIHdlJ2xsIGNoZWNrIHRoZSBhY3R1YWwgaW5kZW50YXRpb24gbGV2ZWwgc2VwYXJhdGVseVxyXG5cdFx0XHRcdFx0XHRcdC8vIFNvIHRoZSByZWdleCBzaG91bGQgbWF0Y2ggdGFza3MgYXQgYW55IGluZGVudGF0aW9uIGxldmVsXHJcblx0XHRcdFx0XHRcdFx0cmV0dXJuIG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRcdFx0XHRgXltcXFxcdHxcXFxcc10qKFstKitdfFxcXFxkK1xcXFwuKVxcXFxzJHttYXJrUGF0dGVybn1gXHJcblx0XHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gR2V0IGV4Y2x1ZGVkIHRhc2sgbWFya3NcclxuXHRcdFx0XHRjb25zdCBleGNsdWRlUGF0dGVybiA9IHBsdWdpbj8uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcyB8fCBcIlwiO1xyXG5cclxuXHRcdFx0XHQvLyBCdWlsZCB0aGUgdGFzayBtYXJrZXIgcGF0dGVyblxyXG5cdFx0XHRcdGxldCBtYXJrUGF0dGVybiA9IFwiXFxcXFsoLilcXFxcXVwiO1xyXG5cclxuXHRcdFx0XHQvLyBJZiB0aGVyZSBhcmUgZXhjbHVkZWQgbWFya3MsIG1vZGlmeSB0aGUgcGF0dGVyblxyXG5cdFx0XHRcdGlmIChleGNsdWRlUGF0dGVybiAmJiBleGNsdWRlUGF0dGVybi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdFx0XHQvLyBCdWlsZCBhIHBhdHRlcm4gdGhhdCBkb2Vzbid0IG1hdGNoIGV4Y2x1ZGVkIG1hcmtzXHJcblx0XHRcdFx0XHRjb25zdCBleGNsdWRlQ2hhcnMgPSBleGNsdWRlUGF0dGVyblxyXG5cdFx0XHRcdFx0XHQuc3BsaXQoXCJcIilcclxuXHRcdFx0XHRcdFx0Lm1hcCgoYykgPT4gXCJcXFxcXCIgKyBjKVxyXG5cdFx0XHRcdFx0XHQuam9pbihcIlwiKTtcclxuXHRcdFx0XHRcdG1hcmtQYXR0ZXJuID0gYFxcXFxbKFteJHtleGNsdWRlQ2hhcnN9XSlcXFxcXWA7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRpZiAoaXNIZWFkaW5nKSB7XHJcblx0XHRcdFx0XHQvLyBGb3IgaGVhZGluZ3MsIHdlJ2xsIHN0aWxsIG1hdGNoIGFueSB0YXNrIGZvcm1hdCwgYnV0IGZpbHRlciBieSBpbmRlbnRhdGlvbiBsZXZlbCBsYXRlclxyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRcdGBeW1xcXFx0fFxcXFxzXSooWy0qK118XFxcXGQrXFxcXC4pXFxcXHMke21hcmtQYXR0ZXJufWBcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIElmIGNvdW50aW5nIHN1YmxldmVscywgdXNlIGEgbW9yZSByZWxheGVkIHJlZ2V4XHJcblx0XHRcdFx0XHRpZiAocGx1Z2luPy5zZXR0aW5ncy5jb3VudFN1YkxldmVsKSB7XHJcblx0XHRcdFx0XHRcdHJldHVybiBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdFx0XHRcdGBeW1xcXFx0fFxcXFxzXSo/KFstKitdfFxcXFxkK1xcXFwuKVxcXFxzJHttYXJrUGF0dGVybn1gXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBXaGVuIG5vdCBjb3VudGluZyBzdWJsZXZlbHMsIHdlJ2xsIGNoZWNrIHRoZSBhY3R1YWwgaW5kZW50YXRpb24gbGV2ZWwgc2VwYXJhdGVseVxyXG5cdFx0XHRcdFx0XHQvLyBTbyB0aGUgcmVnZXggc2hvdWxkIG1hdGNoIHRhc2tzIGF0IGFueSBpbmRlbnRhdGlvbiBsZXZlbFxyXG5cdFx0XHRcdFx0XHRyZXR1cm4gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdFx0XHRgXltcXFxcdHxcXFxcc10qKFstKitdfFxcXFxkK1xcXFwuKVxcXFxzJHttYXJrUGF0dGVybn1gXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogQ3JlYXRlIHJlZ2V4IGZvciBtYXRjaGluZyBjb21wbGV0ZWQgdGFza3NcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgY3JlYXRlQ29tcGxldGVkVGFza1JlZ2V4KFxyXG5cdFx0XHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdGlzSGVhZGluZzogYm9vbGVhbixcclxuXHRcdFx0XHRsZXZlbDogbnVtYmVyID0gMCxcclxuXHRcdFx0XHR0YWJTaXplOiBudW1iZXIgPSA0XHJcblx0XHRcdCk6IFJlZ0V4cCB7XHJcblx0XHRcdFx0Ly8gRXh0cmFjdCBzZXR0aW5nc1xyXG5cdFx0XHRcdGNvbnN0IHVzZU9ubHlDb3VudE1hcmtzID0gcGx1Z2luPy5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcztcclxuXHRcdFx0XHRjb25zdCBvbmx5Q291bnRQYXR0ZXJuID1cclxuXHRcdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3Mub25seUNvdW50VGFza01hcmtzIHx8IFwieHxYXCI7XHJcblxyXG5cdFx0XHRcdC8vIElmIG9ubHlDb3VudE1hcmtzIGlzIGVuYWJsZWQgYnV0IHRoZSBwYXR0ZXJuIGlzIGVtcHR5LCByZXR1cm4gYSByZWdleCB0aGF0IHdvbid0IG1hdGNoIGFueXRoaW5nXHJcblx0XHRcdFx0aWYgKHVzZU9ubHlDb3VudE1hcmtzICYmICFvbmx5Q291bnRQYXR0ZXJuLnRyaW0oKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSZWdFeHAoXCJeJFwiKTsgLy8gVGhpcyB3b24ndCBtYXRjaCBhbnkgdGFza3NcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IGV4Y2x1ZGVQYXR0ZXJuID0gcGx1Z2luPy5zZXR0aW5ncy5leGNsdWRlVGFza01hcmtzIHx8IFwiXCI7XHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZCB8fCBcInh8WFwiO1xyXG5cclxuXHRcdFx0XHQvLyBEZWZhdWx0IHBhdHRlcm5zIC0gYWRqdXN0IGZvciBzdWJsZXZlbCBjb3VudGluZ1xyXG5cdFx0XHRcdGNvbnN0IGJhc2VQYXR0ZXJuID0gaXNIZWFkaW5nXHJcblx0XHRcdFx0XHQ/IFwiXltcXFxcdHxcXFxcc10qXCIgLy8gRm9yIGhlYWRpbmdzLCBtYXRjaCBhbnkgaW5kZW50YXRpb24gKHdpbGwgYmUgZmlsdGVyZWQgbGF0ZXIpXHJcblx0XHRcdFx0XHQ6IHBsdWdpbj8uc2V0dGluZ3MuY291bnRTdWJMZXZlbFxyXG5cdFx0XHRcdFx0XHQ/IFwiXltcXFxcdHxcXFxcc10qP1wiIC8vIEZvciBzdWJsZXZlbCBjb3VudGluZywgdXNlIG5vbi1ncmVlZHkgbWF0Y2ggZm9yIGFueSBpbmRlbnRhdGlvblxyXG5cdFx0XHRcdFx0XHQ6IFwiXltcXFxcdHxcXFxcc10qXCI7IC8vIEZvciBubyBzdWJsZXZlbCBjb3VudGluZywgc3RpbGwgbWF0Y2ggYW55IGluZGVudGF0aW9uIGxldmVsXHJcblxyXG5cdFx0XHRcdGNvbnN0IGJ1bGxldFByZWZpeCA9IGlzSGVhZGluZ1xyXG5cdFx0XHRcdFx0PyBcIihbLSorXXxcXFxcZCtcXFxcLilcXFxcc1wiIC8vIEZvciBoZWFkaW5ncywganVzdCBtYXRjaCB0aGUgYnVsbGV0XHJcblx0XHRcdFx0XHQ6IHBsdWdpbj8uc2V0dGluZ3MuY291bnRTdWJMZXZlbFxyXG5cdFx0XHRcdFx0XHQ/IFwiKFstKitdfFxcXFxkK1xcXFwuKVxcXFxzXCIgLy8gU2ltcGxpZmllZCBwcmVmaXggZm9yIHN1YmxldmVsIGNvdW50aW5nXHJcblx0XHRcdFx0XHRcdDogXCIoWy0qK118XFxcXGQrXFxcXC4pXFxcXHNcIjsgLy8gRm9yIG5vIHN1YmxldmVsIGNvdW50aW5nLCBqdXN0IG1hdGNoIHRoZSBidWxsZXRcclxuXHJcblx0XHRcdFx0Ly8gSWYgXCJvbmx5IGNvdW50IHNwZWNpZmljIG1hcmtzXCIgaXMgZW5hYmxlZFxyXG5cdFx0XHRcdGlmICh1c2VPbmx5Q291bnRNYXJrcykge1xyXG5cdFx0XHRcdFx0cmV0dXJuIG5ldyBSZWdFeHAoXHJcblx0XHRcdFx0XHRcdGJhc2VQYXR0ZXJuICtcclxuXHRcdFx0XHRcdFx0YnVsbGV0UHJlZml4ICtcclxuXHRcdFx0XHRcdFx0XCJcXFxcWyhcIiArXHJcblx0XHRcdFx0XHRcdG9ubHlDb3VudFBhdHRlcm4gK1xyXG5cdFx0XHRcdFx0XHRcIilcXFxcXVwiXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gV2hlbiB1c2luZyB0aGUgY29tcGxldGVkIHRhc2sgbWFya3NcclxuXHRcdFx0XHRpZiAoZXhjbHVkZVBhdHRlcm4pIHtcclxuXHRcdFx0XHRcdC8vIEZpbHRlciBjb21wbGV0ZWQgbWFya3MgYmFzZWQgb24gZXhjbHVzaW9uc1xyXG5cdFx0XHRcdFx0Y29uc3QgY29tcGxldGVkTWFya3NBcnJheSA9IGNvbXBsZXRlZE1hcmtzLnNwbGl0KFwifFwiKTtcclxuXHRcdFx0XHRcdGNvbnN0IGV4Y2x1ZGVNYXJrc0FycmF5ID0gZXhjbHVkZVBhdHRlcm4uc3BsaXQoXCJcIik7XHJcblx0XHRcdFx0XHRjb25zdCBmaWx0ZXJlZE1hcmtzID0gY29tcGxldGVkTWFya3NBcnJheVxyXG5cdFx0XHRcdFx0XHQuZmlsdGVyKChtYXJrKSA9PiAhZXhjbHVkZU1hcmtzQXJyYXkuaW5jbHVkZXMobWFyaykpXHJcblx0XHRcdFx0XHRcdC5qb2luKFwifFwiKTtcclxuXHJcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFJlZ0V4cChcclxuXHRcdFx0XHRcdFx0YmFzZVBhdHRlcm4gK1xyXG5cdFx0XHRcdFx0XHRidWxsZXRQcmVmaXggK1xyXG5cdFx0XHRcdFx0XHRcIlxcXFxbKFwiICtcclxuXHRcdFx0XHRcdFx0ZmlsdGVyZWRNYXJrcyArXHJcblx0XHRcdFx0XHRcdFwiKVxcXFxdXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdHJldHVybiBuZXcgUmVnRXhwKFxyXG5cdFx0XHRcdFx0XHRiYXNlUGF0dGVybiArXHJcblx0XHRcdFx0XHRcdGJ1bGxldFByZWZpeCArXHJcblx0XHRcdFx0XHRcdFwiXFxcXFsoXCIgK1xyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWRNYXJrcyArXHJcblx0XHRcdFx0XHRcdFwiKVxcXFxdXCJcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogQ2hlY2sgaWYgYSB0YXNrIHNob3VsZCBiZSBjb3VudGVkIGFzIGNvbXBsZXRlZFxyXG5cdFx0XHQgKi9cclxuXHRcdFx0cHJpdmF0ZSBpc0NvbXBsZXRlZFRhc2sodGV4dDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRcdFx0Y29uc3QgbWFya01hdGNoID0gdGV4dC5tYXRjaCgvXFxbKC4pXS8pO1xyXG5cdFx0XHRcdGlmICghbWFya01hdGNoIHx8ICFtYXJrTWF0Y2hbMV0pIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IG1hcmsgPSBtYXJrTWF0Y2hbMV07XHJcblxyXG5cdFx0XHRcdC8vIFByaW9yaXR5IDE6IElmIHVzZU9ubHlDb3VudE1hcmtzIGlzIGVuYWJsZWQsIG9ubHkgY291bnQgdGFza3Mgd2l0aCBzcGVjaWZpZWQgbWFya3NcclxuXHRcdFx0XHRpZiAocGx1Z2luPy5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcykge1xyXG5cdFx0XHRcdFx0Y29uc3Qgb25seUNvdW50TWFya3MgPVxyXG5cdFx0XHRcdFx0XHRwbHVnaW4/LnNldHRpbmdzLm9ubHlDb3VudFRhc2tNYXJrcy5zcGxpdChcInxcIik7XHJcblx0XHRcdFx0XHRyZXR1cm4gb25seUNvdW50TWFya3MuaW5jbHVkZXMobWFyayk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBQcmlvcml0eSAyOiBJZiB0aGUgbWFyayBpcyBpbiBleGNsdWRlVGFza01hcmtzLCBkb24ndCBjb3VudCBpdFxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcyAmJlxyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MuaW5jbHVkZXMobWFyaylcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIFByaW9yaXR5IDM6IENoZWNrIGFnYWluc3QgdGhlIHRhc2sgc3RhdHVzZXNcclxuXHRcdFx0XHQvLyBXZSBjb25zaWRlciBhIHRhc2sgXCJjb21wbGV0ZWRcIiBpZiBpdCBoYXMgYSBtYXJrIGZyb20gdGhlIFwiY29tcGxldGVkXCIgc3RhdHVzXHJcblx0XHRcdFx0Y29uc3QgY29tcGxldGVkTWFya3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmNvbXBsZXRlZD8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XHRcdFx0XCJ4XCIsXHJcblx0XHRcdFx0XHRcdFwiWFwiLFxyXG5cdFx0XHRcdFx0XTtcclxuXHJcblx0XHRcdFx0Ly8gUmV0dXJuIHRydWUgaWYgdGhlIG1hcmsgaXMgaW4gdGhlIGNvbXBsZXRlZE1hcmtzIGFycmF5XHJcblx0XHRcdFx0cmV0dXJuIGNvbXBsZXRlZE1hcmtzLmluY2x1ZGVzKG1hcmspO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogR2V0IHRoZSB0YXNrIHN0YXR1cyBvZiBhIHRhc2tcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgZ2V0VGFza1N0YXR1cyhcclxuXHRcdFx0XHR0ZXh0OiBzdHJpbmdcclxuXHRcdFx0KTpcclxuXHRcdFx0XHR8IFwiY29tcGxldGVkXCJcclxuXHRcdFx0XHR8IFwiaW5Qcm9ncmVzc1wiXHJcblx0XHRcdFx0fCBcImFiYW5kb25lZFwiXHJcblx0XHRcdFx0fCBcIm5vdFN0YXJ0ZWRcIlxyXG5cdFx0XHRcdHwgXCJwbGFubmVkXCIge1xyXG5cdFx0XHRcdGNvbnN0IG1hcmtNYXRjaCA9IHRleHQubWF0Y2goL1xcWyguKV0vKTtcclxuXHRcdFx0XHRpZiAoIW1hcmtNYXRjaCB8fCAhbWFya01hdGNoWzFdKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBtYXJrID0gbWFya01hdGNoWzFdO1xyXG5cdFx0XHRcdC8vIFByaW9yaXR5IDE6IElmIHVzZU9ubHlDb3VudE1hcmtzIGlzIGVuYWJsZWRcclxuXHRcdFx0XHRpZiAocGx1Z2luPy5zZXR0aW5ncy51c2VPbmx5Q291bnRNYXJrcykge1xyXG5cdFx0XHRcdFx0Y29uc3Qgb25seUNvdW50TWFya3MgPVxyXG5cdFx0XHRcdFx0XHRwbHVnaW4/LnNldHRpbmdzLm9ubHlDb3VudFRhc2tNYXJrcy5zcGxpdChcInxcIik7XHJcblx0XHRcdFx0XHRpZiAob25seUNvdW50TWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIFwiY29tcGxldGVkXCI7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHQvLyBJZiB1c2luZyBvbmx5Q291bnRNYXJrcyBhbmQgdGhlIG1hcmsgaXMgbm90IGluIHRoZSBsaXN0LFxyXG5cdFx0XHRcdFx0XHQvLyBkZXRlcm1pbmUgd2hpY2ggb3RoZXIgc3RhdHVzIGl0IGJlbG9uZ3MgdG9cclxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGV0ZXJtaW5lTm9uQ29tcGxldGVkU3RhdHVzKG1hcmspO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gUHJpb3JpdHkgMjogSWYgdGhlIG1hcmsgaXMgaW4gZXhjbHVkZVRhc2tNYXJrc1xyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3MuZXhjbHVkZVRhc2tNYXJrcyAmJlxyXG5cdFx0XHRcdFx0cGx1Z2luLnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MuaW5jbHVkZXMobWFyaylcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdC8vIEV4Y2x1ZGVkIG1hcmtzIGFyZSBjb25zaWRlcmVkIG5vdCBzdGFydGVkXHJcblx0XHRcdFx0XHRyZXR1cm4gXCJub3RTdGFydGVkXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBQcmlvcml0eSAzOiBDaGVjayBhZ2FpbnN0IHNwZWNpZmljIHRhc2sgc3RhdHVzZXNcclxuXHRcdFx0XHRyZXR1cm4gdGhpcy5kZXRlcm1pbmVUYXNrU3RhdHVzKG1hcmspO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogSGVscGVyIHRvIGRldGVybWluZSB0aGUgbm9uLWNvbXBsZXRlZCBzdGF0dXMgb2YgYSB0YXNrIG1hcmtcclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgZGV0ZXJtaW5lTm9uQ29tcGxldGVkU3RhdHVzKFxyXG5cdFx0XHRcdG1hcms6IHN0cmluZ1xyXG5cdFx0XHQpOiBcImluUHJvZ3Jlc3NcIiB8IFwiYWJhbmRvbmVkXCIgfCBcIm5vdFN0YXJ0ZWRcIiB8IFwicGxhbm5lZFwiIHtcclxuXHRcdFx0XHRjb25zdCBpblByb2dyZXNzTWFya3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmluUHJvZ3Jlc3M/LnNwbGl0KFwifFwiKSB8fCBbXHJcblx0XHRcdFx0XHRcdFwiLVwiLFxyXG5cdFx0XHRcdFx0XHRcIi9cIixcclxuXHRcdFx0XHRcdF07XHJcblxyXG5cdFx0XHRcdGlmIChpblByb2dyZXNzTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRcdHJldHVybiBcImluUHJvZ3Jlc3NcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGNvbnN0IGFiYW5kb25lZE1hcmtzID1cclxuXHRcdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5hYmFuZG9uZWQ/LnNwbGl0KFwifFwiKSB8fCBbXHJcblx0XHRcdFx0XHRcdFwiPlwiLFxyXG5cdFx0XHRcdFx0XTtcclxuXHRcdFx0XHRpZiAoYWJhbmRvbmVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRcdHJldHVybiBcImFiYW5kb25lZFwiO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3QgcGxhbm5lZE1hcmtzID1cclxuXHRcdFx0XHRcdHBsdWdpbj8uc2V0dGluZ3MudGFza1N0YXR1c2VzPy5wbGFubmVkPy5zcGxpdChcInxcIikgfHwgW1wiP1wiXTtcclxuXHRcdFx0XHRpZiAocGxhbm5lZE1hcmtzLmluY2x1ZGVzKG1hcmspKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4gXCJwbGFubmVkXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBJZiB0aGUgbWFyayBkb2Vzbid0IG1hdGNoIGFueSBzcGVjaWZpYyBjYXRlZ29yeSwgdXNlIHRoZSBjb3VudE90aGVyU3RhdHVzZXNBcyBzZXR0aW5nXHJcblx0XHRcdFx0cmV0dXJuIChcclxuXHRcdFx0XHRcdChwbHVnaW4/LnNldHRpbmdzLmNvdW50T3RoZXJTdGF0dXNlc0FzIGFzXHJcblx0XHRcdFx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0XHRcdFx0fCBcImFiYW5kb25lZFwiXHJcblx0XHRcdFx0XHRcdHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHRcdFx0fCBcInBsYW5uZWRcIikgfHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogSGVscGVyIHRvIGRldGVybWluZSB0aGUgc3BlY2lmaWMgc3RhdHVzIG9mIGEgdGFzayBtYXJrXHJcblx0XHRcdCAqL1xyXG5cdFx0XHRwcml2YXRlIGRldGVybWluZVRhc2tTdGF0dXMoXHJcblx0XHRcdFx0bWFyazogc3RyaW5nXHJcblx0XHRcdCk6XHJcblx0XHRcdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHRcdFx0fCBcImluUHJvZ3Jlc3NcIlxyXG5cdFx0XHRcdHwgXCJhYmFuZG9uZWRcIlxyXG5cdFx0XHRcdHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHR8IFwicGxhbm5lZFwiIHtcclxuXHRcdFx0XHRjb25zdCBjb21wbGV0ZWRNYXJrcyA9XHJcblx0XHRcdFx0XHRwbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcz8uY29tcGxldGVkPy5zcGxpdChcInxcIikgfHwgW1xyXG5cdFx0XHRcdFx0XHRcInhcIixcclxuXHRcdFx0XHRcdFx0XCJYXCIsXHJcblx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdGlmIChjb21wbGV0ZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIFwiY29tcGxldGVkXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBpblByb2dyZXNzTWFya3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmluUHJvZ3Jlc3M/LnNwbGl0KFwifFwiKSB8fCBbXHJcblx0XHRcdFx0XHRcdFwiLVwiLFxyXG5cdFx0XHRcdFx0XHRcIi9cIixcclxuXHRcdFx0XHRcdF07XHJcblx0XHRcdFx0aWYgKGluUHJvZ3Jlc3NNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIFwiaW5Qcm9ncmVzc1wiO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3QgYWJhbmRvbmVkTWFya3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LmFiYW5kb25lZD8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XHRcdFx0XCI+XCIsXHJcblx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdGlmIChhYmFuZG9uZWRNYXJrcy5pbmNsdWRlcyhtYXJrKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIFwiYWJhbmRvbmVkXCI7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRjb25zdCBwbGFubmVkTWFya3MgPVxyXG5cdFx0XHRcdFx0cGx1Z2luPy5zZXR0aW5ncy50YXNrU3RhdHVzZXM/LnBsYW5uZWQ/LnNwbGl0KFwifFwiKSB8fCBbXCI/XCJdO1xyXG5cdFx0XHRcdGlmIChwbGFubmVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRcdHJldHVybiBcInBsYW5uZWRcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIG5vdCBtYXRjaGluZyBhbnkgc3BlY2lmaWMgc3RhdHVzLCBjaGVjayBpZiBpdCdzIGEgbm90LXN0YXJ0ZWQgbWFya1xyXG5cdFx0XHRcdGNvbnN0IG5vdFN0YXJ0ZWRNYXJrcyA9XHJcblx0XHRcdFx0XHRwbHVnaW4/LnNldHRpbmdzLnRhc2tTdGF0dXNlcz8ubm90U3RhcnRlZD8uc3BsaXQoXCJ8XCIpIHx8IFtcclxuXHRcdFx0XHRcdFx0XCIgXCIsXHJcblx0XHRcdFx0XHRdO1xyXG5cdFx0XHRcdGlmIChub3RTdGFydGVkTWFya3MuaW5jbHVkZXMobWFyaykpIHtcclxuXHRcdFx0XHRcdHJldHVybiBcIm5vdFN0YXJ0ZWRcIjtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdC8vIElmIHdlIGdldCBoZXJlLCB0aGUgbWFyayBkb2Vzbid0IG1hdGNoIGFueSBvZiBvdXIgZGVmaW5lZCBjYXRlZ29yaWVzXHJcblx0XHRcdFx0Ly8gVXNlIHRoZSBjb3VudE90aGVyU3RhdHVzZXNBcyBzZXR0aW5nIHRvIGRldGVybWluZSBob3cgdG8gY291bnQgaXRcclxuXHRcdFx0XHRyZXR1cm4gKFxyXG5cdFx0XHRcdFx0KHBsdWdpbj8uc2V0dGluZ3MuY291bnRPdGhlclN0YXR1c2VzQXMgYXNcclxuXHRcdFx0XHRcdFx0fCBcImNvbXBsZXRlZFwiXHJcblx0XHRcdFx0XHRcdHwgXCJpblByb2dyZXNzXCJcclxuXHRcdFx0XHRcdFx0fCBcImFiYW5kb25lZFwiXHJcblx0XHRcdFx0XHRcdHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHRcdFx0fCBcInBsYW5uZWRcIikgfHwgXCJub3RTdGFydGVkXCJcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogQ2hlY2sgaWYgYSB0YXNrIG1hcmtlciBzaG91bGQgYmUgZXhjbHVkZWQgZnJvbSBjb3VudGluZ1xyXG5cdFx0XHQgKi9cclxuXHRcdFx0cHJpdmF0ZSBzaG91bGRFeGNsdWRlVGFzayh0ZXh0OiBzdHJpbmcpOiBib29sZWFuIHtcclxuXHRcdFx0XHQvLyBJZiBubyBleGNsdXNpb24gc2V0dGluZ3MsIHJldHVybiBmYWxzZVxyXG5cdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdCFwbHVnaW4/LnNldHRpbmdzLmV4Y2x1ZGVUYXNrTWFya3MgfHxcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5leGNsdWRlVGFza01hcmtzLmxlbmd0aCA9PT0gMFxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGFzayBtYXJrIGlzIGluIHRoZSBleGNsdXNpb24gbGlzdFxyXG5cdFx0XHRcdGNvbnN0IHRhc2tNYXJrTWF0Y2ggPSB0ZXh0Lm1hdGNoKC9cXFsoLildLyk7XHJcblx0XHRcdFx0aWYgKHRhc2tNYXJrTWF0Y2ggJiYgdGFza01hcmtNYXRjaFsxXSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgdGFza01hcmsgPSB0YXNrTWFya01hdGNoWzFdO1xyXG5cdFx0XHRcdFx0cmV0dXJuIHBsdWdpbi5zZXR0aW5ncy5leGNsdWRlVGFza01hcmtzLmluY2x1ZGVzKHRhc2tNYXJrKTtcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIEdldCB0YWIgc2l6ZSBmcm9tIHZhdWx0IGNvbmZpZ3VyYXRpb25cclxuXHRcdFx0ICovXHJcblx0XHRcdHByaXZhdGUgZ2V0VGFiU2l6ZSgpOiBudW1iZXIge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCB2YXVsdENvbmZpZyA9IGFwcC52YXVsdCBhcyBWYXVsdDtcclxuXHRcdFx0XHRcdGNvbnN0IHVzZVRhYiA9XHJcblx0XHRcdFx0XHRcdHZhdWx0Q29uZmlnLmdldENvbmZpZz8uKFwidXNlVGFiXCIpID09PSB1bmRlZmluZWQgfHxcclxuXHRcdFx0XHRcdFx0dmF1bHRDb25maWcuZ2V0Q29uZmlnPy4oXCJ1c2VUYWJcIikgPT09IHRydWU7XHJcblx0XHRcdFx0XHRjb25zdCB0YWJTaXplID0gdmF1bHRDb25maWcuZ2V0Q29uZmlnPy4oXCJ0YWJTaXplXCIpO1xyXG5cdFx0XHRcdFx0Y29uc3QgbnVtZXJpY1RhYlNpemUgPVxyXG5cdFx0XHRcdFx0XHR0eXBlb2YgdGFiU2l6ZSA9PT0gXCJudW1iZXJcIiA/IHRhYlNpemUgOiA0O1xyXG5cdFx0XHRcdFx0cmV0dXJuIHVzZVRhYiA/IG51bWVyaWNUYWJTaXplIC8gNCA6IG51bWVyaWNUYWJTaXplO1xyXG5cdFx0XHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBnZXR0aW5nIHRhYiBzaXplOlwiLCBlKTtcclxuXHRcdFx0XHRcdHJldHVybiA0OyAvLyBEZWZhdWx0IHRhYiBzaXplXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvKipcclxuXHRcdFx0ICogQ2hlY2sgdGhlIG5lYXJlc3QgcHJlY2VkaW5nIGhlYWRpbmcgdGV4dFxyXG5cdFx0XHQgKiBAcGFyYW0gc3RhdGUgRWRpdG9yU3RhdGVcclxuXHRcdFx0ICogQHBhcmFtIHBvc2l0aW9uIFRoZSBjdXJyZW50IHBvc2l0aW9uIHRvIGNoZWNrXHJcblx0XHRcdCAqIEByZXR1cm5zIFRoZSBoZWFkaW5nIHRleHQgb3IgbnVsbFxyXG5cdFx0XHQgKi9cclxuXHRcdFx0cHJpdmF0ZSBmaW5kTmVhcmVzdFByZWNlZGluZ0hlYWRpbmdUZXh0KFxyXG5cdFx0XHRcdHN0YXRlOiBFZGl0b3JTdGF0ZSxcclxuXHRcdFx0XHRwb3NpdGlvbjogbnVtYmVyXHJcblx0XHRcdCk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0XHRcdC8vIOmmluWFiOajgOafpeW9k+WJjeihjOaYr+WQpuaYr+agh+mimFxyXG5cdFx0XHRcdGNvbnN0IGN1cnJlbnRMaW5lID0gc3RhdGUuZG9jLmxpbmVBdChwb3NpdGlvbik7XHJcblx0XHRcdFx0Y29uc3QgY3VycmVudExpbmVUZXh0ID0gc3RhdGUuZG9jLnNsaWNlU3RyaW5nKFxyXG5cdFx0XHRcdFx0Y3VycmVudExpbmUuZnJvbSxcclxuXHRcdFx0XHRcdGN1cnJlbnRMaW5lLnRvXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0Ly8g5qOA5p+l5b2T5YmN6KGM5piv5ZCm5piv5qCH6aKY5qC85byP77yI5LulICMg5byA5aS077yJXHJcblx0XHRcdFx0aWYgKC9eI3sxLDZ9XFxzKy8udGVzdChjdXJyZW50TGluZVRleHQudHJpbSgpKSkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGN1cnJlbnRMaW5lVGV4dC50cmltKCk7XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRsZXQgbmVhcmVzdEhlYWRpbmdUZXh0OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHRcdFx0XHRsZXQgbmVhcmVzdEhlYWRpbmdQb3MgPSAtMTtcclxuXHJcblx0XHRcdFx0c3ludGF4VHJlZShzdGF0ZSkuaXRlcmF0ZSh7XHJcblx0XHRcdFx0XHR0bzogcG9zaXRpb24sIC8vIE9ubHkgaXRlcmF0ZSB0byB0aGUgY3VycmVudCBwb3NpdGlvblxyXG5cdFx0XHRcdFx0ZW50ZXI6IChub2RlUmVmOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIG5vZGUgdHlwZSBpcyBhIGhlYWRpbmcgKEFUWEhlYWRpbmcxLCBBVFhIZWFkaW5nMiwgLi4uKVxyXG5cdFx0XHRcdFx0XHRpZiAobm9kZVJlZi50eXBlLm5hbWUuc3RhcnRzV2l0aChcImhlYWRlclwiKSkge1xyXG5cdFx0XHRcdFx0XHRcdC8vIEVuc3VyZSB0aGUgaGVhZGluZyBpcyBiZWZvcmUgdGhlIGN1cnJlbnQgcG9zaXRpb24gYW5kIGNsb3NlciB0aGFuIHRoZSBsYXN0IGZvdW5kXHJcblx0XHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdFx0bm9kZVJlZi5mcm9tIDwgcG9zaXRpb24gJiZcclxuXHRcdFx0XHRcdFx0XHRcdG5vZGVSZWYuZnJvbSA+IG5lYXJlc3RIZWFkaW5nUG9zXHJcblx0XHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRuZWFyZXN0SGVhZGluZ1BvcyA9IG5vZGVSZWYuZnJvbTtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbnN0IGxpbmUgPSBzdGF0ZS5kb2MubGluZUF0KG5vZGVSZWYuZnJvbSk7XHJcblx0XHRcdFx0XHRcdFx0XHRuZWFyZXN0SGVhZGluZ1RleHQgPSBzdGF0ZS5kb2NcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnNsaWNlU3RyaW5nKGxpbmUuZnJvbSwgbGluZS50bylcclxuXHRcdFx0XHRcdFx0XHRcdFx0LnRyaW0oKTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0cmV0dXJuIG5lYXJlc3RIZWFkaW5nVGV4dDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0LyoqXHJcblx0XHRcdCAqIENoZWNrIGlmIHRoZSBwb3NpdGlvbiBpcyBkaXNhYmxlZCBieSBoZWFkaW5nXHJcblx0XHRcdCAqIEBwYXJhbSBzdGF0ZSBFZGl0b3JTdGF0ZVxyXG5cdFx0XHQgKiBAcGFyYW0gcG9zaXRpb24gVGhlIHBvc2l0aW9uIHRvIGNoZWNrICh1c3VhbGx5IHRoZSBzdGFydCBvZiB0aGUgbGluZSlcclxuXHRcdFx0ICogQHJldHVybnMgYm9vbGVhblxyXG5cdFx0XHQgKi9cclxuXHRcdFx0cHJpdmF0ZSBpc1Bvc2l0aW9uRW5hYmxlZEJ5SGVhZGluZyhcclxuXHRcdFx0XHRzdGF0ZTogRWRpdG9yU3RhdGUsXHJcblx0XHRcdFx0cG9zaXRpb246IG51bWJlclxyXG5cdFx0XHQpOiBib29sZWFuIHtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiB0aGUgZmVhdHVyZSBpcyBlbmFibGVkIGFuZCB0aGUgZGlzYWJsZWQgbGlzdCBpcyB2YWxpZFxyXG5cdFx0XHRcdGlmICghcGx1Z2luLnNldHRpbmdzLnNob3dQcm9ncmVzc0JhckJhc2VkT25IZWFkaW5nPy50cmltKCkpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Y29uc3QgaGVhZGluZ1RleHQgPSB0aGlzLmZpbmROZWFyZXN0UHJlY2VkaW5nSGVhZGluZ1RleHQoXHJcblx0XHRcdFx0XHRzdGF0ZSxcclxuXHRcdFx0XHRcdHBvc2l0aW9uXHJcblx0XHRcdFx0KTtcclxuXHJcblx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0aGVhZGluZ1RleHQgJiZcclxuXHRcdFx0XHRcdHBsdWdpbi5zZXR0aW5ncy5zaG93UHJvZ3Jlc3NCYXJCYXNlZE9uSGVhZGluZ1xyXG5cdFx0XHRcdFx0XHQuc3BsaXQoXCIsXCIpXHJcblx0XHRcdFx0XHRcdC5pbmNsdWRlcyhoZWFkaW5nVGV4dClcclxuXHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRwdWJsaWMgY2FsY3VsYXRlVGFza3NOdW0oXHJcblx0XHRcdFx0dGV4dEFycmF5OiBzdHJpbmdbXSxcclxuXHRcdFx0XHRidWxsZXQ6IGJvb2xlYW4sXHJcblx0XHRcdFx0Y3VzdG9tR29hbFRvdGFsPzogbnVtYmVyIHwgbnVsbCAvLyBbQ3VzdG9tR29hbEZlYXR1cmVdXHJcblx0XHRcdCk6IFRhc2tzIHtcclxuXHRcdFx0XHRpZiAoIXRleHRBcnJheSB8fCB0ZXh0QXJyYXkubGVuZ3RoID09PSAwKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRjb21wbGV0ZWQ6IDAsXHJcblx0XHRcdFx0XHRcdHRvdGFsOiAwLFxyXG5cdFx0XHRcdFx0XHRpblByb2dyZXNzOiAwLFxyXG5cdFx0XHRcdFx0XHRhYmFuZG9uZWQ6IDAsXHJcblx0XHRcdFx0XHRcdG5vdFN0YXJ0ZWQ6IDAsXHJcblx0XHRcdFx0XHRcdHBsYW5uZWQ6IDAsXHJcblx0XHRcdFx0XHR9O1xyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0Ly8gQ2hlY2sgaWYgdGhlIG5leHQgbGluZSBoYXMgdGhlIHNhbWUgaW5kZW50YXRpb24gYXMgdGhlIGZpcnN0IGxpbmVcclxuXHRcdFx0XHQvLyBJZiBzbywgcmV0dXJuIHplcm8gdGFza3NcclxuXHRcdFx0XHRpZiAodGV4dEFycmF5Lmxlbmd0aCA+IDEgJiYgYnVsbGV0KSB7XHJcblx0XHRcdFx0XHRjb25zdCBmaXJzdExpbmVJbmRlbnQgPVxyXG5cdFx0XHRcdFx0XHR0ZXh0QXJyYXlbMF0ubWF0Y2goL15bXFxzfFxcdF0qLyk/LlswXSB8fCBcIlwiO1xyXG5cdFx0XHRcdFx0Y29uc3Qgc2Vjb25kTGluZUluZGVudCA9XHJcblx0XHRcdFx0XHRcdHRleHRBcnJheVsxXS5tYXRjaCgvXltcXHN8XFx0XSovKT8uWzBdIHx8IFwiXCI7XHJcblxyXG5cdFx0XHRcdFx0aWYgKGZpcnN0TGluZUluZGVudCA9PT0gc2Vjb25kTGluZUluZGVudCkge1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHRcdGNvbXBsZXRlZDogMCxcclxuXHRcdFx0XHRcdFx0XHR0b3RhbDogMCxcclxuXHRcdFx0XHRcdFx0XHRpblByb2dyZXNzOiAwLFxyXG5cdFx0XHRcdFx0XHRcdGFiYW5kb25lZDogMCxcclxuXHRcdFx0XHRcdFx0XHRub3RTdGFydGVkOiAwLFxyXG5cdFx0XHRcdFx0XHRcdHBsYW5uZWQ6IDAsXHJcblx0XHRcdFx0XHRcdH07XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRsZXQgY29tcGxldGVkOiBudW1iZXIgPSAwO1xyXG5cdFx0XHRcdGxldCBpblByb2dyZXNzOiBudW1iZXIgPSAwO1xyXG5cdFx0XHRcdGxldCBhYmFuZG9uZWQ6IG51bWJlciA9IDA7XHJcblx0XHRcdFx0bGV0IG5vdFN0YXJ0ZWQ6IG51bWJlciA9IDA7XHJcblx0XHRcdFx0bGV0IHBsYW5uZWQ6IG51bWJlciA9IDA7XHJcblx0XHRcdFx0bGV0IHRvdGFsOiBudW1iZXIgPSAwO1xyXG5cdFx0XHRcdGxldCBsZXZlbDogbnVtYmVyID0gMDtcclxuXHJcblx0XHRcdFx0Ly8gR2V0IHRhYiBzaXplIGZyb20gdmF1bHQgY29uZmlnXHJcblx0XHRcdFx0Y29uc3QgdGFiU2l6ZSA9IHRoaXMuZ2V0VGFiU2l6ZSgpO1xyXG5cclxuXHRcdFx0XHQvLyBGb3IgZGVidWdnaW5nIC0gY29sbGVjdCB0YXNrIG1hcmtzIGFuZCB0aGVpciBzdGF0dXNlc1xyXG5cdFx0XHRcdGNvbnN0IHRhc2tEZWJ1Zzoge1xyXG5cdFx0XHRcdFx0bWFyazogc3RyaW5nO1xyXG5cdFx0XHRcdFx0c3RhdHVzOiBzdHJpbmc7XHJcblx0XHRcdFx0XHRsaW5lVGV4dDogc3RyaW5nO1xyXG5cdFx0XHRcdH1bXSA9IFtdO1xyXG5cclxuXHRcdFx0XHQvLyBEZXRlcm1pbmUgaW5kZW50YXRpb24gbGV2ZWwgZm9yIGJ1bGxldHNcclxuXHRcdFx0XHRpZiAoIXBsdWdpbj8uc2V0dGluZ3MuY291bnRTdWJMZXZlbCAmJiBidWxsZXQgJiYgdGV4dEFycmF5WzBdKSB7XHJcblx0XHRcdFx0XHRjb25zdCBpbmRlbnRNYXRjaCA9IHRleHRBcnJheVswXS5tYXRjaCgvXltcXHN8XFx0XSovKTtcclxuXHRcdFx0XHRcdGlmIChpbmRlbnRNYXRjaCkge1xyXG5cdFx0XHRcdFx0XHRsZXZlbCA9IGluZGVudE1hdGNoWzBdLmxlbmd0aCAvIHRhYlNpemU7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHQvLyBDcmVhdGUgcmVnZXhlcyBiYXNlZCBvbiBzZXR0aW5ncyBhbmQgY29udGV4dFxyXG5cdFx0XHRcdGNvbnN0IGJ1bGxldFRvdGFsUmVnZXggPSB0aGlzLmNyZWF0ZVRvdGFsVGFza1JlZ2V4KFxyXG5cdFx0XHRcdFx0ZmFsc2UsXHJcblx0XHRcdFx0XHRsZXZlbCxcclxuXHRcdFx0XHRcdHRhYlNpemVcclxuXHRcdFx0XHQpO1xyXG5cclxuXHRcdFx0XHRjb25zdCBoZWFkaW5nVG90YWxSZWdleCA9IHRoaXMuY3JlYXRlVG90YWxUYXNrUmVnZXgodHJ1ZSk7XHJcblxyXG5cdFx0XHRcdC8vIFtDdXN0b21Hb2FsRmVhdHVyZV0gLSBDaGVjayB0byB1c2UgY3VzdG9tIGdvYWxcclxuXHRcdFx0XHRjb25zdCB1c2VUYXNrR29hbDogYm9vbGVhbiA9XHJcblx0XHRcdFx0XHRwbHVnaW4/LnNldHRpbmdzLmFsbG93Q3VzdG9tUHJvZ3Jlc3NHb2FsICYmXHJcblx0XHRcdFx0XHRjdXN0b21Hb2FsVG90YWwgIT09IG51bGw7XHJcblx0XHRcdFx0Ly8gQ291bnQgdGFza3NcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRleHRBcnJheS5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0aWYgKGkgPT09IDApIGNvbnRpbnVlOyAvLyBTa2lwIHRoZSBmaXJzdCBsaW5lXHJcblxyXG5cdFx0XHRcdFx0aWYgKGJ1bGxldCkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCBsaW5lVGV4dCA9IHRleHRBcnJheVtpXTtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbGluZVRleHRUcmltbWVkID0gbGluZVRleHQudHJpbSgpO1xyXG5cclxuXHRcdFx0XHRcdFx0Ly8gSWYgY291bnRTdWJMZXZlbCBpcyBmYWxzZSwgY2hlY2sgdGhlIGluZGVudGF0aW9uIGxldmVsIGRpcmVjdGx5XHJcblx0XHRcdFx0XHRcdGlmICghcGx1Z2luPy5zZXR0aW5ncy5jb3VudFN1YkxldmVsKSB7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgaW5kZW50TWF0Y2ggPSBsaW5lVGV4dC5tYXRjaCgvXltcXHN8XFx0XSovKTtcclxuXHRcdFx0XHRcdFx0XHRjb25zdCBsaW5lTGV2ZWwgPSBpbmRlbnRNYXRjaFxyXG5cdFx0XHRcdFx0XHRcdFx0PyBpbmRlbnRNYXRjaFswXS5sZW5ndGggLyB0YWJTaXplXHJcblx0XHRcdFx0XHRcdFx0XHQ6IDA7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIE9ubHkgY291bnQgdGhpcyB0YXNrIGlmIGl0J3MgZXhhY3RseSBvbmUgbGV2ZWwgZGVlcGVyXHJcblx0XHRcdFx0XHRcdFx0aWYgKGxpbmVMZXZlbCAhPT0gbGV2ZWwgKyAxKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIEZpcnN0IGNoZWNrIGlmIGl0IG1hdGNoZXMgdGFzayBmb3JtYXQsIHRoZW4gY2hlY2sgaWYgaXQgc2hvdWxkIGJlIGV4Y2x1ZGVkXHJcblx0XHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0XHRsaW5lVGV4dFRyaW1tZWQgJiZcclxuXHRcdFx0XHRcdFx0XHRsaW5lVGV4dC5tYXRjaChidWxsZXRUb3RhbFJlZ2V4KSAmJlxyXG5cdFx0XHRcdFx0XHRcdCF0aGlzLnNob3VsZEV4Y2x1ZGVUYXNrKGxpbmVUZXh0VHJpbW1lZClcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dG90YWwrKztcclxuXHRcdFx0XHRcdFx0XHQvLyBHZXQgdGhlIHRhc2sgc3RhdHVzXHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc3RhdHVzID0gdGhpcy5nZXRUYXNrU3RhdHVzKGxpbmVUZXh0VHJpbW1lZCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEV4dHJhY3QgdGhlIG1hcmsgZm9yIGRlYnVnZ2luZ1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1hcmtNYXRjaCA9IGxpbmVUZXh0VHJpbW1lZC5tYXRjaCgvXFxbKC4pXS8pO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChtYXJrTWF0Y2ggJiYgbWFya01hdGNoWzFdKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0YXNrRGVidWcucHVzaCh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1hcms6IG1hcmtNYXRjaFsxXSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzOiBzdGF0dXMsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGxpbmVUZXh0OiBsaW5lVGV4dFRyaW1tZWQsXHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IHRhc2tHb2FsID1cclxuXHRcdFx0XHRcdFx0XHRcdGV4dHJhY3RUYXNrQW5kR29hbEluZm8obGluZVRleHRUcmltbWVkKTsgLy8gQ2hlY2sgZm9yIHRhc2stc3BlY2lmaWMgZ29hbCBbQ3VzdG9tR29hbEZlYXR1cmVdXHJcblx0XHRcdFx0XHRcdFx0Ly8gQ291bnQgYmFzZWQgb24gc3RhdHVzXHJcblx0XHRcdFx0XHRcdFx0aWYgKHN0YXR1cyA9PT0gXCJjb21wbGV0ZWRcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF1c2VUYXNrR29hbCkgY29tcGxldGVkKys7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodXNlVGFza0dvYWwgJiYgdGFza0dvYWwgIT09IG51bGwpXHJcblx0XHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZCArPSB0YXNrR29hbDtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJpblByb2dyZXNzXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghdXNlVGFza0dvYWwpIGluUHJvZ3Jlc3MrKztcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh1c2VUYXNrR29hbCAmJiB0YXNrR29hbCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdFx0XHRcdFx0aW5Qcm9ncmVzcyArPSB0YXNrR29hbDtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJhYmFuZG9uZWRcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCF1c2VUYXNrR29hbCkgYWJhbmRvbmVkKys7XHJcblx0XHRcdFx0XHRcdFx0XHRpZiAodXNlVGFza0dvYWwgJiYgdGFza0dvYWwgIT09IG51bGwpXHJcblx0XHRcdFx0XHRcdFx0XHRcdGFiYW5kb25lZCArPSB0YXNrR29hbDtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJwbGFubmVkXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghdXNlVGFza0dvYWwpIHBsYW5uZWQrKztcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh1c2VUYXNrR29hbCAmJiB0YXNrR29hbCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdFx0XHRcdFx0cGxhbm5lZCArPSB0YXNrR29hbDtcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJub3RTdGFydGVkXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghdXNlVGFza0dvYWwpIG5vdFN0YXJ0ZWQrKztcclxuXHRcdFx0XHRcdFx0XHRcdGlmICh1c2VUYXNrR29hbCAmJiB0YXNrR29hbCAhPT0gbnVsbClcclxuXHRcdFx0XHRcdFx0XHRcdFx0bm90U3RhcnRlZCArPSB0YXNrR29hbDtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH0gZWxzZSBpZiAocGx1Z2luPy5zZXR0aW5ncy5hZGRUYXNrUHJvZ3Jlc3NCYXJUb0hlYWRpbmcpIHtcclxuXHRcdFx0XHRcdFx0Y29uc3QgbGluZVRleHQgPSB0ZXh0QXJyYXlbaV07XHJcblx0XHRcdFx0XHRcdGNvbnN0IGxpbmVUZXh0VHJpbW1lZCA9IGxpbmVUZXh0LnRyaW0oKTtcclxuXHJcblx0XHRcdFx0XHRcdC8vIEZvciBoZWFkaW5ncywgaWYgY291bnRTdWJMZXZlbCBpcyBmYWxzZSwgb25seSBjb3VudCB0b3AtbGV2ZWwgdGFza3MgKG5vIGluZGVudGF0aW9uKVxyXG5cdFx0XHRcdFx0XHRpZiAoIXBsdWdpbj8uc2V0dGluZ3MuY291bnRTdWJMZXZlbCkge1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IGluZGVudE1hdGNoID0gbGluZVRleHQubWF0Y2goL15bXFxzfFxcdF0qLyk7XHJcblx0XHRcdFx0XHRcdFx0Y29uc3QgbGluZUxldmVsID0gaW5kZW50TWF0Y2hcclxuXHRcdFx0XHRcdFx0XHRcdD8gaW5kZW50TWF0Y2hbMF0ubGVuZ3RoIC8gdGFiU2l6ZVxyXG5cdFx0XHRcdFx0XHRcdFx0OiAwO1xyXG5cclxuXHRcdFx0XHRcdFx0XHQvLyBGb3IgaGVhZGluZ3MsIG9ubHkgY291bnQgdGFza3Mgd2l0aCBubyBpbmRlbnRhdGlvbiB3aGVuIGNvdW50U3ViTGV2ZWwgaXMgZmFsc2VcclxuXHRcdFx0XHRcdFx0XHRpZiAobGluZUxldmVsICE9PSAwKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb250aW51ZTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdC8vIEFsc28gdXNlIHNob3VsZEV4Y2x1ZGVUYXNrIGZvciBhZGRpdGlvbmFsIHZhbGlkYXRpb25cclxuXHRcdFx0XHRcdFx0aWYgKFxyXG5cdFx0XHRcdFx0XHRcdGxpbmVUZXh0VHJpbW1lZCAmJlxyXG5cdFx0XHRcdFx0XHRcdGxpbmVUZXh0Lm1hdGNoKGhlYWRpbmdUb3RhbFJlZ2V4KSAmJlxyXG5cdFx0XHRcdFx0XHRcdCF0aGlzLnNob3VsZEV4Y2x1ZGVUYXNrKGxpbmVUZXh0VHJpbW1lZClcclxuXHRcdFx0XHRcdFx0KSB7XHJcblx0XHRcdFx0XHRcdFx0dG90YWwrKztcclxuXHRcdFx0XHRcdFx0XHQvLyBHZXQgdGhlIHRhc2sgc3RhdHVzXHJcblx0XHRcdFx0XHRcdFx0Y29uc3Qgc3RhdHVzID0gdGhpcy5nZXRUYXNrU3RhdHVzKGxpbmVUZXh0VHJpbW1lZCk7XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIEV4dHJhY3QgdGhlIG1hcmsgZm9yIGRlYnVnZ2luZ1xyXG5cdFx0XHRcdFx0XHRcdGNvbnN0IG1hcmtNYXRjaCA9IGxpbmVUZXh0VHJpbW1lZC5tYXRjaCgvXFxbKC4pXS8pO1xyXG5cdFx0XHRcdFx0XHRcdGlmIChtYXJrTWF0Y2ggJiYgbWFya01hdGNoWzFdKSB7XHJcblx0XHRcdFx0XHRcdFx0XHR0YXNrRGVidWcucHVzaCh7XHJcblx0XHRcdFx0XHRcdFx0XHRcdG1hcms6IG1hcmtNYXRjaFsxXSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0c3RhdHVzOiBzdGF0dXMsXHJcblx0XHRcdFx0XHRcdFx0XHRcdGxpbmVUZXh0OiBsaW5lVGV4dFRyaW1tZWQsXHJcblx0XHRcdFx0XHRcdFx0XHR9KTtcclxuXHRcdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRcdC8vIENvdW50IGJhc2VkIG9uIHN0YXR1c1xyXG5cdFx0XHRcdFx0XHRcdGlmIChzdGF0dXMgPT09IFwiY29tcGxldGVkXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdGNvbXBsZXRlZCsrO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzID09PSBcImluUHJvZ3Jlc3NcIikge1xyXG5cdFx0XHRcdFx0XHRcdFx0aW5Qcm9ncmVzcysrO1xyXG5cdFx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoc3RhdHVzID09PSBcImFiYW5kb25lZFwiKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRhYmFuZG9uZWQrKztcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJwbGFubmVkXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdHBsYW5uZWQrKztcclxuXHRcdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHN0YXR1cyA9PT0gXCJub3RTdGFydGVkXCIpIHtcclxuXHRcdFx0XHRcdFx0XHRcdG5vdFN0YXJ0ZWQrKztcclxuXHRcdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gW0N1c3RvbUdvYWxGZWF0dXJlXSAtIENoZWNrIGJ1bGxldCB0byBza2lwIHdoZW4gdGhlIHByb2dyZXNzIGlzIGluIGhlYWRpbmcuIEltcGxlbWVudCBpbiB0aGUgZnV0dXJlXHJcblx0XHRcdFx0aWYgKHVzZVRhc2tHb2FsICYmIGJ1bGxldCkgdG90YWwgPSBjdXN0b21Hb2FsVG90YWwgfHwgMDtcclxuXHRcdFx0XHQvLyBFbnN1cmUgY291bnRzIGRvbid0IGV4Y2VlZCB0b3RhbFxyXG5cdFx0XHRcdGNvbXBsZXRlZCA9IE1hdGgubWluKGNvbXBsZXRlZCwgdG90YWwpO1xyXG5cdFx0XHRcdGluUHJvZ3Jlc3MgPSBNYXRoLm1pbihpblByb2dyZXNzLCB0b3RhbCAtIGNvbXBsZXRlZCk7XHJcblx0XHRcdFx0YWJhbmRvbmVkID0gTWF0aC5taW4oYWJhbmRvbmVkLCB0b3RhbCAtIGNvbXBsZXRlZCAtIGluUHJvZ3Jlc3MpO1xyXG5cdFx0XHRcdHBsYW5uZWQgPSBNYXRoLm1pbihcclxuXHRcdFx0XHRcdHBsYW5uZWQsXHJcblx0XHRcdFx0XHR0b3RhbCAtIGNvbXBsZXRlZCAtIGluUHJvZ3Jlc3MgLSBhYmFuZG9uZWRcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdG5vdFN0YXJ0ZWQgPVxyXG5cdFx0XHRcdFx0dG90YWwgLSBjb21wbGV0ZWQgLSBpblByb2dyZXNzIC0gYWJhbmRvbmVkIC0gcGxhbm5lZDtcclxuXHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdGNvbXBsZXRlZCxcclxuXHRcdFx0XHRcdHRvdGFsLFxyXG5cdFx0XHRcdFx0aW5Qcm9ncmVzcyxcclxuXHRcdFx0XHRcdGFiYW5kb25lZCxcclxuXHRcdFx0XHRcdG5vdFN0YXJ0ZWQsXHJcblx0XHRcdFx0XHRwbGFubmVkLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdHByb3ZpZGU6IChwbHVnaW4pID0+IFtcclxuXHRcdFx0XHRFZGl0b3JWaWV3LmRlY29yYXRpb25zLm9mKFxyXG5cdFx0XHRcdFx0KHYpID0+XHJcblx0XHRcdFx0XHRcdHYucGx1Z2luKHBsdWdpbik/LnByb2dyZXNzRGVjb3JhdGlvbnMgfHwgRGVjb3JhdGlvbi5ub25lXHJcblx0XHRcdFx0KSxcclxuXHRcdFx0XSxcclxuXHRcdH1cclxuXHQpO1xyXG59XHJcbiJdfQ==