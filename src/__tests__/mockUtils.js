import { __awaiter } from "tslib";
import { EditorState, EditorSelection, } from "@codemirror/state";
const mockAnnotationType = {
    of: jest.fn().mockImplementation((value) => ({
        type: mockAnnotationType,
        value,
    })),
};
// Create mock annotation object to avoid circular dependency
const mockParentTaskStatusChangeAnnotation = {
    of: jest.fn().mockImplementation((value) => ({
        type: mockParentTaskStatusChangeAnnotation,
        value,
    })),
};
// Mock Text Object - Consolidated version
export const createMockText = (content) => {
    const lines = content.split("\n");
    const doc = {
        toString: () => content,
        length: content.length,
        lines: lines.length,
        line: jest.fn((lineNum) => {
            if (lineNum < 1 || lineNum > lines.length) {
                throw new Error(`Line ${lineNum} out of range (1-${lines.length})`);
            }
            const text = lines[lineNum - 1];
            let from = 0;
            for (let i = 0; i < lineNum - 1; i++) {
                from += lines[i].length + 1; // +1 for newline
            }
            return {
                text: text,
                from,
                to: from + text.length,
                number: lineNum,
                length: text.length,
            };
        }),
        lineAt: jest.fn((pos) => {
            // Ensure pos is within valid range
            pos = Math.max(0, Math.min(pos, content.length));
            let currentPos = 0;
            for (let i = 0; i < lines.length; i++) {
                const lineLength = lines[i].length;
                const lineStart = currentPos;
                const lineEnd = currentPos + lineLength;
                // Check if pos is within the current line or at the very end of the document
                if (pos >= lineStart && pos <= lineEnd) {
                    return {
                        text: lines[i],
                        from: lineStart,
                        to: lineEnd,
                        number: i + 1,
                        length: lineLength,
                    };
                }
                currentPos += lineLength + 1; // +1 for newline
            }
            // Handle edge case: position at the very end of the file after the last newline
            if (pos === content.length &&
                lines.length > 0 &&
                content.endsWith("\n")) {
                const lastLineIndex = lines.length - 1;
                const lastLine = lines[lastLineIndex];
                let from = content.length - lastLine.length - 1; // Position after the last newline
                return {
                    text: lastLine,
                    from: from,
                    to: from + lastLine.length,
                    number: lines.length,
                    length: lastLine.length,
                };
            }
            else if (pos === content.length &&
                lines.length > 0 &&
                !content.endsWith("\n")) {
                // Position exactly at the end of the last line (no trailing newline)
                const lastLineIndex = lines.length - 1;
                const lastLine = lines[lastLineIndex];
                let from = 0;
                for (let i = 0; i < lastLineIndex; i++) {
                    from += lines[i].length + 1;
                }
                return {
                    text: lastLine,
                    from: from,
                    to: from + lastLine.length,
                    number: lines.length,
                    length: lastLine.length,
                };
            }
            // If the content is empty or pos is 0 in an empty doc
            if (content === "" && pos === 0) {
                return {
                    text: "",
                    from: 0,
                    to: 0,
                    number: 1,
                    length: 0,
                };
            }
        }),
        sliceString: jest.fn((from, to) => content.slice(from, to)),
    };
    // Avoid circular reference that causes JSON serialization issues
    // Use getter to lazily return self-reference only when needed
    Object.defineProperty(doc, 'doc', {
        get: function () { return this; },
        enumerable: false // Don't include in JSON serialization
    });
    return doc;
};
// Mock ChangeSet - Consolidated version
const createMockChangeSet = (doc, changes = []) => {
    return {
        length: doc.length,
        // @ts-ignore
        iterChanges: jest.fn((callback) => {
            changes.forEach((change) => {
                var _a, _b, _c, _d, _e;
                // Basic validation to prevent errors on undefined values
                const fromA = (_a = change.fromA) !== null && _a !== void 0 ? _a : 0;
                const toA = (_b = change.toA) !== null && _b !== void 0 ? _b : fromA;
                const fromB = (_c = change.fromB) !== null && _c !== void 0 ? _c : 0;
                const insertedText = (_d = change.insertedText) !== null && _d !== void 0 ? _d : "";
                const toB = (_e = change.toB) !== null && _e !== void 0 ? _e : fromB + insertedText.length;
                callback(fromA, toA, fromB, toB, createMockText(insertedText) // inserted text needs to be a Text object
                );
            });
        }),
        // Add other necessary ChangeSet methods if needed, even if mocked simply
        // @ts-ignore
        mapDesc: jest.fn(() => ({
        /* mock */
        })),
        // @ts-ignore
        compose: jest.fn(() => ({
        /* mock */
        })),
        // @ts-ignore
        mapPos: jest.fn(() => 0),
        // @ts-ignore
        toJSON: jest.fn(() => ({
        /* mock */
        })),
        // @ts-ignore
        any: jest.fn(() => false),
        // @ts-ignore
        get desc() {
            return {
            /* mock */
            };
        },
        // @ts-ignore
        get empty() {
            return changes.length === 0;
        },
        // ... and potentially others like 'apply', 'invert', etc. if used
    };
};
// Mock Transaction Object - Consolidated version
const createMockTransaction = (options) => {
    var _a, _b, _c, _d;
    const startDoc = createMockText((_a = options.startStateDocContent) !== null && _a !== void 0 ? _a : "");
    const newDoc = createMockText((_c = (_b = options.newDocContent) !== null && _b !== void 0 ? _b : options.startStateDocContent) !== null && _c !== void 0 ? _c : "");
    // Ensure changes array exists and is valid
    const validChanges = ((_d = options.changes) === null || _d === void 0 ? void 0 : _d.map((c) => {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        return ({
            fromA: (_a = c.fromA) !== null && _a !== void 0 ? _a : 0,
            toA: (_c = (_b = c.toA) !== null && _b !== void 0 ? _b : c.fromA) !== null && _c !== void 0 ? _c : 0,
            fromB: (_d = c.fromB) !== null && _d !== void 0 ? _d : 0,
            insertedText: (_e = c.insertedText) !== null && _e !== void 0 ? _e : "",
            toB: (_f = c.toB) !== null && _f !== void 0 ? _f : ((_g = c.fromB) !== null && _g !== void 0 ? _g : 0) + ((_h = c.insertedText) !== null && _h !== void 0 ? _h : "").length,
        });
    })) || [];
    const changeSet = createMockChangeSet(newDoc, validChanges);
    // Create a proper EditorSelection object instead of just using an anchor/head object
    const selectionObj = options.selection || { anchor: 0, head: 0 };
    const editorSelection = EditorSelection.single(selectionObj.anchor, selectionObj.head); // Use EditorSelection.single for proper creation
    // Create start state selection
    const startSelectionObj = { anchor: 0, head: 0 };
    const startEditorSelection = EditorSelection.single(startSelectionObj.anchor, startSelectionObj.head);
    const mockTr = {
        newDoc: newDoc,
        changes: changeSet,
        docChanged: options.docChanged !== undefined
            ? options.docChanged
            : !!validChanges.length,
        isUserEvent: jest.fn((type) => {
            if (options.isUserEvent === false)
                return false;
            return options.isUserEvent === type;
        }),
        annotation: jest.fn((type) => {
            var _a;
            const found = (_a = options.annotations) === null || _a === void 0 ? void 0 : _a.find((ann) => ann.type === type);
            return found ? found.value : undefined;
        }),
        selection: editorSelection,
        // Add required Transaction properties with basic mocks
        effects: [],
        scrollIntoView: false,
        newSelection: editorSelection,
        state: {
            doc: newDoc,
            selection: editorSelection,
            // Add other required state properties with basic mocks
            facet: jest.fn(() => null),
            field: jest.fn(() => null),
            fieldInvalidated: jest.fn(() => false),
            toJSON: jest.fn(() => ({})),
            replaceSelection: jest.fn(),
            changeByRange: jest.fn(),
            changes: jest.fn(),
            toText: jest.fn(() => newDoc),
            // @ts-ignore
            values: [],
            // @ts-ignore
            apply: jest.fn(() => ({})),
            // @ts-ignore
            update: jest.fn(() => ({})),
            // @ts-ignore
            sliceDoc: jest.fn(() => ""),
        },
        startState: EditorState.create({
            doc: startDoc,
            selection: startEditorSelection
        }),
        reconfigured: false,
    };
    return mockTr;
};
// Mock App Object - Consolidated version
const createMockApp = () => {
    // Create a mock app object with all necessary properties
    const mockApp = {
        // Workspace mock
        workspace: {
            getActiveFile: jest.fn(() => ({
                path: "test.md",
                name: "test.md",
            })),
            getActiveViewOfType: jest.fn(),
            getLeaf: jest.fn(),
            createLeafBySplit: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            trigger: jest.fn(),
            onLayoutReady: jest.fn(),
        },
        // MetadataCache mock
        metadataCache: {
            getFileCache: jest.fn(() => ({
                headings: [],
            })),
            getCache: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            trigger: jest.fn(),
        },
        // Vault mock with all necessary methods for ActionExecutor tests
        vault: {
            getFileByPath: jest.fn(),
            getAbstractFileByPath: jest.fn(),
            read: jest.fn(),
            modify: jest.fn(),
            create: jest.fn(),
            createFolder: jest.fn(),
            delete: jest.fn(),
            rename: jest.fn(),
            exists: jest.fn(),
            getFiles: jest.fn(() => []),
            getFolders: jest.fn(() => []),
            on: jest.fn(),
            off: jest.fn(),
            trigger: jest.fn(),
        },
        // Keymap mock
        keymap: {
            pushScope: jest.fn(),
            popScope: jest.fn(),
            getModifiers: jest.fn(),
        },
        // Scope mock
        scope: {
            register: jest.fn(),
            unregister: jest.fn(),
        },
        // FileManager mock
        fileManager: {
            generateMarkdownLink: jest.fn(),
            getNewFileParent: jest.fn(),
            processFrontMatter: jest.fn(),
        },
        // MetadataTypeManager mock
        metadataTypeManager: {
            getPropertyInfo: jest.fn(),
            getAllPropertyInfos: jest.fn(),
        },
        // Additional App properties that might be needed
        plugins: {
            plugins: {},
            manifests: {},
            enabledPlugins: new Set(),
            getPlugin: jest.fn(),
            enablePlugin: jest.fn(),
            disablePlugin: jest.fn(),
        },
        // Storage methods
        loadLocalStorage: jest.fn(),
        saveLocalStorage: jest.fn(),
        // Event handling
        on: jest.fn(),
        off: jest.fn(),
        trigger: jest.fn(),
        // Other common App methods
        openWithDefaultApp: jest.fn(),
        showInFolder: jest.fn(),
    };
    return mockApp;
};
// Mock Plugin Object - Consolidated version with merged settings
const createMockPlugin = (settings = {} // Use TaskProgressBarSettings directly
) => {
    const defaults = {
        // Default settings from both original versions combined
        markParentInProgressWhenPartiallyComplete: true,
        taskStatuses: {
            inProgress: "/",
            completed: "x|X",
            abandoned: "-",
            planned: "?",
            notStarted: " ",
        },
        taskStatusCycle: ["TODO", "IN_PROGRESS", "DONE"],
        taskStatusMarks: { TODO: " ", IN_PROGRESS: "/", DONE: "x" },
        excludeMarksFromCycle: [],
        workflow: {
            enableWorkflow: false,
            autoRemoveLastStageMarker: true,
            autoAddTimestamp: false,
            timestampFormat: "YYYY-MM-DD HH:mm:ss",
            removeTimestampOnTransition: false,
            calculateSpentTime: false,
            spentTimeFormat: "HH:mm",
            definitions: [],
            autoAddNextTask: false,
            calculateFullSpentTime: false,
        },
        // Add sorting defaults
        sortTasks: true,
        sortCriteria: [
            { field: "completed", order: "asc" },
            { field: "status", order: "asc" },
            { field: "priority", order: "asc" },
            { field: "dueDate", order: "asc" },
        ],
        // Add metadata format default
        preferMetadataFormat: "tasks",
    };
    // Deep merge provided settings with defaults
    // Basic deep merge - might need a library for complex nested objects if issues arise
    const mergedSettings = Object.assign(Object.assign(Object.assign({}, defaults), settings), { taskStatuses: Object.assign(Object.assign({}, defaults.taskStatuses), settings.taskStatuses), taskStatusMarks: Object.assign(Object.assign({}, defaults.taskStatusMarks), settings.taskStatusMarks), workflow: Object.assign(Object.assign({}, defaults.workflow), settings.workflow), sortCriteria: settings.sortCriteria || defaults.sortCriteria });
    // Create mock app instance
    const mockApp = createMockApp();
    // Create mock task manager with Canvas task updater
    // Mock dataflowOrchestrator and writeAPI instead of taskManager
    const mockDataflowOrchestrator = {
        getQueryAPI: jest.fn(() => ({
            getAllTasks: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { return []; })),
            getAllTasksSync: jest.fn(() => []),
            getTaskById: jest.fn((id) => __awaiter(void 0, void 0, void 0, function* () { return null; })),
            getTaskByIdSync: jest.fn((id) => null),
            ensureCache: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { })),
        })),
        rebuild: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { })),
    };
    const mockWriteAPI = {
        updateTask: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { return ({ success: true }); })),
        createTask: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { return ({ success: true }); })),
        deleteTask: jest.fn(() => __awaiter(void 0, void 0, void 0, function* () { return ({ success: true }); })),
    };
    // Return the plugin with all necessary properties
    return {
        settings: mergedSettings,
        app: mockApp,
        dataflowOrchestrator: mockDataflowOrchestrator,
        writeAPI: mockWriteAPI,
        taskManager: {
            getCanvasTaskUpdater: jest.fn(),
        },
        rewardManager: {
            // Mock RewardManager
            showReward: jest.fn(),
            addReward: jest.fn(),
        },
        habitManager: {
            // Mock HabitManager
            getHabits: jest.fn(() => []),
            addHabit: jest.fn(),
            updateHabit: jest.fn(),
        },
        icsManager: {
            // Mock IcsManager
            getEvents: jest.fn(() => []),
            refreshEvents: jest.fn(),
        },
        versionManager: {
            // Mock VersionManager
            getCurrentVersion: jest.fn(() => "1.0.0"),
            checkForUpdates: jest.fn(),
        },
        rebuildProgressManager: {
            // Mock RebuildProgressManager
            startRebuild: jest.fn(),
            getProgress: jest.fn(() => 0),
        },
        preloadedTasks: [],
        settingTab: {
            // Mock SettingTab
            display: jest.fn(),
            hide: jest.fn(),
        },
        // Plugin lifecycle methods
        onload: jest.fn(),
        onunload: jest.fn(),
        // Command registration methods
        registerCommands: jest.fn(),
        registerEditorExt: jest.fn(),
        // Settings methods
        loadSettings: jest.fn(),
        saveSettings: jest.fn(),
        // View methods
        loadViews: jest.fn(),
        activateTaskView: jest.fn(),
        activateTimelineSidebarView: jest.fn(),
        triggerViewUpdate: jest.fn(),
        getIcsManager: jest.fn(),
        initializeTaskManagerWithVersionCheck: jest.fn(),
        // Plugin base class properties
        addRibbonIcon: jest.fn(),
        addCommand: jest.fn(),
        addSettingTab: jest.fn(),
        registerView: jest.fn(),
        registerEditorExtension: jest.fn(),
        registerMarkdownPostProcessor: jest.fn(),
        registerEvent: jest.fn(),
        addChild: jest.fn(),
        removeChild: jest.fn(),
        register: jest.fn(),
        registerInterval: jest.fn(),
        registerDomEvent: jest.fn(),
        registerObsidianProtocolHandler: jest.fn(),
        registerEditorSuggest: jest.fn(),
        registerHoverLinkSource: jest.fn(),
        registerMarkdownCodeBlockProcessor: jest.fn(),
        // Plugin manifest and loading state
        manifest: {
            id: "task-progress-bar",
            name: "Task Progress Bar",
            version: "1.0.0",
            minAppVersion: "0.15.0",
            description: "Mock plugin for testing",
            author: "Test Author",
            authorUrl: "",
            fundingUrl: "",
            isDesktopOnly: false,
        },
        _loaded: true,
    };
};
// Mock EditorView Object
const createMockEditorView = (docContent) => {
    const doc = createMockText(docContent);
    const mockState = {
        doc: doc,
        // Add other minimal required EditorState properties/methods if needed by the tests
        // For sortTasks, primarily 'doc' is accessed via view.state.doc
        facet: jest.fn(() => []),
        field: jest.fn(() => undefined),
        fieldInvalidated: jest.fn(() => false),
        toJSON: jest.fn(() => ({})),
        replaceSelection: jest.fn(),
        changeByRange: jest.fn(),
        changes: jest.fn(() => ({
        /* mock ChangeSet */
        })),
        toText: jest.fn(() => doc),
        sliceDoc: jest.fn((from = 0, to = doc.length) => doc.sliceString(from, to)),
        // @ts-ignore
        values: [],
        // @ts-ignore
        apply: jest.fn((tr) => mockState),
        // @ts-ignore
        update: jest.fn((spec) => ({
            state: mockState,
            transactions: [],
        })),
        // @ts-ignore
        selection: {
            ranges: [{ from: 0, to: 0 }],
            mainIndex: 0,
            main: { from: 0, to: 0 },
        }, // Minimal selection mock
    };
    const mockView = {
        state: mockState,
        dispatch: jest.fn(), // Mock dispatch function
        // Add other EditorView properties/methods if needed by tests
        // For example, if viewport information is accessed
        // viewport: { from: 0, to: doc.length },
        // contentDOM: document.createElement('div'), // Basic DOM element mock
    };
    return mockView;
};
// Canvas Testing Utilities
/**
 * Create mock Canvas data
 */
