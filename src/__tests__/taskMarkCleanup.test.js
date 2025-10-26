import { clearAllMarks } from "../components/ui/renderers/MarkdownRenderer";
describe("Task Mark Cleanup", () => {
    describe("clearAllMarks function", () => {
        test("should remove priority marks", () => {
            const input = "Complete this task ! ⏫";
            const expected = "Complete this task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should remove emoji priority marks", () => {
            const input = "Important task 🔺";
            const expected = "Important task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should remove letter priority marks", () => {
            const input = "High priority task [#A]";
            const expected = "High priority task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should remove date marks", () => {
            const input = "Task with date 📅 2024-01-15";
            const expected = "Task with date";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should remove multiple marks", () => {
            const input = "Complex task ! 📅 2024-01-15 ⏫ #tag";
            const expected = "Complex task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should preserve meaningful content", () => {
            const input = "Write documentation for the API";
            const expected = "Write documentation for the API";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle empty content", () => {
            const input = "";
            const expected = "";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle content with only marks", () => {
            const input = "! ⏫ 📅 2024-01-15";
            const expected = "";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should preserve links and code", () => {
            const input = "Check [[Important Note]] and `code snippet` ! ⏫";
            const expected = "Check [[Important Note]] and `code snippet`";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle mixed content", () => {
            const input = "Review [documentation](https://example.com) ! 📅 2024-01-15";
            const expected = "Review [documentation](https://example.com)";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should remove tilde date prefix marks", () => {
            const input = "Complete task ~ 2024-01-15";
            const expected = "Complete task 2024-01-15";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should remove target location marks", () => {
            const input = "Meeting target: office 📁";
            const expected = "Meeting office";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle complex example from user", () => {
            const input = "今天要过去吃饭 #123-123-123 ~ 📅 2025-07-18";
            const expected = "今天要过去吃饭 2025-07-18"; // #123-123-123 is a normal tag and should be removed
            expect(clearAllMarks(input)).toBe(expected);
        });
    });
    describe("Task line scenarios", () => {
        test("should handle task with priority mark in middle", () => {
            const input = "Complete this ! important task";
            const expected = "Complete this important task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle task with multiple priority marks", () => {
            const input = "Very ! important ⏫ task";
            const expected = "Very important task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle task with trailing marks", () => {
            const input = "Simple task !";
            const expected = "Simple task";
            expect(clearAllMarks(input)).toBe(expected);
        });
        test("should handle task with leading marks", () => {
            const input = "! Important task";
            const expected = "Important task";
            expect(clearAllMarks(input)).toBe(expected);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza01hcmtDbGVhbnVwLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0YXNrTWFya0NsZWFudXAudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFNUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7WUFDekMsTUFBTSxLQUFLLEdBQUcsd0JBQXdCLENBQUM7WUFDdkMsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUM7WUFDdEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7WUFDL0MsTUFBTSxLQUFLLEdBQUcsbUJBQW1CLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUM7WUFDbEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsTUFBTSxLQUFLLEdBQUcseUJBQXlCLENBQUM7WUFDeEMsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUM7WUFDdEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxLQUFLLEdBQUcsOEJBQThCLENBQUM7WUFD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Q0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY2xlYXJBbGxNYXJrcyB9IGZyb20gXCIuLi9jb21wb25lbnRzL3VpL3JlbmRlcmVycy9NYXJrZG93blJlbmRlcmVyXCI7XHJcblxyXG5kZXNjcmliZShcIlRhc2sgTWFyayBDbGVhbnVwXCIsICgpID0+IHtcclxuXHRkZXNjcmliZShcImNsZWFyQWxsTWFya3MgZnVuY3Rpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZW1vdmUgcHJpb3JpdHkgbWFya3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnB1dCA9IFwiQ29tcGxldGUgdGhpcyB0YXNrICEg4o+rXCI7XHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gXCJDb21wbGV0ZSB0aGlzIHRhc2tcIjtcclxuXHRcdFx0ZXhwZWN0KGNsZWFyQWxsTWFya3MoaW5wdXQpKS50b0JlKGV4cGVjdGVkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmVtb3ZlIGVtb2ppIHByaW9yaXR5IG1hcmtzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBcIkltcG9ydGFudCB0YXNrIPCflLpcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIkltcG9ydGFudCB0YXNrXCI7XHJcblx0XHRcdGV4cGVjdChjbGVhckFsbE1hcmtzKGlucHV0KSkudG9CZShleHBlY3RlZCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJlbW92ZSBsZXR0ZXIgcHJpb3JpdHkgbWFya3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnB1dCA9IFwiSGlnaCBwcmlvcml0eSB0YXNrIFsjQV1cIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIkhpZ2ggcHJpb3JpdHkgdGFza1wiO1xyXG5cdFx0XHRleHBlY3QoY2xlYXJBbGxNYXJrcyhpbnB1dCkpLnRvQmUoZXhwZWN0ZWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCByZW1vdmUgZGF0ZSBtYXJrc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID0gXCJUYXNrIHdpdGggZGF0ZSDwn5OFIDIwMjQtMDEtMTVcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIlRhc2sgd2l0aCBkYXRlXCI7XHJcblx0XHRcdGV4cGVjdChjbGVhckFsbE1hcmtzKGlucHV0KSkudG9CZShleHBlY3RlZCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJlbW92ZSBtdWx0aXBsZSBtYXJrc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID0gXCJDb21wbGV4IHRhc2sgISDwn5OFIDIwMjQtMDEtMTUg4o+rICN0YWdcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIkNvbXBsZXggdGFza1wiO1xyXG5cdFx0XHRleHBlY3QoY2xlYXJBbGxNYXJrcyhpbnB1dCkpLnRvQmUoZXhwZWN0ZWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBwcmVzZXJ2ZSBtZWFuaW5nZnVsIGNvbnRlbnRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnB1dCA9IFwiV3JpdGUgZG9jdW1lbnRhdGlvbiBmb3IgdGhlIEFQSVwiO1xyXG5cdFx0XHRjb25zdCBleHBlY3RlZCA9IFwiV3JpdGUgZG9jdW1lbnRhdGlvbiBmb3IgdGhlIEFQSVwiO1xyXG5cdFx0XHRleHBlY3QoY2xlYXJBbGxNYXJrcyhpbnB1dCkpLnRvQmUoZXhwZWN0ZWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZW1wdHkgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID0gXCJcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIlwiO1xyXG5cdFx0XHRleHBlY3QoY2xlYXJBbGxNYXJrcyhpbnB1dCkpLnRvQmUoZXhwZWN0ZWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgY29udGVudCB3aXRoIG9ubHkgbWFya3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnB1dCA9IFwiISDij6sg8J+ThSAyMDI0LTAxLTE1XCI7XHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gXCJcIjtcclxuXHRcdFx0ZXhwZWN0KGNsZWFyQWxsTWFya3MoaW5wdXQpKS50b0JlKGV4cGVjdGVkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcHJlc2VydmUgbGlua3MgYW5kIGNvZGVcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnB1dCA9IFwiQ2hlY2sgW1tJbXBvcnRhbnQgTm90ZV1dIGFuZCBgY29kZSBzbmlwcGV0YCAhIOKPq1wiO1xyXG5cdFx0XHRjb25zdCBleHBlY3RlZCA9IFwiQ2hlY2sgW1tJbXBvcnRhbnQgTm90ZV1dIGFuZCBgY29kZSBzbmlwcGV0YFwiO1xyXG5cdFx0XHRleHBlY3QoY2xlYXJBbGxNYXJrcyhpbnB1dCkpLnRvQmUoZXhwZWN0ZWQpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgbWl4ZWQgY29udGVudFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID1cclxuXHRcdFx0XHRcIlJldmlldyBbZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9leGFtcGxlLmNvbSkgISDwn5OFIDIwMjQtMDEtMTVcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIlJldmlldyBbZG9jdW1lbnRhdGlvbl0oaHR0cHM6Ly9leGFtcGxlLmNvbSlcIjtcclxuXHRcdFx0ZXhwZWN0KGNsZWFyQWxsTWFya3MoaW5wdXQpKS50b0JlKGV4cGVjdGVkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmVtb3ZlIHRpbGRlIGRhdGUgcHJlZml4IG1hcmtzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBcIkNvbXBsZXRlIHRhc2sgfiAyMDI0LTAxLTE1XCI7XHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gXCJDb21wbGV0ZSB0YXNrIDIwMjQtMDEtMTVcIjtcclxuXHRcdFx0ZXhwZWN0KGNsZWFyQWxsTWFya3MoaW5wdXQpKS50b0JlKGV4cGVjdGVkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcmVtb3ZlIHRhcmdldCBsb2NhdGlvbiBtYXJrc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID0gXCJNZWV0aW5nIHRhcmdldDogb2ZmaWNlIPCfk4FcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIk1lZXRpbmcgb2ZmaWNlXCI7XHJcblx0XHRcdGV4cGVjdChjbGVhckFsbE1hcmtzKGlucHV0KSkudG9CZShleHBlY3RlZCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBjb21wbGV4IGV4YW1wbGUgZnJvbSB1c2VyXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBcIuS7iuWkqeimgei/h+WOu+WQg+mlrSAjMTIzLTEyMy0xMjMgfiDwn5OFIDIwMjUtMDctMThcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIuS7iuWkqeimgei/h+WOu+WQg+mlrSAyMDI1LTA3LTE4XCI7IC8vICMxMjMtMTIzLTEyMyBpcyBhIG5vcm1hbCB0YWcgYW5kIHNob3VsZCBiZSByZW1vdmVkXHJcblx0XHRcdGV4cGVjdChjbGVhckFsbE1hcmtzKGlucHV0KSkudG9CZShleHBlY3RlZCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUYXNrIGxpbmUgc2NlbmFyaW9zXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRhc2sgd2l0aCBwcmlvcml0eSBtYXJrIGluIG1pZGRsZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID0gXCJDb21wbGV0ZSB0aGlzICEgaW1wb3J0YW50IHRhc2tcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIkNvbXBsZXRlIHRoaXMgaW1wb3J0YW50IHRhc2tcIjtcclxuXHRcdFx0ZXhwZWN0KGNsZWFyQWxsTWFya3MoaW5wdXQpKS50b0JlKGV4cGVjdGVkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRhc2sgd2l0aCBtdWx0aXBsZSBwcmlvcml0eSBtYXJrc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGlucHV0ID0gXCJWZXJ5ICEgaW1wb3J0YW50IOKPqyB0YXNrXCI7XHJcblx0XHRcdGNvbnN0IGV4cGVjdGVkID0gXCJWZXJ5IGltcG9ydGFudCB0YXNrXCI7XHJcblx0XHRcdGV4cGVjdChjbGVhckFsbE1hcmtzKGlucHV0KSkudG9CZShleHBlY3RlZCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSB0YXNrIHdpdGggdHJhaWxpbmcgbWFya3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBpbnB1dCA9IFwiU2ltcGxlIHRhc2sgIVwiO1xyXG5cdFx0XHRjb25zdCBleHBlY3RlZCA9IFwiU2ltcGxlIHRhc2tcIjtcclxuXHRcdFx0ZXhwZWN0KGNsZWFyQWxsTWFya3MoaW5wdXQpKS50b0JlKGV4cGVjdGVkKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRhc2sgd2l0aCBsZWFkaW5nIG1hcmtzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgaW5wdXQgPSBcIiEgSW1wb3J0YW50IHRhc2tcIjtcclxuXHRcdFx0Y29uc3QgZXhwZWN0ZWQgPSBcIkltcG9ydGFudCB0YXNrXCI7XHJcblx0XHRcdGV4cGVjdChjbGVhckFsbE1hcmtzKGlucHV0KSkudG9CZShleHBlY3RlZCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==