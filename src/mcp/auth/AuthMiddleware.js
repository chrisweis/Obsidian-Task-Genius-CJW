/**
 * Authentication Middleware for MCP Server
 */
export class AuthMiddleware {
    constructor(authToken) {
        this.authToken = authToken;
    }
    /**
     * Validate Bearer token from request headers
     */
    validateRequest(req) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return false;
        }
        const parsed = AuthMiddleware.parseAuthHeader(authHeader);
        if (!parsed) {
            return false;
        }
        return parsed.token === this.authToken;
    }
    /**
     * Parse Authorization header. Supports:
     * - Bearer <token>
     * - Bearer <token>+<appid>
     */
    static parseAuthHeader(authHeader) {
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return null;
        }
        const bearerVal = parts[1];
        const plusIdx = bearerVal.indexOf("+");
        if (plusIdx === -1) {
            return { token: bearerVal };
        }
        const token = bearerVal.substring(0, plusIdx);
        const appId = bearerVal.substring(plusIdx + 1) || undefined;
        return { token, appId };
    }
    /**
     * Resolve client appId from headers: prefer mcp-app-id header, fallback to Authorization Bearer suffix
     */
    getClientAppId(req) {
        const headerAppId = req.headers["mcp-app-id"];
        if (headerAppId)
            return headerAppId;
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return undefined;
        const parsed = AuthMiddleware.parseAuthHeader(authHeader);
        return parsed === null || parsed === void 0 ? void 0 : parsed.appId;
    }
    /**
     * Handle unauthorized response
     */
    handleUnauthorized(res) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.setHeader("WWW-Authenticate", 'Bearer realm="MCP Server"');
        res.end(JSON.stringify({
            error: "Unauthorized",
            message: "Invalid or missing authentication token",
        }));
    }
    /**
     * Middleware function for HTTP requests
     */
    middleware(req, res, next) {
        // Skip auth for health check endpoint
        const url = req.url || "";
        if (url === "/health" || url === "/") {
            next();
            return;
        }
        if (!this.validateRequest(req)) {
            this.handleUnauthorized(res);
            return;
        }
        next();
    }
    /**
     * Update the authentication token
     */
    updateToken(newToken) {
        this.authToken = newToken;
    }
    /**
     * Generate a random token
     */
    static generateToken() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let token = "";
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQXV0aE1pZGRsZXdhcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJBdXRoTWlkZGxld2FyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUlILE1BQU0sT0FBTyxjQUFjO0lBQzFCLFlBQW9CLFNBQWlCO1FBQWpCLGNBQVMsR0FBVCxTQUFTLENBQVE7SUFBRyxDQUFDO0lBRXpDOztPQUVHO0lBQ0gsZUFBZSxDQUFDLEdBQW9CO1FBQ25DLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzdDLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDaEIsT0FBTyxLQUFLLENBQUM7U0FDYjtRQUNELE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNaLE9BQU8sS0FBSyxDQUFDO1NBQ2I7UUFDRCxPQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBa0I7UUFDeEMsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7WUFDaEQsT0FBTyxJQUFJLENBQUM7U0FDWjtRQUNELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ25CLE9BQU8sRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7U0FDNUI7UUFDRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUM5QyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUM7UUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxjQUFjLENBQUMsR0FBb0I7UUFDbEMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQVcsQ0FBQztRQUN4RCxJQUFJLFdBQVc7WUFBRSxPQUFPLFdBQVcsQ0FBQztRQUNwQyxNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM3QyxJQUFJLENBQUMsVUFBVTtZQUFFLE9BQU8sU0FBUyxDQUFDO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUQsT0FBTyxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsS0FBSyxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILGtCQUFrQixDQUFDLEdBQW1CO1FBQ3JDLEdBQUcsQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO1FBQ3JCLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFDbEQsR0FBRyxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQy9ELEdBQUcsQ0FBQyxHQUFHLENBQ04sSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNkLEtBQUssRUFBRSxjQUFjO1lBQ3JCLE9BQU8sRUFBRSx5Q0FBeUM7U0FDbEQsQ0FBQyxDQUNGLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVLENBQ1QsR0FBb0IsRUFDcEIsR0FBbUIsRUFDbkIsSUFBZ0I7UUFFaEIsc0NBQXNDO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDO1FBQzFCLElBQUksR0FBRyxLQUFLLFNBQVMsSUFBSSxHQUFHLEtBQUssR0FBRyxFQUFFO1lBQ3JDLElBQUksRUFBRSxDQUFDO1lBQ1AsT0FBTztTQUNQO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDL0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzdCLE9BQU87U0FDUDtRQUVELElBQUksRUFBRSxDQUFDO0lBQ1IsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLFFBQWdCO1FBQzNCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU0sQ0FBQyxhQUFhO1FBQ25CLE1BQU0sS0FBSyxHQUNWLGdFQUFnRSxDQUFDO1FBQ2xFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztRQUNmLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDNUIsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7U0FDaEU7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBdXRoZW50aWNhdGlvbiBNaWRkbGV3YXJlIGZvciBNQ1AgU2VydmVyXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gXCJodHRwXCI7XHJcblxyXG5leHBvcnQgY2xhc3MgQXV0aE1pZGRsZXdhcmUge1xyXG5cdGNvbnN0cnVjdG9yKHByaXZhdGUgYXV0aFRva2VuOiBzdHJpbmcpIHt9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFZhbGlkYXRlIEJlYXJlciB0b2tlbiBmcm9tIHJlcXVlc3QgaGVhZGVyc1xyXG5cdCAqL1xyXG5cdHZhbGlkYXRlUmVxdWVzdChyZXE6IEluY29taW5nTWVzc2FnZSk6IGJvb2xlYW4ge1xyXG5cdFx0Y29uc3QgYXV0aEhlYWRlciA9IHJlcS5oZWFkZXJzLmF1dGhvcml6YXRpb247XHJcblx0XHRpZiAoIWF1dGhIZWFkZXIpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0Y29uc3QgcGFyc2VkID0gQXV0aE1pZGRsZXdhcmUucGFyc2VBdXRoSGVhZGVyKGF1dGhIZWFkZXIpO1xyXG5cdFx0aWYgKCFwYXJzZWQpIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHBhcnNlZC50b2tlbiA9PT0gdGhpcy5hdXRoVG9rZW47XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQYXJzZSBBdXRob3JpemF0aW9uIGhlYWRlci4gU3VwcG9ydHM6XHJcblx0ICogLSBCZWFyZXIgPHRva2VuPlxyXG5cdCAqIC0gQmVhcmVyIDx0b2tlbj4rPGFwcGlkPlxyXG5cdCAqL1xyXG5cdHN0YXRpYyBwYXJzZUF1dGhIZWFkZXIoYXV0aEhlYWRlcjogc3RyaW5nKTogeyB0b2tlbjogc3RyaW5nOyBhcHBJZD86IHN0cmluZyB9IHwgbnVsbCB7XHJcblx0XHRjb25zdCBwYXJ0cyA9IGF1dGhIZWFkZXIuc3BsaXQoXCIgXCIpO1xyXG5cdFx0aWYgKHBhcnRzLmxlbmd0aCAhPT0gMiB8fCBwYXJ0c1swXSAhPT0gXCJCZWFyZXJcIikge1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHRcdGNvbnN0IGJlYXJlclZhbCA9IHBhcnRzWzFdO1xyXG5cdFx0Y29uc3QgcGx1c0lkeCA9IGJlYXJlclZhbC5pbmRleE9mKFwiK1wiKTtcclxuXHRcdGlmIChwbHVzSWR4ID09PSAtMSkge1xyXG5cdFx0XHRyZXR1cm4geyB0b2tlbjogYmVhcmVyVmFsIH07XHJcblx0XHR9XHJcblx0XHRjb25zdCB0b2tlbiA9IGJlYXJlclZhbC5zdWJzdHJpbmcoMCwgcGx1c0lkeCk7XHJcblx0XHRjb25zdCBhcHBJZCA9IGJlYXJlclZhbC5zdWJzdHJpbmcocGx1c0lkeCArIDEpIHx8IHVuZGVmaW5lZDtcclxuXHRcdHJldHVybiB7IHRva2VuLCBhcHBJZCB9O1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogUmVzb2x2ZSBjbGllbnQgYXBwSWQgZnJvbSBoZWFkZXJzOiBwcmVmZXIgbWNwLWFwcC1pZCBoZWFkZXIsIGZhbGxiYWNrIHRvIEF1dGhvcml6YXRpb24gQmVhcmVyIHN1ZmZpeFxyXG5cdCAqL1xyXG5cdGdldENsaWVudEFwcElkKHJlcTogSW5jb21pbmdNZXNzYWdlKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuXHRcdGNvbnN0IGhlYWRlckFwcElkID0gcmVxLmhlYWRlcnNbXCJtY3AtYXBwLWlkXCJdIGFzIHN0cmluZztcclxuXHRcdGlmIChoZWFkZXJBcHBJZCkgcmV0dXJuIGhlYWRlckFwcElkO1xyXG5cdFx0Y29uc3QgYXV0aEhlYWRlciA9IHJlcS5oZWFkZXJzLmF1dGhvcml6YXRpb247XHJcblx0XHRpZiAoIWF1dGhIZWFkZXIpIHJldHVybiB1bmRlZmluZWQ7XHJcblx0XHRjb25zdCBwYXJzZWQgPSBBdXRoTWlkZGxld2FyZS5wYXJzZUF1dGhIZWFkZXIoYXV0aEhlYWRlcik7XHJcblx0XHRyZXR1cm4gcGFyc2VkPy5hcHBJZDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEhhbmRsZSB1bmF1dGhvcml6ZWQgcmVzcG9uc2VcclxuXHQgKi9cclxuXHRoYW5kbGVVbmF1dGhvcml6ZWQocmVzOiBTZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG5cdFx0cmVzLnN0YXR1c0NvZGUgPSA0MDE7XHJcblx0XHRyZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuXHRcdHJlcy5zZXRIZWFkZXIoXCJXV1ctQXV0aGVudGljYXRlXCIsICdCZWFyZXIgcmVhbG09XCJNQ1AgU2VydmVyXCInKTtcclxuXHRcdHJlcy5lbmQoXHJcblx0XHRcdEpTT04uc3RyaW5naWZ5KHtcclxuXHRcdFx0XHRlcnJvcjogXCJVbmF1dGhvcml6ZWRcIixcclxuXHRcdFx0XHRtZXNzYWdlOiBcIkludmFsaWQgb3IgbWlzc2luZyBhdXRoZW50aWNhdGlvbiB0b2tlblwiLFxyXG5cdFx0XHR9KVxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIE1pZGRsZXdhcmUgZnVuY3Rpb24gZm9yIEhUVFAgcmVxdWVzdHNcclxuXHQgKi9cclxuXHRtaWRkbGV3YXJlKFxyXG5cdFx0cmVxOiBJbmNvbWluZ01lc3NhZ2UsXHJcblx0XHRyZXM6IFNlcnZlclJlc3BvbnNlLFxyXG5cdFx0bmV4dDogKCkgPT4gdm9pZFxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gU2tpcCBhdXRoIGZvciBoZWFsdGggY2hlY2sgZW5kcG9pbnRcclxuXHRcdGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuXHRcdGlmICh1cmwgPT09IFwiL2hlYWx0aFwiIHx8IHVybCA9PT0gXCIvXCIpIHtcclxuXHRcdFx0bmV4dCgpO1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKCF0aGlzLnZhbGlkYXRlUmVxdWVzdChyZXEpKSB7XHJcblx0XHRcdHRoaXMuaGFuZGxlVW5hdXRob3JpemVkKHJlcyk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRuZXh0KCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGhlIGF1dGhlbnRpY2F0aW9uIHRva2VuXHJcblx0ICovXHJcblx0dXBkYXRlVG9rZW4obmV3VG9rZW46IHN0cmluZyk6IHZvaWQge1xyXG5cdFx0dGhpcy5hdXRoVG9rZW4gPSBuZXdUb2tlbjtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdlbmVyYXRlIGEgcmFuZG9tIHRva2VuXHJcblx0ICovXHJcblx0c3RhdGljIGdlbmVyYXRlVG9rZW4oKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IGNoYXJzID1cclxuXHRcdFx0XCJBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWmFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6MDEyMzQ1Njc4OVwiO1xyXG5cdFx0bGV0IHRva2VuID0gXCJcIjtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgMzI7IGkrKykge1xyXG5cdFx0XHR0b2tlbiArPSBjaGFycy5jaGFyQXQoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogY2hhcnMubGVuZ3RoKSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdG9rZW47XHJcblx0fVxyXG59Il19