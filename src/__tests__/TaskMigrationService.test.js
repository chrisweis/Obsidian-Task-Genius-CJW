import { TaskMigrationService } from '../services/task-migration-service';
import { createTimeComponent } from '../utils/task-metadata-utils';
describe('TaskMigrationService', () => {
    let migrationService;
    beforeEach(() => {
        migrationService = new TaskMigrationService();
        migrationService.clearCache();
    });
    describe('migrateTaskToEnhanced', () => {
        it('should migrate task with meaningful time information', () => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            const task = {
                id: 'test-1',
                content: 'Meeting with team',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting with team',
                metadata: {
                    startDate: new Date(2023, 0, 1, 9, 30, 0).getTime(),
                    dueDate: new Date(2023, 0, 1, 17, 0, 0).getTime(),
                    tags: ['work'],
                    children: [],
                    priority: 1
                }
            };
            const result = migrationService.migrateTaskToEnhanced(task);
            expect(result.id).toBe(task.id);
            expect(result.content).toBe(task.content);
            expect(result.metadata.startDate).toBe(task.metadata.startDate);
            expect(result.metadata.dueDate).toBe(task.metadata.dueDate);
            expect(result.metadata.tags).toEqual(['work']);
            expect(result.metadata.priority).toBe(1);
            // Should have time components
            expect(result.metadata.timeComponents).toBeDefined();
            expect((_b = (_a = result.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(9);
            expect((_d = (_c = result.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime) === null || _d === void 0 ? void 0 : _d.minute).toBe(30);
            expect((_f = (_e = result.metadata.timeComponents) === null || _e === void 0 ? void 0 : _e.dueTime) === null || _f === void 0 ? void 0 : _f.hour).toBe(17);
            expect((_h = (_g = result.metadata.timeComponents) === null || _g === void 0 ? void 0 : _g.dueTime) === null || _h === void 0 ? void 0 : _h.minute).toBe(0);
            // Should have enhanced dates
            expect(result.metadata.enhancedDates).toBeDefined();
            expect((_j = result.metadata.enhancedDates) === null || _j === void 0 ? void 0 : _j.startDateTime).toEqual(new Date(2023, 0, 1, 9, 30, 0));
            expect((_k = result.metadata.enhancedDates) === null || _k === void 0 ? void 0 : _k.dueDateTime).toEqual(new Date(2023, 0, 1, 17, 0, 0));
        });
        it('should not add time components for date-only timestamps (00:00:00)', () => {
            const task = {
                id: 'test-2',
                content: 'Task with date only',
                filePath: '/test/file.md',
                line: 2,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Task with date only',
                metadata: {
                    startDate: new Date(2023, 0, 1, 0, 0, 0).getTime(),
                    dueDate: new Date(2023, 0, 2, 0, 0, 0).getTime(),
                    tags: [],
                    children: []
                }
            };
            const result = migrationService.migrateTaskToEnhanced(task);
            expect(result.metadata.timeComponents).toBeUndefined();
            expect(result.metadata.enhancedDates).toBeUndefined();
        });
        it('should handle tasks without any dates', () => {
            const task = {
                id: 'test-3',
                content: 'Simple task',
                filePath: '/test/file.md',
                line: 3,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Simple task',
                metadata: {
                    tags: ['personal'],
                    children: []
                }
            };
            const result = migrationService.migrateTaskToEnhanced(task);
            expect(result.metadata.tags).toEqual(['personal']);
            expect(result.metadata.timeComponents).toBeUndefined();
            expect(result.metadata.enhancedDates).toBeUndefined();
        });
        it('should handle already enhanced tasks correctly', () => {
            var _a, _b, _c, _d;
            const task = {
                id: 'test-4',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 4,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    startDate: new Date(2023, 0, 1, 14, 30, 0).getTime(),
                    tags: [],
                    children: []
                }
            };
            const result1 = migrationService.migrateTaskToEnhanced(task);
            // Try to migrate the already enhanced task
            const result2 = migrationService.migrateTaskToEnhanced(result1);
            // Should return the same enhanced task without double-enhancement
            expect((_b = (_a = result2.metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(14);
            expect((_d = (_c = result2.metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.startTime) === null || _d === void 0 ? void 0 : _d.minute).toBe(30);
            expect(result2).toBe(result1); // Should return the same object for already enhanced tasks
        });
    });
    describe('migrateBatch', () => {
        it('should migrate multiple tasks', () => {
            var _a, _b, _c, _d, _e, _f;
            const tasks = [
                {
                    id: 'batch-1',
                    content: 'Task 1',
                    filePath: '/test/file.md',
                    line: 1,
                    completed: false,
                    status: '[ ]',
                    originalMarkdown: '- [ ] Task 1',
                    metadata: {
                        startDate: new Date(2023, 0, 1, 9, 0, 0).getTime(),
                        tags: [],
                        children: []
                    }
                },
                {
                    id: 'batch-2',
                    content: 'Task 2',
                    filePath: '/test/file.md',
                    line: 2,
                    completed: false,
                    status: '[ ]',
                    originalMarkdown: '- [ ] Task 2',
                    metadata: {
                        dueDate: new Date(2023, 0, 2, 17, 30, 0).getTime(),
                        tags: [],
                        children: []
                    }
                }
            ];
            const results = migrationService.migrateBatch(tasks);
            expect(results).toHaveLength(2);
            expect((_b = (_a = results[0].metadata.timeComponents) === null || _a === void 0 ? void 0 : _a.startTime) === null || _b === void 0 ? void 0 : _b.hour).toBe(9);
            expect((_d = (_c = results[1].metadata.timeComponents) === null || _c === void 0 ? void 0 : _c.dueTime) === null || _d === void 0 ? void 0 : _d.hour).toBe(17);
            expect((_f = (_e = results[1].metadata.timeComponents) === null || _e === void 0 ? void 0 : _e.dueTime) === null || _f === void 0 ? void 0 : _f.minute).toBe(30);
        });
    });
    describe('needsMigration', () => {
        it('should return true for tasks without enhanced metadata', () => {
            const task = {
                id: 'needs-migration',
                content: 'Task',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Task',
                metadata: {
                    tags: [],
                    children: []
                }
            };
            expect(migrationService.needsMigration(task)).toBe(true);
        });
        it('should return false for already enhanced tasks', () => {
            const enhancedTask = {
                id: 'enhanced',
                content: 'Enhanced task',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Enhanced task',
                metadata: {
                    tags: [],
                    children: [],
                    timeComponents: {
                        startTime: createTimeComponent(9, 0)
                    }
                }
            };
            expect(migrationService.needsMigration(enhancedTask)).toBe(false);
        });
    });
    describe('migrateIfNeeded', () => {
        it('should migrate task with meaningful time information', () => {
            const task = {
                id: 'conditional-1',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    startDate: new Date(2023, 0, 1, 14, 30, 0).getTime(),
                    tags: [],
                    children: []
                }
            };
            const result = migrationService.migrateIfNeeded(task);
            expect('timeComponents' in result.metadata).toBe(true);
        });
        it('should not migrate task without meaningful time information', () => {
            const task = {
                id: 'conditional-2',
                content: 'Simple task',
                filePath: '/test/file.md',
                line: 2,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Simple task',
                metadata: {
                    startDate: new Date(2023, 0, 1, 0, 0, 0).getTime(),
                    tags: [],
                    children: []
                }
            };
            const result = migrationService.migrateIfNeeded(task);
            expect('timeComponents' in result.metadata).toBe(false);
            expect(result).toBe(task); // Should return original task
        });
    });
    describe('validateMigration', () => {
        it('should validate successful migration', () => {
            const originalTask = {
                id: 'validate-1',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    startDate: new Date(2023, 0, 1, 9, 30, 0).getTime(),
                    tags: ['work'],
                    children: [],
                    priority: 2
                }
            };
            const migratedTask = migrationService.migrateTaskToEnhanced(originalTask);
            const isValid = migrationService.validateMigration(originalTask, migratedTask);
            expect(isValid).toBe(true);
        });
        it('should detect invalid migration (corrupted data)', () => {
            const originalTask = {
                id: 'validate-2',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    tags: ['work'],
                    children: []
                }
            };
            const corruptedTask = Object.assign(Object.assign({}, originalTask), { content: 'Different content', metadata: Object.assign(Object.assign({}, originalTask.metadata), { timeComponents: {
                        startTime: createTimeComponent(9, 0)
                    } }) });
            const isValid = migrationService.validateMigration(originalTask, corruptedTask);
            expect(isValid).toBe(false);
        });
    });
    describe('rollbackTask', () => {
        it('should rollback enhanced task to standard format', () => {
            const enhancedTask = {
                id: 'rollback-1',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    startDate: new Date(2023, 0, 1, 9, 30, 0).getTime(),
                    tags: ['work'],
                    children: [],
                    timeComponents: {
                        startTime: createTimeComponent(9, 30)
                    },
                    enhancedDates: {
                        startDateTime: new Date(2023, 0, 1, 9, 30, 0)
                    }
                }
            };
            const result = migrationService.rollbackTask(enhancedTask);
            expect(result.metadata.startDate).toBe(enhancedTask.metadata.startDate);
            expect(result.metadata.tags).toEqual(['work']);
            expect('timeComponents' in result.metadata).toBe(false);
            expect('enhancedDates' in result.metadata).toBe(false);
        });
    });
    describe('getStats', () => {
        it('should return migration statistics', () => {
            const task = {
                id: 'stats-1',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    startDate: new Date(2023, 0, 1, 9, 30, 0).getTime(),
                    tags: [],
                    children: []
                }
            };
            const initialStats = migrationService.getStats();
            expect(initialStats.migratedCount).toBe(0);
            migrationService.migrateTaskToEnhanced(task);
            const afterStats = migrationService.getStats();
            expect(afterStats.migratedCount).toBe(1);
        });
    });
    describe('clearCache', () => {
        it('should clear migration cache', () => {
            const task = {
                id: 'cache-1',
                content: 'Meeting',
                filePath: '/test/file.md',
                line: 1,
                completed: false,
                status: '[ ]',
                originalMarkdown: '- [ ] Meeting',
                metadata: {
                    startDate: new Date(2023, 0, 1, 9, 30, 0).getTime(),
                    tags: [],
                    children: []
                }
            };
            migrationService.migrateTaskToEnhanced(task);
            expect(migrationService.getStats().migratedCount).toBe(1);
            migrationService.clearCache();
            expect(migrationService.getStats().migratedCount).toBe(0);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVGFza01pZ3JhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRhc2tNaWdyYXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFMUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFbkUsUUFBUSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNyQyxJQUFJLGdCQUFzQyxDQUFDO0lBRTNDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixnQkFBZ0IsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFDOUMsZ0JBQWdCLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO1FBQ3RDLEVBQUUsQ0FBQyxzREFBc0QsRUFBRSxHQUFHLEVBQUU7O1lBQy9ELE1BQU0sSUFBSSxHQUErQjtnQkFDeEMsRUFBRSxFQUFFLFFBQVE7Z0JBQ1osT0FBTyxFQUFFLG1CQUFtQjtnQkFDNUIsUUFBUSxFQUFFLGVBQWU7Z0JBQ3pCLElBQUksRUFBRSxDQUFDO2dCQUNQLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixNQUFNLEVBQUUsS0FBSztnQkFDYixnQkFBZ0IsRUFBRSx5QkFBeUI7Z0JBQzNDLFFBQVEsRUFBRTtvQkFDVCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUU7b0JBQ25ELE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRTtvQkFDakQsSUFBSSxF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QUMsUUFBUSxFQUFFLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTFELGdCQUFnQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVGFza01pZ3JhdGlvblNlcnZpY2UgfSBmcm9tICcuLi9zZXJ2aWNlcy90YXNrLW1pZ3JhdGlvbi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVGFzaywgU3RhbmRhcmRUYXNrTWV0YWRhdGEsIEVuaGFuY2VkVGFzayB9IGZyb20gJy4uL3R5cGVzL3Rhc2snO1xyXG5pbXBvcnQgeyBjcmVhdGVUaW1lQ29tcG9uZW50IH0gZnJvbSAnLi4vdXRpbHMvdGFzay1tZXRhZGF0YS11dGlscyc7XHJcblxyXG5kZXNjcmliZSgnVGFza01pZ3JhdGlvblNlcnZpY2UnLCAoKSA9PiB7XHJcblx0bGV0IG1pZ3JhdGlvblNlcnZpY2U6IFRhc2tNaWdyYXRpb25TZXJ2aWNlO1xyXG5cclxuXHRiZWZvcmVFYWNoKCgpID0+IHtcclxuXHRcdG1pZ3JhdGlvblNlcnZpY2UgPSBuZXcgVGFza01pZ3JhdGlvblNlcnZpY2UoKTtcclxuXHRcdG1pZ3JhdGlvblNlcnZpY2UuY2xlYXJDYWNoZSgpO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZSgnbWlncmF0ZVRhc2tUb0VuaGFuY2VkJywgKCkgPT4ge1xyXG5cdFx0aXQoJ3Nob3VsZCBtaWdyYXRlIHRhc2sgd2l0aCBtZWFuaW5nZnVsIHRpbWUgaW5mb3JtYXRpb24nLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiAndGVzdC0xJyxcclxuXHRcdFx0XHRjb250ZW50OiAnTWVldGluZyB3aXRoIHRlYW0nLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiAnL3Rlc3QvZmlsZS5tZCcsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogJ1sgXScsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIE1lZXRpbmcgd2l0aCB0ZWFtJyxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDIzLCAwLCAxLCA5LCAzMCwgMCkuZ2V0VGltZSgpLCAvLyA5OjMwIEFNXHJcblx0XHRcdFx0XHRkdWVEYXRlOiBuZXcgRGF0ZSgyMDIzLCAwLCAxLCAxNywgMCwgMCkuZ2V0VGltZSgpLCAvLyA1OjAwIFBNXHJcblx0XHRcdFx0XHR0YWdzOiBbJ3dvcmsnXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHByaW9yaXR5OiAxXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbWlncmF0aW9uU2VydmljZS5taWdyYXRlVGFza1RvRW5oYW5jZWQodGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0LmlkKS50b0JlKHRhc2suaWQpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0LmNvbnRlbnQpLnRvQmUodGFzay5jb250ZW50KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS5zdGFydERhdGUpLnRvQmUodGFzay5tZXRhZGF0YS5zdGFydERhdGUpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLmR1ZURhdGUpLnRvQmUodGFzay5tZXRhZGF0YS5kdWVEYXRlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS50YWdzKS50b0VxdWFsKFsnd29yayddKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS5wcmlvcml0eSkudG9CZSgxKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIHRpbWUgY29tcG9uZW50c1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zdGFydFRpbWU/LmhvdXIpLnRvQmUoOSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZT8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uZHVlVGltZT8uaG91cikudG9CZSgxNyk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmR1ZVRpbWU/Lm1pbnV0ZSkudG9CZSgwKTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCBoYXZlIGVuaGFuY2VkIGRhdGVzXHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEuZW5oYW5jZWREYXRlcykudG9CZURlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS5lbmhhbmNlZERhdGVzPy5zdGFydERhdGVUaW1lKS50b0VxdWFsKG5ldyBEYXRlKDIwMjMsIDAsIDEsIDksIDMwLCAwKSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEuZW5oYW5jZWREYXRlcz8uZHVlRGF0ZVRpbWUpLnRvRXF1YWwobmV3IERhdGUoMjAyMywgMCwgMSwgMTcsIDAsIDApKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgbm90IGFkZCB0aW1lIGNvbXBvbmVudHMgZm9yIGRhdGUtb25seSB0aW1lc3RhbXBzICgwMDowMDowMCknLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiAndGVzdC0yJyxcclxuXHRcdFx0XHRjb250ZW50OiAnVGFzayB3aXRoIGRhdGUgb25seScsXHJcblx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gVGFzayB3aXRoIGRhdGUgb25seScsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogbmV3IERhdGUoMjAyMywgMCwgMSwgMCwgMCwgMCkuZ2V0VGltZSgpLCAvLyBNaWRuaWdodCAoZGF0ZS1vbmx5KVxyXG5cdFx0XHRcdFx0ZHVlRGF0ZTogbmV3IERhdGUoMjAyMywgMCwgMiwgMCwgMCwgMCkuZ2V0VGltZSgpLCAvLyBNaWRuaWdodCAoZGF0ZS1vbmx5KVxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW11cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtaWdyYXRpb25TZXJ2aWNlLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEudGltZUNvbXBvbmVudHMpLnRvQmVVbmRlZmluZWQoKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS5lbmhhbmNlZERhdGVzKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIGhhbmRsZSB0YXNrcyB3aXRob3V0IGFueSBkYXRlcycsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6ICd0ZXN0LTMnLFxyXG5cdFx0XHRcdGNvbnRlbnQ6ICdTaW1wbGUgdGFzaycsXHJcblx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRsaW5lOiAzLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gU2ltcGxlIHRhc2snLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbJ3BlcnNvbmFsJ10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW11cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCByZXN1bHQgPSBtaWdyYXRpb25TZXJ2aWNlLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEudGFncykudG9FcXVhbChbJ3BlcnNvbmFsJ10pO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLnRpbWVDb21wb25lbnRzKS50b0JlVW5kZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQubWV0YWRhdGEuZW5oYW5jZWREYXRlcykudG9CZVVuZGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoJ3Nob3VsZCBoYW5kbGUgYWxyZWFkeSBlbmhhbmNlZCB0YXNrcyBjb3JyZWN0bHknLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiAndGVzdC00JyxcclxuXHRcdFx0XHRjb250ZW50OiAnTWVldGluZycsXHJcblx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRsaW5lOiA0LFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gTWVldGluZycsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogbmV3IERhdGUoMjAyMywgMCwgMSwgMTQsIDMwLCAwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdDEgPSBtaWdyYXRpb25TZXJ2aWNlLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIFRyeSB0byBtaWdyYXRlIHRoZSBhbHJlYWR5IGVuaGFuY2VkIHRhc2tcclxuXHRcdFx0Y29uc3QgcmVzdWx0MiA9IG1pZ3JhdGlvblNlcnZpY2UubWlncmF0ZVRhc2tUb0VuaGFuY2VkKHJlc3VsdDEgYXMgYW55KTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCByZXR1cm4gdGhlIHNhbWUgZW5oYW5jZWQgdGFzayB3aXRob3V0IGRvdWJsZS1lbmhhbmNlbWVudFxyXG5cdFx0XHRleHBlY3QocmVzdWx0Mi5tZXRhZGF0YS50aW1lQ29tcG9uZW50cz8uc3RhcnRUaW1lPy5ob3VyKS50b0JlKDE0KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIubWV0YWRhdGEudGltZUNvbXBvbmVudHM/LnN0YXJ0VGltZT8ubWludXRlKS50b0JlKDMwKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdDIpLnRvQmUocmVzdWx0MSk7IC8vIFNob3VsZCByZXR1cm4gdGhlIHNhbWUgb2JqZWN0IGZvciBhbHJlYWR5IGVuaGFuY2VkIHRhc2tzXHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ21pZ3JhdGVCYXRjaCcsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgbWlncmF0ZSBtdWx0aXBsZSB0YXNrcycsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFza3M6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+W10gPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6ICdiYXRjaC0xJyxcclxuXHRcdFx0XHRcdGNvbnRlbnQ6ICdUYXNrIDEnLFxyXG5cdFx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBUYXNrIDEnLFxyXG5cdFx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDIzLCAwLCAxLCA5LCAwLCAwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0XHRjaGlsZHJlbjogW11cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9LFxyXG5cdFx0XHRcdHtcclxuXHRcdFx0XHRcdGlkOiAnYmF0Y2gtMicsXHJcblx0XHRcdFx0XHRjb250ZW50OiAnVGFzayAyJyxcclxuXHRcdFx0XHRcdGZpbGVQYXRoOiAnL3Rlc3QvZmlsZS5tZCcsXHJcblx0XHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRcdHN0YXR1czogJ1sgXScsXHJcblx0XHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gVGFzayAyJyxcclxuXHRcdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRcdGR1ZURhdGU6IG5ldyBEYXRlKDIwMjMsIDAsIDIsIDE3LCAzMCwgMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdFx0Y2hpbGRyZW46IFtdXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRdO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0cyA9IG1pZ3JhdGlvblNlcnZpY2UubWlncmF0ZUJhdGNoKHRhc2tzKTtcclxuXHJcblx0XHRcdGV4cGVjdChyZXN1bHRzKS50b0hhdmVMZW5ndGgoMik7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzBdLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5zdGFydFRpbWU/LmhvdXIpLnRvQmUoOSk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHRzWzFdLm1ldGFkYXRhLnRpbWVDb21wb25lbnRzPy5kdWVUaW1lPy5ob3VyKS50b0JlKDE3KTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHNbMV0ubWV0YWRhdGEudGltZUNvbXBvbmVudHM/LmR1ZVRpbWU/Lm1pbnV0ZSkudG9CZSgzMCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ25lZWRzTWlncmF0aW9uJywgKCkgPT4ge1xyXG5cdFx0aXQoJ3Nob3VsZCByZXR1cm4gdHJ1ZSBmb3IgdGFza3Mgd2l0aG91dCBlbmhhbmNlZCBtZXRhZGF0YScsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6ICduZWVkcy1taWdyYXRpb24nLFxyXG5cdFx0XHRcdGNvbnRlbnQ6ICdUYXNrJyxcclxuXHRcdFx0XHRmaWxlUGF0aDogJy90ZXN0L2ZpbGUubWQnLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6ICdbIF0nLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBUYXNrJyxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW11cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRleHBlY3QobWlncmF0aW9uU2VydmljZS5uZWVkc01pZ3JhdGlvbih0YXNrKSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIGZhbHNlIGZvciBhbHJlYWR5IGVuaGFuY2VkIHRhc2tzJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBlbmhhbmNlZFRhc2s6IEVuaGFuY2VkVGFzayA9IHtcclxuXHRcdFx0XHRpZDogJ2VuaGFuY2VkJyxcclxuXHRcdFx0XHRjb250ZW50OiAnRW5oYW5jZWQgdGFzaycsXHJcblx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gRW5oYW5jZWQgdGFzaycsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdLFxyXG5cdFx0XHRcdFx0dGltZUNvbXBvbmVudHM6IHtcclxuXHRcdFx0XHRcdFx0c3RhcnRUaW1lOiBjcmVhdGVUaW1lQ29tcG9uZW50KDksIDApXHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGlvblNlcnZpY2UubmVlZHNNaWdyYXRpb24oZW5oYW5jZWRUYXNrIGFzIGFueSkpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKCdtaWdyYXRlSWZOZWVkZWQnLCAoKSA9PiB7XHJcblx0XHRpdCgnc2hvdWxkIG1pZ3JhdGUgdGFzayB3aXRoIG1lYW5pbmdmdWwgdGltZSBpbmZvcm1hdGlvbicsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgdGFzazogVGFzazxTdGFuZGFyZFRhc2tNZXRhZGF0YT4gPSB7XHJcblx0XHRcdFx0aWQ6ICdjb25kaXRpb25hbC0xJyxcclxuXHRcdFx0XHRjb250ZW50OiAnTWVldGluZycsXHJcblx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRsaW5lOiAxLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gTWVldGluZycsXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdHN0YXJ0RGF0ZTogbmV3IERhdGUoMjAyMywgMCwgMSwgMTQsIDMwLCAwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHR0YWdzOiBbXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1pZ3JhdGlvblNlcnZpY2UubWlncmF0ZUlmTmVlZGVkKHRhc2spO1xyXG5cclxuXHRcdFx0ZXhwZWN0KCd0aW1lQ29tcG9uZW50cycgaW4gcmVzdWx0Lm1ldGFkYXRhKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoJ3Nob3VsZCBub3QgbWlncmF0ZSB0YXNrIHdpdGhvdXQgbWVhbmluZ2Z1bCB0aW1lIGluZm9ybWF0aW9uJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogJ2NvbmRpdGlvbmFsLTInLFxyXG5cdFx0XHRcdGNvbnRlbnQ6ICdTaW1wbGUgdGFzaycsXHJcblx0XHRcdFx0ZmlsZVBhdGg6ICcvdGVzdC9maWxlLm1kJyxcclxuXHRcdFx0XHRsaW5lOiAyLFxyXG5cdFx0XHRcdGNvbXBsZXRlZDogZmFsc2UsXHJcblx0XHRcdFx0c3RhdHVzOiAnWyBdJyxcclxuXHRcdFx0XHRvcmlnaW5hbE1hcmtkb3duOiAnLSBbIF0gU2ltcGxlIHRhc2snLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjMsIDAsIDEsIDAsIDAsIDApLmdldFRpbWUoKSwgLy8gTWlkbmlnaHRcclxuXHRcdFx0XHRcdHRhZ3M6IFtdLFxyXG5cdFx0XHRcdFx0Y2hpbGRyZW46IFtdXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gbWlncmF0aW9uU2VydmljZS5taWdyYXRlSWZOZWVkZWQodGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QoJ3RpbWVDb21wb25lbnRzJyBpbiByZXN1bHQubWV0YWRhdGEpLnRvQmUoZmFsc2UpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlKHRhc2spOyAvLyBTaG91bGQgcmV0dXJuIG9yaWdpbmFsIHRhc2tcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZSgndmFsaWRhdGVNaWdyYXRpb24nLCAoKSA9PiB7XHJcblx0XHRpdCgnc2hvdWxkIHZhbGlkYXRlIHN1Y2Nlc3NmdWwgbWlncmF0aW9uJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiAndmFsaWRhdGUtMScsXHJcblx0XHRcdFx0Y29udGVudDogJ01lZXRpbmcnLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiAnL3Rlc3QvZmlsZS5tZCcsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogJ1sgXScsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIE1lZXRpbmcnLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjMsIDAsIDEsIDksIDMwLCAwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHR0YWdzOiBbJ3dvcmsnXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHByaW9yaXR5OiAyXHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9O1xyXG5cclxuXHRcdFx0Y29uc3QgbWlncmF0ZWRUYXNrID0gbWlncmF0aW9uU2VydmljZS5taWdyYXRlVGFza1RvRW5oYW5jZWQob3JpZ2luYWxUYXNrKTtcclxuXHRcdFx0Y29uc3QgaXNWYWxpZCA9IG1pZ3JhdGlvblNlcnZpY2UudmFsaWRhdGVNaWdyYXRpb24ob3JpZ2luYWxUYXNrLCBtaWdyYXRlZFRhc2spO1xyXG5cclxuXHRcdFx0ZXhwZWN0KGlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdCgnc2hvdWxkIGRldGVjdCBpbnZhbGlkIG1pZ3JhdGlvbiAoY29ycnVwdGVkIGRhdGEpJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBvcmlnaW5hbFRhc2s6IFRhc2s8U3RhbmRhcmRUYXNrTWV0YWRhdGE+ID0ge1xyXG5cdFx0XHRcdGlkOiAndmFsaWRhdGUtMicsXHJcblx0XHRcdFx0Y29udGVudDogJ01lZXRpbmcnLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiAnL3Rlc3QvZmlsZS5tZCcsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogJ1sgXScsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIE1lZXRpbmcnLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHR0YWdzOiBbJ3dvcmsnXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGNvcnJ1cHRlZFRhc2s6IEVuaGFuY2VkVGFzayA9IHtcclxuXHRcdFx0XHQuLi5vcmlnaW5hbFRhc2ssXHJcblx0XHRcdFx0Y29udGVudDogJ0RpZmZlcmVudCBjb250ZW50JywgLy8gQ29ycnVwdGVkXHJcblx0XHRcdFx0bWV0YWRhdGE6IHtcclxuXHRcdFx0XHRcdC4uLm9yaWdpbmFsVGFzay5tZXRhZGF0YSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnRzOiB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0VGltZTogY3JlYXRlVGltZUNvbXBvbmVudCg5LCAwKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IGlzVmFsaWQgPSBtaWdyYXRpb25TZXJ2aWNlLnZhbGlkYXRlTWlncmF0aW9uKG9yaWdpbmFsVGFzaywgY29ycnVwdGVkVGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QoaXNWYWxpZCkudG9CZShmYWxzZSk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0ZGVzY3JpYmUoJ3JvbGxiYWNrVGFzaycsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgcm9sbGJhY2sgZW5oYW5jZWQgdGFzayB0byBzdGFuZGFyZCBmb3JtYXQnLCAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGVuaGFuY2VkVGFzazogRW5oYW5jZWRUYXNrID0ge1xyXG5cdFx0XHRcdGlkOiAncm9sbGJhY2stMScsXHJcblx0XHRcdFx0Y29udGVudDogJ01lZXRpbmcnLFxyXG5cdFx0XHRcdGZpbGVQYXRoOiAnL3Rlc3QvZmlsZS5tZCcsXHJcblx0XHRcdFx0bGluZTogMSxcclxuXHRcdFx0XHRjb21wbGV0ZWQ6IGZhbHNlLFxyXG5cdFx0XHRcdHN0YXR1czogJ1sgXScsXHJcblx0XHRcdFx0b3JpZ2luYWxNYXJrZG93bjogJy0gWyBdIE1lZXRpbmcnLFxyXG5cdFx0XHRcdG1ldGFkYXRhOiB7XHJcblx0XHRcdFx0XHRzdGFydERhdGU6IG5ldyBEYXRlKDIwMjMsIDAsIDEsIDksIDMwLCAwKS5nZXRUaW1lKCksXHJcblx0XHRcdFx0XHR0YWdzOiBbJ3dvcmsnXSxcclxuXHRcdFx0XHRcdGNoaWxkcmVuOiBbXSxcclxuXHRcdFx0XHRcdHRpbWVDb21wb25lbnRzOiB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0VGltZTogY3JlYXRlVGltZUNvbXBvbmVudCg5LCAzMClcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRlbmhhbmNlZERhdGVzOiB7XHJcblx0XHRcdFx0XHRcdHN0YXJ0RGF0ZVRpbWU6IG5ldyBEYXRlKDIwMjMsIDAsIDEsIDksIDMwLCAwKVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IG1pZ3JhdGlvblNlcnZpY2Uucm9sbGJhY2tUYXNrKGVuaGFuY2VkVGFzayk7XHJcblxyXG5cdFx0XHRleHBlY3QocmVzdWx0Lm1ldGFkYXRhLnN0YXJ0RGF0ZSkudG9CZShlbmhhbmNlZFRhc2subWV0YWRhdGEuc3RhcnREYXRlKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdC5tZXRhZGF0YS50YWdzKS50b0VxdWFsKFsnd29yayddKTtcclxuXHRcdFx0ZXhwZWN0KCd0aW1lQ29tcG9uZW50cycgaW4gcmVzdWx0Lm1ldGFkYXRhKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0ZXhwZWN0KCdlbmhhbmNlZERhdGVzJyBpbiByZXN1bHQubWV0YWRhdGEpLnRvQmUoZmFsc2UpO1xyXG5cdFx0fSk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKCdnZXRTdGF0cycsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgcmV0dXJuIG1pZ3JhdGlvbiBzdGF0aXN0aWNzJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogJ3N0YXRzLTEnLFxyXG5cdFx0XHRcdGNvbnRlbnQ6ICdNZWV0aW5nJyxcclxuXHRcdFx0XHRmaWxlUGF0aDogJy90ZXN0L2ZpbGUubWQnLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6ICdbIF0nLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBNZWV0aW5nJyxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDIzLCAwLCAxLCA5LCAzMCwgMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW11cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRjb25zdCBpbml0aWFsU3RhdHMgPSBtaWdyYXRpb25TZXJ2aWNlLmdldFN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChpbml0aWFsU3RhdHMubWlncmF0ZWRDb3VudCkudG9CZSgwKTtcclxuXHJcblx0XHRcdG1pZ3JhdGlvblNlcnZpY2UubWlncmF0ZVRhc2tUb0VuaGFuY2VkKHRhc2spO1xyXG5cclxuXHRcdFx0Y29uc3QgYWZ0ZXJTdGF0cyA9IG1pZ3JhdGlvblNlcnZpY2UuZ2V0U3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KGFmdGVyU3RhdHMubWlncmF0ZWRDb3VudCkudG9CZSgxKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZSgnY2xlYXJDYWNoZScsICgpID0+IHtcclxuXHRcdGl0KCdzaG91bGQgY2xlYXIgbWlncmF0aW9uIGNhY2hlJywgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCB0YXNrOiBUYXNrPFN0YW5kYXJkVGFza01ldGFkYXRhPiA9IHtcclxuXHRcdFx0XHRpZDogJ2NhY2hlLTEnLFxyXG5cdFx0XHRcdGNvbnRlbnQ6ICdNZWV0aW5nJyxcclxuXHRcdFx0XHRmaWxlUGF0aDogJy90ZXN0L2ZpbGUubWQnLFxyXG5cdFx0XHRcdGxpbmU6IDEsXHJcblx0XHRcdFx0Y29tcGxldGVkOiBmYWxzZSxcclxuXHRcdFx0XHRzdGF0dXM6ICdbIF0nLFxyXG5cdFx0XHRcdG9yaWdpbmFsTWFya2Rvd246ICctIFsgXSBNZWV0aW5nJyxcclxuXHRcdFx0XHRtZXRhZGF0YToge1xyXG5cdFx0XHRcdFx0c3RhcnREYXRlOiBuZXcgRGF0ZSgyMDIzLCAwLCAxLCA5LCAzMCwgMCkuZ2V0VGltZSgpLFxyXG5cdFx0XHRcdFx0dGFnczogW10sXHJcblx0XHRcdFx0XHRjaGlsZHJlbjogW11cclxuXHRcdFx0XHR9XHJcblx0XHRcdH07XHJcblxyXG5cdFx0XHRtaWdyYXRpb25TZXJ2aWNlLm1pZ3JhdGVUYXNrVG9FbmhhbmNlZCh0YXNrKTtcclxuXHRcdFx0ZXhwZWN0KG1pZ3JhdGlvblNlcnZpY2UuZ2V0U3RhdHMoKS5taWdyYXRlZENvdW50KS50b0JlKDEpO1xyXG5cclxuXHRcdFx0bWlncmF0aW9uU2VydmljZS5jbGVhckNhY2hlKCk7XHJcblx0XHRcdGV4cGVjdChtaWdyYXRpb25TZXJ2aWNlLmdldFN0YXRzKCkubWlncmF0ZWRDb3VudCkudG9CZSgwKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG59KTsiXX0=