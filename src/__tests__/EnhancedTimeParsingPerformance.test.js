/**
 * Enhanced Time Parsing Performance Tests
 *
 * Tests for:
 * - Time parsing performance impact on task creation
 * - Memory usage with enhanced metadata structures
 * - Timeline rendering performance with time components
 * - Performance regression tests
 */
import { TimeParsingService, DEFAULT_TIME_PARSING_CONFIG } from "../services/time-parsing-service";
import { FileTaskManagerImpl } from "../managers/file-task-manager";
import { TaskMigrationService } from "../services/task-migration-service";
// Mock Obsidian App
const mockApp = {
    vault: {
        getFileByPath: jest.fn(),
        read: jest.fn(),
        modify: jest.fn(),
    },
    fileManager: {
        renameFile: jest.fn(),
    },
};
describe("Enhanced Time Parsing Performance Tests", () => {
    let timeParsingService;
    let enhancedTimeParsingService;
    let fileTaskManager;
    let migrationService;
    beforeEach(() => {
        // Standard configuration
        timeParsingService = new TimeParsingService(DEFAULT_TIME_PARSING_CONFIG);
        // Enhanced configuration for comparison
        const enhancedConfig = Object.assign(Object.assign({}, DEFAULT_TIME_PARSING_CONFIG), { timePatterns: {
                singleTime: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/,
                    /\b(1[0-2]|0?[1-9]):([0-5]\d)(?::([0-5]\d))?\s*(AM|PM|am|pm)\b/,
                ],
                timeRange: [
                    /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\s*[-~\uff5e]\s*([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/,
                ],
                rangeSeparators: ["-", "~", "\uff5e", " - ", " ~ "],
            }, timeDefaults: {
                preferredFormat: "24h",
                defaultPeriod: "PM",
                midnightCrossing: "next-day",
            } });
        enhancedTimeParsingService = new TimeParsingService(enhancedConfig);
        fileTaskManager = new FileTaskManagerImpl(mockApp, undefined, enhancedTimeParsingService);
        migrationService = new TaskMigrationService();
    });
    describe("Time Parsing Performance Impact", () => {
        test("should parse single time expressions efficiently", () => {
            const testCases = [
                "Meeting at 2:30 PM",
                "Call at 14:00",
                "Lunch at 12:00:00",
                "Event at 9:15 AM",
                "Task at 23:45",
            ];
            // Benchmark standard parsing
            const startTime1 = performance.now();
            for (let i = 0; i < 1000; i++) {
                testCases.forEach(testCase => {
                    timeParsingService.parseTimeExpressions(testCase);
                });
            }
            const endTime1 = performance.now();
            const standardTime = endTime1 - startTime1;
            // Benchmark enhanced parsing
            const startTime2 = performance.now();
            for (let i = 0; i < 1000; i++) {
                testCases.forEach(testCase => {
                    enhancedTimeParsingService.parseTimeExpressions(testCase);
                });
            }
            const endTime2 = performance.now();
            const enhancedTime = endTime2 - startTime2;
            console.log(`Standard parsing (5000 iterations): ${standardTime.toFixed(2)}ms`);
            console.log(`Enhanced parsing (5000 iterations): ${enhancedTime.toFixed(2)}ms`);
            console.log(`Performance overhead: ${((enhancedTime / standardTime - 1) * 100).toFixed(1)}%`);
            // Enhanced parsing should not be more than 50% slower
            expect(enhancedTime).toBeLessThan(standardTime * 1.5);
            // Should complete within reasonable time
            expect(enhancedTime).toBeLessThan(1000); // 1 second for 5000 iterations
        });
        test("should parse time ranges efficiently", () => {
            const timeRanges = [
                "Meeting 9:00-17:00",
                "Workshop 14:30-16:45",
                "Event 10:00 AM - 2:00 PM",
                "Session 08:15~12:30",
                "Conference 9:00:00-17:30:00",
            ];
            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                timeRanges.forEach(range => {
                    const result = enhancedTimeParsingService.parseTimeExpressions(range);
                    // Access time components to ensure they're computed
                    if (result.timeComponents.startTime && result.timeComponents.endTime) {
                        // Simulate accessing the data
                        const startHour = result.timeComponents.startTime.hour;
                        const endHour = result.timeComponents.endTime.hour;
                    }
                });
            }
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            console.log(`Time range parsing (5000 iterations): ${parseTime.toFixed(2)}ms`);
            console.log(`Average per range: ${(parseTime / 5000).toFixed(3)}ms`);
            // Should complete within reasonable time
            expect(parseTime).toBeLessThan(2000); // 2 seconds for 5000 iterations
        });
        test("should handle complex time expressions efficiently", () => {
            const complexExpressions = [
                "Meeting tomorrow at 2:30 PM with break 3:00-3:15",
                "Workshop next week 9:00-17:00 with lunch 12:00~13:00",
                "Conference starts at 8:00 AM and ends at 6:00 PM on Friday",
                "Daily standup at 9:15 AM every weekday",
                "Appointment scheduled for 3:45 PM next Tuesday",
            ];
            const startTime = performance.now();
            for (let i = 0; i < 500; i++) {
                complexExpressions.forEach(expression => {
                    const result = enhancedTimeParsingService.parseTimeExpressions(expression);
                    // Access all parsed data
                    if (result.timeComponents) {
                        Object.values(result.timeComponents).forEach(component => {
                            if (component) {
                                const hour = component.hour;
                                const minute = component.minute;
                            }
                        });
                    }
                });
            }
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            console.log(`Complex expression parsing (2500 iterations): ${parseTime.toFixed(2)}ms`);
            console.log(`Average per expression: ${(parseTime / 2500).toFixed(3)}ms`);
            // Should complete within reasonable time
            expect(parseTime).toBeLessThan(3000); // 3 seconds for 2500 iterations
        });
        test("should benefit from caching on repeated parsing", () => {
            const testExpression = "Meeting at 2:30 PM tomorrow";
            // First parse (no cache)
            const startTime1 = performance.now();
            for (let i = 0; i < 1000; i++) {
                enhancedTimeParsingService.parseTimeExpressions(testExpression);
            }
            const endTime1 = performance.now();
            const firstParseTime = endTime1 - startTime1;
            // Second parse (with cache)
            const startTime2 = performance.now();
            for (let i = 0; i < 1000; i++) {
                enhancedTimeParsingService.parseTimeExpressions(testExpression);
            }
            const endTime2 = performance.now();
            const cachedParseTime = endTime2 - startTime2;
            console.log(`First parse (1000 iterations): ${firstParseTime.toFixed(2)}ms`);
            console.log(`Cached parse (1000 iterations): ${cachedParseTime.toFixed(2)}ms`);
            console.log(`Cache speedup: ${(firstParseTime / cachedParseTime).toFixed(2)}x`);
            // Cached parsing should be significantly faster
            expect(cachedParseTime).toBeLessThan(firstParseTime * 0.5);
        });
    });
    describe("Task Creation Performance Impact", () => {
        test("should create file tasks with time components efficiently", () => {
            const createMockEntry = (index) => ({
                ctx: {},
                file: {
                    parent: null,
                    deleted: false,
                    vault: null,
                    path: `task-${index}.md`,
                    name: `task-${index}.md`,
                    extension: "md",
                    getShortName: () => `task-${index}`,
                },
                formulas: {},
                implicit: {
                    file: null,
                    name: `task-${index}`,
                    path: `task-${index}.md`,
                    folder: "",
                    ext: "md",
                },
                lazyEvalCache: {},
                properties: {
                    title: `Task ${index} at ${9 + (index % 8)}:${(index % 4) * 15} AM`,
                    status: " ",
                    completed: false,
                },
                getValue: jest.fn((prop) => {
                    if (prop.name === "title")
                        return `Task ${index} at ${9 + (index % 8)}:${(index % 4) * 15} AM`;
                    if (prop.name === "status")
                        return " ";
                    if (prop.name === "completed")
                        return false;
                    return undefined;
                }),
                updateProperty: jest.fn(),
                getFormulaValue: jest.fn(),
                getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
            });
            // Create file task manager without time parsing for comparison
            const fileTaskManagerNoTime = new FileTaskManagerImpl(mockApp);
            const taskCount = 1000;
            const mockEntries = Array.from({ length: taskCount }, (_, i) => createMockEntry(i));
            // Benchmark without time parsing
            const startTime1 = performance.now();
            const tasksWithoutTime = mockEntries.map(entry => fileTaskManagerNoTime.entryToFileTask(entry));
            const endTime1 = performance.now();
            const timeWithoutParsing = endTime1 - startTime1;
            // Benchmark with time parsing
            const startTime2 = performance.now();
            const tasksWithTime = mockEntries.map(entry => fileTaskManager.entryToFileTask(entry));
            const endTime2 = performance.now();
            const timeWithParsing = endTime2 - startTime2;
            console.log(`Task creation without time parsing (${taskCount} tasks): ${timeWithoutParsing.toFixed(2)}ms`);
            console.log(`Task creation with time parsing (${taskCount} tasks): ${timeWithParsing.toFixed(2)}ms`);
            console.log(`Time parsing overhead: ${((timeWithParsing / timeWithoutParsing - 1) * 100).toFixed(1)}%`);
            // Verify tasks were created correctly
            expect(tasksWithoutTime).toHaveLength(taskCount);
            expect(tasksWithTime).toHaveLength(taskCount);
            // Time parsing should not add more than 100% overhead
            expect(timeWithParsing).toBeLessThan(timeWithoutParsing * 2);
            // Should complete within reasonable time
            expect(timeWithParsing).toBeLessThan(5000); // 5 seconds for 1000 tasks
            // Verify some tasks have time components
            const tasksWithTimeComponents = tasksWithTime.filter(task => task.metadata.timeComponents && Object.keys(task.metadata.timeComponents).length > 0);
            expect(tasksWithTimeComponents.length).toBeGreaterThan(0);
        });
        test("should handle batch task creation efficiently", () => {
            const batchSizes = [10, 50, 100, 500];
            const results = [];
            batchSizes.forEach(batchSize => {
                const mockEntries = Array.from({ length: batchSize }, (_, i) => ({
                    ctx: {
                        _local: {},
                        app: {},
                        filter: {},
                        formulas: {},
                        localUsed: false
                    },
                    file: {
                        parent: null,
                        deleted: false,
                        vault: null,
                        path: `batch-task-${i}.md`,
                        name: `batch-task-${i}.md`,
                        extension: "md",
                        getShortName: () => `batch-task-${i}`,
                    },
                    formulas: {},
                    implicit: {
                        file: null,
                        name: `batch-task-${i}`,
                        path: `batch-task-${i}.md`,
                        folder: "",
                        ext: "md",
                    },
                    lazyEvalCache: {},
                    properties: {
                        title: `Batch task ${i} at ${10 + (i % 6)}:${(i % 4) * 15}`,
                        status: " ",
                        completed: false,
                    },
                    getValue: jest.fn((prop) => {
                        if (prop.name === "title")
                            return `Batch task ${i} at ${10 + (i % 6)}:${(i % 4) * 15}`;
                        if (prop.name === "status")
                            return " ";
                        if (prop.name === "completed")
                            return false;
                        return undefined;
                    }),
                    updateProperty: jest.fn(),
                    getFormulaValue: jest.fn(),
                    getPropertyKeys: jest.fn(() => ["title", "status", "completed"]),
                }));
                const startTime = performance.now();
                const tasks = mockEntries.map(entry => fileTaskManager.entryToFileTask(entry));
                const endTime = performance.now();
                const batchTime = endTime - startTime;
                results.push({
                    size: batchSize,
                    time: batchTime,
                    avgPerTask: batchTime / batchSize,
                });
                expect(tasks).toHaveLength(batchSize);
            });
            // Log results
            console.log("Batch task creation performance:");
            results.forEach(result => {
                console.log(`  ${result.size} tasks: ${result.time.toFixed(2)}ms (${result.avgPerTask.toFixed(3)}ms per task)`);
            });
            // Performance should scale reasonably
            const smallBatch = results.find(r => r.size === 10);
            const largeBatch = results.find(r => r.size === 500);
            // Large batch should not be more than 10x slower per task than small batch
            expect(largeBatch.avgPerTask).toBeLessThan(smallBatch.avgPerTask * 10);
        });
    });
    describe("Memory Usage with Enhanced Metadata", () => {
        test("should measure memory impact of enhanced metadata structures", () => {
            const taskCount = 1000;
            // Create tasks without enhanced metadata
            const standardTasks = [];
            for (let i = 0; i < taskCount; i++) {
                standardTasks.push({
                    id: `standard-task-${i}`,
                    content: `Standard task ${i}`,
                    filePath: `standard-${i}.md`,
                    line: i,
                    completed: false,
                    status: " ",
                    originalMarkdown: `- [ ] Standard task ${i}`,
                    metadata: {
                        dueDate: Date.now() + i * 1000,
                        tags: [`tag-${i % 10}`],
                        children: [],
                    },
                });
            }
            // Create tasks with enhanced metadata
            const enhancedTasks = [];
            for (let i = 0; i < taskCount; i++) {
                enhancedTasks.push({
                    id: `enhanced-task-${i}`,
                    content: `Enhanced task ${i} at ${9 + (i % 8)}:${(i % 4) * 15}`,
                    filePath: `enhanced-${i}.md`,
                    line: i,
                    completed: false,
                    status: " ",
                    originalMarkdown: `- [ ] Enhanced task ${i} at ${9 + (i % 8)}:${(i % 4) * 15}`,
                    metadata: {
                        dueDate: Date.now() + i * 1000,
                        tags: [`tag-${i % 10}`],
                        children: [],
                        timeComponents: {
                            scheduledTime: {
                                hour: 9 + (i % 8),
                                minute: (i % 4) * 15,
                                originalText: `${9 + (i % 8)}:${(i % 4) * 15}`,
                                isRange: false,
                            },
                        },
                        enhancedDates: {
                            scheduledDateTime: new Date(Date.now() + i * 1000),
                        },
                    },
                });
            }
            // Measure serialized size as a proxy for memory usage
            const standardSize = JSON.stringify(standardTasks).length;
            const enhancedSize = JSON.stringify(enhancedTasks).length;
            const sizeIncrease = ((enhancedSize / standardSize - 1) * 100);
            console.log(`Standard tasks serialized size: ${(standardSize / 1024).toFixed(2)} KB`);
            console.log(`Enhanced tasks serialized size: ${(enhancedSize / 1024).toFixed(2)} KB`);
            console.log(`Memory increase: ${sizeIncrease.toFixed(1)}%`);
            // Memory increase should be reasonable (less than 100%)
            expect(sizeIncrease).toBeLessThan(100);
            // Verify enhanced tasks have the expected structure
            const tasksWithTimeComponents = enhancedTasks.filter(task => task.metadata.timeComponents && task.metadata.enhancedDates);
            expect(tasksWithTimeComponents.length).toBe(taskCount);
        });
        test("should handle memory efficiently during task migration", () => {
            const taskCount = 500;
            // Create legacy tasks
            const legacyTasks = [];
            for (let i = 0; i < taskCount; i++) {
                legacyTasks.push({
                    id: `legacy-task-${i}`,
                    content: `Legacy task ${i} at ${10 + (i % 6)}:${(i % 4) * 15} PM`,
                    filePath: `legacy-${i}.md`,
                    line: i,
                    completed: false,
                    status: " ",
                    originalMarkdown: `- [ ] Legacy task ${i} at ${10 + (i % 6)}:${(i % 4) * 15} PM`,
                    metadata: {
                        dueDate: Date.now() + i * 1000,
                        tags: [`legacy-tag-${i % 5}`],
                        children: [],
                    },
                });
            }
            // Measure migration performance and memory impact
            const startTime = performance.now();
            const migratedTasks = legacyTasks.map(task => migrationService.migrateTaskToEnhanced(task));
            const endTime = performance.now();
            const migrationTime = endTime - startTime;
            console.log(`Migration of ${taskCount} tasks: ${migrationTime.toFixed(2)}ms`);
            console.log(`Average per task: ${(migrationTime / taskCount).toFixed(3)}ms`);
            // Migration should complete within reasonable time
            expect(migrationTime).toBeLessThan(2000); // 2 seconds for 500 tasks
            // Verify migration results
            expect(migratedTasks).toHaveLength(taskCount);
            const tasksWithTimeComponents = migratedTasks.filter(task => task.metadata.timeComponents && Object.keys(task.metadata.timeComponents).length > 0);
            expect(tasksWithTimeComponents.length).toBeGreaterThan(0);
        });
    });
    describe("Timeline Rendering Performance", () => {
        test("should create timeline events efficiently", () => {
            const taskCount = 1000;
            const baseDate = new Date("2025-08-25");
            // Create tasks with time components
            const tasksWithTime = [];
            for (let i = 0; i < taskCount; i++) {
                const hour = 8 + (i % 12); // 8 AM to 7 PM
                const minute = (i % 4) * 15; // 0, 15, 30, 45 minutes
                tasksWithTime.push({
                    id: `timeline-task-${i}`,
                    content: `Timeline task ${i}`,
                    filePath: `timeline-${i}.md`,
                    line: i,
                    completed: false,
                    status: " ",
                    originalMarkdown: `- [ ] Timeline task ${i}`,
                    metadata: {
                        dueDate: baseDate.getTime() + (i % 7) * 24 * 60 * 60 * 1000,
                        timeComponents: {
                            scheduledTime: {
                                hour,
                                minute,
                                originalText: `${hour}:${minute.toString().padStart(2, '0')}`,
                                isRange: false,
                            },
                        },
                        enhancedDates: {
                            scheduledDateTime: new Date(baseDate.getTime() + (i % 7) * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000 + minute * 60 * 1000),
                        },
                        tags: [],
                        children: [],
                    },
                });
            }
            // Simulate timeline event creation
            const startTime = performance.now();
            const timelineEvents = tasksWithTime.map(task => ({
                id: task.id,
                title: task.content,
                date: new Date(task.metadata.dueDate),
                task,
                timeInfo: {
                    primaryTime: task.metadata.enhancedDates.scheduledDateTime,
                    isRange: false,
                    timeComponent: task.metadata.timeComponents.scheduledTime,
                    displayFormat: "date-time",
                },
            }));
            const endTime = performance.now();
            const creationTime = endTime - startTime;
            console.log(`Timeline event creation (${taskCount} events): ${creationTime.toFixed(2)}ms`);
            console.log(`Average per event: ${(creationTime / taskCount).toFixed(3)}ms`);
            // Should complete within reasonable time
            expect(creationTime).toBeLessThan(1000); // 1 second for 1000 events
            expect(timelineEvents).toHaveLength(taskCount);
            // Verify events have correct structure
            timelineEvents.forEach(event => {
                var _a, _b;
                expect((_a = event.timeInfo) === null || _a === void 0 ? void 0 : _a.primaryTime).toBeInstanceOf(Date);
                expect((_b = event.timeInfo) === null || _b === void 0 ? void 0 : _b.timeComponent).toBeDefined();
            });
        });
        test("should sort timeline events efficiently", () => {
            const eventCount = 5000;
            const baseDate = new Date("2025-08-25");
            // Create unsorted timeline events
            const events = [];
            for (let i = 0; i < eventCount; i++) {
                const randomHour = Math.floor(Math.random() * 24);
                const randomMinute = Math.floor(Math.random() * 60);
                const randomDay = Math.floor(Math.random() * 30); // Random day in month
                const eventDate = new Date(baseDate);
                eventDate.setDate(baseDate.getDate() + randomDay);
                eventDate.setHours(randomHour, randomMinute, 0, 0);
                events.push({
                    id: `sort-event-${i}`,
                    title: `Event ${i}`,
                    date: eventDate,
                    timeInfo: {
                        primaryTime: eventDate,
                        isRange: false,
                        displayFormat: "date-time",
                    },
                });
            }
            // Benchmark sorting
            const startTime = performance.now();
            const sortedEvents = events.sort((a, b) => a.timeInfo.primaryTime.getTime() - b.timeInfo.primaryTime.getTime());
            const endTime = performance.now();
            const sortTime = endTime - startTime;
            console.log(`Timeline event sorting (${eventCount} events): ${sortTime.toFixed(2)}ms`);
            // Should complete within reasonable time
            expect(sortTime).toBeLessThan(500); // 500ms for 5000 events
            expect(sortedEvents).toHaveLength(eventCount);
            // Verify sorting is correct
            for (let i = 1; i < sortedEvents.length; i++) {
                expect(sortedEvents[i].timeInfo.primaryTime.getTime())
                    .toBeGreaterThanOrEqual(sortedEvents[i - 1].timeInfo.primaryTime.getTime());
            }
        });
        test("should group timeline events by date efficiently", () => {
            const eventCount = 2000;
            const baseDate = new Date("2025-08-25");
            // Create events spread across multiple days
            const events = [];
            for (let i = 0; i < eventCount; i++) {
                const dayOffset = i % 30; // 30 days
                const hour = 8 + (i % 12);
                const minute = (i % 4) * 15;
                const eventDate = new Date(baseDate);
                eventDate.setDate(baseDate.getDate() + dayOffset);
                eventDate.setHours(hour, minute, 0, 0);
                events.push({
                    id: `group-event-${i}`,
                    title: `Event ${i}`,
                    date: eventDate,
                    timeInfo: {
                        primaryTime: eventDate,
                        isRange: false,
                        displayFormat: "date-time",
                    },
                });
            }
            // Benchmark grouping by date
            const startTime = performance.now();
            const groupedEvents = new Map();
            events.forEach(event => {
                const dateKey = event.timeInfo.primaryTime.toISOString().split('T')[0];
                if (!groupedEvents.has(dateKey)) {
                    groupedEvents.set(dateKey, []);
                }
                groupedEvents.get(dateKey).push(event);
            });
            // Sort events within each day
            groupedEvents.forEach(dayEvents => {
                dayEvents.sort((a, b) => a.timeInfo.primaryTime.getTime() - b.timeInfo.primaryTime.getTime());
            });
            const endTime = performance.now();
            const groupTime = endTime - startTime;
            console.log(`Timeline event grouping (${eventCount} events): ${groupTime.toFixed(2)}ms`);
            console.log(`Groups created: ${groupedEvents.size}`);
            // Should complete within reasonable time
            expect(groupTime).toBeLessThan(1000); // 1 second for 2000 events
            expect(groupedEvents.size).toBeLessThanOrEqual(30); // Max 30 days
            // Verify grouping is correct
            let totalEventsInGroups = 0;
            groupedEvents.forEach(dayEvents => {
                totalEventsInGroups += dayEvents.length;
                // Verify events in each day are sorted
                for (let i = 1; i < dayEvents.length; i++) {
                    expect(dayEvents[i].timeInfo.primaryTime.getTime())
                        .toBeGreaterThanOrEqual(dayEvents[i - 1].timeInfo.primaryTime.getTime());
                }
            });
            expect(totalEventsInGroups).toBe(eventCount);
        });
    });
    describe("Performance Regression Tests", () => {
        test("should maintain baseline performance for tasks without time", () => {
            const taskCount = 1000;
            // Create tasks without time information
            const tasksWithoutTime = Array.from({ length: taskCount }, (_, i) => `Simple task ${i} without any time information`);
            // Benchmark parsing tasks without time
            const startTime = performance.now();
            tasksWithoutTime.forEach(taskText => {
                const result = enhancedTimeParsingService.parseTimeExpressions(taskText);
                // Access the result to ensure it's computed
                const hasTime = result.timeComponents && Object.keys(result.timeComponents).length > 0;
            });
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            console.log(`Parsing tasks without time (${taskCount} tasks): ${parseTime.toFixed(2)}ms`);
            console.log(`Average per task: ${(parseTime / taskCount).toFixed(3)}ms`);
            // Should be very fast for tasks without time
            expect(parseTime).toBeLessThan(500); // 500ms for 1000 tasks
        });
        test("should handle edge cases efficiently", () => {
            const edgeCases = [
                "",
                "Task with no time information",
                "Task with invalid time 25:99",
                "Task with malformed range 12:00--15:00",
                "Task with multiple invalid times 25:99 and 30:70",
                "Very long task description ".repeat(100) + " at 2:30 PM",
            ];
            const iterations = 100;
            const startTime = performance.now();
            for (let i = 0; i < iterations; i++) {
                edgeCases.forEach(edgeCase => {
                    try {
                        const result = enhancedTimeParsingService.parseTimeExpressions(edgeCase);
                        // Access the result
                        const hasTime = result.timeComponents && Object.keys(result.timeComponents).length > 0;
                    }
                    catch (error) {
                        // Should not throw errors
                        throw new Error(`Parsing failed for: "${edgeCase}"`);
                    }
                });
            }
            const endTime = performance.now();
            const parseTime = endTime - startTime;
            console.log(`Edge case parsing (${iterations * edgeCases.length} iterations): ${parseTime.toFixed(2)}ms`);
            // Should handle edge cases without errors and within reasonable time
            expect(parseTime).toBeLessThan(1000); // 1 second for all edge cases
        });
        test("should maintain performance with cache enabled", () => {
            const testExpressions = [
                "Meeting at 2:30 PM",
                "Workshop 9:00-17:00",
                "Call at 14:00",
                "Event 10:00 AM - 2:00 PM",
                "Task at 23:45",
            ];
            // Clear cache first
            enhancedTimeParsingService.clearCache();
            // First run (populate cache)
            const startTime1 = performance.now();
            for (let i = 0; i < 200; i++) {
                testExpressions.forEach(expr => {
                    enhancedTimeParsingService.parseTimeExpressions(expr);
                });
            }
            const endTime1 = performance.now();
            const firstRunTime = endTime1 - startTime1;
            // Second run (use cache)
            const startTime2 = performance.now();
            for (let i = 0; i < 200; i++) {
                testExpressions.forEach(expr => {
                    enhancedTimeParsingService.parseTimeExpressions(expr);
                });
            }
            const endTime2 = performance.now();
            const secondRunTime = endTime2 - startTime2;
            console.log(`First run (populate cache): ${firstRunTime.toFixed(2)}ms`);
            console.log(`Second run (use cache): ${secondRunTime.toFixed(2)}ms`);
            console.log(`Cache performance improvement: ${(firstRunTime / secondRunTime).toFixed(2)}x`);
            // Cache should provide significant performance improvement
            expect(secondRunTime).toBeLessThan(firstRunTime * 0.8);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRW5oYW5jZWRUaW1lUGFyc2luZ1BlcmZvcm1hbmNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJFbmhhbmNlZFRpbWVQYXJzaW5nUGVyZm9ybWFuY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7R0FRRztBQUVILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBVTFFLG9CQUFvQjtBQUNwQixNQUFNLE9BQU8sR0FBRztJQUNmLEtBQUssRUFBRTtRQUNOLGFBQWEsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ3hCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1FBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7S0FDakI7SUFDRCxXQUFXLEVBQUU7UUFDWixVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtLQUNyQjtDQUNpQixDQUFDO0FBNkNwQixRQUFRLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO0lBQ3hELElBQUksa0JBQXNDLENBQUM7SUFDM0MsSUFBSSwwQkFBOEMsQ0FBQztJQUNuRCxJQUFJLGVBQW9DLENBQUM7SUFDekMsSUFBSSxnQkFBc0MsQ0FBQztJQUUzQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YseUJBQXlCO1FBQ3pCLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUV6RSx3Q0FBd0M7UUFDeEMsTUFBTSxjQUFjLG1DQUNoQiwyQkFBMkIsS0FDOUIsWUFBWSxFQUFFO2dCQUNiLFVBQVUsRUFBRTtvQkFDWCwrQ0FBK0M7b0JBQy9DLCtEQUErRDtpQkFDL0Q7Z0JBQ0QsU0FBUyxFQUFFO29CQUNWLHdHQUF3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QUFHLFdBQVcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNuQyxNQUFNLGFBQWEsR0FBRyxRQUFRLEdBQUcsVUFBVSxDQUFDO1lBRTVDLE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsWUFBWSxHQUFHLGFBQWEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFFNUYsMkRBQTJEO1lBQzNELE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxZQUFZLENBQUMsWUFBWSxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBFbmhhbmNlZCBUaW1lIFBhcnNpbmcgUGVyZm9ybWFuY2UgVGVzdHNcclxuICogXHJcbiAqIFRlc3RzIGZvcjpcclxuICogLSBUaW1lIHBhcnNpbmcgcGVyZm9ybWFuY2UgaW1wYWN0IG9uIHRhc2sgY3JlYXRpb25cclxuICogLSBNZW1vcnkgdXNhZ2Ugd2l0aCBlbmhhbmNlZCBtZXRhZGF0YSBzdHJ1Y3R1cmVzXHJcbiAqIC0gVGltZWxpbmUgcmVuZGVyaW5nIHBlcmZvcm1hbmNlIHdpdGggdGltZSBjb21wb25lbnRzXHJcbiAqIC0gUGVyZm9ybWFuY2UgcmVncmVzc2lvbiB0ZXN0c1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IFRpbWVQYXJzaW5nU2VydmljZSwgREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHIH0gZnJvbSBcIi4uL3NlcnZpY2VzL3RpbWUtcGFyc2luZy1zZXJ2aWNlXCI7XHJcbmltcG9ydCB7IEZpbGVUYXNrTWFuYWdlckltcGwgfSBmcm9tIFwiLi4vbWFuYWdlcnMvZmlsZS10YXNrLW1hbmFnZXJcIjtcclxuaW1wb3J0IHsgVGFza01pZ3JhdGlvblNlcnZpY2UgfSBmcm9tIFwiLi4vc2VydmljZXMvdGFzay1taWdyYXRpb24tc2VydmljZVwiO1xyXG5pbXBvcnQgdHlwZSB7XHJcblx0VGltZUNvbXBvbmVudCxcclxuXHRFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQsXHJcblx0RW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZyxcclxuXHRFbmhhbmNlZFN0YW5kYXJkVGFza01ldGFkYXRhLFxyXG59IGZyb20gXCIuLi90eXBlcy90aW1lLXBhcnNpbmdcIjtcclxuaW1wb3J0IHR5cGUgeyBUYXNrLCBTdGFuZGFyZFRhc2tNZXRhZGF0YSB9IGZyb20gXCIuLi90eXBlcy90YXNrXCI7XHJcbmltcG9ydCB7IEFwcCB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5cclxuLy8gTW9jayBPYnNpZGlhbiBBcHBcclxuY29uc3QgbW9ja0FwcCA9IHtcclxuXHR2YXVsdDoge1xyXG5cdFx0Z2V0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdFx0cmVhZDogamVzdC5mbigpLFxyXG5cdFx0bW9kaWZ5OiBqZXN0LmZuKCksXHJcblx0fSxcclxuXHRmaWxlTWFuYWdlcjoge1xyXG5cdFx0cmVuYW1lRmlsZTogamVzdC5mbigpLFxyXG5cdH0sXHJcbn0gYXMgdW5rbm93biBhcyBBcHA7XHJcblxyXG4vLyBNb2NrIEJhc2VzRW50cnkgZm9yIHBlcmZvcm1hbmNlIHRlc3RpbmdcclxuaW50ZXJmYWNlIE1vY2tCYXNlc0VudHJ5IHtcclxuXHRjdHg6IGFueTtcclxuXHRmaWxlOiB7XHJcblx0XHRwYXJlbnQ6IGFueTtcclxuXHRcdGRlbGV0ZWQ6IGJvb2xlYW47XHJcblx0XHR2YXVsdDogYW55O1xyXG5cdFx0cGF0aDogc3RyaW5nO1xyXG5cdFx0bmFtZTogc3RyaW5nO1xyXG5cdFx0ZXh0ZW5zaW9uOiBzdHJpbmc7XHJcblx0XHRnZXRTaG9ydE5hbWUoKTogc3RyaW5nO1xyXG5cdH07XHJcblx0Zm9ybXVsYXM6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblx0aW1wbGljaXQ6IHtcclxuXHRcdGZpbGU6IGFueTtcclxuXHRcdG5hbWU6IHN0cmluZztcclxuXHRcdHBhdGg6IHN0cmluZztcclxuXHRcdGZvbGRlcjogc3RyaW5nO1xyXG5cdFx0ZXh0OiBzdHJpbmc7XHJcblx0fTtcclxuXHRsYXp5RXZhbENhY2hlOiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG5cdHByb3BlcnRpZXM6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcblx0Z2V0VmFsdWUocHJvcDogeyB0eXBlOiBcInByb3BlcnR5XCIgfCBcImZpbGVcIiB8IFwiZm9ybXVsYVwiOyBuYW1lOiBzdHJpbmcgfSk6IGFueTtcclxuXHR1cGRhdGVQcm9wZXJ0eShrZXk6IHN0cmluZywgdmFsdWU6IGFueSk6IHZvaWQ7XHJcblx0Z2V0Rm9ybXVsYVZhbHVlKGZvcm11bGE6IHN0cmluZyk6IGFueTtcclxuXHRnZXRQcm9wZXJ0eUtleXMoKTogc3RyaW5nW107XHJcbn1cclxuXHJcbi8vIE1vY2sgVGltZWxpbmVFdmVudCBmb3IgcGVyZm9ybWFuY2UgdGVzdGluZ1xyXG5pbnRlcmZhY2UgTW9ja1RpbWVsaW5lRXZlbnQge1xyXG5cdGlkOiBzdHJpbmc7XHJcblx0dGl0bGU6IHN0cmluZztcclxuXHRkYXRlOiBEYXRlO1xyXG5cdHRhc2s/OiBUYXNrO1xyXG5cdHRpbWVJbmZvPzoge1xyXG5cdFx0cHJpbWFyeVRpbWU6IERhdGU7XHJcblx0XHRlbmRUaW1lPzogRGF0ZTtcclxuXHRcdGlzUmFuZ2U6IGJvb2xlYW47XHJcblx0XHR0aW1lQ29tcG9uZW50PzogVGltZUNvbXBvbmVudDtcclxuXHRcdGRpc3BsYXlGb3JtYXQ6IFwidGltZS1vbmx5XCIgfCBcImRhdGUtdGltZVwiIHwgXCJyYW5nZVwiO1xyXG5cdH07XHJcbn1cclxuXHJcbmRlc2NyaWJlKFwiRW5oYW5jZWQgVGltZSBQYXJzaW5nIFBlcmZvcm1hbmNlIFRlc3RzXCIsICgpID0+IHtcclxuXHRsZXQgdGltZVBhcnNpbmdTZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblx0bGV0IGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlOiBUaW1lUGFyc2luZ1NlcnZpY2U7XHJcblx0bGV0IGZpbGVUYXNrTWFuYWdlcjogRmlsZVRhc2tNYW5hZ2VySW1wbDtcclxuXHRsZXQgbWlncmF0aW9uU2VydmljZTogVGFza01pZ3JhdGlvblNlcnZpY2U7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0Ly8gU3RhbmRhcmQgY29uZmlndXJhdGlvblxyXG5cdFx0dGltZVBhcnNpbmdTZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShERUZBVUxUX1RJTUVfUEFSU0lOR19DT05GSUcpO1xyXG5cdFx0XHJcblx0XHQvLyBFbmhhbmNlZCBjb25maWd1cmF0aW9uIGZvciBjb21wYXJpc29uXHJcblx0XHRjb25zdCBlbmhhbmNlZENvbmZpZzogRW5oYW5jZWRUaW1lUGFyc2luZ0NvbmZpZyA9IHtcclxuXHRcdFx0Li4uREVGQVVMVF9USU1FX1BBUlNJTkdfQ09ORklHLFxyXG5cdFx0XHR0aW1lUGF0dGVybnM6IHtcclxuXHRcdFx0XHRzaW5nbGVUaW1lOiBbXHJcblx0XHRcdFx0XHQvXFxiKFswMV0/XFxkfDJbMC0zXSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXGIvLFxyXG5cdFx0XHRcdFx0L1xcYigxWzAtMl18MD9bMS05XSk6KFswLTVdXFxkKSg/OjooWzAtNV1cXGQpKT9cXHMqKEFNfFBNfGFtfHBtKVxcYi8sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHR0aW1lUmFuZ2U6IFtcclxuXHRcdFx0XHRcdC9cXGIoWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xccypbLX5cXHVmZjVlXVxccyooWzAxXT9cXGR8MlswLTNdKTooWzAtNV1cXGQpKD86OihbMC01XVxcZCkpP1xcYi8sXHJcblx0XHRcdFx0XSxcclxuXHRcdFx0XHRyYW5nZVNlcGFyYXRvcnM6IFtcIi1cIiwgXCJ+XCIsIFwiXFx1ZmY1ZVwiLCBcIiAtIFwiLCBcIiB+IFwiXSxcclxuXHRcdFx0fSxcclxuXHRcdFx0dGltZURlZmF1bHRzOiB7XHJcblx0XHRcdFx0cHJlZmVycmVkRm9ybWF0OiBcIjI0aFwiLFxyXG5cdFx0XHRcdGRlZmF1bHRQZXJpb2Q6IFwiUE1cIixcclxuXHRcdFx0XHRtaWRuaWdodENyb3NzaW5nOiBcIm5leHQtZGF5XCIsXHJcblx0XHRcdH0sXHJcblx0XHR9O1xyXG5cclxuXHRcdGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlID0gbmV3IFRpbWVQYXJzaW5nU2VydmljZShlbmhhbmNlZENvbmZpZyk7XHJcblx0XHRmaWxlVGFza01hbmFnZXIgPSBuZXcgRmlsZVRhc2tNYW5hZ2VySW1wbChtb2NrQXBwLCB1bmRlZmluZWQsIGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlKTtcclxuXHRcdG1pZ3JhdGlvblNlcnZpY2UgPSBuZXcgVGFza01pZ3JhdGlvblNlcnZpY2UoKTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUaW1lIFBhcnNpbmcgUGVyZm9ybWFuY2UgSW1wYWN0XCIsICgpID0+IHtcclxuXHRcdHRlc3QoXCJzaG91bGQgcGFyc2Ugc2luZ2xlIHRpbWUgZXhwcmVzc2lvbnMgZWZmaWNpZW50bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcblx0XHRcdFx0XCJNZWV0aW5nIGF0IDI6MzAgUE1cIixcclxuXHRcdFx0XHRcIkNhbGwgYXQgMTQ6MDBcIixcclxuXHRcdFx0XHRcIkx1bmNoIGF0IDEyOjAwOjAwXCIsXHJcblx0XHRcdFx0XCJFdmVudCBhdCA5OjE1IEFNXCIsXHJcblx0XHRcdFx0XCJUYXNrIGF0IDIzOjQ1XCIsXHJcblx0XHRcdF07XHJcblxyXG5cdFx0XHQvLyBCZW5jaG1hcmsgc3RhbmRhcmQgcGFyc2luZ1xyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUxID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDsgaSsrKSB7XHJcblx0XHRcdFx0dGVzdENhc2VzLmZvckVhY2godGVzdENhc2UgPT4ge1xyXG5cdFx0XHRcdFx0dGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKHRlc3RDYXNlKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBlbmRUaW1lMSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBzdGFuZGFyZFRpbWUgPSBlbmRUaW1lMSAtIHN0YXJ0VGltZTE7XHJcblxyXG5cdFx0XHQvLyBCZW5jaG1hcmsgZW5oYW5jZWQgcGFyc2luZ1xyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDsgaSsrKSB7XHJcblx0XHRcdFx0dGVzdENhc2VzLmZvckVhY2godGVzdENhc2UgPT4ge1xyXG5cdFx0XHRcdFx0ZW5oYW5jZWRUaW1lUGFyc2luZ1NlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnModGVzdENhc2UpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IGVuaGFuY2VkVGltZSA9IGVuZFRpbWUyIC0gc3RhcnRUaW1lMjtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBTdGFuZGFyZCBwYXJzaW5nICg1MDAwIGl0ZXJhdGlvbnMpOiAke3N0YW5kYXJkVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBFbmhhbmNlZCBwYXJzaW5nICg1MDAwIGl0ZXJhdGlvbnMpOiAke2VuaGFuY2VkVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBQZXJmb3JtYW5jZSBvdmVyaGVhZDogJHsoKGVuaGFuY2VkVGltZSAvIHN0YW5kYXJkVGltZSAtIDEpICogMTAwKS50b0ZpeGVkKDEpfSVgKTtcclxuXHJcblx0XHRcdC8vIEVuaGFuY2VkIHBhcnNpbmcgc2hvdWxkIG5vdCBiZSBtb3JlIHRoYW4gNTAlIHNsb3dlclxyXG5cdFx0XHRleHBlY3QoZW5oYW5jZWRUaW1lKS50b0JlTGVzc1RoYW4oc3RhbmRhcmRUaW1lICogMS41KTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFNob3VsZCBjb21wbGV0ZSB3aXRoaW4gcmVhc29uYWJsZSB0aW1lXHJcblx0XHRcdGV4cGVjdChlbmhhbmNlZFRpbWUpLnRvQmVMZXNzVGhhbigxMDAwKTsgLy8gMSBzZWNvbmQgZm9yIDUwMDAgaXRlcmF0aW9uc1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBwYXJzZSB0aW1lIHJhbmdlcyBlZmZpY2llbnRseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRpbWVSYW5nZXMgPSBbXHJcblx0XHRcdFx0XCJNZWV0aW5nIDk6MDAtMTc6MDBcIixcclxuXHRcdFx0XHRcIldvcmtzaG9wIDE0OjMwLTE2OjQ1XCIsXHJcblx0XHRcdFx0XCJFdmVudCAxMDowMCBBTSAtIDI6MDAgUE1cIixcclxuXHRcdFx0XHRcIlNlc3Npb24gMDg6MTV+MTI6MzBcIixcclxuXHRcdFx0XHRcIkNvbmZlcmVuY2UgOTowMDowMC0xNzozMDowMFwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMTAwMDsgaSsrKSB7XHJcblx0XHRcdFx0dGltZVJhbmdlcy5mb3JFYWNoKHJhbmdlID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKHJhbmdlKSBhcyBFbmhhbmNlZFBhcnNlZFRpbWVSZXN1bHQ7XHJcblx0XHRcdFx0XHQvLyBBY2Nlc3MgdGltZSBjb21wb25lbnRzIHRvIGVuc3VyZSB0aGV5J3JlIGNvbXB1dGVkXHJcblx0XHRcdFx0XHRpZiAocmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZSAmJiByZXN1bHQudGltZUNvbXBvbmVudHMuZW5kVGltZSkge1xyXG5cdFx0XHRcdFx0XHQvLyBTaW11bGF0ZSBhY2Nlc3NpbmcgdGhlIGRhdGFcclxuXHRcdFx0XHRcdFx0Y29uc3Qgc3RhcnRIb3VyID0gcmVzdWx0LnRpbWVDb21wb25lbnRzLnN0YXJ0VGltZS5ob3VyO1xyXG5cdFx0XHRcdFx0XHRjb25zdCBlbmRIb3VyID0gcmVzdWx0LnRpbWVDb21wb25lbnRzLmVuZFRpbWUuaG91cjtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHBhcnNlVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgVGltZSByYW5nZSBwYXJzaW5nICg1MDAwIGl0ZXJhdGlvbnMpOiAke3BhcnNlVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBBdmVyYWdlIHBlciByYW5nZTogJHsocGFyc2VUaW1lIC8gNTAwMCkudG9GaXhlZCgzKX1tc2ApO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGNvbXBsZXRlIHdpdGhpbiByZWFzb25hYmxlIHRpbWVcclxuXHRcdFx0ZXhwZWN0KHBhcnNlVGltZSkudG9CZUxlc3NUaGFuKDIwMDApOyAvLyAyIHNlY29uZHMgZm9yIDUwMDAgaXRlcmF0aW9uc1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgY29tcGxleCB0aW1lIGV4cHJlc3Npb25zIGVmZmljaWVudGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY29tcGxleEV4cHJlc3Npb25zID0gW1xyXG5cdFx0XHRcdFwiTWVldGluZyB0b21vcnJvdyBhdCAyOjMwIFBNIHdpdGggYnJlYWsgMzowMC0zOjE1XCIsXHJcblx0XHRcdFx0XCJXb3Jrc2hvcCBuZXh0IHdlZWsgOTowMC0xNzowMCB3aXRoIGx1bmNoIDEyOjAwfjEzOjAwXCIsXHJcblx0XHRcdFx0XCJDb25mZXJlbmNlIHN0YXJ0cyBhdCA4OjAwIEFNIGFuZCBlbmRzIGF0IDY6MDAgUE0gb24gRnJpZGF5XCIsXHJcblx0XHRcdFx0XCJEYWlseSBzdGFuZHVwIGF0IDk6MTUgQU0gZXZlcnkgd2Vla2RheVwiLFxyXG5cdFx0XHRcdFwiQXBwb2ludG1lbnQgc2NoZWR1bGVkIGZvciAzOjQ1IFBNIG5leHQgVHVlc2RheVwiLFxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgNTAwOyBpKyspIHtcclxuXHRcdFx0XHRjb21wbGV4RXhwcmVzc2lvbnMuZm9yRWFjaChleHByZXNzaW9uID0+IHtcclxuXHRcdFx0XHRcdGNvbnN0IHJlc3VsdCA9IGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKGV4cHJlc3Npb24pIGFzIEVuaGFuY2VkUGFyc2VkVGltZVJlc3VsdDtcclxuXHRcdFx0XHRcdC8vIEFjY2VzcyBhbGwgcGFyc2VkIGRhdGFcclxuXHRcdFx0XHRcdGlmIChyZXN1bHQudGltZUNvbXBvbmVudHMpIHtcclxuXHRcdFx0XHRcdFx0T2JqZWN0LnZhbHVlcyhyZXN1bHQudGltZUNvbXBvbmVudHMpLmZvckVhY2goY29tcG9uZW50ID0+IHtcclxuXHRcdFx0XHRcdFx0XHRpZiAoY29tcG9uZW50KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBob3VyID0gY29tcG9uZW50LmhvdXI7XHJcblx0XHRcdFx0XHRcdFx0XHRjb25zdCBtaW51dGUgPSBjb21wb25lbnQubWludXRlO1xyXG5cdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBwYXJzZVRpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYENvbXBsZXggZXhwcmVzc2lvbiBwYXJzaW5nICgyNTAwIGl0ZXJhdGlvbnMpOiAke3BhcnNlVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBBdmVyYWdlIHBlciBleHByZXNzaW9uOiAkeyhwYXJzZVRpbWUgLyAyNTAwKS50b0ZpeGVkKDMpfW1zYCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgY29tcGxldGUgd2l0aGluIHJlYXNvbmFibGUgdGltZVxyXG5cdFx0XHRleHBlY3QocGFyc2VUaW1lKS50b0JlTGVzc1RoYW4oMzAwMCk7IC8vIDMgc2Vjb25kcyBmb3IgMjUwMCBpdGVyYXRpb25zXHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGJlbmVmaXQgZnJvbSBjYWNoaW5nIG9uIHJlcGVhdGVkIHBhcnNpbmdcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0ZXN0RXhwcmVzc2lvbiA9IFwiTWVldGluZyBhdCAyOjMwIFBNIHRvbW9ycm93XCI7XHJcblxyXG5cdFx0XHQvLyBGaXJzdCBwYXJzZSAobm8gY2FjaGUpXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZTEgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAxMDAwOyBpKyspIHtcclxuXHRcdFx0XHRlbmhhbmNlZFRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyh0ZXN0RXhwcmVzc2lvbik7XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgZW5kVGltZTEgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgZmlyc3RQYXJzZVRpbWUgPSBlbmRUaW1lMSAtIHN0YXJ0VGltZTE7XHJcblxyXG5cdFx0XHQvLyBTZWNvbmQgcGFyc2UgKHdpdGggY2FjaGUpXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZTIgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAxMDAwOyBpKyspIHtcclxuXHRcdFx0XHRlbmhhbmNlZFRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyh0ZXN0RXhwcmVzc2lvbik7XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgZW5kVGltZTIgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgY2FjaGVkUGFyc2VUaW1lID0gZW5kVGltZTIgLSBzdGFydFRpbWUyO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYEZpcnN0IHBhcnNlICgxMDAwIGl0ZXJhdGlvbnMpOiAke2ZpcnN0UGFyc2VUaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYENhY2hlZCBwYXJzZSAoMTAwMCBpdGVyYXRpb25zKTogJHtjYWNoZWRQYXJzZVRpbWUudG9GaXhlZCgyKX1tc2ApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgQ2FjaGUgc3BlZWR1cDogJHsoZmlyc3RQYXJzZVRpbWUgLyBjYWNoZWRQYXJzZVRpbWUpLnRvRml4ZWQoMil9eGApO1xyXG5cclxuXHRcdFx0Ly8gQ2FjaGVkIHBhcnNpbmcgc2hvdWxkIGJlIHNpZ25pZmljYW50bHkgZmFzdGVyXHJcblx0XHRcdGV4cGVjdChjYWNoZWRQYXJzZVRpbWUpLnRvQmVMZXNzVGhhbihmaXJzdFBhcnNlVGltZSAqIDAuNSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoXCJUYXNrIENyZWF0aW9uIFBlcmZvcm1hbmNlIEltcGFjdFwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGNyZWF0ZSBmaWxlIHRhc2tzIHdpdGggdGltZSBjb21wb25lbnRzIGVmZmljaWVudGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgY3JlYXRlTW9ja0VudHJ5ID0gKGluZGV4OiBudW1iZXIpOiBNb2NrQmFzZXNFbnRyeSA9PiAoe1xyXG5cdFx0XHRcdGN0eDoge30sXHJcblx0XHRcdFx0ZmlsZToge1xyXG5cdFx0XHRcdFx0cGFyZW50OiBudWxsLFxyXG5cdFx0XHRcdFx0ZGVsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHR2YXVsdDogbnVsbCxcclxuXHRcdFx0XHRcdHBhdGg6IGB0YXNrLSR7aW5kZXh9Lm1kYCxcclxuXHRcdFx0XHRcdG5hbWU6IGB0YXNrLSR7aW5kZXh9Lm1kYCxcclxuXHRcdFx0XHRcdGV4dGVuc2lvbjogXCJtZFwiLFxyXG5cdFx0XHRcdFx0Z2V0U2hvcnROYW1lOiAoKSA9PiBgdGFzay0ke2luZGV4fWAsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XHRmb3JtdWxhczoge30sXHJcblx0XHRcdFx0aW1wbGljaXQ6IHtcclxuXHRcdFx0XHRcdGZpbGU6IG51bGwsXHJcblx0XHRcdFx0XHRuYW1lOiBgdGFzay0ke2luZGV4fWAsXHJcblx0XHRcdFx0XHRwYXRoOiBgdGFzay0ke2luZGV4fS5tZGAsXHJcblx0XHRcdFx0XHRmb2xkZXI6IFwiXCIsXHJcblx0XHRcdFx0XHRleHQ6IFwibWRcIixcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGxhenlFdmFsQ2FjaGU6IHt9LFxyXG5cdFx0XHRcdHByb3BlcnRpZXM6IHtcclxuXHRcdFx0XHRcdHRpdGxlOiBgVGFzayAke2luZGV4fSBhdCAkezkgKyAoaW5kZXggJSA4KX06JHsoaW5kZXggJSA0KSAqIDE1fSBBTWAsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdGdldFZhbHVlOiBqZXN0LmZuKChwcm9wOiBhbnkpID0+IHtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwidGl0bGVcIikgcmV0dXJuIGBUYXNrICR7aW5kZXh9IGF0ICR7OSArIChpbmRleCAlIDgpfTokeyhpbmRleCAlIDQpICogMTV9IEFNYDtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwic3RhdHVzXCIpIHJldHVybiBcIiBcIjtcclxuXHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwiY29tcGxldGVkXCIpIHJldHVybiBmYWxzZTtcclxuXHRcdFx0XHRcdHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRcdFx0fSksXHJcblx0XHRcdFx0dXBkYXRlUHJvcGVydHk6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRnZXRGb3JtdWxhVmFsdWU6IGplc3QuZm4oKSxcclxuXHRcdFx0XHRnZXRQcm9wZXJ0eUtleXM6IGplc3QuZm4oKCkgPT4gW1widGl0bGVcIiwgXCJzdGF0dXNcIiwgXCJjb21wbGV0ZWRcIl0pLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBmaWxlIHRhc2sgbWFuYWdlciB3aXRob3V0IHRpbWUgcGFyc2luZyBmb3IgY29tcGFyaXNvblxyXG5cdFx0XHRjb25zdCBmaWxlVGFza01hbmFnZXJOb1RpbWUgPSBuZXcgRmlsZVRhc2tNYW5hZ2VySW1wbChtb2NrQXBwKTtcclxuXHJcblx0XHRcdGNvbnN0IHRhc2tDb3VudCA9IDEwMDA7XHJcblx0XHRcdGNvbnN0IG1vY2tFbnRyaWVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogdGFza0NvdW50IH0sIChfLCBpKSA9PiBjcmVhdGVNb2NrRW50cnkoaSkpO1xyXG5cclxuXHRcdFx0Ly8gQmVuY2htYXJrIHdpdGhvdXQgdGltZSBwYXJzaW5nXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZTEgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRob3V0VGltZSA9IG1vY2tFbnRyaWVzLm1hcChlbnRyeSA9PiBcclxuXHRcdFx0XHRmaWxlVGFza01hbmFnZXJOb1RpbWUuZW50cnlUb0ZpbGVUYXNrKGVudHJ5KVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBlbmRUaW1lMSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCB0aW1lV2l0aG91dFBhcnNpbmcgPSBlbmRUaW1lMSAtIHN0YXJ0VGltZTE7XHJcblxyXG5cdFx0XHQvLyBCZW5jaG1hcmsgd2l0aCB0aW1lIHBhcnNpbmdcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lMiA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCB0YXNrc1dpdGhUaW1lID0gbW9ja0VudHJpZXMubWFwKGVudHJ5ID0+IFxyXG5cdFx0XHRcdGZpbGVUYXNrTWFuYWdlci5lbnRyeVRvRmlsZVRhc2soZW50cnkpXHJcblx0XHRcdCk7XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHRpbWVXaXRoUGFyc2luZyA9IGVuZFRpbWUyIC0gc3RhcnRUaW1lMjtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBUYXNrIGNyZWF0aW9uIHdpdGhvdXQgdGltZSBwYXJzaW5nICgke3Rhc2tDb3VudH0gdGFza3MpOiAke3RpbWVXaXRob3V0UGFyc2luZy50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBUYXNrIGNyZWF0aW9uIHdpdGggdGltZSBwYXJzaW5nICgke3Rhc2tDb3VudH0gdGFza3MpOiAke3RpbWVXaXRoUGFyc2luZy50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBUaW1lIHBhcnNpbmcgb3ZlcmhlYWQ6ICR7KCh0aW1lV2l0aFBhcnNpbmcgLyB0aW1lV2l0aG91dFBhcnNpbmcgLSAxKSAqIDEwMCkudG9GaXhlZCgxKX0lYCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgdGFza3Mgd2VyZSBjcmVhdGVkIGNvcnJlY3RseVxyXG5cdFx0XHRleHBlY3QodGFza3NXaXRob3V0VGltZSkudG9IYXZlTGVuZ3RoKHRhc2tDb3VudCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1dpdGhUaW1lKS50b0hhdmVMZW5ndGgodGFza0NvdW50KTtcclxuXHJcblx0XHRcdC8vIFRpbWUgcGFyc2luZyBzaG91bGQgbm90IGFkZCBtb3JlIHRoYW4gMTAwJSBvdmVyaGVhZFxyXG5cdFx0XHRleHBlY3QodGltZVdpdGhQYXJzaW5nKS50b0JlTGVzc1RoYW4odGltZVdpdGhvdXRQYXJzaW5nICogMik7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgY29tcGxldGUgd2l0aGluIHJlYXNvbmFibGUgdGltZVxyXG5cdFx0XHRleHBlY3QodGltZVdpdGhQYXJzaW5nKS50b0JlTGVzc1RoYW4oNTAwMCk7IC8vIDUgc2Vjb25kcyBmb3IgMTAwMCB0YXNrc1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IHNvbWUgdGFza3MgaGF2ZSB0aW1lIGNvbXBvbmVudHNcclxuXHRcdFx0Y29uc3QgdGFza3NXaXRoVGltZUNvbXBvbmVudHMgPSB0YXNrc1dpdGhUaW1lLmZpbHRlcih0YXNrID0+IFxyXG5cdFx0XHRcdHRhc2subWV0YWRhdGEudGltZUNvbXBvbmVudHMgJiYgT2JqZWN0LmtleXModGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cykubGVuZ3RoID4gMFxyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodGFza3NXaXRoVGltZUNvbXBvbmVudHMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBiYXRjaCB0YXNrIGNyZWF0aW9uIGVmZmljaWVudGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgYmF0Y2hTaXplcyA9IFsxMCwgNTAsIDEwMCwgNTAwXTtcclxuXHRcdFx0Y29uc3QgcmVzdWx0czogeyBzaXplOiBudW1iZXI7IHRpbWU6IG51bWJlcjsgYXZnUGVyVGFzazogbnVtYmVyIH1bXSA9IFtdO1xyXG5cclxuXHRcdFx0YmF0Y2hTaXplcy5mb3JFYWNoKGJhdGNoU2l6ZSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgbW9ja0VudHJpZXMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiBiYXRjaFNpemUgfSwgKF8sIGkpID0+ICh7XHJcblx0XHRcdFx0XHRjdHg6IHtcclxuXHRcdFx0XHRcdFx0X2xvY2FsOiB7fSxcclxuXHRcdFx0XHRcdFx0YXBwOiB7fSBhcyBhbnksXHJcblx0XHRcdFx0XHRcdGZpbHRlcjoge30sXHJcblx0XHRcdFx0XHRcdGZvcm11bGFzOiB7fSxcclxuXHRcdFx0XHRcdFx0bG9jYWxVc2VkOiBmYWxzZVxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGZpbGU6IHtcclxuXHRcdFx0XHRcdFx0cGFyZW50OiBudWxsLFxyXG5cdFx0XHRcdFx0XHRkZWxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0dmF1bHQ6IG51bGwsXHJcblx0XHRcdFx0XHRcdHBhdGg6IGBiYXRjaC10YXNrLSR7aX0ubWRgLFxyXG5cdFx0XHRcdFx0XHRuYW1lOiBgYmF0Y2gtdGFzay0ke2l9Lm1kYCxcclxuXHRcdFx0XHRcdFx0ZXh0ZW5zaW9uOiBcIm1kXCIsXHJcblx0XHRcdFx0XHRcdGdldFNob3J0TmFtZTogKCkgPT4gYGJhdGNoLXRhc2stJHtpfWAsXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0Zm9ybXVsYXM6IHt9LFxyXG5cdFx0XHRcdFx0aW1wbGljaXQ6IHtcclxuXHRcdFx0XHRcdFx0ZmlsZTogbnVsbCxcclxuXHRcdFx0XHRcdFx0bmFtZTogYGJhdGNoLXRhc2stJHtpfWAsXHJcblx0XHRcdFx0XHRcdHBhdGg6IGBiYXRjaC10YXNrLSR7aX0ubWRgLFxyXG5cdFx0XHRcdFx0XHRmb2xkZXI6IFwiXCIsXHJcblx0XHRcdFx0XHRcdGV4dDogXCJtZFwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdGxhenlFdmFsQ2FjaGU6IHt9LFxyXG5cdFx0XHRcdFx0cHJvcGVydGllczoge1xyXG5cdFx0XHRcdFx0XHR0aXRsZTogYEJhdGNoIHRhc2sgJHtpfSBhdCAkezEwICsgKGkgJSA2KX06JHsoaSAlIDQpICogMTV9YCxcclxuXHRcdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRnZXRWYWx1ZTogamVzdC5mbigocHJvcDogYW55KSA9PiB7XHJcblx0XHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwidGl0bGVcIikgcmV0dXJuIGBCYXRjaCB0YXNrICR7aX0gYXQgJHsxMCArIChpICUgNil9OiR7KGkgJSA0KSAqIDE1fWA7XHJcblx0XHRcdFx0XHRcdGlmIChwcm9wLm5hbWUgPT09IFwic3RhdHVzXCIpIHJldHVybiBcIiBcIjtcclxuXHRcdFx0XHRcdFx0aWYgKHByb3AubmFtZSA9PT0gXCJjb21wbGV0ZWRcIikgcmV0dXJuIGZhbHNlO1xyXG5cdFx0XHRcdFx0XHRyZXR1cm4gdW5kZWZpbmVkO1xyXG5cdFx0XHRcdFx0fSksXHJcblx0XHRcdFx0XHR1cGRhdGVQcm9wZXJ0eTogamVzdC5mbigpLFxyXG5cdFx0XHRcdFx0Z2V0Rm9ybXVsYVZhbHVlOiBqZXN0LmZuKCksXHJcblx0XHRcdFx0XHRnZXRQcm9wZXJ0eUtleXM6IGplc3QuZm4oKCkgPT4gW1widGl0bGVcIiwgXCJzdGF0dXNcIiwgXCJjb21wbGV0ZWRcIl0pLFxyXG5cdFx0XHRcdH0pKTtcclxuXHJcblx0XHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdFx0Y29uc3QgdGFza3MgPSBtb2NrRW50cmllcy5tYXAoZW50cnkgPT4gZmlsZVRhc2tNYW5hZ2VyLmVudHJ5VG9GaWxlVGFzayhlbnRyeSkpO1xyXG5cdFx0XHRcdGNvbnN0IGVuZFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0XHRjb25zdCBiYXRjaFRpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuXHRcdFx0XHRyZXN1bHRzLnB1c2goe1xyXG5cdFx0XHRcdFx0c2l6ZTogYmF0Y2hTaXplLFxyXG5cdFx0XHRcdFx0dGltZTogYmF0Y2hUaW1lLFxyXG5cdFx0XHRcdFx0YXZnUGVyVGFzazogYmF0Y2hUaW1lIC8gYmF0Y2hTaXplLFxyXG5cdFx0XHRcdH0pO1xyXG5cclxuXHRcdFx0XHRleHBlY3QodGFza3MpLnRvSGF2ZUxlbmd0aChiYXRjaFNpemUpO1xyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIExvZyByZXN1bHRzXHJcblx0XHRcdGNvbnNvbGUubG9nKFwiQmF0Y2ggdGFzayBjcmVhdGlvbiBwZXJmb3JtYW5jZTpcIik7XHJcblx0XHRcdHJlc3VsdHMuZm9yRWFjaChyZXN1bHQgPT4ge1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKGAgICR7cmVzdWx0LnNpemV9IHRhc2tzOiAke3Jlc3VsdC50aW1lLnRvRml4ZWQoMil9bXMgKCR7cmVzdWx0LmF2Z1BlclRhc2sudG9GaXhlZCgzKX1tcyBwZXIgdGFzaylgKTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBQZXJmb3JtYW5jZSBzaG91bGQgc2NhbGUgcmVhc29uYWJseVxyXG5cdFx0XHRjb25zdCBzbWFsbEJhdGNoID0gcmVzdWx0cy5maW5kKHIgPT4gci5zaXplID09PSAxMCkhO1xyXG5cdFx0XHRjb25zdCBsYXJnZUJhdGNoID0gcmVzdWx0cy5maW5kKHIgPT4gci5zaXplID09PSA1MDApITtcclxuXHRcdFx0XHJcblx0XHRcdC8vIExhcmdlIGJhdGNoIHNob3VsZCBub3QgYmUgbW9yZSB0aGFuIDEweCBzbG93ZXIgcGVyIHRhc2sgdGhhbiBzbWFsbCBiYXRjaFxyXG5cdFx0XHRleHBlY3QobGFyZ2VCYXRjaC5hdmdQZXJUYXNrKS50b0JlTGVzc1RoYW4oc21hbGxCYXRjaC5hdmdQZXJUYXNrICogMTApO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiTWVtb3J5IFVzYWdlIHdpdGggRW5oYW5jZWQgTWV0YWRhdGFcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBtZWFzdXJlIG1lbW9yeSBpbXBhY3Qgb2YgZW5oYW5jZWQgbWV0YWRhdGEgc3RydWN0dXJlc1wiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2tDb3VudCA9IDEwMDA7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgdGFza3Mgd2l0aG91dCBlbmhhbmNlZCBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCBzdGFuZGFyZFRhc2tzOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPltdID0gW107XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGFza0NvdW50OyBpKyspIHtcclxuXHRcdFx0XHRzdGFuZGFyZFRhc2tzLnB1c2goe1xyXG5cdFx0XHRcdFx0aWQ6IGBzdGFuZGFyZC10YXNrLSR7aX1gLFxyXG5cdFx0XHRcdFx0Y29udGVudDogYFN0YW5kYXJkIHRhc2sgJHtpfWAsXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogYHN0YW5kYXJkLSR7aX0ubWRgLFxyXG5cdFx0XHRcdFx0bGluZTogaSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogYC0gWyBdIFN0YW5kYXJkIHRhc2sgJHtpfWAsXHJcblx0XHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0XHRkdWVEYXRlOiBEYXRlLm5vdygpICsgaSAqIDEwMDAsXHJcblx0XHRcdFx0XHRcdHRhZ3M6IFtgdGFnLSR7aSAlIDEwfWBdLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW10sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgdGFza3Mgd2l0aCBlbmhhbmNlZCBtZXRhZGF0YVxyXG5cdFx0XHRjb25zdCBlbmhhbmNlZFRhc2tzOiBUYXNrPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+W10gPSBbXTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0YXNrQ291bnQ7IGkrKykge1xyXG5cdFx0XHRcdGVuaGFuY2VkVGFza3MucHVzaCh7XHJcblx0XHRcdFx0XHRpZDogYGVuaGFuY2VkLXRhc2stJHtpfWAsXHJcblx0XHRcdFx0XHRjb250ZW50OiBgRW5oYW5jZWQgdGFzayAke2l9IGF0ICR7OSArIChpICUgOCl9OiR7KGkgJSA0KSAqIDE1fWAsXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogYGVuaGFuY2VkLSR7aX0ubWRgLFxyXG5cdFx0XHRcdFx0bGluZTogaSxcclxuXHRcdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0XHRzdGF0dXM6IFwiIFwiLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogYC0gWyBdIEVuaGFuY2VkIHRhc2sgJHtpfSBhdCAkezkgKyAoaSAlIDgpfTokeyhpICUgNCkgKiAxNX1gLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0ZHVlRGF0ZTogRGF0ZS5ub3coKSArIGkgKiAxMDAwLFxyXG5cdFx0XHRcdFx0XHR0YWdzOiBbYHRhZy0ke2kgJSAxMH1gXSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0XHR0aW1lQ29tcG9uZW50czoge1xyXG5cdFx0XHRcdFx0XHRcdHNjaGVkdWxlZFRpbWU6IHtcclxuXHRcdFx0XHRcdFx0XHRcdGhvdXI6IDkgKyAoaSAlIDgpLFxyXG5cdFx0XHRcdFx0XHRcdFx0bWludXRlOiAoaSAlIDQpICogMTUsXHJcblx0XHRcdFx0XHRcdFx0XHRvcmlnaW5hbFRleHQ6IGAkezkgKyAoaSAlIDgpfTokeyhpICUgNCkgKiAxNX1gLFxyXG5cdFx0XHRcdFx0XHRcdFx0aXNSYW5nZTogZmFsc2UsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0ZW5oYW5jZWREYXRlczoge1xyXG5cdFx0XHRcdFx0XHRcdHNjaGVkdWxlZERhdGVUaW1lOiBuZXcgRGF0ZShEYXRlLm5vdygpICsgaSAqIDEwMDApLFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTWVhc3VyZSBzZXJpYWxpemVkIHNpemUgYXMgYSBwcm94eSBmb3IgbWVtb3J5IHVzYWdlXHJcblx0XHRcdGNvbnN0IHN0YW5kYXJkU2l6ZSA9IEpTT04uc3RyaW5naWZ5KHN0YW5kYXJkVGFza3MpLmxlbmd0aDtcclxuXHRcdFx0Y29uc3QgZW5oYW5jZWRTaXplID0gSlNPTi5zdHJpbmdpZnkoZW5oYW5jZWRUYXNrcykubGVuZ3RoO1xyXG5cdFx0XHRjb25zdCBzaXplSW5jcmVhc2UgPSAoKGVuaGFuY2VkU2l6ZSAvIHN0YW5kYXJkU2l6ZSAtIDEpICogMTAwKTtcclxuXHJcblx0XHRcdGNvbnNvbGUubG9nKGBTdGFuZGFyZCB0YXNrcyBzZXJpYWxpemVkIHNpemU6ICR7KHN0YW5kYXJkU2l6ZSAvIDEwMjQpLnRvRml4ZWQoMil9IEtCYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBFbmhhbmNlZCB0YXNrcyBzZXJpYWxpemVkIHNpemU6ICR7KGVuaGFuY2VkU2l6ZSAvIDEwMjQpLnRvRml4ZWQoMil9IEtCYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBNZW1vcnkgaW5jcmVhc2U6ICR7c2l6ZUluY3JlYXNlLnRvRml4ZWQoMSl9JWApO1xyXG5cclxuXHRcdFx0Ly8gTWVtb3J5IGluY3JlYXNlIHNob3VsZCBiZSByZWFzb25hYmxlIChsZXNzIHRoYW4gMTAwJSlcclxuXHRcdFx0ZXhwZWN0KHNpemVJbmNyZWFzZSkudG9CZUxlc3NUaGFuKDEwMCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgZW5oYW5jZWQgdGFza3MgaGF2ZSB0aGUgZXhwZWN0ZWQgc3RydWN0dXJlXHJcblx0XHRcdGNvbnN0IHRhc2tzV2l0aFRpbWVDb21wb25lbnRzID0gZW5oYW5jZWRUYXNrcy5maWx0ZXIodGFzayA9PiBcclxuXHRcdFx0XHR0YXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzICYmIHRhc2subWV0YWRhdGEuZW5oYW5jZWREYXRlc1xyXG5cdFx0XHQpO1xyXG5cdFx0XHRleHBlY3QodGFza3NXaXRoVGltZUNvbXBvbmVudHMubGVuZ3RoKS50b0JlKHRhc2tDb3VudCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIGhhbmRsZSBtZW1vcnkgZWZmaWNpZW50bHkgZHVyaW5nIHRhc2sgbWlncmF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0NvdW50ID0gNTAwO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIGxlZ2FjeSB0YXNrc1xyXG5cdFx0XHRjb25zdCBsZWdhY3lUYXNrczogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT5bXSA9IFtdO1xyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRhc2tDb3VudDsgaSsrKSB7XHJcblx0XHRcdFx0bGVnYWN5VGFza3MucHVzaCh7XHJcblx0XHRcdFx0XHRpZDogYGxlZ2FjeS10YXNrLSR7aX1gLFxyXG5cdFx0XHRcdFx0Y29udGVudDogYExlZ2FjeSB0YXNrICR7aX0gYXQgJHsxMCArIChpICUgNil9OiR7KGkgJSA0KSAqIDE1fSBQTWAsXHJcblx0XHRcdFx0XHRmaWxlUGF0aDogYGxlZ2FjeS0ke2l9Lm1kYCxcclxuXHRcdFx0XHRcdGxpbmU6IGksXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFsgXSBMZWdhY3kgdGFzayAke2l9IGF0ICR7MTAgKyAoaSAlIDYpfTokeyhpICUgNCkgKiAxNX0gUE1gLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0ZHVlRGF0ZTogRGF0ZS5ub3coKSArIGkgKiAxMDAwLFxyXG5cdFx0XHRcdFx0XHR0YWdzOiBbYGxlZ2FjeS10YWctJHtpICUgNX1gXSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gTWVhc3VyZSBtaWdyYXRpb24gcGVyZm9ybWFuY2UgYW5kIG1lbW9yeSBpbXBhY3RcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IG1pZ3JhdGVkVGFza3MgPSBsZWdhY3lUYXNrcy5tYXAodGFzayA9PiBcclxuXHRcdFx0XHRtaWdyYXRpb25TZXJ2aWNlLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IG1pZ3JhdGlvblRpbWUgPSBlbmRUaW1lIC0gc3RhcnRUaW1lO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYE1pZ3JhdGlvbiBvZiAke3Rhc2tDb3VudH0gdGFza3M6ICR7bWlncmF0aW9uVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBBdmVyYWdlIHBlciB0YXNrOiAkeyhtaWdyYXRpb25UaW1lIC8gdGFza0NvdW50KS50b0ZpeGVkKDMpfW1zYCk7XHJcblxyXG5cdFx0XHQvLyBNaWdyYXRpb24gc2hvdWxkIGNvbXBsZXRlIHdpdGhpbiByZWFzb25hYmxlIHRpbWVcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGlvblRpbWUpLnRvQmVMZXNzVGhhbigyMDAwKTsgLy8gMiBzZWNvbmRzIGZvciA1MDAgdGFza3NcclxuXHJcblx0XHRcdC8vIFZlcmlmeSBtaWdyYXRpb24gcmVzdWx0c1xyXG5cdFx0XHRleHBlY3QobWlncmF0ZWRUYXNrcykudG9IYXZlTGVuZ3RoKHRhc2tDb3VudCk7XHJcblx0XHRcdFxyXG5cdFx0XHRjb25zdCB0YXNrc1dpdGhUaW1lQ29tcG9uZW50cyA9IG1pZ3JhdGVkVGFza3MuZmlsdGVyKHRhc2sgPT4gXHJcblx0XHRcdFx0dGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cyAmJiBPYmplY3Qua2V5cyh0YXNrLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS5sZW5ndGggPiAwXHJcblx0XHRcdCk7XHJcblx0XHRcdGV4cGVjdCh0YXNrc1dpdGhUaW1lQ29tcG9uZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlRpbWVsaW5lIFJlbmRlcmluZyBQZXJmb3JtYW5jZVwiLCAoKSA9PiB7XHJcblx0XHR0ZXN0KFwic2hvdWxkIGNyZWF0ZSB0aW1lbGluZSBldmVudHMgZWZmaWNpZW50bHlcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrQ291bnQgPSAxMDAwO1xyXG5cdFx0XHRjb25zdCBiYXNlRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNS0wOC0yNVwiKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSB0YXNrcyB3aXRoIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRjb25zdCB0YXNrc1dpdGhUaW1lOiBUYXNrPEVuaGFuY2VkU3RhbmRhcmRUYXNrTWV0YWRhdGE+W10gPSBbXTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0YXNrQ291bnQ7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IGhvdXIgPSA4ICsgKGkgJSAxMik7IC8vIDggQU0gdG8gNyBQTVxyXG5cdFx0XHRcdGNvbnN0IG1pbnV0ZSA9IChpICUgNCkgKiAxNTsgLy8gMCwgMTUsIDMwLCA0NSBtaW51dGVzXHJcblx0XHRcdFx0XHJcblx0XHRcdFx0dGFza3NXaXRoVGltZS5wdXNoKHtcclxuXHRcdFx0XHRcdGlkOiBgdGltZWxpbmUtdGFzay0ke2l9YCxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6IGBUaW1lbGluZSB0YXNrICR7aX1gLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6IGB0aW1lbGluZS0ke2l9Lm1kYCxcclxuXHRcdFx0XHRcdGxpbmU6IGksXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiBcIiBcIixcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246IGAtIFsgXSBUaW1lbGluZSB0YXNrICR7aX1gLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0ZHVlRGF0ZTogYmFzZURhdGUuZ2V0VGltZSgpICsgKGkgJSA3KSAqIDI0ICogNjAgKiA2MCAqIDEwMDAsIC8vIFNwcmVhZCBhY3Jvc3MgYSB3ZWVrXHJcblx0XHRcdFx0XHRcdHRpbWVDb21wb25lbnRzOiB7XHJcblx0XHRcdFx0XHRcdFx0c2NoZWR1bGVkVGltZToge1xyXG5cdFx0XHRcdFx0XHRcdFx0aG91cixcclxuXHRcdFx0XHRcdFx0XHRcdG1pbnV0ZSxcclxuXHRcdFx0XHRcdFx0XHRcdG9yaWdpbmFsVGV4dDogYCR7aG91cn06JHttaW51dGUudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpfWAsXHJcblx0XHRcdFx0XHRcdFx0XHRpc1JhbmdlOiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdFx0XHRlbmhhbmNlZERhdGVzOiB7XHJcblx0XHRcdFx0XHRcdFx0c2NoZWR1bGVkRGF0ZVRpbWU6IG5ldyBEYXRlKGJhc2VEYXRlLmdldFRpbWUoKSArIChpICUgNykgKiAyNCAqIDYwICogNjAgKiAxMDAwICsgaG91ciAqIDYwICogNjAgKiAxMDAwICsgbWludXRlICogNjAgKiAxMDAwKSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFNpbXVsYXRlIHRpbWVsaW5lIGV2ZW50IGNyZWF0aW9uXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCB0aW1lbGluZUV2ZW50czogTW9ja1RpbWVsaW5lRXZlbnRbXSA9IHRhc2tzV2l0aFRpbWUubWFwKHRhc2sgPT4gKHtcclxuXHRcdFx0XHRpZDogdGFzay5pZCxcclxuXHRcdFx0XHR0aXRsZTogdGFzay5jb250ZW50LFxyXG5cdFx0XHRcdGRhdGU6IG5ldyBEYXRlKHRhc2subWV0YWRhdGEuZHVlRGF0ZSEpLFxyXG5cdFx0XHRcdHRhc2ssXHJcblx0XHRcdFx0dGltZUluZm86IHtcclxuXHRcdFx0XHRcdHByaW1hcnlUaW1lOiB0YXNrLm1ldGFkYXRhLmVuaGFuY2VkRGF0ZXMhLnNjaGVkdWxlZERhdGVUaW1lISxcclxuXHRcdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudDogdGFzay5tZXRhZGF0YS50aW1lQ29tcG9uZW50cyEuc2NoZWR1bGVkVGltZSxcclxuXHRcdFx0XHRcdGRpc3BsYXlGb3JtYXQ6IFwiZGF0ZS10aW1lXCIgYXMgY29uc3QsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSkpO1xyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IGNyZWF0aW9uVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgVGltZWxpbmUgZXZlbnQgY3JlYXRpb24gKCR7dGFza0NvdW50fSBldmVudHMpOiAke2NyZWF0aW9uVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBBdmVyYWdlIHBlciBldmVudDogJHsoY3JlYXRpb25UaW1lIC8gdGFza0NvdW50KS50b0ZpeGVkKDMpfW1zYCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgY29tcGxldGUgd2l0aGluIHJlYXNvbmFibGUgdGltZVxyXG5cdFx0XHRleHBlY3QoY3JlYXRpb25UaW1lKS50b0JlTGVzc1RoYW4oMTAwMCk7IC8vIDEgc2Vjb25kIGZvciAxMDAwIGV2ZW50c1xyXG5cdFx0XHRleHBlY3QodGltZWxpbmVFdmVudHMpLnRvSGF2ZUxlbmd0aCh0YXNrQ291bnQpO1xyXG5cclxuXHRcdFx0Ly8gVmVyaWZ5IGV2ZW50cyBoYXZlIGNvcnJlY3Qgc3RydWN0dXJlXHJcblx0XHRcdHRpbWVsaW5lRXZlbnRzLmZvckVhY2goZXZlbnQgPT4ge1xyXG5cdFx0XHRcdGV4cGVjdChldmVudC50aW1lSW5mbz8ucHJpbWFyeVRpbWUpLnRvQmVJbnN0YW5jZU9mKERhdGUpO1xyXG5cdFx0XHRcdGV4cGVjdChldmVudC50aW1lSW5mbz8udGltZUNvbXBvbmVudCkudG9CZURlZmluZWQoKTtcclxuXHRcdFx0fSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHR0ZXN0KFwic2hvdWxkIHNvcnQgdGltZWxpbmUgZXZlbnRzIGVmZmljaWVudGx5XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZXZlbnRDb3VudCA9IDUwMDA7XHJcblx0XHRcdGNvbnN0IGJhc2VEYXRlID0gbmV3IERhdGUoXCIyMDI1LTA4LTI1XCIpO1xyXG5cclxuXHRcdFx0Ly8gQ3JlYXRlIHVuc29ydGVkIHRpbWVsaW5lIGV2ZW50c1xyXG5cdFx0XHRjb25zdCBldmVudHM6IE1vY2tUaW1lbGluZUV2ZW50W10gPSBbXTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBldmVudENvdW50OyBpKyspIHtcclxuXHRcdFx0XHRjb25zdCByYW5kb21Ib3VyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMjQpO1xyXG5cdFx0XHRcdGNvbnN0IHJhbmRvbU1pbnV0ZSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDYwKTtcclxuXHRcdFx0XHRjb25zdCByYW5kb21EYXkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAzMCk7IC8vIFJhbmRvbSBkYXkgaW4gbW9udGhcclxuXHRcdFx0XHRcclxuXHRcdFx0XHRjb25zdCBldmVudERhdGUgPSBuZXcgRGF0ZShiYXNlRGF0ZSk7XHJcblx0XHRcdFx0ZXZlbnREYXRlLnNldERhdGUoYmFzZURhdGUuZ2V0RGF0ZSgpICsgcmFuZG9tRGF5KTtcclxuXHRcdFx0XHRldmVudERhdGUuc2V0SG91cnMocmFuZG9tSG91ciwgcmFuZG9tTWludXRlLCAwLCAwKTtcclxuXHJcblx0XHRcdFx0ZXZlbnRzLnB1c2goe1xyXG5cdFx0XHRcdFx0aWQ6IGBzb3J0LWV2ZW50LSR7aX1gLFxyXG5cdFx0XHRcdFx0dGl0bGU6IGBFdmVudCAke2l9YCxcclxuXHRcdFx0XHRcdGRhdGU6IGV2ZW50RGF0ZSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBldmVudERhdGUsXHJcblx0XHRcdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0OiBcImRhdGUtdGltZVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQmVuY2htYXJrIHNvcnRpbmdcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHNvcnRlZEV2ZW50cyA9IGV2ZW50cy5zb3J0KChhLCBiKSA9PiBcclxuXHRcdFx0XHRhLnRpbWVJbmZvIS5wcmltYXJ5VGltZS5nZXRUaW1lKCkgLSBiLnRpbWVJbmZvIS5wcmltYXJ5VGltZS5nZXRUaW1lKClcclxuXHRcdFx0KTtcclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IHBlcmZvcm1hbmNlLm5vdygpO1xyXG5cdFx0XHRjb25zdCBzb3J0VGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgVGltZWxpbmUgZXZlbnQgc29ydGluZyAoJHtldmVudENvdW50fSBldmVudHMpOiAke3NvcnRUaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBjb21wbGV0ZSB3aXRoaW4gcmVhc29uYWJsZSB0aW1lXHJcblx0XHRcdGV4cGVjdChzb3J0VGltZSkudG9CZUxlc3NUaGFuKDUwMCk7IC8vIDUwMG1zIGZvciA1MDAwIGV2ZW50c1xyXG5cdFx0XHRleHBlY3Qoc29ydGVkRXZlbnRzKS50b0hhdmVMZW5ndGgoZXZlbnRDb3VudCk7XHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgc29ydGluZyBpcyBjb3JyZWN0XHJcblx0XHRcdGZvciAobGV0IGkgPSAxOyBpIDwgc29ydGVkRXZlbnRzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0ZXhwZWN0KHNvcnRlZEV2ZW50c1tpXS50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpKVxyXG5cdFx0XHRcdFx0LnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoc29ydGVkRXZlbnRzW2kgLSAxXS50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBncm91cCB0aW1lbGluZSBldmVudHMgYnkgZGF0ZSBlZmZpY2llbnRseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGV2ZW50Q291bnQgPSAyMDAwO1xyXG5cdFx0XHRjb25zdCBiYXNlRGF0ZSA9IG5ldyBEYXRlKFwiMjAyNS0wOC0yNVwiKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBldmVudHMgc3ByZWFkIGFjcm9zcyBtdWx0aXBsZSBkYXlzXHJcblx0XHRcdGNvbnN0IGV2ZW50czogTW9ja1RpbWVsaW5lRXZlbnRbXSA9IFtdO1xyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGV2ZW50Q291bnQ7IGkrKykge1xyXG5cdFx0XHRcdGNvbnN0IGRheU9mZnNldCA9IGkgJSAzMDsgLy8gMzAgZGF5c1xyXG5cdFx0XHRcdGNvbnN0IGhvdXIgPSA4ICsgKGkgJSAxMik7XHJcblx0XHRcdFx0Y29uc3QgbWludXRlID0gKGkgJSA0KSAqIDE1O1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdGNvbnN0IGV2ZW50RGF0ZSA9IG5ldyBEYXRlKGJhc2VEYXRlKTtcclxuXHRcdFx0XHRldmVudERhdGUuc2V0RGF0ZShiYXNlRGF0ZS5nZXREYXRlKCkgKyBkYXlPZmZzZXQpO1xyXG5cdFx0XHRcdGV2ZW50RGF0ZS5zZXRIb3Vycyhob3VyLCBtaW51dGUsIDAsIDApO1xyXG5cclxuXHRcdFx0XHRldmVudHMucHVzaCh7XHJcblx0XHRcdFx0XHRpZDogYGdyb3VwLWV2ZW50LSR7aX1gLFxyXG5cdFx0XHRcdFx0dGl0bGU6IGBFdmVudCAke2l9YCxcclxuXHRcdFx0XHRcdGRhdGU6IGV2ZW50RGF0ZSxcclxuXHRcdFx0XHRcdHRpbWVJbmZvOiB7XHJcblx0XHRcdFx0XHRcdHByaW1hcnlUaW1lOiBldmVudERhdGUsXHJcblx0XHRcdFx0XHRcdGlzUmFuZ2U6IGZhbHNlLFxyXG5cdFx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0OiBcImRhdGUtdGltZVwiLFxyXG5cdFx0XHRcdFx0fSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQmVuY2htYXJrIGdyb3VwaW5nIGJ5IGRhdGVcclxuXHRcdFx0Y29uc3Qgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IGdyb3VwZWRFdmVudHMgPSBuZXcgTWFwPHN0cmluZywgTW9ja1RpbWVsaW5lRXZlbnRbXT4oKTtcclxuXHRcdFx0XHJcblx0XHRcdGV2ZW50cy5mb3JFYWNoKGV2ZW50ID0+IHtcclxuXHRcdFx0XHRjb25zdCBkYXRlS2V5ID0gZXZlbnQudGltZUluZm8hLnByaW1hcnlUaW1lLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXTtcclxuXHRcdFx0XHRpZiAoIWdyb3VwZWRFdmVudHMuaGFzKGRhdGVLZXkpKSB7XHJcblx0XHRcdFx0XHRncm91cGVkRXZlbnRzLnNldChkYXRlS2V5LCBbXSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGdyb3VwZWRFdmVudHMuZ2V0KGRhdGVLZXkpIS5wdXNoKGV2ZW50KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBTb3J0IGV2ZW50cyB3aXRoaW4gZWFjaCBkYXlcclxuXHRcdFx0Z3JvdXBlZEV2ZW50cy5mb3JFYWNoKGRheUV2ZW50cyA9PiB7XHJcblx0XHRcdFx0ZGF5RXZlbnRzLnNvcnQoKGEsIGIpID0+IFxyXG5cdFx0XHRcdFx0YS50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpIC0gYi50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IGdyb3VwVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgVGltZWxpbmUgZXZlbnQgZ3JvdXBpbmcgKCR7ZXZlbnRDb3VudH0gZXZlbnRzKTogJHtncm91cFRpbWUudG9GaXhlZCgyKX1tc2ApO1xyXG5cdFx0XHRjb25zb2xlLmxvZyhgR3JvdXBzIGNyZWF0ZWQ6ICR7Z3JvdXBlZEV2ZW50cy5zaXplfWApO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGNvbXBsZXRlIHdpdGhpbiByZWFzb25hYmxlIHRpbWVcclxuXHRcdFx0ZXhwZWN0KGdyb3VwVGltZSkudG9CZUxlc3NUaGFuKDEwMDApOyAvLyAxIHNlY29uZCBmb3IgMjAwMCBldmVudHNcclxuXHRcdFx0ZXhwZWN0KGdyb3VwZWRFdmVudHMuc2l6ZSkudG9CZUxlc3NUaGFuT3JFcXVhbCgzMCk7IC8vIE1heCAzMCBkYXlzXHJcblxyXG5cdFx0XHQvLyBWZXJpZnkgZ3JvdXBpbmcgaXMgY29ycmVjdFxyXG5cdFx0XHRsZXQgdG90YWxFdmVudHNJbkdyb3VwcyA9IDA7XHJcblx0XHRcdGdyb3VwZWRFdmVudHMuZm9yRWFjaChkYXlFdmVudHMgPT4ge1xyXG5cdFx0XHRcdHRvdGFsRXZlbnRzSW5Hcm91cHMgKz0gZGF5RXZlbnRzLmxlbmd0aDtcclxuXHRcdFx0XHRcclxuXHRcdFx0XHQvLyBWZXJpZnkgZXZlbnRzIGluIGVhY2ggZGF5IGFyZSBzb3J0ZWRcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gMTsgaSA8IGRheUV2ZW50cy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdFx0ZXhwZWN0KGRheUV2ZW50c1tpXS50aW1lSW5mbyEucHJpbWFyeVRpbWUuZ2V0VGltZSgpKVxyXG5cdFx0XHRcdFx0XHQudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbChkYXlFdmVudHNbaSAtIDFdLnRpbWVJbmZvIS5wcmltYXJ5VGltZS5nZXRUaW1lKCkpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHRcdFxyXG5cdFx0XHRleHBlY3QodG90YWxFdmVudHNJbkdyb3VwcykudG9CZShldmVudENvdW50KTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlBlcmZvcm1hbmNlIFJlZ3Jlc3Npb24gVGVzdHNcIiwgKCkgPT4ge1xyXG5cdFx0dGVzdChcInNob3VsZCBtYWludGFpbiBiYXNlbGluZSBwZXJmb3JtYW5jZSBmb3IgdGFza3Mgd2l0aG91dCB0aW1lXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza0NvdW50ID0gMTAwMDtcclxuXHRcdFx0XHJcblx0XHRcdC8vIENyZWF0ZSB0YXNrcyB3aXRob3V0IHRpbWUgaW5mb3JtYXRpb25cclxuXHRcdFx0Y29uc3QgdGFza3NXaXRob3V0VGltZSA9IEFycmF5LmZyb20oeyBsZW5ndGg6IHRhc2tDb3VudCB9LCAoXywgaSkgPT4gXHJcblx0XHRcdFx0YFNpbXBsZSB0YXNrICR7aX0gd2l0aG91dCBhbnkgdGltZSBpbmZvcm1hdGlvbmBcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIEJlbmNobWFyayBwYXJzaW5nIHRhc2tzIHdpdGhvdXQgdGltZVxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0dGFza3NXaXRob3V0VGltZS5mb3JFYWNoKHRhc2tUZXh0ID0+IHtcclxuXHRcdFx0XHRjb25zdCByZXN1bHQgPSBlbmhhbmNlZFRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyh0YXNrVGV4dCkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cdFx0XHRcdC8vIEFjY2VzcyB0aGUgcmVzdWx0IHRvIGVuc3VyZSBpdCdzIGNvbXB1dGVkXHJcblx0XHRcdFx0Y29uc3QgaGFzVGltZSA9IHJlc3VsdC50aW1lQ29tcG9uZW50cyAmJiBPYmplY3Qua2V5cyhyZXN1bHQudGltZUNvbXBvbmVudHMpLmxlbmd0aCA+IDA7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHBhcnNlVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgUGFyc2luZyB0YXNrcyB3aXRob3V0IHRpbWUgKCR7dGFza0NvdW50fSB0YXNrcyk6ICR7cGFyc2VUaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYEF2ZXJhZ2UgcGVyIHRhc2s6ICR7KHBhcnNlVGltZSAvIHRhc2tDb3VudCkudG9GaXhlZCgzKX1tc2ApO1xyXG5cclxuXHRcdFx0Ly8gU2hvdWxkIGJlIHZlcnkgZmFzdCBmb3IgdGFza3Mgd2l0aG91dCB0aW1lXHJcblx0XHRcdGV4cGVjdChwYXJzZVRpbWUpLnRvQmVMZXNzVGhhbig1MDApOyAvLyA1MDBtcyBmb3IgMTAwMCB0YXNrc1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dGVzdChcInNob3VsZCBoYW5kbGUgZWRnZSBjYXNlcyBlZmZpY2llbnRseVwiLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGVkZ2VDYXNlcyA9IFtcclxuXHRcdFx0XHRcIlwiLCAvLyBFbXB0eSBzdHJpbmdcclxuXHRcdFx0XHRcIlRhc2sgd2l0aCBubyB0aW1lIGluZm9ybWF0aW9uXCIsXHJcblx0XHRcdFx0XCJUYXNrIHdpdGggaW52YWxpZCB0aW1lIDI1Ojk5XCIsXHJcblx0XHRcdFx0XCJUYXNrIHdpdGggbWFsZm9ybWVkIHJhbmdlIDEyOjAwLS0xNTowMFwiLFxyXG5cdFx0XHRcdFwiVGFzayB3aXRoIG11bHRpcGxlIGludmFsaWQgdGltZXMgMjU6OTkgYW5kIDMwOjcwXCIsXHJcblx0XHRcdFx0XCJWZXJ5IGxvbmcgdGFzayBkZXNjcmlwdGlvbiBcIi5yZXBlYXQoMTAwKSArIFwiIGF0IDI6MzAgUE1cIixcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGNvbnN0IGl0ZXJhdGlvbnMgPSAxMDA7XHJcblxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBpdGVyYXRpb25zOyBpKyspIHtcclxuXHRcdFx0XHRlZGdlQ2FzZXMuZm9yRWFjaChlZGdlQ2FzZSA9PiB7XHJcblx0XHRcdFx0XHR0cnkge1xyXG5cdFx0XHRcdFx0XHRjb25zdCByZXN1bHQgPSBlbmhhbmNlZFRpbWVQYXJzaW5nU2VydmljZS5wYXJzZVRpbWVFeHByZXNzaW9ucyhlZGdlQ2FzZSkgYXMgRW5oYW5jZWRQYXJzZWRUaW1lUmVzdWx0O1xyXG5cdFx0XHRcdFx0XHQvLyBBY2Nlc3MgdGhlIHJlc3VsdFxyXG5cdFx0XHRcdFx0XHRjb25zdCBoYXNUaW1lID0gcmVzdWx0LnRpbWVDb21wb25lbnRzICYmIE9iamVjdC5rZXlzKHJlc3VsdC50aW1lQ29tcG9uZW50cykubGVuZ3RoID4gMDtcclxuXHRcdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0XHRcdC8vIFNob3VsZCBub3QgdGhyb3cgZXJyb3JzXHJcblx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgUGFyc2luZyBmYWlsZWQgZm9yOiBcIiR7ZWRnZUNhc2V9XCJgKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRjb25zdCBlbmRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHBhcnNlVGltZSA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgRWRnZSBjYXNlIHBhcnNpbmcgKCR7aXRlcmF0aW9ucyAqIGVkZ2VDYXNlcy5sZW5ndGh9IGl0ZXJhdGlvbnMpOiAke3BhcnNlVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgaGFuZGxlIGVkZ2UgY2FzZXMgd2l0aG91dCBlcnJvcnMgYW5kIHdpdGhpbiByZWFzb25hYmxlIHRpbWVcclxuXHRcdFx0ZXhwZWN0KHBhcnNlVGltZSkudG9CZUxlc3NUaGFuKDEwMDApOyAvLyAxIHNlY29uZCBmb3IgYWxsIGVkZ2UgY2FzZXNcclxuXHRcdH0pO1xyXG5cclxuXHRcdHRlc3QoXCJzaG91bGQgbWFpbnRhaW4gcGVyZm9ybWFuY2Ugd2l0aCBjYWNoZSBlbmFibGVkXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGVzdEV4cHJlc3Npb25zID0gW1xyXG5cdFx0XHRcdFwiTWVldGluZyBhdCAyOjMwIFBNXCIsXHJcblx0XHRcdFx0XCJXb3Jrc2hvcCA5OjAwLTE3OjAwXCIsXHJcblx0XHRcdFx0XCJDYWxsIGF0IDE0OjAwXCIsXHJcblx0XHRcdFx0XCJFdmVudCAxMDowMCBBTSAtIDI6MDAgUE1cIixcclxuXHRcdFx0XHRcIlRhc2sgYXQgMjM6NDVcIixcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdC8vIENsZWFyIGNhY2hlIGZpcnN0XHJcblx0XHRcdGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlLmNsZWFyQ2FjaGUoKTtcclxuXHJcblx0XHRcdC8vIEZpcnN0IHJ1biAocG9wdWxhdGUgY2FjaGUpXHJcblx0XHRcdGNvbnN0IHN0YXJ0VGltZTEgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCAyMDA7IGkrKykge1xyXG5cdFx0XHRcdHRlc3RFeHByZXNzaW9ucy5mb3JFYWNoKGV4cHIgPT4ge1xyXG5cdFx0XHRcdFx0ZW5oYW5jZWRUaW1lUGFyc2luZ1NlcnZpY2UucGFyc2VUaW1lRXhwcmVzc2lvbnMoZXhwcik7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdFx0Y29uc3QgZW5kVGltZTEgPSBwZXJmb3JtYW5jZS5ub3coKTtcclxuXHRcdFx0Y29uc3QgZmlyc3RSdW5UaW1lID0gZW5kVGltZTEgLSBzdGFydFRpbWUxO1xyXG5cclxuXHRcdFx0Ly8gU2Vjb25kIHJ1biAodXNlIGNhY2hlKVxyXG5cdFx0XHRjb25zdCBzdGFydFRpbWUyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMjAwOyBpKyspIHtcclxuXHRcdFx0XHR0ZXN0RXhwcmVzc2lvbnMuZm9yRWFjaChleHByID0+IHtcclxuXHRcdFx0XHRcdGVuaGFuY2VkVGltZVBhcnNpbmdTZXJ2aWNlLnBhcnNlVGltZUV4cHJlc3Npb25zKGV4cHIpO1xyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9XHJcblx0XHRcdGNvbnN0IGVuZFRpbWUyID0gcGVyZm9ybWFuY2Uubm93KCk7XHJcblx0XHRcdGNvbnN0IHNlY29uZFJ1blRpbWUgPSBlbmRUaW1lMiAtIHN0YXJ0VGltZTI7XHJcblxyXG5cdFx0XHRjb25zb2xlLmxvZyhgRmlyc3QgcnVuIChwb3B1bGF0ZSBjYWNoZSk6ICR7Zmlyc3RSdW5UaW1lLnRvRml4ZWQoMil9bXNgKTtcclxuXHRcdFx0Y29uc29sZS5sb2coYFNlY29uZCBydW4gKHVzZSBjYWNoZSk6ICR7c2Vjb25kUnVuVGltZS50b0ZpeGVkKDIpfW1zYCk7XHJcblx0XHRcdGNvbnNvbGUubG9nKGBDYWNoZSBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudDogJHsoZmlyc3RSdW5UaW1lIC8gc2Vjb25kUnVuVGltZSkudG9GaXhlZCgyKX14YCk7XHJcblxyXG5cdFx0XHQvLyBDYWNoZSBzaG91bGQgcHJvdmlkZSBzaWduaWZpY2FudCBwZXJmb3JtYW5jZSBpbXByb3ZlbWVudFxyXG5cdFx0XHRleHBlY3Qoc2Vjb25kUnVuVGltZSkudG9CZUxlc3NUaGFuKGZpcnN0UnVuVGltZSAqIDAuOCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7Il19