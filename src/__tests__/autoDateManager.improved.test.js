// @ts-ignore
import { describe, it, expect } from "@jest/globals";
import { findMetadataInsertPosition, } from "../editor-extensions/date-time/date-manager";
// Mock the plugin
const mockPlugin = {
    settings: {
        autoDateManager: {
            enabled: true,
            manageStartDate: true,
            manageCompletedDate: true,
            manageCancelledDate: true,
            startDateFormat: "YYYY-MM-DD",
            completedDateFormat: "YYYY-MM-DD",
            cancelledDateFormat: "YYYY-MM-DD",
            startDateMarker: "🚀",
            completedDateMarker: "✅",
            cancelledDateMarker: "❌",
        },
        preferMetadataFormat: "emoji",
        taskStatuses: {
            completed: "x|X",
            inProgress: "/|-",
            abandoned: "_",
            planned: "!",
            notStarted: " ",
        },
    },
};
describe("Improved Date Insertion Logic", () => {
    describe("Content with Special Characters", () => {
        it("should handle task with wiki links correctly", () => {
            const lineText = "- [ ] Check [[Project Notes]] for details";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Check [[Project Notes]] for details");
        });
        it("should handle nested wiki links", () => {
            const lineText = "- [ ] Read [[Books/[[Nested]] Guide]]";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Read [[Books/[[Nested]] Guide]]");
        });
        it("should handle hashtag in URL content", () => {
            const lineText = "- [ ] Visit https://example.com/#section";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Visit https://example.com/#section");
        });
        it("should handle emoji in task content", () => {
            const lineText = "- [ ] Fix the 🚀 rocket launch code";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Fix the 🚀 rocket launch code");
        });
        it("should handle multiple hashtags in URL", () => {
            const lineText = "- [ ] Check site.com/#anchor#section#part";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Check site.com/#anchor#section#part");
        });
    });
    describe("Metadata Positioning", () => {
        it("should insert cancelled date before tags", () => {
            const lineText = "- [ ] Important task #urgent #priority";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Important task");
            expect(lineText.substring(position)).toBe(" #urgent #priority");
        });
        it("should insert cancelled date before dataview fields", () => {
            const lineText = "- [ ] Task content [due:: 2025-10-01]";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Task content");
            expect(lineText.substring(position)).toBe(" [due:: 2025-10-01]");
        });
        it("should insert cancelled date after start date", () => {
            const lineText = "- [ ] Task 🚀 2025-09-01";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            // For cancelled date, it should go after the start date
            expect(position).toBeGreaterThan(24); // After "🚀 2025-09-01"
        });
        it("should handle multiple metadata items correctly", () => {
            const lineText = "- [ ] Task content #tag1 [due:: 2025-10-01] #tag2";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Task content");
        });
    });
    describe("Block References", () => {
        it("should insert date before block reference", () => {
            const lineText = "- [ ] Task with reference ^task-123";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // For completed date, should be before block reference
            expect(lineText.substring(position)).toContain("^task-123");
        });
        it("should handle block reference with trailing spaces", () => {
            const lineText = "- [ ] Task with reference ^task-123  ";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            expect(lineText.substring(position)).toContain("^task-123");
        });
    });
    describe("Edge Cases", () => {
        it("should handle empty task", () => {
            const lineText = "- [ ] ";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(position).toBe(6); // Right after "- [ ] "
        });
        it("should handle task with only spaces", () => {
            const lineText = "- [ ]    ";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(position).toBe(6); // After trimming trailing spaces
        });
        it("should handle task with brackets in content", () => {
            const lineText = "- [ ] Use array[0] or dict[key] in code";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Use array[0] or dict[key] in code");
        });
        it("should not confuse markdown links with wiki links", () => {
            const lineText = "- [ ] Check [this link](https://example.com)";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            expect(lineText.substring(0, position)).toBe("- [ ] Check [this link](https://example.com)");
        });
    });
    describe("Original PR Issue", () => {
        it("should place cancelled date after task content, not before", () => {
            const lineText = "- [ ] test entry";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            // Position should be after "test entry", not after "- [ ] "
            expect(position).toBe(16); // After "test entry"
            // Simulate adding the cancelled date
            const result = lineText.slice(0, position) + " ❌2025-09-25" + lineText.slice(position);
            expect(result).toBe("- [ ] test entry ❌2025-09-25");
            expect(result).not.toBe("- [ ] ❌2025-09-25test entry"); // This was the bug
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLmltcHJvdmVkLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIuaW1wcm92ZWQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFvQixNQUFNLGVBQWUsQ0FBQztBQUN2RSxPQUFPLEVBQ04sMEJBQTBCLEdBQzFCLE1BQU0sNkNBQTZDLENBQUM7QUFJckQsa0JBQWtCO0FBQ2xCLE1BQU0sVUFBVSxHQUFtQztJQUNsRCxRQUFRLEVBQUU7UUFDVCxlQUFlLEVBQUU7WUFDaEIsT0FBTyxFQUFFLElBQUk7WUFDYixlQUFlLEVBQUUsSUFBSTtZQUNyQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLFlBQVk7WUFDN0IsbUJBQW1CLEVBQUUsWUFBWTtZQUNqQyxtQkFBbUIsRUFBRSxZQUFZO1lBQ2pDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLG1CQUFtQixFQUFFLEdBQUc7WUFDeEIsbUJBQW1CLEVBQUUsR0FBRztTQUN4QjtRQUNELG9CQUFvQixFQUFFLE9BQU87UUFDN0IsWUFBWSxFQUFFO1lBQ2IsU0FBUyxFQUFFLEtBQUs7WUFDaEIsVUFBVSxFQUFFLEtBQUs7WUFDakIsU0FBUyxFQUFFLEdBQUc7WUFDZCxPQUFPLEVBQUUsR0FBRztZQUNaLFVBQVUsRUFBRSxHQUFHO1NBQ2Y7S0FDRDtDQUNtQyxDQUFDO0FBRXRDLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7SUFDOUMsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxFQUFFLENBQUMsOENBQThDLEVBQUUsR0FBRyxFQUFFO1lBQ3ZELE1BQU0sUUFBUSxHQUFHLDJDQUEyQyxDQUFDO1lBQzdELE1BQU0sUUFBUSxHQUFHLDBCQUEwQixDQUMxQyxRQUFRLEVB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O1FBQzVFLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1pZ25vcmVcclxuaW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QsIGJlZm9yZUVhY2gsIGplc3QgfSBmcm9tIFwiQGplc3QvZ2xvYmFsc1wiO1xyXG5pbXBvcnQge1xyXG5cdGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uLFxyXG59IGZyb20gXCIuLi9lZGl0b3ItZXh0ZW5zaW9ucy9kYXRlLXRpbWUvZGF0ZS1tYW5hZ2VyXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcbmltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5cclxuLy8gTW9jayB0aGUgcGx1Z2luXHJcbmNvbnN0IG1vY2tQbHVnaW46IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyUGx1Z2luPiA9IHtcclxuXHRzZXR0aW5nczoge1xyXG5cdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdG1hbmFnZVN0YXJ0RGF0ZTogdHJ1ZSxcclxuXHRcdFx0bWFuYWdlQ29tcGxldGVkRGF0ZTogdHJ1ZSxcclxuXHRcdFx0bWFuYWdlQ2FuY2VsbGVkRGF0ZTogdHJ1ZSxcclxuXHRcdFx0c3RhcnREYXRlRm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0Y29tcGxldGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdGNhbmNlbGxlZERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHRzdGFydERhdGVNYXJrZXI6IFwi8J+agFwiLFxyXG5cdFx0XHRjb21wbGV0ZWREYXRlTWFya2VyOiBcIuKchVwiLFxyXG5cdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0fSxcclxuXHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImVtb2ppXCIsXHJcblx0XHR0YXNrU3RhdHVzZXM6IHtcclxuXHRcdFx0Y29tcGxldGVkOiBcInh8WFwiLFxyXG5cdFx0XHRpblByb2dyZXNzOiBcIi98LVwiLFxyXG5cdFx0XHRhYmFuZG9uZWQ6IFwiX1wiLFxyXG5cdFx0XHRwbGFubmVkOiBcIiFcIixcclxuXHRcdFx0bm90U3RhcnRlZDogXCIgXCIsXHJcblx0XHR9LFxyXG5cdH0sXHJcbn0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5kZXNjcmliZShcIkltcHJvdmVkIERhdGUgSW5zZXJ0aW9uIExvZ2ljXCIsICgpID0+IHtcclxuXHRkZXNjcmliZShcIkNvbnRlbnQgd2l0aCBTcGVjaWFsIENoYXJhY3RlcnNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2sgd2l0aCB3aWtpIGxpbmtzIGNvcnJlY3RseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBDaGVjayBbW1Byb2plY3QgTm90ZXNdXSBmb3IgZGV0YWlsc1wiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbikpLnRvQmUoXCItIFsgXSBDaGVjayBbW1Byb2plY3QgTm90ZXNdXSBmb3IgZGV0YWlsc1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBuZXN0ZWQgd2lraSBsaW5rc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBSZWFkIFtbQm9va3MvW1tOZXN0ZWRdXSBHdWlkZV1dXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSkudG9CZShcIi0gWyBdIFJlYWQgW1tCb29rcy9bW05lc3RlZF1dIEd1aWRlXV1cIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgaGFzaHRhZyBpbiBVUkwgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBWaXNpdCBodHRwczovL2V4YW1wbGUuY29tLyNzZWN0aW9uXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSkudG9CZShcIi0gWyBdIFZpc2l0IGh0dHBzOi8vZXhhbXBsZS5jb20vI3NlY3Rpb25cIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZW1vamkgaW4gdGFzayBjb250ZW50XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIEZpeCB0aGUg8J+agCByb2NrZXQgbGF1bmNoIGNvZGVcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKS50b0JlKFwiLSBbIF0gRml4IHRoZSDwn5qAIHJvY2tldCBsYXVuY2ggY29kZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtdWx0aXBsZSBoYXNodGFncyBpbiBVUkxcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gQ2hlY2sgc2l0ZS5jb20vI2FuY2hvciNzZWN0aW9uI3BhcnRcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKS50b0JlKFwiLSBbIF0gQ2hlY2sgc2l0ZS5jb20vI2FuY2hvciNzZWN0aW9uI3BhcnRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJNZXRhZGF0YSBQb3NpdGlvbmluZ1wiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBpbnNlcnQgY2FuY2VsbGVkIGRhdGUgYmVmb3JlIHRhZ3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gSW1wb3J0YW50IHRhc2sgI3VyZ2VudCAjcHJpb3JpdHlcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKS50b0JlKFwiLSBbIF0gSW1wb3J0YW50IHRhc2tcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiICN1cmdlbnQgI3ByaW9yaXR5XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaW5zZXJ0IGNhbmNlbGxlZCBkYXRlIGJlZm9yZSBkYXRhdmlldyBmaWVsZHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayBjb250ZW50IFtkdWU6OiAyMDI1LTEwLTAxXVwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbikpLnRvQmUoXCItIFsgXSBUYXNrIGNvbnRlbnRcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIFtkdWU6OiAyMDI1LTEwLTAxXVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGluc2VydCBjYW5jZWxsZWQgZGF0ZSBhZnRlciBzdGFydCBkYXRlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2sg8J+agCAyMDI1LTA5LTAxXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBGb3IgY2FuY2VsbGVkIGRhdGUsIGl0IHNob3VsZCBnbyBhZnRlciB0aGUgc3RhcnQgZGF0ZVxyXG5cdFx0XHRleHBlY3QocG9zaXRpb24pLnRvQmVHcmVhdGVyVGhhbigyNCk7IC8vIEFmdGVyIFwi8J+agCAyMDI1LTA5LTAxXCJcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtdWx0aXBsZSBtZXRhZGF0YSBpdGVtcyBjb3JyZWN0bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayBjb250ZW50ICN0YWcxIFtkdWU6OiAyMDI1LTEwLTAxXSAjdGFnMlwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbikpLnRvQmUoXCItIFsgXSBUYXNrIGNvbnRlbnRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJCbG9jayBSZWZlcmVuY2VzXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGluc2VydCBkYXRlIGJlZm9yZSBibG9jayByZWZlcmVuY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB3aXRoIHJlZmVyZW5jZSBedGFzay0xMjNcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIEZvciBjb21wbGV0ZWQgZGF0ZSwgc2hvdWxkIGJlIGJlZm9yZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQ29udGFpbihcIl50YXNrLTEyM1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBibG9jayByZWZlcmVuY2Ugd2l0aCB0cmFpbGluZyBzcGFjZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB3aXRoIHJlZmVyZW5jZSBedGFzay0xMjMgIFwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY29tcGxldGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQ29udGFpbihcIl50YXNrLTEyM1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVkZ2UgQ2FzZXNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGVtcHR5IHRhc2tcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocG9zaXRpb24pLnRvQmUoNik7IC8vIFJpZ2h0IGFmdGVyIFwiLSBbIF0gXCJcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB0YXNrIHdpdGggb25seSBzcGFjZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gICAgXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QocG9zaXRpb24pLnRvQmUoNik7IC8vIEFmdGVyIHRyaW1taW5nIHRyYWlsaW5nIHNwYWNlc1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2sgd2l0aCBicmFja2V0cyBpbiBjb250ZW50XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFVzZSBhcnJheVswXSBvciBkaWN0W2tleV0gaW4gY29kZVwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbikpLnRvQmUoXCItIFsgXSBVc2UgYXJyYXlbMF0gb3IgZGljdFtrZXldIGluIGNvZGVcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBub3QgY29uZnVzZSBtYXJrZG93biBsaW5rcyB3aXRoIHdpa2kgbGlua3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gQ2hlY2sgW3RoaXMgbGlua10oaHR0cHM6Ly9leGFtcGxlLmNvbSlcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKS50b0JlKFwiLSBbIF0gQ2hlY2sgW3RoaXMgbGlua10oaHR0cHM6Ly9leGFtcGxlLmNvbSlcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJPcmlnaW5hbCBQUiBJc3N1ZVwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBwbGFjZSBjYW5jZWxsZWQgZGF0ZSBhZnRlciB0YXNrIGNvbnRlbnQsIG5vdCBiZWZvcmVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gdGVzdCBlbnRyeVwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gUG9zaXRpb24gc2hvdWxkIGJlIGFmdGVyIFwidGVzdCBlbnRyeVwiLCBub3QgYWZ0ZXIgXCItIFsgXSBcIlxyXG5cdFx0XHRleHBlY3QocG9zaXRpb24pLnRvQmUoMTYpOyAvLyBBZnRlciBcInRlc3QgZW50cnlcIlxyXG5cclxuXHRcdFx0Ly8gU2ltdWxhdGUgYWRkaW5nIHRoZSBjYW5jZWxsZWQgZGF0ZVxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBsaW5lVGV4dC5zbGljZSgwLCBwb3NpdGlvbikgKyBcIiDinYwyMDI1LTA5LTI1XCIgKyBsaW5lVGV4dC5zbGljZShwb3NpdGlvbik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoXCItIFsgXSB0ZXN0IGVudHJ5IOKdjDIwMjUtMDktMjVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLm5vdC50b0JlKFwiLSBbIF0g4p2MMjAyNS0wOS0yNXRlc3QgZW50cnlcIik7IC8vIFRoaXMgd2FzIHRoZSBidWdcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTsiXX0=