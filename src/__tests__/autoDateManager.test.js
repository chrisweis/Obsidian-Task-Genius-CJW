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
// Mock the App
const mockApp = {};
describe("autoDateManager - Block Reference Support", () => {
    describe("Block Reference Detection", () => {
        it("should detect simple block reference at end of line", () => {
            const lineText = "- [ ] Task with block reference ^task-123";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert before the block reference
            expect(lineText.substring(position)).toBe(" ^task-123");
        });
        it("should detect block reference with trailing spaces", () => {
            const lineText = "- [ ] Task with block reference ^task-123  ";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert before the block reference
            expect(lineText.substring(position)).toBe(" ^task-123  ");
        });
        it("should detect block reference with underscores and hyphens", () => {
            const lineText = "- [ ] Task with block reference ^task_123-abc";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert before the block reference
            expect(lineText.substring(position)).toBe(" ^task_123-abc");
        });
        it("should not confuse caret in middle of text with block reference", () => {
            const lineText = "- [ ] Task with ^caret in middle and more text";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert at the end since ^caret is not at the end
            expect(position).toBe(lineText.length);
        });
    });
    describe("Date Insertion with Block References", () => {
        it("should insert completed date before block reference", () => {
            const lineText = "- [ ] Task to complete ^task-123";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Position should be before the block reference
            expect(lineText.substring(0, position)).toBe("- [ ] Task to complete");
            expect(lineText.substring(position)).toBe(" ^task-123");
        });
        it("should insert start date before block reference", () => {
            const lineText = "- [ ] Task to start ^task-456";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "start");
            // Position should be before the block reference
            expect(lineText.substring(0, position)).toBe("- [ ] Task to start");
            expect(lineText.substring(position)).toBe(" ^task-456");
        });
        it("should insert cancelled date after start date but before block reference", () => {
            const lineText = "- [ ] Task with start date 🚀 2024-01-15 ^task-789";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
            // Position should be after start date but before block reference
            expect(lineText.substring(0, position)).toBe("- [ ] Task with start date 🚀 2024-01-15");
            expect(lineText.substring(position)).toBe(" ^task-789");
        });
        it("should handle multiple metadata before block reference", () => {
            const lineText = "- [ ] Task with tags #important #urgent ^task-999";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Position should be after tags but before block reference
            expect(lineText.substring(position)).toBe(" ^task-999");
        });
    });
    describe("Date Removal with Block References", () => {
        it("should preserve block reference when removing completed date", () => {
            // This test would require mocking the full transaction system
            // For now, we test that the position calculation is correct
            const lineText = "- [x] Completed task ✅ 2024-01-20 ^task-123";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // The position should still respect the block reference
            expect(lineText.substring(position)).toBe(" ^task-123");
        });
    });
    describe("Complex Block Reference Scenarios", () => {
        it("should handle task with dataview fields and block reference", () => {
            const lineText = "- [ ] Task [due::2024-01-25] [priority::high] ^complex-123";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert after dataview fields but before block reference
            expect(lineText.substring(position)).toBe(" ^complex-123");
        });
        it("should handle task with emojis and block reference", () => {
            const lineText = "- [ ] Task with emoji 📅 2024-01-25 ^emoji-task";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert after date emoji but before block reference
            expect(lineText.substring(position)).toBe(" ^emoji-task");
        });
        it("should handle task with wikilinks and block reference", () => {
            const lineText = "- [ ] Task mentioning [[Some Page]] ^wiki-task";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert after wikilink but before block reference
            expect(lineText.substring(position)).toBe(" ^wiki-task");
        });
    });
    describe("Edge Cases", () => {
        it("should handle empty task with only block reference", () => {
            const lineText = "- [ ] ^empty-task";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert before block reference
            expect(lineText.substring(position)).toBe(" ^empty-task");
        });
        it("should handle block reference without space", () => {
            const lineText = "- [ ] Task^no-space";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert before block reference
            expect(lineText.substring(position)).toBe("^no-space");
        });
        it("should handle very long block reference IDs", () => {
            const lineText = "- [ ] Task ^very-long-block-reference-id-that-might-be-generated-automatically";
            const position = findMetadataInsertPosition(lineText, mockPlugin, "completed");
            // Should insert before block reference
            expect(lineText.substring(position)).toBe(" ^very-long-block-reference-id-that-might-be-generated-automatically");
        });
    });
});
describe("autoDateManager - Dataview Format with Block References", () => {
    const mockPluginDataview = Object.assign(Object.assign({}, mockPlugin), { settings: Object.assign(Object.assign({}, mockPlugin.settings), { preferMetadataFormat: "dataview" }) });
    it("should insert dataview date before block reference", () => {
        const lineText = "- [ ] Task with dataview format ^dataview-123";
        const position = findMetadataInsertPosition(lineText, mockPluginDataview, "completed");
        // Should insert before block reference
        expect(lineText.substring(position)).toBe(" ^dataview-123");
    });
    it("should handle existing dataview fields with block reference", () => {
        const lineText = "- [ ] Task [start::2024-01-15] ^dataview-456";
        const position = findMetadataInsertPosition(lineText, mockPluginDataview, "cancelled");
        // Should insert after start date but before block reference
        expect(lineText.substring(0, position)).toBe("- [ ] Task [start::2024-01-15]");
        expect(lineText.substring(position)).toBe(" ^dataview-456");
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFvQixNQUFNLGVBQWUsQ0FBQztBQUN2RSxPQUFPLEVBT04sMEJBQTBCLEdBQzFCLE1BQU0sNkNBQTZDLENBQUM7QUFLckQsa0JBQWtCO0FBQ2xCLE1BQU0sVUFBVSxHQUFtQztJQUNsRCxRQUFRLEVBQUU7UUFDVCxlQUFlLEVBQUU7WUFDaEIsT0FBTyxFQUFFLElBQUk7WUFDYixlQUFlLEVBQUUsSUFBSTtZQUNyQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLFlBQVk7WUFDN0IsbUJBQW1CLEVBQUUsWUFBWTtZQUNqQyxtQkFBbUIsRUFBRSxZQUFZO1lBQ2pDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLG1CQUFtQixFQUFFLEdBQUc7WUFDeEIsbUJBQW1CLEVBQUUsR0FBRztTQUN4QjtRQUNELG9CQUFvQixFQUFFLE9BQU87UUFDN0IsWUFBWSxFQUFFO1lBQ2IsU0FBUyxFQUFFLEtBQUs7WUFDaEIsVUFBVSxFQUFFLEtBQUs7WUFDakIsU0FBUyxFQUFFLEdBQUc7WUFDZCxPQUFPLEVBQUUsR0FBRztZQUNaLFVBQVUsRUFBRSxHQUFHO1NBQ2Y7S0FDRDtDQUNtQyxDQUFDO0FBRXRDLGVBQWU7QUFDZixNQUFNLE9BQU8sR0FBRyxFQUFTLENBQUM7QUFFMUIsUUFBUSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtJQUMxRCxRQUFRLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO1FBQzFDLEVBQUUsQ0FBQyxxREFBcUQsRUFBRSxHQUFHLEVBQUU7WUFDOUQsTUFBTSxRQUFRLEdBQUcsMkNBQTJDLENBQUM7WUFDN0QsTUFBTSxRQUFRLEdB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QStDLENBQUM7UUFDakUsTUFBTSxRQUFRLEdBQUcsMEJBQTBCLENBQzFDLFFBQVEsRUFDUixrQkFBMkMsRUFDM0MsV0FBVyxDQUNYLENBQUM7UUFDRix1Q0FBdUM7UUFDdkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw2REFBNkQsRUFBRSxHQUFHLEVBQUU7UUFDdEUsTUFBTSxRQUFRLEdBQUcsOENBQThDLENBQUM7UUFDaEUsTUFBTSxRQUFRLEdBQUcsMEJBQTBCLENBQzFDLFFBQVEsRUFDUixrQkFBMkMsRUFDM0MsV0FBVyxDQUNYLENBQUM7UUFDRiw0REFBNEQ7UUFDNUQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLENBQUM7UUFDL0UsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUM3RCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxyXG5pbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCwgYmVmb3JlRWFjaCwgamVzdCB9IGZyb20gXCJAamVzdC9nbG9iYWxzXCI7XHJcbmltcG9ydCB7XHJcblx0aGFuZGxlQXV0b0RhdGVNYW5hZ2VyVHJhbnNhY3Rpb24sXHJcblx0ZmluZFRhc2tTdGF0dXNDaGFuZ2UsXHJcblx0ZGV0ZXJtaW5lRGF0ZU9wZXJhdGlvbnMsXHJcblx0Z2V0U3RhdHVzVHlwZSxcclxuXHRhcHBseURhdGVPcGVyYXRpb25zLFxyXG5cdGlzTW92ZU9wZXJhdGlvbixcclxuXHRmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbixcclxufSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvZGF0ZS10aW1lL2RhdGUtbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBUcmFuc2FjdGlvbiwgVGV4dCwgRWRpdG9yU3RhdGUgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIHRoZSBwbHVnaW5cclxuY29uc3QgbW9ja1BsdWdpbjogUGFydGlhbDxUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4+ID0ge1xyXG5cdHNldHRpbmdzOiB7XHJcblx0XHRhdXRvRGF0ZU1hbmFnZXI6IHtcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0bWFuYWdlU3RhcnREYXRlOiB0cnVlLFxyXG5cdFx0XHRtYW5hZ2VDb21wbGV0ZWREYXRlOiB0cnVlLFxyXG5cdFx0XHRtYW5hZ2VDYW5jZWxsZWREYXRlOiB0cnVlLFxyXG5cdFx0XHRzdGFydERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHRjb21wbGV0ZWREYXRlRm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0Y2FuY2VsbGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdHN0YXJ0RGF0ZU1hcmtlcjogXCLwn5qAXCIsXHJcblx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdGNhbmNlbGxlZERhdGVNYXJrZXI6IFwi4p2MXCIsXHJcblx0XHR9LFxyXG5cdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdHRhc2tTdGF0dXNlczoge1xyXG5cdFx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRcdGluUHJvZ3Jlc3M6IFwiL3wtXCIsXHJcblx0XHRcdGFiYW5kb25lZDogXCJfXCIsXHJcblx0XHRcdHBsYW5uZWQ6IFwiIVwiLFxyXG5cdFx0XHRub3RTdGFydGVkOiBcIiBcIixcclxuXHRcdH0sXHJcblx0fSxcclxufSBhcyB1bmtub3duIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcbi8vIE1vY2sgdGhlIEFwcFxyXG5jb25zdCBtb2NrQXBwID0ge30gYXMgQXBwO1xyXG5cclxuZGVzY3JpYmUoXCJhdXRvRGF0ZU1hbmFnZXIgLSBCbG9jayBSZWZlcmVuY2UgU3VwcG9ydFwiLCAoKSA9PiB7XHJcblx0ZGVzY3JpYmUoXCJCbG9jayBSZWZlcmVuY2UgRGV0ZWN0aW9uXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGRldGVjdCBzaW1wbGUgYmxvY2sgcmVmZXJlbmNlIGF0IGVuZCBvZiBsaW5lXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2sgd2l0aCBibG9jayByZWZlcmVuY2UgXnRhc2stMTIzXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjb21wbGV0ZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBTaG91bGQgaW5zZXJ0IGJlZm9yZSB0aGUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF50YXNrLTEyM1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGRldGVjdCBibG9jayByZWZlcmVuY2Ugd2l0aCB0cmFpbGluZyBzcGFjZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB3aXRoIGJsb2NrIHJlZmVyZW5jZSBedGFzay0xMjMgIFwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY29tcGxldGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gU2hvdWxkIGluc2VydCBiZWZvcmUgdGhlIGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSkudG9CZShcIiBedGFzay0xMjMgIFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGRldGVjdCBibG9jayByZWZlcmVuY2Ugd2l0aCB1bmRlcnNjb3JlcyBhbmQgaHlwaGVuc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBUYXNrIHdpdGggYmxvY2sgcmVmZXJlbmNlIF50YXNrXzEyMy1hYmNcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFNob3VsZCBpbnNlcnQgYmVmb3JlIHRoZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXnRhc2tfMTIzLWFiY1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIG5vdCBjb25mdXNlIGNhcmV0IGluIG1pZGRsZSBvZiB0ZXh0IHdpdGggYmxvY2sgcmVmZXJlbmNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2sgd2l0aCBeY2FyZXQgaW4gbWlkZGxlIGFuZCBtb3JlIHRleHRcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFNob3VsZCBpbnNlcnQgYXQgdGhlIGVuZCBzaW5jZSBeY2FyZXQgaXMgbm90IGF0IHRoZSBlbmRcclxuXHRcdFx0ZXhwZWN0KHBvc2l0aW9uKS50b0JlKGxpbmVUZXh0Lmxlbmd0aCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJEYXRlIEluc2VydGlvbiB3aXRoIEJsb2NrIFJlZmVyZW5jZXNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaW5zZXJ0IGNvbXBsZXRlZCBkYXRlIGJlZm9yZSBibG9jayByZWZlcmVuY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB0byBjb21wbGV0ZSBedGFzay0xMjNcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFBvc2l0aW9uIHNob3VsZCBiZSBiZWZvcmUgdGhlIGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSkudG9CZShcIi0gWyBdIFRhc2sgdG8gY29tcGxldGVcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF50YXNrLTEyM1wiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGluc2VydCBzdGFydCBkYXRlIGJlZm9yZSBibG9jayByZWZlcmVuY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB0byBzdGFydCBedGFzay00NTZcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcInN0YXJ0XCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gUG9zaXRpb24gc2hvdWxkIGJlIGJlZm9yZSB0aGUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKS50b0JlKFwiLSBbIF0gVGFzayB0byBzdGFydFwiKTtcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXnRhc2stNDU2XCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaW5zZXJ0IGNhbmNlbGxlZCBkYXRlIGFmdGVyIHN0YXJ0IGRhdGUgYnV0IGJlZm9yZSBibG9jayByZWZlcmVuY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB3aXRoIHN0YXJ0IGRhdGUg8J+agCAyMDI0LTAxLTE1IF50YXNrLTc4OVwiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gUG9zaXRpb24gc2hvdWxkIGJlIGFmdGVyIHN0YXJ0IGRhdGUgYnV0IGJlZm9yZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbikpLnRvQmUoXCItIFsgXSBUYXNrIHdpdGggc3RhcnQgZGF0ZSDwn5qAIDIwMjQtMDEtMTVcIik7XHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF50YXNrLTc4OVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSBtdWx0aXBsZSBtZXRhZGF0YSBiZWZvcmUgYmxvY2sgcmVmZXJlbmNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2sgd2l0aCB0YWdzICNpbXBvcnRhbnQgI3VyZ2VudCBedGFzay05OTlcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFBvc2l0aW9uIHNob3VsZCBiZSBhZnRlciB0YWdzIGJ1dCBiZWZvcmUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF50YXNrLTk5OVwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkRhdGUgUmVtb3ZhbCB3aXRoIEJsb2NrIFJlZmVyZW5jZXNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgcHJlc2VydmUgYmxvY2sgcmVmZXJlbmNlIHdoZW4gcmVtb3ZpbmcgY29tcGxldGVkIGRhdGVcIiwgKCkgPT4ge1xyXG5cdFx0XHQvLyBUaGlzIHRlc3Qgd291bGQgcmVxdWlyZSBtb2NraW5nIHRoZSBmdWxsIHRyYW5zYWN0aW9uIHN5c3RlbVxyXG5cdFx0XHQvLyBGb3Igbm93LCB3ZSB0ZXN0IHRoYXQgdGhlIHBvc2l0aW9uIGNhbGN1bGF0aW9uIGlzIGNvcnJlY3RcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gW3hdIENvbXBsZXRlZCB0YXNrIOKchSAyMDI0LTAxLTIwIF50YXNrLTEyM1wiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY29tcGxldGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gVGhlIHBvc2l0aW9uIHNob3VsZCBzdGlsbCByZXNwZWN0IHRoZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXnRhc2stMTIzXCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ29tcGxleCBCbG9jayBSZWZlcmVuY2UgU2NlbmFyaW9zXCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB0YXNrIHdpdGggZGF0YXZpZXcgZmllbGRzIGFuZCBibG9jayByZWZlcmVuY2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayBbZHVlOjoyMDI0LTAxLTI1XSBbcHJpb3JpdHk6OmhpZ2hdIF5jb21wbGV4LTEyM1wiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY29tcGxldGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gU2hvdWxkIGluc2VydCBhZnRlciBkYXRhdmlldyBmaWVsZHMgYnV0IGJlZm9yZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXmNvbXBsZXgtMTIzXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHRhc2sgd2l0aCBlbW9qaXMgYW5kIGJsb2NrIHJlZmVyZW5jZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBUYXNrIHdpdGggZW1vamkg8J+ThSAyMDI0LTAxLTI1IF5lbW9qaS10YXNrXCI7XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0bGluZVRleHQsXHJcblx0XHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFx0XCJjb21wbGV0ZWRcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBTaG91bGQgaW5zZXJ0IGFmdGVyIGRhdGUgZW1vamkgYnV0IGJlZm9yZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXmVtb2ppLXRhc2tcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgdGFzayB3aXRoIHdpa2lsaW5rcyBhbmQgYmxvY2sgcmVmZXJlbmNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2sgbWVudGlvbmluZyBbW1NvbWUgUGFnZV1dIF53aWtpLXRhc2tcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFNob3VsZCBpbnNlcnQgYWZ0ZXIgd2lraWxpbmsgYnV0IGJlZm9yZSBibG9jayByZWZlcmVuY2VcclxuXHRcdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXndpa2ktdGFza1wiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVkZ2UgQ2FzZXNcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGVtcHR5IHRhc2sgd2l0aCBvbmx5IGJsb2NrIHJlZmVyZW5jZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBeZW1wdHktdGFza1wiO1xyXG5cdFx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcdFwiY29tcGxldGVkXCJcclxuXHRcdFx0KTtcclxuXHRcdFx0Ly8gU2hvdWxkIGluc2VydCBiZWZvcmUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF5lbXB0eS10YXNrXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGJsb2NrIHJlZmVyZW5jZSB3aXRob3V0IHNwYWNlXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWyBdIFRhc2tebm8tc3BhY2VcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFNob3VsZCBpbnNlcnQgYmVmb3JlIGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSkudG9CZShcIl5uby1zcGFjZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIGhhbmRsZSB2ZXJ5IGxvbmcgYmxvY2sgcmVmZXJlbmNlIElEc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFsgXSBUYXNrIF52ZXJ5LWxvbmctYmxvY2stcmVmZXJlbmNlLWlkLXRoYXQtbWlnaHQtYmUtZ2VuZXJhdGVkLWF1dG9tYXRpY2FsbHlcIjtcclxuXHRcdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNvbXBsZXRlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIFNob3VsZCBpbnNlcnQgYmVmb3JlIGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSkudG9CZShcIiBedmVyeS1sb25nLWJsb2NrLXJlZmVyZW5jZS1pZC10aGF0LW1pZ2h0LWJlLWdlbmVyYXRlZC1hdXRvbWF0aWNhbGx5XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcbn0pO1xyXG5cclxuZGVzY3JpYmUoXCJhdXRvRGF0ZU1hbmFnZXIgLSBEYXRhdmlldyBGb3JtYXQgd2l0aCBCbG9jayBSZWZlcmVuY2VzXCIsICgpID0+IHtcclxuXHRjb25zdCBtb2NrUGx1Z2luRGF0YXZpZXc6IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyUGx1Z2luPiA9IHtcclxuXHRcdC4uLm1vY2tQbHVnaW4sXHJcblx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHQuLi5tb2NrUGx1Z2luLnNldHRpbmdzISxcclxuXHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZGF0YXZpZXdcIixcclxuXHRcdH0sXHJcblx0fSBhcyB1bmtub3duIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0aXQoXCJzaG91bGQgaW5zZXJ0IGRhdGF2aWV3IGRhdGUgYmVmb3JlIGJsb2NrIHJlZmVyZW5jZVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayB3aXRoIGRhdGF2aWV3IGZvcm1hdCBeZGF0YXZpZXctMTIzXCI7XHJcblx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0bW9ja1BsdWdpbkRhdGF2aWV3IGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XCJjb21wbGV0ZWRcIlxyXG5cdFx0KTtcclxuXHRcdC8vIFNob3VsZCBpbnNlcnQgYmVmb3JlIGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXmRhdGF2aWV3LTEyM1wiKTtcclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgaGFuZGxlIGV4aXN0aW5nIGRhdGF2aWV3IGZpZWxkcyB3aXRoIGJsb2NrIHJlZmVyZW5jZVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbIF0gVGFzayBbc3RhcnQ6OjIwMjQtMDEtMTVdIF5kYXRhdmlldy00NTZcIjtcclxuXHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRtb2NrUGx1Z2luRGF0YXZpZXcgYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHQpO1xyXG5cdFx0Ly8gU2hvdWxkIGluc2VydCBhZnRlciBzdGFydCBkYXRlIGJ1dCBiZWZvcmUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSkudG9CZShcIi0gWyBdIFRhc2sgW3N0YXJ0OjoyMDI0LTAxLTE1XVwiKTtcclxuXHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF5kYXRhdmlldy00NTZcIik7XHJcblx0fSk7XHJcbn0pOyJdfQ==