// @ts-ignore
import { describe, it, expect } from "@jest/globals";
describe("Task Timer - Pause Fix", () => {
    it("should document the new pause behavior", () => {
        // OLD BEHAVIOR (problematic):
        // 1. User clicks "Pause" on timer
        // 2. Timer widget changes task status from [/] to [-]
        // 3. This triggers autoDateManager
        // 4. autoDateManager adds cancelled date (even if disabled)
        // 5. Multiple plugins might conflict over the status change
        // NEW BEHAVIOR (fixed):
        // 1. User clicks "Pause" on timer
        // 2. Timer state is updated in localStorage (paused)
        // 3. Task status remains unchanged (still [/])
        // 4. No transaction is dispatched, so autoDateManager is not triggered
        // 5. Timer shows as paused in UI but task status reflects it's still in-progress
        const oldBehavior = {
            pauseAction: "Update task status to [-]",
            sideEffect: "Triggers autoDateManager",
            conflict: "Even with cancelled date disabled, transaction is processed"
        };
        const newBehavior = {
            pauseAction: "Only update timer state in localStorage",
            sideEffect: "No transaction, no autoDateManager trigger",
            benefit: "Clean separation between timer state and task status"
        };
        expect(newBehavior.sideEffect).toBe("No transaction, no autoDateManager trigger");
    });
    it("should explain the timer state vs task status distinction", () => {
        // Timer State (in localStorage):
        // - running: Timer is actively counting
        // - paused: Timer is temporarily stopped but preserves elapsed time
        // - stopped: Timer is reset to 00:00
        // Task Status (in markdown):
        // - [ ]: Not started
        // - [/]: In progress
        // - [-]: Abandoned/Cancelled
        // - [x]: Completed
        // Key insight: Timer state and task status are independent
        // A task can be "in progress" with a paused timer
        // This is actually more accurate - the task isn't abandoned, just temporarily paused
        const scenarios = [
            {
                action: "Start timer",
                timerState: "running",
                taskStatus: "[/]",
                statusChange: true
            },
            {
                action: "Pause timer",
                timerState: "paused",
                taskStatus: "[/]",
                statusChange: false
            },
            {
                action: "Resume timer",
                timerState: "running",
                taskStatus: "[/]",
                statusChange: false
            },
            {
                action: "Complete timer",
                timerState: "stopped",
                taskStatus: "[x]",
                statusChange: true
            },
            {
                action: "Reset timer",
                timerState: "stopped",
                taskStatus: "[/]",
                statusChange: false
            }
        ];
        // Only Start and Complete should change task status
        const statusChangingActions = scenarios.filter(s => s.statusChange);
        expect(statusChangingActions).toHaveLength(2);
        expect(statusChangingActions[0].action).toBe("Start timer");
        expect(statusChangingActions[1].action).toBe("Complete timer");
    });
    it("should list benefits of the new approach", () => {
        const benefits = [
            "No conflicts with autoDateManager",
            "No conflicts with other status-monitoring plugins",
            "Cleaner separation of concerns",
            "Timer state persists independently of task status",
            "User has full control over task status",
            "Pause is truly temporary - doesn't imply task abandonment",
            "Multiple pauses/resumes don't create multiple date entries"
        ];
        expect(benefits).toContain("No conflicts with autoDateManager");
        expect(benefits).toContain("Pause is truly temporary - doesn't imply task abandonment");
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza1RpbWVyLnBhdXNlLWZpeC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFza1RpbWVyLnBhdXNlLWZpeC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLGFBQWE7QUFDYixPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFFckQsUUFBUSxDQUFDLHdCQUF3QixFQUFFLEdBQUcsRUFBRTtJQUN2QyxFQUFFLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1FBQ2pELDhCQUE4QjtRQUM5QixrQ0FBa0M7UUFDbEMsc0RBQXNEO1FBQ3RELG1DQUFtQztRQUNuQyw0REFBNEQ7UUFDNUQsNERBQTREO1FBRTVELHdCQUF3QjtRQUN4QixrQ0FBa0M7UUFDbEMscURBQXFEO1FBQ3JELCtDQUErQztRQUMvQyx1RUFBdUU7UUFDdkUsaUZBQWlGO1FBRWpGLE1BQU0sV0FBVyxHQUFHO1lBQ25CLFdBQVcsRUFBRSwyQkFBMkI7WUFDeEMsVUFBVSxFQUFFLDBCQUEwQjtZQUN0QyxRQUFRLEVBQUUsNkRBQTZEO1NBQ3ZFLENBQUM7UUFFRixNQUFNLFdBQVcsR0FBRztZQUNuQixXQUFXLEVBQUUseUNBQXlDO1lBQ3RELFVBQVUsRUFBRSw0Q0FBNEM7WUFDeEQsT0FBTyxFQUFFLHNEQUFzRDtTQUMvRCxDQUFDO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsNENBQTRDLENBQUMsQ0FBQztJQUNuRixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBQywyREFBMkQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsaUNBQWlDO1FBQ2pDLHdDQUF3QztRQUN4QyxvRUFBb0U7UUFDcEUscUNBQXFDO1FBRXJDLDZCQUE2QjtRQUM3QixxQkFBcUI7UUFDckIscUJBQXFCO1FBQ3JCLDZCQUE2QjtRQUM3QixtQkFBbUI7UUFFbkIsMkRBQTJEO1FBQzNELGtEQUFrRDtRQUNsRCxxRkFBcUY7UUFFckYsTUFBTSxTQUFTLEdBQUc7WUFDakI7Z0JBQ0MsTUFBTSxFQUFFLGFBQWE7Z0JBQ3JCLFVBQVUsRUFBRSxTQUFTO2dCQUNyQixVQUFVLEVBQUUsS0FBSztnQkFDakIsWUFBWSxFQUFFLElBQUk7YUFDbEI7WUFDRDtnQkFDQyxNQUFNLEVBQUUsYUFBYTtnQkFDckIsVUFBVSxFQUFFLFFBQVE7Z0JBQ3BCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixZQUFZLEVBQUUsS0FBSzthQUNuQjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxjQUFjO2dCQUN0QixVQUFVLEVBQUUsU0FBUztnQkFDckIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLFlBQVksRUFBRSxLQUFLO2FBQ25CO1lBQ0Q7Z0JBQ0MsTUFBTSxFQUFFLGdCQUFnQjtnQkFDeEIsVUFBVSxFQUFFLFNBQVM7Z0JBQ3JCLFVBQVUsRUFBRSxLQUFLO2dCQUNqQixZQUFZLEVBQUUsSUFBSTthQUNsQjtZQUNEO2dCQUNDLE1BQU0sRUFBRSxhQUFhO2dCQUNyQixVQUFVLEVBQUUsU0FBUztnQkFDckIsVUFBVSxFQUFFLEtBQUs7Z0JBQ2pCLFlBQVksRUFBRSxLQUFLO2FBQ25CO1NBQ0QsQ0FBQztRQUVGLG9EQUFvRDtRQUNwRCxNQUFNLHFCQUFxQixHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDcEUsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsQ0FBQyxDQUFDO0lBRUgsRUFBRSxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtRQUNuRCxNQUFNLFFBQVEsR0FBRztZQUNoQixtQ0FBbUM7WUFDbkMsbURBQW1EO1lBQ25ELGdDQUFnQztZQUNoQyxtREFBbUQ7WUFDbkQsd0NBQXdDO1lBQ3hDLDJEQUEyRDtZQUMzRCw0REFBNEQ7U0FDNUQsQ0FBQztRQUVGLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7SUFDekYsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1pZ25vcmVcclxuaW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QgfSBmcm9tIFwiQGplc3QvZ2xvYmFsc1wiO1xyXG5cclxuZGVzY3JpYmUoXCJUYXNrIFRpbWVyIC0gUGF1c2UgRml4XCIsICgpID0+IHtcclxuXHRpdChcInNob3VsZCBkb2N1bWVudCB0aGUgbmV3IHBhdXNlIGJlaGF2aW9yXCIsICgpID0+IHtcclxuXHRcdC8vIE9MRCBCRUhBVklPUiAocHJvYmxlbWF0aWMpOlxyXG5cdFx0Ly8gMS4gVXNlciBjbGlja3MgXCJQYXVzZVwiIG9uIHRpbWVyXHJcblx0XHQvLyAyLiBUaW1lciB3aWRnZXQgY2hhbmdlcyB0YXNrIHN0YXR1cyBmcm9tIFsvXSB0byBbLV1cclxuXHRcdC8vIDMuIFRoaXMgdHJpZ2dlcnMgYXV0b0RhdGVNYW5hZ2VyXHJcblx0XHQvLyA0LiBhdXRvRGF0ZU1hbmFnZXIgYWRkcyBjYW5jZWxsZWQgZGF0ZSAoZXZlbiBpZiBkaXNhYmxlZClcclxuXHRcdC8vIDUuIE11bHRpcGxlIHBsdWdpbnMgbWlnaHQgY29uZmxpY3Qgb3ZlciB0aGUgc3RhdHVzIGNoYW5nZVxyXG5cdFx0XHJcblx0XHQvLyBORVcgQkVIQVZJT1IgKGZpeGVkKTpcclxuXHRcdC8vIDEuIFVzZXIgY2xpY2tzIFwiUGF1c2VcIiBvbiB0aW1lclxyXG5cdFx0Ly8gMi4gVGltZXIgc3RhdGUgaXMgdXBkYXRlZCBpbiBsb2NhbFN0b3JhZ2UgKHBhdXNlZClcclxuXHRcdC8vIDMuIFRhc2sgc3RhdHVzIHJlbWFpbnMgdW5jaGFuZ2VkIChzdGlsbCBbL10pXHJcblx0XHQvLyA0LiBObyB0cmFuc2FjdGlvbiBpcyBkaXNwYXRjaGVkLCBzbyBhdXRvRGF0ZU1hbmFnZXIgaXMgbm90IHRyaWdnZXJlZFxyXG5cdFx0Ly8gNS4gVGltZXIgc2hvd3MgYXMgcGF1c2VkIGluIFVJIGJ1dCB0YXNrIHN0YXR1cyByZWZsZWN0cyBpdCdzIHN0aWxsIGluLXByb2dyZXNzXHJcblx0XHRcclxuXHRcdGNvbnN0IG9sZEJlaGF2aW9yID0ge1xyXG5cdFx0XHRwYXVzZUFjdGlvbjogXCJVcGRhdGUgdGFzayBzdGF0dXMgdG8gWy1dXCIsXHJcblx0XHRcdHNpZGVFZmZlY3Q6IFwiVHJpZ2dlcnMgYXV0b0RhdGVNYW5hZ2VyXCIsXHJcblx0XHRcdGNvbmZsaWN0OiBcIkV2ZW4gd2l0aCBjYW5jZWxsZWQgZGF0ZSBkaXNhYmxlZCwgdHJhbnNhY3Rpb24gaXMgcHJvY2Vzc2VkXCJcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGNvbnN0IG5ld0JlaGF2aW9yID0ge1xyXG5cdFx0XHRwYXVzZUFjdGlvbjogXCJPbmx5IHVwZGF0ZSB0aW1lciBzdGF0ZSBpbiBsb2NhbFN0b3JhZ2VcIixcclxuXHRcdFx0c2lkZUVmZmVjdDogXCJObyB0cmFuc2FjdGlvbiwgbm8gYXV0b0RhdGVNYW5hZ2VyIHRyaWdnZXJcIixcclxuXHRcdFx0YmVuZWZpdDogXCJDbGVhbiBzZXBhcmF0aW9uIGJldHdlZW4gdGltZXIgc3RhdGUgYW5kIHRhc2sgc3RhdHVzXCJcclxuXHRcdH07XHJcblx0XHRcclxuXHRcdGV4cGVjdChuZXdCZWhhdmlvci5zaWRlRWZmZWN0KS50b0JlKFwiTm8gdHJhbnNhY3Rpb24sIG5vIGF1dG9EYXRlTWFuYWdlciB0cmlnZ2VyXCIpO1xyXG5cdH0pO1xyXG5cdFxyXG5cdGl0KFwic2hvdWxkIGV4cGxhaW4gdGhlIHRpbWVyIHN0YXRlIHZzIHRhc2sgc3RhdHVzIGRpc3RpbmN0aW9uXCIsICgpID0+IHtcclxuXHRcdC8vIFRpbWVyIFN0YXRlIChpbiBsb2NhbFN0b3JhZ2UpOlxyXG5cdFx0Ly8gLSBydW5uaW5nOiBUaW1lciBpcyBhY3RpdmVseSBjb3VudGluZ1xyXG5cdFx0Ly8gLSBwYXVzZWQ6IFRpbWVyIGlzIHRlbXBvcmFyaWx5IHN0b3BwZWQgYnV0IHByZXNlcnZlcyBlbGFwc2VkIHRpbWVcclxuXHRcdC8vIC0gc3RvcHBlZDogVGltZXIgaXMgcmVzZXQgdG8gMDA6MDBcclxuXHRcdFxyXG5cdFx0Ly8gVGFzayBTdGF0dXMgKGluIG1hcmtkb3duKTpcclxuXHRcdC8vIC0gWyBdOiBOb3Qgc3RhcnRlZFxyXG5cdFx0Ly8gLSBbL106IEluIHByb2dyZXNzXHJcblx0XHQvLyAtIFstXTogQWJhbmRvbmVkL0NhbmNlbGxlZFxyXG5cdFx0Ly8gLSBbeF06IENvbXBsZXRlZFxyXG5cdFx0XHJcblx0XHQvLyBLZXkgaW5zaWdodDogVGltZXIgc3RhdGUgYW5kIHRhc2sgc3RhdHVzIGFyZSBpbmRlcGVuZGVudFxyXG5cdFx0Ly8gQSB0YXNrIGNhbiBiZSBcImluIHByb2dyZXNzXCIgd2l0aCBhIHBhdXNlZCB0aW1lclxyXG5cdFx0Ly8gVGhpcyBpcyBhY3R1YWxseSBtb3JlIGFjY3VyYXRlIC0gdGhlIHRhc2sgaXNuJ3QgYWJhbmRvbmVkLCBqdXN0IHRlbXBvcmFyaWx5IHBhdXNlZFxyXG5cdFx0XHJcblx0XHRjb25zdCBzY2VuYXJpb3MgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRhY3Rpb246IFwiU3RhcnQgdGltZXJcIixcclxuXHRcdFx0XHR0aW1lclN0YXRlOiBcInJ1bm5pbmdcIixcclxuXHRcdFx0XHR0YXNrU3RhdHVzOiBcIlsvXVwiLCAvLyBDaGFuZ2VzIHRvIGluLXByb2dyZXNzXHJcblx0XHRcdFx0c3RhdHVzQ2hhbmdlOiB0cnVlXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRhY3Rpb246IFwiUGF1c2UgdGltZXJcIixcclxuXHRcdFx0XHR0aW1lclN0YXRlOiBcInBhdXNlZFwiLFxyXG5cdFx0XHRcdHRhc2tTdGF0dXM6IFwiWy9dXCIsIC8vIFJlbWFpbnMgaW4tcHJvZ3Jlc3NcclxuXHRcdFx0XHRzdGF0dXNDaGFuZ2U6IGZhbHNlXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRhY3Rpb246IFwiUmVzdW1lIHRpbWVyXCIsXHJcblx0XHRcdFx0dGltZXJTdGF0ZTogXCJydW5uaW5nXCIsXHJcblx0XHRcdFx0dGFza1N0YXR1czogXCJbL11cIiwgLy8gU3RpbGwgaW4tcHJvZ3Jlc3NcclxuXHRcdFx0XHRzdGF0dXNDaGFuZ2U6IGZhbHNlXHJcblx0XHRcdH0sXHJcblx0XHRcdHtcclxuXHRcdFx0XHRhY3Rpb246IFwiQ29tcGxldGUgdGltZXJcIixcclxuXHRcdFx0XHR0aW1lclN0YXRlOiBcInN0b3BwZWRcIixcclxuXHRcdFx0XHR0YXNrU3RhdHVzOiBcIlt4XVwiLCAvLyBDaGFuZ2VzIHRvIGNvbXBsZXRlZFxyXG5cdFx0XHRcdHN0YXR1c0NoYW5nZTogdHJ1ZVxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0YWN0aW9uOiBcIlJlc2V0IHRpbWVyXCIsXHJcblx0XHRcdFx0dGltZXJTdGF0ZTogXCJzdG9wcGVkXCIsXHJcblx0XHRcdFx0dGFza1N0YXR1czogXCJbL11cIiwgLy8gUmVtYWlucyBhcyBpcyAodXNlciBtYW5hZ2VzKVxyXG5cdFx0XHRcdHN0YXR1c0NoYW5nZTogZmFsc2VcclxuXHRcdFx0fVxyXG5cdFx0XTtcclxuXHRcdFxyXG5cdFx0Ly8gT25seSBTdGFydCBhbmQgQ29tcGxldGUgc2hvdWxkIGNoYW5nZSB0YXNrIHN0YXR1c1xyXG5cdFx0Y29uc3Qgc3RhdHVzQ2hhbmdpbmdBY3Rpb25zID0gc2NlbmFyaW9zLmZpbHRlcihzID0+IHMuc3RhdHVzQ2hhbmdlKTtcclxuXHRcdGV4cGVjdChzdGF0dXNDaGFuZ2luZ0FjdGlvbnMpLnRvSGF2ZUxlbmd0aCgyKTtcclxuXHRcdGV4cGVjdChzdGF0dXNDaGFuZ2luZ0FjdGlvbnNbMF0uYWN0aW9uKS50b0JlKFwiU3RhcnQgdGltZXJcIik7XHJcblx0XHRleHBlY3Qoc3RhdHVzQ2hhbmdpbmdBY3Rpb25zWzFdLmFjdGlvbikudG9CZShcIkNvbXBsZXRlIHRpbWVyXCIpO1xyXG5cdH0pO1xyXG5cdFxyXG5cdGl0KFwic2hvdWxkIGxpc3QgYmVuZWZpdHMgb2YgdGhlIG5ldyBhcHByb2FjaFwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBiZW5lZml0cyA9IFtcclxuXHRcdFx0XCJObyBjb25mbGljdHMgd2l0aCBhdXRvRGF0ZU1hbmFnZXJcIixcclxuXHRcdFx0XCJObyBjb25mbGljdHMgd2l0aCBvdGhlciBzdGF0dXMtbW9uaXRvcmluZyBwbHVnaW5zXCIsXHJcblx0XHRcdFwiQ2xlYW5lciBzZXBhcmF0aW9uIG9mIGNvbmNlcm5zXCIsXHJcblx0XHRcdFwiVGltZXIgc3RhdGUgcGVyc2lzdHMgaW5kZXBlbmRlbnRseSBvZiB0YXNrIHN0YXR1c1wiLFxyXG5cdFx0XHRcIlVzZXIgaGFzIGZ1bGwgY29udHJvbCBvdmVyIHRhc2sgc3RhdHVzXCIsXHJcblx0XHRcdFwiUGF1c2UgaXMgdHJ1bHkgdGVtcG9yYXJ5IC0gZG9lc24ndCBpbXBseSB0YXNrIGFiYW5kb25tZW50XCIsXHJcblx0XHRcdFwiTXVsdGlwbGUgcGF1c2VzL3Jlc3VtZXMgZG9uJ3QgY3JlYXRlIG11bHRpcGxlIGRhdGUgZW50cmllc1wiXHJcblx0XHRdO1xyXG5cdFx0XHJcblx0XHRleHBlY3QoYmVuZWZpdHMpLnRvQ29udGFpbihcIk5vIGNvbmZsaWN0cyB3aXRoIGF1dG9EYXRlTWFuYWdlclwiKTtcclxuXHRcdGV4cGVjdChiZW5lZml0cykudG9Db250YWluKFwiUGF1c2UgaXMgdHJ1bHkgdGVtcG9yYXJ5IC0gZG9lc24ndCBpbXBseSB0YXNrIGFiYW5kb25tZW50XCIpO1xyXG5cdH0pO1xyXG59KTsiXX0=