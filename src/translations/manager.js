import { moment } from "obsidian";
// Import all locale files
// import ar from "./locale/ar";
// import cz from "./locale/cz";
// import da from "./locale/da";
// import de from "./locale/de";
import en from "./locale/en";
import enGB from "./locale/en-gb";
// import es from "./locale/es";
// import fr from "./locale/fr";
// import hi from "./locale/hi";
// import id from "./locale/id";
// import it from "./locale/it";
import ja from "./locale/ja";
// import ko from "./locale/ko";
// import nl from "./locale/nl";
// import no from "./locale/no";
// import pl from "./locale/pl";
// import pt from "./locale/pt";
import ptBR from "./locale/pt-br";
// import ro from "./locale/ro";
import ru from "./locale/ru";
import uk from "./locale/uk";
// import tr from "./locale/tr";
import zhCN from "./locale/zh-cn";
import zhTW from "./locale/zh-tw";
// Define supported locales map
const SUPPORTED_LOCALES = {
    // ar,
    // cs: cz,
    // da,
    // de,
    en,
    "en-gb": enGB,
    // es,
    // fr,
    // hi,
    // id,
    // it,
    ja,
    // ko,
    // // nl,
    // // nn: no,
    // // pl,
    // // pt,
    "pt-br": ptBR,
    // ro,
    ru,
    // tr,
    uk,
    "zh-cn": zhCN,
    "zh-tw": zhTW,
};
class TranslationManager {
    constructor() {
        this.currentLocale = "en";
        this.translations = new Map();
        this.fallbackTranslation = en;
        this.lowercaseKeyMap = new Map();
        // Handle test environment where moment might not be properly mocked
        try {
            this.currentLocale = moment.locale();
        }
        catch (error) {
            this.currentLocale = "en"; // fallback for test environment
        }
        // Initialize with all supported translations
        Object.entries(SUPPORTED_LOCALES).forEach(([locale, translations]) => {
            this.translations.set(locale, translations);
            // Create lowercase key mapping for each locale
            const lowercaseMap = new Map();
            Object.keys(translations).forEach((key) => {
                lowercaseMap.set(key.toLowerCase(), key);
            });
            this.lowercaseKeyMap.set(locale, lowercaseMap);
        });
    }
    static getInstance() {
        if (!TranslationManager.instance) {
            TranslationManager.instance = new TranslationManager();
        }
        return TranslationManager.instance;
    }
    setLocale(locale) {
        if (locale in SUPPORTED_LOCALES) {
            this.currentLocale = locale;
        }
        else {
            // Silently fall back to English for unsupported locales
            this.currentLocale = "en";
        }
    }
    getSupportedLocales() {
        return Object.keys(SUPPORTED_LOCALES);
    }
    t(key, options) {
        const translation = this.translations.get(this.currentLocale) ||
            this.fallbackTranslation;
        // Try to get the exact match first
        let result = this.getNestedValue(translation, key);
        // If not found, try case-insensitive match
        if (!result) {
            const lowercaseKey = key.toLowerCase();
            const lowercaseMap = this.lowercaseKeyMap.get(this.currentLocale);
            const originalKey = lowercaseMap === null || lowercaseMap === void 0 ? void 0 : lowercaseMap.get(lowercaseKey);
            if (originalKey) {
                result = this.getNestedValue(translation, originalKey);
            }
        }
        // If still not found, use fallback
        if (!result) {
            // Silently fall back to English translation
            // Try exact match in fallback
            result = this.getNestedValue(this.fallbackTranslation, key);
            // Try case-insensitive match in fallback
            if (!result) {
                const lowercaseKey = key.toLowerCase();
                const lowercaseMap = this.lowercaseKeyMap.get("en");
                const originalKey = lowercaseMap === null || lowercaseMap === void 0 ? void 0 : lowercaseMap.get(lowercaseKey);
                if (originalKey) {
                    result = this.getNestedValue(this.fallbackTranslation, originalKey);
                }
                else {
                    result = key;
                }
            }
        }
        if (options === null || options === void 0 ? void 0 : options.interpolation) {
            result = this.interpolate(result, options.interpolation);
        }
        // Remove leading/trailing quotes if present
        result = result.replace(/^["""']|["""']$/g, "");
        return result;
    }
    getNestedValue(obj, path) {
        // Don't split by dots since some translation keys contain dots
        return obj[path];
    }
    interpolate(text, values) {
        return text.replace(/\{\{(\w+)\}\}/g, (_, key) => { var _a; return ((_a = values[key]) === null || _a === void 0 ? void 0 : _a.toString()) || `{{${key}}}`; });
    }
}
export const translationManager = TranslationManager.getInstance();
export const t = (key, options) => translationManager.t(key, options);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUdsQywwQkFBMEI7QUFDMUIsZ0NBQWdDO0FBQ2hDLGdDQUFnQztBQUNoQyxnQ0FBZ0M7QUFDaEMsZ0NBQWdDO0FBQ2hDLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM3QixPQUFPLElBQUksTUFBTSxnQkFBZ0IsQ0FBQztBQUNsQyxnQ0FBZ0M7QUFDaEMsZ0NBQWdDO0FBQ2hDLGdDQUFnQztBQUNoQyxnQ0FBZ0M7QUFDaEMsZ0NBQWdDO0FBQ2hDLE9BQU8sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUM3QixnQ0FBZ0M7QUFDaEMsZ0NBQWdDO0FBQ2hDLGdDQUFnQztBQUNoQyxnQ0FBZ0M7QUFDaEMsZ0NBQWdDO0FBQ2hDLE9BQU8sSUFBSSxNQUFNLGdCQUFnQixDQUFDO0FBQ2xDLGdDQUFnQztBQUNoQyxPQUFPLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDN0IsT0FBTyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQzdCLGdDQUFnQztBQUNoQyxPQUFPLElBQUksTUFBTSxnQkFBZ0IsQ0FBQztBQUNsQyxPQUFPLElBQUksTUFBTSxnQkFBZ0IsQ0FBQztBQUVsQywrQkFBK0I7QUFDL0IsTUFBTSxpQkFBaUIsR0FBRztJQUN6QixNQUFNO0lBQ04sVUFBVTtJQUNWLE1BQU07SUFDTixNQUFNO0lBQ04sRUFBRTtJQUNGLE9BQU8sRUFBRSxJQUFJO0lBQ2IsTUFBTTtJQUNOLE1BQU07SUFDTixNQUFNO0lBQ04sTUFBTTtJQUNOLE1BQU07SUFDTixFQUFFO0lBQ0YsTUFBTTtJQUNOLFNBQVM7SUFDVCxhQUFhO0lBQ2IsU0FBUztJQUNULFNBQVM7SUFDVCxPQUFPLEVBQUUsSUFBSTtJQUNiLE1BQU07SUFDTixFQUFFO0lBQ0YsTUFBTTtJQUNOLEVBQUU7SUFDRixPQUFP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RUFBRSxXQUFDLE9BQUEsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxHQUFHLENBQUMsMENBQUUsUUFBUSxFQUFFLEtBQUksS0FBSyxHQUFHLElBQUksQ0FBQSxFQUFBLENBQ25ELENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNuRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFtQixFQUFFLE9BQTRCLEVBQVUsRUFBRSxDQUM5RSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbW9tZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB0eXBlIHsgVHJhbnNsYXRpb24sIFRyYW5zbGF0aW9uS2V5LCBUcmFuc2xhdGlvbk9wdGlvbnMgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5cclxuLy8gSW1wb3J0IGFsbCBsb2NhbGUgZmlsZXNcclxuLy8gaW1wb3J0IGFyIGZyb20gXCIuL2xvY2FsZS9hclwiO1xyXG4vLyBpbXBvcnQgY3ogZnJvbSBcIi4vbG9jYWxlL2N6XCI7XHJcbi8vIGltcG9ydCBkYSBmcm9tIFwiLi9sb2NhbGUvZGFcIjtcclxuLy8gaW1wb3J0IGRlIGZyb20gXCIuL2xvY2FsZS9kZVwiO1xyXG5pbXBvcnQgZW4gZnJvbSBcIi4vbG9jYWxlL2VuXCI7XHJcbmltcG9ydCBlbkdCIGZyb20gXCIuL2xvY2FsZS9lbi1nYlwiO1xyXG4vLyBpbXBvcnQgZXMgZnJvbSBcIi4vbG9jYWxlL2VzXCI7XHJcbi8vIGltcG9ydCBmciBmcm9tIFwiLi9sb2NhbGUvZnJcIjtcclxuLy8gaW1wb3J0IGhpIGZyb20gXCIuL2xvY2FsZS9oaVwiO1xyXG4vLyBpbXBvcnQgaWQgZnJvbSBcIi4vbG9jYWxlL2lkXCI7XHJcbi8vIGltcG9ydCBpdCBmcm9tIFwiLi9sb2NhbGUvaXRcIjtcclxuaW1wb3J0IGphIGZyb20gXCIuL2xvY2FsZS9qYVwiO1xyXG4vLyBpbXBvcnQga28gZnJvbSBcIi4vbG9jYWxlL2tvXCI7XHJcbi8vIGltcG9ydCBubCBmcm9tIFwiLi9sb2NhbGUvbmxcIjtcclxuLy8gaW1wb3J0IG5vIGZyb20gXCIuL2xvY2FsZS9ub1wiO1xyXG4vLyBpbXBvcnQgcGwgZnJvbSBcIi4vbG9jYWxlL3BsXCI7XHJcbi8vIGltcG9ydCBwdCBmcm9tIFwiLi9sb2NhbGUvcHRcIjtcclxuaW1wb3J0IHB0QlIgZnJvbSBcIi4vbG9jYWxlL3B0LWJyXCI7XHJcbi8vIGltcG9ydCBybyBmcm9tIFwiLi9sb2NhbGUvcm9cIjtcclxuaW1wb3J0IHJ1IGZyb20gXCIuL2xvY2FsZS9ydVwiO1xyXG5pbXBvcnQgdWsgZnJvbSBcIi4vbG9jYWxlL3VrXCI7XHJcbi8vIGltcG9ydCB0ciBmcm9tIFwiLi9sb2NhbGUvdHJcIjtcclxuaW1wb3J0IHpoQ04gZnJvbSBcIi4vbG9jYWxlL3poLWNuXCI7XHJcbmltcG9ydCB6aFRXIGZyb20gXCIuL2xvY2FsZS96aC10d1wiO1xyXG5cclxuLy8gRGVmaW5lIHN1cHBvcnRlZCBsb2NhbGVzIG1hcFxyXG5jb25zdCBTVVBQT1JURURfTE9DQUxFUyA9IHtcclxuXHQvLyBhcixcclxuXHQvLyBjczogY3osXHJcblx0Ly8gZGEsXHJcblx0Ly8gZGUsXHJcblx0ZW4sXHJcblx0XCJlbi1nYlwiOiBlbkdCLFxyXG5cdC8vIGVzLFxyXG5cdC8vIGZyLFxyXG5cdC8vIGhpLFxyXG5cdC8vIGlkLFxyXG5cdC8vIGl0LFxyXG5cdGphLFxyXG5cdC8vIGtvLFxyXG5cdC8vIC8vIG5sLFxyXG5cdC8vIC8vIG5uOiBubyxcclxuXHQvLyAvLyBwbCxcclxuXHQvLyAvLyBwdCxcclxuXHRcInB0LWJyXCI6IHB0QlIsXHJcblx0Ly8gcm8sXHJcblx0cnUsXHJcblx0Ly8gdHIsXHJcblx0dWssXHJcblx0XCJ6aC1jblwiOiB6aENOLFxyXG5cdFwiemgtdHdcIjogemhUVyxcclxufSBhcyBjb25zdDtcclxuXHJcbmV4cG9ydCB0eXBlIFN1cHBvcnRlZExvY2FsZSA9IGtleW9mIHR5cGVvZiBTVVBQT1JURURfTE9DQUxFUztcclxuXHJcbmNsYXNzIFRyYW5zbGF0aW9uTWFuYWdlciB7XHJcblx0cHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IFRyYW5zbGF0aW9uTWFuYWdlcjtcclxuXHRwcml2YXRlIGN1cnJlbnRMb2NhbGU6IHN0cmluZyA9IFwiZW5cIjtcclxuXHRwcml2YXRlIHRyYW5zbGF0aW9uczogTWFwPHN0cmluZywgVHJhbnNsYXRpb24+ID0gbmV3IE1hcCgpO1xyXG5cdHByaXZhdGUgZmFsbGJhY2tUcmFuc2xhdGlvbjogVHJhbnNsYXRpb24gPSBlbjtcclxuXHRwcml2YXRlIGxvd2VyY2FzZUtleU1hcDogTWFwPHN0cmluZywgTWFwPHN0cmluZywgc3RyaW5nPj4gPSBuZXcgTWFwKCk7XHJcblxyXG5cdHByaXZhdGUgY29uc3RydWN0b3IoKSB7XHJcblx0XHQvLyBIYW5kbGUgdGVzdCBlbnZpcm9ubWVudCB3aGVyZSBtb21lbnQgbWlnaHQgbm90IGJlIHByb3Blcmx5IG1vY2tlZFxyXG5cdFx0dHJ5IHtcclxuXHRcdFx0dGhpcy5jdXJyZW50TG9jYWxlID0gbW9tZW50LmxvY2FsZSgpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50TG9jYWxlID0gXCJlblwiOyAvLyBmYWxsYmFjayBmb3IgdGVzdCBlbnZpcm9ubWVudFxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEluaXRpYWxpemUgd2l0aCBhbGwgc3VwcG9ydGVkIHRyYW5zbGF0aW9uc1xyXG5cdFx0T2JqZWN0LmVudHJpZXMoU1VQUE9SVEVEX0xPQ0FMRVMpLmZvckVhY2goKFtsb2NhbGUsIHRyYW5zbGF0aW9uc10pID0+IHtcclxuXHRcdFx0dGhpcy50cmFuc2xhdGlvbnMuc2V0KGxvY2FsZSwgdHJhbnNsYXRpb25zIGFzIFRyYW5zbGF0aW9uKTtcclxuXHJcblx0XHRcdC8vIENyZWF0ZSBsb3dlcmNhc2Uga2V5IG1hcHBpbmcgZm9yIGVhY2ggbG9jYWxlXHJcblx0XHRcdGNvbnN0IGxvd2VyY2FzZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XHJcblx0XHRcdE9iamVjdC5rZXlzKHRyYW5zbGF0aW9ucykuZm9yRWFjaCgoa2V5KSA9PiB7XHJcblx0XHRcdFx0bG93ZXJjYXNlTWFwLnNldChrZXkudG9Mb3dlckNhc2UoKSwga2V5KTtcclxuXHRcdFx0fSk7XHJcblx0XHRcdHRoaXMubG93ZXJjYXNlS2V5TWFwLnNldChsb2NhbGUsIGxvd2VyY2FzZU1hcCk7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogVHJhbnNsYXRpb25NYW5hZ2VyIHtcclxuXHRcdGlmICghVHJhbnNsYXRpb25NYW5hZ2VyLmluc3RhbmNlKSB7XHJcblx0XHRcdFRyYW5zbGF0aW9uTWFuYWdlci5pbnN0YW5jZSA9IG5ldyBUcmFuc2xhdGlvbk1hbmFnZXIoKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBUcmFuc2xhdGlvbk1hbmFnZXIuaW5zdGFuY2U7XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgc2V0TG9jYWxlKGxvY2FsZTogc3RyaW5nKTogdm9pZCB7XHJcblx0XHRpZiAobG9jYWxlIGluIFNVUFBPUlRFRF9MT0NBTEVTKSB7XHJcblx0XHRcdHRoaXMuY3VycmVudExvY2FsZSA9IGxvY2FsZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFNpbGVudGx5IGZhbGwgYmFjayB0byBFbmdsaXNoIGZvciB1bnN1cHBvcnRlZCBsb2NhbGVzXHJcblx0XHRcdHRoaXMuY3VycmVudExvY2FsZSA9IFwiZW5cIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHB1YmxpYyBnZXRTdXBwb3J0ZWRMb2NhbGVzKCk6IFN1cHBvcnRlZExvY2FsZVtdIHtcclxuXHRcdHJldHVybiBPYmplY3Qua2V5cyhTVVBQT1JURURfTE9DQUxFUykgYXMgU3VwcG9ydGVkTG9jYWxlW107XHJcblx0fVxyXG5cclxuXHRwdWJsaWMgdChrZXk6IFRyYW5zbGF0aW9uS2V5LCBvcHRpb25zPzogVHJhbnNsYXRpb25PcHRpb25zKTogc3RyaW5nIHtcclxuXHRcdGNvbnN0IHRyYW5zbGF0aW9uID1cclxuXHRcdFx0dGhpcy50cmFuc2xhdGlvbnMuZ2V0KHRoaXMuY3VycmVudExvY2FsZSkgfHxcclxuXHRcdFx0dGhpcy5mYWxsYmFja1RyYW5zbGF0aW9uO1xyXG5cclxuXHRcdC8vIFRyeSB0byBnZXQgdGhlIGV4YWN0IG1hdGNoIGZpcnN0XHJcblx0XHRsZXQgcmVzdWx0ID0gdGhpcy5nZXROZXN0ZWRWYWx1ZSh0cmFuc2xhdGlvbiwga2V5KTtcclxuXHJcblx0XHQvLyBJZiBub3QgZm91bmQsIHRyeSBjYXNlLWluc2Vuc2l0aXZlIG1hdGNoXHJcblx0XHRpZiAoIXJlc3VsdCkge1xyXG5cdFx0XHRjb25zdCBsb3dlcmNhc2VLZXkgPSBrZXkudG9Mb3dlckNhc2UoKTtcclxuXHRcdFx0Y29uc3QgbG93ZXJjYXNlTWFwID0gdGhpcy5sb3dlcmNhc2VLZXlNYXAuZ2V0KHRoaXMuY3VycmVudExvY2FsZSk7XHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsS2V5ID0gbG93ZXJjYXNlTWFwPy5nZXQobG93ZXJjYXNlS2V5KTtcclxuXHJcblx0XHRcdGlmIChvcmlnaW5hbEtleSkge1xyXG5cdFx0XHRcdHJlc3VsdCA9IHRoaXMuZ2V0TmVzdGVkVmFsdWUodHJhbnNsYXRpb24sIG9yaWdpbmFsS2V5KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdC8vIElmIHN0aWxsIG5vdCBmb3VuZCwgdXNlIGZhbGxiYWNrXHJcblx0XHRpZiAoIXJlc3VsdCkge1xyXG5cdFx0XHQvLyBTaWxlbnRseSBmYWxsIGJhY2sgdG8gRW5nbGlzaCB0cmFuc2xhdGlvblxyXG5cdFx0XHQvLyBUcnkgZXhhY3QgbWF0Y2ggaW4gZmFsbGJhY2tcclxuXHRcdFx0cmVzdWx0ID0gdGhpcy5nZXROZXN0ZWRWYWx1ZSh0aGlzLmZhbGxiYWNrVHJhbnNsYXRpb24sIGtleSk7XHJcblxyXG5cdFx0XHQvLyBUcnkgY2FzZS1pbnNlbnNpdGl2ZSBtYXRjaCBpbiBmYWxsYmFja1xyXG5cdFx0XHRpZiAoIXJlc3VsdCkge1xyXG5cdFx0XHRcdGNvbnN0IGxvd2VyY2FzZUtleSA9IGtleS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdGNvbnN0IGxvd2VyY2FzZU1hcCA9IHRoaXMubG93ZXJjYXNlS2V5TWFwLmdldChcImVuXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG9yaWdpbmFsS2V5ID0gbG93ZXJjYXNlTWFwPy5nZXQobG93ZXJjYXNlS2V5KTtcclxuXHJcblx0XHRcdFx0aWYgKG9yaWdpbmFsS2V5KSB7XHJcblx0XHRcdFx0XHRyZXN1bHQgPSB0aGlzLmdldE5lc3RlZFZhbHVlKFxyXG5cdFx0XHRcdFx0XHR0aGlzLmZhbGxiYWNrVHJhbnNsYXRpb24sXHJcblx0XHRcdFx0XHRcdG9yaWdpbmFsS2V5XHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRyZXN1bHQgPSBrZXk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKG9wdGlvbnM/LmludGVycG9sYXRpb24pIHtcclxuXHRcdFx0cmVzdWx0ID0gdGhpcy5pbnRlcnBvbGF0ZShyZXN1bHQsIG9wdGlvbnMuaW50ZXJwb2xhdGlvbik7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgcXVvdGVzIGlmIHByZXNlbnRcclxuXHRcdHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKC9eW1wiXCJcIiddfFtcIlwiXCInXSQvZywgXCJcIik7XHJcblxyXG5cdFx0cmV0dXJuIHJlc3VsdDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZ2V0TmVzdGVkVmFsdWUob2JqOiBUcmFuc2xhdGlvbiwgcGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuXHRcdC8vIERvbid0IHNwbGl0IGJ5IGRvdHMgc2luY2Ugc29tZSB0cmFuc2xhdGlvbiBrZXlzIGNvbnRhaW4gZG90c1xyXG5cdFx0cmV0dXJuIG9ialtwYXRoXSBhcyBzdHJpbmc7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGludGVycG9sYXRlKFxyXG5cdFx0dGV4dDogc3RyaW5nLFxyXG5cdFx0dmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudW1iZXI+XHJcblx0KTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0ZXh0LnJlcGxhY2UoXHJcblx0XHRcdC9cXHtcXHsoXFx3KylcXH1cXH0vZyxcclxuXHRcdFx0KF8sIGtleSkgPT4gdmFsdWVzW2tleV0/LnRvU3RyaW5nKCkgfHwgYHt7JHtrZXl9fX1gXHJcblx0XHQpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHRyYW5zbGF0aW9uTWFuYWdlciA9IFRyYW5zbGF0aW9uTWFuYWdlci5nZXRJbnN0YW5jZSgpO1xyXG5leHBvcnQgY29uc3QgdCA9IChrZXk6IFRyYW5zbGF0aW9uS2V5LCBvcHRpb25zPzogVHJhbnNsYXRpb25PcHRpb25zKTogc3RyaW5nID0+XHJcblx0dHJhbnNsYXRpb25NYW5hZ2VyLnQoa2V5LCBvcHRpb25zKTtcclxuIl19