export function createMockCanvasData(nodes = [], edges = []) {
    return {
        nodes,
        edges,
    };
}
/**
 * Create mock Canvas text node
 */
export function createMockCanvasTextNode(id, text, x = 0, y = 0, width = 250, height = 60) {
    return {
        type: "text",
        id,
        x,
        y,
        width,
        height,
        text,
    };
}
/**
 * Create mock Canvas task with metadata
 */
export function createMockCanvasTask(id, content, filePath, nodeId, completed = false, originalMarkdown) {
    return {
        id,
        content,
        filePath,
        line: 0,
        completed,
        status: completed ? "x" : " ",
        originalMarkdown: originalMarkdown || `- [${completed ? "x" : " "}] ${content}`,
        metadata: {
            sourceType: "canvas",
            canvasNodeId: nodeId,
            tags: [],
            children: [],
        },
    };
}
/**
 * Create mock execution context for onCompletion tests
 */
export function createMockExecutionContext(task, plugin, app) {
    return {
        task,
        plugin: plugin || createMockPlugin(),
        app: app || createMockApp(),
    };
}
/**
 * Mock Canvas task updater with common methods
 */
export function createMockCanvasTaskUpdater() {
    return {
        deleteCanvasTask: jest.fn(),
        moveCanvasTask: jest.fn(),
        duplicateCanvasTask: jest.fn(),
        addTaskToCanvasNode: jest.fn(),
        isCanvasTask: jest.fn(),
    };
}
/**
 * Create a mock Task object with all required fields
 */
