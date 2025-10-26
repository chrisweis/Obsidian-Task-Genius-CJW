// @ts-ignore
import { describe, it, expect } from "@jest/globals";
import { findMetadataInsertPosition, findCompletedDateInsertPosition, } from "../editor-extensions/date-time/date-manager";
describe("autoDateManager - Final Verification", () => {
    it("should correctly place cancelled date for user's exact scenario", () => {
        // User's exact configuration
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
        // User's exact line
        const lineText = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        // Test cancelled date position
        const cancelledPos = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        // For comparison, test completed date position
        const completedPos = findCompletedDateInsertPosition(lineText, mockPlugin);
        // Verify positions are correct
        // Cancelled date should be placed after the start date
        const startDateEnd = lineText.indexOf("2025-04-20") + "2025-04-20".length;
        expect(cancelledPos).toBe(startDateEnd);
        // Completed date should be at the same position for consistency
        expect(completedPos).toBe(startDateEnd);
        // Simulate insertion
        const cancelledDate = " ❌ 2025-07-31";
        const newLineWithCancelled = lineText.substring(0, cancelledPos) +
            cancelledDate +
            lineText.substring(cancelledPos);
        console.log("\nAfter cancelled date insertion:");
        console.log(newLineWithCancelled);
        // Verify structure is correct
        expect(newLineWithCancelled).toMatch(/🛫 2025-04-20 ❌ 2025-07-31 \^timer-161940-4775$/);
    });
    it("should handle case with no 🚀 emoji in text", () => {
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
        // Line without 🚀 emoji
        const lineText = "- [-] 交流交底 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("\nSimpler case without 🚀:");
        console.log("Line:", lineText);
        console.log("Position:", position);
        console.log("Text after position:", lineText.substring(position));
        // Debug output
        const dateEndPos = lineText.indexOf("2025-04-20") + "2025-04-20".length;
        console.log("Date ends at:", dateEndPos);
        console.log("Character at dateEndPos:", lineText[dateEndPos]);
        console.log("Insert position:", position);
        console.log("Character at position:", lineText[position]);
        // Should be after 🛫 date (allowing for immediate insertion after date)
        expect(position).toBeGreaterThanOrEqual(lineText.indexOf("2025-04-20") + "2025-04-20".length);
        expect(position).toBeLessThan(lineText.indexOf("^timer"));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLmZpbmFsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIuZmluYWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JELE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsK0JBQStCLEdBQy9CLE1BQU0sNkNBQTZDLENBQUM7QUFHckQsUUFBUSxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtJQUNyRCxFQUFFLENBQUMsaUVBQWlFLEVBQUUsR0FBRyxFQUFFO1FBQzFFLDZCQUE2QjtRQUM3QixNQUFNLFVBQVUsR0FBbUM7WUFDbEQsUUFBUSxFQUFFO2dCQUNULGVBQWUsRUFBRTtvQkFDaEIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLG1CQUFtQixFQUFFLEdBQUc7b0JBQ3hCLG1CQUFtQixFQUFFLEdBQUc7aUJBQ3hCO2dCQUNELG9CQUFvQixFQUFFLE9BQU87YUFDN0I7U0FDbUMsQ0FBQztRQUV0QyxvQkFBb0I7UUFDcEIsTUFBTSxRQUFRLEdBQUcsNkZBQTZGLENBQUM7UUFFL0csK0JBQStCO1FBQy9CLE1BQU0sWUFBWSxHQUFHLDBCQUEwQixDQUM5QyxRQUFRLEVBQ1IsVUFBbUMsRUFDbkMsV0FBVyxDQUNYLENBQUM7UUFFRiwrQ0FBK0M7UUFDL0MsTUFBTSxZQUFZLEdBQUcsK0JBQStCLENBQ25ELFFBQVEsRUFDUixVQUFtQyxDQUNuQyxDQUFDO1FBRUYsK0JBQStCO1FBQy9CLHVEQUF1RDtRQUN2RCxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDMUUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV4QyxnRUFBZ0U7UUFDaEUsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV4QyxxQkFBcUI7UUFDckIsTUFBTSxhQUFhLEdBQUcsZUFBZSxDQUFDO1FBQ3RDLE1BQU0sb0JBQW9CLEdBQ3pCLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQztZQUNuQyxhQUFhO1lBQ2IsUUFBUSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUVsQyxPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7UUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRWxDLDhCQUE4QjtRQUM5QixNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxPQUFPLENBQUMsaURBQWlELENBQUMsQ0FBQztJQUN6RixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7UUFDdEQsTUFBTSxVQUFVLEdBQW1DO1lBQ2xELFFBQVEsRUFBRTtnQkFDVCxlQUFlLEVBQUU7b0JBQ2hCLE9BQU8sRUFBRSxJQUFJO29CQUNiLGVBQWUsRUFBRSxJQUFJO29CQUNyQixtQkFBbUIsRUFBRSxHQUFHO29CQUN4QixtQkFBbUIsRUFBRSxHQUFHO2lCQUN4QjtnQkFDRCxvQkFBb0IsRUFBRSxPQUFPO2FBQzdCO1NBQ21DLENBQUM7UUFFdEMsd0JBQXdCO1FBQ3hCLE1BQU0sUUFBUSxHQUFHLCtFQUErRSxDQUFDO1FBRWpHLE1BQU0sUUFBUSxHQUFHLDBCQUEwQixDQUMxQyxRQUFRLEVBQ1IsVUFBbUMsRUFDbkMsV0FBVyxDQUNYLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7UUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFbEUsZUFBZTtRQUNmLE1BQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQztRQUN4RSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN6QyxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQzlELE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUUxRCx3RUFBd0U7UUFDeEUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlGLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXHJcbmltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0IH0gZnJvbSBcIkBqZXN0L2dsb2JhbHNcIjtcclxuaW1wb3J0IHtcclxuXHRmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbixcclxuXHRmaW5kQ29tcGxldGVkRGF0ZUluc2VydFBvc2l0aW9uLFxyXG59IGZyb20gXCIuLi9lZGl0b3ItZXh0ZW5zaW9ucy9kYXRlLXRpbWUvZGF0ZS1tYW5hZ2VyXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcblxyXG5kZXNjcmliZShcImF1dG9EYXRlTWFuYWdlciAtIEZpbmFsIFZlcmlmaWNhdGlvblwiLCAoKSA9PiB7XHJcblx0aXQoXCJzaG91bGQgY29ycmVjdGx5IHBsYWNlIGNhbmNlbGxlZCBkYXRlIGZvciB1c2VyJ3MgZXhhY3Qgc2NlbmFyaW9cIiwgKCkgPT4ge1xyXG5cdFx0Ly8gVXNlcidzIGV4YWN0IGNvbmZpZ3VyYXRpb25cclxuXHRcdGNvbnN0IG1vY2tQbHVnaW46IFBhcnRpYWw8VGFza1Byb2dyZXNzQmFyUGx1Z2luPiA9IHtcclxuXHRcdFx0c2V0dGluZ3M6IHtcclxuXHRcdFx0XHRhdXRvRGF0ZU1hbmFnZXI6IHtcclxuXHRcdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0XHRzdGFydERhdGVNYXJrZXI6IFwi8J+bq1wiLCAvLyBVc2VyJ3MgbWFya2VyXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlTWFya2VyOiBcIuKchVwiLFxyXG5cdFx0XHRcdFx0Y2FuY2VsbGVkRGF0ZU1hcmtlcjogXCLinYxcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImVtb2ppXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9IGFzIHVua25vd24gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuXHRcdC8vIFVzZXIncyBleGFjdCBsaW5lXHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbLV0g5Lqk5rWB5Lqk5bqVIPCfmoAgMjAyNS0wNy0zMCBbc3RhZ2U6OmRpc2Nsb3N1cmVfY29tbXVuaWNhdGlvbl0g8J+bqyAyMDI1LTA0LTIwIF50aW1lci0xNjE5NDAtNDc3NVwiO1xyXG5cdFx0XHJcblx0XHQvLyBUZXN0IGNhbmNlbGxlZCBkYXRlIHBvc2l0aW9uXHJcblx0XHRjb25zdCBjYW5jZWxsZWRQb3MgPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHQvLyBGb3IgY29tcGFyaXNvbiwgdGVzdCBjb21wbGV0ZWQgZGF0ZSBwb3NpdGlvblxyXG5cdFx0Y29uc3QgY29tcGxldGVkUG9zID0gZmluZENvbXBsZXRlZERhdGVJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHQvLyBWZXJpZnkgcG9zaXRpb25zIGFyZSBjb3JyZWN0XHJcblx0XHQvLyBDYW5jZWxsZWQgZGF0ZSBzaG91bGQgYmUgcGxhY2VkIGFmdGVyIHRoZSBzdGFydCBkYXRlXHJcblx0XHRjb25zdCBzdGFydERhdGVFbmQgPSBsaW5lVGV4dC5pbmRleE9mKFwiMjAyNS0wNC0yMFwiKSArIFwiMjAyNS0wNC0yMFwiLmxlbmd0aDtcclxuXHRcdGV4cGVjdChjYW5jZWxsZWRQb3MpLnRvQmUoc3RhcnREYXRlRW5kKTtcclxuXHRcdFxyXG5cdFx0Ly8gQ29tcGxldGVkIGRhdGUgc2hvdWxkIGJlIGF0IHRoZSBzYW1lIHBvc2l0aW9uIGZvciBjb25zaXN0ZW5jeVxyXG5cdFx0ZXhwZWN0KGNvbXBsZXRlZFBvcykudG9CZShzdGFydERhdGVFbmQpO1xyXG5cdFx0XHJcblx0XHQvLyBTaW11bGF0ZSBpbnNlcnRpb25cclxuXHRcdGNvbnN0IGNhbmNlbGxlZERhdGUgPSBcIiDinYwgMjAyNS0wNy0zMVwiO1xyXG5cdFx0Y29uc3QgbmV3TGluZVdpdGhDYW5jZWxsZWQgPSBcclxuXHRcdFx0bGluZVRleHQuc3Vic3RyaW5nKDAsIGNhbmNlbGxlZFBvcykgKyBcclxuXHRcdFx0Y2FuY2VsbGVkRGF0ZSArIFxyXG5cdFx0XHRsaW5lVGV4dC5zdWJzdHJpbmcoY2FuY2VsbGVkUG9zKTtcclxuXHRcdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIlxcbkFmdGVyIGNhbmNlbGxlZCBkYXRlIGluc2VydGlvbjpcIik7XHJcblx0XHRjb25zb2xlLmxvZyhuZXdMaW5lV2l0aENhbmNlbGxlZCk7XHJcblx0XHRcclxuXHRcdC8vIFZlcmlmeSBzdHJ1Y3R1cmUgaXMgY29ycmVjdFxyXG5cdFx0ZXhwZWN0KG5ld0xpbmVXaXRoQ2FuY2VsbGVkKS50b01hdGNoKC/wn5urIDIwMjUtMDQtMjAg4p2MIDIwMjUtMDctMzEgXFxedGltZXItMTYxOTQwLTQ3NzUkLyk7XHJcblx0fSk7XHJcblx0XHJcblx0aXQoXCJzaG91bGQgaGFuZGxlIGNhc2Ugd2l0aCBubyDwn5qAIGVtb2ppIGluIHRleHRcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbjogUGFydGlhbDxUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4+ID0ge1xyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZU1hcmtlcjogXCLwn5urXCIsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlTWFya2VyOiBcIuKchVwiLFxyXG5cdFx0XHRcdFx0Y2FuY2VsbGVkRGF0ZU1hcmtlcjogXCLinYxcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImVtb2ppXCIsXHJcblx0XHRcdH0sXHJcblx0XHR9IGFzIHVua25vd24gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuXHRcdC8vIExpbmUgd2l0aG91dCDwn5qAIGVtb2ppXHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbLV0g5Lqk5rWB5Lqk5bqVIFtzdGFnZTo6ZGlzY2xvc3VyZV9jb21tdW5pY2F0aW9uXSDwn5urIDIwMjUtMDQtMjAgXnRpbWVyLTE2MTk0MC00Nzc1XCI7XHJcblx0XHRcclxuXHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0Y29uc29sZS5sb2coXCJcXG5TaW1wbGVyIGNhc2Ugd2l0aG91dCDwn5qAOlwiKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiTGluZTpcIiwgbGluZVRleHQpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJQb3NpdGlvbjpcIiwgcG9zaXRpb24pO1xyXG5cdFx0Y29uc29sZS5sb2coXCJUZXh0IGFmdGVyIHBvc2l0aW9uOlwiLCBsaW5lVGV4dC5zdWJzdHJpbmcocG9zaXRpb24pKTtcclxuXHRcdFxyXG5cdFx0Ly8gRGVidWcgb3V0cHV0XHJcblx0XHRjb25zdCBkYXRlRW5kUG9zID0gbGluZVRleHQuaW5kZXhPZihcIjIwMjUtMDQtMjBcIikgKyBcIjIwMjUtMDQtMjBcIi5sZW5ndGg7XHJcblx0XHRjb25zb2xlLmxvZyhcIkRhdGUgZW5kcyBhdDpcIiwgZGF0ZUVuZFBvcyk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkNoYXJhY3RlciBhdCBkYXRlRW5kUG9zOlwiLCBsaW5lVGV4dFtkYXRlRW5kUG9zXSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkluc2VydCBwb3NpdGlvbjpcIiwgcG9zaXRpb24pO1xyXG5cdFx0Y29uc29sZS5sb2coXCJDaGFyYWN0ZXIgYXQgcG9zaXRpb246XCIsIGxpbmVUZXh0W3Bvc2l0aW9uXSk7XHJcblx0XHRcclxuXHRcdC8vIFNob3VsZCBiZSBhZnRlciDwn5urIGRhdGUgKGFsbG93aW5nIGZvciBpbW1lZGlhdGUgaW5zZXJ0aW9uIGFmdGVyIGRhdGUpXHJcblx0XHRleHBlY3QocG9zaXRpb24pLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwobGluZVRleHQuaW5kZXhPZihcIjIwMjUtMDQtMjBcIikgKyBcIjIwMjUtMDQtMjBcIi5sZW5ndGgpO1xyXG5cdFx0ZXhwZWN0KHBvc2l0aW9uKS50b0JlTGVzc1RoYW4obGluZVRleHQuaW5kZXhPZihcIl50aW1lclwiKSk7XHJcblx0fSk7XHJcbn0pOyJdfQ==