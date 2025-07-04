import { QuickCaptureModal } from "../components/QuickCaptureModal";
import { DEFAULT_TIME_PARSING_CONFIG } from "../utils/TimeParsingService";
import { App } from "obsidian";

// Mock dependencies
jest.mock("obsidian", () => ({
	App: jest.fn(),
	Modal: class MockModal {
		constructor(app: any, plugin: any) {}
		onOpen() {}
		onClose() {}
		close() {}
		modalEl = { toggleClass: jest.fn() };
		titleEl = { createDiv: jest.fn(), createEl: jest.fn() };
		contentEl = {
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
	},
	Setting: class MockSetting {
		constructor(containerEl: any) {}
		setName(name: string) {
			return this;
		}
		setDesc(desc: string) {
			return this;
		}
		addToggle(cb: any) {
			return this;
		}
		addText(cb: any) {
			return this;
		}
		addTextArea(cb: any) {
			return this;
		}
		addDropdown(cb: any) {
			return this;
		}
	},
	Notice: jest.fn(),
	Platform: { isPhone: false },
	MarkdownRenderer: jest.fn(),
	moment: () => ({ format: jest.fn(() => "2025-01-04") }),
}));

jest.mock("../editor-ext/markdownEditor", () => ({
	createEmbeddableMarkdownEditor: jest.fn(() => ({
		value: "",
		editor: { focus: jest.fn() },
		scope: { register: jest.fn() },
		destroy: jest.fn(),
	})),
}));

jest.mock("../utils/fileUtils", () => ({
	saveCapture: jest.fn(),
	processDateTemplates: jest.fn(),
}));

jest.mock("../components/AutoComplete", () => ({
	FileSuggest: jest.fn(),
	ContextSuggest: jest.fn(),
	ProjectSuggest: jest.fn(),
}));

jest.mock("../translations/helper", () => ({
	t: (key: string) => key,
}));

jest.mock("../components/MarkdownRenderer", () => ({
	MarkdownRendererComponent: class MockMarkdownRenderer {
		constructor() {}
		render() {}
		unload() {}
	},
}));

jest.mock("../components/StatusComponent", () => ({
	StatusComponent: class MockStatusComponent {
		constructor() {}
		load() {}
	},
}));

describe("QuickCaptureModal Time Parsing Integration", () => {
	let mockApp: any;
	let mockPlugin: any;
	let modal: QuickCaptureModal;

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
			expect(modal.timeParsingService.getConfig()).toEqual(
				mockPlugin.settings.timeParsing
			);
		});

		test("should fallback to default config when plugin settings missing", () => {
			const pluginWithoutTimeParsing = {
				...mockPlugin,
				settings: {
					...mockPlugin.settings,
					timeParsing: undefined,
				},
			};

			const modalWithoutConfig = new QuickCaptureModal(
				mockApp,
				pluginWithoutTimeParsing,
				undefined,
				true
			);
			expect(modalWithoutConfig.timeParsingService).toBeDefined();
			expect(modalWithoutConfig.timeParsingService.getConfig()).toEqual(
				DEFAULT_TIME_PARSING_CONFIG
			);
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
