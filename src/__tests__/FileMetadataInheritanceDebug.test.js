/**
 * Debug File Metadata Inheritance
 */
import { MarkdownTaskParser } from "../dataflow/core/ConfigurableTaskParser";
import { getConfig } from "../common/task-parser-config";
import { createMockPlugin } from "./mockUtils";
import { DEFAULT_SETTINGS } from "../common/setting-definition";
describe("Debug File Metadata Inheritance", () => {
    test("should debug inheritance process", () => {
        var _a, _b, _c, _d, _e, _f;
        const mockPlugin = createMockPlugin(Object.assign(Object.assign({}, DEFAULT_SETTINGS), { fileMetadataInheritance: {
                enabled: true,
                inheritFromFrontmatter: true,
                inheritFromFrontmatterForSubtasks: false,
            } }));
        const config = getConfig("tasks", mockPlugin);
        console.log("Config fileMetadataInheritance:", config.fileMetadataInheritance);
        const parser = new MarkdownTaskParser(config);
        const content = "- [ ] Test task";
        const fileMetadata = {
            priority: "high",
            testField: "testValue",
        };
        const tasks = parser.parseLegacy(content, "test.md", fileMetadata);
        // 检查 priority 字段在任务中是否正确继承
        const task = tasks[0];
        // 使用 throw error 来调试更详细的信息
        throw new Error(`Debug detailed info:
		Config enabled: ${(_a = config.fileMetadataInheritance) === null || _a === void 0 ? void 0 : _a.enabled}
		File metadata keys: ${Object.keys(fileMetadata).join(', ')}
		File metadata values: ${JSON.stringify(fileMetadata)}
		Task metadata keys: ${Object.keys((task === null || task === void 0 ? void 0 : task.metadata) || {}).join(', ')}
		Task metadata: ${JSON.stringify(task === null || task === void 0 ? void 0 : task.metadata)}
		Task priority: ${(_b = task === null || task === void 0 ? void 0 : task.metadata) === null || _b === void 0 ? void 0 : _b.priority} (type: ${typeof ((_c = task === null || task === void 0 ? void 0 : task.metadata) === null || _c === void 0 ? void 0 : _c.priority)})
		Task testField: ${(_d = task === null || task === void 0 ? void 0 : task.metadata) === null || _d === void 0 ? void 0 : _d.testField} (exists: ${'testField' in ((task === null || task === void 0 ? void 0 : task.metadata) || {})})
		Priority inherited: ${((_e = task === null || task === void 0 ? void 0 : task.metadata) === null || _e === void 0 ? void 0 : _e.priority) === 4}
		TestField inherited: ${((_f = task === null || task === void 0 ? void 0 : task.metadata) === null || _f === void 0 ? void 0 : _f.testField) === 'testValue'}`);
        expect(tasks).toHaveLength(1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2VEZWJ1Zy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRmlsZU1ldGFkYXRhSW5oZXJpdGFuY2VEZWJ1Zy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBRUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUMvQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUVoRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQ2hELElBQUksQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7O1FBQzdDLE1BQU0sVUFBVSxHQUFHLGdCQUFnQixpQ0FDL0IsZ0JBQWdCLEtBQ25CLHVCQUF1QixFQUFFO2dCQUN4QixPQUFPLEVBQUUsSUFBSTtnQkFDYixzQkFBc0IsRUFBRSxJQUFJO2dCQUM1QixpQ0FBaUMsRUFBRSxLQUFLO2FBQ3hDLElBQ0EsQ0FBQztRQUVILE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDOUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsRUFBRSxNQUFNLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUUvRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRTlDLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFDO1FBQ2xDLE1BQU0sWUFBWSxHQUFHO1lBQ3BCLFFBQVEsRUFBRSxNQUFNO1lBQ2hCLFNBQVMsRUFBRSxXQUFXO1NBQ3RCLENBQUM7UUFFRixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFbkUsMkJBQTJCO1FBQzNCLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV0QiwyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLEtBQUssQ0FBQztvQkFDRSxNQUFBLE1BQU0sQ0FBQyx1QkFBdUIsMENBQUUsT0FBTzt3QkFDbkMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDOzBCQUNsQyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQzt3QkFDOUIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxRQUFRLEtBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQzttQkFDakQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsUUFBUSxDQUFDO21CQUM5QixNQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxRQUFRLDBDQUFFLFFBQVEsV0FBVyxPQUFPLENBQUEsTUFBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsUUFBUSwwQ0FBRSxRQUFRLENBQUE7b0JBQ2pFLE1BQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFFBQVEsMENBQUUsU0FBUyxhQUFhLFdBQVcsSUFBSSxDQUFDLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFFBQVEsS0FBSSxFQUFFLENBQUM7d0JBQ3ZFLENBQUEsTUFBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsUUFBUSwwQ0FBRSxRQUFRLE1BQUssQ0FBQzt5QkFDN0IsQ0FBQSxNQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxRQUFRLDBDQUFFLFNBQVMsTUFBSyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRXBFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBEZWJ1ZyBGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTWFya2Rvd25UYXNrUGFyc2VyIH0gZnJvbSBcIi4uL2RhdGFmbG93L2NvcmUvQ29uZmlndXJhYmxlVGFza1BhcnNlclwiO1xyXG5pbXBvcnQgeyBnZXRDb25maWcgfSBmcm9tIFwiLi4vY29tbW9uL3Rhc2stcGFyc2VyLWNvbmZpZ1wiO1xyXG5pbXBvcnQgeyBjcmVhdGVNb2NrUGx1Z2luIH0gZnJvbSBcIi4vbW9ja1V0aWxzXCI7XHJcbmltcG9ydCB7IERFRkFVTFRfU0VUVElOR1MgfSBmcm9tIFwiLi4vY29tbW9uL3NldHRpbmctZGVmaW5pdGlvblwiO1xyXG5cclxuZGVzY3JpYmUoXCJEZWJ1ZyBGaWxlIE1ldGFkYXRhIEluaGVyaXRhbmNlXCIsICgpID0+IHtcclxuXHR0ZXN0KFwic2hvdWxkIGRlYnVnIGluaGVyaXRhbmNlIHByb2Nlc3NcIiwgKCkgPT4ge1xyXG5cdFx0Y29uc3QgbW9ja1BsdWdpbiA9IGNyZWF0ZU1vY2tQbHVnaW4oe1xyXG5cdFx0XHQuLi5ERUZBVUxUX1NFVFRJTkdTLFxyXG5cdFx0XHRmaWxlTWV0YWRhdGFJbmhlcml0YW5jZToge1xyXG5cdFx0XHRcdGVuYWJsZWQ6IHRydWUsXHJcblx0XHRcdFx0aW5oZXJpdEZyb21Gcm9udG1hdHRlcjogdHJ1ZSxcclxuXHRcdFx0XHRpbmhlcml0RnJvbUZyb250bWF0dGVyRm9yU3VidGFza3M6IGZhbHNlLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Y29uc3QgY29uZmlnID0gZ2V0Q29uZmlnKFwidGFza3NcIiwgbW9ja1BsdWdpbik7XHJcblx0XHRjb25zb2xlLmxvZyhcIkNvbmZpZyBmaWxlTWV0YWRhdGFJbmhlcml0YW5jZTpcIiwgY29uZmlnLmZpbGVNZXRhZGF0YUluaGVyaXRhbmNlKTtcclxuXHJcblx0XHRjb25zdCBwYXJzZXIgPSBuZXcgTWFya2Rvd25UYXNrUGFyc2VyKGNvbmZpZyk7XHJcblxyXG5cdFx0Y29uc3QgY29udGVudCA9IFwiLSBbIF0gVGVzdCB0YXNrXCI7XHJcblx0XHRjb25zdCBmaWxlTWV0YWRhdGEgPSB7XHJcblx0XHRcdHByaW9yaXR5OiBcImhpZ2hcIixcclxuXHRcdFx0dGVzdEZpZWxkOiBcInRlc3RWYWx1ZVwiLFxyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCB0YXNrcyA9IHBhcnNlci5wYXJzZUxlZ2FjeShjb250ZW50LCBcInRlc3QubWRcIiwgZmlsZU1ldGFkYXRhKTtcclxuXHJcblx0XHQvLyDmo4Dmn6UgcHJpb3JpdHkg5a2X5q615Zyo5Lu75Yqh5Lit5piv5ZCm5q2j56Gu57un5om/XHJcblx0XHRjb25zdCB0YXNrID0gdGFza3NbMF07XHJcblx0XHRcclxuXHRcdC8vIOS9v+eUqCB0aHJvdyBlcnJvciDmnaXosIPor5Xmm7Tor6bnu4bnmoTkv6Hmga9cclxuXHRcdHRocm93IG5ldyBFcnJvcihgRGVidWcgZGV0YWlsZWQgaW5mbzpcclxuXHRcdENvbmZpZyBlbmFibGVkOiAke2NvbmZpZy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZT8uZW5hYmxlZH1cclxuXHRcdEZpbGUgbWV0YWRhdGEga2V5czogJHtPYmplY3Qua2V5cyhmaWxlTWV0YWRhdGEpLmpvaW4oJywgJyl9XHJcblx0XHRGaWxlIG1ldGFkYXRhIHZhbHVlczogJHtKU09OLnN0cmluZ2lmeShmaWxlTWV0YWRhdGEpfVxyXG5cdFx0VGFzayBtZXRhZGF0YSBrZXlzOiAke09iamVjdC5rZXlzKHRhc2s/Lm1ldGFkYXRhIHx8IHt9KS5qb2luKCcsICcpfVxyXG5cdFx0VGFzayBtZXRhZGF0YTogJHtKU09OLnN0cmluZ2lmeSh0YXNrPy5tZXRhZGF0YSl9XHJcblx0XHRUYXNrIHByaW9yaXR5OiAke3Rhc2s/Lm1ldGFkYXRhPy5wcmlvcml0eX0gKHR5cGU6ICR7dHlwZW9mIHRhc2s/Lm1ldGFkYXRhPy5wcmlvcml0eX0pXHJcblx0XHRUYXNrIHRlc3RGaWVsZDogJHt0YXNrPy5tZXRhZGF0YT8udGVzdEZpZWxkfSAoZXhpc3RzOiAkeyd0ZXN0RmllbGQnIGluICh0YXNrPy5tZXRhZGF0YSB8fCB7fSl9KVxyXG5cdFx0UHJpb3JpdHkgaW5oZXJpdGVkOiAke3Rhc2s/Lm1ldGFkYXRhPy5wcmlvcml0eSA9PT0gNH1cclxuXHRcdFRlc3RGaWVsZCBpbmhlcml0ZWQ6ICR7dGFzaz8ubWV0YWRhdGE/LnRlc3RGaWVsZCA9PT0gJ3Rlc3RWYWx1ZSd9YCk7XHJcblxyXG5cdFx0ZXhwZWN0KHRhc2tzKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0fSk7XHJcbn0pOyJdfQ==