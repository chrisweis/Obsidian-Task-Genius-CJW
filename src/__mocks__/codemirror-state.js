// Mock for @codemirror/state
export class Text {
    constructor(content = "") {
        this.content = content;
    }
    toString() {
        return this.content;
    }
    get length() {
        return this.content.length;
    }
    sliceString(from, to) {
        return this.content.slice(from, to);
    }
    line(lineNum) {
        const lines = this.content.split("\n");
        if (lineNum < 1 || lineNum > lines.length) {
            throw new Error(`Line ${lineNum} out of range`);
        }
        const line = lines[lineNum - 1];
        let from = 0;
        for (let i = 0; i < lineNum - 1; i++) {
            from += lines[i].length + 1; // +1 for newline
        }
        return {
            text: line,
            from,
            to: from + line.length,
            number: lineNum,
        };
    }
    get lines() {
        return this.content.split("\n").length;
    }
    lineAt(pos) {
        var _a;
        let lineStart = 0;
        let lineEnd = 0;
        let lineNumber = 1;
        const lines = this.content.split("\n");
        for (const line of lines) {
            lineEnd = lineStart + line.length;
            if (pos >= lineStart && pos <= lineEnd) {
                return {
                    text: line,
                    from: lineStart,
                    to: lineEnd,
                    number: lineNumber,
                };
            }
            lineStart = lineEnd + 1; // +1 for newline
            lineNumber++;
        }
        // Default to last line if position is beyond content
        return {
            text: lines[lines.length - 1] || "",
            from: lineStart - (((_a = lines[lines.length - 1]) === null || _a === void 0 ? void 0 : _a.length) || 0) - 1,
            to: lineStart,
            number: lines.length,
        };
    }
}
export class Changes {
    constructor() {
        this._changes = [];
    }
    get length() {
        return this._changes.length;
    }
    iterChanges(f) {
        for (const change of this._changes) {
            f(change.fromA, change.toA, change.fromB, change.toB, change.inserted);
        }
    }
}
export class Transaction {
    constructor(options = {}) {
        this.startState = options.startState || new EditorState();
        this.newDoc = options.newDoc || new Text();
        this.changes = options.changes || new Changes();
        this.selection = options.selection || null;
        this.annotations = options.annotations || new Map();
    }
    annotation(annotation) {
        return this.annotations.get(annotation);
    }
    get docChanged() {
        return this.changes.length > 0;
    }
    isUserEvent(type) {
        return false;
    }
}
export class EditorState {
    constructor(config = {}) {
        this.doc = config.doc || new Text();
        this.selection = config.selection || null;
        this._fields = new Map();
        if (config.extensions) {
            config.extensions.forEach((ext) => {
                if (ext && ext.hasOwnProperty("provides")) {
                    const fieldProvider = ext.provides;
                    if (fieldProvider &&
                        fieldProvider.field &&
                        fieldProvider.create) {
                        this._fields.set(fieldProvider.field, fieldProvider.create(this));
                    }
                }
                else if (ext &&
                    ext.hasOwnProperty("field") &&
                    ext.hasOwnProperty("create")) {
                    this._fields.set(ext.field, ext.create(this));
                }
            });
        }
    }
    update(spec = {}) {
        var _a, _b, _c, _d, _e;
        const changesSpec = spec.changes || {};
        const from = (_a = changesSpec.from) !== null && _a !== void 0 ? _a : 0;
        const to = (_b = changesSpec.to) !== null && _b !== void 0 ? _b : from;
        const insert = typeof changesSpec.insert === "string"
            ? changesSpec.insert
            : (_e = (_d = (_c = changesSpec.insert) === null || _c === void 0 ? void 0 : _c.toString) === null || _d === void 0 ? void 0 : _d.call(_c)) !== null && _e !== void 0 ? _e : "";
        const oldText = this.doc.toString();
        const newContent = oldText.slice(0, from) + insert + oldText.slice(to);
        const newDoc = new Text(newContent);
        const changes = new Changes();
        changes._changes.push({
            fromA: from,
            toA: to,
            fromB: from,
            toB: from + insert.length,
            inserted: new Text(insert),
        });
        return new Transaction({
            startState: this,
            newDoc,
            changes,
            selection: spec.selection,
            annotations: spec.annotations,
        });
    }
    field(field /* StateField<T> | Facet<any, T> */) {
        return this._fields.get(field);
    }
    static create(config = {}) {
        return new EditorState(config);
    }
}
EditorState.transactionFilter = {
    of: (f) => {
        return {
            filter: f,
        };
    },
};
export class Annotation {
    constructor(name) {
        this.name = name;
    }
    of(value) {
        return value;
    }
    static define() {
        return new Annotation("mock-annotation");
    }
}
export const StateEffect = {
    define: () => ({
        of: (value) => ({ value }),
    }),
};
// Add a mock for EditorSelection
export const EditorSelection = {
    single: jest.fn((anchor, head) => {
        // Return a mock SelectionRange or similar structure
        // The specific structure depends on what properties your tests need
        const resolvedHead = head !== null && head !== void 0 ? head : anchor;
        return {
            anchor: anchor,
            head: resolvedHead,
            from: Math.min(anchor, resolvedHead),
            to: Math.max(anchor, resolvedHead),
            empty: anchor === resolvedHead,
            // You might need to add other properties based on actual usage:
            // main: { anchor, head: resolvedHead }, // Mock main selection range
            // ranges: [{ anchor, head: resolvedHead }], // Mock ranges array
            // ... other methods or properties EditorSelection/SelectionRange might need
        };
    }),
    // If your code also uses other static methods or properties of EditorSelection,
    // such as EditorSelection.range(), add corresponding mocks here as well
    // range: jest.fn((anchor: number, head: number) => { ... }),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZW1pcnJvci1zdGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvZGVtaXJyb3Itc3RhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsNkJBQTZCO0FBRTdCLE1BQU0sT0FBTyxJQUFJO0lBR2hCLFlBQVksVUFBa0IsRUFBRTtRQUMvQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztJQUNyQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztJQUM1QixDQUFDO0lBRUQsV0FBVyxDQUFDLElBQVksRUFBRSxFQUFVO1FBQ25DLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZTtRQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QyxJQUFJLE9BQU8sR0FBRyxDQUFDLElBQUksT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUU7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLE9BQU8sZUFBZSxDQUFDLENBQUM7U0FDaEQ7UUFFRCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQztRQUNiLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ3JDLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQjtTQUM5QztRQUVELE9BQU87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QUosSUFBSSxjQUFKLElBQUksR0FBSSxNQUFNLENBQUM7UUFDcEMsT0FBTztZQUNOLE1BQU0sRUFBRSxNQUFNO1lBQ2QsSUFBSSxFQUFFLFlBQVk7WUFDbEIsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQztZQUNwQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDO1lBQ2xDLEtBQUssRUFBRSxNQUFNLEtBQUssWUFBWTtZQUM5QixnRUFBZ0U7WUFDaEUscUVBQXFFO1lBQ3JFLGlFQUFpRTtZQUNqRSw0RUFBNEU7U0FDNUUsQ0FBQztJQUNILENBQUMsQ0FBQztJQUNGLGdGQUFnRjtJQUNoRix3RUFBd0U7SUFDeEUsNkRBQTZEO0NBQzdELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBNb2NrIGZvciBAY29kZW1pcnJvci9zdGF0ZVxyXG5cclxuZXhwb3J0IGNsYXNzIFRleHQge1xyXG5cdGNvbnRlbnQ6IHN0cmluZztcclxuXHJcblx0Y29uc3RydWN0b3IoY29udGVudDogc3RyaW5nID0gXCJcIikge1xyXG5cdFx0dGhpcy5jb250ZW50ID0gY29udGVudDtcclxuXHR9XHJcblxyXG5cdHRvU3RyaW5nKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuY29udGVudDtcclxuXHR9XHJcblxyXG5cdGdldCBsZW5ndGgoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jb250ZW50Lmxlbmd0aDtcclxuXHR9XHJcblxyXG5cdHNsaWNlU3RyaW5nKGZyb206IG51bWJlciwgdG86IG51bWJlcikge1xyXG5cdFx0cmV0dXJuIHRoaXMuY29udGVudC5zbGljZShmcm9tLCB0byk7XHJcblx0fVxyXG5cclxuXHRsaW5lKGxpbmVOdW06IG51bWJlcikge1xyXG5cdFx0Y29uc3QgbGluZXMgPSB0aGlzLmNvbnRlbnQuc3BsaXQoXCJcXG5cIik7XHJcblx0XHRpZiAobGluZU51bSA8IDEgfHwgbGluZU51bSA+IGxpbmVzLmxlbmd0aCkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoYExpbmUgJHtsaW5lTnVtfSBvdXQgb2YgcmFuZ2VgKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBsaW5lID0gbGluZXNbbGluZU51bSAtIDFdO1xyXG5cdFx0bGV0IGZyb20gPSAwO1xyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lTnVtIC0gMTsgaSsrKSB7XHJcblx0XHRcdGZyb20gKz0gbGluZXNbaV0ubGVuZ3RoICsgMTsgLy8gKzEgZm9yIG5ld2xpbmVcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0ZXh0OiBsaW5lLFxyXG5cdFx0XHRmcm9tLFxyXG5cdFx0XHR0bzogZnJvbSArIGxpbmUubGVuZ3RoLFxyXG5cdFx0XHRudW1iZXI6IGxpbmVOdW0sXHJcblx0XHR9O1xyXG5cdH1cclxuXHJcblx0Z2V0IGxpbmVzKCkge1xyXG5cdFx0cmV0dXJuIHRoaXMuY29udGVudC5zcGxpdChcIlxcblwiKS5sZW5ndGg7XHJcblx0fVxyXG5cclxuXHRsaW5lQXQocG9zOiBudW1iZXIpIHtcclxuXHRcdGxldCBsaW5lU3RhcnQgPSAwO1xyXG5cdFx0bGV0IGxpbmVFbmQgPSAwO1xyXG5cdFx0bGV0IGxpbmVOdW1iZXIgPSAxO1xyXG5cclxuXHRcdGNvbnN0IGxpbmVzID0gdGhpcy5jb250ZW50LnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0Zm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcblx0XHRcdGxpbmVFbmQgPSBsaW5lU3RhcnQgKyBsaW5lLmxlbmd0aDtcclxuXHJcblx0XHRcdGlmIChwb3MgPj0gbGluZVN0YXJ0ICYmIHBvcyA8PSBsaW5lRW5kKSB7XHJcblx0XHRcdFx0cmV0dXJuIHtcclxuXHRcdFx0XHRcdHRleHQ6IGxpbmUsXHJcblx0XHRcdFx0XHRmcm9tOiBsaW5lU3RhcnQsXHJcblx0XHRcdFx0XHR0bzogbGluZUVuZCxcclxuXHRcdFx0XHRcdG51bWJlcjogbGluZU51bWJlcixcclxuXHRcdFx0XHR9O1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsaW5lU3RhcnQgPSBsaW5lRW5kICsgMTsgLy8gKzEgZm9yIG5ld2xpbmVcclxuXHRcdFx0bGluZU51bWJlcisrO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIERlZmF1bHQgdG8gbGFzdCBsaW5lIGlmIHBvc2l0aW9uIGlzIGJleW9uZCBjb250ZW50XHJcblx0XHRyZXR1cm4ge1xyXG5cdFx0XHR0ZXh0OiBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSB8fCBcIlwiLFxyXG5cdFx0XHRmcm9tOiBsaW5lU3RhcnQgLSAobGluZXNbbGluZXMubGVuZ3RoIC0gMV0/Lmxlbmd0aCB8fCAwKSAtIDEsXHJcblx0XHRcdHRvOiBsaW5lU3RhcnQsXHJcblx0XHRcdG51bWJlcjogbGluZXMubGVuZ3RoLFxyXG5cdFx0fTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDaGFuZ2VzIHtcclxuXHRfY2hhbmdlczogQXJyYXk8e1xyXG5cdFx0ZnJvbUE6IG51bWJlcjtcclxuXHRcdHRvQTogbnVtYmVyO1xyXG5cdFx0ZnJvbUI6IG51bWJlcjtcclxuXHRcdHRvQjogbnVtYmVyO1xyXG5cdFx0aW5zZXJ0ZWQ6IFRleHQ7XHJcblx0fT47XHJcblxyXG5cdGNvbnN0cnVjdG9yKCkge1xyXG5cdFx0dGhpcy5fY2hhbmdlcyA9IFtdO1xyXG5cdH1cclxuXHJcblx0Z2V0IGxlbmd0aCgpIHtcclxuXHRcdHJldHVybiB0aGlzLl9jaGFuZ2VzLmxlbmd0aDtcclxuXHR9XHJcblxyXG5cdGl0ZXJDaGFuZ2VzKFxyXG5cdFx0ZjogKFxyXG5cdFx0XHRmcm9tQTogbnVtYmVyLFxyXG5cdFx0XHR0b0E6IG51bWJlcixcclxuXHRcdFx0ZnJvbUI6IG51bWJlcixcclxuXHRcdFx0dG9COiBudW1iZXIsXHJcblx0XHRcdGluc2VydGVkOiBUZXh0XHJcblx0XHQpID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdGZvciAoY29uc3QgY2hhbmdlIG9mIHRoaXMuX2NoYW5nZXMpIHtcclxuXHRcdFx0ZihcclxuXHRcdFx0XHRjaGFuZ2UuZnJvbUEsXHJcblx0XHRcdFx0Y2hhbmdlLnRvQSxcclxuXHRcdFx0XHRjaGFuZ2UuZnJvbUIsXHJcblx0XHRcdFx0Y2hhbmdlLnRvQixcclxuXHRcdFx0XHRjaGFuZ2UuaW5zZXJ0ZWRcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBUcmFuc2FjdGlvbiB7XHJcblx0c3RhcnRTdGF0ZTogRWRpdG9yU3RhdGU7XHJcblx0bmV3RG9jOiBUZXh0O1xyXG5cdGNoYW5nZXM6IENoYW5nZXM7XHJcblx0c2VsZWN0aW9uOiBhbnk7XHJcblx0YW5ub3RhdGlvbnM6IE1hcDxBbm5vdGF0aW9uPGFueT4sIGFueT47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0b3B0aW9uczoge1xyXG5cdFx0XHRzdGFydFN0YXRlPzogRWRpdG9yU3RhdGU7XHJcblx0XHRcdG5ld0RvYz86IFRleHQ7XHJcblx0XHRcdGNoYW5nZXM/OiBDaGFuZ2VzO1xyXG5cdFx0XHRzZWxlY3Rpb24/OiBhbnk7XHJcblx0XHRcdGFubm90YXRpb25zPzogTWFwPEFubm90YXRpb248YW55PiwgYW55PjtcclxuXHRcdH0gPSB7fVxyXG5cdCkge1xyXG5cdFx0dGhpcy5zdGFydFN0YXRlID0gb3B0aW9ucy5zdGFydFN0YXRlIHx8IG5ldyBFZGl0b3JTdGF0ZSgpO1xyXG5cdFx0dGhpcy5uZXdEb2MgPSBvcHRpb25zLm5ld0RvYyB8fCBuZXcgVGV4dCgpO1xyXG5cdFx0dGhpcy5jaGFuZ2VzID0gb3B0aW9ucy5jaGFuZ2VzIHx8IG5ldyBDaGFuZ2VzKCk7XHJcblx0XHR0aGlzLnNlbGVjdGlvbiA9IG9wdGlvbnMuc2VsZWN0aW9uIHx8IG51bGw7XHJcblx0XHR0aGlzLmFubm90YXRpb25zID0gb3B0aW9ucy5hbm5vdGF0aW9ucyB8fCBuZXcgTWFwKCk7XHJcblx0fVxyXG5cclxuXHRhbm5vdGF0aW9uKGFubm90YXRpb246IEFubm90YXRpb248YW55Pikge1xyXG5cdFx0cmV0dXJuIHRoaXMuYW5ub3RhdGlvbnMuZ2V0KGFubm90YXRpb24pO1xyXG5cdH1cclxuXHJcblx0Z2V0IGRvY0NoYW5nZWQoKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5jaGFuZ2VzLmxlbmd0aCA+IDA7XHJcblx0fVxyXG5cclxuXHRpc1VzZXJFdmVudCh0eXBlOiBzdHJpbmcpIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBFZGl0b3JTdGF0ZSB7XHJcblx0ZG9jOiBUZXh0O1xyXG5cdHNlbGVjdGlvbjogYW55O1xyXG5cdF9maWVsZHM6IE1hcDxhbnksIGFueT47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0Y29uZmlnOiB7IGRvYz86IFRleHQ7IHNlbGVjdGlvbj86IGFueTsgZXh0ZW5zaW9ucz86IGFueVtdIH0gPSB7fVxyXG5cdCkge1xyXG5cdFx0dGhpcy5kb2MgPSBjb25maWcuZG9jIHx8IG5ldyBUZXh0KCk7XHJcblx0XHR0aGlzLnNlbGVjdGlvbiA9IGNvbmZpZy5zZWxlY3Rpb24gfHwgbnVsbDtcclxuXHRcdHRoaXMuX2ZpZWxkcyA9IG5ldyBNYXAoKTtcclxuXHJcblx0XHRpZiAoY29uZmlnLmV4dGVuc2lvbnMpIHtcclxuXHRcdFx0Y29uZmlnLmV4dGVuc2lvbnMuZm9yRWFjaCgoZXh0KSA9PiB7XHJcblx0XHRcdFx0aWYgKGV4dCAmJiBleHQuaGFzT3duUHJvcGVydHkoXCJwcm92aWRlc1wiKSkge1xyXG5cdFx0XHRcdFx0Y29uc3QgZmllbGRQcm92aWRlciA9IGV4dC5wcm92aWRlcztcclxuXHRcdFx0XHRcdGlmIChcclxuXHRcdFx0XHRcdFx0ZmllbGRQcm92aWRlciAmJlxyXG5cdFx0XHRcdFx0XHRmaWVsZFByb3ZpZGVyLmZpZWxkICYmXHJcblx0XHRcdFx0XHRcdGZpZWxkUHJvdmlkZXIuY3JlYXRlXHJcblx0XHRcdFx0XHQpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5fZmllbGRzLnNldChcclxuXHRcdFx0XHRcdFx0XHRmaWVsZFByb3ZpZGVyLmZpZWxkLFxyXG5cdFx0XHRcdFx0XHRcdGZpZWxkUHJvdmlkZXIuY3JlYXRlKHRoaXMpXHJcblx0XHRcdFx0XHRcdCk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBlbHNlIGlmIChcclxuXHRcdFx0XHRcdGV4dCAmJlxyXG5cdFx0XHRcdFx0ZXh0Lmhhc093blByb3BlcnR5KFwiZmllbGRcIikgJiZcclxuXHRcdFx0XHRcdGV4dC5oYXNPd25Qcm9wZXJ0eShcImNyZWF0ZVwiKVxyXG5cdFx0XHRcdCkge1xyXG5cdFx0XHRcdFx0dGhpcy5fZmllbGRzLnNldChleHQuZmllbGQsIGV4dC5jcmVhdGUodGhpcykpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoc3BlYzogYW55ID0ge30pIHtcclxuXHRcdGNvbnN0IGNoYW5nZXNTcGVjID0gc3BlYy5jaGFuZ2VzIHx8IHt9O1xyXG5cdFx0Y29uc3QgZnJvbSA9IGNoYW5nZXNTcGVjLmZyb20gPz8gMDtcclxuXHRcdGNvbnN0IHRvID0gY2hhbmdlc1NwZWMudG8gPz8gZnJvbTtcclxuXHRcdGNvbnN0IGluc2VydCA9XHJcblx0XHRcdHR5cGVvZiBjaGFuZ2VzU3BlYy5pbnNlcnQgPT09IFwic3RyaW5nXCJcclxuXHRcdFx0XHQ/IGNoYW5nZXNTcGVjLmluc2VydFxyXG5cdFx0XHRcdDogY2hhbmdlc1NwZWMuaW5zZXJ0Py50b1N0cmluZz8uKCkgPz8gXCJcIjtcclxuXHJcblx0XHRjb25zdCBvbGRUZXh0ID0gdGhpcy5kb2MudG9TdHJpbmcoKTtcclxuXHRcdGNvbnN0IG5ld0NvbnRlbnQgPSBvbGRUZXh0LnNsaWNlKDAsIGZyb20pICsgaW5zZXJ0ICsgb2xkVGV4dC5zbGljZSh0byk7XHJcblx0XHRjb25zdCBuZXdEb2MgPSBuZXcgVGV4dChuZXdDb250ZW50KTtcclxuXHJcblx0XHRjb25zdCBjaGFuZ2VzID0gbmV3IENoYW5nZXMoKTtcclxuXHRcdChjaGFuZ2VzIGFzIGFueSkuX2NoYW5nZXMucHVzaCh7XHJcblx0XHRcdGZyb21BOiBmcm9tLFxyXG5cdFx0XHR0b0E6IHRvLFxyXG5cdFx0XHRmcm9tQjogZnJvbSxcclxuXHRcdFx0dG9COiBmcm9tICsgaW5zZXJ0Lmxlbmd0aCxcclxuXHRcdFx0aW5zZXJ0ZWQ6IG5ldyBUZXh0KGluc2VydCksXHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gbmV3IFRyYW5zYWN0aW9uKHtcclxuXHRcdFx0c3RhcnRTdGF0ZTogdGhpcyxcclxuXHRcdFx0bmV3RG9jLFxyXG5cdFx0XHRjaGFuZ2VzLFxyXG5cdFx0XHRzZWxlY3Rpb246IHNwZWMuc2VsZWN0aW9uLFxyXG5cdFx0XHRhbm5vdGF0aW9uczogc3BlYy5hbm5vdGF0aW9ucyxcclxuXHRcdH0pO1xyXG5cdH1cclxuXHJcblx0ZmllbGQ8VD4oZmllbGQ6IGFueSAvKiBTdGF0ZUZpZWxkPFQ+IHwgRmFjZXQ8YW55LCBUPiAqLyk6IFQgfCB1bmRlZmluZWQge1xyXG5cdFx0cmV0dXJuIHRoaXMuX2ZpZWxkcy5nZXQoZmllbGQpO1xyXG5cdH1cclxuXHJcblx0c3RhdGljIGNyZWF0ZShjb25maWc6IGFueSA9IHt9KSB7XHJcblx0XHRyZXR1cm4gbmV3IEVkaXRvclN0YXRlKGNvbmZpZyk7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgdHJhbnNhY3Rpb25GaWx0ZXIgPSB7XHJcblx0XHRvZjogKGY6ICh0cjogVHJhbnNhY3Rpb24pID0+IFRyYW5zYWN0aW9uU3BlYykgPT4ge1xyXG5cdFx0XHRyZXR1cm4ge1xyXG5cdFx0XHRcdGZpbHRlcjogZixcclxuXHRcdFx0fTtcclxuXHRcdH0sXHJcblx0fTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFubm90YXRpb248VD4ge1xyXG5cdGNvbnN0cnVjdG9yKHB1YmxpYyBuYW1lOiBzdHJpbmcpIHt9XHJcblxyXG5cdG9mKHZhbHVlOiBUKSB7XHJcblx0XHRyZXR1cm4gdmFsdWU7XHJcblx0fVxyXG5cclxuXHRzdGF0aWMgZGVmaW5lPFQ+KCkge1xyXG5cdFx0cmV0dXJuIG5ldyBBbm5vdGF0aW9uPFQ+KFwibW9jay1hbm5vdGF0aW9uXCIpO1xyXG5cdH1cclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBUcmFuc2FjdGlvblNwZWMge1xyXG5cdGNoYW5nZXM/OiBhbnk7XHJcblx0c2VsZWN0aW9uPzogYW55O1xyXG5cdGFubm90YXRpb25zPzogYW55O1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgU3RhdGVFZmZlY3QgPSB7XHJcblx0ZGVmaW5lOiAoKSA9PiAoe1xyXG5cdFx0b2Y6ICh2YWx1ZTogYW55KSA9PiAoeyB2YWx1ZSB9KSxcclxuXHR9KSxcclxufTtcclxuXHJcbi8vIEFkZCBhIG1vY2sgZm9yIEVkaXRvclNlbGVjdGlvblxyXG5leHBvcnQgY29uc3QgRWRpdG9yU2VsZWN0aW9uID0ge1xyXG5cdHNpbmdsZTogamVzdC5mbigoYW5jaG9yOiBudW1iZXIsIGhlYWQ/OiBudW1iZXIpID0+IHtcclxuXHRcdC8vIFJldHVybiBhIG1vY2sgU2VsZWN0aW9uUmFuZ2Ugb3Igc2ltaWxhciBzdHJ1Y3R1cmVcclxuXHRcdC8vIFRoZSBzcGVjaWZpYyBzdHJ1Y3R1cmUgZGVwZW5kcyBvbiB3aGF0IHByb3BlcnRpZXMgeW91ciB0ZXN0cyBuZWVkXHJcblx0XHRjb25zdCByZXNvbHZlZEhlYWQgPSBoZWFkID8/IGFuY2hvcjtcclxuXHRcdHJldHVybiB7XHJcblx0XHRcdGFuY2hvcjogYW5jaG9yLFxyXG5cdFx0XHRoZWFkOiByZXNvbHZlZEhlYWQsXHJcblx0XHRcdGZyb206IE1hdGgubWluKGFuY2hvciwgcmVzb2x2ZWRIZWFkKSxcclxuXHRcdFx0dG86IE1hdGgubWF4KGFuY2hvciwgcmVzb2x2ZWRIZWFkKSxcclxuXHRcdFx0ZW1wdHk6IGFuY2hvciA9PT0gcmVzb2x2ZWRIZWFkLFxyXG5cdFx0XHQvLyBZb3UgbWlnaHQgbmVlZCB0byBhZGQgb3RoZXIgcHJvcGVydGllcyBiYXNlZCBvbiBhY3R1YWwgdXNhZ2U6XHJcblx0XHRcdC8vIG1haW46IHsgYW5jaG9yLCBoZWFkOiByZXNvbHZlZEhlYWQgfSwgLy8gTW9jayBtYWluIHNlbGVjdGlvbiByYW5nZVxyXG5cdFx0XHQvLyByYW5nZXM6IFt7IGFuY2hvciwgaGVhZDogcmVzb2x2ZWRIZWFkIH1dLCAvLyBNb2NrIHJhbmdlcyBhcnJheVxyXG5cdFx0XHQvLyAuLi4gb3RoZXIgbWV0aG9kcyBvciBwcm9wZXJ0aWVzIEVkaXRvclNlbGVjdGlvbi9TZWxlY3Rpb25SYW5nZSBtaWdodCBuZWVkXHJcblx0XHR9O1xyXG5cdH0pLFxyXG5cdC8vIElmIHlvdXIgY29kZSBhbHNvIHVzZXMgb3RoZXIgc3RhdGljIG1ldGhvZHMgb3IgcHJvcGVydGllcyBvZiBFZGl0b3JTZWxlY3Rpb24sXHJcblx0Ly8gc3VjaCBhcyBFZGl0b3JTZWxlY3Rpb24ucmFuZ2UoKSwgYWRkIGNvcnJlc3BvbmRpbmcgbW9ja3MgaGVyZSBhcyB3ZWxsXHJcblx0Ly8gcmFuZ2U6IGplc3QuZm4oKGFuY2hvcjogbnVtYmVyLCBoZWFkOiBudW1iZXIpID0+IHsgLi4uIH0pLFxyXG59O1xyXG4iXX0=