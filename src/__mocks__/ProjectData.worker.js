/**
 * Mock for ProjectData.worker.ts in test environment
 */
export default class MockProjectDataWorker {
    constructor() {
        this.messageHandler = null;
        // Mock worker constructor
    }
    postMessage(message) {
        // Mock postMessage - simulate immediate response
        setTimeout(() => {
            if (this.messageHandler) {
                const mockResponse = {
                    data: {
                        type: "projectDataResult",
                        requestId: message.requestId,
                        success: true,
                        data: {
                            filePath: message.filePath || "test.md",
                            tgProject: {
                                type: "test",
                                name: "Test Project",
                                source: "mock",
                                readonly: true,
                            },
                            enhancedMetadata: {},
                            timestamp: Date.now(),
                        },
                    },
                };
                this.messageHandler(mockResponse);
            }
        }, 0);
    }
    set onmessage(handler) {
        this.messageHandler = handler;
    }
    terminate() {
        // Mock terminate
        this.messageHandler = null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUHJvamVjdERhdGEud29ya2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiUHJvamVjdERhdGEud29ya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztHQUVHO0FBRUgsTUFBTSxDQUFDLE9BQU8sT0FBTyxxQkFBcUI7SUFHekM7UUFGUSxtQkFBYyxHQUEyQyxJQUFJLENBQUM7UUFHckUsMEJBQTBCO0lBQzNCLENBQUM7SUFFRCxXQUFXLENBQUMsT0FBWTtRQUN2QixpREFBaUQ7UUFDakQsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNmLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDeEIsTUFBTSxZQUFZLEdBQUc7b0JBQ3BCLElBQUksRUFBRTt3QkFDTCxJQUFJLEVBQUUsbUJBQW1CO3dCQUN6QixTQUFTLEVBQUUsT0FBTyxDQUFDLFNBQVM7d0JBQzVCLE9BQU8sRUFBRSxJQUFJO3dCQUNiLElBQUksRUFBRTs0QkFDTCxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsSUFBSSxTQUFTOzRCQUN2QyxTQUFTLEVBQUU7Z0NBQ1YsSUFBSSxFQUFFLE1BQU07Z0NBQ1osSUFBSSxFQUFFLGNBQWM7Z0NBQ3BCLE1BQU0sRUFBRSxNQUFNO2dDQUNkLFFBQVEsRUFBRSxJQUFJOzZCQUNkOzRCQUNELGdCQUFnQixFQUFFLEVBQUU7NEJBQ3BCLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO3lCQUNyQjtxQkFDRDtpQkFDRCxDQUFDO2dCQUNGLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBNEIsQ0FBQyxDQUFDO2FBQ2xEO1FBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELElBQUksU0FBUyxDQUFDLE9BQXNDO1FBQ25ELElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDO0lBQy9CLENBQUM7SUFFRCxTQUFTO1FBQ1IsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQzVCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBNb2NrIGZvciBQcm9qZWN0RGF0YS53b3JrZXIudHMgaW4gdGVzdCBlbnZpcm9ubWVudFxyXG4gKi9cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGNsYXNzIE1vY2tQcm9qZWN0RGF0YVdvcmtlciB7XHJcblx0cHJpdmF0ZSBtZXNzYWdlSGFuZGxlcjogKChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdC8vIE1vY2sgd29ya2VyIGNvbnN0cnVjdG9yXHJcblx0fVxyXG5cclxuXHRwb3N0TWVzc2FnZShtZXNzYWdlOiBhbnkpIHtcclxuXHRcdC8vIE1vY2sgcG9zdE1lc3NhZ2UgLSBzaW11bGF0ZSBpbW1lZGlhdGUgcmVzcG9uc2VcclxuXHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5tZXNzYWdlSGFuZGxlcikge1xyXG5cdFx0XHRcdGNvbnN0IG1vY2tSZXNwb25zZSA9IHtcclxuXHRcdFx0XHRcdGRhdGE6IHtcclxuXHRcdFx0XHRcdFx0dHlwZTogXCJwcm9qZWN0RGF0YVJlc3VsdFwiLFxyXG5cdFx0XHRcdFx0XHRyZXF1ZXN0SWQ6IG1lc3NhZ2UucmVxdWVzdElkLFxyXG5cdFx0XHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHRcdFx0XHRkYXRhOiB7XHJcblx0XHRcdFx0XHRcdFx0ZmlsZVBhdGg6IG1lc3NhZ2UuZmlsZVBhdGggfHwgXCJ0ZXN0Lm1kXCIsXHJcblx0XHRcdFx0XHRcdFx0dGdQcm9qZWN0OiB7XHJcblx0XHRcdFx0XHRcdFx0XHR0eXBlOiBcInRlc3RcIixcclxuXHRcdFx0XHRcdFx0XHRcdG5hbWU6IFwiVGVzdCBQcm9qZWN0XCIsXHJcblx0XHRcdFx0XHRcdFx0XHRzb3VyY2U6IFwibW9ja1wiLFxyXG5cdFx0XHRcdFx0XHRcdFx0cmVhZG9ubHk6IHRydWUsXHJcblx0XHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0XHRlbmhhbmNlZE1ldGFkYXRhOiB7fSxcclxuXHRcdFx0XHRcdFx0XHR0aW1lc3RhbXA6IERhdGUubm93KCksXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHR9LFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdFx0dGhpcy5tZXNzYWdlSGFuZGxlcihtb2NrUmVzcG9uc2UgYXMgTWVzc2FnZUV2ZW50KTtcclxuXHRcdFx0fVxyXG5cdFx0fSwgMCk7XHJcblx0fVxyXG5cclxuXHRzZXQgb25tZXNzYWdlKGhhbmRsZXI6IChldmVudDogTWVzc2FnZUV2ZW50KSA9PiB2b2lkKSB7XHJcblx0XHR0aGlzLm1lc3NhZ2VIYW5kbGVyID0gaGFuZGxlcjtcclxuXHR9XHJcblxyXG5cdHRlcm1pbmF0ZSgpIHtcclxuXHRcdC8vIE1vY2sgdGVybWluYXRlXHJcblx0XHR0aGlzLm1lc3NhZ2VIYW5kbGVyID0gbnVsbDtcclxuXHR9XHJcbn1cclxuIl19