// @ts-ignore
import { describe, it, expect } from "@jest/globals";
import { findMetadataInsertPosition, } from "../editor-extensions/date-time/date-manager";
describe("autoDateManager - Research: Why cancelled date goes to end", () => {
    it("should trace execution path for cancelled date insertion", () => {
        // Create plugin with 🚀 as configured emoji
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
        // Test case 1: User's exact line with 🛫 (not configured)
        const lineText = "- [-] 交流交底 🚀 2025-07-30 [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775";
        console.log("\n=== RESEARCH: Cancelled Date Insertion Logic ===");
        console.log("Line text:", lineText);
        console.log("Configured start emoji: 🚀");
        console.log("Actual start emoji in text: 🛫");
        // Create a version without common emoji support for comparison
        const oldPlugin = {
            settings: Object.assign(Object.assign({}, mockPlugin.settings), { autoDateManager: Object.assign(Object.assign({}, mockPlugin.settings.autoDateManager), { startDateMarker: "🚀" }) }),
        };
        // Test with old logic (before fix)
        console.log("\n--- Without common emoji support ---");
        // This would fail to find 🛫 and insert at the end
        // Test with new logic (after fix)
        console.log("\n--- With common emoji support ---");
        const position = findMetadataInsertPosition(lineText, mockPlugin, "cancelled");
        console.log("Calculated position:", position);
        console.log("Text before position:", lineText.substring(0, position));
        console.log("Text after position:", lineText.substring(position));
        // Analyze what happens at each step
        console.log("\n=== Step-by-step analysis ===");
        // Step 1: Extract block reference
        const blockRefMatch = lineText.match(/\s*\^[\w-]+\s*$/);
        if (blockRefMatch) {
            console.log("1. Block reference found:", blockRefMatch[0]);
            console.log("   Block ref starts at:", lineText.length - blockRefMatch[0].length);
        }
        // Step 2: Look for start date with configured emoji
        const configuredPattern = /🚀\s*\d{4}-\d{2}-\d{2}/;
        const configuredMatch = lineText.match(configuredPattern);
        console.log("2. Configured emoji (🚀) match:", configuredMatch ? configuredMatch[0] : "NOT FOUND");
        // Step 3: Look for start date with 🛫
        const actualPattern = /🛫\s*\d{4}-\d{2}-\d{2}/;
        const actualMatch = lineText.match(actualPattern);
        console.log("3. Actual emoji (🛫) match:", actualMatch ? actualMatch[0] : "NOT FOUND");
        // Step 4: What happens when start date is not found
        if (!configuredMatch) {
            console.log("4. Since configured emoji not found in expected position:");
            console.log("   - Code falls back to finding end of all metadata");
            console.log("   - This could lead to position at end of line (before block ref)");
        }
        // The code now correctly finds 🚀 2025-07-30 as a start date (even though config says 🚀)
        // So cancelled date will be inserted after that, not after 🛫
        // This is actually correct behavior - if there are multiple start dates, use the first one
        expect(lineText.substring(position)).toBe(" [stage::disclosure_communication] 🛫 2025-04-20 ^timer-161940-4775");
    });
    it("should analyze metadata detection patterns", () => {
        const testCases = [
            {
                name: "Simple task with 🛫",
                text: "- [ ] Task 🛫 2025-01-20 ^block-id",
                expectedAfter: " ^block-id"
            },
            {
                name: "Task with multiple emojis",
                text: "- [ ] Task 📅 2025-01-15 🛫 2025-01-20 ^block-id",
                expectedAfter: " ^block-id"
            },
            {
                name: "Task with dataview and 🛫",
                text: "- [ ] Task [due::2025-01-25] 🛫 2025-01-20 ^block-id",
                expectedAfter: " ^block-id"
            }
        ];
        const mockPlugin = {
            settings: {
                autoDateManager: {
                    enabled: true,
                    startDateMarker: "🚀",
                    completedDateMarker: "✅",
                    cancelledDateMarker: "❌",
                },
                preferMetadataFormat: "emoji",
            },
        };
        console.log("\n=== Metadata Detection Analysis ===");
        testCases.forEach(testCase => {
            console.log(`\nTest: ${testCase.name}`);
            console.log(`Text: ${testCase.text}`);
            const position = findMetadataInsertPosition(testCase.text, mockPlugin, "cancelled");
            const actualAfter = testCase.text.substring(position);
            console.log(`Position: ${position}`);
            console.log(`Text after: "${actualAfter}"`);
            console.log(`Expected after: "${testCase.expectedAfter}"`);
            console.log(`Match: ${actualAfter === testCase.expectedAfter ? "✓" : "✗"}`);
            expect(actualAfter).toBe(testCase.expectedAfter);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b0RhdGVNYW5hZ2VyLnJlc2VhcmNoLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhdXRvRGF0ZU1hbmFnZXIucmVzZWFyY2gudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxhQUFhO0FBQ2IsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JELE9BQU8sRUFDTiwwQkFBMEIsR0FDMUIsTUFBTSw2Q0FBNkMsQ0FBQztBQUdyRCxRQUFRLENBQUMsNERBQTRELEVBQUUsR0FBRyxFQUFFO0lBQzNFLEVBQUUsQ0FBQywwREFBMEQsRUFBRSxHQUFHLEVBQUU7UUFDbkUsNENBQTRDO1FBQzVDLE1BQU0sVUFBVSxHQUFtQztZQUNsRCxRQUFRLEVBQUU7Z0JBQ1QsZUFBZSxFQUFFO29CQUNoQixPQUFPLEVBQUUsSUFBSTtvQkFDYixlQUFlLEVBQUUsSUFBSTtvQkFDckIsbUJBQW1CLEVBQUUsSUFBSTtvQkFDekIsbUJBQW1CLEVBQUUsSUFBSTtvQkFDekIsZUFBZSxFQUFFLFlBQVk7b0JBQzdCLG1CQUFtQixFQUFFLFlBQVk7b0JBQ2pDLG1CQUFtQixFQUFFLFlBQVk7b0JBQ2pDLGVBQWUsRUFBRSxJQUFJO29CQUNyQixtQkFBbUIsRUFBRSxHQUFHO29CQUN4QixtQkFBbUIsRUFBRSxHQUFHO2lCQUN4QjtnQkFDRCxvQkFBb0IsRUFBRSxPQUFPO2dCQUM3QixZQUFZLEVBQUU7b0JBQ2IsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLFVBQVUsRUFBRSxLQUFLO29CQUNqQixTQUFTLEVBQUUsR0FBRztvQkFDZCxPQUFPLEVBQUUsR0FBRztvQkFDWixVQUFVLEVBQUUsR0FBRztpQkFDZjthQUNEO1NBQ21DLENBQUM7UUFFdEMsMERBQTBEO1FBQzFELE1BQU0sUUFBUSxHQUFHLDZGQUE2RixDQUFDO1FBRS9HLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0RBQW9ELENBQUMsQ0FBQztRQUNs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Q0FBQyxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLFFBQVEsQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxXQUFXLEtBQUssUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRTVFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIEB0cy1pZ25vcmVcclxuaW1wb3J0IHsgZGVzY3JpYmUsIGl0LCBleHBlY3QgfSBmcm9tIFwiQGplc3QvZ2xvYmFsc1wiO1xyXG5pbXBvcnQge1xyXG5cdGZpbmRNZXRhZGF0YUluc2VydFBvc2l0aW9uLFxyXG59IGZyb20gXCIuLi9lZGl0b3ItZXh0ZW5zaW9ucy9kYXRlLXRpbWUvZGF0ZS1tYW5hZ2VyXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIi4uL2luZGV4XCI7XHJcblxyXG5kZXNjcmliZShcImF1dG9EYXRlTWFuYWdlciAtIFJlc2VhcmNoOiBXaHkgY2FuY2VsbGVkIGRhdGUgZ29lcyB0byBlbmRcIiwgKCkgPT4ge1xyXG5cdGl0KFwic2hvdWxkIHRyYWNlIGV4ZWN1dGlvbiBwYXRoIGZvciBjYW5jZWxsZWQgZGF0ZSBpbnNlcnRpb25cIiwgKCkgPT4ge1xyXG5cdFx0Ly8gQ3JlYXRlIHBsdWdpbiB3aXRoIPCfmoAgYXMgY29uZmlndXJlZCBlbW9qaVxyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbjogUGFydGlhbDxUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4+ID0ge1xyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdG1hbmFnZVN0YXJ0RGF0ZTogdHJ1ZSxcclxuXHRcdFx0XHRcdG1hbmFnZUNvbXBsZXRlZERhdGU6IHRydWUsXHJcblx0XHRcdFx0XHRtYW5hZ2VDYW5jZWxsZWREYXRlOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlRm9ybWF0OiBcIllZWVktTU0tRERcIixcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGVGb3JtYXQ6IFwiWVlZWS1NTS1ERFwiLFxyXG5cdFx0XHRcdFx0Y2FuY2VsbGVkRGF0ZUZvcm1hdDogXCJZWVlZLU1NLUREXCIsXHJcblx0XHRcdFx0XHRzdGFydERhdGVNYXJrZXI6IFwi8J+agFwiLCAvLyBDb25maWd1cmVkIGVtb2ppXHJcblx0XHRcdFx0XHRjb21wbGV0ZWREYXRlTWFya2VyOiBcIuKchVwiLFxyXG5cdFx0XHRcdFx0Y2FuY2VsbGVkRGF0ZU1hcmtlcjogXCLinYxcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHByZWZlck1ldGFkYXRhRm9ybWF0OiBcImVtb2ppXCIsXHJcblx0XHRcdFx0dGFza1N0YXR1c2VzOiB7XHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IFwieHxYXCIsXHJcblx0XHRcdFx0XHRpblByb2dyZXNzOiBcIi98LVwiLFxyXG5cdFx0XHRcdFx0YWJhbmRvbmVkOiBcIl9cIixcclxuXHRcdFx0XHRcdHBsYW5uZWQ6IFwiIVwiLFxyXG5cdFx0XHRcdFx0bm90U3RhcnRlZDogXCIgXCIsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdFx0Ly8gVGVzdCBjYXNlIDE6IFVzZXIncyBleGFjdCBsaW5lIHdpdGgg8J+bqyAobm90IGNvbmZpZ3VyZWQpXHJcblx0XHRjb25zdCBsaW5lVGV4dCA9IFwiLSBbLV0g5Lqk5rWB5Lqk5bqVIPCfmoAgMjAyNS0wNy0zMCBbc3RhZ2U6OmRpc2Nsb3N1cmVfY29tbXVuaWNhdGlvbl0g8J+bqyAyMDI1LTA0LTIwIF50aW1lci0xNjE5NDAtNDc3NVwiO1xyXG5cdFx0XHJcblx0XHRjb25zb2xlLmxvZyhcIlxcbj09PSBSRVNFQVJDSDogQ2FuY2VsbGVkIERhdGUgSW5zZXJ0aW9uIExvZ2ljID09PVwiKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiTGluZSB0ZXh0OlwiLCBsaW5lVGV4dCk7XHJcblx0XHRjb25zb2xlLmxvZyhcIkNvbmZpZ3VyZWQgc3RhcnQgZW1vamk6IPCfmoBcIik7XHJcblx0XHRjb25zb2xlLmxvZyhcIkFjdHVhbCBzdGFydCBlbW9qaSBpbiB0ZXh0OiDwn5urXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBDcmVhdGUgYSB2ZXJzaW9uIHdpdGhvdXQgY29tbW9uIGVtb2ppIHN1cHBvcnQgZm9yIGNvbXBhcmlzb25cclxuXHRcdGNvbnN0IG9sZFBsdWdpbjogUGFydGlhbDxUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4+ID0ge1xyXG5cdFx0XHRzZXR0aW5nczoge1xyXG5cdFx0XHRcdC4uLm1vY2tQbHVnaW4uc2V0dGluZ3MhLFxyXG5cdFx0XHRcdGF1dG9EYXRlTWFuYWdlcjoge1xyXG5cdFx0XHRcdFx0Li4ubW9ja1BsdWdpbi5zZXR0aW5ncyEuYXV0b0RhdGVNYW5hZ2VyISxcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZU1hcmtlcjogXCLwn5qAXCIsIC8vIE9ubHkgbG9va3MgZm9yIHRoaXNcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0fSBhcyB1bmtub3duIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbjtcclxuXHJcblx0XHQvLyBUZXN0IHdpdGggb2xkIGxvZ2ljIChiZWZvcmUgZml4KVxyXG5cdFx0Y29uc29sZS5sb2coXCJcXG4tLS0gV2l0aG91dCBjb21tb24gZW1vamkgc3VwcG9ydCAtLS1cIik7XHJcblx0XHQvLyBUaGlzIHdvdWxkIGZhaWwgdG8gZmluZCDwn5urIGFuZCBpbnNlcnQgYXQgdGhlIGVuZFxyXG5cdFx0XHJcblx0XHQvLyBUZXN0IHdpdGggbmV3IGxvZ2ljIChhZnRlciBmaXgpXHJcblx0XHRjb25zb2xlLmxvZyhcIlxcbi0tLSBXaXRoIGNvbW1vbiBlbW9qaSBzdXBwb3J0IC0tLVwiKTtcclxuXHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdGxpbmVUZXh0LFxyXG5cdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XCJjYW5jZWxsZWRcIlxyXG5cdFx0KTtcclxuXHRcdFxyXG5cdFx0Y29uc29sZS5sb2coXCJDYWxjdWxhdGVkIHBvc2l0aW9uOlwiLCBwb3NpdGlvbik7XHJcblx0XHRjb25zb2xlLmxvZyhcIlRleHQgYmVmb3JlIHBvc2l0aW9uOlwiLCBsaW5lVGV4dC5zdWJzdHJpbmcoMCwgcG9zaXRpb24pKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiVGV4dCBhZnRlciBwb3NpdGlvbjpcIiwgbGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSk7XHJcblx0XHRcclxuXHRcdC8vIEFuYWx5emUgd2hhdCBoYXBwZW5zIGF0IGVhY2ggc3RlcFxyXG5cdFx0Y29uc29sZS5sb2coXCJcXG49PT0gU3RlcC1ieS1zdGVwIGFuYWx5c2lzID09PVwiKTtcclxuXHRcdFxyXG5cdFx0Ly8gU3RlcCAxOiBFeHRyYWN0IGJsb2NrIHJlZmVyZW5jZVxyXG5cdFx0Y29uc3QgYmxvY2tSZWZNYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKC9cXHMqXFxeW1xcdy1dK1xccyokLyk7XHJcblx0XHRpZiAoYmxvY2tSZWZNYXRjaCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIjEuIEJsb2NrIHJlZmVyZW5jZSBmb3VuZDpcIiwgYmxvY2tSZWZNYXRjaFswXSk7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiICAgQmxvY2sgcmVmIHN0YXJ0cyBhdDpcIiwgbGluZVRleHQubGVuZ3RoIC0gYmxvY2tSZWZNYXRjaFswXS5sZW5ndGgpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDI6IExvb2sgZm9yIHN0YXJ0IGRhdGUgd2l0aCBjb25maWd1cmVkIGVtb2ppXHJcblx0XHRjb25zdCBjb25maWd1cmVkUGF0dGVybiA9IC/wn5qAXFxzKlxcZHs0fS1cXGR7Mn0tXFxkezJ9LztcclxuXHRcdGNvbnN0IGNvbmZpZ3VyZWRNYXRjaCA9IGxpbmVUZXh0Lm1hdGNoKGNvbmZpZ3VyZWRQYXR0ZXJuKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiMi4gQ29uZmlndXJlZCBlbW9qaSAo8J+agCkgbWF0Y2g6XCIsIGNvbmZpZ3VyZWRNYXRjaCA/IGNvbmZpZ3VyZWRNYXRjaFswXSA6IFwiTk9UIEZPVU5EXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDM6IExvb2sgZm9yIHN0YXJ0IGRhdGUgd2l0aCDwn5urXHJcblx0XHRjb25zdCBhY3R1YWxQYXR0ZXJuID0gL/Cfm6tcXHMqXFxkezR9LVxcZHsyfS1cXGR7Mn0vO1xyXG5cdFx0Y29uc3QgYWN0dWFsTWF0Y2ggPSBsaW5lVGV4dC5tYXRjaChhY3R1YWxQYXR0ZXJuKTtcclxuXHRcdGNvbnNvbGUubG9nKFwiMy4gQWN0dWFsIGVtb2ppICjwn5urKSBtYXRjaDpcIiwgYWN0dWFsTWF0Y2ggPyBhY3R1YWxNYXRjaFswXSA6IFwiTk9UIEZPVU5EXCIpO1xyXG5cdFx0XHJcblx0XHQvLyBTdGVwIDQ6IFdoYXQgaGFwcGVucyB3aGVuIHN0YXJ0IGRhdGUgaXMgbm90IGZvdW5kXHJcblx0XHRpZiAoIWNvbmZpZ3VyZWRNYXRjaCkge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhcIjQuIFNpbmNlIGNvbmZpZ3VyZWQgZW1vamkgbm90IGZvdW5kIGluIGV4cGVjdGVkIHBvc2l0aW9uOlwiKTtcclxuXHRcdFx0Y29uc29sZS5sb2coXCIgICAtIENvZGUgZmFsbHMgYmFjayB0byBmaW5kaW5nIGVuZCBvZiBhbGwgbWV0YWRhdGFcIik7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiICAgLSBUaGlzIGNvdWxkIGxlYWQgdG8gcG9zaXRpb24gYXQgZW5kIG9mIGxpbmUgKGJlZm9yZSBibG9jayByZWYpXCIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBUaGUgY29kZSBub3cgY29ycmVjdGx5IGZpbmRzIPCfmoAgMjAyNS0wNy0zMCBhcyBhIHN0YXJ0IGRhdGUgKGV2ZW4gdGhvdWdoIGNvbmZpZyBzYXlzIPCfmoApXHJcblx0XHQvLyBTbyBjYW5jZWxsZWQgZGF0ZSB3aWxsIGJlIGluc2VydGVkIGFmdGVyIHRoYXQsIG5vdCBhZnRlciDwn5urXHJcblx0XHQvLyBUaGlzIGlzIGFjdHVhbGx5IGNvcnJlY3QgYmVoYXZpb3IgLSBpZiB0aGVyZSBhcmUgbXVsdGlwbGUgc3RhcnQgZGF0ZXMsIHVzZSB0aGUgZmlyc3Qgb25lXHJcblx0XHRleHBlY3QobGluZVRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKSkudG9CZShcIiBbc3RhZ2U6OmRpc2Nsb3N1cmVfY29tbXVuaWNhdGlvbl0g8J+bqyAyMDI1LTA0LTIwIF50aW1lci0xNjE5NDAtNDc3NVwiKTtcclxuXHR9KTtcclxuXHRcclxuXHRpdChcInNob3VsZCBhbmFseXplIG1ldGFkYXRhIGRldGVjdGlvbiBwYXR0ZXJuc1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdHtcclxuXHRcdFx0XHRuYW1lOiBcIlNpbXBsZSB0YXNrIHdpdGgg8J+bq1wiLFxyXG5cdFx0XHRcdHRleHQ6IFwiLSBbIF0gVGFzayDwn5urIDIwMjUtMDEtMjAgXmJsb2NrLWlkXCIsXHJcblx0XHRcdFx0ZXhwZWN0ZWRBZnRlcjogXCIgXmJsb2NrLWlkXCJcclxuXHRcdFx0fSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdG5hbWU6IFwiVGFzayB3aXRoIG11bHRpcGxlIGVtb2ppc1wiLCBcclxuXHRcdFx0XHR0ZXh0OiBcIi0gWyBdIFRhc2sg8J+ThSAyMDI1LTAxLTE1IPCfm6sgMjAyNS0wMS0yMCBeYmxvY2staWRcIixcclxuXHRcdFx0XHRleHBlY3RlZEFmdGVyOiBcIiBeYmxvY2staWRcIlxyXG5cdFx0XHR9LFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0bmFtZTogXCJUYXNrIHdpdGggZGF0YXZpZXcgYW5kIPCfm6tcIixcclxuXHRcdFx0XHR0ZXh0OiBcIi0gWyBdIFRhc2sgW2R1ZTo6MjAyNS0wMS0yNV0g8J+bqyAyMDI1LTAxLTIwIF5ibG9jay1pZFwiLCBcclxuXHRcdFx0XHRleHBlY3RlZEFmdGVyOiBcIiBeYmxvY2staWRcIlxyXG5cdFx0XHR9XHJcblx0XHRdO1xyXG5cdFx0XHJcblx0XHRjb25zdCBtb2NrUGx1Z2luOiBQYXJ0aWFsPFRhc2tQcm9ncmVzc0JhclBsdWdpbj4gPSB7XHJcblx0XHRcdHNldHRpbmdzOiB7XHJcblx0XHRcdFx0YXV0b0RhdGVNYW5hZ2VyOiB7XHJcblx0XHRcdFx0XHRlbmFibGVkOiB0cnVlLFxyXG5cdFx0XHRcdFx0c3RhcnREYXRlTWFya2VyOiBcIvCfmoBcIiwgLy8gRGlmZmVyZW50IGZyb20gdGVzdCBlbW9qaXNcclxuXHRcdFx0XHRcdGNvbXBsZXRlZERhdGVNYXJrZXI6IFwi4pyFXCIsXHJcblx0XHRcdFx0XHRjYW5jZWxsZWREYXRlTWFya2VyOiBcIuKdjFwiLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0cHJlZmVyTWV0YWRhdGFGb3JtYXQ6IFwiZW1vamlcIixcclxuXHRcdFx0fSxcclxuXHRcdH0gYXMgdW5rbm93biBhcyBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0XHRcclxuXHRcdGNvbnNvbGUubG9nKFwiXFxuPT09IE1ldGFkYXRhIERldGVjdGlvbiBBbmFseXNpcyA9PT1cIik7XHJcblx0XHRcclxuXHRcdHRlc3RDYXNlcy5mb3JFYWNoKHRlc3RDYXNlID0+IHtcclxuXHRcdFx0Y29uc29sZS5sb2coYFxcblRlc3Q6ICR7dGVzdENhc2UubmFtZX1gKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFRleHQ6ICR7dGVzdENhc2UudGV4dH1gKTtcclxuXHRcdFx0XHJcblx0XHRcdGNvbnN0IHBvc2l0aW9uID0gZmluZE1ldGFkYXRhSW5zZXJ0UG9zaXRpb24oXHJcblx0XHRcdFx0dGVzdENhc2UudGV4dCxcclxuXHRcdFx0XHRtb2NrUGx1Z2luIGFzIFRhc2tQcm9ncmVzc0JhclBsdWdpbixcclxuXHRcdFx0XHRcImNhbmNlbGxlZFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCBhY3R1YWxBZnRlciA9IHRlc3RDYXNlLnRleHQuc3Vic3RyaW5nKHBvc2l0aW9uKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFBvc2l0aW9uOiAke3Bvc2l0aW9ufWApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgVGV4dCBhZnRlcjogXCIke2FjdHVhbEFmdGVyfVwiYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBFeHBlY3RlZCBhZnRlcjogXCIke3Rlc3RDYXNlLmV4cGVjdGVkQWZ0ZXJ9XCJgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYE1hdGNoOiAke2FjdHVhbEFmdGVyID09PSB0ZXN0Q2FzZS5leHBlY3RlZEFmdGVyID8gXCLinJNcIiA6IFwi4pyXXCJ9YCk7XHJcblx0XHRcdFxyXG5cdFx0XHRleHBlY3QoYWN0dWFsQWZ0ZXIpLnRvQmUodGVzdENhc2UuZXhwZWN0ZWRBZnRlcik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19