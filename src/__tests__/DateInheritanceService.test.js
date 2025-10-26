/**
 * Unit tests for DateInheritanceService
 * Tests date inheritance priority logic for time-only expressions
 */
import { __awaiter } from "tslib";
import { DateInheritanceService } from "../services/date-inheritance-service";
// Mock Obsidian modules
jest.mock("obsidian", () => ({
    App: jest.fn(),
    TFile: jest.fn(),
    Vault: jest.fn(),
    MetadataCache: jest.fn(),
}));
describe("DateInheritanceService", () => {
    let service;
    let mockApp;
    let mockVault;
    let mockMetadataCache;
    beforeEach(() => {
        mockApp = {};
        mockVault = {
            getAbstractFileByPath: jest.fn(),
            adapter: {
                stat: jest.fn(),
            },
        };
        mockMetadataCache = {
            getFileCache: jest.fn(),
        };
        service = new DateInheritanceService(mockApp, mockVault, mockMetadataCache);
    });
    afterEach(() => {
        jest.clearAllMocks();
        service.clearCache();
    });
    describe("extractDailyNoteDate", () => {
        it("should extract date from YYYY-MM-DD format", () => {
            const testCases = [
                { path: "2024-03-15.md", expected: new Date(2024, 2, 15) },
                { path: "Daily Notes/2024-03-15.md", expected: new Date(2024, 2, 15) },
                { path: "notes/2024-12-31-meeting.md", expected: new Date(2024, 11, 31) },
            ];
            testCases.forEach(({ path, expected }) => {
                const result = service.extractDailyNoteDate(path);
                expect(result).toEqual(expected);
            });
        });
        it("should extract date from YYYY.MM.DD format", () => {
            const testCases = [
                { path: "2024.03.15.md", expected: new Date(2024, 2, 15) },
                { path: "notes/2024.12.31.md", expected: new Date(2024, 11, 31) },
            ];
            testCases.forEach(({ path, expected }) => {
                const result = service.extractDailyNoteDate(path);
                expect(result).toEqual(expected);
            });
        });
        it("should extract date from YYYY_MM_DD format", () => {
            const testCases = [
                { path: "2024_03_15.md", expected: new Date(2024, 2, 15) },
                { path: "daily/2024_12_31.md", expected: new Date(2024, 11, 31) },
            ];
            testCases.forEach(({ path, expected }) => {
                const result = service.extractDailyNoteDate(path);
                expect(result).toEqual(expected);
            });
        });
        it("should extract date from YYYYMMDD format", () => {
            const testCases = [
                { path: "20240315.md", expected: new Date(2024, 2, 15) },
                { path: "notes/20241231.md", expected: new Date(2024, 11, 31) },
            ];
            testCases.forEach(({ path, expected }) => {
                const result = service.extractDailyNoteDate(path);
                expect(result).toEqual(expected);
            });
        });
        it("should handle MM-DD-YYYY format (US format)", () => {
            const testCases = [
                { path: "03-15-2024.md", expected: new Date(2024, 2, 15) },
                { path: "12-31-2024.md", expected: new Date(2024, 11, 31) },
            ];
            testCases.forEach(({ path, expected }) => {
                const result = service.extractDailyNoteDate(path);
                expect(result).toEqual(expected);
            });
        });
        it("should return null for invalid dates", () => {
            const invalidPaths = [
                "2024-13-15.md",
                "2024-02-30.md",
                "2024-00-15.md",
                "regular-note.md",
                "2024.md", // Incomplete date
            ];
            invalidPaths.forEach((path) => {
                const result = service.extractDailyNoteDate(path);
                expect(result).toBeNull();
            });
        });
        it("should validate leap years correctly", () => {
            // 2024 is a leap year
            const leapYearDate = service.extractDailyNoteDate("2024-02-29.md");
            expect(leapYearDate).toEqual(new Date(2024, 1, 29));
            // 2023 is not a leap year
            const nonLeapYearDate = service.extractDailyNoteDate("2023-02-29.md");
            expect(nonLeapYearDate).toBeNull();
        });
    });
    describe("resolveDateForTimeOnly", () => {
        let mockTask;
        let mockTimeComponent;
        beforeEach(() => {
            mockTask = {
                id: "test-task",
                content: "Test task 12:00～13:00",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Test task 12:00～13:00",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            mockTimeComponent = {
                hour: 12,
                minute: 0,
                originalText: "12:00",
                isRange: true,
                rangePartner: {
                    hour: 13,
                    minute: 0,
                    originalText: "13:00",
                    isRange: true,
                },
            };
        });
        it("should prioritize current line date (Priority 1)", () => __awaiter(void 0, void 0, void 0, function* () {
            const context = {
                currentLine: "- [ ] Meeting 2024-03-15 12:00～13:00",
                filePath: "test.md",
                lineNumber: 1,
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("line-date");
            expect(result.confidence).toBe("high");
            expect(result.usedFallback).toBe(false);
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15));
        }));
        it("should use parent task date when no line date (Priority 2)", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = Object.assign(Object.assign({}, mockTask), { id: "parent-task", metadata: Object.assign(Object.assign({}, mockTask.metadata), { startDate: new Date(2024, 2, 10).getTime() }) });
            const context = {
                currentLine: "- [ ] Subtask 12:00～13:00",
                filePath: "test.md",
                parentTask,
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.confidence).toBe("high");
            expect(result.usedFallback).toBe(false);
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 10));
        }));
        it("should use daily note date when available (Priority 3)", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "2024-03-20.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date(2024, 2, 20).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "- [ ] Task 12:00～13:00",
                filePath: "2024-03-20.md",
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("daily-note-date");
            expect(result.confidence).toBe("high");
            expect(result.usedFallback).toBe(false);
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 20));
        }));
        it("should use file metadata date when available (Priority 3)", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "regular-note.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: {
                    date: "2024-03-18",
                },
            });
            const context = {
                currentLine: "- [ ] Task 12:00～13:00",
                filePath: "regular-note.md",
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("metadata-date");
            expect(result.confidence).toBe("medium");
            expect(result.usedFallback).toBe(false);
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 18));
        }));
        it("should fall back to file creation time (Priority 4)", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock file operations
            const mockFile = { path: "regular-note.md" };
            const ctimeDate = new Date(2024, 2, 5);
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: ctimeDate.getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "- [ ] Task 12:00～13:00",
                filePath: "regular-note.md",
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("file-ctime");
            expect(result.confidence).toBe("low");
            expect(result.usedFallback).toBe(true);
            expect(result.resolvedDate).toEqual(ctimeDate);
        }));
        it("should handle natural language dates in lines", () => __awaiter(void 0, void 0, void 0, function* () {
            const testCases = [
                { line: "- [ ] Meeting tomorrow 12:00～13:00", expectedDaysOffset: 1 },
                { line: "- [ ] Call today 12:00～13:00", expectedDaysOffset: 0 },
                { line: "- [ ] Review yesterday 12:00～13:00", expectedDaysOffset: -1 },
            ];
            for (const { line, expectedDaysOffset } of testCases) {
                const context = {
                    currentLine: line,
                    filePath: "test.md",
                };
                const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
                const expectedDate = new Date();
                expectedDate.setDate(expectedDate.getDate() + expectedDaysOffset);
                expect(result.source).toBe("line-date");
                expect(result.resolvedDate.toDateString()).toBe(expectedDate.toDateString());
            }
        }));
        it("should handle weekday references in lines", () => __awaiter(void 0, void 0, void 0, function* () {
            const context = {
                currentLine: "- [ ] Meeting monday 12:00～13:00",
                filePath: "test.md",
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("line-date");
            expect(result.resolvedDate.getDay()).toBe(1); // Monday
        }));
    });
    describe("getFileDateInfo caching", () => {
        it("should cache file date info", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date(2024, 2, 15).getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: { date: "2024-03-10" },
            });
            // First call
            const result1 = yield service.getFileDateInfo("test.md");
            // Second call should use cache
            const result2 = yield service.getFileDateInfo("test.md");
            expect(mockVault.adapter.stat).toHaveBeenCalledTimes(1);
            expect(result1).toEqual(result2);
        }));
        it("should respect cache size limits", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date().getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({ frontmatter: null });
            // Fill cache beyond limit (MAX_CACHE_SIZE = 500)
            // We'll test with a smaller number for practical testing
            const testFiles = Array.from({ length: 10 }, (_, i) => `test-${i}.md`);
            for (const filePath of testFiles) {
                yield service.getFileDateInfo(filePath);
            }
            const stats = service.getCacheStats();
            expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
        }));
    });
    describe("metadata date parsing", () => {
        it("should parse various metadata date formats", () => __awaiter(void 0, void 0, void 0, function* () {
            const testCases = [
                { frontmatter: { date: "2024-03-15" }, expected: new Date(2024, 2, 15) },
                { frontmatter: { created: "2024-03-15" }, expected: new Date(2024, 2, 15) },
                { frontmatter: { "creation-date": "2024-03-15" }, expected: new Date(2024, 2, 15) },
                { frontmatter: { day: 1710460800000 }, expected: new Date(1710460800000) }, // timestamp
            ];
            for (const { frontmatter, expected } of testCases) {
                const mockFile = { path: "test.md" };
                mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
                mockVault.adapter.stat.mockResolvedValue({
                    ctime: new Date(2024, 0, 1).getTime(),
                    mtime: new Date().getTime(),
                });
                mockMetadataCache.getFileCache.mockReturnValue({ frontmatter });
                const result = yield service.getFileDateInfo("test.md");
                expect(result.metadataDate).toEqual(expected);
                // Clear cache for next test
                service.clearCache();
            }
        }));
        it("should handle invalid metadata dates gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidFrontmatters = [
                { date: "invalid-date" },
                { date: null },
                { date: {} },
                { date: "2024-13-45" }, // Invalid date
            ];
            for (const frontmatter of invalidFrontmatters) {
                const mockFile = { path: "test.md" };
                mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
                mockVault.adapter.stat.mockResolvedValue({
                    ctime: new Date(2024, 0, 1).getTime(),
                    mtime: new Date().getTime(),
                });
                mockMetadataCache.getFileCache.mockReturnValue({ frontmatter });
                const result = yield service.getFileDateInfo("test.md");
                expect(result.metadataDate).toBeNull();
                // Clear cache for next test
                service.clearCache();
            }
        }));
    });
    describe("parent task date inheritance", () => {
        let mockTask;
        let mockTimeComponent;
        beforeEach(() => {
            mockTask = {
                id: "test-task",
                content: "Test task 12:00～13:00",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Test task 12:00～13:00",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            mockTimeComponent = {
                hour: 12,
                minute: 0,
                originalText: "12:00",
                isRange: true,
                rangePartner: {
                    hour: 13,
                    minute: 0,
                    originalText: "13:00",
                    isRange: true,
                },
            };
        });
        it("should prioritize startDate from parent task", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = {
                id: "parent",
                content: "Parent task",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Parent task",
                metadata: {
                    tags: [],
                    children: [],
                    startDate: new Date(2024, 2, 10).getTime(),
                    dueDate: new Date(2024, 2, 15).getTime(),
                    scheduledDate: new Date(2024, 2, 12).getTime(),
                },
            };
            const context = {
                currentLine: "  - [ ] Child task 12:00～13:00",
                filePath: "test.md",
                parentTask,
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 10));
        }));
        it("should fall back to dueDate if no startDate", () => __awaiter(void 0, void 0, void 0, function* () {
            const parentTask = {
                id: "parent",
                content: "Parent task",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Parent task",
                metadata: {
                    tags: [],
                    children: [],
                    dueDate: new Date(2024, 2, 15).getTime(),
                    scheduledDate: new Date(2024, 2, 12).getTime(),
                },
            };
            const context = {
                currentLine: "  - [ ] Child task 12:00～13:00",
                filePath: "test.md",
                parentTask,
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("parent-task");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15));
        }));
    });
    describe("line context analysis", () => {
        let mockTask;
        let mockTimeComponent;
        beforeEach(() => {
            mockTask = {
                id: "test-task",
                content: "Test task 12:00～13:00",
                filePath: "test.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Test task 12:00～13:00",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            mockTimeComponent = {
                hour: 12,
                minute: 0,
                originalText: "12:00",
                isRange: true,
                rangePartner: {
                    hour: 13,
                    minute: 0,
                    originalText: "13:00",
                    isRange: true,
                },
            };
        });
        it("should find dates in nearby lines when provided context", () => __awaiter(void 0, void 0, void 0, function* () {
            const allLines = [
                "# Meeting Notes 2024-03-15",
                "",
                "- [ ] Preparation 10:00～11:00",
                "- [ ] Main meeting 12:00～13:00",
                "- [ ] Follow-up 14:00～15:00",
            ];
            const context = {
                currentLine: "- [ ] Main meeting 12:00～13:00",
                filePath: "test.md",
                lineNumber: 3,
                allLines,
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            expect(result.source).toBe("line-date");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15));
        }));
        it("should not find dates beyond search range", () => __awaiter(void 0, void 0, void 0, function* () {
            const allLines = [
                "# Old Meeting Notes 2024-03-01",
                "",
                "",
                "",
                "",
                "- [ ] Main meeting 12:00～13:00", // Current line (index 5)
            ];
            // Mock file operations for fallback
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 10).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({ frontmatter: null });
            const context = {
                currentLine: "- [ ] Main meeting 12:00～13:00",
                filePath: "test.md",
                lineNumber: 5,
                allLines,
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, mockTimeComponent, context);
            // Should fall back to file ctime since date is too far away
            expect(result.source).toBe("file-ctime");
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0ZUluaGVyaXRhbmNlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRGF0ZUluaGVyaXRhbmNlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7R0FHRzs7QUFFSCxPQUFPLEVBQUUsc0JBQXNCLEVBQXVDLE1BQU0sc0NBQXNDLENBQUM7QUFJbkgsd0JBQXdCO0FBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDNUIsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7SUFDZCxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNoQixLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNoQixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUN4QixDQUFDLENBQUMsQ0FBQztBQUVKLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdkMsSUFBSSxPQUErQixDQUFDO0lBQ3BDLElBQUksT0FBWSxDQUFDO0lBQ2pCLElBQUksU0FBYyxDQUFDO0lBQ25CLElBQUksaUJBQXNCLENBQUM7SUFFM0IsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixTQUFTLEdBQUc7WUFDWCxxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2hDLE9BQU8sRUFBRTtnQkFDUixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTthQUNmO1NBQ0QsQ0FBQztRQUNGLGlCQUFpQixHQUFHO1lBQ25CLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1NBQ3ZCLENBQUM7UUFFRixPQUFPLEdBQUcsSUFBSSxzQkFBc0IsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixDQUFDLENBQUM7SUFDN0UsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLENBQUMsR0FBRyxFQUFF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TUFBTSxRQUFRLEdBQUc7Z0JBQ2hCLGdDQUFnQztnQkFDaEMsRUFBRTtnQkFDRixFQUFFO2dCQUNGLEVBQUU7Z0JBQ0YsRUFBRTtnQkFDRixnQ0FBZ0MsRUFBRSx5QkFBeUI7YUFDM0QsQ0FBQztZQUVGLG9DQUFvQztZQUNwQyxNQUFNLFFBQVEsR0FBRyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztZQUNyQyxTQUFTLENBQUMscUJBQXFCLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzFELFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO2dCQUN4QyxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3RDLEtBQUssRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRTthQUMzQixDQUFDLENBQUM7WUFDSCxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFFdEUsTUFBTSxPQUFPLEdBQTBCO2dCQUN0QyxXQUFXLEVBQUUsZ0NBQWdDO2dCQUM3QyxRQUFRLEVBQUUsU0FBUztnQkFDbkIsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsUUFBUTthQUNSLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFMUYsNERBQTREO1lBQzVELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQSxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFVuaXQgdGVzdHMgZm9yIERhdGVJbmhlcml0YW5jZVNlcnZpY2VcclxuICogVGVzdHMgZGF0ZSBpbmhlcml0YW5jZSBwcmlvcml0eSBsb2dpYyBmb3IgdGltZS1vbmx5IGV4cHJlc3Npb25zXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRGF0ZUluaGVyaXRhbmNlU2VydmljZSwgRGF0ZVJlc29sdXRpb25Db250ZXh0LCBGaWxlRGF0ZUluZm8gfSBmcm9tIFwiLi4vc2VydmljZXMvZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBtb2R1bGVzXHJcbmplc3QubW9jayhcIm9ic2lkaWFuXCIsICgpID0+ICh7XHJcblx0QXBwOiBqZXN0LmZuKCksXHJcblx0VEZpbGU6IGplc3QuZm4oKSxcclxuXHRWYXVsdDogamVzdC5mbigpLFxyXG5cdE1ldGFkYXRhQ2FjaGU6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuZGVzY3JpYmUoXCJEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlXCIsICgpID0+IHtcclxuXHRsZXQgc2VydmljZTogRGF0ZUluaGVyaXRhbmNlU2VydmljZTtcclxuXHRsZXQgbW9ja0FwcDogYW55O1xyXG5cdGxldCBtb2NrVmF1bHQ6IGFueTtcclxuXHRsZXQgbW9ja01ldGFkYXRhQ2FjaGU6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0ge307XHJcblx0XHRtb2NrVmF1bHQgPSB7XHJcblx0XHRcdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdFx0XHRhZGFwdGVyOiB7XHJcblx0XHRcdFx0c3RhdDogamVzdC5mbigpLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdG1vY2tNZXRhZGF0YUNhY2hlID0ge1xyXG5cdFx0XHRnZXRGaWxlQ2FjaGU6IGplc3QuZm4oKSxcclxuXHRcdH07XHJcblxyXG5cdFx0c2VydmljZSA9IG5ldyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlKG1vY2tBcHAsIG1vY2tWYXVsdCwgbW9ja01ldGFkYXRhQ2FjaGUpO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0XHRzZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJleHRyYWN0RGFpbHlOb3RlRGF0ZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBleHRyYWN0IGRhdGUgZnJvbSBZWVlZLU1NLUREIGZvcm1hdFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuXHRcdFx0XHR7IHBhdGg6IFwiMjAyNC0wMy0xNS5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBwYXRoOiBcIkRhaWx5IE5vdGVzLzIwMjQtMDMtMTUubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KSB9LFxyXG5cdFx0XHRcdHsgcGF0aDogXCJub3Rlcy8yMDI0LTEyLTMxLW1lZXRpbmcubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDExLCAzMSkgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHRlc3RDYXNlcy5mb3JFYWNoKCh7IHBhdGgsIGV4cGVjdGVkIH0pID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLmV4dHJhY3REYWlseU5vdGVEYXRlKHBhdGgpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGV4dHJhY3QgZGF0ZSBmcm9tIFlZWVkuTU0uREQgZm9ybWF0XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGVzdENhc2VzID0gW1xyXG5cdFx0XHRcdHsgcGF0aDogXCIyMDI0LjAzLjE1Lm1kXCIsIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkgfSxcclxuXHRcdFx0XHR7IHBhdGg6IFwibm90ZXMvMjAyNC4xMi4zMS5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMTEsIDMxKSB9LFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0dGVzdENhc2VzLmZvckVhY2goKHsgcGF0aCwgZXhwZWN0ZWQgfSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UuZXh0cmFjdERhaWx5Tm90ZURhdGUocGF0aCk7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9FcXVhbChleHBlY3RlZCk7XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgZXh0cmFjdCBkYXRlIGZyb20gWVlZWV9NTV9ERCBmb3JtYXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0eyBwYXRoOiBcIjIwMjRfMDNfMTUubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KSB9LFxyXG5cdFx0XHRcdHsgcGF0aDogXCJkYWlseS8yMDI0XzEyXzMxLm1kXCIsIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAxMSwgMzEpIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHR0ZXN0Q2FzZXMuZm9yRWFjaCgoeyBwYXRoLCBleHBlY3RlZCB9KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5leHRyYWN0RGFpbHlOb3RlRGF0ZShwYXRoKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdGVkKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBleHRyYWN0IGRhdGUgZnJvbSBZWVlZTU1ERCBmb3JtYXRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0eyBwYXRoOiBcIjIwMjQwMzE1Lm1kXCIsIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkgfSxcclxuXHRcdFx0XHR7IHBhdGg6IFwibm90ZXMvMjAyNDEyMzEubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDExLCAzMSkgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHRlc3RDYXNlcy5mb3JFYWNoKCh7IHBhdGgsIGV4cGVjdGVkIH0pID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLmV4dHJhY3REYWlseU5vdGVEYXRlKHBhdGgpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBNTS1ERC1ZWVlZIGZvcm1hdCAoVVMgZm9ybWF0KVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuXHRcdFx0XHR7IHBhdGg6IFwiMDMtMTUtMjAyNC5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBwYXRoOiBcIjEyLTMxLTIwMjQubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDExLCAzMSkgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdHRlc3RDYXNlcy5mb3JFYWNoKCh7IHBhdGgsIGV4cGVjdGVkIH0pID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLmV4dHJhY3REYWlseU5vdGVEYXRlKHBhdGgpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWQpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHJldHVybiBudWxsIGZvciBpbnZhbGlkIGRhdGVzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW52YWxpZFBhdGhzID0gW1xyXG5cdFx0XHRcdFwiMjAyNC0xMy0xNS5tZFwiLCAvLyBJbnZhbGlkIG1vbnRoXHJcblx0XHRcdFx0XCIyMDI0LTAyLTMwLm1kXCIsIC8vIEludmFsaWQgZGF5IGZvciBGZWJydWFyeVxyXG5cdFx0XHRcdFwiMjAyNC0wMC0xNS5tZFwiLCAvLyBJbnZhbGlkIG1vbnRoICgwKVxyXG5cdFx0XHRcdFwicmVndWxhci1ub3RlLm1kXCIsIC8vIE5vIGRhdGUgcGF0dGVyblxyXG5cdFx0XHRcdFwiMjAyNC5tZFwiLCAvLyBJbmNvbXBsZXRlIGRhdGVcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGludmFsaWRQYXRocy5mb3JFYWNoKChwYXRoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5leHRyYWN0RGFpbHlOb3RlRGF0ZShwYXRoKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHZhbGlkYXRlIGxlYXAgeWVhcnMgY29ycmVjdGx5XCIsICgpID0+IHtcclxuXHRcdFx0Ly8gMjAyNCBpcyBhIGxlYXAgeWVhclxyXG5cdFx0XHRjb25zdCBsZWFwWWVhckRhdGUgPSBzZXJ2aWNlLmV4dHJhY3REYWlseU5vdGVEYXRlKFwiMjAyNC0wMi0yOS5tZFwiKTtcclxuXHRcdFx0ZXhwZWN0KGxlYXBZZWFyRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAxLCAyOSkpO1xyXG5cclxuXHRcdFx0Ly8gMjAyMyBpcyBub3QgYSBsZWFwIHllYXJcclxuXHRcdFx0Y29uc3Qgbm9uTGVhcFllYXJEYXRlID0gc2VydmljZS5leHRyYWN0RGFpbHlOb3RlRGF0ZShcIjIwMjMtMDItMjkubWRcIik7XHJcblx0XHRcdGV4cGVjdChub25MZWFwWWVhckRhdGUpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJyZXNvbHZlRGF0ZUZvclRpbWVPbmx5XCIsICgpID0+IHtcclxuXHRcdGxldCBtb2NrVGFzazogVGFzaztcclxuXHRcdGxldCBtb2NrVGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudDtcclxuXHJcblx0XHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdFx0bW9ja1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2sgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcInRvZG9cIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFzayAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0gYXMgVGFzaztcclxuXHJcblx0XHRcdG1vY2tUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDEyLFxyXG5cdFx0XHRcdG1pbnV0ZTogMCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTI6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHRcdHJhbmdlUGFydG5lcjoge1xyXG5cdFx0XHRcdFx0aG91cjogMTMsXHJcblx0XHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTM6MDBcIixcclxuXHRcdFx0XHRcdGlzUmFuZ2U6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByaW9yaXRpemUgY3VycmVudCBsaW5lIGRhdGUgKFByaW9yaXR5IDEpXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIi0gWyBdIE1lZXRpbmcgMjAyNC0wMy0xNSAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmVOdW1iZXI6IDEsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwibGluZS1kYXRlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZGVuY2UpLnRvQmUoXCJoaWdoXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnVzZWRGYWxsYmFjaykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlKS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDIsIDE1KSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB1c2UgcGFyZW50IHRhc2sgZGF0ZSB3aGVuIG5vIGxpbmUgZGF0ZSAoUHJpb3JpdHkgMilcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJlbnRUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdC4uLm1vY2tUYXNrLFxyXG5cdFx0XHRcdGlkOiBcInBhcmVudC10YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdC4uLm1vY2tUYXNrLm1ldGFkYXRhLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCAxMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiLSBbIF0gU3VidGFzayAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdHBhcmVudFRhc2ssXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwicGFyZW50LXRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY29uZmlkZW5jZSkudG9CZShcImhpZ2hcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudXNlZEZhbGxiYWNrKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5yZXNvbHZlZERhdGUpLnRvRXF1YWwobmV3IERhdGUoMjAyNCwgMiwgMTApKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHVzZSBkYWlseSBub3RlIGRhdGUgd2hlbiBhdmFpbGFibGUgKFByaW9yaXR5IDMpXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gTW9jayBmaWxlIG9wZXJhdGlvbnNcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwiMjAyNC0wMy0yMC5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRtdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMjApLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiBudWxsLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRleHQ6IERhdGVSZXNvbHV0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0XHRjdXJyZW50TGluZTogXCItIFsgXSBUYXNrIDEyOjAw772eMTM6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCIyMDI0LTAzLTIwLm1kXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwiZGFpbHktbm90ZS1kYXRlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZGVuY2UpLnRvQmUoXCJoaWdoXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnVzZWRGYWxsYmFjaykudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlKS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDIsIDIwKSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCB1c2UgZmlsZSBtZXRhZGF0YSBkYXRlIHdoZW4gYXZhaWxhYmxlIChQcmlvcml0eSAzKVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdC8vIE1vY2sgZmlsZSBvcGVyYXRpb25zXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInJlZ3VsYXItbm90ZS5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRtdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiB7XHJcblx0XHRcdFx0XHRkYXRlOiBcIjIwMjQtMDMtMThcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRleHQ6IERhdGVSZXNvbHV0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0XHRjdXJyZW50TGluZTogXCItIFsgXSBUYXNrIDEyOjAw772eMTM6MDBcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJyZWd1bGFyLW5vdGUubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShtb2NrVGFzaywgbW9ja1RpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zb3VyY2UpLnRvQmUoXCJtZXRhZGF0YS1kYXRlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbmZpZGVuY2UpLnRvQmUoXCJtZWRpdW1cIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQudXNlZEZhbGxiYWNrKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5yZXNvbHZlZERhdGUpLnRvRXF1YWwobmV3IERhdGUoMjAyNCwgMiwgMTgpKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGZhbGwgYmFjayB0byBmaWxlIGNyZWF0aW9uIHRpbWUgKFByaW9yaXR5IDQpXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gTW9jayBmaWxlIG9wZXJhdGlvbnNcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwicmVndWxhci1ub3RlLm1kXCIgfTtcclxuXHRcdFx0Y29uc3QgY3RpbWVEYXRlID0gbmV3IERhdGUoMjAyNCwgMiwgNSk7XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IGN0aW1lRGF0ZS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjogbnVsbCxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiLSBbIF0gVGFzayAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwicmVndWxhci1ub3RlLm1kXCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwiZmlsZS1jdGltZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWRlbmNlKS50b0JlKFwibG93XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnVzZWRGYWxsYmFjaykudG9CZSh0cnVlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5yZXNvbHZlZERhdGUpLnRvRXF1YWwoY3RpbWVEYXRlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBuYXR1cmFsIGxhbmd1YWdlIGRhdGVzIGluIGxpbmVzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGVzdENhc2VzID0gW1xyXG5cdFx0XHRcdHsgbGluZTogXCItIFsgXSBNZWV0aW5nIHRvbW9ycm93IDEyOjAw772eMTM6MDBcIiwgZXhwZWN0ZWREYXlzT2Zmc2V0OiAxIH0sXHJcblx0XHRcdFx0eyBsaW5lOiBcIi0gWyBdIENhbGwgdG9kYXkgMTI6MDDvvZ4xMzowMFwiLCBleHBlY3RlZERheXNPZmZzZXQ6IDAgfSxcclxuXHRcdFx0XHR7IGxpbmU6IFwiLSBbIF0gUmV2aWV3IHllc3RlcmRheSAxMjowMO+9njEzOjAwXCIsIGV4cGVjdGVkRGF5c09mZnNldDogLTEgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgeyBsaW5lLCBleHBlY3RlZERheXNPZmZzZXQgfSBvZiB0ZXN0Q2FzZXMpIHtcclxuXHRcdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0XHRjdXJyZW50TGluZTogbGluZSxcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb25zdCBleHBlY3RlZERhdGUgPSBuZXcgRGF0ZSgpO1xyXG5cdFx0XHRcdGV4cGVjdGVkRGF0ZS5zZXREYXRlKGV4cGVjdGVkRGF0ZS5nZXREYXRlKCkgKyBleHBlY3RlZERheXNPZmZzZXQpO1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwibGluZS1kYXRlXCIpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlLnRvRGF0ZVN0cmluZygpKS50b0JlKGV4cGVjdGVkRGF0ZS50b0RhdGVTdHJpbmcoKSk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB3ZWVrZGF5IHJlZmVyZW5jZXMgaW4gbGluZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZXh0OiBEYXRlUmVzb2x1dGlvbkNvbnRleHQgPSB7XHJcblx0XHRcdFx0Y3VycmVudExpbmU6IFwiLSBbIF0gTWVldGluZyBtb25kYXkgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShtb2NrVGFzaywgbW9ja1RpbWVDb21wb25lbnQsIGNvbnRleHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zb3VyY2UpLnRvQmUoXCJsaW5lLWRhdGVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlLmdldERheSgpKS50b0JlKDEpOyAvLyBNb25kYXlcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImdldEZpbGVEYXRlSW5mbyBjYWNoaW5nXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGNhY2hlIGZpbGUgZGF0ZSBpbmZvXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRtdGltZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdGZyb250bWF0dGVyOiB7IGRhdGU6IFwiMjAyNC0wMy0xMFwiIH0sXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Ly8gRmlyc3QgY2FsbFxyXG5cdFx0XHRjb25zdCByZXN1bHQxID0gYXdhaXQgc2VydmljZS5nZXRGaWxlRGF0ZUluZm8oXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gU2Vjb25kIGNhbGwgc2hvdWxkIHVzZSBjYWNoZVxyXG5cdFx0XHRjb25zdCByZXN1bHQyID0gYXdhaXQgc2VydmljZS5nZXRGaWxlRGF0ZUluZm8oXCJ0ZXN0Lm1kXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDEpLnRvRXF1YWwocmVzdWx0Mik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCByZXNwZWN0IGNhY2hlIHNpemUgbGltaXRzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoeyBmcm9udG1hdHRlcjogbnVsbCB9KTtcclxuXHJcblx0XHRcdC8vIEZpbGwgY2FjaGUgYmV5b25kIGxpbWl0IChNQVhfQ0FDSEVfU0laRSA9IDUwMClcclxuXHRcdFx0Ly8gV2UnbGwgdGVzdCB3aXRoIGEgc21hbGxlciBudW1iZXIgZm9yIHByYWN0aWNhbCB0ZXN0aW5nXHJcblx0XHRcdGNvbnN0IHRlc3RGaWxlcyA9IEFycmF5LmZyb20oeyBsZW5ndGg6IDEwIH0sIChfLCBpKSA9PiBgdGVzdC0ke2l9Lm1kYCk7XHJcblx0XHRcdFxyXG5cdFx0XHRmb3IgKGNvbnN0IGZpbGVQYXRoIG9mIHRlc3RGaWxlcykge1xyXG5cdFx0XHRcdGF3YWl0IHNlcnZpY2UuZ2V0RmlsZURhdGVJbmZvKGZpbGVQYXRoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc3RhdHMgPSBzZXJ2aWNlLmdldENhY2hlU3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzLnNpemUpLnRvQmVMZXNzVGhhbk9yRXF1YWwoc3RhdHMubWF4U2l6ZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJtZXRhZGF0YSBkYXRlIHBhcnNpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcGFyc2UgdmFyaW91cyBtZXRhZGF0YSBkYXRlIGZvcm1hdHNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBkYXRlOiBcIjIwMjQtMDMtMTVcIiB9LCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBjcmVhdGVkOiBcIjIwMjQtMDMtMTVcIiB9LCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBcImNyZWF0aW9uLWRhdGVcIjogXCIyMDI0LTAzLTE1XCIgfSwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KSB9LFxyXG5cdFx0XHRcdHsgZnJvbnRtYXR0ZXI6IHsgZGF5OiAxNzEwNDYwODAwMDAwIH0sIGV4cGVjdGVkOiBuZXcgRGF0ZSgxNzEwNDYwODAwMDAwKSB9LCAvLyB0aW1lc3RhbXBcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgeyBmcm9udG1hdHRlciwgZXhwZWN0ZWQgfSBvZiB0ZXN0Q2FzZXMpIHtcclxuXHRcdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfTtcclxuXHRcdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMCwgMSkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoeyBmcm9udG1hdHRlciB9KTtcclxuXHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5nZXRGaWxlRGF0ZUluZm8oXCJ0ZXN0Lm1kXCIpO1xyXG5cdFx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGFEYXRlKS50b0VxdWFsKGV4cGVjdGVkKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBDbGVhciBjYWNoZSBmb3IgbmV4dCB0ZXN0XHJcblx0XHRcdFx0c2VydmljZS5jbGVhckNhY2hlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIG1ldGFkYXRhIGRhdGVzIGdyYWNlZnVsbHlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnZhbGlkRnJvbnRtYXR0ZXJzID0gW1xyXG5cdFx0XHRcdHsgZGF0ZTogXCJpbnZhbGlkLWRhdGVcIiB9LFxyXG5cdFx0XHRcdHsgZGF0ZTogbnVsbCB9LFxyXG5cdFx0XHRcdHsgZGF0ZToge30gfSxcclxuXHRcdFx0XHR7IGRhdGU6IFwiMjAyNC0xMy00NVwiIH0sIC8vIEludmFsaWQgZGF0ZVxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBmcm9udG1hdHRlciBvZiBpbnZhbGlkRnJvbnRtYXR0ZXJzKSB7XHJcblx0XHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5tZFwiIH07XHJcblx0XHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDAsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHsgZnJvbnRtYXR0ZXIgfSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0RmlsZURhdGVJbmZvKFwidGVzdC5tZFwiKTtcclxuXHRcdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhRGF0ZSkudG9CZU51bGwoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBDbGVhciBjYWNoZSBmb3IgbmV4dCB0ZXN0XHJcblx0XHRcdFx0c2VydmljZS5jbGVhckNhY2hlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcInBhcmVudCB0YXNrIGRhdGUgaW5oZXJpdGFuY2VcIiwgKCkgPT4ge1xyXG5cdFx0bGV0IG1vY2tUYXNrOiBUYXNrO1xyXG5cdFx0bGV0IG1vY2tUaW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50O1xyXG5cclxuXHRcdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0XHRtb2NrVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIlRlc3QgdGFzayAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6IFwidG9kb1wiLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IFwiLSBbIF0gVGVzdCB0YXNrIDEyOjAw772eMTM6MDBcIixcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSBhcyBUYXNrO1xyXG5cclxuXHRcdFx0bW9ja1RpbWVDb21wb25lbnQgPSB7XHJcblx0XHRcdFx0aG91cjogMTIsXHJcblx0XHRcdFx0bWludXRlOiAwLFxyXG5cdFx0XHRcdG9yaWdpbmFsVGV4dDogXCIxMjowMFwiLFxyXG5cdFx0XHRcdGlzUmFuZ2U6IHRydWUsXHJcblx0XHRcdFx0cmFuZ2VQYXJ0bmVyOiB7XHJcblx0XHRcdFx0XHRob3VyOiAxMyxcclxuXHRcdFx0XHRcdG1pbnV0ZTogMCxcclxuXHRcdFx0XHRcdG9yaWdpbmFsVGV4dDogXCIxMzowMFwiLFxyXG5cdFx0XHRcdFx0aXNSYW5nZTogdHJ1ZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9O1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcHJpb3JpdGl6ZSBzdGFydERhdGUgZnJvbSBwYXJlbnQgdGFza1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHBhcmVudFRhc2s6IFRhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwicGFyZW50XCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJQYXJlbnQgdGFza1wiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcInRvZG9cIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFBhcmVudCB0YXNrXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCAxMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoMjAyNCwgMiwgMTUpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdHNjaGVkdWxlZERhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDEyKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSBhcyBUYXNrO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIiAgLSBbIF0gQ2hpbGQgdGFzayAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdHBhcmVudFRhc2ssXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwicGFyZW50LXRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucmVzb2x2ZWREYXRlKS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDIsIDEwKSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmYWxsIGJhY2sgdG8gZHVlRGF0ZSBpZiBubyBzdGFydERhdGVcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBwYXJlbnRUYXNrOiBUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiBcInBhcmVudFwiLFxyXG5cdFx0XHRcdGNvbnRlbnQ6IFwiUGFyZW50IHRhc2tcIixcclxuXHRcdFx0XHRmaWxlUGF0aDogXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogXCJ0b2RvXCIsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogXCItIFsgXSBQYXJlbnQgdGFza1wiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRzY2hlZHVsZWREYXRlOiBuZXcgRGF0ZSgyMDI0LCAyLCAxMikuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0gYXMgVGFzaztcclxuXHJcblx0XHRcdGNvbnN0IGNvbnRleHQ6IERhdGVSZXNvbHV0aW9uQ29udGV4dCA9IHtcclxuXHRcdFx0XHRjdXJyZW50TGluZTogXCIgIC0gWyBdIENoaWxkIHRhc2sgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRwYXJlbnRUYXNrLFxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yZXNvbHZlRGF0ZUZvclRpbWVPbmx5KG1vY2tUYXNrLCBtb2NrVGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcInBhcmVudC10YXNrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxNSkpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwibGluZSBjb250ZXh0IGFuYWx5c2lzXCIsICgpID0+IHtcclxuXHRcdGxldCBtb2NrVGFzazogVGFzaztcclxuXHRcdGxldCBtb2NrVGltZUNvbXBvbmVudDogVGltZUNvbXBvbmVudDtcclxuXHJcblx0XHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdFx0bW9ja1Rhc2sgPSB7XHJcblx0XHRcdFx0aWQ6IFwidGVzdC10YXNrXCIsXHJcblx0XHRcdFx0Y29udGVudDogXCJUZXN0IHRhc2sgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcInRlc3QubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcInRvZG9cIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIFRlc3QgdGFzayAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0gYXMgVGFzaztcclxuXHJcblx0XHRcdG1vY2tUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDEyLFxyXG5cdFx0XHRcdG1pbnV0ZTogMCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTI6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHRcdHJhbmdlUGFydG5lcjoge1xyXG5cdFx0XHRcdFx0aG91cjogMTMsXHJcblx0XHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTM6MDBcIixcclxuXHRcdFx0XHRcdGlzUmFuZ2U6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGZpbmQgZGF0ZXMgaW4gbmVhcmJ5IGxpbmVzIHdoZW4gcHJvdmlkZWQgY29udGV4dFwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGFsbExpbmVzID0gW1xyXG5cdFx0XHRcdFwiIyBNZWV0aW5nIE5vdGVzIDIwMjQtMDMtMTVcIixcclxuXHRcdFx0XHRcIlwiLFxyXG5cdFx0XHRcdFwiLSBbIF0gUHJlcGFyYXRpb24gMTA6MDDvvZ4xMTowMFwiLFxyXG5cdFx0XHRcdFwiLSBbIF0gTWFpbiBtZWV0aW5nIDEyOjAw772eMTM6MDBcIiwgLy8gQ3VycmVudCBsaW5lXHJcblx0XHRcdFx0XCItIFsgXSBGb2xsb3ctdXAgMTQ6MDDvvZ4xNTowMFwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIi0gWyBdIE1haW4gbWVldGluZyAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmVOdW1iZXI6IDMsXHJcblx0XHRcdFx0YWxsTGluZXMsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc291cmNlKS50b0JlKFwibGluZS1kYXRlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnJlc29sdmVkRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxNSkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgbm90IGZpbmQgZGF0ZXMgYmV5b25kIHNlYXJjaCByYW5nZVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGFsbExpbmVzID0gW1xyXG5cdFx0XHRcdFwiIyBPbGQgTWVldGluZyBOb3RlcyAyMDI0LTAzLTAxXCIsIC8vIFRvbyBmYXIgYXdheVxyXG5cdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0XCJcIixcclxuXHRcdFx0XHRcIlwiLFxyXG5cdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0XCItIFsgXSBNYWluIG1lZXRpbmcgMTI6MDDvvZ4xMzowMFwiLCAvLyBDdXJyZW50IGxpbmUgKGluZGV4IDUpXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBNb2NrIGZpbGUgb3BlcmF0aW9ucyBmb3IgZmFsbGJhY2tcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7IGZyb250bWF0dGVyOiBudWxsIH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIi0gWyBdIE1haW4gbWVldGluZyAxMjowMO+9njEzOjAwXCIsXHJcblx0XHRcdFx0ZmlsZVBhdGg6IFwidGVzdC5tZFwiLFxyXG5cdFx0XHRcdGxpbmVOdW1iZXI6IDUsXHJcblx0XHRcdFx0YWxsTGluZXMsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJlc29sdmVEYXRlRm9yVGltZU9ubHkobW9ja1Rhc2ssIG1vY2tUaW1lQ29tcG9uZW50LCBjb250ZXh0KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBmYWxsIGJhY2sgdG8gZmlsZSBjdGltZSBzaW5jZSBkYXRlIGlzIHRvbyBmYXIgYXdheVxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcImZpbGUtY3RpbWVcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19