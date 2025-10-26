// @ts-ignore
import { describe, it, expect } from "@jest/globals";
import { findMetadataInsertPosition, } from "../editor-extensions/date-time/date-manager";
describe("autoDateManager - Real World Test", () => {
    it("should handle user's exact case", () => {
        // Mock plugin with user's actual settings
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
            },
        };
        // User's exact line
        const lineText = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        console.log("\n=== REAL WORLD TEST ===");
        console.log("User's line:", lineText);
        console.log("Line length:", lineText.length);
        console.log("Block ref starts at:", lineText.indexOf("^timer"));
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        // Use throw to output debug info
        throw new Error(`
DEBUG INFO:
- Line: ${lineText}
- Position: ${position}
- Text before: "${lineText.substring(0, position)}"
- Text after: "${lineText.substring(position)}"
- Character at position: "${lineText[position]}"
- Block ref index: ${lineText.indexOf("^timer")}
`);
        // The cancelled date should be inserted after 🛫 2025-04-20 but before ^timer
        const expectedPosition = lineText.indexOf(" ^timer");
        console.log("\nExpected position:", expectedPosition);
        console.log("Expected text after:", lineText.substring(expectedPosition));
        // Simulate insertion
        const cancelledDate = " ❌ 2025-07-31";
        const newLine = lineText.substring(0, position) + cancelledDate + lineText.substring(position);
        console.log("\nNew line after insertion:", newLine);
        // Verify the block reference is preserved
        expect(newLine).toContain("^timer-161940-4775");
        expect(newLine).not.toMatch(/\^timer.*❌/); // Cancelled date should not be after block ref
    });
    it("should test with debugging enabled", () => {
        const mockPlugin = {
            settings: {
                autoDateManager: {
                    enabled: true,
                    startDateMarker: "🛫",
                    completedDateMarker: "✅",
                    cancelledDateMarker: "❌",
                },
                preferMetadataFormat: "emoji",
            },
        };
        // Simpler test case
        const lineText = "- [-] Task 🛫 2025-04-20 ^block-123";
        console.log("\n=== SIMPLE TEST ===");
        console.log("Line:", lineText);
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("Position:", position);
        console.log("Should insert at:", lineText.substring(0, position) + " <HERE>" + lineText.substring(position));
        // Should be after the date but before block ref
        expect(position).toBeLessThan(lineText.indexOf("^block"));
        expect(position).toBeGreaterThan(lineText.indexOf("2025-04-20") + "2025-04-20".length);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLnJlYWx3b3JsZC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0b0RhdGVNYW5hZ2VyLnJlYWx3b3JsZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGFBQWE7QUFDYixPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckQsT0FBTyxFQUNOLDBCQUEwQixHQUMxQixNQUFNLDZDQUE2QyxDQUFDO0FBR3JELFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7SUFDbEQsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUMxQywwQ0FBMEM7UUFDMUMsTUFBTSxVQUFVLEdBQW1DO1lBQ2xELFFBQVEsRUFBRTtnQkFDVCxlQUFlLEVBQUU7b0JBQ2hCLE9BQU8sRUFBRSxJQUFJO29CQUNiLGVBQWUsRUFBRSxJQUFJO29CQUNyQixtQkFBbUIsRUFBRSxJQUFJO29CQUN6QixtQkFBbUIsRUFBRSxJQUFJO29CQUN6QixlQUFlLEVBQUUsWUFBWTtvQkFDN0IsbUJBQW1CLEVBQUUsWUFBWTtvQkFDakMsbUJBQW1CLEVBQUUsWUFBWTtvQkFDakMsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLG1CQUFtQixFQUFFLEdBQUc7b0JBQ3hCLG1CQUFtQixFQUFFLEdBQUc7aUJBQ3hCO2dCQUNELG9CQUFvQixFQUFFLE9BQU87YUFDN0I7U0FDbUMsQ0FBQztRQUV0QyxvQkFBb0I7UUFDcEIsTUFBTSxRQUFRLEdBQUcsNkZBQTZGLENBQUM7UUFFL0csT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxPQUFPLENBQUMsR0FB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Y2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXHJcbmltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0IH0gZnJvbSBcIkBqZXN0L2dsb2JhbHNcIjtcclxuaW1wb3J0IHtcclxuXHRmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbixcclxufSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvZGF0ZS10aW1lL2RhdGUtbWFuYWdlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuZGVzY3JpYmUoXCJhdXRvRGF0ZU1hbmFnZXIgLSBSZWFsIFdvcmxkIFRlc3RcIiwgKCkgPT4ge1xyXG5cdGl0KFwic2hvdWxkIGhhbmRsZSB1c2VyJ3MgZXhhY3QgY2FzZVwiLCAoKSA9PiB7XHJcblx0XHQvLyBNb2NrIHBsdWdpbiB3aXRoIHVzZXIncyBhY3R1YWwgc2V0dGluZ3NcclxuXHRcdGNvbnN0IG1vY2tQbHVnaW46IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyUGx1Z2luPiA9IHtcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHRhdXRvRGF0ZU1hbmFnZXI6IHtcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRtYW5hZ2VTdGFydERhdGU6IHRydWUsXHJcblx0XHRcdFx0XHRtYW5hZ2VDb21wbGV0ZWREYXRlOiB0cnVlLFxyXG5cdFx0XHRcdFx0bWFuYWdlQ2FuY2VsbGVkRGF0ZTogdHJ1ZSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlRm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0XHRcdGNhbmNlbGxlZERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlTWFya2VyOiBcIvCfm6tcIiwgLy8gVXNlcidzIGFjdHVhbCBtYXJrZXJcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdFx0Ly8gVXNlcidzIGV4YWN0IGxpbmVcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFstXSDkuqTmtYHkuqTlupUg8J+agCAyMDI1LTA3LTMwIFtzdGFnZTo6ZGlzY2xvc3VyZV9jb21tdW5pY2F0aW9uXSDwn5urIDIwMjUtMDQtMjAgXnRpbWVyLTE2MTk0MC00Nzc1XCI7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiXFxuPT09IFJFQUwgV09STEQgVEVTVCA9PT1cIik7XHJcblx0XHRjb25zb2xlLmxvZyhcIlVzZXIncyBsaW5lOlwiLCBsaW5lVGV4dCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkxpbmUgbGVuZ3RoOlwiLCBsaW5lVGV4dC5sZW5ndGgpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJCbG9jayByZWYgc3RhcnRzIGF0OlwiLCBsaW5lVGV4dC5pbmRleE9mKFwiXnRpbWVyXCIpKTtcclxuXHRcdFxyXG5cdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHQvLyBVc2UgdGhyb3cgdG8gb3V0cHV0IGRlYnVnIGluZm9cclxuXHRcdHRocm93IG5ldyBFcnJvcihgXHJcbkRFQlVHIElORk86XHJcbi0gTGluZTogJHtsaW5lVGV4dH1cclxuLSBQb3NpdGlvbjogJHtwb3NpdGlvbn1cclxuLSBUZXh0IGJlZm9yZTogXCIke2xpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbil9XCJcclxuLSBUZXh0IGFmdGVyOiBcIiR7bGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKX1cIlxyXG4tIENoYXJhY3RlciBhdCBwb3NpdGlvbjogXCIke2xpbmVUZXh0W3Bvc2l0aW9uXX1cIlxyXG4tIEJsb2NrIHJlZiBpbmRleDogJHtsaW5lVGV4dC5pbmRleE9mKFwiXnRpbWVyXCIpfVxyXG5gKTtcclxuXHRcdFxyXG5cdFx0Ly8gVGhlIGNhbmNlbGxlZCBkYXRlIHNob3VsZCBiZSBpbnNlcnRlZCBhZnRlciDwn5urIDIwMjUtMDQtMjAgYnV0IGJlZm9yZSBedGltZXJcclxuXHRcdGNvbnN0IGV4cGVjdGVkUG9zaXRpb24gPSBsaW5lVGV4dC5pbmRleE9mKFwiIF50aW1lclwiKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiXFxuRXhwZWN0ZWQgcG9zaXRpb246XCIsIGV4cGVjdGVkUG9zaXRpb24pO1xyXG5cdFx0Y29uc29sZS5sb2coXCJFeHBlY3RlZCB0ZXh0IGFmdGVyOlwiLCBsaW5lVGV4dC5zdWJzdHJpbmcoZXhwZWN0ZWRQb3NpdGlvbikpO1xyXG5cdFx0XHJcblx0XHQvLyBTaW11bGF0ZSBpbnNlcnRpb25cclxuXHRcdGNvbnN0IGNhbmNlbGxlZERhdGUgPSBcIiDinYwgMjAyNS0wNy0zMVwiO1xyXG5cdFx0Y29uc3QgbmV3TGluZSA9IGxpbmVUZXh0LnN1YnN0cmluZygwLCBwb3NpdGlvbikgKyBjYW5jZWxsZWREYXRlICsgbGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiXFxuTmV3IGxpbmUgYWZ0ZXIgaW5zZXJ0aW9uOlwiLCBuZXdMaW5lKTtcclxuXHRcdFxyXG5cdFx0Ly8gVmVyaWZ5IHRoZSBibG9jayByZWZlcmVuY2UgaXMgcHJlc2VydmVkXHJcblx0XHRleHBlY3QobmV3TGluZSkudG9Db250YWluKFwiXnRpbWVyLTE2MTk0MC00Nzc1XCIpO1xyXG5cdFx0ZXhwZWN0KG5ld0xpbmUpLm5vdC50b01hdGNoKC9cXF50aW1lci4q4p2MLyk7IC8vIENhbmNlbGxlZCBkYXRlIHNob3VsZCBub3QgYmUgYWZ0ZXIgYmxvY2sgcmVmXHJcblx0fSk7XHJcblxyXG5cdGl0KFwic2hvdWxkIHRlc3Qgd2l0aCBkZWJ1Z2dpbmcgZW5hYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luOiBQYXJ0aWFsPFRhc2tQcm9ncmVzc0JhclBsdWdpbj4gPSB7XHJcblx0XHRcdHNldHRpbmdzOiB7XHJcblx0XHRcdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlTWFya2VyOiBcIvCfm6tcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdFx0Ly8gU2ltcGxlciB0ZXN0IGNhc2VcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFstXSBUYXNrIPCfm6sgMjAyNS0wNC0yMCBeYmxvY2stMTIzXCI7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiXFxuPT09IFNJTVBMRSBURVNUID09PVwiKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiTGluZTpcIiwgbGluZVRleHQpO1xyXG5cdFx0XHJcblx0XHRjb25zdCBwb3NpdGlvbiA9IGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uKFxyXG5cdFx0XHRsaW5lVGV4dCxcclxuXHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdFwiY2FuY2VsbGVkXCJcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiUG9zaXRpb246XCIsIHBvc2l0aW9uKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiU2hvdWxkIGluc2VydCBhdDpcIiwgbGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSArIFwiIDxIRVJFPlwiICsgbGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSk7XHJcblx0XHRcclxuXHRcdC8vIFNob3VsZCBiZSBhZnRlciB0aGUgZGF0ZSBidXQgYmVmb3JlIGJsb2NrIHJlZlxyXG5cdFx0ZXhwZWN0KHBvc2l0aW9uKS50b0JlTGVzc1RoYW4obGluZVRleHQuaW5kZXhPZihcIl5ibG9ja1wiKSk7XHJcblx0XHRleHBlY3QocG9zaXRpb24pLnRvQmVHcmVhdGVyVGhhbihsaW5lVGV4dC5pbmRleE9mKFwiMjAyNS0wNC0yMFwiKSArIFwiMjAyNS0wNC0yMFwiLmxlbmd0aCk7XHJcblx0fSk7XHJcbn0pOyJdfQ==