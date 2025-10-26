// Mock for Obsidian API
// Simple mock function implementation
function mockFn() {
    const fn = function () {
        return fn;
    };
    return fn;
}
export class App {
    constructor() {
        this.vault = {
            getMarkdownFiles: function () {
                return [];
            },
            read: function () {
                return Promise.resolve("");
            },
            create: function () {
                return Promise.resolve({});
            },
            modify: function () {
                return Promise.resolve({});
            },
            getConfig: function (key) {
                if (key === "tabSize")
                    return 4;
                if (key === "useTab")
                    return false;
                return null;
            },
            // Event system for vault
            _events: {},
            on: function (eventName, callback) {
                if (!this._events[eventName]) {
                    this._events[eventName] = [];
                }
                this._events[eventName].push(callback);
                return { unload: () => this.off(eventName, callback) };
            },
            off: function (eventName, callback) {
                if (this._events[eventName]) {
                    const index = this._events[eventName].indexOf(callback);
                    if (index > -1) {
                        this._events[eventName].splice(index, 1);
                    }
                }
            },
            trigger: function (eventName, ...args) {
                if (this._events[eventName]) {
                    this._events[eventName].forEach((callback) => callback(...args));
                }
            },
            getFileByPath: function (path) {
                // Mock implementation for getFileByPath
                return {
                    path: path,
                    name: path.split('/').pop() || path,
                    children: [], // For directory-like behavior
                };
            },
        };
        this.workspace = {
            getLeaf: function () {
                return {
                    openFile: function () { },
                };
            },
            getActiveFile: function () {
                return {
                    path: "mockFile.md",
                    // Add other TFile properties if necessary for the tests
                    name: "mockFile.md",
                    basename: "mockFile",
                    extension: "md",
                };
            },
            onLayoutReady: function (callback) {
                if (typeof callback === "function") {
                    callback();
                }
            },
        };
        this.fileManager = {
            generateMarkdownLink: function () {
                return "[[link]]";
            },
        };
        this.metadataCache = {
            getFileCache: function () {
                return {
                    headings: [],
                };
            },
        };
        this.plugins = {
            enabledPlugins: new Set(["obsidian-tasks-plugin"]),
            plugins: {
                "obsidian-tasks-plugin": {
                    api: {
                        getTasksFromFile: () => [],
                        getTaskAtLine: () => null,
                        updateTask: () => { },
                    },
                },
            },
        };
    }
}
export class Editor {
    constructor() {
        this.getValue = function () {
            return "";
        };
        this.setValue = function () { };
        this.replaceRange = function () { };
        this.getLine = function () {
            return "";
        };
        this.lineCount = function () {
            return 0;
        };
        this.getCursor = function () {
            return { line: 0, ch: 0 };
        };
        this.setCursor = function () { };
        this.getSelection = function () {
            return "";
        };
    }
}
export class TFile {
    constructor(path = "", name = "", parent = null) {
        this.path = path;
        this.name = name;
        this.parent = parent;
    }
}
export class Notice {
    constructor(message) {
        // Mock implementation
    }
}
export class MarkdownView {
    constructor() {
        this.editor = new Editor();
        this.file = new TFile();
    }
}
export class MarkdownFileInfo {
    constructor() {
        this.file = new TFile();
    }
}
export class FuzzySuggestModal {
    constructor(app) {
        this.app = app;
    }
    open() { }
    close() { }
    setPlaceholder() { }
    getItems() {
        return [];
    }
    getItemText() {
        return "";
    }
    renderSuggestion() { }
    onChooseItem() { }
    getSuggestions() {
        return [];
    }
}
export class SuggestModal {
    constructor(app) {
        this.app = app;
    }
    open() { }
    close() { }
    setPlaceholder() { }
    getSuggestions() {
        return Promise.resolve([]);
    }
    renderSuggestion() { }
    onChooseSuggestion() { }
}
export class MetadataCache {
    getFileCache() {
        return null;
    }
}
export class FuzzyMatch {
    constructor(item) {
        this.item = item;
        this.match = { score: 0, matches: [] };
    }
}
// Mock moment function and its methods
function momentFn(input) {
    // Parse the input to a Date object
    let date;
    if (input instanceof Date) {
        date = input;
    }
    else if (typeof input === "string") {
        date = new Date(input);
    }
    else if (typeof input === "number") {
        date = new Date(input);
    }
    else {
        date = new Date();
    }
    const mockMoment = {
        format: function (format) {
            if (format === "YYYY-MM-DD") {
                return date.toISOString().split("T")[0];
            }
            else if (format === "D") {
                return date.getDate().toString();
            }
            return date.toISOString().split("T")[0];
        },
        diff: function () {
            return 0;
        },
        startOf: function (unit) {
            return mockMoment;
        },
        endOf: function (unit) {
            return mockMoment;
        },
        isSame: function (other, unit) {
            if (other && other._date instanceof Date) {
                const thisDate = date.toISOString().split("T")[0];
                const otherDate = other._date.toISOString().split("T")[0];
                return thisDate === otherDate;
            }
            return true;
        },
        isSameOrBefore: function (other, unit) {
            return true;
        },
        isSameOrAfter: function (other, unit) {
            return true;
        },
        isBefore: function (other, unit) {
            return false;
        },
        isAfter: function (other, unit) {
            return false;
        },
        isBetween: function (start, end, unit, inclusivity) {
            return true;
        },
        clone: function () {
            return momentFn(date);
        },
        add: function (amount, unit) {
            return mockMoment;
        },
        subtract: function (amount, unit) {
            return mockMoment;
        },
        valueOf: function () {
            return date.getTime();
        },
        toDate: function () {
            return date;
        },
        weekday: function (day) {
            if (day !== undefined) {
                return mockMoment;
            }
            return 0;
        },
        day: function () {
            return date.getDay();
        },
        date: function () {
            return date.getDate();
        },
        _date: date,
    };
    return mockMoment;
}
// Add static methods to momentFn
momentFn.utc = function () {
    return {
        format: function () {
            return "00:00:00";
        },
    };
};
momentFn.duration = function () {
    return {
        asMilliseconds: function () {
            return 0;
        },
    };
};
momentFn.locale = function (locale) {
    if (locale) {
        momentFn._currentLocale = locale;
        return locale;
    }
    return momentFn._currentLocale || "en";
};
// Initialize default locale
momentFn._currentLocale = "en";
momentFn.weekdaysShort = function (localeData) {
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
};
momentFn.weekdaysMin = function (localeData) {
    return ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
};
momentFn.months = function () {
    return ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
};
momentFn.monthsShort = function () {
    return ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
};
export const moment = momentFn;
// Mock Component class
export class Component {
    constructor() {
        this.children = [];
        this.loaded = false;
        this._events = [];
    }
    addChild(component) {
        this.children.push(component);
        if (this.loaded) {
            component.load();
        }
        return component;
    }
    removeChild(component) {
        const index = this.children.indexOf(component);
        if (index !== -1) {
            this.children.splice(index, 1);
            component.unload();
        }
        return component;
    }
    load() {
        this.loaded = true;
        this.children.forEach((child) => child.load());
        this.onload();
    }
    unload() {
        this.loaded = false;
        this.children.forEach((child) => child.unload());
        this.onunload();
    }
    onload() {
        // Override in subclasses
    }
    onunload() {
        // Override in subclasses
    }
    registerDomEvent(el, type, listener) {
        // Mock implementation
        el.addEventListener(type, listener);
    }
    registerInterval(id) {
        // Mock implementation
        return id;
    }
    registerEvent(eventRef) {
        this._events.push(eventRef);
    }
}
export class Modal extends Component {
    constructor(app) {
        super();
        this.app = app;
        if (typeof document !== "undefined" && document.createElement) {
            this.modalEl = document.createElement("div");
            this.contentEl = document.createElement("div");
        }
        else {
            this.modalEl = {};
            this.contentEl = {};
        }
    }
    open() {
        this.onOpen();
    }
    close() {
        this.onClose();
    }
    onOpen() {
        // Override in subclasses
    }
    onClose() {
        // Override in subclasses
    }
}
// Mock other common Obsidian utilities
export function setIcon(el, iconId) {
    // Mock implementation
}
export function debounce(func, wait, immediate) {
    let timeout = null;
    return ((...args) => {
        const later = () => {
            timeout = null;
            if (!immediate)
                func(...args);
        };
        const callNow = immediate && !timeout;
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow)
            func(...args);
    });
}
// Mock EditorSuggest class
export class EditorSuggest extends Component {
    constructor(app) {
        super();
        this.app = app;
    }
    onTrigger(cursor, editor, file) {
        return null;
    }
    close() {
        // Mock implementation
    }
}
// Add any other Obsidian classes or functions needed for tests
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzaWRpYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJvYnNpZGlhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx3QkFBd0I7QUFFeEIsc0NBQXNDO0FBQ3RDLFNBQVMsTUFBTTtJQUNkLE1BQU0sRUFBRSxHQUFHO1FBQ1YsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDLENBQUM7SUFDRixPQUFPLEVBQUUsQ0FBQztBQUNYLENBQUM7QUFFRCxNQUFNLE9BQU8sR0FBRztJQUFoQjtRQUNDLFVBQUssR0FBRztZQUNQLGdCQUFnQixFQUFFO2dCQUNqQixPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUM7WUFDRCxJQUFJLEVBQUU7Z0JBQ0wsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFDRCxNQUFNLEVBQUU7Z0JBQ1AsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFDRCxNQUFNLEVBQUU7Z0JBQ1AsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVCLENBQUM7WUFDRCxTQUFTLEVBQUUsVUFBVSxHQUFXO2dCQUMvQixJQUFJLEdBQUcsS0FBSyxTQUFTO29CQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLEdBQUcsS0FBSyxRQUFRO29CQUFFLE9BQU8sS0FBSyxDQUFDO2dCQUNuQyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFDRCx5QkFBeUI7WUFDekIsT0FBTyxFQUFFLEVBQWdDO1lBQ3pDLEVBQUUsRUFBRSxVQUFVLFNBQWlCLEVBQUUsUUFBa0I7Z0JBQ2xELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFO29CQUM3QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztpQkFDN0I7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENB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QyxDQUFNLENBQUM7QUFDVCxDQUFDO0FBRUQsMkJBQTJCO0FBQzNCLE1BQU0sT0FBZ0IsYUFBaUIsU0FBUSxTQUFTO0lBR3ZELFlBQVksR0FBUTtRQUNuQixLQUFLLEVBQUUsQ0FBQztRQUNSLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ2hCLENBQUM7SUFNRCxTQUFTLENBQUMsTUFBVyxFQUFFLE1BQVcsRUFBRSxJQUFTO1FBQzVDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELEtBQUs7UUFDSixzQkFBc0I7SUFDdkIsQ0FBQztDQUNEO0FBRUQsK0RBQStEIiwic291cmNlc0NvbnRlbnQiOlsiLy8gTW9jayBmb3IgT2JzaWRpYW4gQVBJXHJcblxyXG4vLyBTaW1wbGUgbW9jayBmdW5jdGlvbiBpbXBsZW1lbnRhdGlvblxyXG5mdW5jdGlvbiBtb2NrRm4oKSB7XHJcblx0Y29uc3QgZm4gPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gZm47XHJcblx0fTtcclxuXHRyZXR1cm4gZm47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBcHAge1xyXG5cdHZhdWx0ID0ge1xyXG5cdFx0Z2V0TWFya2Rvd25GaWxlczogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gW107XHJcblx0XHR9LFxyXG5cdFx0cmVhZDogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFwiXCIpO1xyXG5cdFx0fSxcclxuXHRcdGNyZWF0ZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHt9KTtcclxuXHRcdH0sXHJcblx0XHRtb2RpZnk6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZSh7fSk7XHJcblx0XHR9LFxyXG5cdFx0Z2V0Q29uZmlnOiBmdW5jdGlvbiAoa2V5OiBzdHJpbmcpIHtcclxuXHRcdFx0aWYgKGtleSA9PT0gXCJ0YWJTaXplXCIpIHJldHVybiA0O1xyXG5cdFx0XHRpZiAoa2V5ID09PSBcInVzZVRhYlwiKSByZXR1cm4gZmFsc2U7XHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0fSxcclxuXHRcdC8vIEV2ZW50IHN5c3RlbSBmb3IgdmF1bHRcclxuXHRcdF9ldmVudHM6IHt9IGFzIFJlY29yZDxzdHJpbmcsIEZ1bmN0aW9uW10+LFxyXG5cdFx0b246IGZ1bmN0aW9uIChldmVudE5hbWU6IHN0cmluZywgY2FsbGJhY2s6IEZ1bmN0aW9uKSB7XHJcblx0XHRcdGlmICghdGhpcy5fZXZlbnRzW2V2ZW50TmFtZV0pIHtcclxuXHRcdFx0XHR0aGlzLl9ldmVudHNbZXZlbnROYW1lXSA9IFtdO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuX2V2ZW50c1tldmVudE5hbWVdLnB1c2goY2FsbGJhY2spO1xyXG5cdFx0XHRyZXR1cm4geyB1bmxvYWQ6ICgpID0+IHRoaXMub2ZmKGV2ZW50TmFtZSwgY2FsbGJhY2spIH07XHJcblx0XHR9LFxyXG5cdFx0b2ZmOiBmdW5jdGlvbiAoZXZlbnROYW1lOiBzdHJpbmcsIGNhbGxiYWNrOiBGdW5jdGlvbikge1xyXG5cdFx0XHRpZiAodGhpcy5fZXZlbnRzW2V2ZW50TmFtZV0pIHtcclxuXHRcdFx0XHRjb25zdCBpbmRleCA9IHRoaXMuX2V2ZW50c1tldmVudE5hbWVdLmluZGV4T2YoY2FsbGJhY2spO1xyXG5cdFx0XHRcdGlmIChpbmRleCA+IC0xKSB7XHJcblx0XHRcdFx0XHR0aGlzLl9ldmVudHNbZXZlbnROYW1lXS5zcGxpY2UoaW5kZXgsIDEpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fSxcclxuXHRcdHRyaWdnZXI6IGZ1bmN0aW9uIChldmVudE5hbWU6IHN0cmluZywgLi4uYXJnczogYW55W10pIHtcclxuXHRcdFx0aWYgKHRoaXMuX2V2ZW50c1tldmVudE5hbWVdKSB7XHJcblx0XHRcdFx0dGhpcy5fZXZlbnRzW2V2ZW50TmFtZV0uZm9yRWFjaCgoY2FsbGJhY2s6IGFueSkgPT4gY2FsbGJhY2soLi4uYXJncykpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdFx0Z2V0RmlsZUJ5UGF0aDogZnVuY3Rpb24gKHBhdGg6IHN0cmluZykge1xyXG5cdFx0XHQvLyBNb2NrIGltcGxlbWVudGF0aW9uIGZvciBnZXRGaWxlQnlQYXRoXHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0cGF0aDogcGF0aCxcclxuXHRcdFx0XHRuYW1lOiBwYXRoLnNwbGl0KCcvJykucG9wKCkgfHwgcGF0aCxcclxuXHRcdFx0XHRjaGlsZHJlbjogW10sIC8vIEZvciBkaXJlY3RvcnktbGlrZSBiZWhhdmlvclxyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHR9O1xyXG5cclxuXHR3b3Jrc3BhY2UgPSB7XHJcblx0XHRnZXRMZWFmOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0b3BlbkZpbGU6IGZ1bmN0aW9uICgpIHt9LFxyXG5cdFx0XHR9O1xyXG5cdFx0fSxcclxuXHJcblx0XHRnZXRBY3RpdmVGaWxlOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0cGF0aDogXCJtb2NrRmlsZS5tZFwiLFxyXG5cdFx0XHRcdC8vIEFkZCBvdGhlciBURmlsZSBwcm9wZXJ0aWVzIGlmIG5lY2Vzc2FyeSBmb3IgdGhlIHRlc3RzXHJcblx0XHRcdFx0bmFtZTogXCJtb2NrRmlsZS5tZFwiLFxyXG5cdFx0XHRcdGJhc2VuYW1lOiBcIm1vY2tGaWxlXCIsXHJcblx0XHRcdFx0ZXh0ZW5zaW9uOiBcIm1kXCIsXHJcblx0XHRcdH07XHJcblx0XHR9LFxyXG5cclxuXHRcdG9uTGF5b3V0UmVhZHk6IGZ1bmN0aW9uIChjYWxsYmFjazogKCkgPT4gdm9pZCkge1xyXG5cdFx0XHRpZiAodHlwZW9mIGNhbGxiYWNrID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0XHR9XHJcblx0XHR9LFxyXG5cdH07XHJcblxyXG5cdGZpbGVNYW5hZ2VyID0ge1xyXG5cdFx0Z2VuZXJhdGVNYXJrZG93bkxpbms6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIFwiW1tsaW5rXV1cIjtcclxuXHRcdH0sXHJcblx0fTtcclxuXHJcblx0bWV0YWRhdGFDYWNoZSA9IHtcclxuXHRcdGdldEZpbGVDYWNoZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGhlYWRpbmdzOiBbXSxcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0fTtcclxuXHJcblx0cGx1Z2lucyA9IHtcclxuXHRcdGVuYWJsZWRQbHVnaW5zOiBuZXcgU2V0KFtcIm9ic2lkaWFuLXRhc2tzLXBsdWdpblwiXSksXHJcblx0XHRwbHVnaW5zOiB7XHJcblx0XHRcdFwib2JzaWRpYW4tdGFza3MtcGx1Z2luXCI6IHtcclxuXHRcdFx0XHRhcGk6IHtcclxuXHRcdFx0XHRcdGdldFRhc2tzRnJvbUZpbGU6ICgpID0+IFtdLFxyXG5cdFx0XHRcdFx0Z2V0VGFza0F0TGluZTogKCkgPT4gbnVsbCxcclxuXHRcdFx0XHRcdHVwZGF0ZVRhc2s6ICgpID0+IHt9LFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdH07XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFZGl0b3Ige1xyXG5cdGdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIFwiXCI7XHJcblx0fTtcclxuXHRzZXRWYWx1ZSA9IGZ1bmN0aW9uICgpIHt9O1xyXG5cdHJlcGxhY2VSYW5nZSA9IGZ1bmN0aW9uICgpIHt9O1xyXG5cdGdldExpbmUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRyZXR1cm4gXCJcIjtcclxuXHR9O1xyXG5cdGxpbmVDb3VudCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiAwO1xyXG5cdH07XHJcblx0Z2V0Q3Vyc29yID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0cmV0dXJuIHsgbGluZTogMCwgY2g6IDAgfTtcclxuXHR9O1xyXG5cdHNldEN1cnNvciA9IGZ1bmN0aW9uICgpIHt9O1xyXG5cdGdldFNlbGVjdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdHJldHVybiBcIlwiO1xyXG5cdH07XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBURmlsZSB7XHJcblx0cGF0aDogc3RyaW5nO1xyXG5cdG5hbWU6IHN0cmluZztcclxuXHRwYXJlbnQ6IGFueTtcclxuXHJcblx0Y29uc3RydWN0b3IocGF0aCA9IFwiXCIsIG5hbWUgPSBcIlwiLCBwYXJlbnQgPSBudWxsKSB7XHJcblx0XHR0aGlzLnBhdGggPSBwYXRoO1xyXG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcclxuXHRcdHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE5vdGljZSB7XHJcblx0Y29uc3RydWN0b3IobWVzc2FnZTogc3RyaW5nKSB7XHJcblx0XHQvLyBNb2NrIGltcGxlbWVudGF0aW9uXHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWFya2Rvd25WaWV3IHtcclxuXHRlZGl0b3I6IEVkaXRvcjtcclxuXHRmaWxlOiBURmlsZTtcclxuXHJcblx0Y29uc3RydWN0b3IoKSB7XHJcblx0XHR0aGlzLmVkaXRvciA9IG5ldyBFZGl0b3IoKTtcclxuXHRcdHRoaXMuZmlsZSA9IG5ldyBURmlsZSgpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIE1hcmtkb3duRmlsZUluZm8ge1xyXG5cdGZpbGU6IFRGaWxlO1xyXG5cclxuXHRjb25zdHJ1Y3RvcigpIHtcclxuXHRcdHRoaXMuZmlsZSA9IG5ldyBURmlsZSgpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZ1enp5U3VnZ2VzdE1vZGFsPFQ+IHtcclxuXHRhcHA6IEFwcDtcclxuXHJcblx0Y29uc3RydWN0b3IoYXBwOiBBcHApIHtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdH1cclxuXHJcblx0b3BlbigpIHt9XHJcblx0Y2xvc2UoKSB7fVxyXG5cdHNldFBsYWNlaG9sZGVyKCkge31cclxuXHRnZXRJdGVtcygpIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcblx0Z2V0SXRlbVRleHQoKSB7XHJcblx0XHRyZXR1cm4gXCJcIjtcclxuXHR9XHJcblx0cmVuZGVyU3VnZ2VzdGlvbigpIHt9XHJcblx0b25DaG9vc2VJdGVtKCkge31cclxuXHRnZXRTdWdnZXN0aW9ucygpIHtcclxuXHRcdHJldHVybiBbXTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBTdWdnZXN0TW9kYWw8VD4ge1xyXG5cdGFwcDogQXBwO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCkge1xyXG5cdFx0dGhpcy5hcHAgPSBhcHA7XHJcblx0fVxyXG5cclxuXHRvcGVuKCkge31cclxuXHRjbG9zZSgpIHt9XHJcblx0c2V0UGxhY2Vob2xkZXIoKSB7fVxyXG5cdGdldFN1Z2dlc3Rpb25zKCkge1xyXG5cdFx0cmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XHJcblx0fVxyXG5cdHJlbmRlclN1Z2dlc3Rpb24oKSB7fVxyXG5cdG9uQ2hvb3NlU3VnZ2VzdGlvbigpIHt9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBNZXRhZGF0YUNhY2hlIHtcclxuXHRnZXRGaWxlQ2FjaGUoKSB7XHJcblx0XHRyZXR1cm4gbnVsbDtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGdXp6eU1hdGNoPFQ+IHtcclxuXHRpdGVtOiBUO1xyXG5cdG1hdGNoOiB7IHNjb3JlOiBudW1iZXI7IG1hdGNoZXM6IGFueVtdIH07XHJcblxyXG5cdGNvbnN0cnVjdG9yKGl0ZW06IFQpIHtcclxuXHRcdHRoaXMuaXRlbSA9IGl0ZW07XHJcblx0XHR0aGlzLm1hdGNoID0geyBzY29yZTogMCwgbWF0Y2hlczogW10gfTtcclxuXHR9XHJcbn1cclxuXHJcbi8vIE1vY2sgbW9tZW50IGZ1bmN0aW9uIGFuZCBpdHMgbWV0aG9kc1xyXG5mdW5jdGlvbiBtb21lbnRGbihpbnB1dD86IGFueSkge1xyXG5cdC8vIFBhcnNlIHRoZSBpbnB1dCB0byBhIERhdGUgb2JqZWN0XHJcblx0bGV0IGRhdGU6IERhdGU7XHJcblx0aWYgKGlucHV0IGluc3RhbmNlb2YgRGF0ZSkge1xyXG5cdFx0ZGF0ZSA9IGlucHV0O1xyXG5cdH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSBcInN0cmluZ1wiKSB7XHJcblx0XHRkYXRlID0gbmV3IERhdGUoaW5wdXQpO1xyXG5cdH0gZWxzZSBpZiAodHlwZW9mIGlucHV0ID09PSBcIm51bWJlclwiKSB7XHJcblx0XHRkYXRlID0gbmV3IERhdGUoaW5wdXQpO1xyXG5cdH0gZWxzZSB7XHJcblx0XHRkYXRlID0gbmV3IERhdGUoKTtcclxuXHR9XHJcblxyXG5cdGNvbnN0IG1vY2tNb21lbnQgPSB7XHJcblx0XHRmb3JtYXQ6IGZ1bmN0aW9uIChmb3JtYXQ/OiBzdHJpbmcpIHtcclxuXHRcdFx0aWYgKGZvcm1hdCA9PT0gXCJZWVlZLU1NLUREXCIpIHtcclxuXHRcdFx0XHRyZXR1cm4gZGF0ZS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTtcclxuXHRcdFx0fSBlbHNlIGlmIChmb3JtYXQgPT09IFwiRFwiKSB7XHJcblx0XHRcdFx0cmV0dXJuIGRhdGUuZ2V0RGF0ZSgpLnRvU3RyaW5nKCk7XHJcblx0XHRcdH1cclxuXHRcdFx0cmV0dXJuIGRhdGUudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcblx0XHR9LFxyXG5cdFx0ZGlmZjogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gMDtcclxuXHRcdH0sXHJcblx0XHRzdGFydE9mOiBmdW5jdGlvbiAodW5pdDogc3RyaW5nKSB7XHJcblx0XHRcdHJldHVybiBtb2NrTW9tZW50O1xyXG5cdFx0fSxcclxuXHRcdGVuZE9mOiBmdW5jdGlvbiAodW5pdDogc3RyaW5nKSB7XHJcblx0XHRcdHJldHVybiBtb2NrTW9tZW50O1xyXG5cdFx0fSxcclxuXHRcdGlzU2FtZTogZnVuY3Rpb24gKG90aGVyOiBhbnksIHVuaXQ/OiBzdHJpbmcpIHtcclxuXHRcdFx0aWYgKG90aGVyICYmIG90aGVyLl9kYXRlIGluc3RhbmNlb2YgRGF0ZSkge1xyXG5cdFx0XHRcdGNvbnN0IHRoaXNEYXRlID0gZGF0ZS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTtcclxuXHRcdFx0XHRjb25zdCBvdGhlckRhdGUgPSBvdGhlci5fZGF0ZS50b0lTT1N0cmluZygpLnNwbGl0KFwiVFwiKVswXTtcclxuXHRcdFx0XHRyZXR1cm4gdGhpc0RhdGUgPT09IG90aGVyRGF0ZTtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gdHJ1ZTtcclxuXHRcdH0sXHJcblx0XHRpc1NhbWVPckJlZm9yZTogZnVuY3Rpb24gKG90aGVyOiBhbnksIHVuaXQ/OiBzdHJpbmcpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9LFxyXG5cdFx0aXNTYW1lT3JBZnRlcjogZnVuY3Rpb24gKG90aGVyOiBhbnksIHVuaXQ/OiBzdHJpbmcpIHtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9LFxyXG5cdFx0aXNCZWZvcmU6IGZ1bmN0aW9uIChvdGhlcjogYW55LCB1bml0Pzogc3RyaW5nKSB7XHJcblx0XHRcdHJldHVybiBmYWxzZTtcclxuXHRcdH0sXHJcblx0XHRpc0FmdGVyOiBmdW5jdGlvbiAob3RoZXI6IGFueSwgdW5pdD86IHN0cmluZykge1xyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblx0XHR9LFxyXG5cdFx0aXNCZXR3ZWVuOiBmdW5jdGlvbiAoXHJcblx0XHRcdHN0YXJ0OiBhbnksXHJcblx0XHRcdGVuZDogYW55LFxyXG5cdFx0XHR1bml0Pzogc3RyaW5nLFxyXG5cdFx0XHRpbmNsdXNpdml0eT86IHN0cmluZ1xyXG5cdFx0KSB7XHJcblx0XHRcdHJldHVybiB0cnVlO1xyXG5cdFx0fSxcclxuXHRcdGNsb25lOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBtb21lbnRGbihkYXRlKTtcclxuXHRcdH0sXHJcblx0XHRhZGQ6IGZ1bmN0aW9uIChhbW91bnQ6IG51bWJlciwgdW5pdDogc3RyaW5nKSB7XHJcblx0XHRcdHJldHVybiBtb2NrTW9tZW50O1xyXG5cdFx0fSxcclxuXHRcdHN1YnRyYWN0OiBmdW5jdGlvbiAoYW1vdW50OiBudW1iZXIsIHVuaXQ6IHN0cmluZykge1xyXG5cdFx0XHRyZXR1cm4gbW9ja01vbWVudDtcclxuXHRcdH0sXHJcblx0XHR2YWx1ZU9mOiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBkYXRlLmdldFRpbWUoKTtcclxuXHRcdH0sXHJcblx0XHR0b0RhdGU6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIGRhdGU7XHJcblx0XHR9LFxyXG5cdFx0d2Vla2RheTogZnVuY3Rpb24gKGRheT86IG51bWJlcikge1xyXG5cdFx0XHRpZiAoZGF5ICE9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gbW9ja01vbWVudDtcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gMDtcclxuXHRcdH0sXHJcblx0XHRkYXk6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIGRhdGUuZ2V0RGF5KCk7XHJcblx0XHR9LFxyXG5cdFx0ZGF0ZTogZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRyZXR1cm4gZGF0ZS5nZXREYXRlKCk7XHJcblx0XHR9LFxyXG5cdFx0X2RhdGU6IGRhdGUsXHJcblx0fTtcclxuXHRyZXR1cm4gbW9ja01vbWVudDtcclxufVxyXG5cclxuLy8gQWRkIHN0YXRpYyBtZXRob2RzIHRvIG1vbWVudEZuXHJcbihtb21lbnRGbiBhcyBhbnkpLnV0YyA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0Zm9ybWF0OiBmdW5jdGlvbiAoKSB7XHJcblx0XHRcdHJldHVybiBcIjAwOjAwOjAwXCI7XHJcblx0XHR9LFxyXG5cdH07XHJcbn07XHJcblxyXG4obW9tZW50Rm4gYXMgYW55KS5kdXJhdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuXHRyZXR1cm4ge1xyXG5cdFx0YXNNaWxsaXNlY29uZHM6IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0cmV0dXJuIDA7XHJcblx0XHR9LFxyXG5cdH07XHJcbn07XHJcblxyXG4obW9tZW50Rm4gYXMgYW55KS5sb2NhbGUgPSBmdW5jdGlvbiAobG9jYWxlPzogc3RyaW5nKSB7XHJcblx0aWYgKGxvY2FsZSkge1xyXG5cdFx0KG1vbWVudEZuIGFzIGFueSkuX2N1cnJlbnRMb2NhbGUgPSBsb2NhbGU7XHJcblx0XHRyZXR1cm4gbG9jYWxlO1xyXG5cdH1cclxuXHRyZXR1cm4gKG1vbWVudEZuIGFzIGFueSkuX2N1cnJlbnRMb2NhbGUgfHwgXCJlblwiO1xyXG59O1xyXG5cclxuLy8gSW5pdGlhbGl6ZSBkZWZhdWx0IGxvY2FsZVxyXG4obW9tZW50Rm4gYXMgYW55KS5fY3VycmVudExvY2FsZSA9IFwiZW5cIjtcclxuXHJcbihtb21lbnRGbiBhcyBhbnkpLndlZWtkYXlzU2hvcnQgPSBmdW5jdGlvbiAobG9jYWxlRGF0YT86IGJvb2xlYW4pIHtcclxuXHRyZXR1cm4gW1wiU3VuXCIsIFwiTW9uXCIsIFwiVHVlXCIsIFwiV2VkXCIsIFwiVGh1XCIsIFwiRnJpXCIsIFwiU2F0XCJdO1xyXG59O1xyXG5cclxuKG1vbWVudEZuIGFzIGFueSkud2Vla2RheXNNaW4gPSBmdW5jdGlvbiAobG9jYWxlRGF0YT86IGJvb2xlYW4pIHtcclxuXHRyZXR1cm4gW1wiU3VcIiwgXCJNb1wiLCBcIlR1XCIsIFwiV2VcIiwgXCJUaFwiLCBcIkZyXCIsIFwiU2FcIl07XHJcbn07XHJcblxyXG4obW9tZW50Rm4gYXMgYW55KS5tb250aHMgPSBmdW5jdGlvbiAoKSB7XHJcblx0cmV0dXJuIFtcIkphbnVhcnlcIiwgXCJGZWJydWFyeVwiLCBcIk1hcmNoXCIsIFwiQXByaWxcIiwgXCJNYXlcIiwgXCJKdW5lXCIsIFxyXG5cdFx0XHRcIkp1bHlcIiwgXCJBdWd1c3RcIiwgXCJTZXB0ZW1iZXJcIiwgXCJPY3RvYmVyXCIsIFwiTm92ZW1iZXJcIiwgXCJEZWNlbWJlclwiXTtcclxufTtcclxuXHJcbihtb21lbnRGbiBhcyBhbnkpLm1vbnRoc1Nob3J0ID0gZnVuY3Rpb24gKCkge1xyXG5cdHJldHVybiBbXCJKYW5cIiwgXCJGZWJcIiwgXCJNYXJcIiwgXCJBcHJcIiwgXCJNYXlcIiwgXCJKdW5cIixcclxuXHRcdFx0XCJKdWxcIiwgXCJBdWdcIiwgXCJTZXBcIiwgXCJPY3RcIiwgXCJOb3ZcIiwgXCJEZWNcIl07XHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgbW9tZW50ID0gbW9tZW50Rm4gYXMgYW55O1xyXG5cclxuLy8gTW9jayBDb21wb25lbnQgY2xhc3NcclxuZXhwb3J0IGNsYXNzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjaGlsZHJlbjogQ29tcG9uZW50W10gPSBbXTtcclxuXHRwcml2YXRlIGxvYWRlZCA9IGZhbHNlO1xyXG5cclxuXHRhZGRDaGlsZChjb21wb25lbnQ6IENvbXBvbmVudCk6IENvbXBvbmVudCB7XHJcblx0XHR0aGlzLmNoaWxkcmVuLnB1c2goY29tcG9uZW50KTtcclxuXHRcdGlmICh0aGlzLmxvYWRlZCkge1xyXG5cdFx0XHRjb21wb25lbnQubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNvbXBvbmVudDtcclxuXHR9XHJcblxyXG5cdHJlbW92ZUNoaWxkKGNvbXBvbmVudDogQ29tcG9uZW50KTogQ29tcG9uZW50IHtcclxuXHRcdGNvbnN0IGluZGV4ID0gdGhpcy5jaGlsZHJlbi5pbmRleE9mKGNvbXBvbmVudCk7XHJcblx0XHRpZiAoaW5kZXggIT09IC0xKSB7XHJcblx0XHRcdHRoaXMuY2hpbGRyZW4uc3BsaWNlKGluZGV4LCAxKTtcclxuXHRcdFx0Y29tcG9uZW50LnVubG9hZCgpO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIGNvbXBvbmVudDtcclxuXHR9XHJcblxyXG5cdGxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmxvYWRlZCA9IHRydWU7XHJcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkKSA9PiBjaGlsZC5sb2FkKCkpO1xyXG5cdFx0dGhpcy5vbmxvYWQoKTtcclxuXHR9XHJcblxyXG5cdHVubG9hZCgpOiB2b2lkIHtcclxuXHRcdHRoaXMubG9hZGVkID0gZmFsc2U7XHJcblx0XHR0aGlzLmNoaWxkcmVuLmZvckVhY2goKGNoaWxkKSA9PiBjaGlsZC51bmxvYWQoKSk7XHJcblx0XHR0aGlzLm9udW5sb2FkKCk7XHJcblx0fVxyXG5cclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBPdmVycmlkZSBpbiBzdWJjbGFzc2VzXHJcblx0fVxyXG5cclxuXHRvbnVubG9hZCgpOiB2b2lkIHtcclxuXHRcdC8vIE92ZXJyaWRlIGluIHN1YmNsYXNzZXNcclxuXHR9XHJcblxyXG5cdHJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRlbDogSFRNTEVsZW1lbnQsXHJcblx0XHR0eXBlOiBzdHJpbmcsXHJcblx0XHRsaXN0ZW5lcjogRXZlbnRMaXN0ZW5lclxyXG5cdCk6IHZvaWQge1xyXG5cdFx0Ly8gTW9jayBpbXBsZW1lbnRhdGlvblxyXG5cdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcik7XHJcblx0fVxyXG5cclxuXHRyZWdpc3RlckludGVydmFsKGlkOiBudW1iZXIpOiBudW1iZXIge1xyXG5cdFx0Ly8gTW9jayBpbXBsZW1lbnRhdGlvblxyXG5cdFx0cmV0dXJuIGlkO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBfZXZlbnRzOiBBcnJheTx7IHVubG9hZDogKCkgPT4gdm9pZCB9PiA9IFtdO1xyXG5cclxuXHRyZWdpc3RlckV2ZW50KGV2ZW50UmVmOiB7IHVubG9hZDogKCkgPT4gdm9pZCB9KTogdm9pZCB7XHJcblx0XHR0aGlzLl9ldmVudHMucHVzaChldmVudFJlZik7XHJcblx0fVxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTW9kYWwgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdGFwcDogQXBwO1xyXG5cdG1vZGFsRWw6IEhUTUxFbGVtZW50IHwgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XHJcblx0Y29udGVudEVsOiBIVE1MRWxlbWVudCB8IFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xyXG5cclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdFx0aWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gXCJ1bmRlZmluZWRcIiAmJiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KSB7XHJcblx0XHRcdHRoaXMubW9kYWxFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcblx0XHRcdHRoaXMuY29udGVudEVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMubW9kYWxFbCA9IHt9O1xyXG5cdFx0XHR0aGlzLmNvbnRlbnRFbCA9IHt9O1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0b3BlbigpOiB2b2lkIHtcclxuXHRcdHRoaXMub25PcGVuKCk7XHJcblx0fVxyXG5cclxuXHRjbG9zZSgpOiB2b2lkIHtcclxuXHRcdHRoaXMub25DbG9zZSgpO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCk6IHZvaWQge1xyXG5cdFx0Ly8gT3ZlcnJpZGUgaW4gc3ViY2xhc3Nlc1xyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpOiB2b2lkIHtcclxuXHRcdC8vIE92ZXJyaWRlIGluIHN1YmNsYXNzZXNcclxuXHR9XHJcbn1cclxuXHJcbi8vIE1vY2sgb3RoZXIgY29tbW9uIE9ic2lkaWFuIHV0aWxpdGllc1xyXG5leHBvcnQgZnVuY3Rpb24gc2V0SWNvbihlbDogSFRNTEVsZW1lbnQsIGljb25JZDogc3RyaW5nKTogdm9pZCB7XHJcblx0Ly8gTW9jayBpbXBsZW1lbnRhdGlvblxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZGVib3VuY2U8VCBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gYW55PihcclxuXHRmdW5jOiBULFxyXG5cdHdhaXQ6IG51bWJlcixcclxuXHRpbW1lZGlhdGU/OiBib29sZWFuXHJcbik6IFQge1xyXG5cdGxldCB0aW1lb3V0OiBOb2RlSlMuVGltZW91dCB8IG51bGwgPSBudWxsO1xyXG5cdHJldHVybiAoKC4uLmFyZ3M6IGFueVtdKSA9PiB7XHJcblx0XHRjb25zdCBsYXRlciA9ICgpID0+IHtcclxuXHRcdFx0dGltZW91dCA9IG51bGw7XHJcblx0XHRcdGlmICghaW1tZWRpYXRlKSBmdW5jKC4uLmFyZ3MpO1xyXG5cdFx0fTtcclxuXHRcdGNvbnN0IGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XHJcblx0XHRpZiAodGltZW91dCkgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xyXG5cdFx0dGltZW91dCA9IHNldFRpbWVvdXQobGF0ZXIsIHdhaXQpO1xyXG5cdFx0aWYgKGNhbGxOb3cpIGZ1bmMoLi4uYXJncyk7XHJcblx0fSkgYXMgVDtcclxufVxyXG5cclxuLy8gTW9jayBFZGl0b3JTdWdnZXN0IGNsYXNzXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBFZGl0b3JTdWdnZXN0PFQ+IGV4dGVuZHMgQ29tcG9uZW50IHtcclxuXHRhcHA6IEFwcDtcclxuXHRcclxuXHRjb25zdHJ1Y3RvcihhcHA6IEFwcCkge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuYXBwID0gYXBwO1xyXG5cdH1cclxuXHJcblx0YWJzdHJhY3QgZ2V0U3VnZ2VzdGlvbnMoY29udGV4dDogYW55KTogVFtdIHwgUHJvbWlzZTxUW10+O1xyXG5cdGFic3RyYWN0IHJlbmRlclN1Z2dlc3Rpb24oc3VnZ2VzdGlvbjogVCwgZWw6IEhUTUxFbGVtZW50KTogdm9pZDtcclxuXHRhYnN0cmFjdCBzZWxlY3RTdWdnZXN0aW9uKHN1Z2dlc3Rpb246IFQsIGV2dDogTW91c2VFdmVudCB8IEtleWJvYXJkRXZlbnQpOiB2b2lkO1xyXG5cclxuXHRvblRyaWdnZXIoY3Vyc29yOiBhbnksIGVkaXRvcjogYW55LCBmaWxlOiBhbnkpOiBhbnkge1xyXG5cdFx0cmV0dXJuIG51bGw7XHJcblx0fVxyXG5cclxuXHRjbG9zZSgpOiB2b2lkIHtcclxuXHRcdC8vIE1vY2sgaW1wbGVtZW50YXRpb25cclxuXHR9XHJcbn1cclxuXHJcbi8vIEFkZCBhbnkgb3RoZXIgT2JzaWRpYW4gY2xhc3NlcyBvciBmdW5jdGlvbnMgbmVlZGVkIGZvciB0ZXN0c1xyXG4iXX0=