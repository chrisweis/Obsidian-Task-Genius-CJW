// @ts-ignore
import { describe, it, expect } from "@jest/globals";
import { findMetadataInsertPosition, } from "../editor-extensions/date-time/date-manager";
describe("autoDateManager - Simple Cancelled Date Test", () => {
    it("should insert cancelled date after 🛫 date", () => {
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
        // Simple case: just 🛫 date and block ref
        const lineText = "- [-] Task 🛫 2025-04-20 ^block-id";
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("Position:", position);
        console.log("Text after position:", lineText.substring(position));
        // Should insert after 🛫 date
        expect(lineText.substring(position)).toBe(" ^block-id");
    });
    it("should handle complex line with dataview", () => {
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
        const lineText = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("Complex line position:", position);
        console.log("Text before:", lineText.substring(0, position));
        console.log("Text after:", lineText.substring(position));
        // Should insert after 🛫 2025-04-20
        const expectedAfter = " ^timer-161940-4775";
        expect(lineText.substring(position)).toBe(expectedAfter);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLnNpbXBsZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0b0RhdGVNYW5hZ2VyLnNpbXBsZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGFBQWE7QUFDYixPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDckQsT0FBTyxFQUNOLDBCQUEwQixHQUMxQixNQUFNLDZDQUE2QyxDQUFDO0FBR3JELFFBQVEsQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7SUFDN0QsRUFBRSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtRQUNyRCxNQUFNLFVBQVUsR0FBbUM7WUFDbEQsUUFBUSxFQUFFO2dCQUNULGVBQWUsRUFBRTtvQkFDaEIsT0FBTyxFQUFFLElBQUk7b0JBQ2IsZUFBZSxFQUFFLElBQUk7b0JBQ3JCLG1CQUFtQixFQUFFLEdBQUc7b0JBQ3hCLG1CQUFtQixFQUFFLEdBQUc7aUJBQ3hCO2dCQUNELG9CQUFvQixFQUFFLE9BQU87YUFDN0I7U0FDbUMsQ0FBQztRQUV0QywwQ0FBMEM7UUFDMUMsTUFBTSxRQUFRLEdBQUcsb0NBQW9DLENBQUM7UUFFdEQsTUFBTSxRQUFRLEdBQUcsMEJBQTBCLENBQzFDLFFBQVEsRUFDUixVQUFtQyxFQUNuQyxXQUFXLENBQ1gsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ25DLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRWxFLDhCQUE4QjtRQUM5QixNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7UUFDbkQsTUFBTSxVQUFVLEdBQW1DO1lBQ2xELFFBQVEsRUFBRTtnQkFDVCxlQUFlLEVBQUU7b0JBQ2hCLE9BQU8sRUFBRSxJQUFJO29CQUNiLGVBQWUsRUFBRSxJQUFJO29CQUNyQixtQkFBbUIsRUFBRSxHQUFHO29CQUN4QixtQkFBbUIsRUFBRSxHQUFHO2lCQUN4QjtnQkFDRCxvQkFBb0IsRUFBRSxPQUFPO2FBQzdCO1NBQ21DLENBQUM7UUFFdEMsTUFBTSxRQUFRLEdBQUcsNkZBQTZGLENBQUM7UUFFL0csTUFBTSxRQUFRLEdBQUcsMEJBQTBCLENBQzFDLFFBQVEsRUFDUixVQUFtQyxFQUNuQyxXQUFXLENBQ1gsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM3RCxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFekQsb0NBQW9DO1FBQ3BDLE1BQU0sYUFBYSxHQUFHLHFCQUFxQixDQUFDO1FBQzVDLE1BQU0sQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzFELENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXHJcbmltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0IH0gZnJvbSBcIkBqZXN0L2dsb2JhbHNcIjtcclxuaW1wb3J0IHtcclxuXHRmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbixcclxufSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvZGF0ZS10aW1lL2RhdGUtbWFuYWdlclwiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuZGVzY3JpYmUoXCJhdXRvRGF0ZU1hbmFnZXIgLSBTaW1wbGUgQ2FuY2VsbGVkIERhdGUgVGVzdFwiLCAoKSA9PiB7XHJcblx0aXQoXCJzaG91bGQgaW5zZXJ0IGNhbmNlbGxlZCBkYXRlIGFmdGVyIPCfm6sgZGF0ZVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luOiBQYXJ0aWFsPFRhc2tQcm9ncmVzc0JhclBsdWdpbj4gPSB7XHJcblx0XHRcdHNldHRpbmdzOiB7XHJcblx0XHRcdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlTWFya2VyOiBcIvCfm6tcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdFx0Ly8gU2ltcGxlIGNhc2U6IGp1c3Qg8J+bqyBkYXRlIGFuZCBibG9jayByZWZcclxuXHRcdGNvbnN0IGxpbmVUZXh0ID0gXCItIFstXSBUYXNrIPCfm6sgMjAyNS0wNC0yMCBeYmxvY2staWRcIjtcclxuXHRcdFxyXG5cdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIlBvc2l0aW9uOlwiLCBwb3NpdGlvbik7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRleHQgYWZ0ZXIgcG9zaXRpb246XCIsIGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpO1xyXG5cdFx0XHJcblx0XHQvLyBTaG91bGQgaW5zZXJ0IGFmdGVyIPCfm6sgZGF0ZVxyXG5cdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoXCIgXmJsb2NrLWlkXCIpO1xyXG5cdH0pO1xyXG5cdFxyXG5cdGl0KFwic2hvdWxkIGhhbmRsZSBjb21wbGV4IGxpbmUgd2l0aCBkYXRhdmlld1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luOiBQYXJ0aWFsPFRhc2tQcm9ncmVzc0JhclBsdWdpbj4gPSB7XHJcblx0XHRcdHNldHRpbmdzOiB7XHJcblx0XHRcdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlTWFya2VyOiBcIvCfm6tcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWy1dIOS6pOa1geS6pOW6lSDwn5qAIDIwMjUtMDctMzAgW3N0YWdlOjpkaXNjbG9zdXJlX2NvbW11bmljYXRpb25dIPCfm6sgMjAyNS0wNC0yMCBedGltZXItMTYxOTQwLTQ3NzVcIjtcclxuXHRcdFxyXG5cdFx0Y29uc3QgcG9zaXRpb24gPSBmaW5kTWV0YWRhdGFJbnNlcnRQb3NpdGlvbihcclxuXHRcdFx0bGluZVRleHQsXHJcblx0XHRcdG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luLFxyXG5cdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHQpO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIkNvbXBsZXggbGluZSBwb3NpdGlvbjpcIiwgcG9zaXRpb24pO1xyXG5cdFx0Y29uc29sZS5sb2coXCJUZXh0IGJlZm9yZTpcIiwgbGluZVRleHQuc3Vic3RyaW5nKDAsIHBvc2l0aW9uKSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRleHQgYWZ0ZXI6XCIsIGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpO1xyXG5cdFx0XHJcblx0XHQvLyBTaG91bGQgaW5zZXJ0IGFmdGVyIPCfm6sgMjAyNS0wNC0yMFxyXG5cdFx0Y29uc3QgZXhwZWN0ZWRBZnRlciA9IFwiIF50aW1lci0xNjE5NDAtNDc3NVwiO1xyXG5cdFx0ZXhwZWN0KGxpbmVUZXh0LnN1YnN0cmluZyhwb3NpdGlvbikpLnRvQmUoZXhwZWN0ZWRBZnRlcik7XHJcblx0fSk7XHJcbn0pOyJdfQ==