// @ts-ignore
import { describe, it, expect } from "@jest/globals";
import { determineDateOperations, getStatusType, } from "../editor-extensions/date-time/date-manager";
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
            inProgress: "/|-|>",
            abandoned: "_|-",
            planned: "!",
            notStarted: " ",
        },
    },
};
describe("autoDateManager - Pause Timer Conflict", () => {
    it("should identify conflict when pausing timer changes status to abandoned", () => {
        // When timer is paused, status changes from '/' to '-'
        const oldStatus = "/";
        const newStatus = "-";
        const lineText = "- [-] Task with timer 🛫 2025-04-20 ^timer-123";
        // Check what autoDateManager will do
        const oldType = getStatusType(oldStatus, mockPlugin);
        const newType = getStatusType(newStatus, mockPlugin);
        console.log(`Status change: "${oldStatus}" (${oldType}) -> "${newStatus}" (${newType})`);
        // Both '/' and '-' are configured, so types should be identified
        expect(oldType).toBe("inProgress");
        expect(newType).toBe("abandoned");
        // Determine what date operations would be triggered
        const operations = determineDateOperations(oldStatus, newStatus, mockPlugin, lineText);
        console.log("Date operations:", operations);
        // PROBLEM: When pausing, autoDateManager will try to add a cancelled date
        expect(operations).toHaveLength(1);
        expect(operations[0]).toMatchObject({
            type: "add",
            dateType: "cancelled",
        });
        // This is the conflict: pause operation triggers date insertion
    });
    it("should show that '-' marker is ambiguous (used for both pause and abandoned)", () => {
        // The '-' marker is used for both:
        // 1. Paused tasks (temporary state while timer is paused)
        // 2. Abandoned/cancelled tasks (permanent state)
        const pausedTaskStatus = "-";
        const abandonedTaskStatus = "-";
        const pausedType = getStatusType(pausedTaskStatus, mockPlugin);
        const abandonedType = getStatusType(abandonedTaskStatus, mockPlugin);
        // Both resolve to the same type
        expect(pausedType).toBe("abandoned");
        expect(abandonedType).toBe("abandoned");
        // This ambiguity causes autoDateManager to treat paused tasks as abandoned
        // and insert a cancelled date, which may not be desired for temporary pauses
    });
    it("should demonstrate the specific user scenario", () => {
        // User's exact scenario
        const taskBeforePause = "- [/] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        const taskAfterPause = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        // Status change from '/' to '-'
        const operations = determineDateOperations("/", "-", mockPlugin, taskAfterPause);
        // AutoDateManager will add a cancelled date
        expect(operations).toContainEqual({
            type: "add",
            dateType: "cancelled",
            format: "YYYY-MM-DD",
        });
        // Expected result after autoDateManager processes it:
        // The cancelled date (❌ 2025-07-31) would be inserted
        const expectedResult = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ❌ 2025-07-31 ^timer-161940-4775";
        console.log("Task before pause:", taskBeforePause);
        console.log("Task after pause:", taskAfterPause);
        console.log("Expected with date:", expectedResult);
    });
    it("should suggest solutions for the conflict", () => {
        // Potential solutions:
        // Solution 1: Check for timer-specific annotations
        const isTimerOperation = (annotation) => {
            return annotation === "taskTimer" || annotation.includes("timer");
        };
        // Solution 2: Use different status markers for pause vs abandoned
        const alternativeStatuses = {
            paused: "p",
            abandoned: "_",
            inProgress: "/",
        };
        // Solution 3: Add configuration to skip date management for timer operations
        const skipDateManagementForTimers = true;
        // Solution 4: Check for timer-related block references
        const hasTimerBlockRef = (text) => {
            return /\^timer-\d+/.test(text);
        };
        expect(isTimerOperation("taskTimer")).toBe(true);
        expect(hasTimerBlockRef("^timer-123")).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLnBhdXNlLWNvbmZsaWN0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIucGF1c2UtY29uZmxpY3QudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JELE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsYUFBYSxHQUNiLE1BQU0sNkNBQTZDLENBQUM7QUFHckQsa0JBQWtCO0FBQ2xCLE1BQU0sVUFBVSxHQUFtQztJQUNsRCxRQUFRLEVBQUU7UUFDVCxlQUFlLEVBQUU7WUFDaEIsT0FBTyxFQUFFLElBQUk7WUFDYixlQUFlLEVBQUUsSUFBSTtZQUNyQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLG1CQUFtQixFQUFFLElBQUk7WUFDekIsZUFBZSxFQUFFLFlBQVk7WUFDN0IsbUJBQW1CLEVBQUUsWUFBWTtZQUNqQyxtQkFBbUIsRUFBRSxZQUFZO1lBQ2pDLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLG1CQUFtQixFQUFFLEdBQUc7WUFDeEIsbUJBQW1CLEVBQUUsR0FBRztTQUN4QjtRQUNELG9CQUFvQixFQUFFLE9BQU87UUFDN0IsWUFBWSxFQUFFO1lBQ2IsU0FBUyxFQUFFLEtBQUs7WUFDaEIsVUFBVSxFQUFFLE9BQU87WUFDbkIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsT0FBTyxFQUFFLEdBQUc7WUFDWixVQUFVLEVBQUUsR0FBRztTQUNmO0tBQ0Q7Q0FDbUMsQ0FBQztBQUV0QyxRQUFRLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO0lBQ3ZELEVBQUUsQ0FBQyx5RUFBeUUsRUFBRSxHQUFHLEVBQUU7UUFDbEYsdURBQXVEO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQztRQUN0QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUM7UUFDdEIsTUFBTSxRQUFR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QkFBZ0IsR0FBRyxDQUFDLFVBQWtCLEVBQUUsRUFBRTtZQUMvQyxPQUFPLFVBQVUsS0FBSyxXQUFXLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuRSxDQUFDLENBQUM7UUFFRixrRUFBa0U7UUFDbEUsTUFBTSxtQkFBbUIsR0FBRztZQUMzQixNQUFNLEVBQUUsR0FBRztZQUNYLFNBQVMsRUFBRSxHQUFHO1lBQ2QsVUFBVSxFQUFFLEdBQUc7U0FDZixDQUFDO1FBRUYsNkVBQTZFO1FBQzdFLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxDQUFDO1FBRXpDLHVEQUF1RDtRQUN2RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7WUFDekMsT0FBTyxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1pZ25vcmVcclxuaW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QgfSBmcm9tIFwiQGplc3QvZ2xvYmFsc1wiO1xyXG5pbXBvcnQge1xyXG5cdGZpbmRUYXNrU3RhdHVzQ2hhbmdlLFxyXG5cdGRldGVybWluZURhdGVPcGVyYXRpb25zLFxyXG5cdGdldFN0YXR1c1R5cGUsXHJcbn0gZnJvbSBcIi4uL2VkaXRvci1leHRlbnNpb25zL2RhdGUtdGltZS9kYXRlLW1hbmFnZXJcIjtcclxuaW1wb3J0IFRhc2tQcm9ncmVzc0JhclBsdWdpbiBmcm9tIFwiLi4vaW5kZXhcIjtcclxuXHJcbi8vIE1vY2sgdGhlIHBsdWdpblxyXG5jb25zdCBtb2NrUGx1Z2luOiBQYXJ0aWFsPFRhc2tQcm9ncmVzc0JhclBsdWdpbj4gPSB7XHJcblx0c2V0dGluZ3M6IHtcclxuXHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRtYW5hZ2VTdGFydERhdGU6IHRydWUsXHJcblx0XHRcdG1hbmFnZUNvbXBsZXRlZERhdGU6IHRydWUsXHJcblx0XHRcdG1hbmFnZUNhbmNlbGxlZERhdGU6IHRydWUsXHJcblx0XHRcdHN0YXJ0RGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdGNvbXBsZXRlZERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLCBcclxuXHRcdFx0Y2FuY2VsbGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdHN0YXJ0RGF0ZU1hcmtlcjogXCLwn5urXCIsXHJcblx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdGNhbmNlbGxlZERhdGVNYXJrZXI6IFwi4p2MXCIsXHJcblx0XHR9LFxyXG5cdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdHRhc2tTdGF0dXNlczoge1xyXG5cdFx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRcdGluUHJvZ3Jlc3M6IFwiL3wtfD5cIixcclxuXHRcdFx0YWJhbmRvbmVkOiBcIl98LVwiLCAgLy8gTm90ZTogJy0nIGlzIHVzZWQgZm9yIGJvdGggcGF1c2VkIGFuZCBhYmFuZG9uZWRcclxuXHRcdFx0cGxhbm5lZDogXCIhXCIsXHJcblx0XHRcdG5vdFN0YXJ0ZWQ6IFwiIFwiLFxyXG5cdFx0fSxcclxuXHR9LFxyXG59IGFzIHVua25vd24gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cclxuZGVzY3JpYmUoXCJhdXRvRGF0ZU1hbmFnZXIgLSBQYXVzZSBUaW1lciBDb25mbGljdFwiLCAoKSA9PiB7XHJcblx0aXQoXCJzaG91bGQgaWRlbnRpZnkgY29uZmxpY3Qgd2hlbiBwYXVzaW5nIHRpbWVyIGNoYW5nZXMgc3RhdHVzIHRvIGFiYW5kb25lZFwiLCAoKSA9PiB7XHJcblx0XHQvLyBXaGVuIHRpbWVyIGlzIHBhdXNlZCwgc3RhdHVzIGNoYW5nZXMgZnJvbSAnLycgdG8gJy0nXHJcblx0XHRjb25zdCBvbGRTdGF0dXMgPSBcIi9cIjtcclxuXHRcdGNvbnN0IG5ld1N0YXR1cyA9IFwiLVwiO1xyXG5cdFx0Y29uc3QgbGluZVRleHQgPSBcIi0gWy1dIFRhc2sgd2l0aCB0aW1lciDwn5urIDIwMjUtMDQtMjAgXnRpbWVyLTEyM1wiO1xyXG5cdFx0XHJcblx0XHQvLyBDaGVjayB3aGF0IGF1dG9EYXRlTWFuYWdlciB3aWxsIGRvXHJcblx0XHRjb25zdCBvbGRUeXBlID0gZ2V0U3RhdHVzVHlwZShvbGRTdGF0dXMsIG1vY2tQbHVnaW4gYXMgVGFza1Byb2dyZXNzQmFyUGx1Z2luKTtcclxuXHRcdGNvbnN0IG5ld1R5cGUgPSBnZXRTdGF0dXNUeXBlKG5ld1N0YXR1cywgbW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhgU3RhdHVzIGNoYW5nZTogXCIke29sZFN0YXR1c31cIiAoJHtvbGRUeXBlfSkgLT4gXCIke25ld1N0YXR1c31cIiAoJHtuZXdUeXBlfSlgKTtcclxuXHRcdFxyXG5cdFx0Ly8gQm90aCAnLycgYW5kICctJyBhcmUgY29uZmlndXJlZCwgc28gdHlwZXMgc2hvdWxkIGJlIGlkZW50aWZpZWRcclxuXHRcdGV4cGVjdChvbGRUeXBlKS50b0JlKFwiaW5Qcm9ncmVzc1wiKTtcclxuXHRcdGV4cGVjdChuZXdUeXBlKS50b0JlKFwiYWJhbmRvbmVkXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBEZXRlcm1pbmUgd2hhdCBkYXRlIG9wZXJhdGlvbnMgd291bGQgYmUgdHJpZ2dlcmVkXHJcblx0XHRjb25zdCBvcGVyYXRpb25zID0gZGV0ZXJtaW5lRGF0ZU9wZXJhdGlvbnMoXHJcblx0XHRcdG9sZFN0YXR1cyxcclxuXHRcdFx0bmV3U3RhdHVzLFxyXG5cdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0bGluZVRleHRcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiRGF0ZSBvcGVyYXRpb25zOlwiLCBvcGVyYXRpb25zKTtcclxuXHRcdFxyXG5cdFx0Ly8gUFJPQkxFTTogV2hlbiBwYXVzaW5nLCBhdXRvRGF0ZU1hbmFnZXIgd2lsbCB0cnkgdG8gYWRkIGEgY2FuY2VsbGVkIGRhdGVcclxuXHRcdGV4cGVjdChvcGVyYXRpb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRleHBlY3Qob3BlcmF0aW9uc1swXSkudG9NYXRjaE9iamVjdCh7XHJcblx0XHRcdHR5cGU6IFwiYWRkXCIsXHJcblx0XHRcdGRhdGVUeXBlOiBcImNhbmNlbGxlZFwiLFxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdC8vIFRoaXMgaXMgdGhlIGNvbmZsaWN0OiBwYXVzZSBvcGVyYXRpb24gdHJpZ2dlcnMgZGF0ZSBpbnNlcnRpb25cclxuXHR9KTtcclxuXHJcblx0aXQoXCJzaG91bGQgc2hvdyB0aGF0ICctJyBtYXJrZXIgaXMgYW1iaWd1b3VzICh1c2VkIGZvciBib3RoIHBhdXNlIGFuZCBhYmFuZG9uZWQpXCIsICgpID0+IHtcclxuXHRcdC8vIFRoZSAnLScgbWFya2VyIGlzIHVzZWQgZm9yIGJvdGg6XHJcblx0XHQvLyAxLiBQYXVzZWQgdGFza3MgKHRlbXBvcmFyeSBzdGF0ZSB3aGlsZSB0aW1lciBpcyBwYXVzZWQpXHJcblx0XHQvLyAyLiBBYmFuZG9uZWQvY2FuY2VsbGVkIHRhc2tzIChwZXJtYW5lbnQgc3RhdGUpXHJcblx0XHRcclxuXHRcdGNvbnN0IHBhdXNlZFRhc2tTdGF0dXMgPSBcIi1cIjtcclxuXHRcdGNvbnN0IGFiYW5kb25lZFRhc2tTdGF0dXMgPSBcIi1cIjtcclxuXHRcdFxyXG5cdFx0Y29uc3QgcGF1c2VkVHlwZSA9IGdldFN0YXR1c1R5cGUocGF1c2VkVGFza1N0YXR1cywgbW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pO1xyXG5cdFx0Y29uc3QgYWJhbmRvbmVkVHlwZSA9IGdldFN0YXR1c1R5cGUoYWJhbmRvbmVkVGFza1N0YXR1cywgbW9ja1BsdWdpbiBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pO1xyXG5cdFx0XHJcblx0XHQvLyBCb3RoIHJlc29sdmUgdG8gdGhlIHNhbWUgdHlwZVxyXG5cdFx0ZXhwZWN0KHBhdXNlZFR5cGUpLnRvQmUoXCJhYmFuZG9uZWRcIik7XHJcblx0XHRleHBlY3QoYWJhbmRvbmVkVHlwZSkudG9CZShcImFiYW5kb25lZFwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gVGhpcyBhbWJpZ3VpdHkgY2F1c2VzIGF1dG9EYXRlTWFuYWdlciB0byB0cmVhdCBwYXVzZWQgdGFza3MgYXMgYWJhbmRvbmVkXHJcblx0XHQvLyBhbmQgaW5zZXJ0IGEgY2FuY2VsbGVkIGRhdGUsIHdoaWNoIG1heSBub3QgYmUgZGVzaXJlZCBmb3IgdGVtcG9yYXJ5IHBhdXNlc1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBkZW1vbnN0cmF0ZSB0aGUgc3BlY2lmaWMgdXNlciBzY2VuYXJpb1wiLCAoKSA9PiB7XHJcblx0XHQvLyBVc2VyJ3MgZXhhY3Qgc2NlbmFyaW9cclxuXHRcdGNvbnN0IHRhc2tCZWZvcmVQYXVzZSA9IFwiLSBbL10g5Lqk5rWB5Lqk5bqVIPCfmoAgMjAyNS0wNy0zMCBbc3RhZ2U6OmRpc2Nsb3N1cmVfY29tbXVuaWNhdGlvbl0g8J+bqyAyMDI1LTA0LTIwIF50aW1lci0xNjE5NDAtNDc3NVwiO1xyXG5cdFx0Y29uc3QgdGFza0FmdGVyUGF1c2UgPSBcIi0gWy1dIOS6pOa1geS6pOW6lSDwn5qAIDIwMjUtMDctMzAgW3N0YWdlOjpkaXNjbG9zdXJlX2NvbW11bmljYXRpb25dIPCfm6sgMjAyNS0wNC0yMCBedGltZXItMTYxOTQwLTQ3NzVcIjtcclxuXHRcdFxyXG5cdFx0Ly8gU3RhdHVzIGNoYW5nZSBmcm9tICcvJyB0byAnLSdcclxuXHRcdGNvbnN0IG9wZXJhdGlvbnMgPSBkZXRlcm1pbmVEYXRlT3BlcmF0aW9ucyhcclxuXHRcdFx0XCIvXCIsXHJcblx0XHRcdFwiLVwiLFxyXG5cdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0dGFza0FmdGVyUGF1c2VcclxuXHRcdCk7XHJcblx0XHRcclxuXHRcdC8vIEF1dG9EYXRlTWFuYWdlciB3aWxsIGFkZCBhIGNhbmNlbGxlZCBkYXRlXHJcblx0XHRleHBlY3Qob3BlcmF0aW9ucykudG9Db250YWluRXF1YWwoe1xyXG5cdFx0XHR0eXBlOiBcImFkZFwiLFxyXG5cdFx0XHRkYXRlVHlwZTogXCJjYW5jZWxsZWRcIixcclxuXHRcdFx0Zm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHQvLyBFeHBlY3RlZCByZXN1bHQgYWZ0ZXIgYXV0b0RhdGVNYW5hZ2VyIHByb2Nlc3NlcyBpdDpcclxuXHRcdC8vIFRoZSBjYW5jZWxsZWQgZGF0ZSAo4p2MIDIwMjUtMDctMzEpIHdvdWxkIGJlIGluc2VydGVkXHJcblx0XHRjb25zdCBleHBlY3RlZFJlc3VsdCA9IFwiLSBbLV0g5Lqk5rWB5Lqk5bqVIPCfmoAgMjAyNS0wNy0zMCBbc3RhZ2U6OmRpc2Nsb3N1cmVfY29tbXVuaWNhdGlvbl0g8J+bqyAyMDI1LTA0LTIwIOKdjCAyMDI1LTA3LTMxIF50aW1lci0xNjE5NDAtNDc3NVwiO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIlRhc2sgYmVmb3JlIHBhdXNlOlwiLCB0YXNrQmVmb3JlUGF1c2UpO1xyXG5cdFx0Y29uc29sZS5sb2coXCJUYXNrIGFmdGVyIHBhdXNlOlwiLCB0YXNrQWZ0ZXJQYXVzZSk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkV4cGVjdGVkIHdpdGggZGF0ZTpcIiwgZXhwZWN0ZWRSZXN1bHQpO1xyXG5cdH0pO1xyXG5cclxuXHRpdChcInNob3VsZCBzdWdnZXN0IHNvbHV0aW9ucyBmb3IgdGhlIGNvbmZsaWN0XCIsICgpID0+IHtcclxuXHRcdC8vIFBvdGVudGlhbCBzb2x1dGlvbnM6XHJcblx0XHRcclxuXHRcdC8vIFNvbHV0aW9uIDE6IENoZWNrIGZvciB0aW1lci1zcGVjaWZpYyBhbm5vdGF0aW9uc1xyXG5cdFx0Y29uc3QgaXNUaW1lck9wZXJhdGlvbiA9IChhbm5vdGF0aW9uOiBzdHJpbmcpID0+IHtcclxuXHRcdFx0cmV0dXJuIGFubm90YXRpb24gPT09IFwidGFza1RpbWVyXCIgfHwgYW5ub3RhdGlvbi5pbmNsdWRlcyhcInRpbWVyXCIpO1xyXG5cdFx0fTtcclxuXHRcdFxyXG5cdFx0Ly8gU29sdXRpb24gMjogVXNlIGRpZmZlcmVudCBzdGF0dXMgbWFya2VycyBmb3IgcGF1c2UgdnMgYWJhbmRvbmVkXHJcblx0XHRjb25zdCBhbHRlcm5hdGl2ZVN0YXR1c2VzID0ge1xyXG5cdFx0XHRwYXVzZWQ6IFwicFwiLCAgICAgIC8vIE5ldyBtYXJrZXIgc3BlY2lmaWNhbGx5IGZvciBwYXVzZWRcclxuXHRcdFx0YWJhbmRvbmVkOiBcIl9cIiwgICAvLyBLZWVwIF8gZm9yIHRydWx5IGFiYW5kb25lZCB0YXNrc1xyXG5cdFx0XHRpblByb2dyZXNzOiBcIi9cIixcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdC8vIFNvbHV0aW9uIDM6IEFkZCBjb25maWd1cmF0aW9uIHRvIHNraXAgZGF0ZSBtYW5hZ2VtZW50IGZvciB0aW1lciBvcGVyYXRpb25zXHJcblx0XHRjb25zdCBza2lwRGF0ZU1hbmFnZW1lbnRGb3JUaW1lcnMgPSB0cnVlO1xyXG5cdFx0XHJcblx0XHQvLyBTb2x1dGlvbiA0OiBDaGVjayBmb3IgdGltZXItcmVsYXRlZCBibG9jayByZWZlcmVuY2VzXHJcblx0XHRjb25zdCBoYXNUaW1lckJsb2NrUmVmID0gKHRleHQ6IHN0cmluZykgPT4ge1xyXG5cdFx0XHRyZXR1cm4gL1xcXnRpbWVyLVxcZCsvLnRlc3QodGV4dCk7XHJcblx0XHR9O1xyXG5cdFx0XHJcblx0XHRleHBlY3QoaXNUaW1lck9wZXJhdGlvbihcInRhc2tUaW1lclwiKSkudG9CZSh0cnVlKTtcclxuXHRcdGV4cGVjdChoYXNUaW1lckJsb2NrUmVmKFwiXnRpbWVyLTEyM1wiKSkudG9CZSh0cnVlKTtcclxuXHR9KTtcclxufSk7Il19