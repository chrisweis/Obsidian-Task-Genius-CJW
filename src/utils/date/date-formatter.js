import { format, isToday, isTomorrow, isThisYear, parse, parseISO, isValid, startOfDay, } from "date-fns";
import { enUS } from "date-fns/locale";
/**
 * Format a date in a human-readable format
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatDate(date) {
    if (isToday(date)) {
        return "Today";
    }
    else if (isTomorrow(date)) {
        return "Tomorrow";
    }
    // Format as Month Day, Year for other dates
    if (isThisYear(date)) {
        return format(date, "MMM d");
    }
    else {
        return format(date, "MMM d, yyyy");
    }
}
/**
 * Parse a date string in various formats
 * @param dateString Date string to parse
 * @param customFormats Optional array of custom date format patterns to try
 * @returns Parsed date as a number or undefined if invalid
 */
export function parseLocalDate(dateString, customFormats) {
    if (!dateString)
        return undefined;
    // Trim whitespace
    dateString = dateString.trim();
    // Skip template strings
    if (dateString.includes("{{") || dateString.includes("}}")) {
        return undefined;
    }
    // Define default format patterns to try with date-fns
    const defaultFormats = [
        "yyyy-MM-dd",
        "yyyy/MM/dd",
        "dd-MM-yyyy",
        "dd/MM/yyyy",
        "MM-dd-yyyy",
        "MM/dd/yyyy",
        "yyyy.MM.dd",
        "dd.MM.yyyy",
        "yyyy年M月d日",
        "MMM d, yyyy",
        "MMM dd, yyyy",
        "d MMM yyyy",
        "dd MMM yyyy",
        "yyyyMMddHHmmss",
        "yyyyMMdd_HHmmss",
    ];
    // Combine custom formats with default formats
    const allFormats = customFormats
        ? [...customFormats, ...defaultFormats]
        : defaultFormats;
    // Try each format with date-fns parse
    for (const formatString of allFormats) {
        try {
            const parsedDate = parse(dateString, formatString, new Date(), {
                locale: enUS,
            });
            // Check if the parsed date is valid
            if (isValid(parsedDate)) {
                // Set to start of day to match original behavior
                const normalizedDate = startOfDay(parsedDate);
                return normalizedDate.getTime();
            }
        }
        catch (e) {
            // Silently continue to next format
            continue;
        }
    }
    // Try parseISO as a fallback for ISO strings
    try {
        const isoDate = parseISO(dateString);
        if (isValid(isoDate)) {
            const normalizedDate = startOfDay(isoDate);
            return normalizedDate.getTime();
        }
    }
    catch (e) {
        // Silently continue
    }
    // If all parsing attempts fail, log a warning
    console.warn(`Worker: Could not parse date: ${dateString}`);
    return undefined;
}
/**
 * Get today's date in local timezone as YYYY-MM-DD format
 * This fixes the issue where using toISOString() can return yesterday's date
 * for users in timezones ahead of UTC
 * @returns Today's date in YYYY-MM-DD format in local timezone
 */
export function getTodayLocalDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
/**
 * Convert a Date object to YYYY-MM-DD format in local timezone
 * This fixes the issue where using toISOString() can return wrong date
 * for users in timezones ahead of UTC
 * @param date The date to format
 * @returns Date in YYYY-MM-DD format in local timezone
 */
export function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
/**
 * Convert a date to a relative time string, such as
 * "yesterday", "today", "tomorrow", etc.
 * using Intl.RelativeTimeFormat
 */
