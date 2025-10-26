// @ts-ignore
import { describe, it } from "@jest/globals";
import { EditorState } from "@codemirror/state";
import { findTaskStatusChange, determineDateOperations, applyDateOperations, } from "../editor-extensions/date-time/date-manager";
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
const mockApp = {};
describe("autoDateManager - Integration Test", () => {
    it("should handle cancelled date insertion with real transaction", () => {
        // User's exact line - task status changing from ' ' to '_' (abandoned)
        const originalLine = "- [ ] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        const modifiedLine = "- [_] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        // Create an editor state
        const startState = EditorState.create({
            doc: originalLine,
        });
        // Create a transaction that changes [ ] to [_]
        const tr = startState.update({
            changes: {
                from: 3,
                to: 4,
                insert: "_",
            },
        });
        console.log("Original:", originalLine);
        console.log("Modified:", modifiedLine);
        console.log("Transaction newDoc:", tr.newDoc.toString());
        // Find the task status change
        const statusChange = findTaskStatusChange(tr);
        if (!statusChange) {
            throw new Error("No status change found");
        }
        console.log("Status change:", statusChange);
        // Determine date operations
        const operations = determineDateOperations(statusChange.oldStatus, statusChange.newStatus, mockPlugin, tr.newDoc.line(1).text);
        console.log("Operations:", operations);
        // Apply date operations
        const result = applyDateOperations(tr, tr.newDoc, 1, operations, mockPlugin);
        // This would throw if there's an issue
        throw new Error(`
INTEGRATION TEST DEBUG:
- Original: ${originalLine}
- Modified: ${modifiedLine}
- Operations: ${JSON.stringify(operations)}
- Result changes: ${JSON.stringify(result.changes)}
`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLmludGVncmF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIuaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQVUsTUFBTSxlQUFlLENBQUM7QUFDckQsT0FBTyxFQUFFLFdBQVcsRUFBZSxNQUFNLG1CQUFtQixDQUFDO0FBQzdELE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsdUJBQXVCLEVBQ3ZCLG1CQUFtQixHQUNuQixNQUFNLDZDQUE2QyxDQUFDO0FBSXJELGtCQUFrQjtBQUNsQixNQUFNLFVBQVUsR0FBbUM7SUFDbEQsUUFBUSxFQUFFO1FBQ1QsZUFBZSxFQUFFO1lBQ2hCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsZUFBZSxFQUFFLElBQUk7WUFDckIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGVBQWUsRUFBRSxZQUFZO1lBQzdCLG1CQUFtQixFQUFFLFlBQVk7WUFDakMsbUJBQW1CLEVBQUUsWUFBWTtZQUNqQyxlQUFlLEVBQUUsSUFBSTtZQUNyQixtQkFBbUIsRUFBRSxHQUFHO1lBQ3hCLG1CQUFtQixFQUFFLEdBQUc7U0FDeEI7UUFDRCxvQkFBb0IsRUFBRSxPQUFPO1FBQzdCLFlBQVksRUFBRTtZQUNiLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsT0FBTyxFQUFFLEdBQUc7WUFDWixVQUFVLEVBQUUsR0FBRztTQUNmO0tBQ0Q7Q0FDbUMsQ0FBQztBQUV0QyxNQUFNLE9BQU8sR0FBRyxFQUFTLENBQUM7QUFFMUIsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNuRCxFQUFFLENBQUMsOERBQThELEVBQUUsR0FBRyxFQUFFO1FBQ3ZFLHVFQUF1RTtRQUN2RSxNQUFNLFlBQVksR0FBRyw2RkFBNkYsQ0FBQztRQUNuSCxNQUFNLFlBQVksR0FBRyw2RkFBNkYsQ0FBQztRQUVuSCx5QkFBeUI7UUFDekIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztZQUNyQyxHQUFHLEVBQUUsWUFBWTtTQUNqQixDQUFDLENBQUM7UUFFSCwrQ0FBK0M7UUFDL0MsTUFBTSxFQUFFLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUM1QixPQUFPLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsRUFBRSxFQUFFLENBQUM7Z0JBQ0wsTUFBTSxFQUFFLEdBQUc7YUFDWDtTQUNELENBQWdCLENBQUM7UUFFbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFFekQsOEJBQThCO1FBQzlCLE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxZQUFZLEVBQUU7WUFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1NBQzFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUU1Qyw0QkFBNEI7UUFDNUIsTUFBTSxVQUFVLEdBQUcsdUJBQXVCLENBQ3pDLFlBQVksQ0FBQyxTQUFTLEVBQ3RCLFlBQVksQ0FBQyxTQUFTLEVBQ3RCLFVBQW1DLEVBQ25DLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDdEIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXZDLHdCQUF3QjtRQUN4QixNQUFNLE1BQU0sR0FBRyxtQkFBbUIsQ0FDakMsRUFBRSxFQUNGLEVBQUUsQ0FBQyxNQUFNLEVBQ1QsQ0FBQyxFQUNELFVBQVUsRUFDVixVQUFtQyxDQUNuQyxDQUFDO1FBRUYsdUNBQXVDO1FBQ3ZDLE1BQU0sSUFBSSxLQUFLLENBQUM7O2NBRUosWUFBWTtjQUNaLFlBQVk7Z0JBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztDQUNqRCxDQUFDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxyXG5pbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCB9IGZyb20gXCJAamVzdC9nbG9iYWxzXCI7XHJcbmltcG9ydCB7IEVkaXRvclN0YXRlLCBUcmFuc2FjdGlvbiB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQge1xyXG5cdGhhbmRsZUF1dG9EYXRlTWFuYWdlclRyYW5zYWN0aW9uLFxyXG5cdGZpbmRUYXNrU3RhdHVzQ2hhbmdlLFxyXG5cdGRldGVybWluZURhdGVPcGVyYXRpb25zLFxyXG5cdGFwcGx5RGF0ZU9wZXJhdGlvbnMsXHJcbn0gZnJvbSBcIi4uL2VkaXRvci1leHRlbnNpb25zL2RhdGUtdGltZS9kYXRlLW1hbmFnZXJcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuaW1wb3J0IHsgQXBwIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIHRoZSBwbHVnaW5cclxuY29uc3QgbW9ja1BsdWdpbjogUGFydGlhbDxUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4+ID0ge1xyXG5cdHNldHRpbmdzOiB7XHJcblx0XHRhdXRvRGF0ZU1hbmFnZXI6IHtcclxuXHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0bWFuYWdlU3RhcnREYXRlOiB0cnVlLFxyXG5cdFx0XHRtYW5hZ2VDb21wbGV0ZWREYXRlOiB0cnVlLFxyXG5cdFx0XHRtYW5hZ2VDYW5jZWxsZWREYXRlOiB0cnVlLFxyXG5cdFx0XHRzdGFydERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHRjb21wbGV0ZWREYXRlRm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0Y2FuY2VsbGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdHN0YXJ0RGF0ZU1hcmtlcjogXCLwn5urXCIsXHJcblx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdGNhbmNlbGxlZERhdGVNYXJrZXI6IFwi4p2MXCIsXHJcblx0XHR9LFxyXG5cdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdHRhc2tTdGF0dXNlczoge1xyXG5cdFx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRcdGluUHJvZ3Jlc3M6IFwiL3wtXCIsXHJcblx0XHRcdGFiYW5kb25lZDogXCJfXCIsXHJcblx0XHRcdHBsYW5uZWQ6IFwiIVwiLFxyXG5cdFx0XHRub3RTdGFydGVkOiBcIiBcIixcclxuXHRcdH0sXHJcblx0fSxcclxufSBhcyB1bmtub3duIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcbmNvbnN0IG1vY2tBcHAgPSB7fSBhcyBBcHA7XHJcblxyXG5kZXNjcmliZShcImF1dG9EYXRlTWFuYWdlciAtIEludGVncmF0aW9uIFRlc3RcIiwgKCkgPT4ge1xyXG5cdGl0KFwic2hvdWxkIGhhbmRsZSBjYW5jZWxsZWQgZGF0ZSBpbnNlcnRpb24gd2l0aCByZWFsIHRyYW5zYWN0aW9uXCIsICgpID0+IHtcclxuXHRcdC8vIFVzZXIncyBleGFjdCBsaW5lIC0gdGFzayBzdGF0dXMgY2hhbmdpbmcgZnJvbSAnICcgdG8gJ18nIChhYmFuZG9uZWQpXHJcblx0XHRjb25zdCBvcmlnaW5hbExpbmUgPSBcIi0gWyBdIOS6pOa1geS6pOW6lSDwn5qAIDIwMjUtMDctMzAgW3N0YWdlOjpkaXNjbG9zdXJlX2NvbW11bmljYXRpb25dIPCfm6sgMjAyNS0wNC0yMCBedGltZXItMTYxOTQwLTQ3NzVcIjtcclxuXHRcdGNvbnN0IG1vZGlmaWVkTGluZSA9IFwiLSBbX10g5Lqk5rWB5Lqk5bqVIPCfmoAgMjAyNS0wNy0zMCBbc3RhZ2U6OmRpc2Nsb3N1cmVfY29tbXVuaWNhdGlvbl0g8J+bqyAyMDI1LTA0LTIwIF50aW1lci0xNjE5NDAtNDc3NVwiO1xyXG5cdFx0XHJcblx0XHQvLyBDcmVhdGUgYW4gZWRpdG9yIHN0YXRlXHJcblx0XHRjb25zdCBzdGFydFN0YXRlID0gRWRpdG9yU3RhdGUuY3JlYXRlKHtcclxuXHRcdFx0ZG9jOiBvcmlnaW5hbExpbmUsXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0Ly8gQ3JlYXRlIGEgdHJhbnNhY3Rpb24gdGhhdCBjaGFuZ2VzIFsgXSB0byBbX11cclxuXHRcdGNvbnN0IHRyID0gc3RhcnRTdGF0ZS51cGRhdGUoe1xyXG5cdFx0XHRjaGFuZ2VzOiB7XHJcblx0XHRcdFx0ZnJvbTogMyxcclxuXHRcdFx0XHR0bzogNCxcclxuXHRcdFx0XHRpbnNlcnQ6IFwiX1wiLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSkgYXMgVHJhbnNhY3Rpb247XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiT3JpZ2luYWw6XCIsIG9yaWdpbmFsTGluZSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIk1vZGlmaWVkOlwiLCBtb2RpZmllZExpbmUpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJUcmFuc2FjdGlvbiBuZXdEb2M6XCIsIHRyLm5ld0RvYy50b1N0cmluZygpKTtcclxuXHRcdFxyXG5cdFx0Ly8gRmluZCB0aGUgdGFzayBzdGF0dXMgY2hhbmdlXHJcblx0XHRjb25zdCBzdGF0dXNDaGFuZ2UgPSBmaW5kVGFza1N0YXR1c0NoYW5nZSh0cik7XHJcblx0XHRpZiAoIXN0YXR1c0NoYW5nZSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoXCJObyBzdGF0dXMgY2hhbmdlIGZvdW5kXCIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIlN0YXR1cyBjaGFuZ2U6XCIsIHN0YXR1c0NoYW5nZSk7XHJcblx0XHRcclxuXHRcdC8vIERldGVybWluZSBkYXRlIG9wZXJhdGlvbnNcclxuXHRcdGNvbnN0IG9wZXJhdGlvbnMgPSBkZXRlcm1pbmVEYXRlT3BlcmF0aW9ucyhcclxuXHRcdFx0c3RhdHVzQ2hhbmdlLm9sZFN0YXR1cyxcclxuXHRcdFx0c3RhdHVzQ2hhbmdlLm5ld1N0YXR1cyxcclxuXHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4sXHJcblx0XHRcdHRyLm5ld0RvYy5saW5lKDEpLnRleHRcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiT3BlcmF0aW9uczpcIiwgb3BlcmF0aW9ucyk7XHJcblx0XHRcclxuXHRcdC8vIEFwcGx5IGRhdGUgb3BlcmF0aW9uc1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0gYXBwbHlEYXRlT3BlcmF0aW9ucyhcclxuXHRcdFx0dHIsXHJcblx0XHRcdHRyLm5ld0RvYyxcclxuXHRcdFx0MSxcclxuXHRcdFx0b3BlcmF0aW9ucyxcclxuXHRcdFx0bW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW5cclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdC8vIFRoaXMgd291bGQgdGhyb3cgaWYgdGhlcmUncyBhbiBpc3N1ZVxyXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBcclxuSU5URUdSQVRJT04gVEVTVCBERUJVRzpcclxuLSBPcmlnaW5hbDogJHtvcmlnaW5hbExpbmV9XHJcbi0gTW9kaWZpZWQ6ICR7bW9kaWZpZWRMaW5lfVxyXG4tIE9wZXJhdGlvbnM6ICR7SlNPTi5zdHJpbmdpZnkob3BlcmF0aW9ucyl9XHJcbi0gUmVzdWx0IGNoYW5nZXM6ICR7SlNPTi5zdHJpbmdpZnkocmVzdWx0LmNoYW5nZXMpfVxyXG5gKTtcclxuXHR9KTtcclxufSk7Il19