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
            startDateMarker: "🛫",
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
describe("autoDateManager - Debug Specific Issue", () => {
    it("should insert cancelled date BEFORE block reference, not after", () => {
        // This is the exact line from the user's example
        const lineText = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        console.log("Original line:", lineText);
        console.log("Line length:", lineText.length);
        console.log("Index of 🛫:", lineText.indexOf("🛫"));
        console.log("Index of ^timer:", lineText.indexOf("^timer"));
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("Insert position:", position);
        console.log("Text before position:", lineText.substring(0, position));
        console.log("Text after position:", lineText.substring(position));
        // The cancelled date should be inserted BEFORE the block reference
        expect(lineText.substring(position)).toBe(" ^timer-161940-4775");
        // Simulate inserting the cancelled date
        const cancelledDate = " ❌ 2025-07-31";
        const newLine = lineText.substring(0, position) + cancelledDate + lineText.substring(position);
        console.log("New line after insertion:", newLine);
        // Verify the block reference is still at the end
        expect(newLine.endsWith("^timer-161940-4775")).toBe(true);
        // Verify the cancelled date is before the block reference
        expect(newLine).toBe("- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ❌ 2025-07-31 ^timer-161940-4775");
    });
    it("should find correct position with 🛫 emoji", () => {
        const lineText = "- [-] Task with 🛫 2025-04-20 ^block-id";
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("Position for cancelled date:", position);
        console.log("Text after position:", lineText.substring(position));
        // Should insert after the 🛫 date but before block reference
        expect(lineText.substring(0, position)).toContain("🛫 2025-04-20");
        expect(lineText.substring(position)).toBe(" ^block-id");
    });
    it("should handle MISMATCHED start date emoji (🚀 in settings but 🛫 in text)", () => {
        // Create a plugin with 🚀 as start marker
        const mismatchedPlugin = {
            settings: Object.assign(Object.assign({}, mockPlugin.settings), { autoDateManager: Object.assign(Object.assign({}, mockPlugin.settings.autoDateManager), { startDateMarker: "🚀" }) }),
        };
        // But the text has 🛫 
        const lineText = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        const position = findMetadataInsertPosition(lineText, mismatchedPlugin, "cancelled");
        console.log("Position with mismatched emoji:", position);
        console.log("Text after position:", lineText.substring(position));
        // Even with mismatched emoji, it should still find the date pattern
        // because 🛫 is followed by a date pattern
        expect(lineText.substring(position)).not.toContain("❌ 2025-07-31");
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLmRlYnVnLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIuZGVidWcudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JELE9BQU8sRUFDTiwwQkFBMEIsR0FDMUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUdyRCxrQkFBa0I7QUFDbEIsTUFBTSxVQUFVLEdBQW1DO0lBQ2xELFFBQVEsRUFBRTtRQUNULGVBQWUsRUFBRTtZQUNoQixPQUFPLEVBQUUsSUFBSTtZQUNiLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixlQUFlLEVBQUUsWUFBWTtZQUM3QixtQkFBbUIsRUFBRSxZQUFZO1lBQ2pDLG1CQUFtQixFQUFFLFlBQVk7WUFDakMsZUFBZSxFQUFFLElBQUk7WUFDckIsbUJBQW1CLEVBQUUsR0FBRztZQUN4QixtQkFBbUIsRUFBRSxHQUFHO1NBQ3hCO1FBQ0Qsb0JBQW9CLEVBQUUsT0FBTztRQUM3QixZQUFZLEVBQUU7WUFDYixTQUFTLEVBQUUsS0FBSztZQUNoQixVQUFVLEVBQUUsS0FBSztZQUNqQixTQUFTLEVBQUUsR0FBRztZQUNkLE9BQU8sRUFBRSxHQUFHO1lBQ1osVUFBVSxFQUFFLEdBQUc7U0FDZjtLQUNEO0NBQ21DLENBQUM7QUFFdEMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtJQUN2RCxFQUFFLENBQUMsZ0VBQWdFLEVBQUUsR0FBRyxFQUFFO1FBQ3pFLGlEQUFpRDtRQUNqRCxNQUFNLFFBQVEsR0FBRyw2RkFBNkYsQ0FBQztRQUUvRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLE9BQU8sQ0FBQyxHQUFH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Q0FBQyxDQUFDO1FBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRWxFLG9FQUFvRTtRQUNwRSwyQ0FBMkM7UUFDM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3BFLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXHJcbmltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0IH0gZnJvbSBcIkBqZXN0L2dsb2JhbHNcIjtcclxuaW1wb3J0IHtcclxuXHRmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbixcclxufSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvZGF0ZS10aW1lL2RhdGUtbWFuYWdlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuLy8gTW9jayB0aGUgcGx1Z2luXHJcbmNvbnN0IG1vY2tQbHVnaW46IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyUGx1Z2luPiA9IHtcclxuXHRzZXR0aW5nczoge1xyXG5cdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdG1hbmFnZVN0YXJ0RGF0ZTogdHJ1ZSxcclxuXHRcdFx0bWFuYWdlQ29tcGxldGVkRGF0ZTogdHJ1ZSxcclxuXHRcdFx0bWFuYWdlQ2FuY2VsbGVkRGF0ZTogdHJ1ZSxcclxuXHRcdFx0c3RhcnREYXRlRm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0Y29tcGxldGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdGNhbmNlbGxlZERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHRzdGFydERhdGVNYXJrZXI6IFwi8J+bq1wiLFxyXG5cdFx0XHRjb21wbGV0ZWREYXRlTWFya2VyOiBcIuKchVwiLFxyXG5cdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0fSxcclxuXHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImVtb2ppXCIsXHJcblx0XHR0YXNrU3RhdHVzZXM6IHtcclxuXHRcdFx0Y29tcGxldGVkOiBcInh8WFwiLFxyXG5cdFx0XHRpblByb2dyZXNzOiBcIi98LVwiLFxyXG5cdFx0XHRhYmFuZG9uZWQ6IFwiX1wiLFxyXG5cdFx0XHRwbGFubmVkOiBcIiFcIixcclxuXHRcdFx0bm90U3RhcnRlZDogXCIgXCIsXHJcblx0XHR9LFxyXG5cdH0sXHJcbn0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5kZXNjcmliZShcImF1dG9EYXRlTWFuYWdlciAtIERlYnVnIFNwZWNpZmljIElzc3VlXCIsICgpID0+IHtcclxuXHRpdChcInNob3VsZCBpbnNlcnQgY2FuY2VsbGVkIGRhdGUgQkVGT1JFIGJsb2NrIHJlZmVyZW5jZSwgbm90IGFmdGVyXCIsICgpID0+IHtcclxuXHRcdC8vIFRoaXMgaXMgdGhlIGV4YWN0IGxpbmUgZnJvbSB0aGUgdXNlcidzIGV4YW1wbGVcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFstXSDkuqTmtYHkuqTlupUg8J+agCAyMDI1LTA3LTMwIFtzdGFnZTo6ZGlzY2xvc3VyZV9jb21tdW5pY2F0aW9uXSDwn5urIDIwMjUtMDQtMjAgXnRpbWVyLTE2MTk0MC00Nzc1XCI7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiT3JpZ2luYWwgbGluZTpcIiwgbGluZVRleHQpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJMaW5lIGxlbmd0aDpcIiwgbGluZVRleHQubGVuZ3RoKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiSW5kZXggb2Yg8J+bqzpcIiwgbGluZVRleHQuaW5kZXhPZihcIvCfm6tcIikpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJJbmRleCBvZiBedGltZXI6XCIsIGxpbmVUZXh0LmluZGV4T2YoXCJedGltZXJcIikpO1xyXG5cdFx0XHJcblx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiSW5zZXJ0IHBvc2l0aW9uOlwiLCBwb3NpdGlvbik7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRleHQgYmVmb3JlIHBvc2l0aW9uOlwiLCBsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiVGV4dCBhZnRlciBwb3NpdGlvbjpcIiwgbGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSk7XHJcblx0XHRcclxuXHRcdC8vIFRoZSBjYW5jZWxsZWQgZGF0ZSBzaG91bGQgYmUgaW5zZXJ0ZWQgQkVGT1JFIHRoZSBibG9jayByZWZlcmVuY2VcclxuXHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS50b0JlKFwiIF50aW1lci0xNjE5NDAtNDc3NVwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gU2ltdWxhdGUgaW5zZXJ0aW5nIHRoZSBjYW5jZWxsZWQgZGF0ZVxyXG5cdFx0Y29uc3QgY2FuY2VsbGVkRGF0ZSA9IFwiIOKdjCAyMDI1LTA3LTMxXCI7XHJcblx0XHRjb25zdCBuZXdMaW5lID0gbGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSArIGNhbmNlbGxlZERhdGUgKyBsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIk5ldyBsaW5lIGFmdGVyIGluc2VydGlvbjpcIiwgbmV3TGluZSk7XHJcblx0XHRcclxuXHRcdC8vIFZlcmlmeSB0aGUgYmxvY2sgcmVmZXJlbmNlIGlzIHN0aWxsIGF0IHRoZSBlbmRcclxuXHRcdGV4cGVjdChuZXdMaW5lLmVuZHNXaXRoKFwiXnRpbWVyLTE2MTk0MC00Nzc1XCIpKS50b0JlKHRydWUpO1xyXG5cdFx0XHJcblx0XHQvLyBWZXJpZnkgdGhlIGNhbmNlbGxlZCBkYXRlIGlzIGJlZm9yZSB0aGUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRleHBlY3QobmV3TGluZSkudG9CZShcIi0gWy1dIOS6pOa1geS6pOW6lSDwn5qAIDIwMjUtMDctMzAgW3N0YWdlOjpkaXNjbG9zdXJlX2NvbW11bmljYXRpb25dIPCfm6sgMjAyNS0wNC0yMCDinYwgMjAyNS0wNy0zMSBedGltZXItMTYxOTQwLTQ3NzVcIik7XHJcblx0fSk7XHJcblx0XHJcblx0aXQoXCJzaG91bGQgZmluZCBjb3JyZWN0IHBvc2l0aW9uIHdpdGgg8J+bqyBlbW9qaVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbLV0gVGFzayB3aXRoIPCfm6sgMjAyNS0wNC0yMCBeYmxvY2staWRcIjtcclxuXHRcdFxyXG5cdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIlBvc2l0aW9uIGZvciBjYW5jZWxsZWQgZGF0ZTpcIiwgcG9zaXRpb24pO1xyXG5cdFx0Y29uc29sZS5sb2coXCJUZXh0IGFmdGVyIHBvc2l0aW9uOlwiLCBsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKTtcclxuXHRcdFxyXG5cdFx0Ly8gU2hvdWxkIGluc2VydCBhZnRlciB0aGUg8J+bqyBkYXRlIGJ1dCBiZWZvcmUgYmxvY2sgcmVmZXJlbmNlXHJcblx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSkudG9Db250YWluKFwi8J+bqyAyMDI1LTA0LTIwXCIpO1xyXG5cdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXmJsb2NrLWlkXCIpO1xyXG5cdH0pO1xyXG5cdFxyXG5cdGl0KFwic2hvdWxkIGhhbmRsZSBNSVNNQVRDSEVEIHN0YXJ0IGRhdGUgZW1vamkgKPCfmoAgaW4gc2V0dGluZ3MgYnV0IPCfm6sgaW4gdGV4dClcIiwgKCkgPT4ge1xyXG5cdFx0Ly8gQ3JlYXRlIGEgcGx1Z2luIHdpdGgg8J+agCBhcyBzdGFydCBtYXJrZXJcclxuXHRcdGNvbnN0IG1pc21hdGNoZWRQbHVnaW46IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyUGx1Z2luPiA9IHtcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHQuLi5tb2NrUGx1Z2luLnNldHRpbmdzISxcclxuXHRcdFx0XHRhdXRvRGF0ZU1hbmFnZXI6IHtcclxuXHRcdFx0XHRcdC4uLm1vY2tQbHVnaW4uc2V0dGluZ3MhLmF1dG9EYXRlTWFuYWdlciEsXHJcblx0XHRcdFx0XHRzdGFydERhdGVNYXJrZXI6IFwi8J+agFwiLCAvLyBEaWZmZXJlbnQgZnJvbSB3aGF0J3MgaW4gdGhlIHRleHQhXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0XHRcclxuXHRcdC8vIEJ1dCB0aGUgdGV4dCBoYXMg8J+bqyBcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFstXSDkuqTmtYHkuqTlupUg8J+agCAyMDI1LTA3LTMwIFtzdGFnZTo6ZGlzY2xvc3VyZV9jb21tdW5pY2F0aW9uXSDwn5urIDIwMjUtMDQtMjAgXnRpbWVyLTE2MTk0MC00Nzc1XCI7XHJcblx0XHRcclxuXHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRtaXNtYXRjaGVkUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0Y29uc29sZS5sb2coXCJQb3NpdGlvbiB3aXRoIG1pc21hdGNoZWQgZW1vamk6XCIsIHBvc2l0aW9uKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiVGV4dCBhZnRlciBwb3NpdGlvbjpcIiwgbGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSk7XHJcblx0XHRcclxuXHRcdC8vIEV2ZW4gd2l0aCBtaXNtYXRjaGVkIGVtb2ppLCBpdCBzaG91bGQgc3RpbGwgZmluZCB0aGUgZGF0ZSBwYXR0ZXJuXHJcblx0XHQvLyBiZWNhdXNlIPCfm6sgaXMgZm9sbG93ZWQgYnkgYSBkYXRlIHBhdHRlcm5cclxuXHRcdGV4cGVjdChsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKS5ub3QudG9Db250YWluKFwi4p2MIDIwMjUtMDctMzFcIik7XHJcblx0fSk7XHJcbn0pOyJdfQ==