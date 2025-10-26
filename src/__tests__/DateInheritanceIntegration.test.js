/**
 * Integration tests for DateInheritanceService
 * Tests special cases for daily notes and file metadata handling
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
describe("DateInheritanceService Integration", () => {
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
    describe("daily note detection", () => {
        it("should detect various daily note formats", () => {
            const testCases = [
                // Standard formats
                { path: "2024-03-15.md", expected: new Date(2024, 2, 15) },
                { path: "Daily Notes/2024-03-15.md", expected: new Date(2024, 2, 15) },
                { path: "Journal/2024.03.15.md", expected: new Date(2024, 2, 15) },
                { path: "diary/2024_03_15.md", expected: new Date(2024, 2, 15) },
                { path: "notes/20240315.md", expected: new Date(2024, 2, 15) },
                // US format
                { path: "03-15-2024.md", expected: new Date(2024, 2, 15) },
                { path: "03/15/2024.md", expected: new Date(2024, 2, 15) },
                // European format
                { path: "15.03.2024.md", expected: new Date(2024, 2, 15) },
                // Monthly notes
                { path: "2024-03.md", expected: new Date(2024, 2, 1) },
                // Weekly notes
                { path: "2024-W11.md", expected: expect.any(Date) },
                // Nested in date folders
                { path: "2024/03/daily-note.md", expected: null },
                { path: "2024/03/2024-03-15.md", expected: new Date(2024, 2, 15) },
            ];
            testCases.forEach(({ path, expected }) => {
                const result = service.extractDailyNoteDate(path);
                if (expected === null) {
                    expect(result).toBeNull();
                }
                else if (expected instanceof Date) {
                    expect(result).toEqual(expected);
                }
                else {
                    expect(result).toEqual(expect.any(Date));
                }
            });
        });
        it("should handle edge cases and invalid dates", () => {
            const invalidCases = [
                "2024-13-15.md",
                "2024-02-30.md",
                "2024-00-15.md",
                "regular-note.md",
                "2024.md",
                "meeting-2024-03-15-notes.md", // Date in middle (should still work)
            ];
            invalidCases.forEach((path) => {
                const result = service.extractDailyNoteDate(path);
                if (path === "meeting-2024-03-15-notes.md") {
                    expect(result).toEqual(new Date(2024, 2, 15)); // Should extract date
                }
                else {
                    expect(result).toBeNull();
                }
            });
        });
        it("should validate leap years correctly", () => {
            // 2024 is a leap year
            const leapYearDate = service.extractDailyNoteDate("2024-02-29.md");
            expect(leapYearDate).toEqual(new Date(2024, 1, 29));
            // 2023 is not a leap year
            const nonLeapYearDate = service.extractDailyNoteDate("2023-02-29.md");
            expect(nonLeapYearDate).toBeNull();
            // 2000 was a leap year (divisible by 400)
            const y2kLeapDate = service.extractDailyNoteDate("2000-02-29.md");
            expect(y2kLeapDate).toEqual(new Date(2000, 1, 29));
            // 1900 was not a leap year (divisible by 100 but not 400)
            const y1900Date = service.extractDailyNoteDate("1900-02-29.md");
            expect(y1900Date).toBeNull();
        });
    });
    describe("file metadata parsing", () => {
        it("should parse various metadata date formats", () => __awaiter(void 0, void 0, void 0, function* () {
            const testCases = [
                // Standard date formats
                { frontmatter: { date: "2024-03-15" }, expected: new Date(2024, 2, 15) },
                { frontmatter: { created: "2024-03-15T10:30:00" }, expected: new Date(2024, 2, 15, 10, 30, 0) },
                { frontmatter: { "creation-date": "03/15/2024" }, expected: new Date(2024, 2, 15) },
                // Timestamp formats
                { frontmatter: { day: 1710460800000 }, expected: new Date(1710460800000) },
                // Relative dates
                { frontmatter: { date: "today" }, expected: expect.any(Date) },
                { frontmatter: { date: "tomorrow" }, expected: expect.any(Date) },
                { frontmatter: { date: "+1d" }, expected: expect.any(Date) },
                // Natural language
                { frontmatter: { date: "monday" }, expected: expect.any(Date) },
                { frontmatter: { date: "next friday" }, expected: expect.any(Date) },
                // Nested properties (Dataview)
                { frontmatter: { file: { ctime: "2024-03-15" } }, expected: new Date(2024, 2, 15) },
                // Templater properties
                { frontmatter: { tp: { date: "2024-03-15" } }, expected: new Date(2024, 2, 15) },
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
                if (expected instanceof Date) {
                    expect(result.metadataDate).toEqual(expected);
                }
                else {
                    expect(result.metadataDate).toEqual(expect.any(Date));
                }
                // Clear cache for next test
                service.clearCache();
            }
        }));
        it("should handle invalid metadata gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidFrontmatters = [
                { date: "invalid-date-string" },
                { date: null },
                { date: {} },
                { date: [] },
                { date: "2024-13-45" },
                { date: "not a date at all" },
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
        it("should prioritize date properties correctly", () => __awaiter(void 0, void 0, void 0, function* () {
            // Test that 'date' property takes precedence over 'created'
            const frontmatter = {
                created: "2024-03-10",
                date: "2024-03-15",
                "creation-date": "2024-03-05",
            };
            const mockFile = { path: "test.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 0, 1).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({ frontmatter });
            const result = yield service.getFileDateInfo("test.md");
            expect(result.metadataDate).toEqual(new Date(2024, 2, 15));
        }));
    });
    describe("integration scenarios", () => {
        it("should handle daily note with metadata override", () => __awaiter(void 0, void 0, void 0, function* () {
            // Daily note file with metadata that overrides the filename date
            const mockFile = { path: "Daily Notes/2024-03-15.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: { date: "2024-03-20" }, // Different from filename
            });
            const result = yield service.getFileDateInfo("Daily Notes/2024-03-15.md");
            // Should have both daily note date and metadata date
            expect(result.dailyNoteDate).toEqual(new Date(2024, 2, 15));
            expect(result.metadataDate).toEqual(new Date(2024, 2, 20));
            expect(result.isDailyNote).toBe(true);
        }));
        it("should resolve time-only expressions in daily notes", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockTask = {
                id: "test-task",
                content: "Meeting 12:00～13:00",
                filePath: "Daily Notes/2024-03-15.md",
                line: 1,
                completed: false,
                status: "todo",
                originalMarkdown: "- [ ] Meeting 12:00～13:00",
                metadata: {
                    tags: [],
                    children: [],
                },
            };
            const timeComponent = {
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
            // Mock file operations for daily note
            const mockFile = { path: "Daily Notes/2024-03-15.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 1).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const context = {
                currentLine: "- [ ] Meeting 12:00～13:00",
                filePath: "Daily Notes/2024-03-15.md",
            };
            const result = yield service.resolveDateForTimeOnly(mockTask, timeComponent, context);
            expect(result.source).toBe("daily-note-date");
            expect(result.confidence).toBe("high");
            expect(result.resolvedDate).toEqual(new Date(2024, 2, 15));
        }));
        it("should handle complex folder structures", () => __awaiter(void 0, void 0, void 0, function* () {
            const testPaths = [
                "Personal/Journal/2024/March/2024-03-15.md",
                "Work/Daily Notes/2024-03-15.md",
                "Archive/2023/Daily/2023-12-31.md",
                "Templates/Daily Note Template.md", // Should not be detected as daily note
            ];
            for (const filePath of testPaths) {
                const mockFile = { path: filePath };
                mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
                mockVault.adapter.stat.mockResolvedValue({
                    ctime: new Date(2024, 0, 1).getTime(),
                    mtime: new Date().getTime(),
                });
                mockMetadataCache.getFileCache.mockReturnValue({
                    frontmatter: null,
                });
                const result = yield service.getFileDateInfo(filePath);
                if (filePath.includes("Template")) {
                    expect(result.dailyNoteDate).toBeNull();
                    expect(result.isDailyNote).toBe(false);
                }
                else {
                    expect(result.dailyNoteDate).not.toBeNull();
                    expect(result.isDailyNote).toBe(true);
                }
                service.clearCache();
            }
        }));
        it("should handle files without dates gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockFile = { path: "Regular Note.md" };
            mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
            mockVault.adapter.stat.mockResolvedValue({
                ctime: new Date(2024, 2, 10).getTime(),
                mtime: new Date().getTime(),
            });
            mockMetadataCache.getFileCache.mockReturnValue({
                frontmatter: null,
            });
            const result = yield service.getFileDateInfo("Regular Note.md");
            expect(result.dailyNoteDate).toBeNull();
            expect(result.metadataDate).toBeNull();
            expect(result.isDailyNote).toBe(false);
            expect(result.ctime).toEqual(new Date(2024, 2, 10));
        }));
        it("should handle missing files gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            mockVault.getAbstractFileByPath.mockReturnValue(null);
            const result = yield service.getFileDateInfo("nonexistent.md");
            expect(result.dailyNoteDate).toBeNull();
            expect(result.metadataDate).toBeUndefined();
            expect(result.isDailyNote).toBe(false);
            expect(result.ctime).toEqual(expect.any(Date));
        }));
    });
    describe("performance with various file types", () => {
        it("should efficiently process mixed file types", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePaths = [
                "Daily Notes/2024-03-15.md",
                "Projects/Project A.md",
                "2024-03-16.md",
                "Meeting Notes/Weekly Sync.md",
                "Templates/Daily Template.md",
            ];
            const startTime = Date.now();
            // Process all files
            for (const filePath of filePaths) {
                const mockFile = { path: filePath };
                mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
                mockVault.adapter.stat.mockResolvedValue({
                    ctime: new Date(2024, 2, 1).getTime(),
                    mtime: new Date().getTime(),
                });
                mockMetadataCache.getFileCache.mockReturnValue({
                    frontmatter: filePath.includes("Project") ? { date: "2024-03-10" } : null,
                });
                yield service.getFileDateInfo(filePath);
            }
            const endTime = Date.now();
            const processingTime = endTime - startTime;
            // Should complete quickly
            expect(processingTime).toBeLessThan(100); // 100ms for 5 files
            // Verify caching is working
            const cacheStats = service.getCacheStats();
            expect(cacheStats.size).toBe(filePaths.length);
        }));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0ZUluaGVyaXRhbmNlSW50ZWdyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkRhdGVJbmhlcml0YW5jZUludGVncmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQUVILE9BQU8sRUFBRSxzQkFBc0IsRUFBeUIsTUFBTSxzQ0FBc0MsQ0FBQztBQUlyRyx3QkFBd0I7QUFDeEIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUM1QixHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNkLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0lBQ2hCLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ3hCLENBQUMsQ0FBQyxDQUFDO0FBRUosUUFBUSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNuRCxJQUFJLE9BQStCLENBQUM7SUFDcEMsSUFBSSxPQUFZLENBQUM7SUFDakIsSUFBSSxTQUFjLENBQUM7SUFDbkIsSUFBSSxpQkFBc0IsQ0FBQztJQUUzQixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLFNBQVMsR0FBRztZQUNYLHFCQUFxQixFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7WUFDaEMsT0FBTyxFQUFFO2dCQUNSLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO2FBQ2Y7U0FDRCxDQUFDO1FBQ0YsaUJBQWlCLEdBQUc7WUFDbkIsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7U0FDdkIsQ0FBQztRQUVGLE9BQU8sR0FBRyxJQUFJLHNCQUFzQixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUM3RSxDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsQ0FBQyxH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V0FBVyxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJO2lCQUN6RSxDQUFDLENBQUM7Z0JBRUgsTUFBTSxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2FBQ3hDO1lBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzNCLE1BQU0sY0FBYyxHQUFHLE9BQU8sR0FBRyxTQUFTLENBQUM7WUFFM0MsMEJBQTBCO1lBQzFCLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7WUFFOUQsNEJBQTRCO1lBQzVCLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUMzQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogSW50ZWdyYXRpb24gdGVzdHMgZm9yIERhdGVJbmhlcml0YW5jZVNlcnZpY2VcclxuICogVGVzdHMgc3BlY2lhbCBjYXNlcyBmb3IgZGFpbHkgbm90ZXMgYW5kIGZpbGUgbWV0YWRhdGEgaGFuZGxpbmdcclxuICovXHJcblxyXG5pbXBvcnQgeyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlLCBEYXRlUmVzb2x1dGlvbkNvbnRleHQgfSBmcm9tIFwiLi4vc2VydmljZXMvZGF0ZS1pbmhlcml0YW5jZS1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IFRpbWVDb21wb25lbnQgfSBmcm9tIFwiLi4vdHlwZXMvdGltZS1wYXJzaW5nXCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBtb2R1bGVzXHJcbmplc3QubW9jayhcIm9ic2lkaWFuXCIsICgpID0+ICh7XHJcblx0QXBwOiBqZXN0LmZuKCksXHJcblx0VEZpbGU6IGplc3QuZm4oKSxcclxuXHRWYXVsdDogamVzdC5mbigpLFxyXG5cdE1ldGFkYXRhQ2FjaGU6IGplc3QuZm4oKSxcclxufSkpO1xyXG5cclxuZGVzY3JpYmUoXCJEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlIEludGVncmF0aW9uXCIsICgpID0+IHtcclxuXHRsZXQgc2VydmljZTogRGF0ZUluaGVyaXRhbmNlU2VydmljZTtcclxuXHRsZXQgbW9ja0FwcDogYW55O1xyXG5cdGxldCBtb2NrVmF1bHQ6IGFueTtcclxuXHRsZXQgbW9ja01ldGFkYXRhQ2FjaGU6IGFueTtcclxuXHJcblx0YmVmb3JlRWFjaCgoKSA9PiB7XHJcblx0XHRtb2NrQXBwID0ge307XHJcblx0XHRtb2NrVmF1bHQgPSB7XHJcblx0XHRcdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdFx0XHRhZGFwdGVyOiB7XHJcblx0XHRcdFx0c3RhdDogamVzdC5mbigpLFxyXG5cdFx0XHR9LFxyXG5cdFx0fTtcclxuXHRcdG1vY2tNZXRhZGF0YUNhY2hlID0ge1xyXG5cdFx0XHRnZXRGaWxlQ2FjaGU6IGplc3QuZm4oKSxcclxuXHRcdH07XHJcblxyXG5cdFx0c2VydmljZSA9IG5ldyBEYXRlSW5oZXJpdGFuY2VTZXJ2aWNlKG1vY2tBcHAsIG1vY2tWYXVsdCwgbW9ja01ldGFkYXRhQ2FjaGUpO1xyXG5cdH0pO1xyXG5cclxuXHRhZnRlckVhY2goKCkgPT4ge1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0XHRzZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJkYWlseSBub3RlIGRldGVjdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBkZXRlY3QgdmFyaW91cyBkYWlseSBub3RlIGZvcm1hdHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0Ly8gU3RhbmRhcmQgZm9ybWF0c1xyXG5cdFx0XHRcdHsgcGF0aDogXCIyMDI0LTAzLTE1Lm1kXCIsIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkgfSxcclxuXHRcdFx0XHR7IHBhdGg6IFwiRGFpbHkgTm90ZXMvMjAyNC0wMy0xNS5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBwYXRoOiBcIkpvdXJuYWwvMjAyNC4wMy4xNS5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBwYXRoOiBcImRpYXJ5LzIwMjRfMDNfMTUubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KSB9LFxyXG5cdFx0XHRcdHsgcGF0aDogXCJub3Rlcy8yMDI0MDMxNS5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gVVMgZm9ybWF0XHJcblx0XHRcdFx0eyBwYXRoOiBcIjAzLTE1LTIwMjQubWRcIiwgZXhwZWN0ZWQ6IG5ldyBEYXRlKDIwMjQsIDIsIDE1KSB9LFxyXG5cdFx0XHRcdHsgcGF0aDogXCIwMy8xNS8yMDI0Lm1kXCIsIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBFdXJvcGVhbiBmb3JtYXRcclxuXHRcdFx0XHR7IHBhdGg6IFwiMTUuMDMuMjAyNC5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gTW9udGhseSBub3Rlc1xyXG5cdFx0XHRcdHsgcGF0aDogXCIyMDI0LTAzLm1kXCIsIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAyLCAxKSB9LFxyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdC8vIFdlZWtseSBub3Rlc1xyXG5cdFx0XHRcdHsgcGF0aDogXCIyMDI0LVcxMS5tZFwiLCBleHBlY3RlZDogZXhwZWN0LmFueShEYXRlKSB9LCAvLyBXZWVrIDExIG9mIDIwMjRcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBOZXN0ZWQgaW4gZGF0ZSBmb2xkZXJzXHJcblx0XHRcdFx0eyBwYXRoOiBcIjIwMjQvMDMvZGFpbHktbm90ZS5tZFwiLCBleHBlY3RlZDogbnVsbCB9LCAvLyBObyBkYXRlIGluIGZpbGVuYW1lXHJcblx0XHRcdFx0eyBwYXRoOiBcIjIwMjQvMDMvMjAyNC0wMy0xNS5tZFwiLCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHR0ZXN0Q2FzZXMuZm9yRWFjaCgoeyBwYXRoLCBleHBlY3RlZCB9KSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5leHRyYWN0RGFpbHlOb3RlRGF0ZShwYXRoKTtcclxuXHRcdFx0XHRpZiAoZXhwZWN0ZWQgPT09IG51bGwpIHtcclxuXHRcdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVOdWxsKCk7XHJcblx0XHRcdFx0fSBlbHNlIGlmIChleHBlY3RlZCBpbnN0YW5jZW9mIERhdGUpIHtcclxuXHRcdFx0XHRcdGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoZXhwZWN0ZWQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKGV4cGVjdC5hbnkoRGF0ZSkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZWRnZSBjYXNlcyBhbmQgaW52YWxpZCBkYXRlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGludmFsaWRDYXNlcyA9IFtcclxuXHRcdFx0XHRcIjIwMjQtMTMtMTUubWRcIiwgLy8gSW52YWxpZCBtb250aFxyXG5cdFx0XHRcdFwiMjAyNC0wMi0zMC5tZFwiLCAvLyBJbnZhbGlkIGRheSBmb3IgRmVicnVhcnlcclxuXHRcdFx0XHRcIjIwMjQtMDAtMTUubWRcIiwgLy8gSW52YWxpZCBtb250aCAoMClcclxuXHRcdFx0XHRcInJlZ3VsYXItbm90ZS5tZFwiLCAvLyBObyBkYXRlIHBhdHRlcm5cclxuXHRcdFx0XHRcIjIwMjQubWRcIiwgLy8gSW5jb21wbGV0ZSBkYXRlXHJcblx0XHRcdFx0XCJtZWV0aW5nLTIwMjQtMDMtMTUtbm90ZXMubWRcIiwgLy8gRGF0ZSBpbiBtaWRkbGUgKHNob3VsZCBzdGlsbCB3b3JrKVxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0aW52YWxpZENhc2VzLmZvckVhY2goKHBhdGgpID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLmV4dHJhY3REYWlseU5vdGVEYXRlKHBhdGgpO1xyXG5cdFx0XHRcdGlmIChwYXRoID09PSBcIm1lZXRpbmctMjAyNC0wMy0xNS1ub3Rlcy5tZFwiKSB7XHJcblx0XHRcdFx0XHRleHBlY3QocmVzdWx0KS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDIsIDE1KSk7IC8vIFNob3VsZCBleHRyYWN0IGRhdGVcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH0pO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgdmFsaWRhdGUgbGVhcCB5ZWFycyBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyAyMDI0IGlzIGEgbGVhcCB5ZWFyXHJcblx0XHRcdGNvbnN0IGxlYXBZZWFyRGF0ZSA9IHNlcnZpY2UuZXh0cmFjdERhaWx5Tm90ZURhdGUoXCIyMDI0LTAyLTI5Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QobGVhcFllYXJEYXRlKS50b0VxdWFsKG5ldyBEYXRlKDIwMjQsIDEsIDI5KSk7XHJcblxyXG5cdFx0XHQvLyAyMDIzIGlzIG5vdCBhIGxlYXAgeWVhclxyXG5cdFx0XHRjb25zdCBub25MZWFwWWVhckRhdGUgPSBzZXJ2aWNlLmV4dHJhY3REYWlseU5vdGVEYXRlKFwiMjAyMy0wMi0yOS5tZFwiKTtcclxuXHRcdFx0ZXhwZWN0KG5vbkxlYXBZZWFyRGF0ZSkudG9CZU51bGwoKTtcclxuXHJcblx0XHRcdC8vIDIwMDAgd2FzIGEgbGVhcCB5ZWFyIChkaXZpc2libGUgYnkgNDAwKVxyXG5cdFx0XHRjb25zdCB5MmtMZWFwRGF0ZSA9IHNlcnZpY2UuZXh0cmFjdERhaWx5Tm90ZURhdGUoXCIyMDAwLTAyLTI5Lm1kXCIpO1xyXG5cdFx0XHRleHBlY3QoeTJrTGVhcERhdGUpLnRvRXF1YWwobmV3IERhdGUoMjAwMCwgMSwgMjkpKTtcclxuXHJcblx0XHRcdC8vIDE5MDAgd2FzIG5vdCBhIGxlYXAgeWVhciAoZGl2aXNpYmxlIGJ5IDEwMCBidXQgbm90IDQwMClcclxuXHRcdFx0Y29uc3QgeTE5MDBEYXRlID0gc2VydmljZS5leHRyYWN0RGFpbHlOb3RlRGF0ZShcIjE5MDAtMDItMjkubWRcIik7XHJcblx0XHRcdGV4cGVjdCh5MTkwMERhdGUpLnRvQmVOdWxsKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJmaWxlIG1ldGFkYXRhIHBhcnNpbmdcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcGFyc2UgdmFyaW91cyBtZXRhZGF0YSBkYXRlIGZvcm1hdHNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0Ly8gU3RhbmRhcmQgZGF0ZSBmb3JtYXRzXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBkYXRlOiBcIjIwMjQtMDMtMTVcIiB9LCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBjcmVhdGVkOiBcIjIwMjQtMDMtMTVUMTA6MzA6MDBcIiB9LCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUsIDEwLCAzMCwgMCkgfSxcclxuXHRcdFx0XHR7IGZyb250bWF0dGVyOiB7IFwiY3JlYXRpb24tZGF0ZVwiOiBcIjAzLzE1LzIwMjRcIiB9LCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gVGltZXN0YW1wIGZvcm1hdHNcclxuXHRcdFx0XHR7IGZyb250bWF0dGVyOiB7IGRheTogMTcxMDQ2MDgwMDAwMCB9LCBleHBlY3RlZDogbmV3IERhdGUoMTcxMDQ2MDgwMDAwMCkgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBSZWxhdGl2ZSBkYXRlc1xyXG5cdFx0XHRcdHsgZnJvbnRtYXR0ZXI6IHsgZGF0ZTogXCJ0b2RheVwiIH0sIGV4cGVjdGVkOiBleHBlY3QuYW55KERhdGUpIH0sXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBkYXRlOiBcInRvbW9ycm93XCIgfSwgZXhwZWN0ZWQ6IGV4cGVjdC5hbnkoRGF0ZSkgfSxcclxuXHRcdFx0XHR7IGZyb250bWF0dGVyOiB7IGRhdGU6IFwiKzFkXCIgfSwgZXhwZWN0ZWQ6IGV4cGVjdC5hbnkoRGF0ZSkgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBOYXR1cmFsIGxhbmd1YWdlXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBkYXRlOiBcIm1vbmRheVwiIH0sIGV4cGVjdGVkOiBleHBlY3QuYW55KERhdGUpIH0sXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBkYXRlOiBcIm5leHQgZnJpZGF5XCIgfSwgZXhwZWN0ZWQ6IGV4cGVjdC5hbnkoRGF0ZSkgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBOZXN0ZWQgcHJvcGVydGllcyAoRGF0YXZpZXcpXHJcblx0XHRcdFx0eyBmcm9udG1hdHRlcjogeyBmaWxlOiB7IGN0aW1lOiBcIjIwMjQtMDMtMTVcIiB9IH0sIGV4cGVjdGVkOiBuZXcgRGF0ZSgyMDI0LCAyLCAxNSkgfSxcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBUZW1wbGF0ZXIgcHJvcGVydGllc1xyXG5cdFx0XHRcdHsgZnJvbnRtYXR0ZXI6IHsgdHA6IHsgZGF0ZTogXCIyMDI0LTAzLTE1XCIgfSB9LCBleHBlY3RlZDogbmV3IERhdGUoMjAyNCwgMiwgMTUpIH0sXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHRmb3IgKGNvbnN0IHsgZnJvbnRtYXR0ZXIsIGV4cGVjdGVkIH0gb2YgdGVzdENhc2VzKSB7XHJcblx0XHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwidGVzdC5tZFwiIH07XHJcblx0XHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDAsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHsgZnJvbnRtYXR0ZXIgfSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0RmlsZURhdGVJbmZvKFwidGVzdC5tZFwiKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoZXhwZWN0ZWQgaW5zdGFuY2VvZiBEYXRlKSB7XHJcblx0XHRcdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhRGF0ZSkudG9FcXVhbChleHBlY3RlZCk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGFEYXRlKS50b0VxdWFsKGV4cGVjdC5hbnkoRGF0ZSkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBDbGVhciBjYWNoZSBmb3IgbmV4dCB0ZXN0XHJcblx0XHRcdFx0c2VydmljZS5jbGVhckNhY2hlKCk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIG1ldGFkYXRhIGdyYWNlZnVsbHlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnZhbGlkRnJvbnRtYXR0ZXJzID0gW1xyXG5cdFx0XHRcdHsgZGF0ZTogXCJpbnZhbGlkLWRhdGUtc3RyaW5nXCIgfSxcclxuXHRcdFx0XHR7IGRhdGU6IG51bGwgfSxcclxuXHRcdFx0XHR7IGRhdGU6IHt9IH0sXHJcblx0XHRcdFx0eyBkYXRlOiBbXSB9LFxyXG5cdFx0XHRcdHsgZGF0ZTogXCIyMDI0LTEzLTQ1XCIgfSwgLy8gSW52YWxpZCBkYXRlXHJcblx0XHRcdFx0eyBkYXRlOiBcIm5vdCBhIGRhdGUgYXQgYWxsXCIgfSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGZvciAoY29uc3QgZnJvbnRtYXR0ZXIgb2YgaW52YWxpZEZyb250bWF0dGVycykge1xyXG5cdFx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcInRlc3QubWRcIiB9O1xyXG5cdFx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0XHRtb2NrVmF1bHQuYWRhcHRlci5zdGF0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAwLCAxKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRtdGltZTogbmV3IERhdGUoKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7IGZyb250bWF0dGVyIH0pO1xyXG5cclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmdldEZpbGVEYXRlSW5mbyhcInRlc3QubWRcIik7XHJcblx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YURhdGUpLnRvQmVOdWxsKCk7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0Ly8gQ2xlYXIgY2FjaGUgZm9yIG5leHQgdGVzdFxyXG5cdFx0XHRcdHNlcnZpY2UuY2xlYXJDYWNoZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBwcmlvcml0aXplIGRhdGUgcHJvcGVydGllcyBjb3JyZWN0bHlcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHQvLyBUZXN0IHRoYXQgJ2RhdGUnIHByb3BlcnR5IHRha2VzIHByZWNlZGVuY2Ugb3ZlciAnY3JlYXRlZCdcclxuXHRcdFx0Y29uc3QgZnJvbnRtYXR0ZXIgPSB7XHJcblx0XHRcdFx0Y3JlYXRlZDogXCIyMDI0LTAzLTEwXCIsXHJcblx0XHRcdFx0ZGF0ZTogXCIyMDI0LTAzLTE1XCIsIC8vIFRoaXMgc2hvdWxkIGJlIHVzZWRcclxuXHRcdFx0XHRcImNyZWF0aW9uLWRhdGVcIjogXCIyMDI0LTAzLTA1XCIsXHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogXCJ0ZXN0Lm1kXCIgfTtcclxuXHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRtb2NrVmF1bHQuYWRhcHRlci5zdGF0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMCwgMSkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0fSk7XHJcblx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoeyBmcm9udG1hdHRlciB9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0RmlsZURhdGVJbmZvKFwidGVzdC5tZFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YURhdGUpLnRvRXF1YWwobmV3IERhdGUoMjAyNCwgMiwgMTUpKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcImludGVncmF0aW9uIHNjZW5hcmlvc1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZGFpbHkgbm90ZSB3aXRoIG1ldGFkYXRhIG92ZXJyaWRlXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gRGFpbHkgbm90ZSBmaWxlIHdpdGggbWV0YWRhdGEgdGhhdCBvdmVycmlkZXMgdGhlIGZpbGVuYW1lIGRhdGVcclxuXHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IFwiRGFpbHkgTm90ZXMvMjAyNC0wMy0xNS5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRtdGltZTogbmV3IERhdGUoKS5nZXRUaW1lKCksXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRmcm9udG1hdHRlcjogeyBkYXRlOiBcIjIwMjQtMDMtMjBcIiB9LCAvLyBEaWZmZXJlbnQgZnJvbSBmaWxlbmFtZVxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0RmlsZURhdGVJbmZvKFwiRGFpbHkgTm90ZXMvMjAyNC0wMy0xNS5tZFwiKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIGJvdGggZGFpbHkgbm90ZSBkYXRlIGFuZCBtZXRhZGF0YSBkYXRlXHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZGFpbHlOb3RlRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxNSkpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhRGF0ZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAyMCkpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmlzRGFpbHlOb3RlKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgcmVzb2x2ZSB0aW1lLW9ubHkgZXhwcmVzc2lvbnMgaW4gZGFpbHkgbm90ZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBtb2NrVGFzazogVGFzayA9IHtcclxuXHRcdFx0XHRpZDogXCJ0ZXN0LXRhc2tcIixcclxuXHRcdFx0XHRjb250ZW50OiBcIk1lZXRpbmcgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcIkRhaWx5IE5vdGVzLzIwMjQtMDMtMTUubWRcIixcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiBcInRvZG9cIixcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiBcIi0gWyBdIE1lZXRpbmcgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9IGFzIFRhc2s7XHJcblxyXG5cdFx0XHRjb25zdCB0aW1lQ29tcG9uZW50OiBUaW1lQ29tcG9uZW50ID0ge1xyXG5cdFx0XHRcdGhvdXI6IDEyLFxyXG5cdFx0XHRcdG1pbnV0ZTogMCxcclxuXHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTI6MDBcIixcclxuXHRcdFx0XHRpc1JhbmdlOiB0cnVlLFxyXG5cdFx0XHRcdHJhbmdlUGFydG5lcjoge1xyXG5cdFx0XHRcdFx0aG91cjogMTMsXHJcblx0XHRcdFx0XHRtaW51dGU6IDAsXHJcblx0XHRcdFx0XHRvcmlnaW5hbFRleHQ6IFwiMTM6MDBcIixcclxuXHRcdFx0XHRcdGlzUmFuZ2U6IHRydWUsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdC8vIE1vY2sgZmlsZSBvcGVyYXRpb25zIGZvciBkYWlseSBub3RlXHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcIkRhaWx5IE5vdGVzLzIwMjQtMDMtMTUubWRcIiB9O1xyXG5cdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdGN0aW1lOiBuZXcgRGF0ZSgyMDI0LCAyLCAxKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgY29udGV4dDogRGF0ZVJlc29sdXRpb25Db250ZXh0ID0ge1xyXG5cdFx0XHRcdGN1cnJlbnRMaW5lOiBcIi0gWyBdIE1lZXRpbmcgMTI6MDDvvZ4xMzowMFwiLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiBcIkRhaWx5IE5vdGVzLzIwMjQtMDMtMTUubWRcIixcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVzb2x2ZURhdGVGb3JUaW1lT25seShtb2NrVGFzaywgdGltZUNvbXBvbmVudCwgY29udGV4dCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNvdXJjZSkudG9CZShcImRhaWx5LW5vdGUtZGF0ZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jb25maWRlbmNlKS50b0JlKFwiaGlnaFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5yZXNvbHZlZERhdGUpLnRvRXF1YWwobmV3IERhdGUoMjAyNCwgMiwgMTUpKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBjb21wbGV4IGZvbGRlciBzdHJ1Y3R1cmVzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGVzdFBhdGhzID0gW1xyXG5cdFx0XHRcdFwiUGVyc29uYWwvSm91cm5hbC8yMDI0L01hcmNoLzIwMjQtMDMtMTUubWRcIixcclxuXHRcdFx0XHRcIldvcmsvRGFpbHkgTm90ZXMvMjAyNC0wMy0xNS5tZFwiLFxyXG5cdFx0XHRcdFwiQXJjaGl2ZS8yMDIzL0RhaWx5LzIwMjMtMTItMzEubWRcIixcclxuXHRcdFx0XHRcIlRlbXBsYXRlcy9EYWlseSBOb3RlIFRlbXBsYXRlLm1kXCIsIC8vIFNob3VsZCBub3QgYmUgZGV0ZWN0ZWQgYXMgZGFpbHkgbm90ZVxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Zm9yIChjb25zdCBmaWxlUGF0aCBvZiB0ZXN0UGF0aHMpIHtcclxuXHRcdFx0XHRjb25zdCBtb2NrRmlsZSA9IHsgcGF0aDogZmlsZVBhdGggfTtcclxuXHRcdFx0XHRtb2NrVmF1bHQuZ2V0QWJzdHJhY3RGaWxlQnlQYXRoLm1vY2tSZXR1cm5WYWx1ZShtb2NrRmlsZSk7XHJcblx0XHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0XHRjdGltZTogbmV3IERhdGUoMjAyNCwgMCwgMSkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdG1vY2tNZXRhZGF0YUNhY2hlLmdldEZpbGVDYWNoZS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0RmlsZURhdGVJbmZvKGZpbGVQYXRoKTtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRpZiAoZmlsZVBhdGguaW5jbHVkZXMoXCJUZW1wbGF0ZVwiKSkge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5kYWlseU5vdGVEYXRlKS50b0JlTnVsbCgpO1xyXG5cdFx0XHRcdFx0ZXhwZWN0KHJlc3VsdC5pc0RhaWx5Tm90ZSkudG9CZShmYWxzZSk7XHJcblx0XHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRcdGV4cGVjdChyZXN1bHQuZGFpbHlOb3RlRGF0ZSkubm90LnRvQmVOdWxsKCk7XHJcblx0XHRcdFx0XHRleHBlY3QocmVzdWx0LmlzRGFpbHlOb3RlKS50b0JlKHRydWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0XHRzZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGZpbGVzIHdpdGhvdXQgZGF0ZXMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IG1vY2tGaWxlID0geyBwYXRoOiBcIlJlZ3VsYXIgTm90ZS5tZFwiIH07XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG1vY2tGaWxlKTtcclxuXHRcdFx0bW9ja1ZhdWx0LmFkYXB0ZXIuc3RhdC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcblx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0bXRpbWU6IG5ldyBEYXRlKCkuZ2V0VGltZSgpLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0bW9ja01ldGFkYXRhQ2FjaGUuZ2V0RmlsZUNhY2hlLm1vY2tSZXR1cm5WYWx1ZSh7XHJcblx0XHRcdFx0ZnJvbnRtYXR0ZXI6IG51bGwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5nZXRGaWxlRGF0ZUluZm8oXCJSZWd1bGFyIE5vdGUubWRcIik7XHJcblx0XHRcdFxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmRhaWx5Tm90ZURhdGUpLnRvQmVOdWxsKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGFEYXRlKS50b0JlTnVsbCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmlzRGFpbHlOb3RlKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jdGltZSkudG9FcXVhbChuZXcgRGF0ZSgyMDI0LCAyLCAxMCkpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIG1pc3NpbmcgZmlsZXMgZ3JhY2VmdWxseVwiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdG1vY2tWYXVsdC5nZXRBYnN0cmFjdEZpbGVCeVBhdGgubW9ja1JldHVyblZhbHVlKG51bGwpO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5nZXRGaWxlRGF0ZUluZm8oXCJub25leGlzdGVudC5tZFwiKTtcclxuXHRcdFx0XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZGFpbHlOb3RlRGF0ZSkudG9CZU51bGwoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YURhdGUpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5pc0RhaWx5Tm90ZSkudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY3RpbWUpLnRvRXF1YWwoZXhwZWN0LmFueShEYXRlKSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJwZXJmb3JtYW5jZSB3aXRoIHZhcmlvdXMgZmlsZSB0eXBlc1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBlZmZpY2llbnRseSBwcm9jZXNzIG1peGVkIGZpbGUgdHlwZXNcIiwgYXN5bmMgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBmaWxlUGF0aHMgPSBbXHJcblx0XHRcdFx0XCJEYWlseSBOb3Rlcy8yMDI0LTAzLTE1Lm1kXCIsXHJcblx0XHRcdFx0XCJQcm9qZWN0cy9Qcm9qZWN0IEEubWRcIixcclxuXHRcdFx0XHRcIjIwMjQtMDMtMTYubWRcIixcclxuXHRcdFx0XHRcIk1lZXRpbmcgTm90ZXMvV2Vla2x5IFN5bmMubWRcIixcclxuXHRcdFx0XHRcIlRlbXBsYXRlcy9EYWlseSBUZW1wbGF0ZS5tZFwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcblx0XHRcdC8vIFByb2Nlc3MgYWxsIGZpbGVzXHJcblx0XHRcdGZvciAoY29uc3QgZmlsZVBhdGggb2YgZmlsZVBhdGhzKSB7XHJcblx0XHRcdFx0Y29uc3QgbW9ja0ZpbGUgPSB7IHBhdGg6IGZpbGVQYXRoIH07XHJcblx0XHRcdFx0bW9ja1ZhdWx0LmdldEFic3RyYWN0RmlsZUJ5UGF0aC5tb2NrUmV0dXJuVmFsdWUobW9ja0ZpbGUpO1xyXG5cdFx0XHRcdG1vY2tWYXVsdC5hZGFwdGVyLnN0YXQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRcdFx0Y3RpbWU6IG5ldyBEYXRlKDIwMjQsIDIsIDEpLmdldFRpbWUoKSxcclxuXHRcdFx0XHRcdG10aW1lOiBuZXcgRGF0ZSgpLmdldFRpbWUoKSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRtb2NrTWV0YWRhdGFDYWNoZS5nZXRGaWxlQ2FjaGUubW9ja1JldHVyblZhbHVlKHtcclxuXHRcdFx0XHRcdGZyb250bWF0dGVyOiBmaWxlUGF0aC5pbmNsdWRlcyhcIlByb2plY3RcIikgPyB7IGRhdGU6IFwiMjAyNC0wMy0xMFwiIH0gOiBudWxsLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRhd2FpdCBzZXJ2aWNlLmdldEZpbGVEYXRlSW5mbyhmaWxlUGF0aCk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IGVuZFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBwcm9jZXNzaW5nVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgY29tcGxldGUgcXVpY2tseVxyXG5cdFx0XHRleHBlY3QocHJvY2Vzc2luZ1RpbWUpLnRvQmVMZXNzVGhhbigxMDApOyAvLyAxMDBtcyBmb3IgNSBmaWxlc1xyXG5cdFx0XHRcclxuXHRcdFx0Ly8gVmVyaWZ5IGNhY2hpbmcgaXMgd29ya2luZ1xyXG5cdFx0XHRjb25zdCBjYWNoZVN0YXRzID0gc2VydmljZS5nZXRDYWNoZVN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChjYWNoZVN0YXRzLnNpemUpLnRvQmUoZmlsZVBhdGhzLmxlbmd0aCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19