export function createMockTask(overrides = {}) {
    return Object.assign({ id: "test-task-id", content: "Test task content", completed: false, status: " ", metadata: Object.assign({ tags: [], children: [] }, overrides.metadata), filePath: "test.md", line: 1, originalMarkdown: "- [ ] Test task content" }, overrides);
}
export { 
// createMockText is already exported inline
createMockChangeSet, // Export the consolidated function
createMockTransaction, // Export the consolidated function
createMockApp, // Export the consolidated function
createMockPlugin, // Export the consolidated function
mockParentTaskStatusChangeAnnotation, createMockEditorView, // Export the new function
 };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1V0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibW9ja1V0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFDQSxPQUFPLEVBSU4sV0FBVyxFQUdYLGVBQWUsR0FFZixNQUFNLG1CQUFtQixDQUFDO0FBVTNCLE1BQU0sa0JBQWtCLEdBQUc7SUFDMUIsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEtBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxJQUFJLEVBQUUsa0JBQWtCO1FBQ3hCLEtBQUs7S0FDTCxDQUFDLENBQUM7Q0FDSCxDQUFDO0FBQ0YsNkRBQTZEO0FBQzdELE1BQU0sb0NBQW9DLEdBQUc7SUFDNUMsRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLEtBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNwRCxJQUFJLEVBQUUsb0NBQW9DO1FBQzFDLEtBQUs7S0FDTCxDQUFDLENBQUM7Q0FDSCxDQUFDO0FBRUYsMENBQTBDO0FBQzFDLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQWUsRUFBUSxFQUFFO0lBQ3ZELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEMsTUFBTSxHQUFHLEdBQUc7UUFDWCxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztRQUN2QixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07UUFDdEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxNQUFNO1FBQ25CLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBZSxFQUFFLEVBQUU7WUFDakMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFO2dCQUMxQyxNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsT0FBTyxvQkFBb0IsS0FBSyxD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TixnQkFBZ0IsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQzNCLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ3pCLG1CQUFtQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7UUFDOUIsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUM5QixZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtLQUN2QixDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGNBQWMsQ0FBQyxZQUEyQixFQUFFO0lBQzNELHVCQUNDLEVBQUUsRUFBRSxjQUFjLEVBQ2xCLE9BQU8sRUFBRSxtQkFBbUIsRUFDNUIsU0FBUyxFQUFFLEtBQUssRUFDaEIsTUFBTSxFQUFFLEdBQUcsRUFDWCxRQUFRLGtCQUNQLElBQUksRUFBRSxFQUFFLEVBQ1IsUUFBUSxFQUFFLEVBQUUsSUFDVCxTQUFTLENBQUMsUUFBUSxHQUV0QixRQUFRLEVBQUUsU0FBUyxFQUNuQixJQUFJLEVBQUUsQ0FBQyxFQUNQLGdCQUFnQixFQUFFLHlCQUF5QixJQUN4QyxTQUFTLEVBQ1g7QUFDSCxDQUFDO0FBRUQsT0FBTztBQUNOLDRDQUE0QztBQUM1QyxtQkFBbUIsRUFBRSxtQ0FBbUM7QUFDeEQscUJBQXFCLEVBQUUsbUNBQW1DO0FBQzFELGFBQWEsRUFBRSxtQ0FBbUM7QUFDbEQsZ0JBQWdCLEVBQUUsbUNBQW1DO0FBQ3JELG9DQUFvQyxFQUNwQyxvQkFBb0IsRUFBRSwwQkFBMEI7RUFDaEQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQge1xyXG5cdFRleHQsXHJcblx0VHJhbnNhY3Rpb24sXHJcblx0VHJhbnNhY3Rpb25TcGVjLFxyXG5cdEVkaXRvclN0YXRlLFxyXG5cdENoYW5nZVNldCxcclxuXHRBbm5vdGF0aW9uLFxyXG5cdEVkaXRvclNlbGVjdGlvbixcclxuXHRBbm5vdGF0aW9uVHlwZSxcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjsgLy8gQWRqdXN0IHRoZSBpbXBvcnQgcGF0aCBhcyBuZWNlc3NhcnlcclxuLy8gUmVtb3ZlIGNpcmN1bGFyIGRlcGVuZGVuY3kgaW1wb3J0XHJcbi8vIGltcG9ydCB7XHJcbi8vIFx0dGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24sIC8vIEltcG9ydCB0aGUgYWN0dWFsIGFubm90YXRpb25cclxuLy8gfSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvYXV0b2NvbXBsZXRlL3BhcmVudC10YXNrLXVwZGF0ZXJcIjsgLy8gQWRqdXN0IHRoZSBpbXBvcnQgcGF0aCBhcyBuZWNlc3NhcnlcclxuaW1wb3J0IHsgVGFza1Byb2dyZXNzQmFyU2V0dGluZ3MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5pbXBvcnQgeyBFZGl0b3JWaWV3IH0gZnJvbSBcIkBjb2RlbWlycm9yL3ZpZXdcIjtcclxuaW1wb3J0IHsgVGFzayB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcblxyXG5jb25zdCBtb2NrQW5ub3RhdGlvblR5cGUgPSB7XHJcblx0b2Y6IGplc3QuZm4oKS5tb2NrSW1wbGVtZW50YXRpb24oKHZhbHVlOiBzdHJpbmcpID0+ICh7XHJcblx0XHR0eXBlOiBtb2NrQW5ub3RhdGlvblR5cGUsXHJcblx0XHR2YWx1ZSxcclxuXHR9KSksXHJcbn07XHJcbi8vIENyZWF0ZSBtb2NrIGFubm90YXRpb24gb2JqZWN0IHRvIGF2b2lkIGNpcmN1bGFyIGRlcGVuZGVuY3lcclxuY29uc3QgbW9ja1BhcmVudFRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uID0ge1xyXG5cdG9mOiBqZXN0LmZuKCkubW9ja0ltcGxlbWVudGF0aW9uKCh2YWx1ZTogc3RyaW5nKSA9PiAoe1xyXG5cdFx0dHlwZTogbW9ja1BhcmVudFRhc2tTdGF0dXNDaGFuZ2VBbm5vdGF0aW9uLFxyXG5cdFx0dmFsdWUsXHJcblx0fSkpLFxyXG59O1xyXG5cclxuLy8gTW9jayBUZXh0IE9iamVjdCAtIENvbnNvbGlkYXRlZCB2ZXJzaW9uXHJcbmV4cG9ydCBjb25zdCBjcmVhdGVNb2NrVGV4dCA9IChjb250ZW50OiBzdHJpbmcpOiBUZXh0ID0+IHtcclxuXHRjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0Y29uc3QgZG9jID0ge1xyXG5cdFx0dG9TdHJpbmc6ICgpID0+IGNvbnRlbnQsXHJcblx0XHRsZW5ndGg6IGNvbnRlbnQubGVuZ3RoLFxyXG5cdFx0bGluZXM6IGxpbmVzLmxlbmd0aCxcclxuXHRcdGxpbmU6IGplc3QuZm4oKGxpbmVOdW06IG51bWJlcikgPT4ge1xyXG5cdFx0XHRpZiAobGluZU51bSA8IDEgfHwgbGluZU51bSA+IGxpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihcclxuXHRcdFx0XHRcdGBMaW5lICR7bGluZU51bX0gb3V0IG9mIHJhbmdlICgxLSR7bGluZXMubGVuZ3RofSlgXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCB0ZXh0ID0gbGluZXNbbGluZU51bSAtIDFdO1xyXG5cdFx0XHRsZXQgZnJvbSA9IDA7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgbGluZU51bSAtIDE7IGkrKykge1xyXG5cdFx0XHRcdGZyb20gKz0gbGluZXNbaV0ubGVuZ3RoICsgMTsgLy8gKzEgZm9yIG5ld2xpbmVcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdHRleHQ6IHRleHQsXHJcblx0XHRcdFx0ZnJvbSxcclxuXHRcdFx0XHR0bzogZnJvbSArIHRleHQubGVuZ3RoLFxyXG5cdFx0XHRcdG51bWJlcjogbGluZU51bSxcclxuXHRcdFx0XHRsZW5ndGg6IHRleHQubGVuZ3RoLFxyXG5cdFx0XHR9O1xyXG5cdFx0fSksXHJcblx0XHRsaW5lQXQ6IGplc3QuZm4oKHBvczogbnVtYmVyKSA9PiB7XHJcblx0XHRcdC8vIEVuc3VyZSBwb3MgaXMgd2l0aGluIHZhbGlkIHJhbmdlXHJcblx0XHRcdHBvcyA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBvcywgY29udGVudC5sZW5ndGgpKTtcclxuXHRcdFx0bGV0IGN1cnJlbnRQb3MgPSAwO1xyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0Y29uc3QgbGluZUxlbmd0aCA9IGxpbmVzW2ldLmxlbmd0aDtcclxuXHRcdFx0XHRjb25zdCBsaW5lU3RhcnQgPSBjdXJyZW50UG9zO1xyXG5cdFx0XHRcdGNvbnN0IGxpbmVFbmQgPSBjdXJyZW50UG9zICsgbGluZUxlbmd0aDtcclxuXHRcdFx0XHQvLyBDaGVjayBpZiBwb3MgaXMgd2l0aGluIHRoZSBjdXJyZW50IGxpbmUgb3IgYXQgdGhlIHZlcnkgZW5kIG9mIHRoZSBkb2N1bWVudFxyXG5cdFx0XHRcdGlmIChwb3MgPj0gbGluZVN0YXJ0ICYmIHBvcyA8PSBsaW5lRW5kKSB7XHJcblx0XHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0XHR0ZXh0OiBsaW5lc1tpXSxcclxuXHRcdFx0XHRcdFx0ZnJvbTogbGluZVN0YXJ0LFxyXG5cdFx0XHRcdFx0XHR0bzogbGluZUVuZCxcclxuXHRcdFx0XHRcdFx0bnVtYmVyOiBpICsgMSxcclxuXHRcdFx0XHRcdFx0bGVuZ3RoOiBsaW5lTGVuZ3RoLFxyXG5cdFx0XHRcdFx0fTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Y3VycmVudFBvcyArPSBsaW5lTGVuZ3RoICsgMTsgLy8gKzEgZm9yIG5ld2xpbmVcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBIYW5kbGUgZWRnZSBjYXNlOiBwb3NpdGlvbiBhdCB0aGUgdmVyeSBlbmQgb2YgdGhlIGZpbGUgYWZ0ZXIgdGhlIGxhc3QgbmV3bGluZVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0cG9zID09PSBjb250ZW50Lmxlbmd0aCAmJlxyXG5cdFx0XHRcdGxpbmVzLmxlbmd0aCA+IDAgJiZcclxuXHRcdFx0XHRjb250ZW50LmVuZHNXaXRoKFwiXFxuXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdGNvbnN0IGxhc3RMaW5lSW5kZXggPSBsaW5lcy5sZW5ndGggLSAxO1xyXG5cdFx0XHRcdGNvbnN0IGxhc3RMaW5lID0gbGluZXNbbGFzdExpbmVJbmRleF07XHJcblx0XHRcdFx0bGV0IGZyb20gPSBjb250ZW50Lmxlbmd0aCAtIGxhc3RMaW5lLmxlbmd0aCAtIDE7IC8vIFBvc2l0aW9uIGFmdGVyIHRoZSBsYXN0IG5ld2xpbmVcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0dGV4dDogbGFzdExpbmUsXHJcblx0XHRcdFx0XHRmcm9tOiBmcm9tLFxyXG5cdFx0XHRcdFx0dG86IGZyb20gKyBsYXN0TGluZS5sZW5ndGgsXHJcblx0XHRcdFx0XHRudW1iZXI6IGxpbmVzLmxlbmd0aCxcclxuXHRcdFx0XHRcdGxlbmd0aDogbGFzdExpbmUubGVuZ3RoLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gZWxzZSBpZiAoXHJcblx0XHRcdFx0cG9zID09PSBjb250ZW50Lmxlbmd0aCAmJlxyXG5cdFx0XHRcdGxpbmVzLmxlbmd0aCA+IDAgJiZcclxuXHRcdFx0XHQhY29udGVudC5lbmRzV2l0aChcIlxcblwiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHQvLyBQb3NpdGlvbiBleGFjdGx5IGF0IHRoZSBlbmQgb2YgdGhlIGxhc3QgbGluZSAobm8gdHJhaWxpbmcgbmV3bGluZSlcclxuXHRcdFx0XHRjb25zdCBsYXN0TGluZUluZGV4ID0gbGluZXMubGVuZ3RoIC0gMTtcclxuXHRcdFx0XHRjb25zdCBsYXN0TGluZSA9IGxpbmVzW2xhc3RMaW5lSW5kZXhdO1xyXG5cdFx0XHRcdGxldCBmcm9tID0gMDtcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxhc3RMaW5lSW5kZXg7IGkrKykge1xyXG5cdFx0XHRcdFx0ZnJvbSArPSBsaW5lc1tpXS5sZW5ndGggKyAxO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0dGV4dDogbGFzdExpbmUsXHJcblx0XHRcdFx0XHRmcm9tOiBmcm9tLFxyXG5cdFx0XHRcdFx0dG86IGZyb20gKyBsYXN0TGluZS5sZW5ndGgsXHJcblx0XHRcdFx0XHRudW1iZXI6IGxpbmVzLmxlbmd0aCxcclxuXHRcdFx0XHRcdGxlbmd0aDogbGFzdExpbmUubGVuZ3RoLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdFx0Ly8gSWYgdGhlIGNvbnRlbnQgaXMgZW1wdHkgb3IgcG9zIGlzIDAgaW4gYW4gZW1wdHkgZG9jXHJcblx0XHRcdGlmIChjb250ZW50ID09PSBcIlwiICYmIHBvcyA9PT0gMCkge1xyXG5cdFx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0XHR0ZXh0OiBcIlwiLFxyXG5cdFx0XHRcdFx0ZnJvbTogMCxcclxuXHRcdFx0XHRcdHRvOiAwLFxyXG5cdFx0XHRcdFx0bnVtYmVyOiAxLFxyXG5cdFx0XHRcdFx0bGVuZ3RoOiAwLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH1cclxuXHRcdH0pLFxyXG5cdFx0c2xpY2VTdHJpbmc6IGplc3QuZm4oKGZyb206IG51bWJlciwgdG86IG51bWJlcikgPT5cclxuXHRcdFx0Y29udGVudC5zbGljZShmcm9tLCB0bylcclxuXHRcdCksXHJcblx0fTtcclxuXHQvLyBBdm9pZCBjaXJjdWxhciByZWZlcmVuY2UgdGhhdCBjYXVzZXMgSlNPTiBzZXJpYWxpemF0aW9uIGlzc3Vlc1xyXG5cdC8vIFVzZSBnZXR0ZXIgdG8gbGF6aWx5IHJldHVybiBzZWxmLXJlZmVyZW5jZSBvbmx5IHdoZW4gbmVlZGVkXHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGRvYywgJ2RvYycsIHtcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9LFxyXG5cdFx0ZW51bWVyYWJsZTogZmFsc2UgLy8gRG9uJ3QgaW5jbHVkZSBpbiBKU09OIHNlcmlhbGl6YXRpb25cclxuXHR9KTtcclxuXHRyZXR1cm4gZG9jIGFzIFRleHQ7XHJcbn07XHJcblxyXG4vLyBNb2NrIENoYW5nZVNldCAtIENvbnNvbGlkYXRlZCB2ZXJzaW9uXHJcbmNvbnN0IGNyZWF0ZU1vY2tDaGFuZ2VTZXQgPSAoZG9jOiBUZXh0LCBjaGFuZ2VzOiBhbnlbXSA9IFtdKTogQ2hhbmdlU2V0ID0+IHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0bGVuZ3RoOiBkb2MubGVuZ3RoLFxyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0aXRlckNoYW5nZXM6IGplc3QuZm4oXHJcblx0XHRcdChcclxuXHRcdFx0XHRjYWxsYmFjazogKFxyXG5cdFx0XHRcdFx0ZnJvbUE6IG51bWJlcixcclxuXHRcdFx0XHRcdHRvQTogbnVtYmVyLFxyXG5cdFx0XHRcdFx0ZnJvbUI6IG51bWJlcixcclxuXHRcdFx0XHRcdHRvQjogbnVtYmVyLFxyXG5cdFx0XHRcdFx0aW5zZXJ0ZWQ6IFRleHRcclxuXHRcdFx0XHQpID0+IHZvaWRcclxuXHRcdFx0KSA9PiB7XHJcblx0XHRcdFx0Y2hhbmdlcy5mb3JFYWNoKChjaGFuZ2UpID0+IHtcclxuXHRcdFx0XHRcdC8vIEJhc2ljIHZhbGlkYXRpb24gdG8gcHJldmVudCBlcnJvcnMgb24gdW5kZWZpbmVkIHZhbHVlc1xyXG5cdFx0XHRcdFx0Y29uc3QgZnJvbUEgPSBjaGFuZ2UuZnJvbUEgPz8gMDtcclxuXHRcdFx0XHRcdGNvbnN0IHRvQSA9IGNoYW5nZS50b0EgPz8gZnJvbUE7XHJcblx0XHRcdFx0XHRjb25zdCBmcm9tQiA9IGNoYW5nZS5mcm9tQiA/PyAwO1xyXG5cdFx0XHRcdFx0Y29uc3QgaW5zZXJ0ZWRUZXh0ID0gY2hhbmdlLmluc2VydGVkVGV4dCA/PyBcIlwiO1xyXG5cdFx0XHRcdFx0Y29uc3QgdG9CID0gY2hhbmdlLnRvQiA/PyBmcm9tQiArIGluc2VydGVkVGV4dC5sZW5ndGg7XHJcblx0XHRcdFx0XHRjYWxsYmFjayhcclxuXHRcdFx0XHRcdFx0ZnJvbUEsXHJcblx0XHRcdFx0XHRcdHRvQSxcclxuXHRcdFx0XHRcdFx0ZnJvbUIsXHJcblx0XHRcdFx0XHRcdHRvQixcclxuXHRcdFx0XHRcdFx0Y3JlYXRlTW9ja1RleHQoaW5zZXJ0ZWRUZXh0KSAvLyBpbnNlcnRlZCB0ZXh0IG5lZWRzIHRvIGJlIGEgVGV4dCBvYmplY3RcclxuXHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdCksXHJcblx0XHQvLyBBZGQgb3RoZXIgbmVjZXNzYXJ5IENoYW5nZVNldCBtZXRob2RzIGlmIG5lZWRlZCwgZXZlbiBpZiBtb2NrZWQgc2ltcGx5XHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRtYXBEZXNjOiBqZXN0LmZuKCgpID0+ICh7XHJcblx0XHRcdC8qIG1vY2sgKi9cclxuXHRcdH0pKSxcclxuXHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdGNvbXBvc2U6IGplc3QuZm4oKCkgPT4gKHtcclxuXHRcdFx0LyogbW9jayAqL1xyXG5cdFx0fSkpLFxyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0bWFwUG9zOiBqZXN0LmZuKCgpID0+IDApLFxyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0dG9KU09OOiBqZXN0LmZuKCgpID0+ICh7XHJcblx0XHRcdC8qIG1vY2sgKi9cclxuXHRcdH0pKSxcclxuXHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdGFueTogamVzdC5mbigoKSA9PiBmYWxzZSksXHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRnZXQgZGVzYygpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHQvKiBtb2NrICovXHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0Z2V0IGVtcHR5KCkge1xyXG5cdFx0XHRyZXR1cm4gY2hhbmdlcy5sZW5ndGggPT09IDA7XHJcblx0XHR9LFxyXG5cdFx0Ly8gLi4uIGFuZCBwb3RlbnRpYWxseSBvdGhlcnMgbGlrZSAnYXBwbHknLCAnaW52ZXJ0JywgZXRjLiBpZiB1c2VkXHJcblx0fSBhcyB1bmtub3duIGFzIENoYW5nZVNldDtcclxufTtcclxuXHJcbi8vIE1vY2sgVHJhbnNhY3Rpb24gT2JqZWN0IC0gQ29uc29saWRhdGVkIHZlcnNpb25cclxuY29uc3QgY3JlYXRlTW9ja1RyYW5zYWN0aW9uID0gKG9wdGlvbnM6IHtcclxuXHRzdGFydFN0YXRlRG9jQ29udGVudD86IHN0cmluZztcclxuXHRuZXdEb2NDb250ZW50Pzogc3RyaW5nO1xyXG5cdGNoYW5nZXM/OiB7XHJcblx0XHRmcm9tQTogbnVtYmVyO1xyXG5cdFx0dG9BOiBudW1iZXI7XHJcblx0XHRmcm9tQjogbnVtYmVyO1xyXG5cdFx0dG9COiBudW1iZXI7XHJcblx0XHRpbnNlcnRlZFRleHQ/OiBzdHJpbmc7XHJcblx0fVtdO1xyXG5cdGRvY0NoYW5nZWQ/OiBib29sZWFuO1xyXG5cdGlzVXNlckV2ZW50Pzogc3RyaW5nIHwgZmFsc2U7IC8vIGUuZy4sICdpbnB1dC5wYXN0ZScgb3IgZmFsc2VcclxuXHRhbm5vdGF0aW9ucz86IHsgdHlwZTogQW5ub3RhdGlvblR5cGU8YW55PjsgdmFsdWU6IGFueSB9W107IC8vIFVzZSBBbm5vdGF0aW9uIGluc3RlYWQgb2YgQW5ub3RhdGlvblR5cGVcclxuXHRzZWxlY3Rpb24/OiB7IGFuY2hvcjogbnVtYmVyOyBoZWFkOiBudW1iZXIgfTtcclxufSk6IFRyYW5zYWN0aW9uID0+IHtcclxuXHRjb25zdCBzdGFydERvYyA9IGNyZWF0ZU1vY2tUZXh0KG9wdGlvbnMuc3RhcnRTdGF0ZURvY0NvbnRlbnQgPz8gXCJcIik7XHJcblx0Y29uc3QgbmV3RG9jID0gY3JlYXRlTW9ja1RleHQoXHJcblx0XHRvcHRpb25zLm5ld0RvY0NvbnRlbnQgPz8gb3B0aW9ucy5zdGFydFN0YXRlRG9jQ29udGVudCA/PyBcIlwiXHJcblx0KTtcclxuXHQvLyBFbnN1cmUgY2hhbmdlcyBhcnJheSBleGlzdHMgYW5kIGlzIHZhbGlkXHJcblx0Y29uc3QgdmFsaWRDaGFuZ2VzID1cclxuXHRcdG9wdGlvbnMuY2hhbmdlcz8ubWFwKChjKSA9PiAoe1xyXG5cdFx0XHRmcm9tQTogYy5mcm9tQSA/PyAwLFxyXG5cdFx0XHR0b0E6IGMudG9BID8/IGMuZnJvbUEgPz8gMCxcclxuXHRcdFx0ZnJvbUI6IGMuZnJvbUIgPz8gMCxcclxuXHRcdFx0aW5zZXJ0ZWRUZXh0OiBjLmluc2VydGVkVGV4dCA/PyBcIlwiLFxyXG5cdFx0XHR0b0I6IGMudG9CID8/IChjLmZyb21CID8/IDApICsgKGMuaW5zZXJ0ZWRUZXh0ID8/IFwiXCIpLmxlbmd0aCxcclxuXHRcdH0pKSB8fCBbXTtcclxuXHRjb25zdCBjaGFuZ2VTZXQgPSBjcmVhdGVNb2NrQ2hhbmdlU2V0KG5ld0RvYywgdmFsaWRDaGFuZ2VzKTtcclxuXHJcblx0Ly8gQ3JlYXRlIGEgcHJvcGVyIEVkaXRvclNlbGVjdGlvbiBvYmplY3QgaW5zdGVhZCBvZiBqdXN0IHVzaW5nIGFuIGFuY2hvci9oZWFkIG9iamVjdFxyXG5cdGNvbnN0IHNlbGVjdGlvbk9iaiA9IG9wdGlvbnMuc2VsZWN0aW9uIHx8IHsgYW5jaG9yOiAwLCBoZWFkOiAwIH07XHJcblx0Y29uc3QgZWRpdG9yU2VsZWN0aW9uID0gRWRpdG9yU2VsZWN0aW9uLnNpbmdsZShcclxuXHRcdHNlbGVjdGlvbk9iai5hbmNob3IsXHJcblx0XHRzZWxlY3Rpb25PYmouaGVhZFxyXG5cdCk7IC8vIFVzZSBFZGl0b3JTZWxlY3Rpb24uc2luZ2xlIGZvciBwcm9wZXIgY3JlYXRpb25cclxuXHRcclxuXHQvLyBDcmVhdGUgc3RhcnQgc3RhdGUgc2VsZWN0aW9uXHJcblx0Y29uc3Qgc3RhcnRTZWxlY3Rpb25PYmogPSB7IGFuY2hvcjogMCwgaGVhZDogMCB9O1xyXG5cdGNvbnN0IHN0YXJ0RWRpdG9yU2VsZWN0aW9uID0gRWRpdG9yU2VsZWN0aW9uLnNpbmdsZShcclxuXHRcdHN0YXJ0U2VsZWN0aW9uT2JqLmFuY2hvcixcclxuXHRcdHN0YXJ0U2VsZWN0aW9uT2JqLmhlYWRcclxuXHQpO1xyXG5cclxuXHRjb25zdCBtb2NrVHIgPSB7XHJcblx0XHRuZXdEb2M6IG5ld0RvYyxcclxuXHRcdGNoYW5nZXM6IGNoYW5nZVNldCxcclxuXHRcdGRvY0NoYW5nZWQ6XHJcblx0XHRcdG9wdGlvbnMuZG9jQ2hhbmdlZCAhPT0gdW5kZWZpbmVkXHJcblx0XHRcdFx0PyBvcHRpb25zLmRvY0NoYW5nZWRcclxuXHRcdFx0XHQ6ICEhdmFsaWRDaGFuZ2VzLmxlbmd0aCxcclxuXHRcdGlzVXNlckV2ZW50OiBqZXN0LmZuKCh0eXBlOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0aWYgKG9wdGlvbnMuaXNVc2VyRXZlbnQgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdHJldHVybiBvcHRpb25zLmlzVXNlckV2ZW50ID09PSB0eXBlO1xyXG5cdFx0fSksXHJcblx0XHRhbm5vdGF0aW9uOiBqZXN0LmZuKDxUPih0eXBlOiBBbm5vdGF0aW9uVHlwZTxUPik6IFQgfCB1bmRlZmluZWQgPT4ge1xyXG5cdFx0XHRjb25zdCBmb3VuZCA9IG9wdGlvbnMuYW5ub3RhdGlvbnM/LmZpbmQoKGFubikgPT4gYW5uLnR5cGUgPT09IHR5cGUpO1xyXG5cdFx0XHRyZXR1cm4gZm91bmQgPyBmb3VuZC52YWx1ZSA6IHVuZGVmaW5lZDtcclxuXHRcdH0pLFxyXG5cdFx0c2VsZWN0aW9uOiBlZGl0b3JTZWxlY3Rpb24sXHJcblx0XHQvLyBBZGQgcmVxdWlyZWQgVHJhbnNhY3Rpb24gcHJvcGVydGllcyB3aXRoIGJhc2ljIG1vY2tzXHJcblx0XHRlZmZlY3RzOiBbXSxcclxuXHRcdHNjcm9sbEludG9WaWV3OiBmYWxzZSxcclxuXHRcdG5ld1NlbGVjdGlvbjogZWRpdG9yU2VsZWN0aW9uLFxyXG5cdFx0c3RhdGU6IHtcclxuXHRcdFx0ZG9jOiBuZXdEb2MsXHJcblx0XHRcdHNlbGVjdGlvbjogZWRpdG9yU2VsZWN0aW9uLFxyXG5cdFx0XHQvLyBBZGQgb3RoZXIgcmVxdWlyZWQgc3RhdGUgcHJvcGVydGllcyB3aXRoIGJhc2ljIG1vY2tzXHJcblx0XHRcdGZhY2V0OiBqZXN0LmZuKCgpID0+IG51bGwpLFxyXG5cdFx0XHRmaWVsZDogamVzdC5mbigoKSA9PiBudWxsKSxcclxuXHRcdFx0ZmllbGRJbnZhbGlkYXRlZDogamVzdC5mbigoKSA9PiBmYWxzZSksXHJcblx0XHRcdHRvSlNPTjogamVzdC5mbigoKSA9PiAoe30pKSxcclxuXHRcdFx0cmVwbGFjZVNlbGVjdGlvbjogamVzdC5mbigpLFxyXG5cdFx0XHRjaGFuZ2VCeVJhbmdlOiBqZXN0LmZuKCksXHJcblx0XHRcdGNoYW5nZXM6IGplc3QuZm4oKSxcclxuXHRcdFx0dG9UZXh0OiBqZXN0LmZuKCgpID0+IG5ld0RvYyksXHJcblx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0dmFsdWVzOiBbXSxcclxuXHRcdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0XHRhcHBseTogamVzdC5mbigoKSA9PiAoe30pKSxcclxuXHRcdFx0Ly8gQHRzLWlnbm9yZVxyXG5cdFx0XHR1cGRhdGU6IGplc3QuZm4oKCkgPT4gKHt9KSksXHJcblx0XHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdFx0c2xpY2VEb2M6IGplc3QuZm4oKCkgPT4gXCJcIiksXHJcblx0XHR9IGFzIHVua25vd24gYXMgRWRpdG9yU3RhdGUsXHJcblx0XHRzdGFydFN0YXRlOiBFZGl0b3JTdGF0ZS5jcmVhdGUoe1xyXG5cdFx0XHRkb2M6IHN0YXJ0RG9jLFxyXG5cdFx0XHRzZWxlY3Rpb246IHN0YXJ0RWRpdG9yU2VsZWN0aW9uXHJcblx0XHR9KSxcclxuXHRcdHJlY29uZmlndXJlZDogZmFsc2UsXHJcblx0fTtcclxuXHJcblx0cmV0dXJuIG1vY2tUciBhcyB1bmtub3duIGFzIFRyYW5zYWN0aW9uO1xyXG59O1xyXG5cclxuLy8gTW9jayBBcHAgT2JqZWN0IC0gQ29uc29saWRhdGVkIHZlcnNpb25cclxuY29uc3QgY3JlYXRlTW9ja0FwcCA9ICgpOiBBcHAgPT4ge1xyXG5cdC8vIENyZWF0ZSBhIG1vY2sgYXBwIG9iamVjdCB3aXRoIGFsbCBuZWNlc3NhcnkgcHJvcGVydGllc1xyXG5cdGNvbnN0IG1vY2tBcHAgPSB7XHJcblx0XHQvLyBXb3Jrc3BhY2UgbW9ja1xyXG5cdFx0d29ya3NwYWNlOiB7XHJcblx0XHRcdGdldEFjdGl2ZUZpbGU6IGplc3QuZm4oKCkgPT4gKHtcclxuXHRcdFx0XHRwYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRuYW1lOiBcInRlc3QubWRcIixcclxuXHRcdFx0fSkpLFxyXG5cdFx0XHRnZXRBY3RpdmVWaWV3T2ZUeXBlOiBqZXN0LmZuKCksXHJcblx0XHRcdGdldExlYWY6IGplc3QuZm4oKSxcclxuXHRcdFx0Y3JlYXRlTGVhZkJ5U3BsaXQ6IGplc3QuZm4oKSxcclxuXHRcdFx0b246IGplc3QuZm4oKSxcclxuXHRcdFx0b2ZmOiBqZXN0LmZuKCksXHJcblx0XHRcdHRyaWdnZXI6IGplc3QuZm4oKSxcclxuXHRcdFx0b25MYXlvdXRSZWFkeTogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIE1ldGFkYXRhQ2FjaGUgbW9ja1xyXG5cdFx0bWV0YWRhdGFDYWNoZToge1xyXG5cdFx0XHRnZXRGaWxlQ2FjaGU6IGplc3QuZm4oKCkgPT4gKHtcclxuXHRcdFx0XHRoZWFkaW5nczogW10sXHJcblx0XHRcdH0pKSxcclxuXHRcdFx0Z2V0Q2FjaGU6IGplc3QuZm4oKSxcclxuXHRcdFx0b246IGplc3QuZm4oKSxcclxuXHRcdFx0b2ZmOiBqZXN0LmZuKCksXHJcblx0XHRcdHRyaWdnZXI6IGplc3QuZm4oKSxcclxuXHRcdH0sXHJcblx0XHQvLyBWYXVsdCBtb2NrIHdpdGggYWxsIG5lY2Vzc2FyeSBtZXRob2RzIGZvciBBY3Rpb25FeGVjdXRvciB0ZXN0c1xyXG5cdFx0dmF1bHQ6IHtcclxuXHRcdFx0Z2V0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdFx0XHRnZXRBYnN0cmFjdEZpbGVCeVBhdGg6IGplc3QuZm4oKSxcclxuXHRcdFx0cmVhZDogamVzdC5mbigpLFxyXG5cdFx0XHRtb2RpZnk6IGplc3QuZm4oKSxcclxuXHRcdFx0Y3JlYXRlOiBqZXN0LmZuKCksXHJcblx0XHRcdGNyZWF0ZUZvbGRlcjogamVzdC5mbigpLFxyXG5cdFx0XHRkZWxldGU6IGplc3QuZm4oKSxcclxuXHRcdFx0cmVuYW1lOiBqZXN0LmZuKCksXHJcblx0XHRcdGV4aXN0czogamVzdC5mbigpLFxyXG5cdFx0XHRnZXRGaWxlczogamVzdC5mbigoKSA9PiBbXSksXHJcblx0XHRcdGdldEZvbGRlcnM6IGplc3QuZm4oKCkgPT4gW10pLFxyXG5cdFx0XHRvbjogamVzdC5mbigpLFxyXG5cdFx0XHRvZmY6IGplc3QuZm4oKSxcclxuXHRcdFx0dHJpZ2dlcjogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIEtleW1hcCBtb2NrXHJcblx0XHRrZXltYXA6IHtcclxuXHRcdFx0cHVzaFNjb3BlOiBqZXN0LmZuKCksXHJcblx0XHRcdHBvcFNjb3BlOiBqZXN0LmZuKCksXHJcblx0XHRcdGdldE1vZGlmaWVyczogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIFNjb3BlIG1vY2tcclxuXHRcdHNjb3BlOiB7XHJcblx0XHRcdHJlZ2lzdGVyOiBqZXN0LmZuKCksXHJcblx0XHRcdHVucmVnaXN0ZXI6IGplc3QuZm4oKSxcclxuXHRcdH0sXHJcblx0XHQvLyBGaWxlTWFuYWdlciBtb2NrXHJcblx0XHRmaWxlTWFuYWdlcjoge1xyXG5cdFx0XHRnZW5lcmF0ZU1hcmtkb3duTGluazogamVzdC5mbigpLFxyXG5cdFx0XHRnZXROZXdGaWxlUGFyZW50OiBqZXN0LmZuKCksXHJcblx0XHRcdHByb2Nlc3NGcm9udE1hdHRlcjogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIE1ldGFkYXRhVHlwZU1hbmFnZXIgbW9ja1xyXG5cdFx0bWV0YWRhdGFUeXBlTWFuYWdlcjoge1xyXG5cdFx0XHRnZXRQcm9wZXJ0eUluZm86IGplc3QuZm4oKSxcclxuXHRcdFx0Z2V0QWxsUHJvcGVydHlJbmZvczogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIEFkZGl0aW9uYWwgQXBwIHByb3BlcnRpZXMgdGhhdCBtaWdodCBiZSBuZWVkZWRcclxuXHRcdHBsdWdpbnM6IHtcclxuXHRcdFx0cGx1Z2luczoge30sXHJcblx0XHRcdG1hbmlmZXN0czoge30sXHJcblx0XHRcdGVuYWJsZWRQbHVnaW5zOiBuZXcgU2V0KCksXHJcblx0XHRcdGdldFBsdWdpbjogamVzdC5mbigpLFxyXG5cdFx0XHRlbmFibGVQbHVnaW46IGplc3QuZm4oKSxcclxuXHRcdFx0ZGlzYWJsZVBsdWdpbjogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIFN0b3JhZ2UgbWV0aG9kc1xyXG5cdFx0bG9hZExvY2FsU3RvcmFnZTogamVzdC5mbigpLFxyXG5cdFx0c2F2ZUxvY2FsU3RvcmFnZTogamVzdC5mbigpLFxyXG5cdFx0Ly8gRXZlbnQgaGFuZGxpbmdcclxuXHRcdG9uOiBqZXN0LmZuKCksXHJcblx0XHRvZmY6IGplc3QuZm4oKSxcclxuXHRcdHRyaWdnZXI6IGplc3QuZm4oKSxcclxuXHRcdC8vIE90aGVyIGNvbW1vbiBBcHAgbWV0aG9kc1xyXG5cdFx0b3BlbldpdGhEZWZhdWx0QXBwOiBqZXN0LmZuKCksXHJcblx0XHRzaG93SW5Gb2xkZXI6IGplc3QuZm4oKSxcclxuXHR9IGFzIHVua25vd24gYXMgQXBwO1xyXG5cclxuXHRyZXR1cm4gbW9ja0FwcDtcclxufTtcclxuXHJcbi8vIE1vY2sgUGx1Z2luIE9iamVjdCAtIENvbnNvbGlkYXRlZCB2ZXJzaW9uIHdpdGggbWVyZ2VkIHNldHRpbmdzXHJcbmNvbnN0IGNyZWF0ZU1vY2tQbHVnaW4gPSAoXHJcblx0c2V0dGluZ3M6IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyU2V0dGluZ3M+ID0ge30gLy8gVXNlIFRhc2tQcm9ncmVzc0JhclNldHRpbmdzIGRpcmVjdGx5XHJcbik6IFRhc2tQcm9ncmVzc0JhclBsdWdpbiA9PiB7XHJcblx0Y29uc3QgZGVmYXVsdHM6IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyU2V0dGluZ3M+ID0ge1xyXG5cdFx0Ly8gRGVmYXVsdCBzZXR0aW5ncyBmcm9tIGJvdGggb3JpZ2luYWwgdmVyc2lvbnMgY29tYmluZWRcclxuXHRcdG1hcmtQYXJlbnRJblByb2dyZXNzV2hlblBhcnRpYWxseUNvbXBsZXRlOiB0cnVlLFxyXG5cdFx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRcdGluUHJvZ3Jlc3M6IFwiL1wiLFxyXG5cdFx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRcdGFiYW5kb25lZDogXCItXCIsXHJcblx0XHRcdHBsYW5uZWQ6IFwiP1wiLFxyXG5cdFx0XHRub3RTdGFydGVkOiBcIiBcIixcclxuXHRcdH0sXHJcblx0XHR0YXNrU3RhdHVzQ3ljbGU6IFtcIlRPRE9cIiwgXCJJTl9QUk9HUkVTU1wiLCBcIkRPTkVcIl0sXHJcblx0XHR0YXNrU3RhdHVzTWFya3M6IHsgVE9ETzogXCIgXCIsIElOX1BST0dSRVNTOiBcIi9cIiwgRE9ORTogXCJ4XCIgfSxcclxuXHRcdGV4Y2x1ZGVNYXJrc0Zyb21DeWNsZTogW10sXHJcblx0XHR3b3JrZmxvdzoge1xyXG5cdFx0XHRlbmFibGVXb3JrZmxvdzogZmFsc2UsXHJcblx0XHRcdGF1dG9SZW1vdmVMYXN0U3RhZ2VNYXJrZXI6IHRydWUsXHJcblx0XHRcdGF1dG9BZGRUaW1lc3RhbXA6IGZhbHNlLFxyXG5cdFx0XHR0aW1lc3RhbXBGb3JtYXQ6IFwiWVlZWS1NTS1ERCBISDptbTpzc1wiLFxyXG5cdFx0XHRyZW1vdmVUaW1lc3RhbXBPblRyYW5zaXRpb246IGZhbHNlLFxyXG5cdFx0XHRjYWxjdWxhdGVTcGVudFRpbWU6IGZhbHNlLFxyXG5cdFx0XHRzcGVudFRpbWVGb3JtYXQ6IFwiSEg6bW1cIixcclxuXHRcdFx0ZGVmaW5pdGlvbnM6IFtdLFxyXG5cdFx0XHRhdXRvQWRkTmV4dFRhc2s6IGZhbHNlLFxyXG5cdFx0XHRjYWxjdWxhdGVGdWxsU3BlbnRUaW1lOiBmYWxzZSxcclxuXHRcdH0sXHJcblx0XHQvLyBBZGQgc29ydGluZyBkZWZhdWx0c1xyXG5cdFx0c29ydFRhc2tzOiB0cnVlLFxyXG5cdFx0c29ydENyaXRlcmlhOiBbXHJcblx0XHRcdHsgZmllbGQ6IFwiY29tcGxldGVkXCIsIG9yZGVyOiBcImFzY1wiIH0sXHJcblx0XHRcdHsgZmllbGQ6IFwic3RhdHVzXCIsIG9yZGVyOiBcImFzY1wiIH0sXHJcblx0XHRcdHsgZmllbGQ6IFwicHJpb3JpdHlcIiwgb3JkZXI6IFwiYXNjXCIgfSxcclxuXHRcdFx0eyBmaWVsZDogXCJkdWVEYXRlXCIsIG9yZGVyOiBcImFzY1wiIH0sXHJcblx0XHRdLFxyXG5cdFx0Ly8gQWRkIG1ldGFkYXRhIGZvcm1hdCBkZWZhdWx0XHJcblx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cdH07XHJcblxyXG5cdC8vIERlZXAgbWVyZ2UgcHJvdmlkZWQgc2V0dGluZ3Mgd2l0aCBkZWZhdWx0c1xyXG5cdC8vIEJhc2ljIGRlZXAgbWVyZ2UgLSBtaWdodCBuZWVkIGEgbGlicmFyeSBmb3IgY29tcGxleCBuZXN0ZWQgb2JqZWN0cyBpZiBpc3N1ZXMgYXJpc2VcclxuXHRjb25zdCBtZXJnZWRTZXR0aW5ncyA9IHtcclxuXHRcdC4uLmRlZmF1bHRzLFxyXG5cdFx0Li4uc2V0dGluZ3MsXHJcblx0XHR0YXNrU3RhdHVzZXM6IHsgLi4uZGVmYXVsdHMudGFza1N0YXR1c2VzLCAuLi5zZXR0aW5ncy50YXNrU3RhdHVzZXMgfSxcclxuXHRcdHRhc2tTdGF0dXNNYXJrczoge1xyXG5cdFx0XHQuLi5kZWZhdWx0cy50YXNrU3RhdHVzTWFya3MsXHJcblx0XHRcdC4uLnNldHRpbmdzLnRhc2tTdGF0dXNNYXJrcyxcclxuXHRcdH0sXHJcblx0XHR3b3JrZmxvdzogeyAuLi5kZWZhdWx0cy53b3JrZmxvdywgLi4uc2V0dGluZ3Mud29ya2Zsb3cgfSxcclxuXHRcdHNvcnRDcml0ZXJpYTogc2V0dGluZ3Muc29ydENyaXRlcmlhIHx8IGRlZmF1bHRzLnNvcnRDcml0ZXJpYSxcclxuXHR9O1xyXG5cclxuXHQvLyBDcmVhdGUgbW9jayBhcHAgaW5zdGFuY2VcclxuXHRjb25zdCBtb2NrQXBwID0gY3JlYXRlTW9ja0FwcCgpO1xyXG5cclxuXHQvLyBDcmVhdGUgbW9jayB0YXNrIG1hbmFnZXIgd2l0aCBDYW52YXMgdGFzayB1cGRhdGVyXHJcblx0Ly8gTW9jayBkYXRhZmxvd09yY2hlc3RyYXRvciBhbmQgd3JpdGVBUEkgaW5zdGVhZCBvZiB0YXNrTWFuYWdlclxyXG5cdGNvbnN0IG1vY2tEYXRhZmxvd09yY2hlc3RyYXRvciA9IHtcclxuXHRcdGdldFF1ZXJ5QVBJOiBqZXN0LmZuKCgpID0+ICh7XHJcblx0XHRcdGdldEFsbFRhc2tzOiBqZXN0LmZuKGFzeW5jICgpID0+IFtdKSxcclxuXHRcdFx0Z2V0QWxsVGFza3NTeW5jOiBqZXN0LmZuKCgpID0+IFtdKSxcclxuXHRcdFx0Z2V0VGFza0J5SWQ6IGplc3QuZm4oYXN5bmMgKGlkOiBzdHJpbmcpID0+IG51bGwpLFxyXG5cdFx0XHRnZXRUYXNrQnlJZFN5bmM6IGplc3QuZm4oKGlkOiBzdHJpbmcpID0+IG51bGwpLFxyXG5cdFx0XHRlbnN1cmVDYWNoZTogamVzdC5mbihhc3luYyAoKSA9PiB7fSksXHJcblx0XHR9KSksXHJcblx0XHRyZWJ1aWxkOiBqZXN0LmZuKGFzeW5jICgpID0+IHt9KSxcclxuXHR9O1xyXG5cclxuXHRjb25zdCBtb2NrV3JpdGVBUEkgPSB7XHJcblx0XHR1cGRhdGVUYXNrOiBqZXN0LmZuKGFzeW5jICgpID0+ICh7IHN1Y2Nlc3M6IHRydWUgfSkpLFxyXG5cdFx0Y3JlYXRlVGFzazogamVzdC5mbihhc3luYyAoKSA9PiAoeyBzdWNjZXNzOiB0cnVlIH0pKSxcclxuXHRcdGRlbGV0ZVRhc2s6IGplc3QuZm4oYXN5bmMgKCkgPT4gKHsgc3VjY2VzczogdHJ1ZSB9KSksXHJcblx0fTtcclxuXHJcblx0Ly8gUmV0dXJuIHRoZSBwbHVnaW4gd2l0aCBhbGwgbmVjZXNzYXJ5IHByb3BlcnRpZXNcclxuXHRyZXR1cm4ge1xyXG5cdFx0c2V0dGluZ3M6IG1lcmdlZFNldHRpbmdzIGFzIFRhc2tQcm9ncmVzc0JhclNldHRpbmdzLFxyXG5cdFx0YXBwOiBtb2NrQXBwLFxyXG5cdFx0ZGF0YWZsb3dPcmNoZXN0cmF0b3I6IG1vY2tEYXRhZmxvd09yY2hlc3RyYXRvcixcclxuXHRcdHdyaXRlQVBJOiBtb2NrV3JpdGVBUEksXHJcblx0XHR0YXNrTWFuYWdlcjoge1xyXG5cdFx0XHRnZXRDYW52YXNUYXNrVXBkYXRlcjogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdHJld2FyZE1hbmFnZXI6IHtcclxuXHRcdFx0Ly8gTW9jayBSZXdhcmRNYW5hZ2VyXHJcblx0XHRcdHNob3dSZXdhcmQ6IGplc3QuZm4oKSxcclxuXHRcdFx0YWRkUmV3YXJkOiBqZXN0LmZuKCksXHJcblx0XHR9LFxyXG5cdFx0aGFiaXRNYW5hZ2VyOiB7XHJcblx0XHRcdC8vIE1vY2sgSGFiaXRNYW5hZ2VyXHJcblx0XHRcdGdldEhhYml0czogamVzdC5mbigoKSA9PiBbXSksXHJcblx0XHRcdGFkZEhhYml0OiBqZXN0LmZuKCksXHJcblx0XHRcdHVwZGF0ZUhhYml0OiBqZXN0LmZuKCksXHJcblx0XHR9LFxyXG5cdFx0aWNzTWFuYWdlcjoge1xyXG5cdFx0XHQvLyBNb2NrIEljc01hbmFnZXJcclxuXHRcdFx0Z2V0RXZlbnRzOiBqZXN0LmZuKCgpID0+IFtdKSxcclxuXHRcdFx0cmVmcmVzaEV2ZW50czogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdHZlcnNpb25NYW5hZ2VyOiB7XHJcblx0XHRcdC8vIE1vY2sgVmVyc2lvbk1hbmFnZXJcclxuXHRcdFx0Z2V0Q3VycmVudFZlcnNpb246IGplc3QuZm4oKCkgPT4gXCIxLjAuMFwiKSxcclxuXHRcdFx0Y2hlY2tGb3JVcGRhdGVzOiBqZXN0LmZuKCksXHJcblx0XHR9LFxyXG5cdFx0cmVidWlsZFByb2dyZXNzTWFuYWdlcjoge1xyXG5cdFx0XHQvLyBNb2NrIFJlYnVpbGRQcm9ncmVzc01hbmFnZXJcclxuXHRcdFx0c3RhcnRSZWJ1aWxkOiBqZXN0LmZuKCksXHJcblx0XHRcdGdldFByb2dyZXNzOiBqZXN0LmZuKCgpID0+IDApLFxyXG5cdFx0fSxcclxuXHRcdHByZWxvYWRlZFRhc2tzOiBbXSxcclxuXHRcdHNldHRpbmdUYWI6IHtcclxuXHRcdFx0Ly8gTW9jayBTZXR0aW5nVGFiXHJcblx0XHRcdGRpc3BsYXk6IGplc3QuZm4oKSxcclxuXHRcdFx0aGlkZTogamVzdC5mbigpLFxyXG5cdFx0fSxcclxuXHRcdC8vIFBsdWdpbiBsaWZlY3ljbGUgbWV0aG9kc1xyXG5cdFx0b25sb2FkOiBqZXN0LmZuKCksXHJcblx0XHRvbnVubG9hZDogamVzdC5mbigpLFxyXG5cdFx0Ly8gQ29tbWFuZCByZWdpc3RyYXRpb24gbWV0aG9kc1xyXG5cdFx0cmVnaXN0ZXJDb21tYW5kczogamVzdC5mbigpLFxyXG5cdFx0cmVnaXN0ZXJFZGl0b3JFeHQ6IGplc3QuZm4oKSxcclxuXHRcdC8vIFNldHRpbmdzIG1ldGhvZHNcclxuXHRcdGxvYWRTZXR0aW5nczogamVzdC5mbigpLFxyXG5cdFx0c2F2ZVNldHRpbmdzOiBqZXN0LmZuKCksXHJcblx0XHQvLyBWaWV3IG1ldGhvZHNcclxuXHRcdGxvYWRWaWV3czogamVzdC5mbigpLFxyXG5cdFx0YWN0aXZhdGVUYXNrVmlldzogamVzdC5mbigpLFxyXG5cdFx0YWN0aXZhdGVUaW1lbGluZVNpZGViYXJWaWV3OiBqZXN0LmZuKCksXHJcblx0XHR0cmlnZ2VyVmlld1VwZGF0ZTogamVzdC5mbigpLFxyXG5cdFx0Z2V0SWNzTWFuYWdlcjogamVzdC5mbigpLFxyXG5cdFx0aW5pdGlhbGl6ZVRhc2tNYW5hZ2VyV2l0aFZlcnNpb25DaGVjazogamVzdC5mbigpLFxyXG5cdFx0Ly8gUGx1Z2luIGJhc2UgY2xhc3MgcHJvcGVydGllc1xyXG5cdFx0YWRkUmliYm9uSWNvbjogamVzdC5mbigpLFxyXG5cdFx0YWRkQ29tbWFuZDogamVzdC5mbigpLFxyXG5cdFx0YWRkU2V0dGluZ1RhYjogamVzdC5mbigpLFxyXG5cdFx0cmVnaXN0ZXJWaWV3OiBqZXN0LmZuKCksXHJcblx0XHRyZWdpc3RlckVkaXRvckV4dGVuc2lvbjogamVzdC5mbigpLFxyXG5cdFx0cmVnaXN0ZXJNYXJrZG93blBvc3RQcm9jZXNzb3I6IGplc3QuZm4oKSxcclxuXHRcdHJlZ2lzdGVyRXZlbnQ6IGplc3QuZm4oKSxcclxuXHRcdGFkZENoaWxkOiBqZXN0LmZuKCksXHJcblx0XHRyZW1vdmVDaGlsZDogamVzdC5mbigpLFxyXG5cdFx0cmVnaXN0ZXI6IGplc3QuZm4oKSxcclxuXHRcdHJlZ2lzdGVySW50ZXJ2YWw6IGplc3QuZm4oKSxcclxuXHRcdHJlZ2lzdGVyRG9tRXZlbnQ6IGplc3QuZm4oKSxcclxuXHRcdHJlZ2lzdGVyT2JzaWRpYW5Qcm90b2NvbEhhbmRsZXI6IGplc3QuZm4oKSxcclxuXHRcdHJlZ2lzdGVyRWRpdG9yU3VnZ2VzdDogamVzdC5mbigpLFxyXG5cdFx0cmVnaXN0ZXJIb3ZlckxpbmtTb3VyY2U6IGplc3QuZm4oKSxcclxuXHRcdHJlZ2lzdGVyTWFya2Rvd25Db2RlQmxvY2tQcm9jZXNzb3I6IGplc3QuZm4oKSxcclxuXHRcdC8vIFBsdWdpbiBtYW5pZmVzdCBhbmQgbG9hZGluZyBzdGF0ZVxyXG5cdFx0bWFuaWZlc3Q6IHtcclxuXHRcdFx0aWQ6IFwidGFzay1wcm9ncmVzcy1iYXJcIixcclxuXHRcdFx0bmFtZTogXCJUYXNrIFByb2dyZXNzIEJhclwiLFxyXG5cdFx0XHR2ZXJzaW9uOiBcIjEuMC4wXCIsXHJcblx0XHRcdG1pbkFwcFZlcnNpb246IFwiMC4xNS4wXCIsXHJcblx0XHRcdGRlc2NyaXB0aW9uOiBcIk1vY2sgcGx1Z2luIGZvciB0ZXN0aW5nXCIsXHJcblx0XHRcdGF1dGhvcjogXCJUZXN0IEF1dGhvclwiLFxyXG5cdFx0XHRhdXRob3JVcmw6IFwiXCIsXHJcblx0XHRcdGZ1bmRpbmdVcmw6IFwiXCIsXHJcblx0XHRcdGlzRGVza3RvcE9ubHk6IGZhbHNlLFxyXG5cdFx0fSxcclxuXHRcdF9sb2FkZWQ6IHRydWUsXHJcblx0fSBhcyB1bmtub3duIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxufTtcclxuXHJcbi8vIE1vY2sgRWRpdG9yVmlldyBPYmplY3RcclxuY29uc3QgY3JlYXRlTW9ja0VkaXRvclZpZXcgPSAoZG9jQ29udGVudDogc3RyaW5nKTogRWRpdG9yVmlldyA9PiB7XHJcblx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja1RleHQoZG9jQ29udGVudCk7XHJcblx0Y29uc3QgbW9ja1N0YXRlID0ge1xyXG5cdFx0ZG9jOiBkb2MsXHJcblx0XHQvLyBBZGQgb3RoZXIgbWluaW1hbCByZXF1aXJlZCBFZGl0b3JTdGF0ZSBwcm9wZXJ0aWVzL21ldGhvZHMgaWYgbmVlZGVkIGJ5IHRoZSB0ZXN0c1xyXG5cdFx0Ly8gRm9yIHNvcnRUYXNrcywgcHJpbWFyaWx5ICdkb2MnIGlzIGFjY2Vzc2VkIHZpYSB2aWV3LnN0YXRlLmRvY1xyXG5cdFx0ZmFjZXQ6IGplc3QuZm4oKCkgPT4gW10pLFxyXG5cdFx0ZmllbGQ6IGplc3QuZm4oKCkgPT4gdW5kZWZpbmVkKSxcclxuXHRcdGZpZWxkSW52YWxpZGF0ZWQ6IGplc3QuZm4oKCkgPT4gZmFsc2UpLFxyXG5cdFx0dG9KU09OOiBqZXN0LmZuKCgpID0+ICh7fSkpLFxyXG5cdFx0cmVwbGFjZVNlbGVjdGlvbjogamVzdC5mbigpLFxyXG5cdFx0Y2hhbmdlQnlSYW5nZTogamVzdC5mbigpLFxyXG5cdFx0Y2hhbmdlczogamVzdC5mbigoKSA9PiAoe1xyXG5cdFx0XHQvKiBtb2NrIENoYW5nZVNldCAqL1xyXG5cdFx0fSkpLFxyXG5cdFx0dG9UZXh0OiBqZXN0LmZuKCgpID0+IGRvYyksXHJcblx0XHRzbGljZURvYzogamVzdC5mbigoZnJvbSA9IDAsIHRvID0gZG9jLmxlbmd0aCkgPT5cclxuXHRcdFx0ZG9jLnNsaWNlU3RyaW5nKGZyb20sIHRvKVxyXG5cdFx0KSxcclxuXHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdHZhbHVlczogW10sXHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHRhcHBseTogamVzdC5mbigodHI6IGFueSkgPT4gbW9ja1N0YXRlKSwgLy8gUmV0dXJuIHRoZSBzYW1lIHN0YXRlIGZvciBzaW1wbGljaXR5XHJcblx0XHQvLyBAdHMtaWdub3JlXHJcblx0XHR1cGRhdGU6IGplc3QuZm4oKHNwZWM6IGFueSkgPT4gKHtcclxuXHRcdFx0c3RhdGU6IG1vY2tTdGF0ZSxcclxuXHRcdFx0dHJhbnNhY3Rpb25zOiBbXSxcclxuXHRcdH0pKSwgLy8gQmFzaWMgdXBkYXRlIG1vY2tcclxuXHRcdC8vIEB0cy1pZ25vcmVcclxuXHRcdHNlbGVjdGlvbjoge1xyXG5cdFx0XHRyYW5nZXM6IFt7IGZyb206IDAsIHRvOiAwIH1dLFxyXG5cdFx0XHRtYWluSW5kZXg6IDAsXHJcblx0XHRcdG1haW46IHsgZnJvbTogMCwgdG86IDAgfSxcclxuXHRcdH0sIC8vIE1pbmltYWwgc2VsZWN0aW9uIG1vY2tcclxuXHR9IGFzIHVua25vd24gYXMgRWRpdG9yU3RhdGU7XHJcblxyXG5cdGNvbnN0IG1vY2tWaWV3ID0ge1xyXG5cdFx0c3RhdGU6IG1vY2tTdGF0ZSxcclxuXHRcdGRpc3BhdGNoOiBqZXN0LmZuKCksIC8vIE1vY2sgZGlzcGF0Y2ggZnVuY3Rpb25cclxuXHRcdC8vIEFkZCBvdGhlciBFZGl0b3JWaWV3IHByb3BlcnRpZXMvbWV0aG9kcyBpZiBuZWVkZWQgYnkgdGVzdHNcclxuXHRcdC8vIEZvciBleGFtcGxlLCBpZiB2aWV3cG9ydCBpbmZvcm1hdGlvbiBpcyBhY2Nlc3NlZFxyXG5cdFx0Ly8gdmlld3BvcnQ6IHsgZnJvbTogMCwgdG86IGRvYy5sZW5ndGggfSxcclxuXHRcdC8vIGNvbnRlbnRET006IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLCAvLyBCYXNpYyBET00gZWxlbWVudCBtb2NrXHJcblx0fSBhcyB1bmtub3duIGFzIEVkaXRvclZpZXc7XHJcblxyXG5cdHJldHVybiBtb2NrVmlldztcclxufTtcclxuXHJcbi8vIENhbnZhcyBUZXN0aW5nIFV0aWxpdGllc1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBtb2NrIENhbnZhcyBkYXRhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NhbnZhc0RhdGEobm9kZXM6IGFueVtdID0gW10sIGVkZ2VzOiBhbnlbXSA9IFtdKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdG5vZGVzLFxyXG5cdFx0ZWRnZXMsXHJcblx0fTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBtb2NrIENhbnZhcyB0ZXh0IG5vZGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ2FudmFzVGV4dE5vZGUoXHJcblx0aWQ6IHN0cmluZyxcclxuXHR0ZXh0OiBzdHJpbmcsXHJcblx0eDogbnVtYmVyID0gMCxcclxuXHR5OiBudW1iZXIgPSAwLFxyXG5cdHdpZHRoOiBudW1iZXIgPSAyNTAsXHJcblx0aGVpZ2h0OiBudW1iZXIgPSA2MFxyXG4pIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0dHlwZTogXCJ0ZXh0XCIgYXMgY29uc3QsXHJcblx0XHRpZCxcclxuXHRcdHgsXHJcblx0XHR5LFxyXG5cdFx0d2lkdGgsXHJcblx0XHRoZWlnaHQsXHJcblx0XHR0ZXh0LFxyXG5cdH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgbW9jayBDYW52YXMgdGFzayB3aXRoIG1ldGFkYXRhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTW9ja0NhbnZhc1Rhc2soXHJcblx0aWQ6IHN0cmluZyxcclxuXHRjb250ZW50OiBzdHJpbmcsXHJcblx0ZmlsZVBhdGg6IHN0cmluZyxcclxuXHRub2RlSWQ6IHN0cmluZyxcclxuXHRjb21wbGV0ZWQ6IGJvb2xlYW4gPSBmYWxzZSxcclxuXHRvcmlnaW5hbE1hcmtkb3duPzogc3RyaW5nXHJcbikge1xyXG5cdHJldHVybiB7XHJcblx0XHRpZCxcclxuXHRcdGNvbnRlbnQsXHJcblx0XHRmaWxlUGF0aCxcclxuXHRcdGxpbmU6IDAsXHJcblx0XHRjb21wbGV0ZWQsXHJcblx0XHRzdGF0dXM6IGNvbXBsZXRlZCA/IFwieFwiIDogXCIgXCIsXHJcblx0XHRvcmlnaW5hbE1hcmtkb3duOlxyXG5cdFx0XHRvcmlnaW5hbE1hcmtkb3duIHx8IGAtIFske2NvbXBsZXRlZCA/IFwieFwiIDogXCIgXCJ9XSAke2NvbnRlbnR9YCxcclxuXHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdHNvdXJjZVR5cGU6IFwiY2FudmFzXCIgYXMgY29uc3QsXHJcblx0XHRcdGNhbnZhc05vZGVJZDogbm9kZUlkLFxyXG5cdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0fSxcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIG1vY2sgZXhlY3V0aW9uIGNvbnRleHQgZm9yIG9uQ29tcGxldGlvbiB0ZXN0c1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU1vY2tFeGVjdXRpb25Db250ZXh0KHRhc2s6IGFueSwgcGx1Z2luPzogYW55LCBhcHA/OiBhbnkpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0dGFzayxcclxuXHRcdHBsdWdpbjogcGx1Z2luIHx8IGNyZWF0ZU1vY2tQbHVnaW4oKSxcclxuXHRcdGFwcDogYXBwIHx8IGNyZWF0ZU1vY2tBcHAoKSxcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogTW9jayBDYW52YXMgdGFzayB1cGRhdGVyIHdpdGggY29tbW9uIG1ldGhvZHNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrQ2FudmFzVGFza1VwZGF0ZXIoKSB7XHJcblx0cmV0dXJuIHtcclxuXHRcdGRlbGV0ZUNhbnZhc1Rhc2s6IGplc3QuZm4oKSxcclxuXHRcdG1vdmVDYW52YXNUYXNrOiBqZXN0LmZuKCksXHJcblx0XHRkdXBsaWNhdGVDYW52YXNUYXNrOiBqZXN0LmZuKCksXHJcblx0XHRhZGRUYXNrVG9DYW52YXNOb2RlOiBqZXN0LmZuKCksXHJcblx0XHRpc0NhbnZhc1Rhc2s6IGplc3QuZm4oKSxcclxuXHR9O1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGEgbW9jayBUYXNrIG9iamVjdCB3aXRoIGFsbCByZXF1aXJlZCBmaWVsZHNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVNb2NrVGFzayhvdmVycmlkZXM6IFBhcnRpYWw8VGFzaz4gPSB7fSk6IFRhc2sge1xyXG5cdHJldHVybiB7XHJcblx0XHRpZDogXCJ0ZXN0LXRhc2staWRcIixcclxuXHRcdGNvbnRlbnQ6IFwiVGVzdCB0YXNrIGNvbnRlbnRcIixcclxuXHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0dGFnczogW10sXHJcblx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0Li4ub3ZlcnJpZGVzLm1ldGFkYXRhLFxyXG5cdFx0fSxcclxuXHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdGxpbmU6IDEsXHJcblx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFzayBjb250ZW50XCIsXHJcblx0XHQuLi5vdmVycmlkZXMsXHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IHtcclxuXHQvLyBjcmVhdGVNb2NrVGV4dCBpcyBhbHJlYWR5IGV4cG9ydGVkIGlubGluZVxyXG5cdGNyZWF0ZU1vY2tDaGFuZ2VTZXQsIC8vIEV4cG9ydCB0aGUgY29uc29saWRhdGVkIGZ1bmN0aW9uXHJcblx0Y3JlYXRlTW9ja1RyYW5zYWN0aW9uLCAvLyBFeHBvcnQgdGhlIGNvbnNvbGlkYXRlZCBmdW5jdGlvblxyXG5cdGNyZWF0ZU1vY2tBcHAsIC8vIEV4cG9ydCB0aGUgY29uc29saWRhdGVkIGZ1bmN0aW9uXHJcblx0Y3JlYXRlTW9ja1BsdWdpbiwgLy8gRXhwb3J0IHRoZSBjb25zb2xpZGF0ZWQgZnVuY3Rpb25cclxuXHRtb2NrUGFyZW50VGFza1N0YXR1c0NoYW5nZUFubm90YXRpb24sXHJcblx0Y3JlYXRlTW9ja0VkaXRvclZpZXcsIC8vIEV4cG9ydCB0aGUgbmV3IGZ1bmN0aW9uXHJcbn07XHJcbiJdfQ==