export function getRelativeTimeString(date, lang = navigator.language) {
    // 允许传入日期对象或时间戳
    const timeMs = typeof date === "number" ? date : date.getTime();
    // 获取当前日期（去除时分秒）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // 获取传入日期（去除时分秒）
    const targetDate = new Date(timeMs);
    targetDate.setHours(0, 0, 0, 0);
    // 计算日期差（以天为单位）
    const deltaDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // 创建相对时间格式化器
    const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
    // 返回格式化后的相对时间字符串
    return rtf.format(deltaDays, "day");
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0ZS1mb3JtYXR0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJkYXRlLWZvcm1hdHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQ04sTUFBTSxFQUNOLE9BQU8sRUFDUCxVQUFVLEVBQ1YsVUFBVSxFQUNWLEtBQUssRUFDTCxRQUFRLEVBQ1IsT0FBTyxFQUNQLFVBQVUsR0FDVixNQUFNLFVBQVUsQ0FBQztBQUNsQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFdkM7Ozs7R0FJRztBQUNILE1BQU0sVUFBVSxVQUFVLENBQUMsSUFBVTtJQUNwQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNsQixPQUFPLE9BQU8sQ0FBQztLQUNmO1NBQU0sSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDNUIsT0FBTyxVQUFVLENBQUM7S0FDbEI7SUFFRCw0Q0FBNEM7SUFDNUMsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDckIsT0FBTyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQzdCO1NBQU07UUFDTixPQUFPLE1BQU0sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7S0FDbkM7QUFDRixDQUFDO0FBRUQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsY0FBYyxDQUM3QixVQUFrQixFQUNsQixhQUF3QjtJQUV4QixJQUFJLENBQUMsVUFBVTtRQUFFLE9BQU8sU0FBUyxDQUFDO0lBRWxDLGtCQUFrQjtJQUNsQixVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDO0lBRS9CLHdCQUF3QjtJQUN4QixJQUFJLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUMzRCxPQUFPLFNBQVMsQ0FBQztLQUNqQjtJQUVELHNEQUFzRDtJQUN0RCxNQUFNLGNBQWMs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QUcsU0FBUyxDQUFDLFFBQVE7SUFFekIsZUFBZTtJQUNmLE1BQU0sTUFBTSxHQUFHLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFaEUsZ0JBQWdCO0lBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDekIsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUUzQixnQkFBZ0I7SUFDaEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUVoQyxlQUFlO0lBQ2YsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FDM0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FDaEUsQ0FBQztJQUVGLGFBQWE7SUFDYixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUVuRSxpQkFBaUI7SUFDakIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUNyQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRmb3JtYXQsXHJcblx0aXNUb2RheSxcclxuXHRpc1RvbW9ycm93LFxyXG5cdGlzVGhpc1llYXIsXHJcblx0cGFyc2UsXHJcblx0cGFyc2VJU08sXHJcblx0aXNWYWxpZCxcclxuXHRzdGFydE9mRGF5LFxyXG59IGZyb20gXCJkYXRlLWZuc1wiO1xyXG5pbXBvcnQgeyBlblVTIH0gZnJvbSBcImRhdGUtZm5zL2xvY2FsZVwiO1xyXG5cclxuLyoqXHJcbiAqIEZvcm1hdCBhIGRhdGUgaW4gYSBodW1hbi1yZWFkYWJsZSBmb3JtYXRcclxuICogQHBhcmFtIGRhdGUgRGF0ZSB0byBmb3JtYXRcclxuICogQHJldHVybnMgRm9ybWF0dGVkIGRhdGUgc3RyaW5nXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGF0ZShkYXRlOiBEYXRlKTogc3RyaW5nIHtcclxuXHRpZiAoaXNUb2RheShkYXRlKSkge1xyXG5cdFx0cmV0dXJuIFwiVG9kYXlcIjtcclxuXHR9IGVsc2UgaWYgKGlzVG9tb3Jyb3coZGF0ZSkpIHtcclxuXHRcdHJldHVybiBcIlRvbW9ycm93XCI7XHJcblx0fVxyXG5cclxuXHQvLyBGb3JtYXQgYXMgTW9udGggRGF5LCBZZWFyIGZvciBvdGhlciBkYXRlc1xyXG5cdGlmIChpc1RoaXNZZWFyKGRhdGUpKSB7XHJcblx0XHRyZXR1cm4gZm9ybWF0KGRhdGUsIFwiTU1NIGRcIik7XHJcblx0fSBlbHNlIHtcclxuXHRcdHJldHVybiBmb3JtYXQoZGF0ZSwgXCJNTU0gZCwgeXl5eVwiKTtcclxuXHR9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBhIGRhdGUgc3RyaW5nIGluIHZhcmlvdXMgZm9ybWF0c1xyXG4gKiBAcGFyYW0gZGF0ZVN0cmluZyBEYXRlIHN0cmluZyB0byBwYXJzZVxyXG4gKiBAcGFyYW0gY3VzdG9tRm9ybWF0cyBPcHRpb25hbCBhcnJheSBvZiBjdXN0b20gZGF0ZSBmb3JtYXQgcGF0dGVybnMgdG8gdHJ5XHJcbiAqIEByZXR1cm5zIFBhcnNlZCBkYXRlIGFzIGEgbnVtYmVyIG9yIHVuZGVmaW5lZCBpZiBpbnZhbGlkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VMb2NhbERhdGUoXHJcblx0ZGF0ZVN0cmluZzogc3RyaW5nLFxyXG5cdGN1c3RvbUZvcm1hdHM/OiBzdHJpbmdbXVxyXG4pOiBudW1iZXIgfCB1bmRlZmluZWQge1xyXG5cdGlmICghZGF0ZVN0cmluZykgcmV0dXJuIHVuZGVmaW5lZDtcclxuXHJcblx0Ly8gVHJpbSB3aGl0ZXNwYWNlXHJcblx0ZGF0ZVN0cmluZyA9IGRhdGVTdHJpbmcudHJpbSgpO1xyXG5cclxuXHQvLyBTa2lwIHRlbXBsYXRlIHN0cmluZ3NcclxuXHRpZiAoZGF0ZVN0cmluZy5pbmNsdWRlcyhcInt7XCIpIHx8IGRhdGVTdHJpbmcuaW5jbHVkZXMoXCJ9fVwiKSkge1xyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblxyXG5cdC8vIERlZmluZSBkZWZhdWx0IGZvcm1hdCBwYXR0ZXJucyB0byB0cnkgd2l0aCBkYXRlLWZuc1xyXG5cdGNvbnN0IGRlZmF1bHRGb3JtYXRzID0gW1xyXG5cdFx0XCJ5eXl5LU1NLWRkXCIsIC8vIElTTyBmb3JtYXRcclxuXHRcdFwieXl5eS9NTS9kZFwiLCAvLyBZWVlZL01NL0REXHJcblx0XHRcImRkLU1NLXl5eXlcIiwgLy8gREQtTU0tWVlZWVxyXG5cdFx0XCJkZC9NTS95eXl5XCIsIC8vIEREL01NL1lZWVlcclxuXHRcdFwiTU0tZGQteXl5eVwiLCAvLyBNTS1ERC1ZWVlZXHJcblx0XHRcIk1NL2RkL3l5eXlcIiwgLy8gTU0vREQvWVlZWVxyXG5cdFx0XCJ5eXl5Lk1NLmRkXCIsIC8vIFlZWVkuTU0uRERcclxuXHRcdFwiZGQuTU0ueXl5eVwiLCAvLyBERC5NTS5ZWVlZXHJcblx0XHRcInl5eXnlubRN5pyIZOaXpVwiLCAvLyBDaGluZXNlL0phcGFuZXNlIGZvcm1hdFxyXG5cdFx0XCJNTU0gZCwgeXl5eVwiLCAvLyBNTU0gREQsIFlZWVkgKGUuZy4sIEphbiAxNSwgMjAyNSlcclxuXHRcdFwiTU1NIGRkLCB5eXl5XCIsIC8vIE1NTSBERCwgWVlZWSB3aXRoIGxlYWRpbmcgemVyb1xyXG5cdFx0XCJkIE1NTSB5eXl5XCIsIC8vIEREIE1NTSBZWVlZIChlLmcuLCAxNSBKYW4gMjAyNSlcclxuXHRcdFwiZGQgTU1NIHl5eXlcIiwgLy8gREQgTU1NIFlZWVkgd2l0aCBsZWFkaW5nIHplcm9cclxuXHRcdFwieXl5eU1NZGRISG1tc3NcIixcclxuXHRcdFwieXl5eU1NZGRfSEhtbXNzXCIsXHJcblx0XTtcclxuXHJcblx0Ly8gQ29tYmluZSBjdXN0b20gZm9ybWF0cyB3aXRoIGRlZmF1bHQgZm9ybWF0c1xyXG5cdGNvbnN0IGFsbEZvcm1hdHMgPSBjdXN0b21Gb3JtYXRzXHJcblx0XHQ/IFsuLi5jdXN0b21Gb3JtYXRzLCAuLi5kZWZhdWx0Rm9ybWF0c11cclxuXHRcdDogZGVmYXVsdEZvcm1hdHM7XHJcblxyXG5cdC8vIFRyeSBlYWNoIGZvcm1hdCB3aXRoIGRhdGUtZm5zIHBhcnNlXHJcblx0Zm9yIChjb25zdCBmb3JtYXRTdHJpbmcgb2YgYWxsRm9ybWF0cykge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgcGFyc2VkRGF0ZSA9IHBhcnNlKGRhdGVTdHJpbmcsIGZvcm1hdFN0cmluZywgbmV3IERhdGUoKSwge1xyXG5cdFx0XHRcdGxvY2FsZTogZW5VUyxcclxuXHRcdFx0fSk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aGUgcGFyc2VkIGRhdGUgaXMgdmFsaWRcclxuXHRcdFx0aWYgKGlzVmFsaWQocGFyc2VkRGF0ZSkpIHtcclxuXHRcdFx0XHQvLyBTZXQgdG8gc3RhcnQgb2YgZGF5IHRvIG1hdGNoIG9yaWdpbmFsIGJlaGF2aW9yXHJcblx0XHRcdFx0Y29uc3Qgbm9ybWFsaXplZERhdGUgPSBzdGFydE9mRGF5KHBhcnNlZERhdGUpO1xyXG5cdFx0XHRcdHJldHVybiBub3JtYWxpemVkRGF0ZS5nZXRUaW1lKCk7XHJcblx0XHRcdH1cclxuXHRcdH0gY2F0Y2ggKGUpIHtcclxuXHRcdFx0Ly8gU2lsZW50bHkgY29udGludWUgdG8gbmV4dCBmb3JtYXRcclxuXHRcdFx0Y29udGludWU7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHQvLyBUcnkgcGFyc2VJU08gYXMgYSBmYWxsYmFjayBmb3IgSVNPIHN0cmluZ3NcclxuXHR0cnkge1xyXG5cdFx0Y29uc3QgaXNvRGF0ZSA9IHBhcnNlSVNPKGRhdGVTdHJpbmcpO1xyXG5cdFx0aWYgKGlzVmFsaWQoaXNvRGF0ZSkpIHtcclxuXHRcdFx0Y29uc3Qgbm9ybWFsaXplZERhdGUgPSBzdGFydE9mRGF5KGlzb0RhdGUpO1xyXG5cdFx0XHRyZXR1cm4gbm9ybWFsaXplZERhdGUuZ2V0VGltZSgpO1xyXG5cdFx0fVxyXG5cdH0gY2F0Y2ggKGUpIHtcclxuXHRcdC8vIFNpbGVudGx5IGNvbnRpbnVlXHJcblx0fVxyXG5cclxuXHQvLyBJZiBhbGwgcGFyc2luZyBhdHRlbXB0cyBmYWlsLCBsb2cgYSB3YXJuaW5nXHJcblx0Y29uc29sZS53YXJuKGBXb3JrZXI6IENvdWxkIG5vdCBwYXJzZSBkYXRlOiAke2RhdGVTdHJpbmd9YCk7XHJcblx0cmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCB0b2RheSdzIGRhdGUgaW4gbG9jYWwgdGltZXpvbmUgYXMgWVlZWS1NTS1ERCBmb3JtYXRcclxuICogVGhpcyBmaXhlcyB0aGUgaXNzdWUgd2hlcmUgdXNpbmcgdG9JU09TdHJpbmcoKSBjYW4gcmV0dXJuIHllc3RlcmRheSdzIGRhdGVcclxuICogZm9yIHVzZXJzIGluIHRpbWV6b25lcyBhaGVhZCBvZiBVVENcclxuICogQHJldHVybnMgVG9kYXkncyBkYXRlIGluIFlZWVktTU0tREQgZm9ybWF0IGluIGxvY2FsIHRpbWV6b25lXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VG9kYXlMb2NhbERhdGVTdHJpbmcoKTogc3RyaW5nIHtcclxuXHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0Y29uc3QgeWVhciA9IHRvZGF5LmdldEZ1bGxZZWFyKCk7XHJcblx0Y29uc3QgbW9udGggPSBTdHJpbmcodG9kYXkuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsIFwiMFwiKTtcclxuXHRjb25zdCBkYXkgPSBTdHJpbmcodG9kYXkuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIik7XHJcblx0cmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgRGF0ZSBvYmplY3QgdG8gWVlZWS1NTS1ERCBmb3JtYXQgaW4gbG9jYWwgdGltZXpvbmVcclxuICogVGhpcyBmaXhlcyB0aGUgaXNzdWUgd2hlcmUgdXNpbmcgdG9JU09TdHJpbmcoKSBjYW4gcmV0dXJuIHdyb25nIGRhdGVcclxuICogZm9yIHVzZXJzIGluIHRpbWV6b25lcyBhaGVhZCBvZiBVVENcclxuICogQHBhcmFtIGRhdGUgVGhlIGRhdGUgdG8gZm9ybWF0XHJcbiAqIEByZXR1cm5zIERhdGUgaW4gWVlZWS1NTS1ERCBmb3JtYXQgaW4gbG9jYWwgdGltZXpvbmVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbERhdGVTdHJpbmcoZGF0ZTogRGF0ZSk6IHN0cmluZyB7XHJcblx0Y29uc3QgeWVhciA9IGRhdGUuZ2V0RnVsbFllYXIoKTtcclxuXHRjb25zdCBtb250aCA9IFN0cmluZyhkYXRlLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCBcIjBcIik7XHJcblx0Y29uc3QgZGF5ID0gU3RyaW5nKGRhdGUuZ2V0RGF0ZSgpKS5wYWRTdGFydCgyLCBcIjBcIik7XHJcblx0cmV0dXJuIGAke3llYXJ9LSR7bW9udGh9LSR7ZGF5fWA7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0IGEgZGF0ZSB0byBhIHJlbGF0aXZlIHRpbWUgc3RyaW5nLCBzdWNoIGFzXHJcbiAqIFwieWVzdGVyZGF5XCIsIFwidG9kYXlcIiwgXCJ0b21vcnJvd1wiLCBldGMuXHJcbiAqIHVzaW5nIEludGwuUmVsYXRpdmVUaW1lRm9ybWF0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVsYXRpdmVUaW1lU3RyaW5nKFxyXG5cdGRhdGU6IERhdGUgfCBudW1iZXIsXHJcblx0bGFuZyA9IG5hdmlnYXRvci5sYW5ndWFnZVxyXG4pOiBzdHJpbmcge1xyXG5cdC8vIOWFgeiuuOS8oOWFpeaXpeacn+WvueixoeaIluaXtumXtOaIs1xyXG5cdGNvbnN0IHRpbWVNcyA9IHR5cGVvZiBkYXRlID09PSBcIm51bWJlclwiID8gZGF0ZSA6IGRhdGUuZ2V0VGltZSgpO1xyXG5cclxuXHQvLyDojrflj5blvZPliY3ml6XmnJ/vvIjljrvpmaTml7bliIbnp5LvvIlcclxuXHRjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcblx0dG9kYXkuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdC8vIOiOt+WPluS8oOWFpeaXpeacn++8iOWOu+mZpOaXtuWIhuenku+8iVxyXG5cdGNvbnN0IHRhcmdldERhdGUgPSBuZXcgRGF0ZSh0aW1lTXMpO1xyXG5cdHRhcmdldERhdGUuc2V0SG91cnMoMCwgMCwgMCwgMCk7XHJcblxyXG5cdC8vIOiuoeeul+aXpeacn+W3ru+8iOS7peWkqeS4uuWNleS9je+8iVxyXG5cdGNvbnN0IGRlbHRhRGF5cyA9IE1hdGgucm91bmQoXHJcblx0XHQodGFyZ2V0RGF0ZS5nZXRUaW1lKCkgLSB0b2RheS5nZXRUaW1lKCkpIC8gKDEwMDAgKiA2MCAqIDYwICogMjQpXHJcblx0KTtcclxuXHJcblx0Ly8g5Yib5bu655u45a+55pe26Ze05qC85byP5YyW5ZmoXHJcblx0Y29uc3QgcnRmID0gbmV3IEludGwuUmVsYXRpdmVUaW1lRm9ybWF0KGxhbmcsIHsgbnVtZXJpYzogXCJhdXRvXCIgfSk7XHJcblxyXG5cdC8vIOi/lOWbnuagvOW8j+WMluWQjueahOebuOWvueaXtumXtOWtl+espuS4slxyXG5cdHJldHVybiBydGYuZm9ybWF0KGRlbHRhRGF5cywgXCJkYXlcIik7XHJcbn1cclxuIl19