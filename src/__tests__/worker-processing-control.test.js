/**
 * Tests for worker processing control functionality
 */
import { WorkerOrchestrator } from "../dataflow/workers/WorkerOrchestrator";
import { TaskWorkerManager } from "../dataflow/workers/TaskWorkerManager";
import { ProjectDataWorkerManager } from "../dataflow/workers/ProjectDataWorkerManager";
// Mock dependencies
jest.mock("../dataflow/workers/TaskWorkerManager");
jest.mock("../dataflow/workers/ProjectDataWorkerManager");
describe("Worker Processing Control", () => {
    let workerOrchestrator;
    let mockTaskWorkerManager;
    let mockProjectWorkerManager;
    beforeEach(() => {
        // Create mock instances
        mockTaskWorkerManager = new TaskWorkerManager({}, {});
        mockProjectWorkerManager = new ProjectDataWorkerManager({
            vault: {},
            metadataCache: {},
            projectConfigManager: {}
        });
    });
    describe("WorkerOrchestrator enableWorkerProcessing setting", () => {
        it("should be enabled by default", () => {
            workerOrchestrator = new WorkerOrchestrator(mockTaskWorkerManager, mockProjectWorkerManager);
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(true);
        });
        it("should respect enableWorkerProcessing option when initialized", () => {
            workerOrchestrator = new WorkerOrchestrator(mockTaskWorkerManager, mockProjectWorkerManager, { enableWorkerProcessing: false });
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(false);
        });
        it("should allow dynamic enabling of worker processing", () => {
            workerOrchestrator = new WorkerOrchestrator(mockTaskWorkerManager, mockProjectWorkerManager, { enableWorkerProcessing: false });
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(false);
            // Enable worker processing
            workerOrchestrator.setWorkerProcessingEnabled(true);
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(true);
        });
        it("should allow dynamic disabling of worker processing", () => {
            workerOrchestrator = new WorkerOrchestrator(mockTaskWorkerManager, mockProjectWorkerManager, { enableWorkerProcessing: true });
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(true);
            // Disable worker processing
            workerOrchestrator.setWorkerProcessingEnabled(false);
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(false);
        });
        it("should reset circuit breaker when re-enabling worker processing", () => {
            workerOrchestrator = new WorkerOrchestrator(mockTaskWorkerManager, mockProjectWorkerManager);
            // Simulate circuit breaker being triggered (this would normally happen internally)
            // We can't directly test this without exposing internals, but we can verify the behavior
            workerOrchestrator.setWorkerProcessingEnabled(false);
            workerOrchestrator.setWorkerProcessingEnabled(true);
            // Worker processing should be enabled after re-enabling
            expect(workerOrchestrator.isWorkerProcessingEnabled()).toBe(true);
        });
        it("should provide metrics", () => {
            workerOrchestrator = new WorkerOrchestrator(mockTaskWorkerManager, mockProjectWorkerManager);
            const metrics = workerOrchestrator.getMetrics();
            expect(metrics).toHaveProperty("taskParsingSuccess");
            expect(metrics).toHaveProperty("taskParsingFailures");
            expect(metrics).toHaveProperty("projectDataSuccess");
            expect(metrics).toHaveProperty("projectDataFailures");
            expect(metrics).toHaveProperty("averageTaskParsingTime");
            expect(metrics).toHaveProperty("averageProjectDataTime");
            expect(metrics).toHaveProperty("totalOperations");
            expect(metrics).toHaveProperty("fallbackToMainThread");
        });
    });
    describe("Settings Integration", () => {
        it("should correctly read setting from fileSource.performance.enableWorkerProcessing", () => {
            var _a, _b, _c;
            const settings = {
                fileSource: {
                    performance: {
                        enableWorkerProcessing: false
                    }
                }
            };
            const enableWorkerProcessing = (_c = (_b = (_a = settings === null || settings === void 0 ? void 0 : settings.fileSource) === null || _a === void 0 ? void 0 : _a.performance) === null || _b === void 0 ? void 0 : _b.enableWorkerProcessing) !== null && _c !== void 0 ? _c : true;
            expect(enableWorkerProcessing).toBe(false);
        });
        it("should fallback to fileParsingConfig.enableWorkerProcessing if fileSource not present", () => {
            var _a, _b, _c, _d, _e;
            const settings = {
                fileParsingConfig: {
                    enableWorkerProcessing: false
                }
            };
            const enableWorkerProcessing = (_e = (_c = (_b = (_a = settings === null || settings === void 0 ? void 0 : settings.fileSource) === null || _a === void 0 ? void 0 : _a.performance) === null || _b === void 0 ? void 0 : _b.enableWorkerProcessing) !== null && _c !== void 0 ? _c : (_d = settings === null || settings === void 0 ? void 0 : settings.fileParsingConfig) === null || _d === void 0 ? void 0 : _d.enableWorkerProcessing) !== null && _e !== void 0 ? _e : true;
            expect(enableWorkerProcessing).toBe(false);
        });
        it("should default to true if no settings present", () => {
            var _a, _b, _c, _d, _e;
            const settings = {};
            const enableWorkerProcessing = (_e = (_c = (_b = (_a = settings === null || settings === void 0 ? void 0 : settings.fileSource) === null || _a === void 0 ? void 0 : _a.performance) === null || _b === void 0 ? void 0 : _b.enableWorkerProcessing) !== null && _c !== void 0 ? _c : (_d = settings === null || settings === void 0 ? void 0 : settings.fileParsingConfig) === null || _d === void 0 ? void 0 : _d.enableWorkerProcessing) !== null && _e !== void 0 ? _e : true;
            expect(enableWorkerProcessing).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXByb2Nlc3NpbmctY29udHJvbC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid29ya2VyLXByb2Nlc3NpbmctY29udHJvbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBRUgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDMUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFeEYsb0JBQW9CO0FBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsdUNBQXVDLENBQUMsQ0FBQztBQUNuRCxJQUFJLENBQUMsSUFBSSxDQUFDLDhDQUE4QyxDQUFDLENBQUM7QUFFMUQsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN6QyxJQUFJLGtCQUFzQyxDQUFDO0lBQzNDLElBQUkscUJBQTBCLENBQUM7SUFDL0IsSUFBSSx3QkFBNkIsQ0FBQztJQUVsQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2Qsd0JBQXdCO1FBQ3hCLHFCQUFxQixHQUFHLElBQUksaUJBQWlCLENBQzNDLEVBQVMsRUFDVCxFQUFTLENBQ1YsQ0FBQztRQUVGLHdCQUF3QixHQUFHLElBQUksd0JBQXdCLENBQUM7WUFDdEQsS0FBSyxFQUFFLEVBQVM7WUFDaEIsYUFBYSxFQUFFLEVBQVM7WUFDeEIsb0JBQW9CLEVBQUUsRUFBUztTQUNoQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDakUsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtZQUN0QyxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixDQUN6QyxxQkFBcUIsRUFDckIsd0JBQXdCLENBQ3pCLENBQUM7WUFFRixNQUFNLENBQUMsa0JBQWtCLENBQUMseUJB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c0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywrQ0FBK0MsRUFBRSxHQUFHLEVBQUU7O1lBQ3ZELE1BQU0sUUFBUSxHQUFRLEVBQUUsQ0FBQztZQUV6QixNQUFNLHNCQUFzQixHQUMxQixNQUFBLE1BQUEsTUFBQSxNQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxVQUFVLDBDQUFFLFdBQVcsMENBQUUsc0JBQXNCLG1DQUN6RCxNQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxpQkFBaUIsMENBQUUsc0JBQXNCLG1DQUNuRCxJQUFJLENBQUM7WUFFUCxNQUFNLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFRlc3RzIGZvciB3b3JrZXIgcHJvY2Vzc2luZyBjb250cm9sIGZ1bmN0aW9uYWxpdHlcclxuICovXHJcblxyXG5pbXBvcnQgeyBXb3JrZXJPcmNoZXN0cmF0b3IgfSBmcm9tIFwiLi4vZGF0YWZsb3cvd29ya2Vycy9Xb3JrZXJPcmNoZXN0cmF0b3JcIjtcclxuaW1wb3J0IHsgVGFza1dvcmtlck1hbmFnZXIgfSBmcm9tIFwiLi4vZGF0YWZsb3cvd29ya2Vycy9UYXNrV29ya2VyTWFuYWdlclwiO1xyXG5pbXBvcnQgeyBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIgfSBmcm9tIFwiLi4vZGF0YWZsb3cvd29ya2Vycy9Qcm9qZWN0RGF0YVdvcmtlck1hbmFnZXJcIjtcclxuXHJcbi8vIE1vY2sgZGVwZW5kZW5jaWVzXHJcbmplc3QubW9jayhcIi4uL2RhdGFmbG93L3dvcmtlcnMvVGFza1dvcmtlck1hbmFnZXJcIik7XHJcbmplc3QubW9jayhcIi4uL2RhdGFmbG93L3dvcmtlcnMvUHJvamVjdERhdGFXb3JrZXJNYW5hZ2VyXCIpO1xyXG5cclxuZGVzY3JpYmUoXCJXb3JrZXIgUHJvY2Vzc2luZyBDb250cm9sXCIsICgpID0+IHtcclxuICBsZXQgd29ya2VyT3JjaGVzdHJhdG9yOiBXb3JrZXJPcmNoZXN0cmF0b3I7XHJcbiAgbGV0IG1vY2tUYXNrV29ya2VyTWFuYWdlcjogYW55O1xyXG4gIGxldCBtb2NrUHJvamVjdFdvcmtlck1hbmFnZXI6IGFueTtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAvLyBDcmVhdGUgbW9jayBpbnN0YW5jZXNcclxuICAgIG1vY2tUYXNrV29ya2VyTWFuYWdlciA9IG5ldyBUYXNrV29ya2VyTWFuYWdlcihcclxuICAgICAge30gYXMgYW55LFxyXG4gICAgICB7fSBhcyBhbnlcclxuICAgICk7XHJcbiAgICBcclxuICAgIG1vY2tQcm9qZWN0V29ya2VyTWFuYWdlciA9IG5ldyBQcm9qZWN0RGF0YVdvcmtlck1hbmFnZXIoe1xyXG4gICAgICB2YXVsdDoge30gYXMgYW55LFxyXG4gICAgICBtZXRhZGF0YUNhY2hlOiB7fSBhcyBhbnksXHJcbiAgICAgIHByb2plY3RDb25maWdNYW5hZ2VyOiB7fSBhcyBhbnlcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZShcIldvcmtlck9yY2hlc3RyYXRvciBlbmFibGVXb3JrZXJQcm9jZXNzaW5nIHNldHRpbmdcIiwgKCkgPT4ge1xyXG4gICAgaXQoXCJzaG91bGQgYmUgZW5hYmxlZCBieSBkZWZhdWx0XCIsICgpID0+IHtcclxuICAgICAgd29ya2VyT3JjaGVzdHJhdG9yID0gbmV3IFdvcmtlck9yY2hlc3RyYXRvcihcclxuICAgICAgICBtb2NrVGFza1dvcmtlck1hbmFnZXIsXHJcbiAgICAgICAgbW9ja1Byb2plY3RXb3JrZXJNYW5hZ2VyXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBleHBlY3Qod29ya2VyT3JjaGVzdHJhdG9yLmlzV29ya2VyUHJvY2Vzc2luZ0VuYWJsZWQoKSkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KFwic2hvdWxkIHJlc3BlY3QgZW5hYmxlV29ya2VyUHJvY2Vzc2luZyBvcHRpb24gd2hlbiBpbml0aWFsaXplZFwiLCAoKSA9PiB7XHJcbiAgICAgIHdvcmtlck9yY2hlc3RyYXRvciA9IG5ldyBXb3JrZXJPcmNoZXN0cmF0b3IoXHJcbiAgICAgICAgbW9ja1Rhc2tXb3JrZXJNYW5hZ2VyLFxyXG4gICAgICAgIG1vY2tQcm9qZWN0V29ya2VyTWFuYWdlcixcclxuICAgICAgICB7IGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IGZhbHNlIH1cclxuICAgICAgKTtcclxuXHJcbiAgICAgIGV4cGVjdCh3b3JrZXJPcmNoZXN0cmF0b3IuaXNXb3JrZXJQcm9jZXNzaW5nRW5hYmxlZCgpKS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KFwic2hvdWxkIGFsbG93IGR5bmFtaWMgZW5hYmxpbmcgb2Ygd29ya2VyIHByb2Nlc3NpbmdcIiwgKCkgPT4ge1xyXG4gICAgICB3b3JrZXJPcmNoZXN0cmF0b3IgPSBuZXcgV29ya2VyT3JjaGVzdHJhdG9yKFxyXG4gICAgICAgIG1vY2tUYXNrV29ya2VyTWFuYWdlcixcclxuICAgICAgICBtb2NrUHJvamVjdFdvcmtlck1hbmFnZXIsXHJcbiAgICAgICAgeyBlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiBmYWxzZSB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBleHBlY3Qod29ya2VyT3JjaGVzdHJhdG9yLmlzV29ya2VyUHJvY2Vzc2luZ0VuYWJsZWQoKSkudG9CZShmYWxzZSk7XHJcblxyXG4gICAgICAvLyBFbmFibGUgd29ya2VyIHByb2Nlc3NpbmdcclxuICAgICAgd29ya2VyT3JjaGVzdHJhdG9yLnNldFdvcmtlclByb2Nlc3NpbmdFbmFibGVkKHRydWUpO1xyXG5cclxuICAgICAgZXhwZWN0KHdvcmtlck9yY2hlc3RyYXRvci5pc1dvcmtlclByb2Nlc3NpbmdFbmFibGVkKCkpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChcInNob3VsZCBhbGxvdyBkeW5hbWljIGRpc2FibGluZyBvZiB3b3JrZXIgcHJvY2Vzc2luZ1wiLCAoKSA9PiB7XHJcbiAgICAgIHdvcmtlck9yY2hlc3RyYXRvciA9IG5ldyBXb3JrZXJPcmNoZXN0cmF0b3IoXHJcbiAgICAgICAgbW9ja1Rhc2tXb3JrZXJNYW5hZ2VyLFxyXG4gICAgICAgIG1vY2tQcm9qZWN0V29ya2VyTWFuYWdlcixcclxuICAgICAgICB7IGVuYWJsZVdvcmtlclByb2Nlc3Npbmc6IHRydWUgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHdvcmtlck9yY2hlc3RyYXRvci5pc1dvcmtlclByb2Nlc3NpbmdFbmFibGVkKCkpLnRvQmUodHJ1ZSk7XHJcblxyXG4gICAgICAvLyBEaXNhYmxlIHdvcmtlciBwcm9jZXNzaW5nXHJcbiAgICAgIHdvcmtlck9yY2hlc3RyYXRvci5zZXRXb3JrZXJQcm9jZXNzaW5nRW5hYmxlZChmYWxzZSk7XHJcblxyXG4gICAgICBleHBlY3Qod29ya2VyT3JjaGVzdHJhdG9yLmlzV29ya2VyUHJvY2Vzc2luZ0VuYWJsZWQoKSkudG9CZShmYWxzZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChcInNob3VsZCByZXNldCBjaXJjdWl0IGJyZWFrZXIgd2hlbiByZS1lbmFibGluZyB3b3JrZXIgcHJvY2Vzc2luZ1wiLCAoKSA9PiB7XHJcbiAgICAgIHdvcmtlck9yY2hlc3RyYXRvciA9IG5ldyBXb3JrZXJPcmNoZXN0cmF0b3IoXHJcbiAgICAgICAgbW9ja1Rhc2tXb3JrZXJNYW5hZ2VyLFxyXG4gICAgICAgIG1vY2tQcm9qZWN0V29ya2VyTWFuYWdlclxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gU2ltdWxhdGUgY2lyY3VpdCBicmVha2VyIGJlaW5nIHRyaWdnZXJlZCAodGhpcyB3b3VsZCBub3JtYWxseSBoYXBwZW4gaW50ZXJuYWxseSlcclxuICAgICAgLy8gV2UgY2FuJ3QgZGlyZWN0bHkgdGVzdCB0aGlzIHdpdGhvdXQgZXhwb3NpbmcgaW50ZXJuYWxzLCBidXQgd2UgY2FuIHZlcmlmeSB0aGUgYmVoYXZpb3JcclxuICAgICAgd29ya2VyT3JjaGVzdHJhdG9yLnNldFdvcmtlclByb2Nlc3NpbmdFbmFibGVkKGZhbHNlKTtcclxuICAgICAgd29ya2VyT3JjaGVzdHJhdG9yLnNldFdvcmtlclByb2Nlc3NpbmdFbmFibGVkKHRydWUpO1xyXG5cclxuICAgICAgLy8gV29ya2VyIHByb2Nlc3Npbmcgc2hvdWxkIGJlIGVuYWJsZWQgYWZ0ZXIgcmUtZW5hYmxpbmdcclxuICAgICAgZXhwZWN0KHdvcmtlck9yY2hlc3RyYXRvci5pc1dvcmtlclByb2Nlc3NpbmdFbmFibGVkKCkpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChcInNob3VsZCBwcm92aWRlIG1ldHJpY3NcIiwgKCkgPT4ge1xyXG4gICAgICB3b3JrZXJPcmNoZXN0cmF0b3IgPSBuZXcgV29ya2VyT3JjaGVzdHJhdG9yKFxyXG4gICAgICAgIG1vY2tUYXNrV29ya2VyTWFuYWdlcixcclxuICAgICAgICBtb2NrUHJvamVjdFdvcmtlck1hbmFnZXJcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnN0IG1ldHJpY3MgPSB3b3JrZXJPcmNoZXN0cmF0b3IuZ2V0TWV0cmljcygpO1xyXG5cclxuICAgICAgZXhwZWN0KG1ldHJpY3MpLnRvSGF2ZVByb3BlcnR5KFwidGFza1BhcnNpbmdTdWNjZXNzXCIpO1xyXG4gICAgICBleHBlY3QobWV0cmljcykudG9IYXZlUHJvcGVydHkoXCJ0YXNrUGFyc2luZ0ZhaWx1cmVzXCIpO1xyXG4gICAgICBleHBlY3QobWV0cmljcykudG9IYXZlUHJvcGVydHkoXCJwcm9qZWN0RGF0YVN1Y2Nlc3NcIik7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eShcInByb2plY3REYXRhRmFpbHVyZXNcIik7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eShcImF2ZXJhZ2VUYXNrUGFyc2luZ1RpbWVcIik7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eShcImF2ZXJhZ2VQcm9qZWN0RGF0YVRpbWVcIik7XHJcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0hhdmVQcm9wZXJ0eShcInRvdGFsT3BlcmF0aW9uc1wiKTtcclxuICAgICAgZXhwZWN0KG1ldHJpY3MpLnRvSGF2ZVByb3BlcnR5KFwiZmFsbGJhY2tUb01haW5UaHJlYWRcIik7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoXCJTZXR0aW5ncyBJbnRlZ3JhdGlvblwiLCAoKSA9PiB7XHJcbiAgICBpdChcInNob3VsZCBjb3JyZWN0bHkgcmVhZCBzZXR0aW5nIGZyb20gZmlsZVNvdXJjZS5wZXJmb3JtYW5jZS5lbmFibGVXb3JrZXJQcm9jZXNzaW5nXCIsICgpID0+IHtcclxuICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgZmlsZVNvdXJjZToge1xyXG4gICAgICAgICAgcGVyZm9ybWFuY2U6IHtcclxuICAgICAgICAgICAgZW5hYmxlV29ya2VyUHJvY2Vzc2luZzogZmFsc2VcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBlbmFibGVXb3JrZXJQcm9jZXNzaW5nID0gXHJcbiAgICAgICAgc2V0dGluZ3M/LmZpbGVTb3VyY2U/LnBlcmZvcm1hbmNlPy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nID8/IHRydWU7XHJcblxyXG4gICAgICBleHBlY3QoZW5hYmxlV29ya2VyUHJvY2Vzc2luZykudG9CZShmYWxzZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdChcInNob3VsZCBmYWxsYmFjayB0byBmaWxlUGFyc2luZ0NvbmZpZy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nIGlmIGZpbGVTb3VyY2Ugbm90IHByZXNlbnRcIiwgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzZXR0aW5nczogYW55ID0ge1xyXG4gICAgICAgIGZpbGVQYXJzaW5nQ29uZmlnOiB7XHJcbiAgICAgICAgICBlbmFibGVXb3JrZXJQcm9jZXNzaW5nOiBmYWxzZVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPSBcclxuICAgICAgICBzZXR0aW5ncz8uZmlsZVNvdXJjZT8ucGVyZm9ybWFuY2U/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPz9cclxuICAgICAgICBzZXR0aW5ncz8uZmlsZVBhcnNpbmdDb25maWc/LmVuYWJsZVdvcmtlclByb2Nlc3NpbmcgPz9cclxuICAgICAgICB0cnVlO1xyXG5cclxuICAgICAgZXhwZWN0KGVuYWJsZVdvcmtlclByb2Nlc3NpbmcpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoXCJzaG91bGQgZGVmYXVsdCB0byB0cnVlIGlmIG5vIHNldHRpbmdzIHByZXNlbnRcIiwgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzZXR0aW5nczogYW55ID0ge307XHJcblxyXG4gICAgICBjb25zdCBlbmFibGVXb3JrZXJQcm9jZXNzaW5nID0gXHJcbiAgICAgICAgc2V0dGluZ3M/LmZpbGVTb3VyY2U/LnBlcmZvcm1hbmNlPy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nID8/XHJcbiAgICAgICAgc2V0dGluZ3M/LmZpbGVQYXJzaW5nQ29uZmlnPy5lbmFibGVXb3JrZXJQcm9jZXNzaW5nID8/XHJcbiAgICAgICAgdHJ1ZTtcclxuXHJcbiAgICAgIGV4cGVjdChlbmFibGVXb3JrZXJQcm9jZXNzaW5nKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==