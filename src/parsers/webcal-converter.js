/**
 * WebCal URL Converter
 * Converts webcal:// URLs to http:// or https:// URLs for ICS fetching
 */
export class WebcalUrlConverter {
    /**
     * Convert webcal URL to http/https URL
     * @param url The URL to convert
     * @returns Conversion result with success status and converted URL
     */
    static convertWebcalUrl(url) {
        const trimmedUrl = url.trim();
        // Check if URL is empty
        if (!trimmedUrl) {
            return {
                success: false,
                originalUrl: url,
                error: "URL cannot be empty",
                wasWebcal: false,
            };
        }
        // Check if it's a webcal URL
        const isWebcal = this.WEBCAL_REGEX.test(trimmedUrl);
        if (!isWebcal) {
            // Not a webcal URL, validate if it's a valid http/https URL
            if (this.isValidHttpUrl(trimmedUrl)) {
                return {
                    success: true,
                    convertedUrl: trimmedUrl,
                    originalUrl: url,
                    wasWebcal: false,
                };
            }
            else {
                return {
                    success: false,
                    originalUrl: url,
                    error: "Invalid URL format. Please provide a valid http://, https://, or webcal:// URL",
                    wasWebcal: false,
                };
            }
        }
        // Convert webcal to http/https
        try {
            const convertedUrl = this.performWebcalConversion(trimmedUrl);
            if (!this.isValidHttpUrl(convertedUrl)) {
                return {
                    success: false,
                    originalUrl: url,
                    error: "Converted URL is not valid",
                    wasWebcal: true,
                };
            }
            return {
                success: true,
                convertedUrl,
                originalUrl: url,
                wasWebcal: true,
            };
        }
        catch (error) {
            return {
                success: false,
                originalUrl: url,
                error: error instanceof Error
                    ? error.message
                    : "Unknown conversion error",
                wasWebcal: true,
            };
        }
    }
    /**
     * Perform the actual webcal to http/https conversion
     * @param webcalUrl The webcal URL to convert
     * @returns The converted http/https URL
     */
    static performWebcalConversion(webcalUrl) {
        // Remove webcal:// prefix
        const withoutProtocol = webcalUrl.replace(this.WEBCAL_REGEX, "");
        // Determine if we should use https or http
        // Default to https for better security, unless explicitly configured otherwise
        const useHttps = this.shouldUseHttps(withoutProtocol);
        const protocol = useHttps ? "https://" : "http://";
        return protocol + withoutProtocol;
    }
    /**
     * Determine whether to use HTTPS or HTTP for the converted URL
     * @param urlWithoutProtocol The URL without protocol
     * @returns True if HTTPS should be used, false for HTTP
     */
    static shouldUseHttps(urlWithoutProtocol) {
        // Extract hostname
        const hostname = urlWithoutProtocol
            .split("/")[0]
            .split("?")[0]
            .toLowerCase();
        // Use HTTPS by default for security
        // Some known services that might require HTTP can be added here if needed
        const httpOnlyHosts = [
            "localhost",
            "127.0.0.1",
            // Add other known HTTP-only hosts if needed
        ];
        // Check if hostname contains port number for localhost
        const hostnameWithoutPort = hostname.split(":")[0];
        return !httpOnlyHosts.includes(hostnameWithoutPort);
    }
    /**
     * Validate if a URL is a valid HTTP/HTTPS URL
     * @param url The URL to validate
     * @returns True if valid, false otherwise
     */
    static isValidHttpUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === "http:" || urlObj.protocol === "https:";
        }
        catch (_a) {
            return false;
        }
    }
    /**
     * Check if a URL is a webcal URL
     * @param url The URL to check
     * @returns True if it's a webcal URL, false otherwise
     */
    static isWebcalUrl(url) {
        return this.WEBCAL_REGEX.test(url.trim());
    }
    /**
     * Get a user-friendly description of the URL conversion
     * @param result The conversion result
     * @returns A description string
     */
    static getConversionDescription(result) {
        if (!result.success) {
            return `Error: ${result.error}`;
        }
        if (result.wasWebcal) {
            return `Converted webcal URL to: ${result.convertedUrl}`;
        }
        else {
            return `Valid HTTP/HTTPS URL: ${result.convertedUrl}`;
        }
    }
    /**
     * Extract the final URL to use for fetching ICS data
     * @param url The original URL input
     * @returns The URL to use for fetching, or null if invalid
     */
    static getFetchUrl(url) {
        const result = this.convertWebcalUrl(url);
        return result.success ? result.convertedUrl : null;
    }
}
// Regular expression to match webcal URLs
WebcalUrlConverter.WEBCAL_REGEX = /^webcal:\/\//i;
// Regular expression to validate URL format after conversion
WebcalUrlConverter.URL_VALIDATION_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViY2FsLWNvbnZlcnRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYmNhbC1jb252ZXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztHQUdHO0FBZUgsTUFBTSxPQUFPLGtCQUFrQjtJQVE5Qjs7OztPQUlHO0lBQ0gsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQVc7UUFDbEMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTlCLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsVUFBVSxFQUFFO1lBQ2hCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsV0FBVyxFQUFFLEdBQUc7Z0JBQ2hCLEtBQUssRUFBRSxxQkFBcUI7Z0JBQzVCLFNBQVMsRUFBRSxLQUFLO2FBQ2hCLENBQUM7U0FDRjtRQUVELDZCQUE2QjtRQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2QsNERBQTREO1lBQzVELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsRUFBRTtnQkFDcEMsT0FBTztvQkFDTixPQUFPLEVBQUUsSUFBSTtvQkFDYixZQUFZLEVBQUUsVUFBVTtvQkFDeEIsV0FBVyxFQUFFLEdBQUc7b0JBQ2hCLFNBQVMsRUFBRSxLQUFLO2lCQUNoQixDQUFDO2FBQ0Y7aUJBQU07Z0JBQ04sT0FBTztvQkFDTixPQUFPLEVBQUUsS0FBSztvQkFDZCxXQUFXLEVBQUUsR0FBRztvQkFDaEIsS0FBSyxFQUFFLGdGQUFnRjtvQkFDdkYsU0FBUyxFQUFFLEtBQUs7aUJBQ2hCLENBQUM7YUFDRjtTQUNEO1FBRUQsK0JBQStCO1FBQy9CLElBQUk7WUFDSCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFOUQsSUFBSSxDQUFDLElBQUks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WUFBWSxFQUFFLENBQUM7U0FDdEQ7SUFDRixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBVztRQUM3QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDMUMsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDckQsQ0FBQzs7QUExS0QsMENBQTBDO0FBQ2xCLCtCQUFZLEdBQUcsZUFBZSxDQUFDO0FBRXZELDZEQUE2RDtBQUNyQyx1Q0FBb0IsR0FDM0MsaUNBQWlDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogV2ViQ2FsIFVSTCBDb252ZXJ0ZXJcclxuICogQ29udmVydHMgd2ViY2FsOi8vIFVSTHMgdG8gaHR0cDovLyBvciBodHRwczovLyBVUkxzIGZvciBJQ1MgZmV0Y2hpbmdcclxuICovXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFdlYmNhbENvbnZlcnNpb25SZXN1bHQge1xyXG5cdC8qKiBXaGV0aGVyIHRoZSBjb252ZXJzaW9uIHdhcyBzdWNjZXNzZnVsICovXHJcblx0c3VjY2VzczogYm9vbGVhbjtcclxuXHQvKiogVGhlIGNvbnZlcnRlZCBVUkwgKGlmIHN1Y2Nlc3NmdWwpICovXHJcblx0Y29udmVydGVkVXJsPzogc3RyaW5nO1xyXG5cdC8qKiBPcmlnaW5hbCBVUkwgZm9yIHJlZmVyZW5jZSAqL1xyXG5cdG9yaWdpbmFsVXJsOiBzdHJpbmc7XHJcblx0LyoqIEVycm9yIG1lc3NhZ2UgKGlmIGNvbnZlcnNpb24gZmFpbGVkKSAqL1xyXG5cdGVycm9yPzogc3RyaW5nO1xyXG5cdC8qKiBXaGV0aGVyIHRoZSBvcmlnaW5hbCBVUkwgd2FzIGEgd2ViY2FsIFVSTCAqL1xyXG5cdHdhc1dlYmNhbDogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFdlYmNhbFVybENvbnZlcnRlciB7XHJcblx0Ly8gUmVndWxhciBleHByZXNzaW9uIHRvIG1hdGNoIHdlYmNhbCBVUkxzXHJcblx0cHJpdmF0ZSBzdGF0aWMgcmVhZG9ubHkgV0VCQ0FMX1JFR0VYID0gL153ZWJjYWw6XFwvXFwvL2k7XHJcblxyXG5cdC8vIFJlZ3VsYXIgZXhwcmVzc2lvbiB0byB2YWxpZGF0ZSBVUkwgZm9ybWF0IGFmdGVyIGNvbnZlcnNpb25cclxuXHRwcml2YXRlIHN0YXRpYyByZWFkb25seSBVUkxfVkFMSURBVElPTl9SRUdFWCA9XHJcblx0XHQvXmh0dHBzPzpcXC9cXC9bXlxccy8kLj8jXS5bXlxcc10qJC9pO1xyXG5cclxuXHQvKipcclxuXHQgKiBDb252ZXJ0IHdlYmNhbCBVUkwgdG8gaHR0cC9odHRwcyBVUkxcclxuXHQgKiBAcGFyYW0gdXJsIFRoZSBVUkwgdG8gY29udmVydFxyXG5cdCAqIEByZXR1cm5zIENvbnZlcnNpb24gcmVzdWx0IHdpdGggc3VjY2VzcyBzdGF0dXMgYW5kIGNvbnZlcnRlZCBVUkxcclxuXHQgKi9cclxuXHRzdGF0aWMgY29udmVydFdlYmNhbFVybCh1cmw6IHN0cmluZyk6IFdlYmNhbENvbnZlcnNpb25SZXN1bHQge1xyXG5cdFx0Y29uc3QgdHJpbW1lZFVybCA9IHVybC50cmltKCk7XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgVVJMIGlzIGVtcHR5XHJcblx0XHRpZiAoIXRyaW1tZWRVcmwpIHtcclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiBmYWxzZSxcclxuXHRcdFx0XHRvcmlnaW5hbFVybDogdXJsLFxyXG5cdFx0XHRcdGVycm9yOiBcIlVSTCBjYW5ub3QgYmUgZW1wdHlcIixcclxuXHRcdFx0XHR3YXNXZWJjYWw6IGZhbHNlLFxyXG5cdFx0XHR9O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENoZWNrIGlmIGl0J3MgYSB3ZWJjYWwgVVJMXHJcblx0XHRjb25zdCBpc1dlYmNhbCA9IHRoaXMuV0VCQ0FMX1JFR0VYLnRlc3QodHJpbW1lZFVybCk7XHJcblxyXG5cdFx0aWYgKCFpc1dlYmNhbCkge1xyXG5cdFx0XHQvLyBOb3QgYSB3ZWJjYWwgVVJMLCB2YWxpZGF0ZSBpZiBpdCdzIGEgdmFsaWQgaHR0cC9odHRwcyBVUkxcclxuXHRcdFx0aWYgKHRoaXMuaXNWYWxpZEh0dHBVcmwodHJpbW1lZFVybCkpIHtcclxuXHRcdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdFx0c3VjY2VzczogdHJ1ZSxcclxuXHRcdFx0XHRcdGNvbnZlcnRlZFVybDogdHJpbW1lZFVybCxcclxuXHRcdFx0XHRcdG9yaWdpbmFsVXJsOiB1cmwsXHJcblx0XHRcdFx0XHR3YXNXZWJjYWw6IGZhbHNlLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxVcmw6IHVybCxcclxuXHRcdFx0XHRcdGVycm9yOiBcIkludmFsaWQgVVJMIGZvcm1hdC4gUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBodHRwOi8vLCBodHRwczovLywgb3Igd2ViY2FsOi8vIFVSTFwiLFxyXG5cdFx0XHRcdFx0d2FzV2ViY2FsOiBmYWxzZSxcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ29udmVydCB3ZWJjYWwgdG8gaHR0cC9odHRwc1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgY29udmVydGVkVXJsID0gdGhpcy5wZXJmb3JtV2ViY2FsQ29udmVyc2lvbih0cmltbWVkVXJsKTtcclxuXHJcblx0XHRcdGlmICghdGhpcy5pc1ZhbGlkSHR0cFVybChjb252ZXJ0ZWRVcmwpKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZhbHNlLFxyXG5cdFx0XHRcdFx0b3JpZ2luYWxVcmw6IHVybCxcclxuXHRcdFx0XHRcdGVycm9yOiBcIkNvbnZlcnRlZCBVUkwgaXMgbm90IHZhbGlkXCIsXHJcblx0XHRcdFx0XHR3YXNXZWJjYWw6IHRydWUsXHJcblx0XHRcdFx0fTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRzdWNjZXNzOiB0cnVlLFxyXG5cdFx0XHRcdGNvbnZlcnRlZFVybCxcclxuXHRcdFx0XHRvcmlnaW5hbFVybDogdXJsLFxyXG5cdFx0XHRcdHdhc1dlYmNhbDogdHJ1ZSxcclxuXHRcdFx0fTtcclxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0c3VjY2VzczogZmFsc2UsXHJcblx0XHRcdFx0b3JpZ2luYWxVcmw6IHVybCxcclxuXHRcdFx0XHRlcnJvcjpcclxuXHRcdFx0XHRcdGVycm9yIGluc3RhbmNlb2YgRXJyb3JcclxuXHRcdFx0XHRcdFx0PyBlcnJvci5tZXNzYWdlXHJcblx0XHRcdFx0XHRcdDogXCJVbmtub3duIGNvbnZlcnNpb24gZXJyb3JcIixcclxuXHRcdFx0XHR3YXNXZWJjYWw6IHRydWUsXHJcblx0XHRcdH07XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBQZXJmb3JtIHRoZSBhY3R1YWwgd2ViY2FsIHRvIGh0dHAvaHR0cHMgY29udmVyc2lvblxyXG5cdCAqIEBwYXJhbSB3ZWJjYWxVcmwgVGhlIHdlYmNhbCBVUkwgdG8gY29udmVydFxyXG5cdCAqIEByZXR1cm5zIFRoZSBjb252ZXJ0ZWQgaHR0cC9odHRwcyBVUkxcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBwZXJmb3JtV2ViY2FsQ29udmVyc2lvbih3ZWJjYWxVcmw6IHN0cmluZyk6IHN0cmluZyB7XHJcblx0XHQvLyBSZW1vdmUgd2ViY2FsOi8vIHByZWZpeFxyXG5cdFx0Y29uc3Qgd2l0aG91dFByb3RvY29sID0gd2ViY2FsVXJsLnJlcGxhY2UodGhpcy5XRUJDQUxfUkVHRVgsIFwiXCIpO1xyXG5cclxuXHRcdC8vIERldGVybWluZSBpZiB3ZSBzaG91bGQgdXNlIGh0dHBzIG9yIGh0dHBcclxuXHRcdC8vIERlZmF1bHQgdG8gaHR0cHMgZm9yIGJldHRlciBzZWN1cml0eSwgdW5sZXNzIGV4cGxpY2l0bHkgY29uZmlndXJlZCBvdGhlcndpc2VcclxuXHRcdGNvbnN0IHVzZUh0dHBzID0gdGhpcy5zaG91bGRVc2VIdHRwcyh3aXRob3V0UHJvdG9jb2wpO1xyXG5cdFx0Y29uc3QgcHJvdG9jb2wgPSB1c2VIdHRwcyA/IFwiaHR0cHM6Ly9cIiA6IFwiaHR0cDovL1wiO1xyXG5cclxuXHRcdHJldHVybiBwcm90b2NvbCArIHdpdGhvdXRQcm90b2NvbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIERldGVybWluZSB3aGV0aGVyIHRvIHVzZSBIVFRQUyBvciBIVFRQIGZvciB0aGUgY29udmVydGVkIFVSTFxyXG5cdCAqIEBwYXJhbSB1cmxXaXRob3V0UHJvdG9jb2wgVGhlIFVSTCB3aXRob3V0IHByb3RvY29sXHJcblx0ICogQHJldHVybnMgVHJ1ZSBpZiBIVFRQUyBzaG91bGQgYmUgdXNlZCwgZmFsc2UgZm9yIEhUVFBcclxuXHQgKi9cclxuXHRwcml2YXRlIHN0YXRpYyBzaG91bGRVc2VIdHRwcyh1cmxXaXRob3V0UHJvdG9jb2w6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG5cdFx0Ly8gRXh0cmFjdCBob3N0bmFtZVxyXG5cdFx0Y29uc3QgaG9zdG5hbWUgPSB1cmxXaXRob3V0UHJvdG9jb2xcclxuXHRcdFx0LnNwbGl0KFwiL1wiKVswXVxyXG5cdFx0XHQuc3BsaXQoXCI/XCIpWzBdXHJcblx0XHRcdC50b0xvd2VyQ2FzZSgpO1xyXG5cclxuXHRcdC8vIFVzZSBIVFRQUyBieSBkZWZhdWx0IGZvciBzZWN1cml0eVxyXG5cdFx0Ly8gU29tZSBrbm93biBzZXJ2aWNlcyB0aGF0IG1pZ2h0IHJlcXVpcmUgSFRUUCBjYW4gYmUgYWRkZWQgaGVyZSBpZiBuZWVkZWRcclxuXHRcdGNvbnN0IGh0dHBPbmx5SG9zdHMgPSBbXHJcblx0XHRcdFwibG9jYWxob3N0XCIsXHJcblx0XHRcdFwiMTI3LjAuMC4xXCIsXHJcblx0XHRcdC8vIEFkZCBvdGhlciBrbm93biBIVFRQLW9ubHkgaG9zdHMgaWYgbmVlZGVkXHJcblx0XHRdO1xyXG5cclxuXHRcdC8vIENoZWNrIGlmIGhvc3RuYW1lIGNvbnRhaW5zIHBvcnQgbnVtYmVyIGZvciBsb2NhbGhvc3RcclxuXHRcdGNvbnN0IGhvc3RuYW1lV2l0aG91dFBvcnQgPSBob3N0bmFtZS5zcGxpdChcIjpcIilbMF07XHJcblxyXG5cdFx0cmV0dXJuICFodHRwT25seUhvc3RzLmluY2x1ZGVzKGhvc3RuYW1lV2l0aG91dFBvcnQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogVmFsaWRhdGUgaWYgYSBVUkwgaXMgYSB2YWxpZCBIVFRQL0hUVFBTIFVSTFxyXG5cdCAqIEBwYXJhbSB1cmwgVGhlIFVSTCB0byB2YWxpZGF0ZVxyXG5cdCAqIEByZXR1cm5zIFRydWUgaWYgdmFsaWQsIGZhbHNlIG90aGVyd2lzZVxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc3RhdGljIGlzVmFsaWRIdHRwVXJsKHVybDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHR0cnkge1xyXG5cdFx0XHRjb25zdCB1cmxPYmogPSBuZXcgVVJMKHVybCk7XHJcblx0XHRcdHJldHVybiB1cmxPYmoucHJvdG9jb2wgPT09IFwiaHR0cDpcIiB8fCB1cmxPYmoucHJvdG9jb2wgPT09IFwiaHR0cHM6XCI7XHJcblx0XHR9IGNhdGNoIHtcclxuXHRcdFx0cmV0dXJuIGZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogQ2hlY2sgaWYgYSBVUkwgaXMgYSB3ZWJjYWwgVVJMXHJcblx0ICogQHBhcmFtIHVybCBUaGUgVVJMIHRvIGNoZWNrXHJcblx0ICogQHJldHVybnMgVHJ1ZSBpZiBpdCdzIGEgd2ViY2FsIFVSTCwgZmFsc2Ugb3RoZXJ3aXNlXHJcblx0ICovXHJcblx0c3RhdGljIGlzV2ViY2FsVXJsKHVybDogc3RyaW5nKTogYm9vbGVhbiB7XHJcblx0XHRyZXR1cm4gdGhpcy5XRUJDQUxfUkVHRVgudGVzdCh1cmwudHJpbSgpKTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEdldCBhIHVzZXItZnJpZW5kbHkgZGVzY3JpcHRpb24gb2YgdGhlIFVSTCBjb252ZXJzaW9uXHJcblx0ICogQHBhcmFtIHJlc3VsdCBUaGUgY29udmVyc2lvbiByZXN1bHRcclxuXHQgKiBAcmV0dXJucyBBIGRlc2NyaXB0aW9uIHN0cmluZ1xyXG5cdCAqL1xyXG5cdHN0YXRpYyBnZXRDb252ZXJzaW9uRGVzY3JpcHRpb24ocmVzdWx0OiBXZWJjYWxDb252ZXJzaW9uUmVzdWx0KTogc3RyaW5nIHtcclxuXHRcdGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcclxuXHRcdFx0cmV0dXJuIGBFcnJvcjogJHtyZXN1bHQuZXJyb3J9YDtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAocmVzdWx0Lndhc1dlYmNhbCkge1xyXG5cdFx0XHRyZXR1cm4gYENvbnZlcnRlZCB3ZWJjYWwgVVJMIHRvOiAke3Jlc3VsdC5jb252ZXJ0ZWRVcmx9YDtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiBgVmFsaWQgSFRUUC9IVFRQUyBVUkw6ICR7cmVzdWx0LmNvbnZlcnRlZFVybH1gO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRXh0cmFjdCB0aGUgZmluYWwgVVJMIHRvIHVzZSBmb3IgZmV0Y2hpbmcgSUNTIGRhdGFcclxuXHQgKiBAcGFyYW0gdXJsIFRoZSBvcmlnaW5hbCBVUkwgaW5wdXRcclxuXHQgKiBAcmV0dXJucyBUaGUgVVJMIHRvIHVzZSBmb3IgZmV0Y2hpbmcsIG9yIG51bGwgaWYgaW52YWxpZFxyXG5cdCAqL1xyXG5cdHN0YXRpYyBnZXRGZXRjaFVybCh1cmw6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG5cdFx0Y29uc3QgcmVzdWx0ID0gdGhpcy5jb252ZXJ0V2ViY2FsVXJsKHVybCk7XHJcblx0XHRyZXR1cm4gcmVzdWx0LnN1Y2Nlc3MgPyByZXN1bHQuY29udmVydGVkVXJsISA6IG51bGw7XHJcblx0fVxyXG59XHJcbiJdfQ==