import { QuickCaptureModal } from "../components/features/quick-capture/modals/QuickCaptureModal";
import { DEFAULT_TIME_PARSING_CONFIG } from '@/services/time-parsing-service';
import { App } from "obsidian";
// Mock dependencies
jest.mock("obsidian", () => ({
    App: jest.fn(),
    Modal: class MockModal {
        constructor(app, plugin) {
            this.modalEl = { toggleClass: jest.fn() };
            this.titleEl = { createDiv: jest.fn(), createEl: jest.fn() };
            this.contentEl = {
                empty: jest.fn(),
                createDiv: jest.fn(() => ({
                    createDiv: jest.fn(),
                    createEl: jest.fn(),
                    createSpan: jest.fn(),
                    addClass: jest.fn(),
                    setAttribute: jest.fn(),
                    addEventListener: jest.fn(),
                })),
                createEl: jest.fn(),
            };
        }
        onOpen() { }
        onClose() { }
        close() { }
    },
    Setting: class MockSetting {
        constructor(containerEl) { }
        setName(name) {
            return this;
        }
        setDesc(desc) {
            return this;
        }
        addToggle(cb) {
            return this;
        }
        addText(cb) {
            return this;
        }
        addTextArea(cb) {
            return this;
        }
        addDropdown(cb) {
            return this;
        }
    },
    Notice: jest.fn(),
    Platform: { isPhone: false },
    MarkdownRenderer: jest.fn(),
    moment: () => ({ format: jest.fn(() => "2025-01-04") }),
    EditorSuggest: class {
        constructor() { }
        getSuggestions() { return []; }
        renderSuggestion() { }
        selectSuggestion() { }
        onTrigger() { return null; }
        close() { }
    },
}));
// Mock moment module
jest.mock("moment", () => {
    const moment = function (input) {
        return {
            format: () => "2024-01-01",
            diff: () => 0,
            startOf: () => moment(input),
            endOf: () => moment(input),
            isSame: () => true,
            isSameOrBefore: () => true,
            isSameOrAfter: () => true,
            isBefore: () => false,
            isAfter: () => false,
            isBetween: () => true,
            clone: () => moment(input),
            add: () => moment(input),
            subtract: () => moment(input),
            valueOf: () => Date.now(),
            toDate: () => new Date(),
            weekday: () => 0,
            day: () => 1,
            date: () => 1,
        };
    };
    moment.locale = jest.fn(() => "en");
    moment.utc = () => ({ format: () => "00:00:00" });
    moment.duration = () => ({ asMilliseconds: () => 0 });
    moment.weekdaysShort = () => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    moment.weekdaysMin = () => ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    return moment;
});
jest.mock("../editor-extensions/core/markdown-editor", () => ({
    createEmbeddableMarkdownEditor: jest.fn(() => ({
        value: "",
        editor: { focus: jest.fn() },
        scope: { register: jest.fn() },
        destroy: jest.fn(),
    })),
}));
jest.mock("../utils/file/file-operations", () => ({
    saveCapture: jest.fn(),
    processDateTemplates: jest.fn(),
}));
jest.mock("../components/AutoComplete", () => ({
    FileSuggest: jest.fn(),
    ContextSuggest: jest.fn(),
    ProjectSuggest: jest.fn(),
}));
jest.mock("../translations/helper", () => ({
    t: (key) => key,
}));
jest.mock("../components/MarkdownRenderer", () => ({
    MarkdownRendererComponent: class MockMarkdownRenderer {
        constructor() { }
        render() { }
        unload() { }
    },
}));
jest.mock("../components/StatusComponent", () => ({
    StatusComponent: class MockStatusComponent {
        constructor() { }
        load() { }
    },
}));
describe("QuickCaptureModal Time Parsing Integration", () => {
    let mockApp;
    let mockPlugin;
    let modal;
    beforeEach(() => {
        mockApp = new App();
        mockPlugin = {
            settings: {
                quickCapture: {
                    targetType: "fixed",
                    targetFile: "test.md",
                    placeholder: "Enter task...",
                    dailyNoteSettings: {
                        format: "YYYY-MM-DD",
                        folder: "",
                        template: "",
                    },
                },
                preferMetadataFormat: "tasks",
                timeParsing: DEFAULT_TIME_PARSING_CONFIG,
            },
        };
        modal = new QuickCaptureModal(mockApp, mockPlugin, undefined, true);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe("Time Parsing Service Integration", () => {
        test("should initialize with plugin settings", () => {
            expect(modal.timeParsingService).toBeDefined();
            expect(modal.timeParsingService.getConfig()).toEqual(mockPlugin.settings.timeParsing);
        });
        test("should fallback to default config when plugin settings missing", () => {
            const pluginWithoutTimeParsing = Object.assign(Object.assign({}, mockPlugin), { settings: Object.assign(Object.assign({}, mockPlugin.settings), { timeParsing: undefined }) });
            const modalWithoutConfig = new QuickCaptureModal(mockApp, pluginWithoutTimeParsing, undefined, true);
            expect(modalWithoutConfig.timeParsingService).toBeDefined();
            expect(modalWithoutConfig.timeParsingService.getConfig()).toEqual(DEFAULT_TIME_PARSING_CONFIG);
        });
    });
    describe("Content Processing with Time Parsing", () => {
        test("should parse time expressions and update metadata", () => {
            const content = "go to bed tomorrow";
            const result = modal.processContentWithMetadata(content);
            // Should contain task metadata
            expect(result).toContain("📅");
            // Should not contain 'tomorrow' in the final result (cleaned)
            expect(result).not.toContain("tomorrow");
        });
        test("should handle multiple time expressions", () => {
            const content = "start project tomorrow and finish by next week";
            const result = modal.processContentWithMetadata(content);
            // Should process the content and add metadata
            expect(result).toContain("- [ ]");
        });
        test("should preserve content when no time expressions found", () => {
            const content = "regular task without dates";
            const result = modal.processContentWithMetadata(content);
            expect(result).toContain("regular task without dates");
        });
        test("should handle Chinese time expressions", () => {
            const content = "明天开会";
            const result = modal.processContentWithMetadata(content);
            // Should contain task metadata
            expect(result).toContain("📅");
            // Should not contain '明天' in the final result (cleaned)
            expect(result).not.toContain("明天");
        });
    });
    describe("Multiline Processing Integration", () => {
        test("should preserve line structure in multiline content", () => {
            const content = "Task 1 tomorrow\nTask 2 next week\nTask 3 no date";
            const result = modal.processContentWithMetadata(content);
            // Should split into separate lines
            const lines = result.split("\n");
            expect(lines).toHaveLength(3);
            // Each line should be a task
            lines.forEach((line) => {
                expect(line).toMatch(/^- \[ \]/);
            });
        });
        test("should handle different dates per line", () => {
            const content = "Task 1 tomorrow\nTask 2 next week\nTask 3";
            const result = modal.processContentWithMetadata(content);
            const lines = result.split("\n");
            expect(lines).toHaveLength(3);
            // First line should have a date
            expect(lines[0]).toContain("📅");
            expect(lines[0]).not.toContain("tomorrow");
            // Second line should have a different date
            expect(lines[1]).toContain("📅");
            expect(lines[1]).not.toContain("next week");
            // Third line should have no date
            expect(lines[2]).not.toContain("📅");
            expect(lines[2]).toContain("Task 3");
        });
        test("should handle mixed Chinese and English time expressions", () => {
            const content = "任务1 明天\nTask 2 tomorrow\n任务3";
            const result = modal.processContentWithMetadata(content);
            const lines = result.split("\n");
            expect(lines).toHaveLength(3);
            // First line (Chinese)
            expect(lines[0]).toContain("📅");
            expect(lines[0]).not.toContain("明天");
            expect(lines[0]).toContain("任务1");
            // Second line (English)
            expect(lines[1]).toContain("📅");
            expect(lines[1]).not.toContain("tomorrow");
            expect(lines[1]).toContain("Task 2");
            // Third line (no date)
            expect(lines[2]).not.toContain("📅");
            expect(lines[2]).toContain("任务3");
        });
        test("should handle existing task format with different dates", () => {
            const content = "- [ ] Task 1 tomorrow\n- [x] Task 2 next week\n- Task 3";
            const result = modal.processContentWithMetadata(content);
            const lines = result.split("\n");
            expect(lines).toHaveLength(3);
            // First line should preserve checkbox and add date
            expect(lines[0]).toMatch(/^- \[ \]/);
            expect(lines[0]).toContain("📅");
            expect(lines[0]).not.toContain("tomorrow");
            // Second line should preserve completed status and add date
            expect(lines[1]).toMatch(/^- \[x\]/);
            expect(lines[1]).toContain("📅");
            expect(lines[1]).not.toContain("next week");
            // Third line should be converted to task format
            expect(lines[2]).toMatch(/^- \[ \]/);
            expect(lines[2]).not.toContain("📅");
        });
        test("should handle indented subtasks correctly", () => {
            const content = "Main task tomorrow\n  Subtask 1 next week\n  Subtask 2";
            const result = modal.processContentWithMetadata(content);
            const lines = result.split("\n");
            expect(lines).toHaveLength(3);
            // Main task should have date
            expect(lines[0]).toContain("📅");
            expect(lines[0]).not.toContain("tomorrow");
            // Subtasks should preserve indentation but still clean time expressions
            expect(lines[1]).toMatch(/^\s+/); // Should start with whitespace
            expect(lines[1]).not.toContain("next week");
            expect(lines[2]).toMatch(/^\s+/); // Should start with whitespace
            expect(lines[2]).toContain("Subtask 2");
        });
        test("should handle empty lines in multiline content", () => {
            const content = "Task 1 tomorrow\n\nTask 2 next week\n\n";
            const result = modal.processContentWithMetadata(content);
            const lines = result.split("\n");
            expect(lines).toHaveLength(5);
            // First line should be a task with date
            expect(lines[0]).toMatch(/^- \[ \]/);
            expect(lines[0]).toContain("📅");
            // Second line should be empty
            expect(lines[1]).toBe("");
            // Third line should be a task with date
            expect(lines[2]).toMatch(/^- \[ \]/);
            expect(lines[2]).toContain("📅");
            // Fourth and fifth lines should be empty
            expect(lines[3]).toBe("");
            expect(lines[4]).toBe("");
        });
        test("should handle global metadata combined with line-specific dates", () => {
            // Set global metadata
            modal.taskMetadata.priority = 3;
            modal.taskMetadata.project = "TestProject";
            const content = "Task 1 tomorrow\nTask 2 next week";
            const result = modal.processContentWithMetadata(content);
            const lines = result.split("\n");
            expect(lines).toHaveLength(2);
            // Both lines should have global metadata (priority, project) plus line-specific dates
            lines.forEach((line) => {
                expect(line).toContain("🔼"); // Priority medium
                expect(line).toContain("#project/TestProject");
                expect(line).toContain("📅"); // Line-specific date
            });
            // Clean up
            modal.taskMetadata.priority = undefined;
            modal.taskMetadata.project = undefined;
        });
    });
    describe("Manual Override Functionality", () => {
        test("should track manually set dates", () => {
            modal.markAsManuallySet("dueDate");
            expect(modal.isManuallySet("dueDate")).toBe(true);
            expect(modal.isManuallySet("startDate")).toBe(false);
        });
        test("should not override manually set dates", () => {
            // Manually set a due date
            modal.taskMetadata.dueDate = new Date("2025-01-10");
            modal.markAsManuallySet("dueDate");
            // Process content with time expression
            const content = "task tomorrow";
            modal.processContentWithMetadata(content);
            // Should preserve manually set date
            expect(modal.taskMetadata.dueDate).toEqual(new Date("2025-01-10"));
        });
    });
    describe("Metadata Format Generation", () => {
        test("should generate metadata in tasks format", () => {
            modal.preferMetadataFormat = "tasks";
            modal.taskMetadata.dueDate = new Date("2025-01-05");
            modal.taskMetadata.priority = 3;
            const metadata = modal.generateMetadataString();
            expect(metadata).toContain("📅 2025-01-05");
            expect(metadata).toContain("🔼");
        });
        test("should generate metadata in dataview format", () => {
            modal.preferMetadataFormat = "dataview";
            modal.taskMetadata.dueDate = new Date("2025-01-05");
            modal.taskMetadata.priority = 3;
            const metadata = modal.generateMetadataString();
            expect(metadata).toContain("[due:: 2025-01-05]");
            expect(metadata).toContain("[priority:: medium]");
        });
    });
    describe("Task Line Processing", () => {
        test("should convert plain text to task with metadata", () => {
            modal.taskMetadata.dueDate = new Date("2025-01-05");
            const taskLine = modal.addMetadataToTask("- [ ] test task");
            expect(taskLine).toContain("- [ ] test task");
            expect(taskLine).toContain("📅 2025-01-05");
        });
        test("should handle existing task format", () => {
            modal.taskMetadata.dueDate = new Date("2025-01-05");
            const taskLine = modal.addMetadataToTask("- [x] completed task");
            expect(taskLine).toContain("- [x] completed task");
            expect(taskLine).toContain("📅 2025-01-05");
        });
    });
    describe("Date Formatting", () => {
        test("should format dates correctly", () => {
            const date = new Date("2025-01-05");
            const formatted = modal.formatDate(date);
            expect(formatted).toBe("2025-01-05");
        });
        test("should parse date strings correctly", () => {
            const parsed = modal.parseDate("2025-01-05");
            expect(parsed.getFullYear()).toBe(2025);
            expect(parsed.getMonth()).toBe(0); // January is 0
            expect(parsed.getDate()).toBe(5);
        });
    });
    describe("Error Handling", () => {
        test("should handle invalid time expressions gracefully", () => {
            const content = "task with invalid date xyz123";
            const result = modal.processContentWithMetadata(content);
            // Should not crash and should return valid content
            expect(result).toContain("task with invalid date xyz123");
        });
        test("should handle empty content", () => {
            const content = "";
            const result = modal.processContentWithMetadata(content);
            expect(result).toBe("");
        });
    });
    describe("Configuration Updates", () => {
        test("should update time parsing service when config changes", () => {
            const newConfig = { enabled: false };
            modal.timeParsingService.updateConfig(newConfig);
            const config = modal.timeParsingService.getConfig();
            expect(config.enabled).toBe(false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVpY2tDYXB0dXJlTW9kYWwuaW50ZWdyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlF1aWNrQ2FwdHVyZU1vZGFsLmludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDbEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUvQixvQkFBb0I7QUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM1QixHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNkLEtBQUssRUFBRSxNQUFNLFNBQVM7UUFDckIsWUFBWSxHQUFRLEVBQUUsTUFBVztZQUlqQyxZQUFPLEdBQUcsRUFBRSxXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDckMsWUFBTyxHQUFHLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7WUFDeEQsY0FBUyxHQUFHO2dCQUNYLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUNoQixTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO29CQUN6QixTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtvQkFDcEIsUUFBUSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQ25CLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO29CQUNyQixRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtvQkFDbkIsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7b0JBQ3ZCLGdCQUFn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SUFFSCxRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLEVBQUU7WUFDbkUsTUFBTSxTQUFTLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLENBQUM7WUFDckMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVqRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUXVpY2tDYXB0dXJlTW9kYWwgfSBmcm9tIFwiLi4vY29tcG9uZW50cy9mZWF0dXJlcy9xdWljay1jYXB0dXJlL21vZGFscy9RdWlja0NhcHR1cmVNb2RhbFwiO1xyXG5pbXBvcnQgeyBERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUcgfSBmcm9tICdAL3NlcnZpY2VzL3RpbWUtcGFyc2luZy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIGRlcGVuZGVuY2llc1xyXG5qZXN0Lm1vY2soXCJvYnNpZGlhblwiLCAoKSA9PiAoe1xyXG5cdEFwcDogamVzdC5mbigpLFxyXG5cdE1vZGFsOiBjbGFzcyBNb2NrTW9kYWwge1xyXG5cdFx0Y29uc3RydWN0b3IoYXBwOiBhbnksIHBsdWdpbjogYW55KSB7fVxyXG5cdFx0b25PcGVuKCkge31cclxuXHRcdG9uQ2xvc2UoKSB7fVxyXG5cdFx0Y2xvc2UoKSB7fVxyXG5cdFx0bW9kYWxFbCA9IHsgdG9nZ2xlQ2xhc3M6IGplc3QuZm4oKSB9O1xyXG5cdFx0dGl0bGVFbCA9IHsgY3JlYXRlRGl2OiBqZXN0LmZuKCksIGNyZWF0ZUVsOiBqZXN0LmZuKCkgfTtcclxuXHRcdGNvbnRlbnRFbCA9IHtcclxuXHRcdFx0ZW1wdHk6IGplc3QuZm4oKSxcclxuXHRcdFx0Y3JlYXRlRGl2OiBqZXN0LmZuKCgpID0+ICh7XHJcblx0XHRcdFx0Y3JlYXRlRGl2OiBqZXN0LmZuKCksXHJcblx0XHRcdFx0Y3JlYXRlRWw6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRjcmVhdGVTcGFuOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0YWRkQ2xhc3M6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRzZXRBdHRyaWJ1dGU6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRhZGRFdmVudExpc3RlbmVyOiBqZXN0LmZuKCksXHJcblx0XHRcdH0pKSxcclxuXHRcdFx0Y3JlYXRlRWw6IGplc3QuZm4oKSxcclxuXHRcdH07XHJcblx0fSxcclxuXHRTZXR0aW5nOiBjbGFzcyBNb2NrU2V0dGluZyB7XHJcblx0XHRjb25zdHJ1Y3Rvcihjb250YWluZXJFbDogYW55KSB7fVxyXG5cdFx0c2V0TmFtZShuYW1lOiBzdHJpbmcpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHRzZXREZXNjKGRlc2M6IHN0cmluZykge1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdGFkZFRvZ2dsZShjYjogYW55KSB7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0YWRkVGV4dChjYjogYW55KSB7XHJcblx0XHRcdHJldHVybiB0aGlzO1xyXG5cdFx0fVxyXG5cdFx0YWRkVGV4dEFyZWEoY2I6IGFueSkge1xyXG5cdFx0XHRyZXR1cm4gdGhpcztcclxuXHRcdH1cclxuXHRcdGFkZERyb3Bkb3duKGNiOiBhbnkpIHtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0fSxcclxuXHROb3RpY2U6IGplc3QuZm4oKSxcclxuXHRQbGF0Zm9ybTogeyBpc1Bob25lOiBmYWxzZSB9LFxyXG5cdE1hcmtkb3duUmVuZGVyZXI6IGplc3QuZm4oKSxcclxuXHRtb21lbnQ6ICgpID0+ICh7IGZvcm1hdDogamVzdC5mbigoKSA9PiBcIjIwMjUtMDEtMDRcIikgfSksXHJcblx0RWRpdG9yU3VnZ2VzdDogY2xhc3Mge1xyXG5cdFx0Y29uc3RydWN0b3IoKSB7fVxyXG5cdFx0Z2V0U3VnZ2VzdGlvbnMoKSB7IHJldHVybiBbXTsgfVxyXG5cdFx0cmVuZGVyU3VnZ2VzdGlvbigpIHt9XHJcblx0XHRzZWxlY3RTdWdnZXN0aW9uKCkge31cclxuXHRcdG9uVHJpZ2dlcigpIHsgcmV0dXJuIG51bGw7IH1cclxuXHRcdGNsb3NlKCkge31cclxuXHR9LFxyXG59KSk7XHJcblxyXG4vLyBNb2NrIG1vbWVudCBtb2R1bGVcclxuamVzdC5tb2NrKFwibW9tZW50XCIsICgpID0+IHtcclxuXHRjb25zdCBtb21lbnQgPSBmdW5jdGlvbihpbnB1dD86IGFueSkge1xyXG5cdFx0cmV0dXJuIHtcclxuXHRcdFx0Zm9ybWF0OiAoKSA9PiBcIjIwMjQtMDEtMDFcIixcclxuXHRcdFx0ZGlmZjogKCkgPT4gMCxcclxuXHRcdFx0c3RhcnRPZjogKCkgPT4gbW9tZW50KGlucHV0KSxcclxuXHRcdFx0ZW5kT2Y6ICgpID0+IG1vbWVudChpbnB1dCksXHJcblx0XHRcdGlzU2FtZTogKCkgPT4gdHJ1ZSxcclxuXHRcdFx0aXNTYW1lT3JCZWZvcmU6ICgpID0+IHRydWUsXHJcblx0XHRcdGlzU2FtZU9yQWZ0ZXI6ICgpID0+IHRydWUsXHJcblx0XHRcdGlzQmVmb3JlOiAoKSA9PiBmYWxzZSxcclxuXHRcdFx0aXNBZnRlcjogKCkgPT4gZmFsc2UsXHJcblx0XHRcdGlzQmV0d2VlbjogKCkgPT4gdHJ1ZSxcclxuXHRcdFx0Y2xvbmU6ICgpID0+IG1vbWVudChpbnB1dCksXHJcblx0XHRcdGFkZDogKCkgPT4gbW9tZW50KGlucHV0KSxcclxuXHRcdFx0c3VidHJhY3Q6ICgpID0+IG1vbWVudChpbnB1dCksXHJcblx0XHRcdHZhbHVlT2Y6ICgpID0+IERhdGUubm93KCksXHJcblx0XHRcdHRvRGF0ZTogKCkgPT4gbmV3IERhdGUoKSxcclxuXHRcdFx0d2Vla2RheTogKCkgPT4gMCxcclxuXHRcdFx0ZGF5OiAoKSA9PiAxLFxyXG5cdFx0XHRkYXRlOiAoKSA9PiAxLFxyXG5cdFx0fTtcclxuXHR9O1xyXG5cdG1vbWVudC5sb2NhbGUgPSBqZXN0LmZuKCgpID0+IFwiZW5cIik7XHJcblx0bW9tZW50LnV0YyA9ICgpID0+ICh7IGZvcm1hdDogKCkgPT4gXCIwMDowMDowMFwiIH0pO1xyXG5cdG1vbWVudC5kdXJhdGlvbiA9ICgpID0+ICh7IGFzTWlsbGlzZWNvbmRzOiAoKSA9PiAwIH0pO1xyXG5cdG1vbWVudC53ZWVrZGF5c1Nob3J0ID0gKCkgPT4gW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdO1xyXG5cdG1vbWVudC53ZWVrZGF5c01pbiA9ICgpID0+IFtcIlN1XCIsIFwiTW9cIiwgXCJUdVwiLCBcIldlXCIsIFwiVGhcIiwgXCJGclwiLCBcIlNhXCJdO1xyXG5cdHJldHVybiBtb21lbnQ7XHJcbn0pO1xyXG5cclxuamVzdC5tb2NrKFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvY29yZS9tYXJrZG93bi1lZGl0b3JcIiwgKCkgPT4gKHtcclxuXHRjcmVhdGVFbWJlZGRhYmxlTWFya2Rvd25FZGl0b3I6IGplc3QuZm4oKCkgPT4gKHtcclxuXHRcdHZhbHVlOiBcIlwiLFxyXG5cdFx0ZWRpdG9yOiB7IGZvY3VzOiBqZXN0LmZuKCkgfSxcclxuXHRcdHNjb3BlOiB7IHJlZ2lzdGVyOiBqZXN0LmZuKCkgfSxcclxuXHRcdGRlc3Ryb3k6IGplc3QuZm4oKSxcclxuXHR9KSksXHJcbn0pKTtcclxuXHJcbmplc3QubW9jayhcIi4uL3V0aWxzL2ZpbGUvZmlsZS1vcGVyYXRpb25zXCIsICgpID0+ICh7XHJcblx0c2F2ZUNhcHR1cmU6IGplc3QuZm4oKSxcclxuXHRwcm9jZXNzRGF0ZVRlbXBsYXRlczogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soXCIuLi9jb21wb25lbnRzL0F1dG9Db21wbGV0ZVwiLCAoKSA9PiAoe1xyXG5cdEZpbGVTdWdnZXN0OiBqZXN0LmZuKCksXHJcblx0Q29udGV4dFN1Z2dlc3Q6IGplc3QuZm4oKSxcclxuXHRQcm9qZWN0U3VnZ2VzdDogamVzdC5mbigpLFxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soXCIuLi90cmFuc2xhdGlvbnMvaGVscGVyXCIsICgpID0+ICh7XHJcblx0dDogKGtleTogc3RyaW5nKSA9PiBrZXksXHJcbn0pKTtcclxuXHJcbmplc3QubW9jayhcIi4uL2NvbXBvbmVudHMvTWFya2Rvd25SZW5kZXJlclwiLCAoKSA9PiAoe1xyXG5cdE1hcmtkb3duUmVuZGVyZXJDb21wb25lbnQ6IGNsYXNzIE1vY2tNYXJrZG93blJlbmRlcmVyIHtcclxuXHRcdGNvbnN0cnVjdG9yKCkge31cclxuXHRcdHJlbmRlcigpIHt9XHJcblx0XHR1bmxvYWQoKSB7fVxyXG5cdH0sXHJcbn0pKTtcclxuXHJcbmplc3QubW9jayhcIi4uL2NvbXBvbmVudHMvU3RhdHVzQ29tcG9uZW50XCIsICgpID0+ICh7XHJcblx0U3RhdHVzQ29tcG9uZW50OiBjbGFzcyBNb2NrU3RhdHVzQ29tcG9uZW50IHtcclxuXHRcdGNvbnN0cnVjdG9yKCkge31cclxuXHRcdGxvYWQoKSB7fVxyXG5cdH0sXHJcbn0pKTtcclxuXHJcbmRlc2NyaWJlKFwiUXVpY2tDYXB0dXJlTW9kYWwgVGltZSBQYXJzaW5nIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRsZXQgbW9ja0FwcDogYW55O1xyXG5cdGxldCBtb2NrUGx1Z2luOiBhbnk7XHJcblx0bGV0IG1vZGFsOiBRdWlja0NhcHR1cmVNb2RhbDtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0gbmV3IEFwcCgpO1xyXG5cdFx0bW9ja1BsdWdpbiA9IHtcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHRxdWlja0NhcHR1cmU6IHtcclxuXHRcdFx0XHRcdHRhcmdldFR5cGU6IFwiZml4ZWRcIixcclxuXHRcdFx0XHRcdHRhcmdldEZpbGU6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdFx0cGxhY2Vob2xkZXI6IFwiRW50ZXIgdGFzay4uLlwiLFxyXG5cdFx0XHRcdFx0ZGFpbHlOb3RlU2V0dGluZ3M6IHtcclxuXHRcdFx0XHRcdFx0Zm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0XHRcdFx0Zm9sZGVyOiBcIlwiLFxyXG5cdFx0XHRcdFx0XHR0ZW1wbGF0ZTogXCJcIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRwcmVmZXJNZXRhZGF0YUZvcm1hdDogXCJ0YXNrc1wiLFxyXG5cdFx0XHRcdHRpbWVQYXJzaW5nOiBERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUcsXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdG1vZGFsID0gbmV3IFF1aWNrQ2FwdHVyZU1vZGFsKG1vY2tBcHAsIG1vY2tQbHVnaW4sIHVuZGVmaW5lZCwgdHJ1ZSk7XHJcblx0fSk7XHJcblxyXG5cdGFmdGVyRWFjaCgoKSA9PiB7XHJcblx0XHRqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUaW1lIFBhcnNpbmcgU2VydmljZSBJbnRlZ3JhdGlvblwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGluaXRpYWxpemUgd2l0aCBwbHVnaW4gc2V0dGluZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRleHBlY3QobW9kYWwudGltZVBhcnNpbmdTZXJ2aWNlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobW9kYWwudGltZVBhcnNpbmdTZXJ2aWNlLmdldENvbmZpZygpKS50b0VxdWFsKFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4uc2V0dGluZ3MudGltZVBhcnNpbmdcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgZmFsbGJhY2sgdG8gZGVmYXVsdCBjb25maWcgd2hlbiBwbHVnaW4gc2V0dGluZ3MgbWlzc2luZ1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBsdWdpbldpdGhvdXRUaW1lUGFyc2luZyA9IHtcclxuXHRcdFx0XHQuLi5tb2NrUGx1Z2luLFxyXG5cdFx0XHRcdHNldHRpbmdzOiB7XHJcblx0XHRcdFx0XHQuLi5tb2NrUGx1Z2luLnNldHRpbmdzLFxyXG5cdFx0XHRcdFx0dGltZVBhcnNpbmc6IHVuZGVmaW5lZCxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbW9kYWxXaXRob3V0Q29uZmlnID0gbmV3IFF1aWNrQ2FwdHVyZU1vZGFsKFxyXG5cdFx0XHRcdG1vY2tBcHAsXHJcblx0XHRcdFx0cGx1Z2luV2l0aG91dFRpbWVQYXJzaW5nLFxyXG5cdFx0XHRcdHVuZGVmaW5lZCxcclxuXHRcdFx0XHR0cnVlXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChtb2RhbFdpdGhvdXRDb25maWcudGltZVBhcnNpbmdTZXJ2aWNlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QobW9kYWxXaXRob3V0Q29uZmlnLnRpbWVQYXJzaW5nU2VydmljZS5nZXRDb25maWcoKSkudG9FcXVhbChcclxuXHRcdFx0XHRERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUdcclxuXHRcdFx0KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNvbnRlbnQgUHJvY2Vzc2luZyB3aXRoIFRpbWUgUGFyc2luZ1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHBhcnNlIHRpbWUgZXhwcmVzc2lvbnMgYW5kIHVwZGF0ZSBtZXRhZGF0YVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcImdvIHRvIGJlZCB0b21vcnJvd1wiO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2RhbC5wcm9jZXNzQ29udGVudFdpdGhNZXRhZGF0YShjb250ZW50KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBjb250YWluIHRhc2sgbWV0YWRhdGFcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9Db250YWluKFwi8J+ThVwiKTtcclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCBjb250YWluICd0b21vcnJvdycgaW4gdGhlIGZpbmFsIHJlc3VsdCAoY2xlYW5lZClcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkubm90LnRvQ29udGFpbihcInRvbW9ycm93XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbXVsdGlwbGUgdGltZSBleHByZXNzaW9uc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcInN0YXJ0IHByb2plY3QgdG9tb3Jyb3cgYW5kIGZpbmlzaCBieSBuZXh0IHdlZWtcIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9kYWwucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgcHJvY2VzcyB0aGUgY29udGVudCBhbmQgYWRkIG1ldGFkYXRhXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQ29udGFpbihcIi0gWyBdXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBwcmVzZXJ2ZSBjb250ZW50IHdoZW4gbm8gdGltZSBleHByZXNzaW9ucyBmb3VuZFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcInJlZ3VsYXIgdGFzayB3aXRob3V0IGRhdGVzXCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vZGFsLnByb2Nlc3NDb250ZW50V2l0aE1ldGFkYXRhKGNvbnRlbnQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9Db250YWluKFwicmVndWxhciB0YXNrIHdpdGhvdXQgZGF0ZXNcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBDaGluZXNlIHRpbWUgZXhwcmVzc2lvbnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCLmmI7lpKnlvIDkvJpcIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9kYWwucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgY29udGFpbiB0YXNrIG1ldGFkYXRhXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblx0XHRcdC8vIFNob3VsZCBub3QgY29udGFpbiAn5piO5aSpJyBpbiB0aGUgZmluYWwgcmVzdWx0IChjbGVhbmVkKVxyXG5cdFx0XHRleHBlY3QocmVzdWx0KS5ub3QudG9Db250YWluKFwi5piO5aSpXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTXVsdGlsaW5lIFByb2Nlc3NpbmcgSW50ZWdyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBwcmVzZXJ2ZSBsaW5lIHN0cnVjdHVyZSBpbiBtdWx0aWxpbmUgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIlRhc2sgMSB0b21vcnJvd1xcblRhc2sgMiBuZXh0IHdlZWtcXG5UYXNrIDMgbm8gZGF0ZVwiO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2RhbC5wcm9jZXNzQ29udGVudFdpdGhNZXRhZGF0YShjb250ZW50KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBzcGxpdCBpbnRvIHNlcGFyYXRlIGxpbmVzXHJcblx0XHRcdGNvbnN0IGxpbmVzID0gcmVzdWx0LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXMpLnRvSGF2ZUxlbmd0aCgzKTtcclxuXHJcblx0XHRcdC8vIEVhY2ggbGluZSBzaG91bGQgYmUgYSB0YXNrXHJcblx0XHRcdGxpbmVzLmZvckVhY2goKGxpbmUpID0+IHtcclxuXHRcdFx0XHRleHBlY3QobGluZSkudG9NYXRjaCgvXi0gXFxbIFxcXS8pO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGRpZmZlcmVudCBkYXRlcyBwZXIgbGluZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIlRhc2sgMSB0b21vcnJvd1xcblRhc2sgMiBuZXh0IHdlZWtcXG5UYXNrIDNcIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9kYWwucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lcyA9IHJlc3VsdC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzKS50b0hhdmVMZW5ndGgoMyk7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBsaW5lIHNob3VsZCBoYXZlIGEgZGF0ZVxyXG5cdFx0XHRleHBlY3QobGluZXNbMF0pLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lc1swXSkubm90LnRvQ29udGFpbihcInRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIGxpbmUgc2hvdWxkIGhhdmUgYSBkaWZmZXJlbnQgZGF0ZVxyXG5cdFx0XHRleHBlY3QobGluZXNbMV0pLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lc1sxXSkubm90LnRvQ29udGFpbihcIm5leHQgd2Vla1wiKTtcclxuXHJcblx0XHRcdC8vIFRoaXJkIGxpbmUgc2hvdWxkIGhhdmUgbm8gZGF0ZVxyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLm5vdC50b0NvbnRhaW4oXCLwn5OFXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLnRvQ29udGFpbihcIlRhc2sgM1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIG1peGVkIENoaW5lc2UgYW5kIEVuZ2xpc2ggdGltZSBleHByZXNzaW9uc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIuS7u+WKoTEg5piO5aSpXFxuVGFzayAyIHRvbW9ycm93XFxu5Lu75YqhM1wiO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2RhbC5wcm9jZXNzQ29udGVudFdpdGhNZXRhZGF0YShjb250ZW50KTtcclxuXHJcblx0XHRcdGNvbnN0IGxpbmVzID0gcmVzdWx0LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXMpLnRvSGF2ZUxlbmd0aCgzKTtcclxuXHJcblx0XHRcdC8vIEZpcnN0IGxpbmUgKENoaW5lc2UpXHJcblx0XHRcdGV4cGVjdChsaW5lc1swXSkudG9Db250YWluKFwi8J+ThVwiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzBdKS5ub3QudG9Db250YWluKFwi5piO5aSpXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMF0pLnRvQ29udGFpbihcIuS7u+WKoTFcIik7XHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgbGluZSAoRW5nbGlzaClcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzFdKS50b0NvbnRhaW4oXCLwn5OFXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMV0pLm5vdC50b0NvbnRhaW4oXCJ0b21vcnJvd1wiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzFdKS50b0NvbnRhaW4oXCJUYXNrIDJcIik7XHJcblxyXG5cdFx0XHQvLyBUaGlyZCBsaW5lIChubyBkYXRlKVxyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLm5vdC50b0NvbnRhaW4oXCLwn5OFXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLnRvQ29udGFpbihcIuS7u+WKoTNcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBleGlzdGluZyB0YXNrIGZvcm1hdCB3aXRoIGRpZmZlcmVudCBkYXRlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPVxyXG5cdFx0XHRcdFwiLSBbIF0gVGFzayAxIHRvbW9ycm93XFxuLSBbeF0gVGFzayAyIG5leHQgd2Vla1xcbi0gVGFzayAzXCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vZGFsLnByb2Nlc3NDb250ZW50V2l0aE1ldGFkYXRhKGNvbnRlbnQpO1xyXG5cclxuXHRcdFx0Y29uc3QgbGluZXMgPSByZXN1bHQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRcdGV4cGVjdChsaW5lcykudG9IYXZlTGVuZ3RoKDMpO1xyXG5cclxuXHRcdFx0Ly8gRmlyc3QgbGluZSBzaG91bGQgcHJlc2VydmUgY2hlY2tib3ggYW5kIGFkZCBkYXRlXHJcblx0XHRcdGV4cGVjdChsaW5lc1swXSkudG9NYXRjaCgvXi0gXFxbIFxcXS8pO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMF0pLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lc1swXSkubm90LnRvQ29udGFpbihcInRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIGxpbmUgc2hvdWxkIHByZXNlcnZlIGNvbXBsZXRlZCBzdGF0dXMgYW5kIGFkZCBkYXRlXHJcblx0XHRcdGV4cGVjdChsaW5lc1sxXSkudG9NYXRjaCgvXi0gXFxbeFxcXS8pO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMV0pLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lc1sxXSkubm90LnRvQ29udGFpbihcIm5leHQgd2Vla1wiKTtcclxuXHJcblx0XHRcdC8vIFRoaXJkIGxpbmUgc2hvdWxkIGJlIGNvbnZlcnRlZCB0byB0YXNrIGZvcm1hdFxyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLnRvTWF0Y2goL14tIFxcWyBcXF0vKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzJdKS5ub3QudG9Db250YWluKFwi8J+ThVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGluZGVudGVkIHN1YnRhc2tzIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPVxyXG5cdFx0XHRcdFwiTWFpbiB0YXNrIHRvbW9ycm93XFxuICBTdWJ0YXNrIDEgbmV4dCB3ZWVrXFxuICBTdWJ0YXNrIDJcIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9kYWwucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lcyA9IHJlc3VsdC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzKS50b0hhdmVMZW5ndGgoMyk7XHJcblxyXG5cdFx0XHQvLyBNYWluIHRhc2sgc2hvdWxkIGhhdmUgZGF0ZVxyXG5cdFx0XHRleHBlY3QobGluZXNbMF0pLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lc1swXSkubm90LnRvQ29udGFpbihcInRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0Ly8gU3VidGFza3Mgc2hvdWxkIHByZXNlcnZlIGluZGVudGF0aW9uIGJ1dCBzdGlsbCBjbGVhbiB0aW1lIGV4cHJlc3Npb25zXHJcblx0XHRcdGV4cGVjdChsaW5lc1sxXSkudG9NYXRjaCgvXlxccysvKTsgLy8gU2hvdWxkIHN0YXJ0IHdpdGggd2hpdGVzcGFjZVxyXG5cdFx0XHRleHBlY3QobGluZXNbMV0pLm5vdC50b0NvbnRhaW4oXCJuZXh0IHdlZWtcIik7XHJcblxyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLnRvTWF0Y2goL15cXHMrLyk7IC8vIFNob3VsZCBzdGFydCB3aXRoIHdoaXRlc3BhY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzJdKS50b0NvbnRhaW4oXCJTdWJ0YXNrIDJcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBlbXB0eSBsaW5lcyBpbiBtdWx0aWxpbmUgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIlRhc2sgMSB0b21vcnJvd1xcblxcblRhc2sgMiBuZXh0IHdlZWtcXG5cXG5cIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9kYWwucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lcyA9IHJlc3VsdC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzKS50b0hhdmVMZW5ndGgoNSk7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBsaW5lIHNob3VsZCBiZSBhIHRhc2sgd2l0aCBkYXRlXHJcblx0XHRcdGV4cGVjdChsaW5lc1swXSkudG9NYXRjaCgvXi0gXFxbIFxcXS8pO1xyXG5cdFx0XHRleHBlY3QobGluZXNbMF0pLnRvQ29udGFpbihcIvCfk4VcIik7XHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgbGluZSBzaG91bGQgYmUgZW1wdHlcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzFdKS50b0JlKFwiXCIpO1xyXG5cclxuXHRcdFx0Ly8gVGhpcmQgbGluZSBzaG91bGQgYmUgYSB0YXNrIHdpdGggZGF0ZVxyXG5cdFx0XHRleHBlY3QobGluZXNbMl0pLnRvTWF0Y2goL14tIFxcWyBcXF0vKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzJdKS50b0NvbnRhaW4oXCLwn5OFXCIpO1xyXG5cclxuXHRcdFx0Ly8gRm91cnRoIGFuZCBmaWZ0aCBsaW5lcyBzaG91bGQgYmUgZW1wdHlcclxuXHRcdFx0ZXhwZWN0KGxpbmVzWzNdKS50b0JlKFwiXCIpO1xyXG5cdFx0XHRleHBlY3QobGluZXNbNF0pLnRvQmUoXCJcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBnbG9iYWwgbWV0YWRhdGEgY29tYmluZWQgd2l0aCBsaW5lLXNwZWNpZmljIGRhdGVzXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gU2V0IGdsb2JhbCBtZXRhZGF0YVxyXG5cdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSAzO1xyXG5cdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEucHJvamVjdCA9IFwiVGVzdFByb2plY3RcIjtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIlRhc2sgMSB0b21vcnJvd1xcblRhc2sgMiBuZXh0IHdlZWtcIjtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbW9kYWwucHJvY2Vzc0NvbnRlbnRXaXRoTWV0YWRhdGEoY29udGVudCk7XHJcblxyXG5cdFx0XHRjb25zdCBsaW5lcyA9IHJlc3VsdC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVzKS50b0hhdmVMZW5ndGgoMik7XHJcblxyXG5cdFx0XHQvLyBCb3RoIGxpbmVzIHNob3VsZCBoYXZlIGdsb2JhbCBtZXRhZGF0YSAocHJpb3JpdHksIHByb2plY3QpIHBsdXMgbGluZS1zcGVjaWZpYyBkYXRlc1xyXG5cdFx0XHRsaW5lcy5mb3JFYWNoKChsaW5lKSA9PiB7XHJcblx0XHRcdFx0ZXhwZWN0KGxpbmUpLnRvQ29udGFpbihcIvCflLxcIik7IC8vIFByaW9yaXR5IG1lZGl1bVxyXG5cdFx0XHRcdGV4cGVjdChsaW5lKS50b0NvbnRhaW4oXCIjcHJvamVjdC9UZXN0UHJvamVjdFwiKTtcclxuXHRcdFx0XHRleHBlY3QobGluZSkudG9Db250YWluKFwi8J+ThVwiKTsgLy8gTGluZS1zcGVjaWZpYyBkYXRlXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gQ2xlYW4gdXBcclxuXHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnByaW9yaXR5ID0gdW5kZWZpbmVkO1xyXG5cdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEucHJvamVjdCA9IHVuZGVmaW5lZDtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIk1hbnVhbCBPdmVycmlkZSBGdW5jdGlvbmFsaXR5XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgdHJhY2sgbWFudWFsbHkgc2V0IGRhdGVzXCIsICgpID0+IHtcclxuXHRcdFx0bW9kYWwubWFya0FzTWFudWFsbHlTZXQoXCJkdWVEYXRlXCIpO1xyXG5cdFx0XHRleHBlY3QobW9kYWwuaXNNYW51YWxseVNldChcImR1ZURhdGVcIikpLnRvQmUodHJ1ZSk7XHJcblx0XHRcdGV4cGVjdChtb2RhbC5pc01hbnVhbGx5U2V0KFwic3RhcnREYXRlXCIpKS50b0JlKGZhbHNlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbm90IG92ZXJyaWRlIG1hbnVhbGx5IHNldCBkYXRlc1wiLCAoKSA9PiB7XHJcblx0XHRcdC8vIE1hbnVhbGx5IHNldCBhIGR1ZSBkYXRlXHJcblx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gbmV3IERhdGUoXCIyMDI1LTAxLTEwXCIpO1xyXG5cdFx0XHRtb2RhbC5tYXJrQXNNYW51YWxseVNldChcImR1ZURhdGVcIik7XHJcblxyXG5cdFx0XHQvLyBQcm9jZXNzIGNvbnRlbnQgd2l0aCB0aW1lIGV4cHJlc3Npb25cclxuXHRcdFx0Y29uc3QgY29udGVudCA9IFwidGFzayB0b21vcnJvd1wiO1xyXG5cdFx0XHRtb2RhbC5wcm9jZXNzQ29udGVudFdpdGhNZXRhZGF0YShjb250ZW50KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBwcmVzZXJ2ZSBtYW51YWxseSBzZXQgZGF0ZVxyXG5cdFx0XHRleHBlY3QobW9kYWwudGFza01ldGFkYXRhLmR1ZURhdGUpLnRvRXF1YWwobmV3IERhdGUoXCIyMDI1LTAxLTEwXCIpKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIk1ldGFkYXRhIEZvcm1hdCBHZW5lcmF0aW9uXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgZ2VuZXJhdGUgbWV0YWRhdGEgaW4gdGFza3MgZm9ybWF0XCIsICgpID0+IHtcclxuXHRcdFx0bW9kYWwucHJlZmVyTWV0YWRhdGFGb3JtYXQgPSBcInRhc2tzXCI7XHJcblx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gbmV3IERhdGUoXCIyMDI1LTAxLTA1XCIpO1xyXG5cdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEucHJpb3JpdHkgPSAzO1xyXG5cclxuXHRcdFx0Y29uc3QgbWV0YWRhdGEgPSBtb2RhbC5nZW5lcmF0ZU1ldGFkYXRhU3RyaW5nKCk7XHJcblx0XHRcdGV4cGVjdChtZXRhZGF0YSkudG9Db250YWluKFwi8J+ThSAyMDI1LTAxLTA1XCIpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEpLnRvQ29udGFpbihcIvCflLxcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGdlbmVyYXRlIG1ldGFkYXRhIGluIGRhdGF2aWV3IGZvcm1hdFwiLCAoKSA9PiB7XHJcblx0XHRcdG1vZGFsLnByZWZlck1ldGFkYXRhRm9ybWF0ID0gXCJkYXRhdmlld1wiO1xyXG5cdFx0XHRtb2RhbC50YXNrTWV0YWRhdGEuZHVlRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNS0wMS0wNVwiKTtcclxuXHRcdFx0bW9kYWwudGFza01ldGFkYXRhLnByaW9yaXR5ID0gMztcclxuXHJcblx0XHRcdGNvbnN0IG1ldGFkYXRhID0gbW9kYWwuZ2VuZXJhdGVNZXRhZGF0YVN0cmluZygpO1xyXG5cdFx0XHRleHBlY3QobWV0YWRhdGEpLnRvQ29udGFpbihcIltkdWU6OiAyMDI1LTAxLTA1XVwiKTtcclxuXHRcdFx0ZXhwZWN0KG1ldGFkYXRhKS50b0NvbnRhaW4oXCJbcHJpb3JpdHk6OiBtZWRpdW1dXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiVGFzayBMaW5lIFByb2Nlc3NpbmdcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBjb252ZXJ0IHBsYWluIHRleHQgdG8gdGFzayB3aXRoIG1ldGFkYXRhXCIsICgpID0+IHtcclxuXHRcdFx0bW9kYWwudGFza01ldGFkYXRhLmR1ZURhdGUgPSBuZXcgRGF0ZShcIjIwMjUtMDEtMDVcIik7XHJcblx0XHRcdGNvbnN0IHRhc2tMaW5lID0gbW9kYWwuYWRkTWV0YWRhdGFUb1Rhc2soXCItIFsgXSB0ZXN0IHRhc2tcIik7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza0xpbmUpLnRvQ29udGFpbihcIi0gWyBdIHRlc3QgdGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHRhc2tMaW5lKS50b0NvbnRhaW4oXCLwn5OFIDIwMjUtMDEtMDVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBleGlzdGluZyB0YXNrIGZvcm1hdFwiLCAoKSA9PiB7XHJcblx0XHRcdG1vZGFsLnRhc2tNZXRhZGF0YS5kdWVEYXRlID0gbmV3IERhdGUoXCIyMDI1LTAxLTA1XCIpO1xyXG5cdFx0XHRjb25zdCB0YXNrTGluZSA9IG1vZGFsLmFkZE1ldGFkYXRhVG9UYXNrKFwiLSBbeF0gY29tcGxldGVkIHRhc2tcIik7XHJcblxyXG5cdFx0XHRleHBlY3QodGFza0xpbmUpLnRvQ29udGFpbihcIi0gW3hdIGNvbXBsZXRlZCB0YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QodGFza0xpbmUpLnRvQ29udGFpbihcIvCfk4UgMjAyNS0wMS0wNVwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkRhdGUgRm9ybWF0dGluZ1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGZvcm1hdCBkYXRlcyBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBkYXRlID0gbmV3IERhdGUoXCIyMDI1LTAxLTA1XCIpO1xyXG5cdFx0XHRjb25zdCBmb3JtYXR0ZWQgPSBtb2RhbC5mb3JtYXREYXRlKGRhdGUpO1xyXG5cdFx0XHRleHBlY3QoZm9ybWF0dGVkKS50b0JlKFwiMjAyNS0wMS0wNVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcGFyc2UgZGF0ZSBzdHJpbmdzIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcnNlZCA9IG1vZGFsLnBhcnNlRGF0ZShcIjIwMjUtMDEtMDVcIik7XHJcblx0XHRcdGV4cGVjdChwYXJzZWQuZ2V0RnVsbFllYXIoKSkudG9CZSgyMDI1KTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlZC5nZXRNb250aCgpKS50b0JlKDApOyAvLyBKYW51YXJ5IGlzIDBcclxuXHRcdFx0ZXhwZWN0KHBhcnNlZC5nZXREYXRlKCkpLnRvQmUoNSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFcnJvciBIYW5kbGluZ1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIHRpbWUgZXhwcmVzc2lvbnMgZ3JhY2VmdWxseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcInRhc2sgd2l0aCBpbnZhbGlkIGRhdGUgeHl6MTIzXCI7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1vZGFsLnByb2Nlc3NDb250ZW50V2l0aE1ldGFkYXRhKGNvbnRlbnQpO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIG5vdCBjcmFzaCBhbmQgc2hvdWxkIHJldHVybiB2YWxpZCBjb250ZW50XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQ29udGFpbihcInRhc2sgd2l0aCBpbnZhbGlkIGRhdGUgeHl6MTIzXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZW1wdHkgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbnRlbnQgPSBcIlwiO1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtb2RhbC5wcm9jZXNzQ29udGVudFdpdGhNZXRhZGF0YShjb250ZW50KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoXCJcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJDb25maWd1cmF0aW9uIFVwZGF0ZXNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCB1cGRhdGUgdGltZSBwYXJzaW5nIHNlcnZpY2Ugd2hlbiBjb25maWcgY2hhbmdlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG5ld0NvbmZpZyA9IHsgZW5hYmxlZDogZmFsc2UgfTtcclxuXHRcdFx0bW9kYWwudGltZVBhcnNpbmdTZXJ2aWNlLnVwZGF0ZUNvbmZpZyhuZXdDb25maWcpO1xyXG5cclxuXHRcdFx0Y29uc3QgY29uZmlnID0gbW9kYWwudGltZVBhcnNpbmdTZXJ2aWNlLmdldENvbmZpZygpO1xyXG5cdFx0XHRleHBlY3QoY29uZmlnLmVuYWJsZWQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=