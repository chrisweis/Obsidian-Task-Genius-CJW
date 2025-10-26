import { findParentWorkflow } from "../editor-extensions/workflow/workflow-handler";
// Create a mock Text object for testing
function createMockDoc(lines) {
    const mockDoc = {
        lines: lines.length,
        line: (lineNum) => {
            const lineIndex = lineNum - 1; // Convert to 0-indexed
            if (lineIndex < 0 || lineIndex >= lines.length) {
                throw new Error(`Line ${lineNum} out of bounds`);
            }
            return {
                number: lineNum,
                from: 0,
                to: lines[lineIndex].length,
                text: lines[lineIndex],
            };
        },
    };
    return mockDoc;
}
describe("findParentWorkflow", () => {
    test("should find workflow when project info is on first line with same indentation", () => {
        const lines = [
            "#workflow/development",
            "- [ ] Task 1 [stage::planning]",
            "- [ ] Task 2 [stage::development]",
        ];
        const doc = createMockDoc(lines);
        const result = findParentWorkflow(doc, 2); // Looking for parent of line 2
        expect(result).toBe("development");
    });
    test("should find workflow when project info is on parent line with less indentation", () => {
        const lines = [
            "# Project",
            "  #workflow/development",
            "  - [ ] Task 1 [stage::planning]",
            "    - [ ] Subtask [stage::development]",
        ];
        const doc = createMockDoc(lines);
        const result = findParentWorkflow(doc, 4); // Looking for parent of line 4 (subtask)
        expect(result).toBe("development");
    });
    test("should find workflow when project info is on same indentation level but above", () => {
        const lines = [
            "#workflow/development",
            "",
            "- [ ] Task 1 [stage::planning]",
            "- [ ] Task 2 [stage::development]",
        ];
        const doc = createMockDoc(lines);
        const result = findParentWorkflow(doc, 3); // Looking for parent of line 3
        expect(result).toBe("development");
    });
    test("should return null when no parent workflow is found", () => {
        const lines = [
            "# Project",
            "- [ ] Task 1 [stage::planning]",
            "- [ ] Task 2 [stage::development]",
        ];
        const doc = createMockDoc(lines);
        const result = findParentWorkflow(doc, 2); // Looking for parent of line 2
        expect(result).toBeNull();
    });
    test("should not find workflow with greater indentation", () => {
        const lines = [
            "- [ ] Task 1",
            "  #workflow/development",
            "- [ ] Task 2 [stage::planning]",
        ];
        const doc = createMockDoc(lines);
        const result = findParentWorkflow(doc, 3); // Looking for parent of line 3
        expect(result).toBeNull();
    });
    test("should handle invalid line numbers", () => {
        const lines = [
            "#workflow/development",
            "- [ ] Task 1 [stage::planning]",
        ];
        const doc = createMockDoc(lines);
        const result1 = findParentWorkflow(doc, 0); // Invalid line number
        const result2 = findParentWorkflow(doc, -1); // Invalid line number
        expect(result1).toBeNull();
        expect(result2).toBeNull();
    });
    test("should find closest parent workflow when multiple exist", () => {
        const lines = [
            "#workflow/project1",
            "  #workflow/project2",
            "  - [ ] Task 1 [stage::planning]",
            "    - [ ] Subtask [stage::development]",
        ];
        const doc = createMockDoc(lines);
        const result = findParentWorkflow(doc, 4); // Looking for parent of line 4 (subtask)
        expect(result).toBe("project2"); // Should find the closest parent
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFBhcmVudFdvcmtmbG93LnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaW5kUGFyZW50V29ya2Zsb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUVwRix3Q0FBd0M7QUFDeEMsU0FBUyxhQUFhLENBQUMsS0FBZTtJQUNyQyxNQUFNLE9BQU8sR0FBRztRQUNmLEtBQUssRUFBRSxLQUFLLENBQUMsTUFBTTtRQUNuQixJQUFJLEVBQUUsQ0FBQyxPQUFlLEVBQUUsRUFBRTtZQUN6QixNQUFNLFNBQVMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1lBQ3RELElBQUksU0FBUyxHQUFHLENBQUMsSUFBSSxTQUFTLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRTtnQkFDL0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLE9BQU8sZ0JBQWdCLENBQUMsQ0FBQzthQUNqRDtZQUNELE9BQU87Z0JBQ04sTUFBTSxFQUFFLE9BQU87Z0JBQ2YsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsRUFBRSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNO2dCQUMzQixJQUFJLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQzthQUN0QixDQUFDO1FBQ0gsQ0FBQztLQUNPLENBQUM7SUFFVixPQUFPLE9BQU8sQ0FBQztBQUNoQixDQUFDO0FBRUQsUUFBUSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNuQyxJQUFJLENBQUMsK0VBQStFLEVBQUUsR0FBRyxFQUFFO1FBQzFGLE1BQU0sS0FBSyxHQUFHO1lBQ2IsdUJBQXVCO1lBQ3ZCLGdDQUFnQztZQUNoQyxtQ0FBbUM7U0FDbkMsQ0FBQztRQUVGLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLEVB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d0M7U0FDeEMsQ0FBQztRQUVGLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVqQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5Q0FBeUM7UUFFcEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGlDQUFpQztJQUNuRSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGV4dCB9IGZyb20gXCJAY29kZW1pcnJvci9zdGF0ZVwiO1xyXG5pbXBvcnQgeyBmaW5kUGFyZW50V29ya2Zsb3cgfSBmcm9tIFwiLi4vZWRpdG9yLWV4dGVuc2lvbnMvd29ya2Zsb3cvd29ya2Zsb3ctaGFuZGxlclwiO1xyXG5cclxuLy8gQ3JlYXRlIGEgbW9jayBUZXh0IG9iamVjdCBmb3IgdGVzdGluZ1xyXG5mdW5jdGlvbiBjcmVhdGVNb2NrRG9jKGxpbmVzOiBzdHJpbmdbXSk6IFRleHQge1xyXG5cdGNvbnN0IG1vY2tEb2MgPSB7XHJcblx0XHRsaW5lczogbGluZXMubGVuZ3RoLFxyXG5cdFx0bGluZTogKGxpbmVOdW06IG51bWJlcikgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lSW5kZXggPSBsaW5lTnVtIC0gMTsgLy8gQ29udmVydCB0byAwLWluZGV4ZWRcclxuXHRcdFx0aWYgKGxpbmVJbmRleCA8IDAgfHwgbGluZUluZGV4ID49IGxpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcihgTGluZSAke2xpbmVOdW19IG91dCBvZiBib3VuZHNgKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdG51bWJlcjogbGluZU51bSxcclxuXHRcdFx0XHRmcm9tOiAwLCAvLyBTaW1wbGlmaWVkIGZvciB0ZXN0aW5nXHJcblx0XHRcdFx0dG86IGxpbmVzW2xpbmVJbmRleF0ubGVuZ3RoLFxyXG5cdFx0XHRcdHRleHQ6IGxpbmVzW2xpbmVJbmRleF0sXHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cdH0gYXMgVGV4dDtcclxuXHJcblx0cmV0dXJuIG1vY2tEb2M7XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiZmluZFBhcmVudFdvcmtmbG93XCIsICgpID0+IHtcclxuXHR0ZXN0KFwic2hvdWxkIGZpbmQgd29ya2Zsb3cgd2hlbiBwcm9qZWN0IGluZm8gaXMgb24gZmlyc3QgbGluZSB3aXRoIHNhbWUgaW5kZW50YXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbGluZXMgPSBbXHJcblx0XHRcdFwiI3dvcmtmbG93L2RldmVsb3BtZW50XCIsXHJcblx0XHRcdFwiLSBbIF0gVGFzayAxIFtzdGFnZTo6cGxhbm5pbmddXCIsXHJcblx0XHRcdFwiLSBbIF0gVGFzayAyIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tEb2MobGluZXMpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGZpbmRQYXJlbnRXb3JrZmxvdyhkb2MsIDIpOyAvLyBMb29raW5nIGZvciBwYXJlbnQgb2YgbGluZSAyXHJcblxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZShcImRldmVsb3BtZW50XCIpO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIGZpbmQgd29ya2Zsb3cgd2hlbiBwcm9qZWN0IGluZm8gaXMgb24gcGFyZW50IGxpbmUgd2l0aCBsZXNzIGluZGVudGF0aW9uXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IGxpbmVzID0gW1xyXG5cdFx0XHRcIiMgUHJvamVjdFwiLFxyXG5cdFx0XHRcIiAgI3dvcmtmbG93L2RldmVsb3BtZW50XCIsXHJcblx0XHRcdFwiICAtIFsgXSBUYXNrIDEgW3N0YWdlOjpwbGFubmluZ11cIixcclxuXHRcdFx0XCIgICAgLSBbIF0gU3VidGFzayBbc3RhZ2U6OmRldmVsb3BtZW50XVwiLFxyXG5cdFx0XTtcclxuXHJcblx0XHRjb25zdCBkb2MgPSBjcmVhdGVNb2NrRG9jKGxpbmVzKTtcclxuXHJcblx0XHRjb25zdCByZXN1bHQgPSBmaW5kUGFyZW50V29ya2Zsb3coZG9jLCA0KTsgLy8gTG9va2luZyBmb3IgcGFyZW50IG9mIGxpbmUgNCAoc3VidGFzaylcclxuXHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblx0fSk7XHJcblxyXG5cdHRlc3QoXCJzaG91bGQgZmluZCB3b3JrZmxvdyB3aGVuIHByb2plY3QgaW5mbyBpcyBvbiBzYW1lIGluZGVudGF0aW9uIGxldmVsIGJ1dCBhYm92ZVwiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBsaW5lcyA9IFtcclxuXHRcdFx0XCIjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XCJcIixcclxuXHRcdFx0XCItIFsgXSBUYXNrIDEgW3N0YWdlOjpwbGFubmluZ11cIixcclxuXHRcdFx0XCItIFsgXSBUYXNrIDIgW3N0YWdlOjpkZXZlbG9wbWVudF1cIixcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja0RvYyhsaW5lcyk7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gZmluZFBhcmVudFdvcmtmbG93KGRvYywgMyk7IC8vIExvb2tpbmcgZm9yIHBhcmVudCBvZiBsaW5lIDNcclxuXHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlKFwiZGV2ZWxvcG1lbnRcIik7XHJcblx0fSk7XHJcblxyXG5cdHRlc3QoXCJzaG91bGQgcmV0dXJuIG51bGwgd2hlbiBubyBwYXJlbnQgd29ya2Zsb3cgaXMgZm91bmRcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbGluZXMgPSBbXHJcblx0XHRcdFwiIyBQcm9qZWN0XCIsXHJcblx0XHRcdFwiLSBbIF0gVGFzayAxIFtzdGFnZTo6cGxhbm5pbmddXCIsXHJcblx0XHRcdFwiLSBbIF0gVGFzayAyIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tEb2MobGluZXMpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGZpbmRQYXJlbnRXb3JrZmxvdyhkb2MsIDIpOyAvLyBMb29raW5nIGZvciBwYXJlbnQgb2YgbGluZSAyXHJcblxyXG5cdFx0ZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuXHR9KTtcclxuXHJcblx0dGVzdChcInNob3VsZCBub3QgZmluZCB3b3JrZmxvdyB3aXRoIGdyZWF0ZXIgaW5kZW50YXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbGluZXMgPSBbXHJcblx0XHRcdFwiLSBbIF0gVGFzayAxXCIsXHJcblx0XHRcdFwiICAjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XCItIFsgXSBUYXNrIDIgW3N0YWdlOjpwbGFubmluZ11cIixcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja0RvYyhsaW5lcyk7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gZmluZFBhcmVudFdvcmtmbG93KGRvYywgMyk7IC8vIExvb2tpbmcgZm9yIHBhcmVudCBvZiBsaW5lIDNcclxuXHJcblx0XHRleHBlY3QocmVzdWx0KS50b0JlTnVsbCgpO1xyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBpbnZhbGlkIGxpbmUgbnVtYmVyc1wiLCAoKSA9PiB7XHJcblx0XHRjb25zdCBsaW5lcyA9IFtcclxuXHRcdFx0XCIjd29ya2Zsb3cvZGV2ZWxvcG1lbnRcIixcclxuXHRcdFx0XCItIFsgXSBUYXNrIDEgW3N0YWdlOjpwbGFubmluZ11cIixcclxuXHRcdF07XHJcblxyXG5cdFx0Y29uc3QgZG9jID0gY3JlYXRlTW9ja0RvYyhsaW5lcyk7XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0MSA9IGZpbmRQYXJlbnRXb3JrZmxvdyhkb2MsIDApOyAvLyBJbnZhbGlkIGxpbmUgbnVtYmVyXHJcblx0XHRjb25zdCByZXN1bHQyID0gZmluZFBhcmVudFdvcmtmbG93KGRvYywgLTEpOyAvLyBJbnZhbGlkIGxpbmUgbnVtYmVyXHJcblxyXG5cdFx0ZXhwZWN0KHJlc3VsdDEpLnRvQmVOdWxsKCk7XHJcblx0XHRleHBlY3QocmVzdWx0MikudG9CZU51bGwoKTtcclxuXHR9KTtcclxuXHJcblx0dGVzdChcInNob3VsZCBmaW5kIGNsb3Nlc3QgcGFyZW50IHdvcmtmbG93IHdoZW4gbXVsdGlwbGUgZXhpc3RcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbGluZXMgPSBbXHJcblx0XHRcdFwiI3dvcmtmbG93L3Byb2plY3QxXCIsXHJcblx0XHRcdFwiICAjd29ya2Zsb3cvcHJvamVjdDJcIixcclxuXHRcdFx0XCIgIC0gWyBdIFRhc2sgMSBbc3RhZ2U6OnBsYW5uaW5nXVwiLFxyXG5cdFx0XHRcIiAgICAtIFsgXSBTdWJ0YXNrIFtzdGFnZTo6ZGV2ZWxvcG1lbnRdXCIsXHJcblx0XHRdO1xyXG5cclxuXHRcdGNvbnN0IGRvYyA9IGNyZWF0ZU1vY2tEb2MobGluZXMpO1xyXG5cclxuXHRcdGNvbnN0IHJlc3VsdCA9IGZpbmRQYXJlbnRXb3JrZmxvdyhkb2MsIDQpOyAvLyBMb29raW5nIGZvciBwYXJlbnQgb2YgbGluZSA0IChzdWJ0YXNrKVxyXG5cclxuXHRcdGV4cGVjdChyZXN1bHQpLnRvQmUoXCJwcm9qZWN0MlwiKTsgLy8gU2hvdWxkIGZpbmQgdGhlIGNsb3Nlc3QgcGFyZW50XHJcblx0fSk7XHJcbn0pO1xyXG4iXX0=