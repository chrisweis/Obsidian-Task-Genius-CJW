import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG, } from "../services/time-parsing-service";
describe("TimeParsingService", () => {
    let service;
    beforeEach(() => {
        service = new TimeParsingService(DEFAULT_TIME_PARSING_CONFIG);
    });
    describe("English Time Expressions", () => {
        test('should parse "tomorrow"', () => {
            const result = service.parseTimeExpressions("go to bed tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("tomorrow");
            expect(result.parsedExpressions[0].type).toBe("due");
            expect(result.dueDate).toBeDefined();
            expect(result.cleanedText).toBe("go to bed");
        });
        test('should parse "next week"', () => {
            const result = service.parseTimeExpressions("meeting next week");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("next week");
            expect(result.parsedExpressions[0].type).toBe("due");
            expect(result.dueDate).toBeDefined();
        });
        test('should parse "in 3 days"', () => {
            const result = service.parseTimeExpressions("finish project in 3 days");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("in 3 days");
            expect(result.dueDate).toBeDefined();
            // Check that the date is approximately 3 days from now
            const now = new Date();
            const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
            const parsedDate = result.dueDate;
            expect(Math.abs(parsedDate.getTime() - threeDaysLater.getTime())).toBeLessThan(24 * 60 * 60 * 1000);
        });
        test('should parse "by Friday"', () => {
            const result = service.parseTimeExpressions("submit report by Friday");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("Friday");
            expect(result.dueDate).toBeDefined();
        });
        test('should detect start date with "start" keyword', () => {
            const result = service.parseTimeExpressions("start project tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("start");
            expect(result.startDate).toBeDefined();
        });
        test('should detect scheduled date with "scheduled" keyword', () => {
            const result = service.parseTimeExpressions("meeting scheduled for tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("scheduled");
            expect(result.scheduledDate).toBeDefined();
        });
    });
    describe("Chinese Time Expressions", () => {
        test('should parse "明天"', () => {
            const result = service.parseTimeExpressions("明天开会");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("明天");
            expect(result.parsedExpressions[0].type).toBe("due");
            expect(result.dueDate).toBeDefined();
            expect(result.cleanedText).toBe("开会");
        });
        test('should parse "后天"', () => {
            const result = service.parseTimeExpressions("后天完成任务");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("后天");
            expect(result.dueDate).toBeDefined();
            // Check that the parsed date is 2 days from today
            const now = new Date();
            const parsedDate = result.dueDate;
            // Calculate the difference in days
            const diffInMs = parsedDate.getTime() - now.getTime();
            const diffInDays = Math.round(diffInMs / (24 * 60 * 60 * 1000));
            // Should be approximately 2 days from now (allow 1-2 days due to time of day)
            expect(diffInDays).toBeGreaterThanOrEqual(1);
            expect(diffInDays).toBeLessThanOrEqual(2);
        });
        test('should parse "3天后"', () => {
            const result = service.parseTimeExpressions("3天后提交报告");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("3天后");
            expect(result.dueDate).toBeDefined();
        });
        test('should parse "下周"', () => {
            const result = service.parseTimeExpressions("下周完成项目");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("下周");
            expect(result.dueDate).toBeDefined();
        });
        test('should parse "下周一"', () => {
            const result = service.parseTimeExpressions("下周一开会");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("下周一");
            expect(result.parsedExpressions[0].type).toBe("due");
            expect(result.dueDate).toBeDefined();
            expect(result.cleanedText).toBe("开会");
            // Check that the parsed date is a Monday and in the next week
            const parsedDate = result.dueDate;
            expect(parsedDate.getDay()).toBe(1); // Monday is day 1
            // Should be at least 1 day from now (next week)
            const now = new Date();
            expect(parsedDate.getTime()).toBeGreaterThan(now.getTime());
        });
        test('should parse "上周三"', () => {
            const result = service.parseTimeExpressions("上周三的会议");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("上周三");
            expect(result.dueDate).toBeDefined();
            // Check that the parsed date is a Wednesday and in the past week
            const parsedDate = result.dueDate;
            expect(parsedDate.getDay()).toBe(3); // Wednesday is day 3
            // Should be in the past (last week)
            const now = new Date();
            expect(parsedDate.getTime()).toBeLessThan(now.getTime());
        });
        test('should parse "这周五"', () => {
            const result = service.parseTimeExpressions("这周五截止");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("这周五");
            expect(result.dueDate).toBeDefined();
            // Check that the parsed date is a Friday
            const parsedDate = result.dueDate;
            expect(parsedDate.getDay()).toBe(5); // Friday is day 5
        });
        test('should parse "星期二"', () => {
            const result = service.parseTimeExpressions("星期二提交");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("星期二");
            expect(result.dueDate).toBeDefined();
            // Check that the parsed date is a Tuesday
            const parsedDate = result.dueDate;
            expect(parsedDate.getDay()).toBe(2); // Tuesday is day 2
        });
        test('should parse "周六"', () => {
            const result = service.parseTimeExpressions("周六休息");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("周六");
            expect(result.dueDate).toBeDefined();
            // Check that the parsed date is a Saturday
            const parsedDate = result.dueDate;
            expect(parsedDate.getDay()).toBe(6); // Saturday is day 6
        });
        test('should parse "礼拜天"', () => {
            const result = service.parseTimeExpressions("礼拜天聚会");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].text).toBe("礼拜天");
            expect(result.dueDate).toBeDefined();
            // Check that the parsed date is a Sunday
            const parsedDate = result.dueDate;
            expect(parsedDate.getDay()).toBe(0); // Sunday is day 0
        });
        test('should detect start date with Chinese "开始" keyword', () => {
            const result = service.parseTimeExpressions("开始项目明天");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("start");
            expect(result.startDate).toBeDefined();
        });
        test('should detect scheduled date with Chinese "安排" keyword', () => {
            const result = service.parseTimeExpressions("安排会议明天");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("scheduled");
            expect(result.scheduledDate).toBeDefined();
        });
    });
    describe("Text Cleaning", () => {
        test("should remove single time expression", () => {
            const result = service.parseTimeExpressions("go to bed tomorrow");
            expect(result.cleanedText).toBe("go to bed");
        });
        test("should remove multiple time expressions", () => {
            const result = service.parseTimeExpressions("start project tomorrow and finish by next week");
            // The exact cleaned text depends on chrono parsing, but it should remove time expressions
            expect(result.cleanedText).not.toContain("tomorrow");
            expect(result.cleanedText).not.toContain("next week");
        });
        test("should handle punctuation around time expressions", () => {
            const result = service.parseTimeExpressions("meeting, tomorrow, important");
            expect(result.cleanedText).toBe("meeting, important");
        });
        test("should preserve text when removeOriginalText is false", () => {
            const config = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { removeOriginalText: false });
            const serviceNoRemove = new TimeParsingService(config);
            const result = serviceNoRemove.parseTimeExpressions("go to bed tomorrow");
            expect(result.cleanedText).toBe("go to bed tomorrow");
        });
    });
    describe("Multiple Date Types", () => {
        test("should parse multiple different date types", () => {
            const result = service.parseTimeExpressions("start project tomorrow, due by next Friday, scheduled for next week");
            expect(result.parsedExpressions.length).toBeGreaterThan(1);
            // Should have different types of dates
            const types = result.parsedExpressions.map((expr) => expr.type);
            expect(new Set(types).size).toBeGreaterThan(1);
        });
    });
    describe("Edge Cases", () => {
        test("should handle empty text", () => {
            const result = service.parseTimeExpressions("");
            expect(result.parsedExpressions).toHaveLength(0);
            expect(result.cleanedText).toBe("");
            expect(result.startDate).toBeUndefined();
            expect(result.dueDate).toBeUndefined();
            expect(result.scheduledDate).toBeUndefined();
        });
        test("should handle text with no time expressions", () => {
            const result = service.parseTimeExpressions("just a regular task");
            expect(result.parsedExpressions).toHaveLength(0);
            expect(result.cleanedText).toBe("just a regular task");
        });
        test("should handle disabled service", () => {
            const config = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { enabled: false });
            const disabledService = new TimeParsingService(config);
            const result = disabledService.parseTimeExpressions("go to bed tomorrow");
            expect(result.parsedExpressions).toHaveLength(0);
            expect(result.cleanedText).toBe("go to bed tomorrow");
        });
    });
    describe("Configuration Updates", () => {
        test("should update configuration", () => {
            const newConfig = { enabled: false };
            service.updateConfig(newConfig);
            const config = service.getConfig();
            expect(config.enabled).toBe(false);
        });
        test("should preserve other config values when updating", () => {
            const originalConfig = service.getConfig();
            service.updateConfig({ enabled: false });
            const updatedConfig = service.getConfig();
            expect(updatedConfig.enabled).toBe(false);
            expect(updatedConfig.supportedLanguages).toEqual(originalConfig.supportedLanguages);
            expect(updatedConfig.dateKeywords).toEqual(originalConfig.dateKeywords);
        });
    });
    describe("Date Type Determination", () => {
        test("should default to due date when no keywords found", () => {
            const result = service.parseTimeExpressions("tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("due");
        });
        test("should prioritize start keywords", () => {
            const result = service.parseTimeExpressions("begin work tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("start");
        });
        test("should prioritize due keywords", () => {
            const result = service.parseTimeExpressions("deadline tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("due");
        });
        test("should prioritize scheduled keywords", () => {
            const result = service.parseTimeExpressions("scheduled tomorrow");
            expect(result.parsedExpressions).toHaveLength(1);
            expect(result.parsedExpressions[0].type).toBe("scheduled");
        });
    });
    describe("Per-Line Processing", () => {
        test("should parse single line correctly", () => {
            const result = service.parseTimeExpressionsForLine("task tomorrow");
            expect(result.originalLine).toBe("task tomorrow");
            expect(result.cleanedLine).toBe("task");
            expect(result.dueDate).toBeDefined();
            expect(result.parsedExpressions).toHaveLength(1);
        });
        test("should parse multiple lines independently", () => {
            const lines = [
                "task 1 tomorrow",
                "task 2 next week",
                "task 3 no date",
            ];
            const results = service.parseTimeExpressionsPerLine(lines);
            expect(results).toHaveLength(3);
            // First line
            expect(results[0].originalLine).toBe("task 1 tomorrow");
            expect(results[0].cleanedLine).toBe("task 1");
            expect(results[0].dueDate).toBeDefined();
            // Second line
            expect(results[1].originalLine).toBe("task 2 next week");
            expect(results[1].cleanedLine).toBe("task 2");
            expect(results[1].dueDate).toBeDefined();
            // Third line
            expect(results[2].originalLine).toBe("task 3 no date");
            expect(results[2].cleanedLine).toBe("task 3 no date");
            expect(results[2].dueDate).toBeUndefined();
        });
        test("should handle different date types per line", () => {
            const lines = [
                "start project tomorrow",
                "meeting scheduled for next week",
                "deadline by Friday",
            ];
            const results = service.parseTimeExpressionsPerLine(lines);
            expect(results).toHaveLength(3);
            expect(results[0].startDate).toBeDefined();
            expect(results[1].scheduledDate).toBeDefined();
            expect(results[2].dueDate).toBeDefined();
        });
        test("should preserve line structure in multiline content", () => {
            const content = "task 1 tomorrow\ntask 2 next week\ntask 3";
            const lines = content.split("\n");
            const results = service.parseTimeExpressionsPerLine(lines);
            expect(results).toHaveLength(3);
            // Verify each line is processed independently
            const cleanedLines = results.map((r) => r.cleanedLine);
            const reconstructed = cleanedLines.join("\n");
            expect(reconstructed).toBe("task 1\ntask 2\ntask 3");
        });
        test("should handle empty lines", () => {
            const lines = ["task tomorrow", "", "another task"];
            const results = service.parseTimeExpressionsPerLine(lines);
            expect(results).toHaveLength(3);
            expect(results[0].dueDate).toBeDefined();
            expect(results[1].dueDate).toBeUndefined();
            expect(results[1].cleanedLine).toBe("");
            expect(results[2].dueDate).toBeUndefined();
        });
        test("should handle Chinese time expressions per line", () => {
            const lines = ["任务1 明天", "任务2 下周", "任务3"];
            const results = service.parseTimeExpressionsPerLine(lines);
            expect(results).toHaveLength(3);
            expect(results[0].cleanedLine).toBe("任务1");
            expect(results[0].dueDate).toBeDefined();
            expect(results[1].cleanedLine).toBe("任务2");
            expect(results[1].dueDate).toBeDefined();
            expect(results[2].cleanedLine).toBe("任务3");
            expect(results[2].dueDate).toBeUndefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGltZVBhcnNpbmdTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJUaW1lUGFyc2luZ1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLDJCQUEyQixHQUUzQixNQUFNLGtDQUFrQyxDQUFDO0FBRTFDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDbkMsSUFBSSxPQUEyQixDQUFDO0lBRWhDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixPQUFPLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQy9ELENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUN6QyxJQUFJLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBRWxFLE1BQU0sQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDckQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNyQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwQkFBMEIsRUFB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QyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1lBQzVELE1BQU0sS0FBSyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxQyxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFM0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNoQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0MsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM1QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdFRpbWVQYXJzaW5nU2VydmljZSxcclxuXHRERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUcsXHJcblx0TGluZVBhcnNlUmVzdWx0LFxyXG59IGZyb20gXCIuLi9zZXJ2aWNlcy90aW1lLXBhcnNpbmctc2VydmljZVwiO1xyXG5cclxuZGVzY3JpYmUoXCJUaW1lUGFyc2luZ1NlcnZpY2VcIiwgKCkgPT4ge1xyXG5cdGxldCBzZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0c2VydmljZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2UoREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJFbmdsaXNoIFRpbWUgRXhwcmVzc2lvbnNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwidG9tb3Jyb3dcIicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcImdvIHRvIGJlZCB0b21vcnJvd1wiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwidG9tb3Jyb3dcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udHlwZSkudG9CZShcImR1ZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRUZXh0KS50b0JlKFwiZ28gdG8gYmVkXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwibmV4dCB3ZWVrXCInLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJtZWV0aW5nIG5leHQgd2Vla1wiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwibmV4dCB3ZWVrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdLnR5cGUpLnRvQmUoXCJkdWVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZHVlRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoJ3Nob3VsZCBwYXJzZSBcImluIDMgZGF5c1wiJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwiZmluaXNoIHByb2plY3QgaW4gMyBkYXlzXCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwiaW4gMyBkYXlzXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBkYXRlIGlzIGFwcHJveGltYXRlbHkgMyBkYXlzIGZyb20gbm93XHJcblx0XHRcdGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdGNvbnN0IHRocmVlRGF5c0xhdGVyID0gbmV3IERhdGUoXHJcblx0XHRcdFx0bm93LmdldFRpbWUoKSArIDMgKiAyNCAqIDYwICogNjAgKiAxMDAwXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IHBhcnNlZERhdGUgPSByZXN1bHQuZHVlRGF0ZSE7XHJcblxyXG5cdFx0XHRleHBlY3QoXHJcblx0XHRcdFx0TWF0aC5hYnMocGFyc2VkRGF0ZS5nZXRUaW1lKCkgLSB0aHJlZURheXNMYXRlci5nZXRUaW1lKCkpXHJcblx0XHRcdCkudG9CZUxlc3NUaGFuKDI0ICogNjAgKiA2MCAqIDEwMDApO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwiYnkgRnJpZGF5XCInLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJzdWJtaXQgcmVwb3J0IGJ5IEZyaWRheVwiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udGV4dCkudG9CZShcIkZyaWRheVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIGRldGVjdCBzdGFydCBkYXRlIHdpdGggXCJzdGFydFwiIGtleXdvcmQnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXHJcblx0XHRcdFx0XCJzdGFydCBwcm9qZWN0IHRvbW9ycm93XCJcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50eXBlKS50b0JlKFwic3RhcnRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3RhcnREYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIGRldGVjdCBzY2hlZHVsZWQgZGF0ZSB3aXRoIFwic2NoZWR1bGVkXCIga2V5d29yZCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcIm1lZXRpbmcgc2NoZWR1bGVkIGZvciB0b21vcnJvd1wiXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udHlwZSkudG9CZShcInNjaGVkdWxlZFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5zY2hlZHVsZWREYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ2hpbmVzZSBUaW1lIEV4cHJlc3Npb25zXCIsICgpID0+IHtcclxuXHRcdHRlc3QoJ3Nob3VsZCBwYXJzZSBcIuaYjuWkqVwiJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwi5piO5aSp5byA5LyaXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdLnRleHQpLnRvQmUoXCLmmI7lpKlcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udHlwZSkudG9CZShcImR1ZVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRUZXh0KS50b0JlKFwi5byA5LyaXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwi5ZCO5aSpXCInLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCLlkI7lpKnlrozmiJDku7vliqFcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udGV4dCkudG9CZShcIuWQjuWkqVwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGUgcGFyc2VkIGRhdGUgaXMgMiBkYXlzIGZyb20gdG9kYXlcclxuXHRcdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0Y29uc3QgcGFyc2VkRGF0ZSA9IHJlc3VsdC5kdWVEYXRlITtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENhbGN1bGF0ZSB0aGUgZGlmZmVyZW5jZSBpbiBkYXlzXHJcblx0XHRcdGNvbnN0IGRpZmZJbk1zID0gcGFyc2VkRGF0ZS5nZXRUaW1lKCkgLSBub3cuZ2V0VGltZSgpO1xyXG5cdFx0XHRjb25zdCBkaWZmSW5EYXlzID0gTWF0aC5yb3VuZChkaWZmSW5NcyAvICgyNCAqIDYwICogNjAgKiAxMDAwKSk7XHJcblx0XHRcdFxyXG5cdFx0XHQvLyBTaG91bGQgYmUgYXBwcm94aW1hdGVseSAyIGRheXMgZnJvbSBub3cgKGFsbG93IDEtMiBkYXlzIGR1ZSB0byB0aW1lIG9mIGRheSlcclxuXHRcdFx0ZXhwZWN0KGRpZmZJbkRheXMpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMSk7XHJcblx0XHRcdGV4cGVjdChkaWZmSW5EYXlzKS50b0JlTGVzc1RoYW5PckVxdWFsKDIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwiM+WkqeWQjlwiJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwiM+WkqeWQjuaPkOS6pOaKpeWRilwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwiM+WkqeWQjlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwi5LiL5ZGoXCInLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCLkuIvlkajlrozmiJDpobnnm65cIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udGV4dCkudG9CZShcIuS4i+WRqFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIHBhcnNlIFwi5LiL5ZGo5LiAXCInLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCLkuIvlkajkuIDlvIDkvJpcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udGV4dCkudG9CZShcIuS4i+WRqOS4gFwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50eXBlKS50b0JlKFwiZHVlXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLnRvQmUoXCLlvIDkvJpcIik7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBwYXJzZWQgZGF0ZSBpcyBhIE1vbmRheSBhbmQgaW4gdGhlIG5leHQgd2Vla1xyXG5cdFx0XHRjb25zdCBwYXJzZWREYXRlID0gcmVzdWx0LmR1ZURhdGUhO1xyXG5cdFx0XHRleHBlY3QocGFyc2VkRGF0ZS5nZXREYXkoKSkudG9CZSgxKTsgLy8gTW9uZGF5IGlzIGRheSAxXHJcblxyXG5cdFx0XHQvLyBTaG91bGQgYmUgYXQgbGVhc3QgMSBkYXkgZnJvbSBub3cgKG5leHQgd2VlaylcclxuXHRcdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlZERhdGUuZ2V0VGltZSgpKS50b0JlR3JlYXRlclRoYW4obm93LmdldFRpbWUoKSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KCdzaG91bGQgcGFyc2UgXCLkuIrlkajkuIlcIicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIuS4iuWRqOS4ieeahOS8muiurlwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwi5LiK5ZGo5LiJXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBwYXJzZWQgZGF0ZSBpcyBhIFdlZG5lc2RheSBhbmQgaW4gdGhlIHBhc3Qgd2Vla1xyXG5cdFx0XHRjb25zdCBwYXJzZWREYXRlID0gcmVzdWx0LmR1ZURhdGUhO1xyXG5cdFx0XHRleHBlY3QocGFyc2VkRGF0ZS5nZXREYXkoKSkudG9CZSgzKTsgLy8gV2VkbmVzZGF5IGlzIGRheSAzXHJcblxyXG5cdFx0XHQvLyBTaG91bGQgYmUgaW4gdGhlIHBhc3QgKGxhc3Qgd2VlaylcclxuXHRcdFx0Y29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlZERhdGUuZ2V0VGltZSgpKS50b0JlTGVzc1RoYW4obm93LmdldFRpbWUoKSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KCdzaG91bGQgcGFyc2UgXCLov5nlkajkupRcIicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIui/meWRqOS6lOaIquatolwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwi6L+Z5ZGo5LqUXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBwYXJzZWQgZGF0ZSBpcyBhIEZyaWRheVxyXG5cdFx0XHRjb25zdCBwYXJzZWREYXRlID0gcmVzdWx0LmR1ZURhdGUhO1xyXG5cdFx0XHRleHBlY3QocGFyc2VkRGF0ZS5nZXREYXkoKSkudG9CZSg1KTsgLy8gRnJpZGF5IGlzIGRheSA1XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KCdzaG91bGQgcGFyc2UgXCLmmJ/mnJ/kuoxcIicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIuaYn+acn+S6jOaPkOS6pFwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwi5pif5pyf5LqMXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBwYXJzZWQgZGF0ZSBpcyBhIFR1ZXNkYXlcclxuXHRcdFx0Y29uc3QgcGFyc2VkRGF0ZSA9IHJlc3VsdC5kdWVEYXRlITtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlZERhdGUuZ2V0RGF5KCkpLnRvQmUoMik7IC8vIFR1ZXNkYXkgaXMgZGF5IDJcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoJ3Nob3VsZCBwYXJzZSBcIuWRqOWFrVwiJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwi5ZGo5YWt5LyR5oGvXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdLnRleHQpLnRvQmUoXCLlkajlha1cIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZHVlRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHJcblx0XHRcdC8vIENoZWNrIHRoYXQgdGhlIHBhcnNlZCBkYXRlIGlzIGEgU2F0dXJkYXlcclxuXHRcdFx0Y29uc3QgcGFyc2VkRGF0ZSA9IHJlc3VsdC5kdWVEYXRlITtcclxuXHRcdFx0ZXhwZWN0KHBhcnNlZERhdGUuZ2V0RGF5KCkpLnRvQmUoNik7IC8vIFNhdHVyZGF5IGlzIGRheSA2XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KCdzaG91bGQgcGFyc2UgXCLnpLzmi5zlpKlcIicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIuekvOaLnOWkqeiBmuS8mlwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50ZXh0KS50b0JlKFwi56S85ouc5aSpXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayB0aGF0IHRoZSBwYXJzZWQgZGF0ZSBpcyBhIFN1bmRheVxyXG5cdFx0XHRjb25zdCBwYXJzZWREYXRlID0gcmVzdWx0LmR1ZURhdGUhO1xyXG5cdFx0XHRleHBlY3QocGFyc2VkRGF0ZS5nZXREYXkoKSkudG9CZSgwKTsgLy8gU3VuZGF5IGlzIGRheSAwXHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KCdzaG91bGQgZGV0ZWN0IHN0YXJ0IGRhdGUgd2l0aCBDaGluZXNlIFwi5byA5aeLXCIga2V5d29yZCcsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcIuW8gOWni+mhueebruaYjuWkqVwiKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9uc1swXS50eXBlKS50b0JlKFwic3RhcnRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3RhcnREYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdCgnc2hvdWxkIGRldGVjdCBzY2hlZHVsZWQgZGF0ZSB3aXRoIENoaW5lc2UgXCLlronmjpJcIiBrZXl3b3JkJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwi5a6J5o6S5Lya6K6u5piO5aSpXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdLnR5cGUpLnRvQmUoXCJzY2hlZHVsZWRcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc2NoZWR1bGVkRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRleHQgQ2xlYW5pbmdcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCByZW1vdmUgc2luZ2xlIHRpbWUgZXhwcmVzc2lvblwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJnbyB0byBiZWQgdG9tb3Jyb3dcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLnRvQmUoXCJnbyB0byBiZWRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHJlbW92ZSBtdWx0aXBsZSB0aW1lIGV4cHJlc3Npb25zXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcInN0YXJ0IHByb2plY3QgdG9tb3Jyb3cgYW5kIGZpbmlzaCBieSBuZXh0IHdlZWtcIlxyXG5cdFx0XHQpO1xyXG5cdFx0XHQvLyBUaGUgZXhhY3QgY2xlYW5lZCB0ZXh0IGRlcGVuZHMgb24gY2hyb25vIHBhcnNpbmcsIGJ1dCBpdCBzaG91bGQgcmVtb3ZlIHRpbWUgZXhwcmVzc2lvbnNcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5jbGVhbmVkVGV4dCkubm90LnRvQ29udGFpbihcInRvbW9ycm93XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRUZXh0KS5ub3QudG9Db250YWluKFwibmV4dCB3ZWVrXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgcHVuY3R1YXRpb24gYXJvdW5kIHRpbWUgZXhwcmVzc2lvbnNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFxyXG5cdFx0XHRcdFwibWVldGluZywgdG9tb3Jyb3csIGltcG9ydGFudFwiXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLnRvQmUoXCJtZWV0aW5nLCBpbXBvcnRhbnRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHByZXNlcnZlIHRleHQgd2hlbiByZW1vdmVPcmlnaW5hbFRleHQgaXMgZmFsc2VcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb25maWcgPSB7XHJcblx0XHRcdFx0Li4uREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHLFxyXG5cdFx0XHRcdHJlbW92ZU9yaWdpbmFsVGV4dDogZmFsc2UsXHJcblx0XHRcdH07XHJcblx0XHRcdGNvbnN0IHNlcnZpY2VOb1JlbW92ZSA9IG5ldyBUaW1lUGFyc2luZ1NlcnZpY2UoY29uZmlnKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID1cclxuXHRcdFx0XHRzZXJ2aWNlTm9SZW1vdmUucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJnbyB0byBiZWQgdG9tb3Jyb3dcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRUZXh0KS50b0JlKFwiZ28gdG8gYmVkIHRvbW9ycm93XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTXVsdGlwbGUgRGF0ZSBUeXBlc1wiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIHBhcnNlIG11bHRpcGxlIGRpZmZlcmVudCBkYXRlIHR5cGVzXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcclxuXHRcdFx0XHRcInN0YXJ0IHByb2plY3QgdG9tb3Jyb3csIGR1ZSBieSBuZXh0IEZyaWRheSwgc2NoZWR1bGVkIGZvciBuZXh0IHdlZWtcIlxyXG5cdFx0XHQpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigxKTtcclxuXHRcdFx0Ly8gU2hvdWxkIGhhdmUgZGlmZmVyZW50IHR5cGVzIG9mIGRhdGVzXHJcblx0XHRcdGNvbnN0IHR5cGVzID0gcmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zLm1hcCgoZXhwcikgPT4gZXhwci50eXBlKTtcclxuXHRcdFx0ZXhwZWN0KG5ldyBTZXQodHlwZXMpLnNpemUpLnRvQmVHcmVhdGVyVGhhbigxKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkVkZ2UgQ2FzZXNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZW1wdHkgdGV4dFwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLnRvQmUoXCJcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuc3RhcnREYXRlKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuZHVlRGF0ZSkudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnNjaGVkdWxlZERhdGUpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIHRleHQgd2l0aCBubyB0aW1lIGV4cHJlc3Npb25zXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhcImp1c3QgYSByZWd1bGFyIHRhc2tcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQuY2xlYW5lZFRleHQpLnRvQmUoXCJqdXN0IGEgcmVndWxhciB0YXNrXCIpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZGlzYWJsZWQgc2VydmljZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGNvbmZpZyA9IHsgLi4uREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHLCBlbmFibGVkOiBmYWxzZSB9O1xyXG5cdFx0XHRjb25zdCBkaXNhYmxlZFNlcnZpY2UgPSBuZXcgVGltZVBhcnNpbmdTZXJ2aWNlKGNvbmZpZyk7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9XHJcblx0XHRcdFx0ZGlzYWJsZWRTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwiZ28gdG8gYmVkIHRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucykudG9IYXZlTGVuZ3RoKDApO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRUZXh0KS50b0JlKFwiZ28gdG8gYmVkIHRvbW9ycm93XCIpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiQ29uZmlndXJhdGlvbiBVcGRhdGVzXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgdXBkYXRlIGNvbmZpZ3VyYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBuZXdDb25maWcgPSB7IGVuYWJsZWQ6IGZhbHNlIH07XHJcblx0XHRcdHNlcnZpY2UudXBkYXRlQ29uZmlnKG5ld0NvbmZpZyk7XHJcblxyXG5cdFx0XHRjb25zdCBjb25maWcgPSBzZXJ2aWNlLmdldENvbmZpZygpO1xyXG5cdFx0XHRleHBlY3QoY29uZmlnLmVuYWJsZWQpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBwcmVzZXJ2ZSBvdGhlciBjb25maWcgdmFsdWVzIHdoZW4gdXBkYXRpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbENvbmZpZyA9IHNlcnZpY2UuZ2V0Q29uZmlnKCk7XHJcblx0XHRcdHNlcnZpY2UudXBkYXRlQ29uZmlnKHsgZW5hYmxlZDogZmFsc2UgfSk7XHJcblxyXG5cdFx0XHRjb25zdCB1cGRhdGVkQ29uZmlnID0gc2VydmljZS5nZXRDb25maWcoKTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRDb25maWcuZW5hYmxlZCkudG9CZShmYWxzZSk7XHJcblx0XHRcdGV4cGVjdCh1cGRhdGVkQ29uZmlnLnN1cHBvcnRlZExhbmd1YWdlcykudG9FcXVhbChcclxuXHRcdFx0XHRvcmlnaW5hbENvbmZpZy5zdXBwb3J0ZWRMYW5ndWFnZXNcclxuXHRcdFx0KTtcclxuXHRcdFx0ZXhwZWN0KHVwZGF0ZWRDb25maWcuZGF0ZUtleXdvcmRzKS50b0VxdWFsKFxyXG5cdFx0XHRcdG9yaWdpbmFsQ29uZmlnLmRhdGVLZXl3b3Jkc1xyXG5cdFx0XHQpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiRGF0ZSBUeXBlIERldGVybWluYXRpb25cIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBkZWZhdWx0IHRvIGR1ZSBkYXRlIHdoZW4gbm8ga2V5d29yZHMgZm91bmRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwidG9tb3Jyb3dcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udHlwZSkudG9CZShcImR1ZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcHJpb3JpdGl6ZSBzdGFydCBrZXl3b3Jkc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoXCJiZWdpbiB3b3JrIHRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdLnR5cGUpLnRvQmUoXCJzdGFydFwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcHJpb3JpdGl6ZSBkdWUga2V5d29yZHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwiZGVhZGxpbmUgdG9tb3Jyb3dcIik7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQucGFyc2VkRXhwcmVzc2lvbnNbMF0udHlwZSkudG9CZShcImR1ZVwiKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcHJpb3JpdGl6ZSBzY2hlZHVsZWQga2V5d29yZHNcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKFwic2NoZWR1bGVkIHRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5wYXJzZWRFeHByZXNzaW9ucykudG9IYXZlTGVuZ3RoKDEpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zWzBdLnR5cGUpLnRvQmUoXCJzY2hlZHVsZWRcIik7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJQZXItTGluZSBQcm9jZXNzaW5nXCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgcGFyc2Ugc2luZ2xlIGxpbmUgY29ycmVjdGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gc2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9uc0ZvckxpbmUoXCJ0YXNrIHRvbW9ycm93XCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5vcmlnaW5hbExpbmUpLnRvQmUoXCJ0YXNrIHRvbW9ycm93XCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNsZWFuZWRMaW5lKS50b0JlKFwidGFza1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5kdWVEYXRlKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LnBhcnNlZEV4cHJlc3Npb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHBhcnNlIG11bHRpcGxlIGxpbmVzIGluZGVwZW5kZW50bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBsaW5lcyA9IFtcclxuXHRcdFx0XHRcInRhc2sgMSB0b21vcnJvd1wiLFxyXG5cdFx0XHRcdFwidGFzayAyIG5leHQgd2Vla1wiLFxyXG5cdFx0XHRcdFwidGFzayAzIG5vIGRhdGVcIixcclxuXHRcdFx0XTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnNQZXJMaW5lKGxpbmVzKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHRzKS50b0hhdmVMZW5ndGgoMyk7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBsaW5lXHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzBdLm9yaWdpbmFsTGluZSkudG9CZShcInRhc2sgMSB0b21vcnJvd1wiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMF0uY2xlYW5lZExpbmUpLnRvQmUoXCJ0YXNrIDFcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzBdLmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgbGluZVxyXG5cdFx0XHRleHBlY3QocmVzdWx0c1sxXS5vcmlnaW5hbExpbmUpLnRvQmUoXCJ0YXNrIDIgbmV4dCB3ZWVrXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0c1sxXS5jbGVhbmVkTGluZSkudG9CZShcInRhc2sgMlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMV0uZHVlRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHJcblx0XHRcdC8vIFRoaXJkIGxpbmVcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMl0ub3JpZ2luYWxMaW5lKS50b0JlKFwidGFzayAzIG5vIGRhdGVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzJdLmNsZWFuZWRMaW5lKS50b0JlKFwidGFzayAzIG5vIGRhdGVcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzJdLmR1ZURhdGUpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIGRpZmZlcmVudCBkYXRlIHR5cGVzIHBlciBsaW5lXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgbGluZXMgPSBbXHJcblx0XHRcdFx0XCJzdGFydCBwcm9qZWN0IHRvbW9ycm93XCIsXHJcblx0XHRcdFx0XCJtZWV0aW5nIHNjaGVkdWxlZCBmb3IgbmV4dCB3ZWVrXCIsXHJcblx0XHRcdFx0XCJkZWFkbGluZSBieSBGcmlkYXlcIixcclxuXHRcdFx0XTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnNQZXJMaW5lKGxpbmVzKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHRzKS50b0hhdmVMZW5ndGgoMyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzBdLnN0YXJ0RGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMV0uc2NoZWR1bGVkRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMl0uZHVlRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgcHJlc2VydmUgbGluZSBzdHJ1Y3R1cmUgaW4gbXVsdGlsaW5lIGNvbnRlbnRcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBjb250ZW50ID0gXCJ0YXNrIDEgdG9tb3Jyb3dcXG50YXNrIDIgbmV4dCB3ZWVrXFxudGFzayAzXCI7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnNQZXJMaW5lKGxpbmVzKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHRzKS50b0hhdmVMZW5ndGgoMyk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgZWFjaCBsaW5lIGlzIHByb2Nlc3NlZCBpbmRlcGVuZGVudGx5XHJcblx0XHRcdGNvbnN0IGNsZWFuZWRMaW5lcyA9IHJlc3VsdHMubWFwKChyKSA9PiByLmNsZWFuZWRMaW5lKTtcclxuXHRcdFx0Y29uc3QgcmVjb25zdHJ1Y3RlZCA9IGNsZWFuZWRMaW5lcy5qb2luKFwiXFxuXCIpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHJlY29uc3RydWN0ZWQpLnRvQmUoXCJ0YXNrIDFcXG50YXNrIDJcXG50YXNrIDNcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBlbXB0eSBsaW5lc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gW1widGFzayB0b21vcnJvd1wiLCBcIlwiLCBcImFub3RoZXIgdGFza1wiXTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IHNlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnNQZXJMaW5lKGxpbmVzKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHRzKS50b0hhdmVMZW5ndGgoMyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzBdLmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzFdLmR1ZURhdGUpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMV0uY2xlYW5lZExpbmUpLnRvQmUoXCJcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzJdLmR1ZURhdGUpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgaGFuZGxlIENoaW5lc2UgdGltZSBleHByZXNzaW9ucyBwZXIgbGluZVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGxpbmVzID0gW1wi5Lu75YqhMSDmmI7lpKlcIiwgXCLku7vliqEyIOS4i+WRqFwiLCBcIuS7u+WKoTNcIl07XHJcblx0XHRcdGNvbnN0IHJlc3VsdHMgPSBzZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zUGVyTGluZShsaW5lcyk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0cykudG9IYXZlTGVuZ3RoKDMpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0c1swXS5jbGVhbmVkTGluZSkudG9CZShcIuS7u+WKoTFcIik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzBdLmR1ZURhdGUpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzFdLmNsZWFuZWRMaW5lKS50b0JlKFwi5Lu75YqhMlwiKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMV0uZHVlRGF0ZSkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMl0uY2xlYW5lZExpbmUpLnRvQmUoXCLku7vliqEzXCIpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0c1syXS5kdWVEYXRlKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==