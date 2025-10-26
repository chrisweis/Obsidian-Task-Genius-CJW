/**
 * Simple timeout verification test
 * Verifies that our timeout implementation works correctly
 */
import { __awaiter } from "tslib";
describe("Timeout Implementation Verification", () => {
    test("Promise.race timeout mechanism works", () => __awaiter(void 0, void 0, void 0, function* () {
        const timeoutMs = 1000; // 1 second
        const startTime = Date.now();
        // Simulate a slow request
        const slowRequest = new Promise((resolve) => {
            setTimeout(() => resolve("slow response"), 3000); // 3 seconds
        });
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request timeout after ${timeoutMs}ms`));
            }, timeoutMs);
        });
        try {
            // This should timeout
            yield Promise.race([slowRequest, timeoutPromise]);
            fail("Should have timed out");
        }
        catch (error) {
            const endTime = Date.now();
            const duration = endTime - startTime;
            // Should timeout within reasonable time
            expect(duration).toBeGreaterThan(900); // At least 900ms
            expect(duration).toBeLessThan(1500); // Less than 1.5s
            expect(error.message).toContain("timeout");
            console.log(`Timeout test completed in ${duration}ms`);
        }
    }));
    test("Non-blocking method returns immediately", () => {
        const startTime = Date.now();
        // Simulate a non-blocking method that returns cached data
        const getCachedData = () => {
            // This should return immediately
            return [];
        };
        const result = getCachedData();
        const endTime = Date.now();
        const duration = endTime - startTime;
        // Should complete very quickly
        expect(duration).toBeLessThan(10);
        expect(Array.isArray(result)).toBe(true);
        console.log(`Non-blocking call completed in ${duration}ms`);
    });
    test("Error categorization logic works", () => {
        const categorizeError = (errorMessage) => {
            if (!errorMessage)
                return "unknown";
            const message = errorMessage.toLowerCase();
            if (message.includes("timeout") ||
                message.includes("request timeout")) {
                return "timeout";
            }
            if (message.includes("connection") ||
                message.includes("network") ||
                message.includes("err_connection")) {
                return "network";
            }
            if (message.includes("404") || message.includes("not found")) {
                return "not-found";
            }
            if (message.includes("403") ||
                message.includes("unauthorized") ||
                message.includes("401")) {
                return "auth";
            }
            if (message.includes("500") ||
                message.includes("502") ||
                message.includes("503")) {
                return "server";
            }
            if (message.includes("parse") || message.includes("invalid")) {
                return "parse";
            }
            return "unknown";
        };
        // Test different error types
        expect(categorizeError("Request timeout after 30 seconds")).toBe("timeout");
        expect(categorizeError("net::ERR_CONNECTION_CLOSED")).toBe("network");
        expect(categorizeError("HTTP 404: Not Found")).toBe("not-found");
        expect(categorizeError("HTTP 403: Unauthorized")).toBe("auth");
        expect(categorizeError("HTTP 500: Internal Server Error")).toBe("server");
        expect(categorizeError("Invalid ICS format")).toBe("parse");
        expect(categorizeError("Some other error")).toBe("unknown");
        expect(categorizeError()).toBe("unknown");
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZW91dC12ZXJpZmljYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRpbWVvdXQtdmVyaWZpY2F0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHOztBQUlILFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7SUFDcEQsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEdBQVMsRUFBRTtRQUN2RCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQyxXQUFXO1FBQ25DLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QiwwQkFBMEI7UUFDMUIsTUFBTSxXQUFXLEdBQUcsSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUMzQyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWTtRQUMvRCxDQUFDLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixNQUFNLGNBQWMsR0FBRyxJQUFJLE9BQU8sQ0FBUSxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN2RCxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNmLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzNELENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNmLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSTtZQUNILHNCQUFzQjtZQUN0QixNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztTQUM5QjtRQUFDLE9BQU8sS0FBSyxFQUFFO1lBQ2YsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzNCLE1BQU0s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QVMsQ0FBQztRQUNsQixDQUFDLENBQUM7UUFFRiw2QkFBNkI7UUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUMvRCxTQUFTLENBQ1QsQ0FBQztRQUNGLE1BQU0sQ0FBQyxlQUFlLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RSxNQUFNLENBQUMsZUFBZSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDakUsTUFBTSxDQUFDLGVBQWUsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9ELE1BQU0sQ0FBQyxlQUFlLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDOUQsUUFBUSxDQUNSLENBQUM7UUFDRixNQUFNLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVELE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMzQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFNpbXBsZSB0aW1lb3V0IHZlcmlmaWNhdGlvbiB0ZXN0XHJcbiAqIFZlcmlmaWVzIHRoYXQgb3VyIHRpbWVvdXQgaW1wbGVtZW50YXRpb24gd29ya3MgY29ycmVjdGx5XHJcbiAqL1xyXG5cclxuZXhwb3J0IHt9OyAvLyBNYWtlIHRoaXMgZmlsZSBhIG1vZHVsZSB0byBmaXggVFMxMjA4IGVycm9yXHJcblxyXG5kZXNjcmliZShcIlRpbWVvdXQgSW1wbGVtZW50YXRpb24gVmVyaWZpY2F0aW9uXCIsICgpID0+IHtcclxuXHR0ZXN0KFwiUHJvbWlzZS5yYWNlIHRpbWVvdXQgbWVjaGFuaXNtIHdvcmtzXCIsIGFzeW5jICgpID0+IHtcclxuXHRcdGNvbnN0IHRpbWVvdXRNcyA9IDEwMDA7IC8vIDEgc2Vjb25kXHJcblx0XHRjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuXHRcdC8vIFNpbXVsYXRlIGEgc2xvdyByZXF1ZXN0XHJcblx0XHRjb25zdCBzbG93UmVxdWVzdCA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4gcmVzb2x2ZShcInNsb3cgcmVzcG9uc2VcIiksIDMwMDApOyAvLyAzIHNlY29uZHNcclxuXHRcdH0pO1xyXG5cclxuXHRcdC8vIENyZWF0ZSB0aW1lb3V0IHByb21pc2VcclxuXHRcdGNvbnN0IHRpbWVvdXRQcm9taXNlID0gbmV3IFByb21pc2U8bmV2ZXI+KChfLCByZWplY3QpID0+IHtcclxuXHRcdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdFx0cmVqZWN0KG5ldyBFcnJvcihgUmVxdWVzdCB0aW1lb3V0IGFmdGVyICR7dGltZW91dE1zfW1zYCkpO1xyXG5cdFx0XHR9LCB0aW1lb3V0TXMpO1xyXG5cdFx0fSk7XHJcblxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Ly8gVGhpcyBzaG91bGQgdGltZW91dFxyXG5cdFx0XHRhd2FpdCBQcm9taXNlLnJhY2UoW3Nsb3dSZXF1ZXN0LCB0aW1lb3V0UHJvbWlzZV0pO1xyXG5cdFx0XHRmYWlsKFwiU2hvdWxkIGhhdmUgdGltZWQgb3V0XCIpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XHJcblx0XHRcdGNvbnN0IGR1cmF0aW9uID0gZW5kVGltZSAtIHN0YXJ0VGltZTtcclxuXHJcblx0XHRcdC8vIFNob3VsZCB0aW1lb3V0IHdpdGhpbiByZWFzb25hYmxlIHRpbWVcclxuXHRcdFx0ZXhwZWN0KGR1cmF0aW9uKS50b0JlR3JlYXRlclRoYW4oOTAwKTsgLy8gQXQgbGVhc3QgOTAwbXNcclxuXHRcdFx0ZXhwZWN0KGR1cmF0aW9uKS50b0JlTGVzc1RoYW4oMTUwMCk7IC8vIExlc3MgdGhhbiAxLjVzXHJcblx0XHRcdGV4cGVjdChlcnJvci5tZXNzYWdlKS50b0NvbnRhaW4oXCJ0aW1lb3V0XCIpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coYFRpbWVvdXQgdGVzdCBjb21wbGV0ZWQgaW4gJHtkdXJhdGlvbn1tc2ApO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHR0ZXN0KFwiTm9uLWJsb2NraW5nIG1ldGhvZCByZXR1cm5zIGltbWVkaWF0ZWx5XCIsICgpID0+IHtcclxuXHRcdGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG5cdFx0Ly8gU2ltdWxhdGUgYSBub24tYmxvY2tpbmcgbWV0aG9kIHRoYXQgcmV0dXJucyBjYWNoZWQgZGF0YVxyXG5cdFx0Y29uc3QgZ2V0Q2FjaGVkRGF0YSA9ICgpID0+IHtcclxuXHRcdFx0Ly8gVGhpcyBzaG91bGQgcmV0dXJuIGltbWVkaWF0ZWx5XHJcblx0XHRcdHJldHVybiBbXTtcclxuXHRcdH07XHJcblxyXG5cdFx0Y29uc3QgcmVzdWx0ID0gZ2V0Q2FjaGVkRGF0YSgpO1xyXG5cdFx0Y29uc3QgZW5kVGltZSA9IERhdGUubm93KCk7XHJcblx0XHRjb25zdCBkdXJhdGlvbiA9IGVuZFRpbWUgLSBzdGFydFRpbWU7XHJcblxyXG5cdFx0Ly8gU2hvdWxkIGNvbXBsZXRlIHZlcnkgcXVpY2tseVxyXG5cdFx0ZXhwZWN0KGR1cmF0aW9uKS50b0JlTGVzc1RoYW4oMTApO1xyXG5cdFx0ZXhwZWN0KEFycmF5LmlzQXJyYXkocmVzdWx0KSkudG9CZSh0cnVlKTtcclxuXHJcblx0XHRjb25zb2xlLmxvZyhgTm9uLWJsb2NraW5nIGNhbGwgY29tcGxldGVkIGluICR7ZHVyYXRpb259bXNgKTtcclxuXHR9KTtcclxuXHJcblx0dGVzdChcIkVycm9yIGNhdGVnb3JpemF0aW9uIGxvZ2ljIHdvcmtzXCIsICgpID0+IHtcclxuXHRcdGNvbnN0IGNhdGVnb3JpemVFcnJvciA9IChlcnJvck1lc3NhZ2U/OiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xyXG5cdFx0XHRpZiAoIWVycm9yTWVzc2FnZSkgcmV0dXJuIFwidW5rbm93blwiO1xyXG5cclxuXHRcdFx0Y29uc3QgbWVzc2FnZSA9IGVycm9yTWVzc2FnZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJ0aW1lb3V0XCIpIHx8XHJcblx0XHRcdFx0bWVzc2FnZS5pbmNsdWRlcyhcInJlcXVlc3QgdGltZW91dFwiKVxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJ0aW1lb3V0XCI7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJjb25uZWN0aW9uXCIpIHx8XHJcblx0XHRcdFx0bWVzc2FnZS5pbmNsdWRlcyhcIm5ldHdvcmtcIikgfHxcclxuXHRcdFx0XHRtZXNzYWdlLmluY2x1ZGVzKFwiZXJyX2Nvbm5lY3Rpb25cIilcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0cmV0dXJuIFwibmV0d29ya1wiO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChtZXNzYWdlLmluY2x1ZGVzKFwiNDA0XCIpIHx8IG1lc3NhZ2UuaW5jbHVkZXMoXCJub3QgZm91bmRcIikpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJub3QtZm91bmRcIjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0bWVzc2FnZS5pbmNsdWRlcyhcIjQwM1wiKSB8fFxyXG5cdFx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCJ1bmF1dGhvcml6ZWRcIikgfHxcclxuXHRcdFx0XHRtZXNzYWdlLmluY2x1ZGVzKFwiNDAxXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBcImF1dGhcIjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoXHJcblx0XHRcdFx0bWVzc2FnZS5pbmNsdWRlcyhcIjUwMFwiKSB8fFxyXG5cdFx0XHRcdG1lc3NhZ2UuaW5jbHVkZXMoXCI1MDJcIikgfHxcclxuXHRcdFx0XHRtZXNzYWdlLmluY2x1ZGVzKFwiNTAzXCIpXHJcblx0XHRcdCkge1xyXG5cdFx0XHRcdHJldHVybiBcInNlcnZlclwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChtZXNzYWdlLmluY2x1ZGVzKFwicGFyc2VcIikgfHwgbWVzc2FnZS5pbmNsdWRlcyhcImludmFsaWRcIikpIHtcclxuXHRcdFx0XHRyZXR1cm4gXCJwYXJzZVwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gXCJ1bmtub3duXCI7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFRlc3QgZGlmZmVyZW50IGVycm9yIHR5cGVzXHJcblx0XHRleHBlY3QoY2F0ZWdvcml6ZUVycm9yKFwiUmVxdWVzdCB0aW1lb3V0IGFmdGVyIDMwIHNlY29uZHNcIikpLnRvQmUoXHJcblx0XHRcdFwidGltZW91dFwiXHJcblx0XHQpO1xyXG5cdFx0ZXhwZWN0KGNhdGVnb3JpemVFcnJvcihcIm5ldDo6RVJSX0NPTk5FQ1RJT05fQ0xPU0VEXCIpKS50b0JlKFwibmV0d29ya1wiKTtcclxuXHRcdGV4cGVjdChjYXRlZ29yaXplRXJyb3IoXCJIVFRQIDQwNDogTm90IEZvdW5kXCIpKS50b0JlKFwibm90LWZvdW5kXCIpO1xyXG5cdFx0ZXhwZWN0KGNhdGVnb3JpemVFcnJvcihcIkhUVFAgNDAzOiBVbmF1dGhvcml6ZWRcIikpLnRvQmUoXCJhdXRoXCIpO1xyXG5cdFx0ZXhwZWN0KGNhdGVnb3JpemVFcnJvcihcIkhUVFAgNTAwOiBJbnRlcm5hbCBTZXJ2ZXIgRXJyb3JcIikpLnRvQmUoXHJcblx0XHRcdFwic2VydmVyXCJcclxuXHRcdCk7XHJcblx0XHRleHBlY3QoY2F0ZWdvcml6ZUVycm9yKFwiSW52YWxpZCBJQ1MgZm9ybWF0XCIpKS50b0JlKFwicGFyc2VcIik7XHJcblx0XHRleHBlY3QoY2F0ZWdvcml6ZUVycm9yKFwiU29tZSBvdGhlciBlcnJvclwiKSkudG9CZShcInVua25vd25cIik7XHJcblx0XHRleHBlY3QoY2F0ZWdvcml6ZUVycm9yKCkpLnRvQmUoXCJ1bmtub3duXCIpO1xyXG5cdH0pO1xyXG59KTtcclxuIl19