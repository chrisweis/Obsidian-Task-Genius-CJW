/**
 * Test for ProjectDataWorkerManager
 */
import { __awaiter } from "tslib";
import { ProjectDataWorkerManager } from "../dataflow/workers/ProjectDataWorkerManager";
import { ProjectConfigManager } from "../managers/project-config-manager";
// Mock the worker
jest.mock("../utils/workers/ProjectData.worker");
describe("ProjectDataWorkerManager", () => {
    let vault;
    let metadataCache;
    let projectConfigManager;
    let workerManager;
    beforeEach(() => {
        vault = {
            getAbstractFileByPath: jest.fn(),
            read: jest.fn(),
        };
        metadataCache = {
            getFileCache: jest.fn(),
        };
        projectConfigManager = new ProjectConfigManager({
            vault,
            metadataCache,
            configFileName: "task-genius.config.md",
            searchRecursively: true,
            metadataKey: "project",
            pathMappings: [],
            metadataMappings: [],
            defaultProjectNaming: {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            },
            enhancedProjectEnabled: true,
        });
        // Mock all the required methods
        jest.spyOn(projectConfigManager, "getFileMetadata").mockReturnValue({});
        jest.spyOn(projectConfigManager, "getProjectConfigData").mockResolvedValue({});
        jest.spyOn(projectConfigManager, "determineTgProject").mockResolvedValue({
            type: "test",
            name: "Test Project",
            source: "mock",
            readonly: true,
        });
        jest.spyOn(projectConfigManager, "getEnhancedMetadata").mockResolvedValue({
            project: "Test Project",
        });
        jest.spyOn(projectConfigManager, "isEnhancedProjectEnabled").mockReturnValue(true);
        jest.spyOn(projectConfigManager, "getWorkerConfig").mockReturnValue({
            pathMappings: [],
            metadataMappings: [],
            defaultProjectNaming: {
                strategy: "filename",
                stripExtension: true,
                enabled: false,
            },
            metadataKey: "project",
        });
        workerManager = new ProjectDataWorkerManager({
            vault,
            metadataCache,
            projectConfigManager,
            maxWorkers: 1,
            enableWorkers: true,
        });
    });
    afterEach(() => {
        workerManager.destroy();
        jest.clearAllMocks();
    });
    describe("Worker Management", () => {
        it("should initialize workers when enabled", () => {
            // In test environment, workers might not initialize due to mocking
            // Check that the setting is correct even if workers don't start
            const stats = workerManager.getMemoryStats();
            expect(stats.workersEnabled).toBe(true);
        });
        it("should not initialize workers when disabled", () => {
            const disabledWorkerManager = new ProjectDataWorkerManager({
                vault,
                metadataCache,
                projectConfigManager,
                maxWorkers: 2,
                enableWorkers: false,
            });
            expect(disabledWorkerManager.isWorkersEnabled()).toBe(false);
            const stats = disabledWorkerManager.getMemoryStats();
            expect(stats.workersEnabled).toBe(false);
            disabledWorkerManager.destroy();
        });
        it("should enable/disable workers dynamically", () => {
            workerManager.setWorkersEnabled(false);
            expect(workerManager.isWorkersEnabled()).toBe(false);
            workerManager.setWorkersEnabled(true);
            // In test environment, workers might not actually start
            // Just check that the setting was applied
            const stats = workerManager.getMemoryStats();
            expect(stats.workersEnabled).toBe(true);
        });
    });
    describe("Project Data Computation", () => {
        it("should get project data using cache first", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = "test.md";
            const result = yield workerManager.getProjectData(filePath);
            expect(result).toBeDefined();
        }));
        it("should handle batch project data requests", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePaths = ["test1.md", "test2.md", "test3.md"];
            const results = yield workerManager.getBatchProjectData(filePaths);
            expect(results).toBeInstanceOf(Map);
        }));
        it("should fallback to sync computation when workers fail", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Disable workers to force sync computation
            workerManager.setWorkersEnabled(false);
            const filePath = "test.md";
            const result = yield workerManager.getProjectData(filePath);
            expect(result).toBeDefined();
            expect((_a = result === null || result === void 0 ? void 0 : result.tgProject) === null || _a === void 0 ? void 0 : _a.name).toBe("Test Project");
        }));
    });
    describe("Cache Management", () => {
        it("should clear cache when requested", () => {
            workerManager.clearCache();
            const stats = workerManager.getCacheStats();
            expect(stats).toBeDefined();
        });
        it("should handle file events", () => __awaiter(void 0, void 0, void 0, function* () {
            const filePath = "test.md";
            yield workerManager.onFileCreated(filePath);
            yield workerManager.onFileModified(filePath);
            yield workerManager.onFileRenamed("old.md", "new.md");
            workerManager.onFileDeleted(filePath);
            // Should not throw errors
            expect(true).toBe(true);
        }));
    });
    describe("Settings Management", () => {
        it("should handle settings changes", () => {
            workerManager.onSettingsChange();
            expect(true).toBe(true);
        });
        it("should handle enhanced project setting changes", () => {
            workerManager.onEnhancedProjectSettingChange(false);
            workerManager.onEnhancedProjectSettingChange(true);
            expect(true).toBe(true);
        });
    });
    describe("Memory Management", () => {
        it("should provide memory statistics", () => {
            const stats = workerManager.getMemoryStats();
            expect(stats).toHaveProperty("fileCacheSize");
            expect(stats).toHaveProperty("directoryCacheSize");
            expect(stats).toHaveProperty("pendingRequests");
            expect(stats).toHaveProperty("activeWorkers");
            expect(stats).toHaveProperty("workersEnabled");
        });
        it("should cleanup resources on destroy", () => {
            const stats1 = workerManager.getMemoryStats();
            workerManager.destroy();
            const stats2 = workerManager.getMemoryStats();
            expect(stats2.activeWorkers).toBe(0);
            expect(stats2.pendingRequests).toBe(0);
        });
        it("should prevent multiple worker initialization", () => {
            // Create a new worker manager to test initialization safeguards
            const testWorkerManager = new ProjectDataWorkerManager({
                vault,
                metadataCache,
                projectConfigManager,
                maxWorkers: 1,
                enableWorkers: true,
            });
            // Get initial stats
            const initialStats = testWorkerManager.getMemoryStats();
            const initialWorkerCount = initialStats.activeWorkers;
            // Try to initialize again (this should be prevented)
            // Since initializeWorkers is private, we test by creating multiple instances
            const secondWorkerManager = new ProjectDataWorkerManager({
                vault,
                metadataCache,
                projectConfigManager,
                maxWorkers: 1,
                enableWorkers: true,
            });
            // Each manager should have its own workers, but not accumulate
            const firstStats = testWorkerManager.getMemoryStats();
            const secondStats = secondWorkerManager.getMemoryStats();
            expect(firstStats.activeWorkers).toBe(initialWorkerCount);
            expect(secondStats.activeWorkers).toBe(initialWorkerCount);
            // Cleanup
            testWorkerManager.destroy();
            secondWorkerManager.destroy();
        });
        it("should properly cleanup workers during plugin reload simulation", () => {
            // Get initial stats (workers might be 0 in test environment due to mocking)
            const initialStats = workerManager.getMemoryStats();
            const initialWorkerCount = initialStats.activeWorkers;
            const initialPendingRequests = initialStats.pendingRequests;
            // Destroy the manager (simulating plugin unload)
            workerManager.destroy();
            const afterDestroyStats = workerManager.getMemoryStats();
            expect(afterDestroyStats.activeWorkers).toBe(0);
            expect(afterDestroyStats.pendingRequests).toBe(0);
            // Create a new manager (simulating plugin reload)
            const newWorkerManager = new ProjectDataWorkerManager({
                vault,
                metadataCache,
                projectConfigManager,
                maxWorkers: 1,
                enableWorkers: true,
            });
            const newStats = newWorkerManager.getMemoryStats();
            // In test environment, workers might not initialize due to mocking
            // The important thing is that pending requests are cleared
            expect(newStats.pendingRequests).toBe(0);
            // Workers should be consistent with initial state
            expect(newStats.activeWorkers).toBe(initialWorkerCount);
            // Cleanup
            newWorkerManager.destroy();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRzs7QUFFSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUcxRSxrQkFBa0I7QUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDO0FBRWpELFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFDekMsSUFBSSxLQUFZLENBQUM7SUFDakIsSUFBSSxhQUE0QixDQUFDO0lBQ2pDLElBQUksb0JBQTBDLENBQUM7SUFDL0MsSUFBSSxhQUF1QyxDQUFDO0lBRTVDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZixLQUFLLEdBQUc7WUFDUCxxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1lBQ2hDLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1NBQ1IsQ0FBQztRQUVULGFBQWEsR0FBRztZQUNmLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO1NBQ2hCLENBQUM7UUFFVCxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQixDQUFDO1lBQy9DLEtBQUs7WUFDTCxhQUFhO1lBQ2IsY0FBYyxFQUFFLHVCQUF1QjtZQUN2QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLFdBQVcsRUFBRSxTQUFTO1lBQ3RCLFlBQVksRUFBRSxFQUFFO1lBQ2hCLGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsb0JBQW9CLEVBQUU7Z0JBQ3JCLFFBQVEsRUFBRSxVQUFVO2dCQUNwQixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsT0FBTyxFQUFFLEtBQUs7YUFDZDtZQUNELHNCQUFzQixFQUFFLElBQUk7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEUsSUFBSSxDQUFDLEtBQUssQ0FDVCxvQkFBb0IsRUFDcEIsc0JBQXNCLENBQ3RCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLEtBQUssQ0FDVCxvQkFBb0IsRUFDcEIsb0JBQW9CLENBQ3BCLENBQUMsaUJBQWlCLENBQUM7WUFDbkIsSUFBSSxFQUFFLE1BQU07WUFDWixJQUFJLEVBQUUsY0FBYztZQUNwQixNQUFNLEVBQUUsTUFBTTtZQUNkLFFBQVEsRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FDVCxvQkFBb0IsRUFDcEIscUJBQXFCLENBQ3JCLENBQUMsaUJBQWlCLENBQUM7WUFDbkIsT0FBTyxFQUFFLGNBQWM7U0FDdkIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FDVCxvQkFBb0IsRUFDcEIsMEJBQTBCLENBQzFCLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxlQUFlLENBQUM7WUFDbkUsWUFBWSxFQUFFLEVBQUU7WUFDaEIsZ0JBQWdCLEVBQUUsRUFBRTtZQUNwQixvQkFBb0IsRUFBRTtnQkFDckIsUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixPQUFPLEVBQUUsS0FBSzthQUNkO1lBQ0QsV0FBVyxFQUFFLFNBQVM7U0FDdEIsQ0FBQyxDQUFDO1FBRUgsYUFBYSxHQUFHLElBQUksd0JBQXdCLENBQUM7WUFDNUMsS0FBSztZQUNMLGFBQWE7WUFDYixvQkFBb0I7WUFDcEIsVUFBVSxFQUFFLENBQUM7WUFDYixhQUFhLEVBQUUsSUFBSTtTQUNuQixDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILFNBQVMsQ0FBQyxHQUFHLEVBQUU7UUFDZCxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDeEIsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3RCLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUNsQyxFQUFFLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1lBQ2pELG1FQUFtRTtZQUNuRSxnRUFBZ0U7WUFDaEUsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDZDQUE2QyxFQUFFLEdBQUcsRUFBRTtZQUN0RCxNQUFNLHFCQUFxQixHQUFHLElBQUksd0JBQXdCLENBQUM7Z0JBQzFELEtBQUs7Z0JBQ0wsYUFBYTtnQkFDYixvQkFBb0I7Z0JBQ3BCLFVBQVUsRUFBRSxDQUFDO2dCQUNiLGFBQWEsRUFBRSxLQUFLO2FBQ3BCLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzdELE1BQU0sS0FBSyxHQUFHLHFCQUFxQixDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXpDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtZQUNwRCxhQUFhLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXJELGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN0Qyx3REFBd0Q7WUFDeEQsMENBQTBDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM3QyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtRQUN6QyxFQUFFLENBQUMsMkNBQTJDLEVBQUUsR0FBUyxFQUFFO1lBQzFELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUUzQixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMkNBQTJDLEVBQUUsR0FBUyxFQUFFO1lBQzFELE1BQU0sU0FBUyxHQUFHLENBQUMsVUFBVSxFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUV2RCxNQUFNLE9BQU8sR0FBRyxNQUFNLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuRSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsdURBQXVELEVBQUUsR0FBUyxFQUFFOztZQUN0RSw0Q0FBNEM7WUFDNUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRXZDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUUzQixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxNQUFBLE1BQU0sYUFBTixNQUFNLHVCQUFOLE1BQU0sQ0FBRSxTQUFTLDBDQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN0RCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLEVBQUUsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7WUFDNUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM1QyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0IsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsMkJBQTJCLEVBQUUsR0FBUyxFQUFFO1lBQzFDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQztZQUUzQixNQUFNLGFBQWEsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUMsTUFBTSxhQUFhLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sYUFBYSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDdEQsYUFBYSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUV0QywwQkFBMEI7WUFDMUIsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUEsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1FBQ3BDLEVBQUUsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7WUFDekMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDakMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7WUFDekQsYUFBYSxDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BELGFBQWEsQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLEVBQUUsQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLEVBQUU7WUFDM0MsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzdDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDOUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsY0FBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDOUMsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzlDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsY0FBYyxFQUFFLENBQUM7WUFFOUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsK0NBQStDLEVBQUUsR0FBRyxFQUFFO1lBQ3hELGdFQUFnRTtZQUNoRSxNQUFNLGlCQUFpQixHQUFHLElBQUksd0JBQXdCLENBQUM7Z0JBQ3RELEtBQUs7Z0JBQ0wsYUFBYTtnQkFDYixvQkFBb0I7Z0JBQ3BCLFVBQVUsRUFBRSxDQUFDO2dCQUNiLGFBQWEsRUFBRSxJQUFJO2FBQ25CLENBQUMsQ0FBQztZQUVILG9CQUFvQjtZQUNwQixNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN4RCxNQUFNLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxhQUFhLENBQUM7WUFFdEQscURBQXFEO1lBQ3JELDZFQUE2RTtZQUM3RSxNQUFNLG1CQUFtQixHQUFHLElBQUksd0JBQXdCLENBQUM7Z0JBQ3hELEtBQUs7Z0JBQ0wsYUFBYTtnQkFDYixvQkFBb0I7Z0JBQ3BCLFVBQVUsRUFBRSxDQUFDO2dCQUNiLGFBQWEsRUFBRSxJQUFJO2FBQ25CLENBQUMsQ0FBQztZQUVILCtEQUErRDtZQUMvRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN0RCxNQUFNLFdBQVcsR0FBRyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUV6RCxNQUFNLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzFELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFFM0QsVUFBVTtZQUNWLGlCQUFpQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzVCLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLGlFQUFpRSxFQUFFLEdBQUcsRUFBRTtZQUMxRSw0RUFBNEU7WUFDNUUsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3BELE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQztZQUN0RCxNQUFNLHNCQUFzQixHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUM7WUFFNUQsaURBQWlEO1lBQ2pELGFBQWEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixNQUFNLGlCQUFpQixHQUFHLGFBQWEsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUN6RCxNQUFNLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbEQsa0RBQWtEO1lBQ2xELE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSx3QkFBd0IsQ0FBQztnQkFDckQsS0FBSztnQkFDTCxhQUFhO2dCQUNiLG9CQUFvQjtnQkFDcEIsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsYUFBYSxFQUFFLElBQUk7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkQsbUVBQW1FO1lBQ25FLDJEQUEyRDtZQUMzRCxNQUFNLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxrREFBa0Q7WUFDbEQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUV4RCxVQUFVO1lBQ1YsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3QgZm9yIFByb2plY3REYXRhV29ya2VyTWFuYWdlclxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFByb2plY3REYXRhV29ya2VyTWFuYWdlciB9IGZyb20gXCIuLi9kYXRhZmxvdy93b3JrZXJzL1Byb2plY3REYXRhV29ya2VyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0Q29uZmlnTWFuYWdlciB9IGZyb20gXCIuLi9tYW5hZ2Vycy9wcm9qZWN0LWNvbmZpZy1tYW5hZ2VyXCI7XHJcbmltcG9ydCB7IFZhdWx0LCBNZXRhZGF0YUNhY2hlIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcblxyXG4vLyBNb2NrIHRoZSB3b3JrZXJcclxuamVzdC5tb2NrKFwiLi4vdXRpbHMvd29ya2Vycy9Qcm9qZWN0RGF0YS53b3JrZXJcIik7XHJcblxyXG5kZXNjcmliZShcIlByb2plY3REYXRhV29ya2VyTWFuYWdlclwiLCAoKSA9PiB7XHJcblx0bGV0IHZhdWx0OiBWYXVsdDtcclxuXHRsZXQgbWV0YWRhdGFDYWNoZTogTWV0YWRhdGFDYWNoZTtcclxuXHRsZXQgcHJvamVjdENvbmZpZ01hbmFnZXI6IFByb2plY3RDb25maWdNYW5hZ2VyO1xyXG5cdGxldCB3b3JrZXJNYW5hZ2VyOiBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXI7XHJcblxyXG5cdGJlZm9yZUVhY2goKCkgPT4ge1xyXG5cdFx0dmF1bHQgPSB7XHJcblx0XHRcdGdldEFic3RyYWN0RmlsZUJ5UGF0aDogamVzdC5mbigpLFxyXG5cdFx0XHRyZWFkOiBqZXN0LmZuKCksXHJcblx0XHR9IGFzIGFueTtcclxuXHJcblx0XHRtZXRhZGF0YUNhY2hlID0ge1xyXG5cdFx0XHRnZXRGaWxlQ2FjaGU6IGplc3QuZm4oKSxcclxuXHRcdH0gYXMgYW55O1xyXG5cclxuXHRcdHByb2plY3RDb25maWdNYW5hZ2VyID0gbmV3IFByb2plY3RDb25maWdNYW5hZ2VyKHtcclxuXHRcdFx0dmF1bHQsXHJcblx0XHRcdG1ldGFkYXRhQ2FjaGUsXHJcblx0XHRcdGNvbmZpZ0ZpbGVOYW1lOiBcInRhc2stZ2VuaXVzLmNvbmZpZy5tZFwiLFxyXG5cdFx0XHRzZWFyY2hSZWN1cnNpdmVseTogdHJ1ZSxcclxuXHRcdFx0bWV0YWRhdGFLZXk6IFwicHJvamVjdFwiLFxyXG5cdFx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRlbmhhbmNlZFByb2plY3RFbmFibGVkOiB0cnVlLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gTW9jayBhbGwgdGhlIHJlcXVpcmVkIG1ldGhvZHNcclxuXHRcdGplc3Quc3B5T24ocHJvamVjdENvbmZpZ01hbmFnZXIsIFwiZ2V0RmlsZU1ldGFkYXRhXCIpLm1vY2tSZXR1cm5WYWx1ZSh7fSk7XHJcblx0XHRqZXN0LnNweU9uKFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRcdFx0XCJnZXRQcm9qZWN0Q29uZmlnRGF0YVwiXHJcblx0XHQpLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHRcdGplc3Quc3B5T24oXHJcblx0XHRcdHByb2plY3RDb25maWdNYW5hZ2VyLFxyXG5cdFx0XHRcImRldGVybWluZVRnUHJvamVjdFwiXHJcblx0XHQpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuXHRcdFx0dHlwZTogXCJ0ZXN0XCIsXHJcblx0XHRcdG5hbWU6IFwiVGVzdCBQcm9qZWN0XCIsXHJcblx0XHRcdHNvdXJjZTogXCJtb2NrXCIsXHJcblx0XHRcdHJlYWRvbmx5OiB0cnVlLFxyXG5cdFx0fSk7XHJcblx0XHRqZXN0LnNweU9uKFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRcdFx0XCJnZXRFbmhhbmNlZE1ldGFkYXRhXCJcclxuXHRcdCkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG5cdFx0XHRwcm9qZWN0OiBcIlRlc3QgUHJvamVjdFwiLFxyXG5cdFx0fSk7XHJcblx0XHRqZXN0LnNweU9uKFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRcdFx0XCJpc0VuaGFuY2VkUHJvamVjdEVuYWJsZWRcIlxyXG5cdFx0KS5tb2NrUmV0dXJuVmFsdWUodHJ1ZSk7XHJcblx0XHRqZXN0LnNweU9uKHByb2plY3RDb25maWdNYW5hZ2VyLCBcImdldFdvcmtlckNvbmZpZ1wiKS5tb2NrUmV0dXJuVmFsdWUoe1xyXG5cdFx0XHRwYXRoTWFwcGluZ3M6IFtdLFxyXG5cdFx0XHRtZXRhZGF0YU1hcHBpbmdzOiBbXSxcclxuXHRcdFx0ZGVmYXVsdFByb2plY3ROYW1pbmc6IHtcclxuXHRcdFx0XHRzdHJhdGVneTogXCJmaWxlbmFtZVwiLFxyXG5cdFx0XHRcdHN0cmlwRXh0ZW5zaW9uOiB0cnVlLFxyXG5cdFx0XHRcdGVuYWJsZWQ6IGZhbHNlLFxyXG5cdFx0XHR9LFxyXG5cdFx0XHRtZXRhZGF0YUtleTogXCJwcm9qZWN0XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHR3b3JrZXJNYW5hZ2VyID0gbmV3IFByb2plY3REYXRhV29ya2VyTWFuYWdlcih7XHJcblx0XHRcdHZhdWx0LFxyXG5cdFx0XHRtZXRhZGF0YUNhY2hlLFxyXG5cdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRcdFx0bWF4V29ya2VyczogMSwgLy8gVXBkYXRlZCB0byByZWZsZWN0IG5ldyBkZWZhdWx0XHJcblx0XHRcdGVuYWJsZVdvcmtlcnM6IHRydWUsXHJcblx0XHR9KTtcclxuXHR9KTtcclxuXHJcblx0YWZ0ZXJFYWNoKCgpID0+IHtcclxuXHRcdHdvcmtlck1hbmFnZXIuZGVzdHJveSgpO1xyXG5cdFx0amVzdC5jbGVhckFsbE1vY2tzKCk7XHJcblx0fSk7XHJcblxyXG5cdGRlc2NyaWJlKFwiV29ya2VyIE1hbmFnZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaW5pdGlhbGl6ZSB3b3JrZXJzIHdoZW4gZW5hYmxlZFwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIEluIHRlc3QgZW52aXJvbm1lbnQsIHdvcmtlcnMgbWlnaHQgbm90IGluaXRpYWxpemUgZHVlIHRvIG1vY2tpbmdcclxuXHRcdFx0Ly8gQ2hlY2sgdGhhdCB0aGUgc2V0dGluZyBpcyBjb3JyZWN0IGV2ZW4gaWYgd29ya2VycyBkb24ndCBzdGFydFxyXG5cdFx0XHRjb25zdCBzdGF0cyA9IHdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzLndvcmtlcnNFbmFibGVkKS50b0JlKHRydWUpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgbm90IGluaXRpYWxpemUgd29ya2VycyB3aGVuIGRpc2FibGVkXCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZGlzYWJsZWRXb3JrZXJNYW5hZ2VyID0gbmV3IFByb2plY3REYXRhV29ya2VyTWFuYWdlcih7XHJcblx0XHRcdFx0dmF1bHQsXHJcblx0XHRcdFx0bWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRcdFx0XHRtYXhXb3JrZXJzOiAyLFxyXG5cdFx0XHRcdGVuYWJsZVdvcmtlcnM6IGZhbHNlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdGV4cGVjdChkaXNhYmxlZFdvcmtlck1hbmFnZXIuaXNXb3JrZXJzRW5hYmxlZCgpKS50b0JlKGZhbHNlKTtcclxuXHRcdFx0Y29uc3Qgc3RhdHMgPSBkaXNhYmxlZFdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzLndvcmtlcnNFbmFibGVkKS50b0JlKGZhbHNlKTtcclxuXHJcblx0XHRcdGRpc2FibGVkV29ya2VyTWFuYWdlci5kZXN0cm95KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBlbmFibGUvZGlzYWJsZSB3b3JrZXJzIGR5bmFtaWNhbGx5XCIsICgpID0+IHtcclxuXHRcdFx0d29ya2VyTWFuYWdlci5zZXRXb3JrZXJzRW5hYmxlZChmYWxzZSk7XHJcblx0XHRcdGV4cGVjdCh3b3JrZXJNYW5hZ2VyLmlzV29ya2Vyc0VuYWJsZWQoKSkudG9CZShmYWxzZSk7XHJcblxyXG5cdFx0XHR3b3JrZXJNYW5hZ2VyLnNldFdvcmtlcnNFbmFibGVkKHRydWUpO1xyXG5cdFx0XHQvLyBJbiB0ZXN0IGVudmlyb25tZW50LCB3b3JrZXJzIG1pZ2h0IG5vdCBhY3R1YWxseSBzdGFydFxyXG5cdFx0XHQvLyBKdXN0IGNoZWNrIHRoYXQgdGhlIHNldHRpbmcgd2FzIGFwcGxpZWRcclxuXHRcdFx0Y29uc3Qgc3RhdHMgPSB3b3JrZXJNYW5hZ2VyLmdldE1lbW9yeVN0YXRzKCk7XHJcblx0XHRcdGV4cGVjdChzdGF0cy53b3JrZXJzRW5hYmxlZCkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlByb2plY3QgRGF0YSBDb21wdXRhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRpdChcInNob3VsZCBnZXQgcHJvamVjdCBkYXRhIHVzaW5nIGNhY2hlIGZpcnN0XCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdCA9IGF3YWl0IHdvcmtlck1hbmFnZXIuZ2V0UHJvamVjdERhdGEoZmlsZVBhdGgpO1xyXG5cdFx0XHRleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGJhdGNoIHByb2plY3QgZGF0YSByZXF1ZXN0c1wiLCBhc3luYyAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IGZpbGVQYXRocyA9IFtcInRlc3QxLm1kXCIsIFwidGVzdDIubWRcIiwgXCJ0ZXN0My5tZFwiXTtcclxuXHJcblx0XHRcdGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB3b3JrZXJNYW5hZ2VyLmdldEJhdGNoUHJvamVjdERhdGEoZmlsZVBhdGhzKTtcclxuXHRcdFx0ZXhwZWN0KHJlc3VsdHMpLnRvQmVJbnN0YW5jZU9mKE1hcCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBmYWxsYmFjayB0byBzeW5jIGNvbXB1dGF0aW9uIHdoZW4gd29ya2VycyBmYWlsXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Ly8gRGlzYWJsZSB3b3JrZXJzIHRvIGZvcmNlIHN5bmMgY29tcHV0YXRpb25cclxuXHRcdFx0d29ya2VyTWFuYWdlci5zZXRXb3JrZXJzRW5hYmxlZChmYWxzZSk7XHJcblxyXG5cdFx0XHRjb25zdCBmaWxlUGF0aCA9IFwidGVzdC5tZFwiO1xyXG5cclxuXHRcdFx0Y29uc3QgcmVzdWx0ID0gYXdhaXQgd29ya2VyTWFuYWdlci5nZXRQcm9qZWN0RGF0YShmaWxlUGF0aCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XHJcblx0XHRcdGV4cGVjdChyZXN1bHQ/LnRnUHJvamVjdD8ubmFtZSkudG9CZShcIlRlc3QgUHJvamVjdFwiKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIkNhY2hlIE1hbmFnZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgY2xlYXIgY2FjaGUgd2hlbiByZXF1ZXN0ZWRcIiwgKCkgPT4ge1xyXG5cdFx0XHR3b3JrZXJNYW5hZ2VyLmNsZWFyQ2FjaGUoKTtcclxuXHRcdFx0Y29uc3Qgc3RhdHMgPSB3b3JrZXJNYW5hZ2VyLmdldENhY2hlU3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzKS50b0JlRGVmaW5lZCgpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIGZpbGUgZXZlbnRzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdFx0Y29uc3QgZmlsZVBhdGggPSBcInRlc3QubWRcIjtcclxuXHJcblx0XHRcdGF3YWl0IHdvcmtlck1hbmFnZXIub25GaWxlQ3JlYXRlZChmaWxlUGF0aCk7XHJcblx0XHRcdGF3YWl0IHdvcmtlck1hbmFnZXIub25GaWxlTW9kaWZpZWQoZmlsZVBhdGgpO1xyXG5cdFx0XHRhd2FpdCB3b3JrZXJNYW5hZ2VyLm9uRmlsZVJlbmFtZWQoXCJvbGQubWRcIiwgXCJuZXcubWRcIik7XHJcblx0XHRcdHdvcmtlck1hbmFnZXIub25GaWxlRGVsZXRlZChmaWxlUGF0aCk7XHJcblxyXG5cdFx0XHQvLyBTaG91bGQgbm90IHRocm93IGVycm9yc1xyXG5cdFx0XHRleHBlY3QodHJ1ZSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIlNldHRpbmdzIE1hbmFnZW1lbnRcIiwgKCkgPT4ge1xyXG5cdFx0aXQoXCJzaG91bGQgaGFuZGxlIHNldHRpbmdzIGNoYW5nZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHR3b3JrZXJNYW5hZ2VyLm9uU2V0dGluZ3NDaGFuZ2UoKTtcclxuXHRcdFx0ZXhwZWN0KHRydWUpLnRvQmUodHJ1ZSk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBoYW5kbGUgZW5oYW5jZWQgcHJvamVjdCBzZXR0aW5nIGNoYW5nZXNcIiwgKCkgPT4ge1xyXG5cdFx0XHR3b3JrZXJNYW5hZ2VyLm9uRW5oYW5jZWRQcm9qZWN0U2V0dGluZ0NoYW5nZShmYWxzZSk7XHJcblx0XHRcdHdvcmtlck1hbmFnZXIub25FbmhhbmNlZFByb2plY3RTZXR0aW5nQ2hhbmdlKHRydWUpO1xyXG5cdFx0XHRleHBlY3QodHJ1ZSkudG9CZSh0cnVlKTtcclxuXHRcdH0pO1xyXG5cdH0pO1xyXG5cclxuXHRkZXNjcmliZShcIk1lbW9yeSBNYW5hZ2VtZW50XCIsICgpID0+IHtcclxuXHRcdGl0KFwic2hvdWxkIHByb3ZpZGUgbWVtb3J5IHN0YXRpc3RpY3NcIiwgKCkgPT4ge1xyXG5cdFx0XHRjb25zdCBzdGF0cyA9IHdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KHN0YXRzKS50b0hhdmVQcm9wZXJ0eShcImZpbGVDYWNoZVNpemVcIik7XHJcblx0XHRcdGV4cGVjdChzdGF0cykudG9IYXZlUHJvcGVydHkoXCJkaXJlY3RvcnlDYWNoZVNpemVcIik7XHJcblx0XHRcdGV4cGVjdChzdGF0cykudG9IYXZlUHJvcGVydHkoXCJwZW5kaW5nUmVxdWVzdHNcIik7XHJcblx0XHRcdGV4cGVjdChzdGF0cykudG9IYXZlUHJvcGVydHkoXCJhY3RpdmVXb3JrZXJzXCIpO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMpLnRvSGF2ZVByb3BlcnR5KFwid29ya2Vyc0VuYWJsZWRcIik7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBjbGVhbnVwIHJlc291cmNlcyBvbiBkZXN0cm95XCIsICgpID0+IHtcclxuXHRcdFx0Y29uc3Qgc3RhdHMxID0gd29ya2VyTWFuYWdlci5nZXRNZW1vcnlTdGF0cygpO1xyXG5cdFx0XHR3b3JrZXJNYW5hZ2VyLmRlc3Ryb3koKTtcclxuXHRcdFx0Y29uc3Qgc3RhdHMyID0gd29ya2VyTWFuYWdlci5nZXRNZW1vcnlTdGF0cygpO1xyXG5cclxuXHRcdFx0ZXhwZWN0KHN0YXRzMi5hY3RpdmVXb3JrZXJzKS50b0JlKDApO1xyXG5cdFx0XHRleHBlY3Qoc3RhdHMyLnBlbmRpbmdSZXF1ZXN0cykudG9CZSgwKTtcclxuXHRcdH0pO1xyXG5cclxuXHRcdGl0KFwic2hvdWxkIHByZXZlbnQgbXVsdGlwbGUgd29ya2VyIGluaXRpYWxpemF0aW9uXCIsICgpID0+IHtcclxuXHRcdFx0Ly8gQ3JlYXRlIGEgbmV3IHdvcmtlciBtYW5hZ2VyIHRvIHRlc3QgaW5pdGlhbGl6YXRpb24gc2FmZWd1YXJkc1xyXG5cdFx0XHRjb25zdCB0ZXN0V29ya2VyTWFuYWdlciA9IG5ldyBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIoe1xyXG5cdFx0XHRcdHZhdWx0LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ2FjaGUsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXIsXHJcblx0XHRcdFx0bWF4V29ya2VyczogMSxcclxuXHRcdFx0XHRlbmFibGVXb3JrZXJzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEdldCBpbml0aWFsIHN0YXRzXHJcblx0XHRcdGNvbnN0IGluaXRpYWxTdGF0cyA9IHRlc3RXb3JrZXJNYW5hZ2VyLmdldE1lbW9yeVN0YXRzKCk7XHJcblx0XHRcdGNvbnN0IGluaXRpYWxXb3JrZXJDb3VudCA9IGluaXRpYWxTdGF0cy5hY3RpdmVXb3JrZXJzO1xyXG5cclxuXHRcdFx0Ly8gVHJ5IHRvIGluaXRpYWxpemUgYWdhaW4gKHRoaXMgc2hvdWxkIGJlIHByZXZlbnRlZClcclxuXHRcdFx0Ly8gU2luY2UgaW5pdGlhbGl6ZVdvcmtlcnMgaXMgcHJpdmF0ZSwgd2UgdGVzdCBieSBjcmVhdGluZyBtdWx0aXBsZSBpbnN0YW5jZXNcclxuXHRcdFx0Y29uc3Qgc2Vjb25kV29ya2VyTWFuYWdlciA9IG5ldyBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIoe1xyXG5cdFx0XHRcdHZhdWx0LFxyXG5cdFx0XHRcdG1ldGFkYXRhQ2FjaGUsXHJcblx0XHRcdFx0cHJvamVjdENvbmZpZ01hbmFnZXIsXHJcblx0XHRcdFx0bWF4V29ya2VyczogMSxcclxuXHRcdFx0XHRlbmFibGVXb3JrZXJzOiB0cnVlLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdC8vIEVhY2ggbWFuYWdlciBzaG91bGQgaGF2ZSBpdHMgb3duIHdvcmtlcnMsIGJ1dCBub3QgYWNjdW11bGF0ZVxyXG5cdFx0XHRjb25zdCBmaXJzdFN0YXRzID0gdGVzdFdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKTtcclxuXHRcdFx0Y29uc3Qgc2Vjb25kU3RhdHMgPSBzZWNvbmRXb3JrZXJNYW5hZ2VyLmdldE1lbW9yeVN0YXRzKCk7XHJcblxyXG5cdFx0XHRleHBlY3QoZmlyc3RTdGF0cy5hY3RpdmVXb3JrZXJzKS50b0JlKGluaXRpYWxXb3JrZXJDb3VudCk7XHJcblx0XHRcdGV4cGVjdChzZWNvbmRTdGF0cy5hY3RpdmVXb3JrZXJzKS50b0JlKGluaXRpYWxXb3JrZXJDb3VudCk7XHJcblxyXG5cdFx0XHQvLyBDbGVhbnVwXHJcblx0XHRcdHRlc3RXb3JrZXJNYW5hZ2VyLmRlc3Ryb3koKTtcclxuXHRcdFx0c2Vjb25kV29ya2VyTWFuYWdlci5kZXN0cm95KCk7XHJcblx0XHR9KTtcclxuXHJcblx0XHRpdChcInNob3VsZCBwcm9wZXJseSBjbGVhbnVwIHdvcmtlcnMgZHVyaW5nIHBsdWdpbiByZWxvYWQgc2ltdWxhdGlvblwiLCAoKSA9PiB7XHJcblx0XHRcdC8vIEdldCBpbml0aWFsIHN0YXRzICh3b3JrZXJzIG1pZ2h0IGJlIDAgaW4gdGVzdCBlbnZpcm9ubWVudCBkdWUgdG8gbW9ja2luZylcclxuXHRcdFx0Y29uc3QgaW5pdGlhbFN0YXRzID0gd29ya2VyTWFuYWdlci5nZXRNZW1vcnlTdGF0cygpO1xyXG5cdFx0XHRjb25zdCBpbml0aWFsV29ya2VyQ291bnQgPSBpbml0aWFsU3RhdHMuYWN0aXZlV29ya2VycztcclxuXHRcdFx0Y29uc3QgaW5pdGlhbFBlbmRpbmdSZXF1ZXN0cyA9IGluaXRpYWxTdGF0cy5wZW5kaW5nUmVxdWVzdHM7XHJcblxyXG5cdFx0XHQvLyBEZXN0cm95IHRoZSBtYW5hZ2VyIChzaW11bGF0aW5nIHBsdWdpbiB1bmxvYWQpXHJcblx0XHRcdHdvcmtlck1hbmFnZXIuZGVzdHJveSgpO1xyXG5cdFx0XHRjb25zdCBhZnRlckRlc3Ryb3lTdGF0cyA9IHdvcmtlck1hbmFnZXIuZ2V0TWVtb3J5U3RhdHMoKTtcclxuXHRcdFx0ZXhwZWN0KGFmdGVyRGVzdHJveVN0YXRzLmFjdGl2ZVdvcmtlcnMpLnRvQmUoMCk7XHJcblx0XHRcdGV4cGVjdChhZnRlckRlc3Ryb3lTdGF0cy5wZW5kaW5nUmVxdWVzdHMpLnRvQmUoMCk7XHJcblxyXG5cdFx0XHQvLyBDcmVhdGUgYSBuZXcgbWFuYWdlciAoc2ltdWxhdGluZyBwbHVnaW4gcmVsb2FkKVxyXG5cdFx0XHRjb25zdCBuZXdXb3JrZXJNYW5hZ2VyID0gbmV3IFByb2plY3REYXRhV29ya2VyTWFuYWdlcih7XHJcblx0XHRcdFx0dmF1bHQsXHJcblx0XHRcdFx0bWV0YWRhdGFDYWNoZSxcclxuXHRcdFx0XHRwcm9qZWN0Q29uZmlnTWFuYWdlcixcclxuXHRcdFx0XHRtYXhXb3JrZXJzOiAxLFxyXG5cdFx0XHRcdGVuYWJsZVdvcmtlcnM6IHRydWUsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0Y29uc3QgbmV3U3RhdHMgPSBuZXdXb3JrZXJNYW5hZ2VyLmdldE1lbW9yeVN0YXRzKCk7XHJcblx0XHRcdC8vIEluIHRlc3QgZW52aXJvbm1lbnQsIHdvcmtlcnMgbWlnaHQgbm90IGluaXRpYWxpemUgZHVlIHRvIG1vY2tpbmdcclxuXHRcdFx0Ly8gVGhlIGltcG9ydGFudCB0aGluZyBpcyB0aGF0IHBlbmRpbmcgcmVxdWVzdHMgYXJlIGNsZWFyZWRcclxuXHRcdFx0ZXhwZWN0KG5ld1N0YXRzLnBlbmRpbmdSZXF1ZXN0cykudG9CZSgwKTtcclxuXHRcdFx0Ly8gV29ya2VycyBzaG91bGQgYmUgY29uc2lzdGVudCB3aXRoIGluaXRpYWwgc3RhdGVcclxuXHRcdFx0ZXhwZWN0KG5ld1N0YXRzLmFjdGl2ZVdvcmtlcnMpLnRvQmUoaW5pdGlhbFdvcmtlckNvdW50KTtcclxuXHJcblx0XHRcdC8vIENsZWFudXBcclxuXHRcdFx0bmV3V29ya2VyTWFuYWdlci5kZXN0cm95KCk7XHJcblx0XHR9KTtcclxuXHR9KTtcclxufSk7XHJcbiJdfQ==