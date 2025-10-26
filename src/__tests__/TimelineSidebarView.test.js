import { TimelineSidebarView } from '../components/features/timeline-sidebar/TimelineSidebarView';
// Mock translations first
jest.mock('../translations/helper', () => ({
    t: jest.fn((key) => key),
}));
// Mock all Obsidian dependencies
jest.mock('obsidian', () => {
    const actualMoment = jest.requireActual('moment');
    const mockMoment = jest.fn().mockImplementation((date) => {
        return actualMoment(date);
    });
    // Add moment methods
    mockMoment.locale = jest.fn(() => 'en');
    mockMoment.format = actualMoment.format;
    return {
        ItemView: class MockItemView {
            constructor(leaf) { }
            getViewType() { return 'mock'; }
            getDisplayText() { return 'Mock'; }
            getIcon() { return 'mock'; }
        },
        moment: mockMoment,
        setIcon: jest.fn(),
        debounce: jest.fn((fn) => fn),
        Component: class MockComponent {
        },
        ButtonComponent: class MockButtonComponent {
        },
        Platform: {},
        TFile: class MockTFile {
        },
        AbstractInputSuggest: class MockAbstractInputSuggest {
        },
        App: class MockApp {
        },
        Modal: class MockModal {
        },
        Setting: class MockSetting {
        },
        PluginSettingTab: class MockPluginSettingTab {
        },
    };
});
// Mock other dependencies
jest.mock('../components/features/quick-capture/modals/QuickCaptureModal', () => ({
    QuickCaptureModal: class MockQuickCaptureModal {
    },
}));
jest.mock('../editor-extensions/core/markdown-editor', () => ({
    createEmbeddableMarkdownEditor: jest.fn(),
}));
jest.mock('../utils/file/file-operations', () => ({
    saveCapture: jest.fn(),
}));
jest.mock('../components/features/task/view/details', () => ({
    createTaskCheckbox: jest.fn(),
}));
jest.mock('../components/MarkdownRenderer', () => ({
    MarkdownRendererComponent: class MockMarkdownRendererComponent {
    },
}));
const actualMoment = jest.requireActual('moment');
const moment = actualMoment;
// Mock plugin and dependencies
const mockPlugin = {
    taskManager: {
        getAllTasks: jest.fn(() => []),
        updateTask: jest.fn(),
    },
    settings: {
        timelineSidebar: {
            showCompletedTasks: true,
        },
        taskStatuses: {
            completed: 'x',
            notStarted: ' ',
            abandoned: '-',
        },
        quickCapture: {
            targetType: 'file',
            targetFile: 'test.md',
        },
    },
    app: {
        vault: {
            on: jest.fn(),
            getFileByPath: jest.fn(),
        },
        workspace: {
            on: jest.fn(),
            getLeavesOfType: jest.fn(() => []),
            getLeaf: jest.fn(),
            setActiveLeaf: jest.fn(),
        },
    },
};
const mockLeaf = {
    view: null,
};
describe('TimelineSidebarView Date Deduplication', () => {
    let timelineView;
    beforeEach(() => {
        jest.clearAllMocks();
        timelineView = new TimelineSidebarView(mockLeaf, mockPlugin);
    });
    // Helper function to create a mock task
    const createMockTask = (id, content, metadata = {}) => ({
        id,
        content,
        filePath: 'test.md',
        line: 1,
        status: ' ',
        completed: false,
        metadata: Object.assign({ dueDate: undefined, scheduledDate: undefined, startDate: undefined, completedDate: undefined, tags: [] }, metadata),
    });
    describe('deduplicateDatesByPriority', () => {
        it('should return empty array for empty input', () => {
            const result = timelineView.deduplicateDatesByPriority([]);
            expect(result).toEqual([]);
        });
        it('should return single date unchanged', () => {
            const dates = [{ date: new Date('2025-01-15'), type: 'due' }];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toEqual(dates);
        });
        it('should keep different dates on different days', () => {
            const dates = [
                { date: new Date('2025-01-15'), type: 'due' },
                { date: new Date('2025-01-16'), type: 'scheduled' },
            ];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toHaveLength(2);
            expect(result).toEqual(expect.arrayContaining(dates));
        });
        it('should prioritize due over completed on same day', () => {
            const dates = [
                { date: new Date('2025-01-15T10:00:00'), type: 'due' },
                { date: new Date('2025-01-15T14:00:00'), type: 'completed' },
            ];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('due');
        });
        it('should prioritize due over scheduled on same day', () => {
            const dates = [
                { date: new Date('2025-01-15T10:00:00'), type: 'scheduled' },
                { date: new Date('2025-01-15T14:00:00'), type: 'due' },
            ];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('due');
        });
        it('should prioritize scheduled over start on same day', () => {
            const dates = [
                { date: new Date('2025-01-15T10:00:00'), type: 'start' },
                { date: new Date('2025-01-15T14:00:00'), type: 'scheduled' },
            ];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('scheduled');
        });
        it('should handle multiple date types with correct priority order', () => {
            const dates = [
                { date: new Date('2025-01-15T08:00:00'), type: 'start' },
                { date: new Date('2025-01-15T10:00:00'), type: 'scheduled' },
                { date: new Date('2025-01-15T12:00:00'), type: 'due' },
                { date: new Date('2025-01-15T16:00:00'), type: 'completed' },
            ];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('due');
        });
        it('should handle mixed same-day and different-day dates', () => {
            const dates = [
                { date: new Date('2025-01-15T10:00:00'), type: 'due' },
                { date: new Date('2025-01-15T14:00:00'), type: 'completed' },
                { date: new Date('2025-01-16T10:00:00'), type: 'scheduled' },
                { date: new Date('2025-01-17T10:00:00'), type: 'start' },
            ];
            const result = timelineView.deduplicateDatesByPriority(dates);
            expect(result).toHaveLength(3);
            const jan15Result = result.find((d) => moment(d.date).format('YYYY-MM-DD') === '2025-01-15');
            const jan16Result = result.find((d) => moment(d.date).format('YYYY-MM-DD') === '2025-01-16');
            const jan17Result = result.find((d) => moment(d.date).format('YYYY-MM-DD') === '2025-01-17');
            expect(jan15Result === null || jan15Result === void 0 ? void 0 : jan15Result.type).toBe('due');
            expect(jan16Result === null || jan16Result === void 0 ? void 0 : jan16Result.type).toBe('scheduled');
            expect(jan17Result === null || jan17Result === void 0 ? void 0 : jan17Result.type).toBe('start');
        });
    });
    describe('extractDatesFromTask', () => {
        it('should return empty array for task with no dates', () => {
            const task = createMockTask('test-1', 'Test task');
            const result = timelineView.extractDatesFromTask(task);
            expect(result).toEqual([]);
        });
        it('should return single date for task with one date type', () => {
            const dueDate = new Date('2025-01-15').getTime();
            const task = createMockTask('test-1', 'Test task', { dueDate });
            const result = timelineView.extractDatesFromTask(task);
            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('due');
        });
        // New tests for task-level deduplication
        describe('completed task behavior', () => {
            it('should return due date for completed task with due date', () => {
                const task = createMockTask('test-1', 'Test task', {
                    dueDate: new Date('2025-01-15T10:00:00').getTime(),
                    completedDate: new Date('2025-01-16T16:00:00').getTime(),
                });
                task.completed = true;
                const result = timelineView.extractDatesFromTask(task);
                expect(result).toHaveLength(1);
                expect(result[0].type).toBe('due');
            });
            it('should return completed date for completed task without due date', () => {
                const task = createMockTask('test-1', 'Test task', {
                    scheduledDate: new Date('2025-01-14T10:00:00').getTime(),
                    completedDate: new Date('2025-01-16T16:00:00').getTime(),
                });
                task.completed = true;
                const result = timelineView.extractDatesFromTask(task);
                expect(result).toHaveLength(1);
                expect(result[0].type).toBe('completed');
            });
            it('should always return due date for completed task regardless of other dates', () => {
                const task = createMockTask('test-1', 'Test task', {
                    startDate: new Date('2025-01-13T08:00:00').getTime(),
                    scheduledDate: new Date('2025-01-14T10:00:00').getTime(),
                    dueDate: new Date('2025-01-15T12:00:00').getTime(),
                    completedDate: new Date('2025-01-16T16:00:00').getTime(),
                });
                task.completed = true;
                const result = timelineView.extractDatesFromTask(task);
                expect(result).toHaveLength(1);
                expect(result[0].type).toBe('due');
            });
        });
        describe('non-completed task behavior', () => {
            it('should return highest priority date for non-completed task with multiple dates', () => {
                const task = createMockTask('test-1', 'Test task', {
                    startDate: new Date('2025-01-13T08:00:00').getTime(),
                    scheduledDate: new Date('2025-01-14T10:00:00').getTime(),
                    dueDate: new Date('2025-01-15T12:00:00').getTime(),
                });
                const result = timelineView.extractDatesFromTask(task);
                expect(result).toHaveLength(1);
                expect(result[0].type).toBe('due');
            });
            it('should return scheduled date when no due date exists', () => {
                const task = createMockTask('test-1', 'Test task', {
                    startDate: new Date('2025-01-13T08:00:00').getTime(),
                    scheduledDate: new Date('2025-01-14T10:00:00').getTime(),
                });
                const result = timelineView.extractDatesFromTask(task);
                expect(result).toHaveLength(1);
                expect(result[0].type).toBe('scheduled');
            });
            it('should return start date when only start date exists', () => {
                const task = createMockTask('test-1', 'Test task', {
                    startDate: new Date('2025-01-13T08:00:00').getTime(),
                });
                const result = timelineView.extractDatesFromTask(task);
                expect(result).toHaveLength(1);
                expect(result[0].type).toBe('start');
            });
        });
    });
    describe('loadEvents - Abandoned Tasks Filtering', () => {
        it('should filter out abandoned tasks when showCompletedTasks is false', () => {
            // Create mock tasks with different statuses
            const mockTasks = [
                createMockTask('task-1', 'Active task', { dueDate: new Date('2025-01-15').getTime() }),
                Object.assign(Object.assign({}, createMockTask('task-2', 'Completed task', { dueDate: new Date('2025-01-15').getTime() })), { completed: true, status: 'x' }),
                Object.assign(Object.assign({}, createMockTask('task-3', 'Abandoned task', { dueDate: new Date('2025-01-15').getTime() })), { status: '-' }),
                Object.assign(Object.assign({}, createMockTask('task-4', 'In progress task', { dueDate: new Date('2025-01-15').getTime() })), { status: '/' }),
            ];
            // Configure plugin to not show completed tasks
            mockPlugin.settings.timelineSidebar.showCompletedTasks = false;
            mockPlugin.taskManager.getAllTasks.mockReturnValue(mockTasks);
            // Create a new view instance and call loadEvents
            const view = new TimelineSidebarView(mockLeaf, mockPlugin);
            view.loadEvents();
            // Check that only active and in-progress tasks are included
            const events = view.events;
            expect(events).toHaveLength(2);
            expect(events.map((e) => { var _a; return (_a = e.task) === null || _a === void 0 ? void 0 : _a.content; })).toEqual(expect.arrayContaining(['Active task', 'In progress task']));
            expect(events.map((e) => { var _a; return (_a = e.task) === null || _a === void 0 ? void 0 : _a.content; })).not.toContain('Completed task');
            expect(events.map((e) => { var _a; return (_a = e.task) === null || _a === void 0 ? void 0 : _a.content; })).not.toContain('Abandoned task');
        });
        it('should show all tasks including abandoned when showCompletedTasks is true', () => {
            // Create mock tasks with different statuses
            const mockTasks = [
                createMockTask('task-1', 'Active task', { dueDate: new Date('2025-01-15').getTime() }),
                Object.assign(Object.assign({}, createMockTask('task-2', 'Completed task', { dueDate: new Date('2025-01-15').getTime() })), { completed: true, status: 'x' }),
                Object.assign(Object.assign({}, createMockTask('task-3', 'Abandoned task', { dueDate: new Date('2025-01-15').getTime() })), { status: '-' }),
            ];
            // Configure plugin to show completed tasks
            mockPlugin.settings.timelineSidebar.showCompletedTasks = true;
            mockPlugin.taskManager.getAllTasks.mockReturnValue(mockTasks);
            // Create a new view instance and call loadEvents
            const view = new TimelineSidebarView(mockLeaf, mockPlugin);
            view.loadEvents();
            // Check that all tasks are included
            const events = view.events;
            expect(events).toHaveLength(3);
            expect(events.map((e) => { var _a; return (_a = e.task) === null || _a === void 0 ? void 0 : _a.content; })).toEqual(expect.arrayContaining(['Active task', 'Completed task', 'Abandoned task']));
        });
        it('should handle multiple abandoned status markers', () => {
            var _a;
            // Set multiple abandoned status markers
            mockPlugin.settings.taskStatuses.abandoned = '-|_|>';
            // Create mock tasks with different abandoned statuses
            const mockTasks = [
                createMockTask('task-1', 'Active task', { dueDate: new Date('2025-01-15').getTime() }),
                Object.assign(Object.assign({}, createMockTask('task-2', 'Abandoned with dash', { dueDate: new Date('2025-01-15').getTime() })), { status: '-' }),
                Object.assign(Object.assign({}, createMockTask('task-3', 'Abandoned with underscore', { dueDate: new Date('2025-01-15').getTime() })), { status: '_' }),
                Object.assign(Object.assign({}, createMockTask('task-4', 'Abandoned with arrow', { dueDate: new Date('2025-01-15').getTime() })), { status: '>' }),
            ];
            // Configure plugin to not show completed tasks
            mockPlugin.settings.timelineSidebar.showCompletedTasks = false;
            mockPlugin.taskManager.getAllTasks.mockReturnValue(mockTasks);
            // Create a new view instance and call loadEvents
            const view = new TimelineSidebarView(mockLeaf, mockPlugin);
            view.loadEvents();
            // Check that only the active task is included
            const events = view.events;
            expect(events).toHaveLength(1);
            expect((_a = events[0].task) === null || _a === void 0 ? void 0 : _a.content).toBe('Active task');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZWxpbmVTaWRlYmFyVmlldy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiVGltZWxpbmVTaWRlYmFyVmlldy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRWxHLDBCQUEwQjtBQUMxQixJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDMUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQztDQUNoQyxDQUFDLENBQUMsQ0FBQztBQUVKLGlDQUFpQztBQUNqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7SUFDMUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxJQUFVLEVBQUUsRUFBRTtRQUM5RCxPQUFPLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUMsQ0FBQztJQUNILHFCQUFxQjtJQUNyQixVQUFVLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDeEMsVUFBVSxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDO0lBRXhDLE9BQU87UUFDTixRQUFRLEVBQUUsTUFBTSxZQUFZO1lBQzNCLFlBQVksSUFBUyxJQUFHLENBQUM7WUFDekIsV0FBVyxLQUFLLE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNoQyxjQUFjLEtBQUssT0FBTyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ25DLE9BQU8sS0FBSyxPQUFPLE1BQU0sQ0FBQyxDQUFD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LENBQUM7WUFDcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsTUFBQSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSwwQ0FBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGFzayB9IGZyb20gJy4uL3R5cGVzL3Rhc2snO1xyXG5pbXBvcnQgeyBUaW1lbGluZVNpZGViYXJWaWV3IH0gZnJvbSAnLi4vY29tcG9uZW50cy9mZWF0dXJlcy90aW1lbGluZS1zaWRlYmFyL1RpbWVsaW5lU2lkZWJhclZpZXcnO1xyXG5cclxuLy8gTW9jayB0cmFuc2xhdGlvbnMgZmlyc3RcclxuamVzdC5tb2NrKCcuLi90cmFuc2xhdGlvbnMvaGVscGVyJywgKCkgPT4gKHtcclxuXHR0OiBqZXN0LmZuKChrZXk6IHN0cmluZykgPT4ga2V5KSxcclxufSkpO1xyXG5cclxuLy8gTW9jayBhbGwgT2JzaWRpYW4gZGVwZW5kZW5jaWVzXHJcbmplc3QubW9jaygnb2JzaWRpYW4nLCAoKSA9PiB7XHJcblx0Y29uc3QgYWN0dWFsTW9tZW50ID0gamVzdC5yZXF1aXJlQWN0dWFsKCdtb21lbnQnKTtcclxuXHRjb25zdCBtb2NrTW9tZW50ID0gamVzdC5mbigpLm1vY2tJbXBsZW1lbnRhdGlvbigoZGF0ZT86IGFueSkgPT4ge1xyXG5cdFx0cmV0dXJuIGFjdHVhbE1vbWVudChkYXRlKTtcclxuXHR9KTtcclxuXHQvLyBBZGQgbW9tZW50IG1ldGhvZHNcclxuXHRtb2NrTW9tZW50LmxvY2FsZSA9IGplc3QuZm4oKCkgPT4gJ2VuJyk7XHJcblx0bW9ja01vbWVudC5mb3JtYXQgPSBhY3R1YWxNb21lbnQuZm9ybWF0O1xyXG5cdFxyXG5cdHJldHVybiB7XHJcblx0XHRJdGVtVmlldzogY2xhc3MgTW9ja0l0ZW1WaWV3IHtcclxuXHRcdFx0Y29uc3RydWN0b3IobGVhZjogYW55KSB7fVxyXG5cdFx0XHRnZXRWaWV3VHlwZSgpIHsgcmV0dXJuICdtb2NrJzsgfVxyXG5cdFx0XHRnZXREaXNwbGF5VGV4dCgpIHsgcmV0dXJuICdNb2NrJzsgfVxyXG5cdFx0XHRnZXRJY29uKCkgeyByZXR1cm4gJ21vY2snOyB9XHJcblx0XHR9LFxyXG5cdFx0bW9tZW50OiBtb2NrTW9tZW50LFxyXG5cdFx0c2V0SWNvbjogamVzdC5mbigpLFxyXG5cdFx0ZGVib3VuY2U6IGplc3QuZm4oKGZuOiBhbnkpID0+IGZuKSxcclxuXHRcdENvbXBvbmVudDogY2xhc3MgTW9ja0NvbXBvbmVudCB7fSxcclxuXHRcdEJ1dHRvbkNvbXBvbmVudDogY2xhc3MgTW9ja0J1dHRvbkNvbXBvbmVudCB7fSxcclxuXHRcdFBsYXRmb3JtOiB7fSxcclxuXHRcdFRGaWxlOiBjbGFzcyBNb2NrVEZpbGUge30sXHJcblx0XHRBYnN0cmFjdElucHV0U3VnZ2VzdDogY2xhc3MgTW9ja0Fic3RyYWN0SW5wdXRTdWdnZXN0IHt9LFxyXG5cdFx0QXBwOiBjbGFzcyBNb2NrQXBwIHt9LFxyXG5cdFx0TW9kYWw6IGNsYXNzIE1vY2tNb2RhbCB7fSxcclxuXHRcdFNldHRpbmc6IGNsYXNzIE1vY2tTZXR0aW5nIHt9LFxyXG5cdFx0UGx1Z2luU2V0dGluZ1RhYjogY2xhc3MgTW9ja1BsdWdpblNldHRpbmdUYWIge30sXHJcblx0fTtcclxufSk7XHJcblxyXG4vLyBNb2NrIG90aGVyIGRlcGVuZGVuY2llc1xyXG5qZXN0Lm1vY2soJy4uL2NvbXBvbmVudHMvZmVhdHVyZXMvcXVpY2stY2FwdHVyZS9tb2RhbHMvUXVpY2tDYXB0dXJlTW9kYWwnLCAoKSA9PiAoe1xyXG5cdFF1aWNrQ2FwdHVyZU1vZGFsOiBjbGFzcyBNb2NrUXVpY2tDYXB0dXJlTW9kYWwge30sXHJcbn0pKTtcclxuXHJcbmplc3QubW9jaygnLi4vZWRpdG9yLWV4dGVuc2lvbnMvY29yZS9tYXJrZG93bi1lZGl0b3InLCAoKSA9PiAoe1xyXG5cdGNyZWF0ZUVtYmVkZGFibGVNYXJrZG93bkVkaXRvcjogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soJy4uL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zJywgKCkgPT4gKHtcclxuXHRzYXZlQ2FwdHVyZTogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soJy4uL2NvbXBvbmVudHMvZmVhdHVyZXMvdGFzay92aWV3L2RldGFpbHMnLCAoKSA9PiAoe1xyXG5cdGNyZWF0ZVRhc2tDaGVja2JveDogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soJy4uL2NvbXBvbmVudHMvTWFya2Rvd25SZW5kZXJlcicsICgpID0+ICh7XHJcblx0TWFya2Rvd25SZW5kZXJlckNvbXBvbmVudDogY2xhc3MgTW9ja01hcmtkb3duUmVuZGVyZXJDb21wb25lbnQge30sXHJcbn0pKTtcclxuXHJcbmNvbnN0IGFjdHVhbE1vbWVudCA9IGplc3QucmVxdWlyZUFjdHVhbCgnbW9tZW50Jyk7XHJcbmNvbnN0IG1vbWVudCA9IGFjdHVhbE1vbWVudDtcclxuXHJcbi8vIE1vY2sgcGx1Z2luIGFuZCBkZXBlbmRlbmNpZXNcclxuY29uc3QgbW9ja1BsdWdpbiA9IHtcclxuXHR0YXNrTWFuYWdlcjoge1xyXG5cdFx0Z2V0QWxsVGFza3M6IGplc3QuZm4oKCkgPT4gW10pLFxyXG5cdFx0dXBkYXRlVGFzazogamVzdC5mbigpLFxyXG5cdH0sXHJcblx0c2V0dGluZ3M6IHtcclxuXHRcdHRpbWVsaW5lU2lkZWJhcjoge1xyXG5cdFx0XHRzaG93Q29tcGxldGVkVGFza3M6IHRydWUsXHJcblx0XHR9LFxyXG5cdFx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRcdGNvbXBsZXRlZDogJ3gnLFxyXG5cdFx0XHRub3RTdGFydGVkOiAnICcsXHJcblx0XHRcdGFiYW5kb25lZDogJy0nLFxyXG5cdFx0fSxcclxuXHRcdHF1aWNrQ2FwdHVyZToge1xyXG5cdFx0XHR0YXJnZXRUeXBlOiAnZmlsZScsXHJcblx0XHRcdHRhcmdldEZpbGU6ICd0ZXN0Lm1kJyxcclxuXHRcdH0sXHJcblx0fSxcclxuXHRhcHA6IHtcclxuXHRcdHZhdWx0OiB7XHJcblx0XHRcdG9uOiBqZXN0LmZuKCksXHJcblx0XHRcdGdldEZpbGVCeVBhdGg6IGplc3QuZm4oKSxcclxuXHRcdH0sXHJcblx0XHR3b3Jrc3BhY2U6IHtcclxuXHRcdFx0b246IGplc3QuZm4oKSxcclxuXHRcdFx0Z2V0TGVhdmVzT2ZUeXBlOiBqZXN0LmZuKCgpID0+IFtdKSxcclxuXHRcdFx0Z2V0TGVhZjogamVzdC5mbigpLFxyXG5cdFx0XHRzZXRBY3RpdmVMZWFmOiBqZXN0LmZuKCksXHJcblx0XHR9LFxyXG5cdH0sXHJcbn07XHJcblxyXG5jb25zdCBtb2NrTGVhZiA9IHtcclxuXHR2aWV3OiBudWxsLFxyXG59O1xyXG5cclxuZGVzY3JpYmUoJ1RpbWVsaW5lU2lkZWJhclZpZXcgRGF0ZSBEZWR1cGxpY2F0aW9uJywgKCkgPT4ge1xyXG5cdGxldCB0aW1lbGluZVZpZXc6IFRpbWVsaW5lU2lkZWJhclZpZXc7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0XHR0aW1lbGluZVZpZXcgPSBuZXcgVGltZWxpbmVTaWRlYmFyVmlldyhtb2NrTGVhZiBhcyBhbnksIG1vY2tQbHVnaW4gYXMgYW55KTtcclxuXHR9KTtcclxuXHJcblx0Ly8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBhIG1vY2sgdGFza1xyXG5cdGNvbnN0IGNyZWF0ZU1vY2tUYXNrID0gKFxyXG5cdFx0aWQ6IHN0cmluZyxcclxuXHRcdGNvbnRlbnQ6IHN0cmluZyxcclxuXHRcdG1ldGFkYXRhOiBQYXJ0aWFsPFRhc2tbJ21ldGFkYXRhJ10+ID0ge31cclxuXHQpOiBUYXNrID0+ICh7XHJcblx0XHRpZCxcclxuXHRcdGNvbnRlbnQsXHJcblx0XHRmaWxlUGF0aDogJ3Rlc3QubWQnLFxyXG5cdFx0bGluZTogMSxcclxuXHRcdHN0YXR1czogJyAnLFxyXG5cdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdGR1ZURhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0c2NoZWR1bGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHRzdGFydERhdGU6IHVuZGVmaW5lZCxcclxuXHRcdFx0Y29tcGxldGVkRGF0ZTogdW5kZWZpbmVkLFxyXG5cdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0Li4ubWV0YWRhdGEsXHJcblx0XHR9LFxyXG5cdH0gYXMgVGFzayk7XHJcblxyXG5cdGRlc2NyaWJlKCdkZWR1cGxpY2F0ZURhdGVzQnlQcmlvcml0eScsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IGZvciBlbXB0eSBpbnB1dCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmRlZHVwbGljYXRlRGF0ZXNCeVByaW9yaXR5KFtdKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbXSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIHJldHVybiBzaW5nbGUgZGF0ZSB1bmNoYW5nZWQnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRhdGVzID0gW3sgZGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTUnKSwgdHlwZTogJ2R1ZScgfV07XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICh0aW1lbGluZVZpZXcgYXMgYW55KS5kZWR1cGxpY2F0ZURhdGVzQnlQcmlvcml0eShkYXRlcyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZGF0ZXMpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoJ3Nob3VsZCBrZWVwIGRpZmZlcmVudCBkYXRlcyBvbiBkaWZmZXJlbnQgZGF5cycsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGF0ZXMgPSBbXHJcblx0XHRcdFx0eyBkYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNScpLCB0eXBlOiAnZHVlJyB9LFxyXG5cdFx0XHRcdHsgZGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTYnKSwgdHlwZTogJ3NjaGVkdWxlZCcgfSxcclxuXHRcdFx0XTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmRlZHVwbGljYXRlRGF0ZXNCeVByaW9yaXR5KGRhdGVzKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdC5hcnJheUNvbnRhaW5pbmcoZGF0ZXMpKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcHJpb3JpdGl6ZSBkdWUgb3ZlciBjb21wbGV0ZWQgb24gc2FtZSBkYXknLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRhdGVzID0gW1xyXG5cdFx0XHRcdHsgZGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTVUMTA6MDA6MDAnKSwgdHlwZTogJ2R1ZScgfSxcclxuXHRcdFx0XHR7IGRhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1VDE0OjAwOjAwJyksIHR5cGU6ICdjb21wbGV0ZWQnIH0sXHJcblx0XHRcdF07XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICh0aW1lbGluZVZpZXcgYXMgYW55KS5kZWR1cGxpY2F0ZURhdGVzQnlQcmlvcml0eShkYXRlcyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS50eXBlKS50b0JlKCdkdWUnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcHJpb3JpdGl6ZSBkdWUgb3ZlciBzY2hlZHVsZWQgb24gc2FtZSBkYXknLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGRhdGVzID0gW1xyXG5cdFx0XHRcdHsgZGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTVUMTA6MDA6MDAnKSwgdHlwZTogJ3NjaGVkdWxlZCcgfSxcclxuXHRcdFx0XHR7IGRhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1VDE0OjAwOjAwJyksIHR5cGU6ICdkdWUnIH0sXHJcblx0XHRcdF07XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICh0aW1lbGluZVZpZXcgYXMgYW55KS5kZWR1cGxpY2F0ZURhdGVzQnlQcmlvcml0eShkYXRlcyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS50eXBlKS50b0JlKCdkdWUnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcHJpb3JpdGl6ZSBzY2hlZHVsZWQgb3ZlciBzdGFydCBvbiBzYW1lIGRheScsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGF0ZXMgPSBbXHJcblx0XHRcdFx0eyBkYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNVQxMDowMDowMCcpLCB0eXBlOiAnc3RhcnQnIH0sXHJcblx0XHRcdFx0eyBkYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNVQxNDowMDowMCcpLCB0eXBlOiAnc2NoZWR1bGVkJyB9LFxyXG5cdFx0XHRdO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSAodGltZWxpbmVWaWV3IGFzIGFueSkuZGVkdXBsaWNhdGVEYXRlc0J5UHJpb3JpdHkoZGF0ZXMpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRbMF0udHlwZSkudG9CZSgnc2NoZWR1bGVkJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIGhhbmRsZSBtdWx0aXBsZSBkYXRlIHR5cGVzIHdpdGggY29ycmVjdCBwcmlvcml0eSBvcmRlcicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGF0ZXMgPSBbXHJcblx0XHRcdFx0eyBkYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNVQwODowMDowMCcpLCB0eXBlOiAnc3RhcnQnIH0sXHJcblx0XHRcdFx0eyBkYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNVQxMDowMDowMCcpLCB0eXBlOiAnc2NoZWR1bGVkJyB9LFxyXG5cdFx0XHRcdHsgZGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTVUMTI6MDA6MDAnKSwgdHlwZTogJ2R1ZScgfSxcclxuXHRcdFx0XHR7IGRhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1VDE2OjAwOjAwJyksIHR5cGU6ICdjb21wbGV0ZWQnIH0sXHJcblx0XHRcdF07XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICh0aW1lbGluZVZpZXcgYXMgYW55KS5kZWR1cGxpY2F0ZURhdGVzQnlQcmlvcml0eShkYXRlcyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdFswXS50eXBlKS50b0JlKCdkdWUnKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgaGFuZGxlIG1peGVkIHNhbWUtZGF5IGFuZCBkaWZmZXJlbnQtZGF5IGRhdGVzJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkYXRlcyA9IFtcclxuXHRcdFx0XHR7IGRhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1VDEwOjAwOjAwJyksIHR5cGU6ICdkdWUnIH0sXHJcblx0XHRcdFx0eyBkYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNVQxNDowMDowMCcpLCB0eXBlOiAnY29tcGxldGVkJyB9LFxyXG5cdFx0XHRcdHsgZGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTZUMTA6MDA6MDAnKSwgdHlwZTogJ3NjaGVkdWxlZCcgfSxcclxuXHRcdFx0XHR7IGRhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE3VDEwOjAwOjAwJyksIHR5cGU6ICdzdGFydCcgfSxcclxuXHRcdFx0XTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmRlZHVwbGljYXRlRGF0ZXNCeVByaW9yaXR5KGRhdGVzKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDMpO1xyXG5cdFx0XHRcclxuXHRcdFx0Y29uc3QgamFuMTVSZXN1bHQgPSByZXN1bHQuZmluZCgoZDogYW55KSA9PiBtb21lbnQoZC5kYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKSA9PT0gJzIwMjUtMDEtMTUnKTtcclxuXHRcdFx0Y29uc3QgamFuMTZSZXN1bHQgPSByZXN1bHQuZmluZCgoZDogYW55KSA9PiBtb21lbnQoZC5kYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKSA9PT0gJzIwMjUtMDEtMTYnKTtcclxuXHRcdFx0Y29uc3QgamFuMTdSZXN1bHQgPSByZXN1bHQuZmluZCgoZDogYW55KSA9PiBtb21lbnQoZC5kYXRlKS5mb3JtYXQoJ1lZWVktTU0tREQnKSA9PT0gJzIwMjUtMDEtMTcnKTtcclxuXHRcdFx0XHJcblx0XHRcdGV4cGVjdChqYW4xNVJlc3VsdD8udHlwZSkudG9CZSgnZHVlJyk7XHJcblx0XHRcdGV4cGVjdChqYW4xNlJlc3VsdD8udHlwZSkudG9CZSgnc2NoZWR1bGVkJyk7XHJcblx0XHRcdGV4cGVjdChqYW4xN1Jlc3VsdD8udHlwZSkudG9CZSgnc3RhcnQnKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZSgnZXh0cmFjdERhdGVzRnJvbVRhc2snLCAoKSA9PiB7XHJcblx0XHRpdCgnc2hvdWxkIHJldHVybiBlbXB0eSBhcnJheSBmb3IgdGFzayB3aXRoIG5vIGRhdGVzJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrID0gY3JlYXRlTW9ja1Rhc2soJ3Rlc3QtMScsICdUZXN0IHRhc2snKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKFtdKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIHNpbmdsZSBkYXRlIGZvciB0YXNrIHdpdGggb25lIGRhdGUgdHlwZScsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZHVlRGF0ZSA9IG5ldyBEYXRlKCcyMDI1LTAxLTE1JykuZ2V0VGltZSgpO1xyXG5cdFx0XHRjb25zdCB0YXNrID0gY3JlYXRlTW9ja1Rhc2soJ3Rlc3QtMScsICdUZXN0IHRhc2snLCB7IGR1ZURhdGUgfSk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9ICh0aW1lbGluZVZpZXcgYXMgYW55KS5leHRyYWN0RGF0ZXNGcm9tVGFzayh0YXNrKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoJ2R1ZScpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTmV3IHRlc3RzIGZvciB0YXNrLWxldmVsIGRlZHVwbGljYXRpb25cclxuXHRcdGRlc2NyaWJlKCdjb21wbGV0ZWQgdGFzayBiZWhhdmlvcicsICgpID0+IHtcclxuXHRcdFx0aXQoJ3Nob3VsZCByZXR1cm4gZHVlIGRhdGUgZm9yIGNvbXBsZXRlZCB0YXNrIHdpdGggZHVlIGRhdGUnLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrKCd0ZXN0LTEnLCAnVGVzdCB0YXNrJywge1xyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTVUMTA6MDA6MDAnKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNlQxNjowMDowMCcpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0YXNrLmNvbXBsZXRlZCA9IHRydWU7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoJ2R1ZScpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KCdzaG91bGQgcmV0dXJuIGNvbXBsZXRlZCBkYXRlIGZvciBjb21wbGV0ZWQgdGFzayB3aXRob3V0IGR1ZSBkYXRlJywgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBjcmVhdGVNb2NrVGFzaygndGVzdC0xJywgJ1Rlc3QgdGFzaycsIHtcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE0VDEwOjAwOjAwJykuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTZUMTY6MDA6MDAnKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0dGFzay5jb21wbGV0ZWQgPSB0cnVlO1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9ICh0aW1lbGluZVZpZXcgYXMgYW55KS5leHRyYWN0RGF0ZXNGcm9tVGFzayh0YXNrKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdFswXS50eXBlKS50b0JlKCdjb21wbGV0ZWQnKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRpdCgnc2hvdWxkIGFsd2F5cyByZXR1cm4gZHVlIGRhdGUgZm9yIGNvbXBsZXRlZCB0YXNrIHJlZ2FyZGxlc3Mgb2Ygb3RoZXIgZGF0ZXMnLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrKCd0ZXN0LTEnLCAnVGVzdCB0YXNrJywge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xM1QwODowMDowMCcpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE0VDEwOjAwOjAwJykuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTVUMTI6MDA6MDAnKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNlQxNjowMDowMCcpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHR0YXNrLmNvbXBsZXRlZCA9IHRydWU7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoJ2R1ZScpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGRlc2NyaWJlKCdub24tY29tcGxldGVkIHRhc2sgYmVoYXZpb3InLCAoKSA9PiB7XHJcblx0XHRcdGl0KCdzaG91bGQgcmV0dXJuIGhpZ2hlc3QgcHJpb3JpdHkgZGF0ZSBmb3Igbm9uLWNvbXBsZXRlZCB0YXNrIHdpdGggbXVsdGlwbGUgZGF0ZXMnLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrKCd0ZXN0LTEnLCAnVGVzdCB0YXNrJywge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xM1QwODowMDowMCcpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE0VDEwOjAwOjAwJykuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTVUMTI6MDA6MDAnKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gKHRpbWVsaW5lVmlldyBhcyBhbnkpLmV4dHJhY3REYXRlc0Zyb21UYXNrKHRhc2spO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0WzBdLnR5cGUpLnRvQmUoJ2R1ZScpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGl0KCdzaG91bGQgcmV0dXJuIHNjaGVkdWxlZCBkYXRlIHdoZW4gbm8gZHVlIGRhdGUgZXhpc3RzJywgKCkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHRhc2sgPSBjcmVhdGVNb2NrVGFzaygndGVzdC0xJywgJ1Rlc3QgdGFzaycsIHtcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTNUMDg6MDA6MDAnKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNFQxMDowMDowMCcpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSAodGltZWxpbmVWaWV3IGFzIGFueSkuZXh0cmFjdERhdGVzRnJvbVRhc2sodGFzayk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHRbMF0udHlwZSkudG9CZSgnc2NoZWR1bGVkJyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aXQoJ3Nob3VsZCByZXR1cm4gc3RhcnQgZGF0ZSB3aGVuIG9ubHkgc3RhcnQgZGF0ZSBleGlzdHMnLCAoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgdGFzayA9IGNyZWF0ZU1vY2tUYXNrKCd0ZXN0LTEnLCAnVGVzdCB0YXNrJywge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xM1QwODowMDowMCcpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSAodGltZWxpbmVWaWV3IGFzIGFueSkuZXh0cmFjdERhdGVzRnJvbVRhc2sodGFzayk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHRbMF0udHlwZSkudG9CZSgnc3RhcnQnKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ2xvYWRFdmVudHMgLSBBYmFuZG9uZWQgVGFza3MgRmlsdGVyaW5nJywgKCkgPT4ge1xyXG5cdFx0aXQoJ3Nob3VsZCBmaWx0ZXIgb3V0IGFiYW5kb25lZCB0YXNrcyB3aGVuIHNob3dDb21wbGV0ZWRUYXNrcyBpcyBmYWxzZScsICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIG1vY2sgdGFza3Mgd2l0aCBkaWZmZXJlbnQgc3RhdHVzZXNcclxuXHRcdFx0Y29uc3QgbW9ja1Rhc2tzID0gW1xyXG5cdFx0XHRcdGNyZWF0ZU1vY2tUYXNrKCd0YXNrLTEnLCAnQWN0aXZlIHRhc2snLCB7IGR1ZURhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1JykuZ2V0VGltZSgpIH0pLFxyXG5cdFx0XHRcdHsgLi4uY3JlYXRlTW9ja1Rhc2soJ3Rhc2stMicsICdDb21wbGV0ZWQgdGFzaycsIHsgZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTUnKS5nZXRUaW1lKCkgfSksIGNvbXBsZXRlZDogdHJ1ZSwgc3RhdHVzOiAneCcgfSxcclxuXHRcdFx0XHR7IC4uLmNyZWF0ZU1vY2tUYXNrKCd0YXNrLTMnLCAnQWJhbmRvbmVkIHRhc2snLCB7IGR1ZURhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1JykuZ2V0VGltZSgpIH0pLCBzdGF0dXM6ICctJyB9LFxyXG5cdFx0XHRcdHsgLi4uY3JlYXRlTW9ja1Rhc2soJ3Rhc2stNCcsICdJbiBwcm9ncmVzcyB0YXNrJywgeyBkdWVEYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNScpLmdldFRpbWUoKSB9KSwgc3RhdHVzOiAnLycgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdC8vIENvbmZpZ3VyZSBwbHVnaW4gdG8gbm90IHNob3cgY29tcGxldGVkIHRhc2tzXHJcblx0XHRcdG1vY2tQbHVnaW4uc2V0dGluZ3MudGltZWxpbmVTaWRlYmFyLnNob3dDb21wbGV0ZWRUYXNrcyA9IGZhbHNlO1xyXG5cdFx0XHRtb2NrUGx1Z2luLnRhc2tNYW5hZ2VyLmdldEFsbFRhc2tzLm1vY2tSZXR1cm5WYWx1ZShtb2NrVGFza3MpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGEgbmV3IHZpZXcgaW5zdGFuY2UgYW5kIGNhbGwgbG9hZEV2ZW50c1xyXG5cdFx0XHRjb25zdCB2aWV3ID0gbmV3IFRpbWVsaW5lU2lkZWJhclZpZXcobW9ja0xlYWYgYXMgYW55LCBtb2NrUGx1Z2luIGFzIGFueSk7XHJcblx0XHRcdCh2aWV3IGFzIGFueSkubG9hZEV2ZW50cygpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdGhhdCBvbmx5IGFjdGl2ZSBhbmQgaW4tcHJvZ3Jlc3MgdGFza3MgYXJlIGluY2x1ZGVkXHJcblx0XHRcdGNvbnN0IGV2ZW50cyA9ICh2aWV3IGFzIGFueSkuZXZlbnRzO1xyXG5cdFx0XHRleHBlY3QoZXZlbnRzKS50b0hhdmVMZW5ndGgoMik7XHJcblx0XHRcdGV4cGVjdChldmVudHMubWFwKChlOiBhbnkpID0+IGUudGFzaz8uY29udGVudCkpLnRvRXF1YWwoXHJcblx0XHRcdFx0ZXhwZWN0LmFycmF5Q29udGFpbmluZyhbJ0FjdGl2ZSB0YXNrJywgJ0luIHByb2dyZXNzIHRhc2snXSlcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGV2ZW50cy5tYXAoKGU6IGFueSkgPT4gZS50YXNrPy5jb250ZW50KSkubm90LnRvQ29udGFpbignQ29tcGxldGVkIHRhc2snKTtcclxuXHRcdFx0ZXhwZWN0KGV2ZW50cy5tYXAoKGU6IGFueSkgPT4gZS50YXNrPy5jb250ZW50KSkubm90LnRvQ29udGFpbignQWJhbmRvbmVkIHRhc2snKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgc2hvdyBhbGwgdGFza3MgaW5jbHVkaW5nIGFiYW5kb25lZCB3aGVuIHNob3dDb21wbGV0ZWRUYXNrcyBpcyB0cnVlJywgKCkgPT4ge1xyXG5cdFx0XHQvLyBDcmVhdGUgbW9jayB0YXNrcyB3aXRoIGRpZmZlcmVudCBzdGF0dXNlc1xyXG5cdFx0XHRjb25zdCBtb2NrVGFza3MgPSBbXHJcblx0XHRcdFx0Y3JlYXRlTW9ja1Rhc2soJ3Rhc2stMScsICdBY3RpdmUgdGFzaycsIHsgZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTUnKS5nZXRUaW1lKCkgfSksXHJcblx0XHRcdFx0eyAuLi5jcmVhdGVNb2NrVGFzaygndGFzay0yJywgJ0NvbXBsZXRlZCB0YXNrJywgeyBkdWVEYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNScpLmdldFRpbWUoKSB9KSwgY29tcGxldGVkOiB0cnVlLCBzdGF0dXM6ICd4JyB9LFxyXG5cdFx0XHRcdHsgLi4uY3JlYXRlTW9ja1Rhc2soJ3Rhc2stMycsICdBYmFuZG9uZWQgdGFzaycsIHsgZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTUnKS5nZXRUaW1lKCkgfSksIHN0YXR1czogJy0nIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBDb25maWd1cmUgcGx1Z2luIHRvIHNob3cgY29tcGxldGVkIHRhc2tzXHJcblx0XHRcdG1vY2tQbHVnaW4uc2V0dGluZ3MudGltZWxpbmVTaWRlYmFyLnNob3dDb21wbGV0ZWRUYXNrcyA9IHRydWU7XHJcblx0XHRcdG1vY2tQbHVnaW4udGFza01hbmFnZXIuZ2V0QWxsVGFza3MubW9ja1JldHVyblZhbHVlKG1vY2tUYXNrcyk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgYSBuZXcgdmlldyBpbnN0YW5jZSBhbmQgY2FsbCBsb2FkRXZlbnRzXHJcblx0XHRcdGNvbnN0IHZpZXcgPSBuZXcgVGltZWxpbmVTaWRlYmFyVmlldyhtb2NrTGVhZiBhcyBhbnksIG1vY2tQbHVnaW4gYXMgYW55KTtcclxuXHRcdFx0KHZpZXcgYXMgYW55KS5sb2FkRXZlbnRzKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IGFsbCB0YXNrcyBhcmUgaW5jbHVkZWRcclxuXHRcdFx0Y29uc3QgZXZlbnRzID0gKHZpZXcgYXMgYW55KS5ldmVudHM7XHJcblx0XHRcdGV4cGVjdChldmVudHMpLnRvSGF2ZUxlbmd0aCgzKTtcclxuXHRcdFx0ZXhwZWN0KGV2ZW50cy5tYXAoKGU6IGFueSkgPT4gZS50YXNrPy5jb250ZW50KSkudG9FcXVhbChcclxuXHRcdFx0XHRleHBlY3QuYXJyYXlDb250YWluaW5nKFsnQWN0aXZlIHRhc2snLCAnQ29tcGxldGVkIHRhc2snLCAnQWJhbmRvbmVkIHRhc2snXSlcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgaGFuZGxlIG11bHRpcGxlIGFiYW5kb25lZCBzdGF0dXMgbWFya2VycycsICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0IG11bHRpcGxlIGFiYW5kb25lZCBzdGF0dXMgbWFya2Vyc1xyXG5cdFx0XHRtb2NrUGx1Z2luLnNldHRpbmdzLnRhc2tTdGF0dXNlcy5hYmFuZG9uZWQgPSAnLXxffD4nO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gQ3JlYXRlIG1vY2sgdGFza3Mgd2l0aCBkaWZmZXJlbnQgYWJhbmRvbmVkIHN0YXR1c2VzXHJcblx0XHRcdGNvbnN0IG1vY2tUYXNrcyA9IFtcclxuXHRcdFx0XHRjcmVhdGVNb2NrVGFzaygndGFzay0xJywgJ0FjdGl2ZSB0YXNrJywgeyBkdWVEYXRlOiBuZXcgRGF0ZSgnMjAyNS0wMS0xNScpLmdldFRpbWUoKSB9KSxcclxuXHRcdFx0XHR7IC4uLmNyZWF0ZU1vY2tUYXNrKCd0YXNrLTInLCAnQWJhbmRvbmVkIHdpdGggZGFzaCcsIHsgZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTUnKS5nZXRUaW1lKCkgfSksIHN0YXR1czogJy0nIH0sXHJcblx0XHRcdFx0eyAuLi5jcmVhdGVNb2NrVGFzaygndGFzay0zJywgJ0FiYW5kb25lZCB3aXRoIHVuZGVyc2NvcmUnLCB7IGR1ZURhdGU6IG5ldyBEYXRlKCcyMDI1LTAxLTE1JykuZ2V0VGltZSgpIH0pLCBzdGF0dXM6ICdfJyB9LFxyXG5cdFx0XHRcdHsgLi4uY3JlYXRlTW9ja1Rhc2soJ3Rhc2stNCcsICdBYmFuZG9uZWQgd2l0aCBhcnJvdycsIHsgZHVlRGF0ZTogbmV3IERhdGUoJzIwMjUtMDEtMTUnKS5nZXRUaW1lKCkgfSksIHN0YXR1czogJz4nIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBDb25maWd1cmUgcGx1Z2luIHRvIG5vdCBzaG93IGNvbXBsZXRlZCB0YXNrc1xyXG5cdFx0XHRtb2NrUGx1Z2luLnNldHRpbmdzLnRpbWVsaW5lU2lkZWJhci5zaG93Q29tcGxldGVkVGFza3MgPSBmYWxzZTtcclxuXHRcdFx0bW9ja1BsdWdpbi50YXNrTWFuYWdlci5nZXRBbGxUYXNrcy5tb2NrUmV0dXJuVmFsdWUobW9ja1Rhc2tzKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBhIG5ldyB2aWV3IGluc3RhbmNlIGFuZCBjYWxsIGxvYWRFdmVudHNcclxuXHRcdFx0Y29uc3QgdmlldyA9IG5ldyBUaW1lbGluZVNpZGViYXJWaWV3KG1vY2tMZWFmIGFzIGFueSwgbW9ja1BsdWdpbiBhcyBhbnkpO1xyXG5cdFx0XHQodmlldyBhcyBhbnkpLmxvYWRFdmVudHMoKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIHRoYXQgb25seSB0aGUgYWN0aXZlIHRhc2sgaXMgaW5jbHVkZWRcclxuXHRcdFx0Y29uc3QgZXZlbnRzID0gKHZpZXcgYXMgYW55KS5ldmVudHM7XHJcblx0XHRcdGV4cGVjdChldmVudHMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KGV2ZW50c1swXS50YXNrPy5jb250ZW50KS50b0JlKCdBY3RpdmUgdGFzaycpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=