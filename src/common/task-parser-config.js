import { MetadataParseMode, } from "../types/TaskParserConfig";
export const getConfig = (format, plugin) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    // Get configurable prefixes from plugin settings, with fallback defaults
    const projectPrefix = ((_b = (_a = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _a === void 0 ? void 0 : _a.projectTagPrefix) === null || _b === void 0 ? void 0 : _b[format]) || "project";
    const contextPrefix = ((_d = (_c = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _c === void 0 ? void 0 : _c.contextTagPrefix) === null || _d === void 0 ? void 0 : _d[format]) ||
        (format === "dataview" ? "context" : "@");
    const areaPrefix = ((_f = (_e = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _e === void 0 ? void 0 : _e.areaTagPrefix) === null || _f === void 0 ? void 0 : _f[format]) || "area";
    const config = {
        // Basic parsing controls
        parseTags: true,
        parseMetadata: true,
        parseHeadings: true,
        parseComments: false,
        // Metadata format preference
        metadataParseMode: format === "dataview"
            ? MetadataParseMode.DataviewOnly
            : MetadataParseMode.Both,
        // Status mapping (standard task states)
        statusMapping: {
            todo: " ",
            done: "x",
            cancelled: "-",
            forwarded: ">",
            scheduled: "<",
            important: "!",
            question: "?",
            incomplete: "/",
            paused: "p",
            pro: "P",
            con: "C",
            quote: "Q",
            note: "N",
            bookmark: "b",
            information: "i",
            savings: "S",
            idea: "I",
            location: "l",
            phone: "k",
            win: "w",
            key: "K",
        },
        // Emoji to metadata mapping
        emojiMapping: {
            "📅": "dueDate",
            "🛫": "startDate",
            "⏳": "scheduledDate",
            "✅": "completedDate",
            "❌": "cancelledDate",
            "➕": "createdDate",
            "🔁": "recurrence",
            "🏁": "onCompletion",
            "⛔": "dependsOn",
            "🆔": "id",
            "🔺": "priority",
            "⏫": "priority",
            "🔼": "priority",
            "🔽": "priority",
            "⏬": "priority",
        },
        // Special tag prefixes for project/context/area (now configurable)
        // Only include the configured prefixes, avoid default fallbacks to prevent conflicts
        specialTagPrefixes: (() => {
            const prefixes = {};
            // Only add configured prefixes, with case-insensitive support
            if (projectPrefix) {
                prefixes[projectPrefix] = "project";
                prefixes[String(projectPrefix).toLowerCase()] = "project";
            }
            if (areaPrefix) {
                prefixes[areaPrefix] = "area";
                prefixes[String(areaPrefix).toLowerCase()] = "area";
            }
            if (contextPrefix) {
                prefixes[contextPrefix] = "context";
                prefixes[String(contextPrefix).toLowerCase()] = "context";
            }
            return prefixes;
        })(),
        // Performance and parsing limits
        maxParseIterations: 4000,
        maxMetadataIterations: 400,
        maxTagLength: 100,
        maxEmojiValueLength: 200,
        maxStackOperations: 4000,
        maxStackSize: 1000,
        maxIndentSize: 8,
        // Enhanced project configuration
        projectConfig: ((_h = (_g = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _g === void 0 ? void 0 : _g.projectConfig) === null || _h === void 0 ? void 0 : _h.enableEnhancedProject)
            ? (_j = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _j === void 0 ? void 0 : _j.projectConfig
            : undefined,
        // File Metadata Inheritance
        fileMetadataInheritance: (_k = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _k === void 0 ? void 0 : _k.fileMetadataInheritance,
        // Custom date formats for parsing
        customDateFormats: ((_l = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _l === void 0 ? void 0 : _l.enableCustomDateFormats)
            ? (_m = plugin === null || plugin === void 0 ? void 0 : plugin.settings) === null || _m === void 0 ? void 0 : _m.customDateFormats
            : undefined,
    };
    return config;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay1wYXJzZXItY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFzay1wYXJzZXItY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTixpQkFBaUIsR0FHakIsTUFBTSwyQkFBMkIsQ0FBQztBQUluQyxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsQ0FDeEIsTUFBc0IsRUFDdEIsTUFBa0QsRUFDL0IsRUFBRTs7SUFDckIseUVBQXlFO0lBQ3pFLE1BQU0sYUFBYSxHQUNsQixDQUFBLE1BQUEsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsUUFBUSwwQ0FBRSxnQkFBZ0IsMENBQUcsTUFBTSxDQUFDLEtBQUksU0FBUyxDQUFDO0lBQzNELE1BQU0sYUFBYSxHQUNsQixDQUFBLE1BQUEsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsUUFBUSwwQ0FBRSxnQkFBZ0IsMENBQUcsTUFBTSxDQUFDO1FBQzVDLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMzQyxNQUFNLFVBQVUsR0FBRyxDQUFBLE1BQUEsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsUUFBUSwwQ0FBRSxhQUFhLDBDQUFHLE1BQU0sQ0FBQyxLQUFJLE1BQU0sQ0FBQztJQUV2RSxNQUFNLE1BQU0sR0FBcUI7UUFDaEMseUJBQXlCO1FBQ3pCLFNBQVMsRUFBRSxJQUFJO1FBQ2YsYUFBYSxFQUFFLElBQUk7UUFDbkIsYUFBYSxFQUFFLElBQUk7UUFDbkIsYUFBYSxFQUFFLEtBQUs7UUFFcEIsNkJBQTZCO1FBQzdCLGlCQUFpQixFQUNoQixNQUFNLEtBQUssVUFBVTtZQUNwQixDQUFDLENBQUMsaUJBQWlCLENBQUMsWUFBWTtZQUNoQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSTtRQUUxQix3Q0FBd0M7UUFD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QWtDO1FBQ2xDLGlCQUFpQixFQUFFLENBQUEsTUFBQSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsUUFBUSwwQ0FBRSx1QkFBdUI7WUFDM0QsQ0FBQyxDQUFDLE1BQUEsTUFBTSxhQUFOLE1BQU0sdUJBQU4sTUFBTSxDQUFFLFFBQVEsMENBQUUsaUJBQWlCO1lBQ3JDLENBQUMsQ0FBQyxTQUFTO0tBQ1osQ0FBQztJQUVGLE9BQU8sTUFBTSxDQUFDO0FBQ2YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuXHRNZXRhZGF0YVBhcnNlTW9kZSxcclxuXHRUYXNrUGFyc2VyQ29uZmlnLFxyXG5cdGNyZWF0ZURlZmF1bHRQYXJzZXJDb25maWcsXHJcbn0gZnJvbSBcIi4uL3R5cGVzL1Rhc2tQYXJzZXJDb25maWdcIjtcclxuaW1wb3J0IHsgTWV0YWRhdGFGb3JtYXQgfSBmcm9tIFwiLi4vdXRpbHMvdGFzay90YXNrLW9wZXJhdGlvbnNcIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IGdldENvbmZpZyA9IChcclxuXHRmb3JtYXQ6IE1ldGFkYXRhRm9ybWF0LFxyXG5cdHBsdWdpbj86IFRhc2tQcm9ncmVzc0JhclBsdWdpbiB8IHsgc2V0dGluZ3M6IGFueSB9XHJcbik6IFRhc2tQYXJzZXJDb25maWcgPT4ge1xyXG5cdC8vIEdldCBjb25maWd1cmFibGUgcHJlZml4ZXMgZnJvbSBwbHVnaW4gc2V0dGluZ3MsIHdpdGggZmFsbGJhY2sgZGVmYXVsdHNcclxuXHRjb25zdCBwcm9qZWN0UHJlZml4ID1cclxuXHRcdHBsdWdpbj8uc2V0dGluZ3M/LnByb2plY3RUYWdQcmVmaXg/Lltmb3JtYXRdIHx8IFwicHJvamVjdFwiO1xyXG5cdGNvbnN0IGNvbnRleHRQcmVmaXggPVxyXG5cdFx0cGx1Z2luPy5zZXR0aW5ncz8uY29udGV4dFRhZ1ByZWZpeD8uW2Zvcm1hdF0gfHxcclxuXHRcdChmb3JtYXQgPT09IFwiZGF0YXZpZXdcIiA/IFwiY29udGV4dFwiIDogXCJAXCIpO1xyXG5cdGNvbnN0IGFyZWFQcmVmaXggPSBwbHVnaW4/LnNldHRpbmdzPy5hcmVhVGFnUHJlZml4Py5bZm9ybWF0XSB8fCBcImFyZWFcIjtcclxuXHJcblx0Y29uc3QgY29uZmlnOiBUYXNrUGFyc2VyQ29uZmlnID0ge1xyXG5cdFx0Ly8gQmFzaWMgcGFyc2luZyBjb250cm9sc1xyXG5cdFx0cGFyc2VUYWdzOiB0cnVlLFxyXG5cdFx0cGFyc2VNZXRhZGF0YTogdHJ1ZSxcclxuXHRcdHBhcnNlSGVhZGluZ3M6IHRydWUsIC8vIHRhc2tVdGlsIGZ1bmN0aW9ucyBhcmUgZm9yIHNpbmdsZS1saW5lIHBhcnNpbmdcclxuXHRcdHBhcnNlQ29tbWVudHM6IGZhbHNlLCAvLyBOb3QgbmVlZGVkIGZvciBzaW5nbGUtbGluZSBwYXJzaW5nXHJcblxyXG5cdFx0Ly8gTWV0YWRhdGEgZm9ybWF0IHByZWZlcmVuY2VcclxuXHRcdG1ldGFkYXRhUGFyc2VNb2RlOlxyXG5cdFx0XHRmb3JtYXQgPT09IFwiZGF0YXZpZXdcIlxyXG5cdFx0XHRcdD8gTWV0YWRhdGFQYXJzZU1vZGUuRGF0YXZpZXdPbmx5XHJcblx0XHRcdFx0OiBNZXRhZGF0YVBhcnNlTW9kZS5Cb3RoLFxyXG5cclxuXHRcdC8vIFN0YXR1cyBtYXBwaW5nIChzdGFuZGFyZCB0YXNrIHN0YXRlcylcclxuXHRcdHN0YXR1c01hcHBpbmc6IHtcclxuXHRcdFx0dG9kbzogXCIgXCIsXHJcblx0XHRcdGRvbmU6IFwieFwiLFxyXG5cdFx0XHRjYW5jZWxsZWQ6IFwiLVwiLFxyXG5cdFx0XHRmb3J3YXJkZWQ6IFwiPlwiLFxyXG5cdFx0XHRzY2hlZHVsZWQ6IFwiPFwiLFxyXG5cdFx0XHRpbXBvcnRhbnQ6IFwiIVwiLFxyXG5cdFx0XHRxdWVzdGlvbjogXCI/XCIsXHJcblx0XHRcdGluY29tcGxldGU6IFwiL1wiLFxyXG5cdFx0XHRwYXVzZWQ6IFwicFwiLFxyXG5cdFx0XHRwcm86IFwiUFwiLFxyXG5cdFx0XHRjb246IFwiQ1wiLFxyXG5cdFx0XHRxdW90ZTogXCJRXCIsXHJcblx0XHRcdG5vdGU6IFwiTlwiLFxyXG5cdFx0XHRib29rbWFyazogXCJiXCIsXHJcblx0XHRcdGluZm9ybWF0aW9uOiBcImlcIixcclxuXHRcdFx0c2F2aW5nczogXCJTXCIsXHJcblx0XHRcdGlkZWE6IFwiSVwiLFxyXG5cdFx0XHRsb2NhdGlvbjogXCJsXCIsXHJcblx0XHRcdHBob25lOiBcImtcIixcclxuXHRcdFx0d2luOiBcIndcIixcclxuXHRcdFx0a2V5OiBcIktcIixcclxuXHRcdH0sXHJcblxyXG5cdFx0Ly8gRW1vamkgdG8gbWV0YWRhdGEgbWFwcGluZ1xyXG5cdFx0ZW1vamlNYXBwaW5nOiB7XHJcblx0XHRcdFwi8J+ThVwiOiBcImR1ZURhdGVcIixcclxuXHRcdFx0XCLwn5urXCI6IFwic3RhcnREYXRlXCIsXHJcblx0XHRcdFwi4o+zXCI6IFwic2NoZWR1bGVkRGF0ZVwiLFxyXG5cdFx0XHRcIuKchVwiOiBcImNvbXBsZXRlZERhdGVcIixcclxuXHRcdFx0XCLinYxcIjogXCJjYW5jZWxsZWREYXRlXCIsXHJcblx0XHRcdFwi4p6VXCI6IFwiY3JlYXRlZERhdGVcIixcclxuXHRcdFx0XCLwn5SBXCI6IFwicmVjdXJyZW5jZVwiLFxyXG5cdFx0XHRcIvCfj4FcIjogXCJvbkNvbXBsZXRpb25cIixcclxuXHRcdFx0XCLim5RcIjogXCJkZXBlbmRzT25cIixcclxuXHRcdFx0XCLwn4aUXCI6IFwiaWRcIixcclxuXHRcdFx0XCLwn5S6XCI6IFwicHJpb3JpdHlcIixcclxuXHRcdFx0XCLij6tcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcIvCflLxcIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcIvCflL1cIjogXCJwcmlvcml0eVwiLFxyXG5cdFx0XHRcIuKPrFwiOiBcInByaW9yaXR5XCIsXHJcblx0XHR9LFxyXG5cclxuXHRcdC8vIFNwZWNpYWwgdGFnIHByZWZpeGVzIGZvciBwcm9qZWN0L2NvbnRleHQvYXJlYSAobm93IGNvbmZpZ3VyYWJsZSlcclxuXHRcdC8vIE9ubHkgaW5jbHVkZSB0aGUgY29uZmlndXJlZCBwcmVmaXhlcywgYXZvaWQgZGVmYXVsdCBmYWxsYmFja3MgdG8gcHJldmVudCBjb25mbGljdHNcclxuXHRcdHNwZWNpYWxUYWdQcmVmaXhlczogKCgpID0+IHtcclxuXHRcdFx0Y29uc3QgcHJlZml4ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuXHRcdFx0XHJcblx0XHRcdC8vIE9ubHkgYWRkIGNvbmZpZ3VyZWQgcHJlZml4ZXMsIHdpdGggY2FzZS1pbnNlbnNpdGl2ZSBzdXBwb3J0XHJcblx0XHRcdGlmIChwcm9qZWN0UHJlZml4KSB7XHJcblx0XHRcdFx0cHJlZml4ZXNbcHJvamVjdFByZWZpeF0gPSBcInByb2plY3RcIjtcclxuXHRcdFx0XHRwcmVmaXhlc1tTdHJpbmcocHJvamVjdFByZWZpeCkudG9Mb3dlckNhc2UoKV0gPSBcInByb2plY3RcIjtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoYXJlYVByZWZpeCkge1xyXG5cdFx0XHRcdHByZWZpeGVzW2FyZWFQcmVmaXhdID0gXCJhcmVhXCI7XHJcblx0XHRcdFx0cHJlZml4ZXNbU3RyaW5nKGFyZWFQcmVmaXgpLnRvTG93ZXJDYXNlKCldID0gXCJhcmVhXCI7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKGNvbnRleHRQcmVmaXgpIHtcclxuXHRcdFx0XHRwcmVmaXhlc1tjb250ZXh0UHJlZml4XSA9IFwiY29udGV4dFwiO1xyXG5cdFx0XHRcdHByZWZpeGVzW1N0cmluZyhjb250ZXh0UHJlZml4KS50b0xvd2VyQ2FzZSgpXSA9IFwiY29udGV4dFwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdFxyXG5cdFx0XHRyZXR1cm4gcHJlZml4ZXM7XHJcblx0XHR9KSgpLFxyXG5cclxuXHRcdC8vIFBlcmZvcm1hbmNlIGFuZCBwYXJzaW5nIGxpbWl0c1xyXG5cdFx0bWF4UGFyc2VJdGVyYXRpb25zOiA0MDAwLFxyXG5cdFx0bWF4TWV0YWRhdGFJdGVyYXRpb25zOiA0MDAsXHJcblx0XHRtYXhUYWdMZW5ndGg6IDEwMCxcclxuXHRcdG1heEVtb2ppVmFsdWVMZW5ndGg6IDIwMCxcclxuXHRcdG1heFN0YWNrT3BlcmF0aW9uczogNDAwMCxcclxuXHRcdG1heFN0YWNrU2l6ZTogMTAwMCxcclxuXHRcdG1heEluZGVudFNpemU6IDgsXHJcblxyXG5cdFx0Ly8gRW5oYW5jZWQgcHJvamVjdCBjb25maWd1cmF0aW9uXHJcblx0XHRwcm9qZWN0Q29uZmlnOiBwbHVnaW4/LnNldHRpbmdzPy5wcm9qZWN0Q29uZmlnPy5lbmFibGVFbmhhbmNlZFByb2plY3RcclxuXHRcdFx0PyBwbHVnaW4/LnNldHRpbmdzPy5wcm9qZWN0Q29uZmlnXHJcblx0XHRcdDogdW5kZWZpbmVkLFxyXG5cclxuXHRcdC8vIEZpbGUgTWV0YWRhdGEgSW5oZXJpdGFuY2VcclxuXHRcdGZpbGVNZXRhZGF0YUluaGVyaXRhbmNlOiBwbHVnaW4/LnNldHRpbmdzPy5maWxlTWV0YWRhdGFJbmhlcml0YW5jZSxcclxuXHJcblx0XHQvLyBDdXN0b20gZGF0ZSBmb3JtYXRzIGZvciBwYXJzaW5nXHJcblx0XHRjdXN0b21EYXRlRm9ybWF0czogcGx1Z2luPy5zZXR0aW5ncz8uZW5hYmxlQ3VzdG9tRGF0ZUZvcm1hdHNcclxuXHRcdFx0PyBwbHVnaW4/LnNldHRpbmdzPy5jdXN0b21EYXRlRm9ybWF0c1xyXG5cdFx0XHQ6IHVuZGVmaW5lZCxcclxuXHR9O1xyXG5cclxuXHRyZXR1cm4gY29uZmlnO1xyXG59O1xyXG4iXX0=