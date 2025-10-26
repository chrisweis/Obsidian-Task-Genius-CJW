import { combineConfig, MapMode, Facet, RangeValue, RangeSet, } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { ViewPlugin } from "@codemirror/view";
import { BlockType } from "@codemirror/view";
import { Direction } from "@codemirror/view";
/// A gutter marker represents a bit of information attached to a line
/// in a specific gutter. Your own custom markers have to extend this
/// class.
export class GutterMarker extends RangeValue {
    /// @internal
    compare(other) {
        return (this == other ||
            (this.constructor == other.constructor && this.eq(other)));
    }
    /// Compare this marker to another marker of the same type.
    eq(other) {
        return false;
    }
    /// Called if the marker has a `toDOM` method and its representation
    /// was removed from a gutter.
    destroy(dom) { }
}
GutterMarker.prototype.elementClass = "";
GutterMarker.prototype.toDOM = undefined;
GutterMarker.prototype.mapMode = MapMode.TrackBefore;
GutterMarker.prototype.startSide = GutterMarker.prototype.endSide = -1;
GutterMarker.prototype.point = true;
/// Facet used to add a class to all gutter elements for a given line.
/// Markers given to this facet should _only_ define an
/// [`elementclass`](#view.GutterMarker.elementClass), not a
/// [`toDOM`](#view.GutterMarker.toDOM) (or the marker will appear
/// in all gutters for the line).
export const gutterLineClass = Facet.define();
/// Facet used to add a class to all gutter elements next to a widget.
/// Should not provide widgets with a `toDOM` method.
export const gutterWidgetClass = Facet.define();
const defaults = {
    class: "",
    renderEmptyElements: false,
    elementStyle: "",
    markers: () => RangeSet.empty,
    lineMarker: () => null,
    widgetMarker: () => null,
    lineMarkerChange: null,
    initialSpacer: null,
    updateSpacer: null,
    domEventHandlers: {},
};
const activeGutters = Facet.define();
/// Define an editor gutter. The order in which the gutters appear is
/// determined by their extension priority.
export function gutter(config) {
    return [gutters(), activeGutters.of(Object.assign(Object.assign({}, defaults), config))];
}
const unfixGutters = Facet.define({
    combine: (values) => values.some((x) => x),
});
/// The gutter-drawing plugin is automatically enabled when you add a
/// gutter, but you can use this function to explicitly configure it.
///
/// Unless `fixed` is explicitly set to `false`, the gutters are
/// fixed, meaning they don't scroll along with the content
/// horizontally (except on Internet Explorer, which doesn't support
/// CSS [`position:
/// sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)).
export function gutters(config) {
    let result = [gutterView];
    if (config && config.fixed === false)
        result.push(unfixGutters.of(true));
    return result;
}
const gutterView = ViewPlugin.fromClass(class {
    constructor(view) {
        var _a;
        this.view = view;
        this.prevViewport = view.viewport;
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutters task-gutter";
        this.dom.setAttribute("aria-hidden", "true");
        this.dom.style.minHeight =
            this.view.contentHeight / this.view.scaleY + "px";
        this.gutters = view.state
            .facet(activeGutters)
            .map((conf) => new SingleGutterView(view, conf));
        for (let gutter of this.gutters)
            this.dom.appendChild(gutter.dom);
        this.fixed = !view.state.facet(unfixGutters);
        if (this.fixed) {
            // FIXME IE11 fallback, which doesn't support position: sticky,
            // by using position: relative + event handlers that realign the
            // gutter (or just force fixed=false on IE11?)
            this.dom.style.position = "sticky";
        }
        this.syncGutters(false);
        console.log(view);
        (_a = view.contentDOM.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(this.dom);
    }
    update(update) {
        if (this.updateGutters(update)) {
            // Detach during sync when the viewport changed significantly
            // (such as during scrolling), since for large updates that is
            // faster.
            let vpA = this.prevViewport, vpB = update.view.viewport;
            let vpOverlap = Math.min(vpA.to, vpB.to) - Math.max(vpA.from, vpB.from);
            this.syncGutters(vpOverlap < (vpB.to - vpB.from) * 0.8);
        }
        if (update.geometryChanged) {
            this.dom.style.minHeight =
                this.view.contentHeight / this.view.scaleY + "px";
        }
        if (this.view.state.facet(unfixGutters) != !this.fixed) {
            this.fixed = !this.fixed;
            this.dom.style.position = this.fixed ? "sticky" : "";
        }
        this.prevViewport = update.view.viewport;
    }
    syncGutters(detach) {
        var _a, _b;
        let after = this.dom.nextSibling;
        if (detach)
            this.dom.remove();
        let lineClasses = RangeSet.iter(this.view.state.facet(gutterLineClass), this.view.viewport.from);
        let classSet = [];
        let contexts = this.gutters.map((gutter) => new UpdateContext(gutter, this.view.viewport, -this.view.documentPadding.top));
        for (let line of this.view.viewportLineBlocks) {
            if (classSet.length)
                classSet = [];
            if (Array.isArray(line.type)) {
                let first = true;
                for (let b of line.type) {
                    if (b.type == BlockType.Text && first) {
                        advanceCursor(lineClasses, classSet, b.from);
                        for (let cx of contexts)
                            cx.line(this.view, b, classSet);
                        first = false;
                    }
                    else if (b.widget) {
                        for (let cx of contexts)
                            cx.widget(this.view, b);
                    }
                }
            }
            else if (line.type == BlockType.Text) {
                advanceCursor(lineClasses, classSet, line.from);
                for (let cx of contexts)
                    cx.line(this.view, line, classSet);
            }
            else if (line.widget) {
                for (let cx of contexts)
                    cx.widget(this.view, line);
            }
        }
        for (let cx of contexts)
            cx.finish();
        if (detach) {
            if (after) {
                (_a = this.view.contentDOM.parentElement) === null || _a === void 0 ? void 0 : _a.insertBefore(this.dom, after);
            }
            else {
                (_b = this.view.contentDOM.parentElement) === null || _b === void 0 ? void 0 : _b.appendChild(this.dom);
            }
        }
    }
    updateGutters(update) {
        let prev = update.startState.facet(activeGutters), cur = update.state.facet(activeGutters);
        let change = update.docChanged ||
            update.heightChanged ||
            update.viewportChanged ||
            !RangeSet.eq(update.startState.facet(gutterLineClass), update.state.facet(gutterLineClass), update.view.viewport.from, update.view.viewport.to);
        if (prev == cur) {
            for (let gutter of this.gutters)
                if (gutter.update(update))
                    change = true;
        }
        else {
            change = true;
            let gutters = [];
            for (let conf of cur) {
                let known = prev.indexOf(conf);
                if (known < 0) {
                    gutters.push(new SingleGutterView(this.view, conf));
                }
                else {
                    this.gutters[known].update(update);
                    gutters.push(this.gutters[known]);
                }
            }
            for (let g of this.gutters) {
                g.dom.remove();
                if (gutters.indexOf(g) < 0)
                    g.destroy();
            }
            for (let g of gutters)
                this.dom.appendChild(g.dom);
            this.gutters = gutters;
        }
        return change;
    }
    destroy() {
        for (let view of this.gutters)
            view.destroy();
        this.dom.remove();
    }
}, {
    provide: (plugin) => EditorView.scrollMargins.of((view) => {
        let value = view.plugin(plugin);
        if (!value || value.gutters.length == 0 || !value.fixed)
            return null;
        return view.textDirection == Direction.LTR
            ? { left: value.dom.offsetWidth * view.scaleX }
            : { right: value.dom.offsetWidth * view.scaleX };
    }),
});
function asArray(val) {
    return (Array.isArray(val) ? val : [val]);
}
function advanceCursor(cursor, collect, pos) {
    while (cursor.value && cursor.from <= pos) {
        if (cursor.from == pos)
            collect.push(cursor.value);
        cursor.next();
    }
}
class UpdateContext {
    constructor(gutter, viewport, height) {
        this.gutter = gutter;
        this.height = height;
        this.i = 0;
        this.cursor = RangeSet.iter(gutter.markers, viewport.from);
    }
    addElement(view, block, markers) {
        let { gutter } = this, above = (block.top - this.height) / view.scaleY, height = block.height / view.scaleY;
        if (this.i == gutter.elements.length) {
            let newElt = new GutterElement(view, height, above, markers);
            gutter.elements.push(newElt);
            gutter.dom.appendChild(newElt.dom);
        }
        else {
            gutter.elements[this.i].update(view, height, above, markers);
        }
        this.height = block.bottom;
        this.i++;
    }
    line(view, line, extraMarkers) {
        let localMarkers = [];
        advanceCursor(this.cursor, localMarkers, line.from);
        if (extraMarkers.length)
            localMarkers = localMarkers.concat(extraMarkers);
        let forLine = this.gutter.config.lineMarker(view, line, localMarkers);
        if (forLine)
            localMarkers.unshift(forLine);
        let gutter = this.gutter;
        if (localMarkers.length == 0 && !gutter.config.renderEmptyElements)
            return;
        this.addElement(view, line, localMarkers);
    }
    widget(view, block) {
        let marker = this.gutter.config.widgetMarker(view, block.widget, block), markers = marker ? [marker] : null;
        for (let cls of view.state.facet(gutterWidgetClass)) {
            let marker = cls(view, block.widget, block);
            if (marker)
                (markers || (markers = [])).push(marker);
        }
        if (markers)
            this.addElement(view, block, markers);
    }
    finish() {
        let gutter = this.gutter;
        while (gutter.elements.length > this.i) {
            let last = gutter.elements.pop();
            gutter.dom.removeChild(last.dom);
            last.destroy();
        }
    }
}
class SingleGutterView {
    constructor(view, config) {
        this.view = view;
        this.config = config;
        this.elements = [];
        this.spacer = null;
        this.dom = document.createElement("div");
        this.dom.className =
            "cm-gutter" + (this.config.class ? " " + this.config.class : "");
        for (let prop in config.domEventHandlers) {
            this.dom.addEventListener(prop, (event) => {
                let target = event.target, y;
                if (target != this.dom && this.dom.contains(target)) {
                    while (target.parentNode != this.dom)
                        target = target.parentNode;
                    let rect = target.getBoundingClientRect();
                    y = (rect.top + rect.bottom) / 2;
                }
                else {
                    y = event.clientY;
                }
                let line = view.lineBlockAtHeight(y - view.documentTop);
                if (config.domEventHandlers[prop](view, line, event))
                    event.preventDefault();
            });
        }
        this.markers = asArray(config.markers(view));
        if (config.initialSpacer) {
            this.spacer = new GutterElement(view, 0, 0, [
                config.initialSpacer(view),
            ]);
            this.dom.appendChild(this.spacer.dom);
            this.spacer.dom.style.cssText +=
                "visibility: hidden; pointer-events: none";
        }
    }
    update(update) {
        let prevMarkers = this.markers;
        this.markers = asArray(this.config.markers(update.view));
        if (this.spacer && this.config.updateSpacer) {
            let updated = this.config.updateSpacer(this.spacer.markers[0], update);
            if (updated != this.spacer.markers[0])
                this.spacer.update(update.view, 0, 0, [updated]);
        }
        let vp = update.view.viewport;
        return (!RangeSet.eq(this.markers, prevMarkers, vp.from, vp.to) ||
            (this.config.lineMarkerChange
                ? this.config.lineMarkerChange(update)
                : false));
    }
    destroy() {
        for (let elt of this.elements)
            elt.destroy();
    }
}
class GutterElement {
    constructor(view, height, above, markers) {
        this.height = -1;
        this.above = 0;
        this.markers = [];
        this.dom = document.createElement("div");
        this.dom.className = "cm-gutterElement";
        this.update(view, height, above, markers);
    }
    update(view, height, above, markers) {
        if (this.height != height) {
            this.height = height;
            this.dom.style.height = height + "px";
        }
        if (this.above != above)
            this.dom.style.marginTop = (this.above = above) ? above + "px" : "";
        if (!sameMarkers(this.markers, markers))
            this.setMarkers(view, markers);
    }
    setMarkers(view, markers) {
        let cls = "cm-gutterElement", domPos = this.dom.firstChild;
        for (let iNew = 0, iOld = 0;;) {
            let skipTo = iOld, marker = iNew < markers.length ? markers[iNew++] : null, matched = false;
            if (marker) {
                let c = marker.elementClass;
                if (c)
                    cls += " " + c;
                for (let i = iOld; i < this.markers.length; i++)
                    if (this.markers[i].compare(marker)) {
                        skipTo = i;
                        matched = true;
                        break;
                    }
            }
            else {
                skipTo = this.markers.length;
            }
            while (iOld < skipTo) {
                let next = this.markers[iOld++];
                if (next.toDOM) {
                    next.destroy(domPos);
                    let after = domPos.nextSibling;
                    domPos.remove();
                    domPos = after;
                }
            }
            if (!marker)
                break;
            if (marker.toDOM) {
                if (matched)
                    domPos = domPos.nextSibling;
                else
                    this.dom.insertBefore(marker.toDOM(view), domPos);
            }
            if (matched)
                iOld++;
        }
        this.dom.className = cls;
        this.markers = markers;
    }
    destroy() {
        this.setMarkers(null, []); // First argument not used unless creating markers
    }
}
function sameMarkers(a, b) {
    if (a.length != b.length)
        return false;
    for (let i = 0; i < a.length; i++)
        if (!a[i].compare(b[i]))
            return false;
    return true;
}
/// Facet used to provide markers to the line number gutter.
export const lineNumberMarkers = Facet.define();
/// Facet used to create markers in the line number gutter next to widgets.
export const lineNumberWidgetMarker = Facet.define();
const lineNumberConfig = Facet.define({
    combine(values) {
        return combineConfig(values, { formatNumber: String, domEventHandlers: {} }, {
            domEventHandlers(a, b) {
                let result = Object.assign({}, a);
                for (let event in b) {
                    let exists = result[event], add = b[event];
                    result[event] = exists
                        ? (view, line, event) => exists(view, line, event) ||
                            add(view, line, event)
                        : add;
                }
                return result;
            },
        });
    },
});
class NumberMarker extends GutterMarker {
    constructor(number) {
        super();
        this.number = number;
    }
    eq(other) {
        return this.number == other.number;
    }
    toDOM() {
        return document.createTextNode(this.number);
    }
}
function formatNumber(view, number) {
    return view.state.facet(lineNumberConfig).formatNumber(number, view.state);
}
const lineNumberGutter = activeGutters.compute([lineNumberConfig], (state) => ({
    class: "cm-lineNumbers",
    renderEmptyElements: false,
    markers(view) {
        return view.state.facet(lineNumberMarkers);
    },
    lineMarker(view, line, others) {
        if (others.some((m) => m.toDOM))
            return null;
        return new NumberMarker(formatNumber(view, view.state.doc.lineAt(line.from).number));
    },
    widgetMarker: (view, widget, block) => {
        for (let m of view.state.facet(lineNumberWidgetMarker)) {
            let result = m(view, widget, block);
            if (result)
                return result;
        }
        return null;
    },
    lineMarkerChange: (update) => update.startState.facet(lineNumberConfig) !=
        update.state.facet(lineNumberConfig),
    initialSpacer(view) {
        return new NumberMarker(formatNumber(view, maxLineNumber(view.state.doc.lines)));
    },
    updateSpacer(spacer, update) {
        let max = formatNumber(update.view, maxLineNumber(update.view.state.doc.lines));
        return max == spacer.number
            ? spacer
            : new NumberMarker(max);
    },
    domEventHandlers: state.facet(lineNumberConfig).domEventHandlers,
}));
/// Create a line number gutter extension.
export function lineNumbers(config = {}) {
    return [lineNumberConfig.of(config), gutters(), lineNumberGutter];
}
function maxLineNumber(lines) {
    let last = 9;
    while (last < lines)
        last = last * 10 + 9;
    return last;
}
const activeLineGutterMarker = new (class extends GutterMarker {
    constructor() {
        super(...arguments);
        this.elementClass = "cm-activeLineGutter";
    }
})();
const activeLineGutterHighlighter = gutterLineClass.compute(["selection"], (state) => {
    let marks = [], last = -1;
    for (let range of state.selection.ranges) {
        let linePos = state.doc.lineAt(range.head).from;
        if (linePos > last) {
            last = linePos;
            marks.push(activeLineGutterMarker.range(linePos));
        }
    }
    return RangeSet.of(marks);
});
/// Returns an extension that adds a `cm-activeLineGutter` class to
/// all gutter elements on the [active
/// line](#view.highlightActiveLine).
export function highlightActiveLineGutter() {
    return activeLineGutterHighlighter;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5kZWQtZ3V0dGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXh0ZW5kZWQtZ3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFDTixhQUFhLEVBQ2IsT0FBTyxFQUNQLEtBQUssRUFHTCxVQUFVLEVBQ1YsUUFBUSxHQUVSLE1BQU0sbUJBQW1CLENBQUM7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxrQkFBa0IsQ0FBQztBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFjLE1BQU0sa0JBQWtCLENBQUM7QUFFekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRTdDLHNFQUFzRTtBQUN0RSxxRUFBcUU7QUFDckUsVUFBVTtBQUNWLE1BQU0sT0FBZ0IsWUFBYSxTQUFRLFVBQVU7SUFDcEQsYUFBYTtJQUNiLE9BQU8sQ0FBQyxLQUFtQjtRQUMxQixPQUFPLENBQ04sSUFBSSxJQUFJLEtBQUs7WUFDYixDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQ3pELENBQUM7SUFDSCxDQUFDO0lBRUQsMkRBQTJEO0lBQzNELEVBQUUsQ0FBQyxLQUFtQjtRQUNyQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFTRCxvRUFBb0U7SUFDcEUsOEJBQThCO0lBQzlCLE9BQU8sQ0FBQyxHQUFTLElBQUcsQ0FBQztDQUNyQjtBQUVELFlBQVksQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztBQUN6QyxZQUFZLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7QUFDekMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUNyRCxZQUFZLENBQUMsU0FBUyxD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QUMsSUFBSSxDQUFDO1FBQ2hELElBQUksT0FBTyxHQUFHLElBQUksRUFBRTtZQUNuQixJQUFJLEdBQUcsT0FBTyxDQUFDO1lBQ2YsS0FBSyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNsRDtLQUNEO0lBQ0QsT0FBTyxRQUFRLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FDRCxDQUFDO0FBRUYsbUVBQW1FO0FBQ25FLHNDQUFzQztBQUN0QyxxQ0FBcUM7QUFDckMsTUFBTSxVQUFVLHlCQUF5QjtJQUN4QyxPQUFPLDJCQUEyQixDQUFDO0FBQ3BDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG5cdGNvbWJpbmVDb25maWcsXHJcblx0TWFwTW9kZSxcclxuXHRGYWNldCxcclxuXHRFeHRlbnNpb24sXHJcblx0RWRpdG9yU3RhdGUsXHJcblx0UmFuZ2VWYWx1ZSxcclxuXHRSYW5nZVNldCxcclxuXHRSYW5nZUN1cnNvcixcclxufSBmcm9tIFwiQGNvZGVtaXJyb3Ivc3RhdGVcIjtcclxuaW1wb3J0IHsgRWRpdG9yVmlldyB9IGZyb20gXCJAY29kZW1pcnJvci92aWV3XCI7XHJcbmltcG9ydCB7IFZpZXdQbHVnaW4sIFZpZXdVcGRhdGUgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBCbG9ja1R5cGUsIFdpZGdldFR5cGUgfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBCbG9ja0luZm8gfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5pbXBvcnQgeyBEaXJlY3Rpb24gfSBmcm9tIFwiQGNvZGVtaXJyb3Ivdmlld1wiO1xyXG5cclxuLy8vIEEgZ3V0dGVyIG1hcmtlciByZXByZXNlbnRzIGEgYml0IG9mIGluZm9ybWF0aW9uIGF0dGFjaGVkIHRvIGEgbGluZVxyXG4vLy8gaW4gYSBzcGVjaWZpYyBndXR0ZXIuIFlvdXIgb3duIGN1c3RvbSBtYXJrZXJzIGhhdmUgdG8gZXh0ZW5kIHRoaXNcclxuLy8vIGNsYXNzLlxyXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgR3V0dGVyTWFya2VyIGV4dGVuZHMgUmFuZ2VWYWx1ZSB7XHJcblx0Ly8vIEBpbnRlcm5hbFxyXG5cdGNvbXBhcmUob3RoZXI6IEd1dHRlck1hcmtlcikge1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0dGhpcyA9PSBvdGhlciB8fFxyXG5cdFx0XHQodGhpcy5jb25zdHJ1Y3RvciA9PSBvdGhlci5jb25zdHJ1Y3RvciAmJiB0aGlzLmVxKG90aGVyKSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvLy8gQ29tcGFyZSB0aGlzIG1hcmtlciB0byBhbm90aGVyIG1hcmtlciBvZiB0aGUgc2FtZSB0eXBlLlxyXG5cdGVxKG90aGVyOiBHdXR0ZXJNYXJrZXIpOiBib29sZWFuIHtcclxuXHRcdHJldHVybiBmYWxzZTtcclxuXHR9XHJcblxyXG5cdC8vLyBSZW5kZXIgdGhlIERPTSBub2RlIGZvciB0aGlzIG1hcmtlciwgaWYgYW55LlxyXG5cdHRvRE9NPyh2aWV3OiBFZGl0b3JWaWV3KTogTm9kZTtcclxuXHJcblx0Ly8vIFRoaXMgcHJvcGVydHkgY2FuIGJlIHVzZWQgdG8gYWRkIENTUyBjbGFzc2VzIHRvIHRoZSBndXR0ZXJcclxuXHQvLy8gZWxlbWVudCB0aGF0IGNvbnRhaW5zIHRoaXMgbWFya2VyLlxyXG5cdGRlY2xhcmUgZWxlbWVudENsYXNzOiBzdHJpbmc7XHJcblxyXG5cdC8vLyBDYWxsZWQgaWYgdGhlIG1hcmtlciBoYXMgYSBgdG9ET01gIG1ldGhvZCBhbmQgaXRzIHJlcHJlc2VudGF0aW9uXHJcblx0Ly8vIHdhcyByZW1vdmVkIGZyb20gYSBndXR0ZXIuXHJcblx0ZGVzdHJveShkb206IE5vZGUpIHt9XHJcbn1cclxuXHJcbkd1dHRlck1hcmtlci5wcm90b3R5cGUuZWxlbWVudENsYXNzID0gXCJcIjtcclxuR3V0dGVyTWFya2VyLnByb3RvdHlwZS50b0RPTSA9IHVuZGVmaW5lZDtcclxuR3V0dGVyTWFya2VyLnByb3RvdHlwZS5tYXBNb2RlID0gTWFwTW9kZS5UcmFja0JlZm9yZTtcclxuR3V0dGVyTWFya2VyLnByb3RvdHlwZS5zdGFydFNpZGUgPSBHdXR0ZXJNYXJrZXIucHJvdG90eXBlLmVuZFNpZGUgPSAtMTtcclxuR3V0dGVyTWFya2VyLnByb3RvdHlwZS5wb2ludCA9IHRydWU7XHJcblxyXG4vLy8gRmFjZXQgdXNlZCB0byBhZGQgYSBjbGFzcyB0byBhbGwgZ3V0dGVyIGVsZW1lbnRzIGZvciBhIGdpdmVuIGxpbmUuXHJcbi8vLyBNYXJrZXJzIGdpdmVuIHRvIHRoaXMgZmFjZXQgc2hvdWxkIF9vbmx5XyBkZWZpbmUgYW5cclxuLy8vIFtgZWxlbWVudGNsYXNzYF0oI3ZpZXcuR3V0dGVyTWFya2VyLmVsZW1lbnRDbGFzcyksIG5vdCBhXHJcbi8vLyBbYHRvRE9NYF0oI3ZpZXcuR3V0dGVyTWFya2VyLnRvRE9NKSAob3IgdGhlIG1hcmtlciB3aWxsIGFwcGVhclxyXG4vLy8gaW4gYWxsIGd1dHRlcnMgZm9yIHRoZSBsaW5lKS5cclxuZXhwb3J0IGNvbnN0IGd1dHRlckxpbmVDbGFzcyA9IEZhY2V0LmRlZmluZTxSYW5nZVNldDxHdXR0ZXJNYXJrZXI+PigpO1xyXG5cclxuLy8vIEZhY2V0IHVzZWQgdG8gYWRkIGEgY2xhc3MgdG8gYWxsIGd1dHRlciBlbGVtZW50cyBuZXh0IHRvIGEgd2lkZ2V0LlxyXG4vLy8gU2hvdWxkIG5vdCBwcm92aWRlIHdpZGdldHMgd2l0aCBhIGB0b0RPTWAgbWV0aG9kLlxyXG5leHBvcnQgY29uc3QgZ3V0dGVyV2lkZ2V0Q2xhc3MgPVxyXG5cdEZhY2V0LmRlZmluZTxcclxuXHRcdChcclxuXHRcdFx0dmlldzogRWRpdG9yVmlldyxcclxuXHRcdFx0d2lkZ2V0OiBXaWRnZXRUeXBlLFxyXG5cdFx0XHRibG9jazogQmxvY2tJbmZvXHJcblx0XHQpID0+IEd1dHRlck1hcmtlciB8IG51bGxcclxuXHQ+KCk7XHJcblxyXG50eXBlIEhhbmRsZXJzID0ge1xyXG5cdFtldmVudDogc3RyaW5nXTogKFxyXG5cdFx0dmlldzogRWRpdG9yVmlldyxcclxuXHRcdGxpbmU6IEJsb2NrSW5mbyxcclxuXHRcdGV2ZW50OiBFdmVudFxyXG5cdCkgPT4gYm9vbGVhbjtcclxufTtcclxuXHJcbmludGVyZmFjZSBHdXR0ZXJDb25maWcge1xyXG5cdC8vLyBBbiBleHRyYSBDU1MgY2xhc3MgdG8gYmUgYWRkZWQgdG8gdGhlIHdyYXBwZXIgKGBjbS1ndXR0ZXJgKVxyXG5cdC8vLyBlbGVtZW50LlxyXG5cdGNsYXNzPzogc3RyaW5nO1xyXG5cdC8vLyBDb250cm9scyB3aGV0aGVyIGVtcHR5IGd1dHRlciBlbGVtZW50cyBzaG91bGQgYmUgcmVuZGVyZWQuXHJcblx0Ly8vIERlZmF1bHRzIHRvIGZhbHNlLlxyXG5cdHJlbmRlckVtcHR5RWxlbWVudHM/OiBib29sZWFuO1xyXG5cdC8vLyBSZXRyaWV2ZSBhIHNldCBvZiBtYXJrZXJzIHRvIHVzZSBpbiB0aGlzIGd1dHRlci5cclxuXHRtYXJrZXJzPzogKFxyXG5cdFx0dmlldzogRWRpdG9yVmlld1xyXG5cdCkgPT4gUmFuZ2VTZXQ8R3V0dGVyTWFya2VyPiB8IHJlYWRvbmx5IFJhbmdlU2V0PEd1dHRlck1hcmtlcj5bXTtcclxuXHQvLy8gQ2FuIGJlIHVzZWQgdG8gb3B0aW9uYWxseSBhZGQgYSBzaW5nbGUgbWFya2VyIHRvIGV2ZXJ5IGxpbmUuXHJcblx0bGluZU1hcmtlcj86IChcclxuXHRcdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRsaW5lOiBCbG9ja0luZm8sXHJcblx0XHRvdGhlck1hcmtlcnM6IHJlYWRvbmx5IEd1dHRlck1hcmtlcltdXHJcblx0KSA9PiBHdXR0ZXJNYXJrZXIgfCBudWxsO1xyXG5cdC8vLyBBc3NvY2lhdGUgbWFya2VycyB3aXRoIGJsb2NrIHdpZGdldHMgaW4gdGhlIGRvY3VtZW50LlxyXG5cdHdpZGdldE1hcmtlcj86IChcclxuXHRcdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHR3aWRnZXQ6IFdpZGdldFR5cGUsXHJcblx0XHRibG9jazogQmxvY2tJbmZvXHJcblx0KSA9PiBHdXR0ZXJNYXJrZXIgfCBudWxsO1xyXG5cdC8vLyBJZiBsaW5lIG9yIHdpZGdldCBtYXJrZXJzIGRlcGVuZCBvbiBhZGRpdGlvbmFsIHN0YXRlLCBhbmQgc2hvdWxkXHJcblx0Ly8vIGJlIHVwZGF0ZWQgd2hlbiB0aGF0IGNoYW5nZXMsIHBhc3MgYSBwcmVkaWNhdGUgaGVyZSB0aGF0IGNoZWNrc1xyXG5cdC8vLyB3aGV0aGVyIGEgZ2l2ZW4gdmlldyB1cGRhdGUgbWlnaHQgY2hhbmdlIHRoZSBsaW5lIG1hcmtlcnMuXHJcblx0bGluZU1hcmtlckNoYW5nZT86IG51bGwgfCAoKHVwZGF0ZTogVmlld1VwZGF0ZSkgPT4gYm9vbGVhbik7XHJcblx0Ly8vIEFkZCBhIGhpZGRlbiBzcGFjZXIgZWxlbWVudCB0aGF0IGdpdmVzIHRoZSBndXR0ZXIgaXRzIGJhc2VcclxuXHQvLy8gd2lkdGguXHJcblx0aW5pdGlhbFNwYWNlcj86IG51bGwgfCAoKHZpZXc6IEVkaXRvclZpZXcpID0+IEd1dHRlck1hcmtlcik7XHJcblx0Ly8vIFVwZGF0ZSB0aGUgc3BhY2VyIGVsZW1lbnQgd2hlbiB0aGUgdmlldyBpcyB1cGRhdGVkLlxyXG5cdHVwZGF0ZVNwYWNlcj86XHJcblx0XHR8IG51bGxcclxuXHRcdHwgKChzcGFjZXI6IEd1dHRlck1hcmtlciwgdXBkYXRlOiBWaWV3VXBkYXRlKSA9PiBHdXR0ZXJNYXJrZXIpO1xyXG5cdC8vLyBTdXBwbHkgZXZlbnQgaGFuZGxlcnMgZm9yIERPTSBldmVudHMgb24gdGhpcyBndXR0ZXIuXHJcblx0ZG9tRXZlbnRIYW5kbGVycz86IEhhbmRsZXJzO1xyXG59XHJcblxyXG5jb25zdCBkZWZhdWx0cyA9IHtcclxuXHRjbGFzczogXCJcIixcclxuXHRyZW5kZXJFbXB0eUVsZW1lbnRzOiBmYWxzZSxcclxuXHRlbGVtZW50U3R5bGU6IFwiXCIsXHJcblx0bWFya2VyczogKCkgPT4gUmFuZ2VTZXQuZW1wdHksXHJcblx0bGluZU1hcmtlcjogKCkgPT4gbnVsbCxcclxuXHR3aWRnZXRNYXJrZXI6ICgpID0+IG51bGwsXHJcblx0bGluZU1hcmtlckNoYW5nZTogbnVsbCxcclxuXHRpbml0aWFsU3BhY2VyOiBudWxsLFxyXG5cdHVwZGF0ZVNwYWNlcjogbnVsbCxcclxuXHRkb21FdmVudEhhbmRsZXJzOiB7fSxcclxufTtcclxuXHJcbmNvbnN0IGFjdGl2ZUd1dHRlcnMgPSBGYWNldC5kZWZpbmU8UmVxdWlyZWQ8R3V0dGVyQ29uZmlnPj4oKTtcclxuXHJcbi8vLyBEZWZpbmUgYW4gZWRpdG9yIGd1dHRlci4gVGhlIG9yZGVyIGluIHdoaWNoIHRoZSBndXR0ZXJzIGFwcGVhciBpc1xyXG4vLy8gZGV0ZXJtaW5lZCBieSB0aGVpciBleHRlbnNpb24gcHJpb3JpdHkuXHJcbmV4cG9ydCBmdW5jdGlvbiBndXR0ZXIoY29uZmlnOiBHdXR0ZXJDb25maWcpOiBFeHRlbnNpb24ge1xyXG5cdHJldHVybiBbZ3V0dGVycygpLCBhY3RpdmVHdXR0ZXJzLm9mKHsgLi4uZGVmYXVsdHMsIC4uLmNvbmZpZyB9KV07XHJcbn1cclxuXHJcbmNvbnN0IHVuZml4R3V0dGVycyA9IEZhY2V0LmRlZmluZTxib29sZWFuLCBib29sZWFuPih7XHJcblx0Y29tYmluZTogKHZhbHVlcykgPT4gdmFsdWVzLnNvbWUoKHgpID0+IHgpLFxyXG59KTtcclxuXHJcbi8vLyBUaGUgZ3V0dGVyLWRyYXdpbmcgcGx1Z2luIGlzIGF1dG9tYXRpY2FsbHkgZW5hYmxlZCB3aGVuIHlvdSBhZGQgYVxyXG4vLy8gZ3V0dGVyLCBidXQgeW91IGNhbiB1c2UgdGhpcyBmdW5jdGlvbiB0byBleHBsaWNpdGx5IGNvbmZpZ3VyZSBpdC5cclxuLy8vXHJcbi8vLyBVbmxlc3MgYGZpeGVkYCBpcyBleHBsaWNpdGx5IHNldCB0byBgZmFsc2VgLCB0aGUgZ3V0dGVycyBhcmVcclxuLy8vIGZpeGVkLCBtZWFuaW5nIHRoZXkgZG9uJ3Qgc2Nyb2xsIGFsb25nIHdpdGggdGhlIGNvbnRlbnRcclxuLy8vIGhvcml6b250YWxseSAoZXhjZXB0IG9uIEludGVybmV0IEV4cGxvcmVyLCB3aGljaCBkb2Vzbid0IHN1cHBvcnRcclxuLy8vIENTUyBbYHBvc2l0aW9uOlxyXG4vLy8gc3RpY2t5YF0oaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQ1NTL3Bvc2l0aW9uI3N0aWNreSkpLlxyXG5leHBvcnQgZnVuY3Rpb24gZ3V0dGVycyhjb25maWc/OiB7IGZpeGVkPzogYm9vbGVhbiB9KTogRXh0ZW5zaW9uIHtcclxuXHRsZXQgcmVzdWx0OiBFeHRlbnNpb25bXSA9IFtndXR0ZXJWaWV3XTtcclxuXHRpZiAoY29uZmlnICYmIGNvbmZpZy5maXhlZCA9PT0gZmFsc2UpIHJlc3VsdC5wdXNoKHVuZml4R3V0dGVycy5vZih0cnVlKSk7XHJcblx0cmV0dXJuIHJlc3VsdDtcclxufVxyXG5cclxuY29uc3QgZ3V0dGVyVmlldyA9IFZpZXdQbHVnaW4uZnJvbUNsYXNzKFxyXG5cdGNsYXNzIHtcclxuXHRcdGd1dHRlcnM6IFNpbmdsZUd1dHRlclZpZXdbXTtcclxuXHRcdGRvbTogSFRNTEVsZW1lbnQ7XHJcblx0XHRmaXhlZDogYm9vbGVhbjtcclxuXHRcdHByZXZWaWV3cG9ydDogeyBmcm9tOiBudW1iZXI7IHRvOiBudW1iZXIgfTtcclxuXHJcblx0XHRjb25zdHJ1Y3RvcihyZWFkb25seSB2aWV3OiBFZGl0b3JWaWV3KSB7XHJcblx0XHRcdHRoaXMucHJldlZpZXdwb3J0ID0gdmlldy52aWV3cG9ydDtcclxuXHRcdFx0dGhpcy5kb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0XHR0aGlzLmRvbS5jbGFzc05hbWUgPSBcImNtLWd1dHRlcnMgdGFzay1ndXR0ZXJcIjtcclxuXHRcdFx0dGhpcy5kb20uc2V0QXR0cmlidXRlKFwiYXJpYS1oaWRkZW5cIiwgXCJ0cnVlXCIpO1xyXG5cdFx0XHR0aGlzLmRvbS5zdHlsZS5taW5IZWlnaHQgPVxyXG5cdFx0XHRcdHRoaXMudmlldy5jb250ZW50SGVpZ2h0IC8gdGhpcy52aWV3LnNjYWxlWSArIFwicHhcIjtcclxuXHRcdFx0dGhpcy5ndXR0ZXJzID0gdmlldy5zdGF0ZVxyXG5cdFx0XHRcdC5mYWNldChhY3RpdmVHdXR0ZXJzKVxyXG5cdFx0XHRcdC5tYXAoKGNvbmYpID0+IG5ldyBTaW5nbGVHdXR0ZXJWaWV3KHZpZXcsIGNvbmYpKTtcclxuXHRcdFx0Zm9yIChsZXQgZ3V0dGVyIG9mIHRoaXMuZ3V0dGVycykgdGhpcy5kb20uYXBwZW5kQ2hpbGQoZ3V0dGVyLmRvbSk7XHJcblx0XHRcdHRoaXMuZml4ZWQgPSAhdmlldy5zdGF0ZS5mYWNldCh1bmZpeEd1dHRlcnMpO1xyXG5cdFx0XHRpZiAodGhpcy5maXhlZCkge1xyXG5cdFx0XHRcdC8vIEZJWE1FIElFMTEgZmFsbGJhY2ssIHdoaWNoIGRvZXNuJ3Qgc3VwcG9ydCBwb3NpdGlvbjogc3RpY2t5LFxyXG5cdFx0XHRcdC8vIGJ5IHVzaW5nIHBvc2l0aW9uOiByZWxhdGl2ZSArIGV2ZW50IGhhbmRsZXJzIHRoYXQgcmVhbGlnbiB0aGVcclxuXHRcdFx0XHQvLyBndXR0ZXIgKG9yIGp1c3QgZm9yY2UgZml4ZWQ9ZmFsc2Ugb24gSUUxMT8pXHJcblx0XHRcdFx0dGhpcy5kb20uc3R5bGUucG9zaXRpb24gPSBcInN0aWNreVwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMuc3luY0d1dHRlcnMoZmFsc2UpO1xyXG5cdFx0XHRjb25zb2xlLmxvZyh2aWV3KTtcclxuXHRcdFx0dmlldy5jb250ZW50RE9NLnBhcmVudEVsZW1lbnQ/LmFwcGVuZENoaWxkKHRoaXMuZG9tKTtcclxuXHRcdH1cclxuXHJcblx0XHR1cGRhdGUodXBkYXRlOiBWaWV3VXBkYXRlKSB7XHJcblx0XHRcdGlmICh0aGlzLnVwZGF0ZUd1dHRlcnModXBkYXRlKSkge1xyXG5cdFx0XHRcdC8vIERldGFjaCBkdXJpbmcgc3luYyB3aGVuIHRoZSB2aWV3cG9ydCBjaGFuZ2VkIHNpZ25pZmljYW50bHlcclxuXHRcdFx0XHQvLyAoc3VjaCBhcyBkdXJpbmcgc2Nyb2xsaW5nKSwgc2luY2UgZm9yIGxhcmdlIHVwZGF0ZXMgdGhhdCBpc1xyXG5cdFx0XHRcdC8vIGZhc3Rlci5cclxuXHRcdFx0XHRsZXQgdnBBID0gdGhpcy5wcmV2Vmlld3BvcnQsXHJcblx0XHRcdFx0XHR2cEIgPSB1cGRhdGUudmlldy52aWV3cG9ydDtcclxuXHRcdFx0XHRsZXQgdnBPdmVybGFwID1cclxuXHRcdFx0XHRcdE1hdGgubWluKHZwQS50bywgdnBCLnRvKSAtIE1hdGgubWF4KHZwQS5mcm9tLCB2cEIuZnJvbSk7XHJcblx0XHRcdFx0dGhpcy5zeW5jR3V0dGVycyh2cE92ZXJsYXAgPCAodnBCLnRvIC0gdnBCLmZyb20pICogMC44KTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAodXBkYXRlLmdlb21ldHJ5Q2hhbmdlZCkge1xyXG5cdFx0XHRcdHRoaXMuZG9tLnN0eWxlLm1pbkhlaWdodCA9XHJcblx0XHRcdFx0XHR0aGlzLnZpZXcuY29udGVudEhlaWdodCAvIHRoaXMudmlldy5zY2FsZVkgKyBcInB4XCI7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHRoaXMudmlldy5zdGF0ZS5mYWNldCh1bmZpeEd1dHRlcnMpICE9ICF0aGlzLmZpeGVkKSB7XHJcblx0XHRcdFx0dGhpcy5maXhlZCA9ICF0aGlzLmZpeGVkO1xyXG5cdFx0XHRcdHRoaXMuZG9tLnN0eWxlLnBvc2l0aW9uID0gdGhpcy5maXhlZCA/IFwic3RpY2t5XCIgOiBcIlwiO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoaXMucHJldlZpZXdwb3J0ID0gdXBkYXRlLnZpZXcudmlld3BvcnQ7XHJcblx0XHR9XHJcblxyXG5cdFx0c3luY0d1dHRlcnMoZGV0YWNoOiBib29sZWFuKSB7XHJcblx0XHRcdGxldCBhZnRlciA9IHRoaXMuZG9tLm5leHRTaWJsaW5nO1xyXG5cdFx0XHRpZiAoZGV0YWNoKSB0aGlzLmRvbS5yZW1vdmUoKTtcclxuXHRcdFx0bGV0IGxpbmVDbGFzc2VzID0gUmFuZ2VTZXQuaXRlcihcclxuXHRcdFx0XHR0aGlzLnZpZXcuc3RhdGUuZmFjZXQoZ3V0dGVyTGluZUNsYXNzKSxcclxuXHRcdFx0XHR0aGlzLnZpZXcudmlld3BvcnQuZnJvbVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRsZXQgY2xhc3NTZXQ6IEd1dHRlck1hcmtlcltdID0gW107XHJcblx0XHRcdGxldCBjb250ZXh0cyA9IHRoaXMuZ3V0dGVycy5tYXAoXHJcblx0XHRcdFx0KGd1dHRlcikgPT5cclxuXHRcdFx0XHRcdG5ldyBVcGRhdGVDb250ZXh0KFxyXG5cdFx0XHRcdFx0XHRndXR0ZXIsXHJcblx0XHRcdFx0XHRcdHRoaXMudmlldy52aWV3cG9ydCxcclxuXHRcdFx0XHRcdFx0LXRoaXMudmlldy5kb2N1bWVudFBhZGRpbmcudG9wXHJcblx0XHRcdFx0XHQpXHJcblx0XHRcdCk7XHJcblx0XHRcdGZvciAobGV0IGxpbmUgb2YgdGhpcy52aWV3LnZpZXdwb3J0TGluZUJsb2Nrcykge1xyXG5cdFx0XHRcdGlmIChjbGFzc1NldC5sZW5ndGgpIGNsYXNzU2V0ID0gW107XHJcblx0XHRcdFx0aWYgKEFycmF5LmlzQXJyYXkobGluZS50eXBlKSkge1xyXG5cdFx0XHRcdFx0bGV0IGZpcnN0ID0gdHJ1ZTtcclxuXHRcdFx0XHRcdGZvciAobGV0IGIgb2YgbGluZS50eXBlKSB7XHJcblx0XHRcdFx0XHRcdGlmIChiLnR5cGUgPT0gQmxvY2tUeXBlLlRleHQgJiYgZmlyc3QpIHtcclxuXHRcdFx0XHRcdFx0XHRhZHZhbmNlQ3Vyc29yKGxpbmVDbGFzc2VzLCBjbGFzc1NldCwgYi5mcm9tKTtcclxuXHRcdFx0XHRcdFx0XHRmb3IgKGxldCBjeCBvZiBjb250ZXh0cylcclxuXHRcdFx0XHRcdFx0XHRcdGN4LmxpbmUodGhpcy52aWV3LCBiLCBjbGFzc1NldCk7XHJcblx0XHRcdFx0XHRcdFx0Zmlyc3QgPSBmYWxzZTtcclxuXHRcdFx0XHRcdFx0fSBlbHNlIGlmIChiLndpZGdldCkge1xyXG5cdFx0XHRcdFx0XHRcdGZvciAobGV0IGN4IG9mIGNvbnRleHRzKSBjeC53aWRnZXQodGhpcy52aWV3LCBiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH0gZWxzZSBpZiAobGluZS50eXBlID09IEJsb2NrVHlwZS5UZXh0KSB7XHJcblx0XHRcdFx0XHRhZHZhbmNlQ3Vyc29yKGxpbmVDbGFzc2VzLCBjbGFzc1NldCwgbGluZS5mcm9tKTtcclxuXHRcdFx0XHRcdGZvciAobGV0IGN4IG9mIGNvbnRleHRzKSBjeC5saW5lKHRoaXMudmlldywgbGluZSwgY2xhc3NTZXQpO1xyXG5cdFx0XHRcdH0gZWxzZSBpZiAobGluZS53aWRnZXQpIHtcclxuXHRcdFx0XHRcdGZvciAobGV0IGN4IG9mIGNvbnRleHRzKSBjeC53aWRnZXQodGhpcy52aWV3LCBsaW5lKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0Zm9yIChsZXQgY3ggb2YgY29udGV4dHMpIGN4LmZpbmlzaCgpO1xyXG5cdFx0XHRpZiAoZGV0YWNoKSB7XHJcblx0XHRcdFx0aWYgKGFmdGVyKSB7XHJcblx0XHRcdFx0XHR0aGlzLnZpZXcuY29udGVudERPTS5wYXJlbnRFbGVtZW50Py5pbnNlcnRCZWZvcmUoXHJcblx0XHRcdFx0XHRcdHRoaXMuZG9tLFxyXG5cdFx0XHRcdFx0XHRhZnRlclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy52aWV3LmNvbnRlbnRET00ucGFyZW50RWxlbWVudD8uYXBwZW5kQ2hpbGQodGhpcy5kb20pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdHVwZGF0ZUd1dHRlcnModXBkYXRlOiBWaWV3VXBkYXRlKSB7XHJcblx0XHRcdGxldCBwcmV2ID0gdXBkYXRlLnN0YXJ0U3RhdGUuZmFjZXQoYWN0aXZlR3V0dGVycyksXHJcblx0XHRcdFx0Y3VyID0gdXBkYXRlLnN0YXRlLmZhY2V0KGFjdGl2ZUd1dHRlcnMpO1xyXG5cdFx0XHRsZXQgY2hhbmdlID1cclxuXHRcdFx0XHR1cGRhdGUuZG9jQ2hhbmdlZCB8fFxyXG5cdFx0XHRcdHVwZGF0ZS5oZWlnaHRDaGFuZ2VkIHx8XHJcblx0XHRcdFx0dXBkYXRlLnZpZXdwb3J0Q2hhbmdlZCB8fFxyXG5cdFx0XHRcdCFSYW5nZVNldC5lcShcclxuXHRcdFx0XHRcdHVwZGF0ZS5zdGFydFN0YXRlLmZhY2V0KGd1dHRlckxpbmVDbGFzcyksXHJcblx0XHRcdFx0XHR1cGRhdGUuc3RhdGUuZmFjZXQoZ3V0dGVyTGluZUNsYXNzKSxcclxuXHRcdFx0XHRcdHVwZGF0ZS52aWV3LnZpZXdwb3J0LmZyb20sXHJcblx0XHRcdFx0XHR1cGRhdGUudmlldy52aWV3cG9ydC50b1xyXG5cdFx0XHRcdCk7XHJcblx0XHRcdGlmIChwcmV2ID09IGN1cikge1xyXG5cdFx0XHRcdGZvciAobGV0IGd1dHRlciBvZiB0aGlzLmd1dHRlcnMpXHJcblx0XHRcdFx0XHRpZiAoZ3V0dGVyLnVwZGF0ZSh1cGRhdGUpKSBjaGFuZ2UgPSB0cnVlO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGNoYW5nZSA9IHRydWU7XHJcblx0XHRcdFx0bGV0IGd1dHRlcnMgPSBbXTtcclxuXHRcdFx0XHRmb3IgKGxldCBjb25mIG9mIGN1cikge1xyXG5cdFx0XHRcdFx0bGV0IGtub3duID0gcHJldi5pbmRleE9mKGNvbmYpO1xyXG5cdFx0XHRcdFx0aWYgKGtub3duIDwgMCkge1xyXG5cdFx0XHRcdFx0XHRndXR0ZXJzLnB1c2gobmV3IFNpbmdsZUd1dHRlclZpZXcodGhpcy52aWV3LCBjb25mKSk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmd1dHRlcnNba25vd25dLnVwZGF0ZSh1cGRhdGUpO1xyXG5cdFx0XHRcdFx0XHRndXR0ZXJzLnB1c2godGhpcy5ndXR0ZXJzW2tub3duXSk7XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdGZvciAobGV0IGcgb2YgdGhpcy5ndXR0ZXJzKSB7XHJcblx0XHRcdFx0XHRnLmRvbS5yZW1vdmUoKTtcclxuXHRcdFx0XHRcdGlmIChndXR0ZXJzLmluZGV4T2YoZykgPCAwKSBnLmRlc3Ryb3koKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Zm9yIChsZXQgZyBvZiBndXR0ZXJzKSB0aGlzLmRvbS5hcHBlbmRDaGlsZChnLmRvbSk7XHJcblx0XHRcdFx0dGhpcy5ndXR0ZXJzID0gZ3V0dGVycztcclxuXHRcdFx0fVxyXG5cdFx0XHRyZXR1cm4gY2hhbmdlO1xyXG5cdFx0fVxyXG5cclxuXHRcdGRlc3Ryb3koKSB7XHJcblx0XHRcdGZvciAobGV0IHZpZXcgb2YgdGhpcy5ndXR0ZXJzKSB2aWV3LmRlc3Ryb3koKTtcclxuXHRcdFx0dGhpcy5kb20ucmVtb3ZlKCk7XHJcblx0XHR9XHJcblx0fSxcclxuXHR7XHJcblx0XHRwcm92aWRlOiAocGx1Z2luKSA9PlxyXG5cdFx0XHRFZGl0b3JWaWV3LnNjcm9sbE1hcmdpbnMub2YoKHZpZXcpID0+IHtcclxuXHRcdFx0XHRsZXQgdmFsdWUgPSB2aWV3LnBsdWdpbihwbHVnaW4pO1xyXG5cdFx0XHRcdGlmICghdmFsdWUgfHwgdmFsdWUuZ3V0dGVycy5sZW5ndGggPT0gMCB8fCAhdmFsdWUuZml4ZWQpXHJcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0XHRyZXR1cm4gdmlldy50ZXh0RGlyZWN0aW9uID09IERpcmVjdGlvbi5MVFJcclxuXHRcdFx0XHRcdD8geyBsZWZ0OiB2YWx1ZS5kb20ub2Zmc2V0V2lkdGggKiB2aWV3LnNjYWxlWCB9XHJcblx0XHRcdFx0XHQ6IHsgcmlnaHQ6IHZhbHVlLmRvbS5vZmZzZXRXaWR0aCAqIHZpZXcuc2NhbGVYIH07XHJcblx0XHRcdH0pLFxyXG5cdH1cclxuKTtcclxuXHJcbmZ1bmN0aW9uIGFzQXJyYXk8VD4odmFsOiBUIHwgcmVhZG9ubHkgVFtdKSB7XHJcblx0cmV0dXJuIChBcnJheS5pc0FycmF5KHZhbCkgPyB2YWwgOiBbdmFsXSkgYXMgcmVhZG9ubHkgVFtdO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZHZhbmNlQ3Vyc29yKFxyXG5cdGN1cnNvcjogUmFuZ2VDdXJzb3I8R3V0dGVyTWFya2VyPixcclxuXHRjb2xsZWN0OiBHdXR0ZXJNYXJrZXJbXSxcclxuXHRwb3M6IG51bWJlclxyXG4pIHtcclxuXHR3aGlsZSAoY3Vyc29yLnZhbHVlICYmIGN1cnNvci5mcm9tIDw9IHBvcykge1xyXG5cdFx0aWYgKGN1cnNvci5mcm9tID09IHBvcykgY29sbGVjdC5wdXNoKGN1cnNvci52YWx1ZSk7XHJcblx0XHRjdXJzb3IubmV4dCgpO1xyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgVXBkYXRlQ29udGV4dCB7XHJcblx0Y3Vyc29yOiBSYW5nZUN1cnNvcjxHdXR0ZXJNYXJrZXI+O1xyXG5cdGkgPSAwO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHJlYWRvbmx5IGd1dHRlcjogU2luZ2xlR3V0dGVyVmlldyxcclxuXHRcdHZpZXdwb3J0OiB7IGZyb206IG51bWJlcjsgdG86IG51bWJlciB9LFxyXG5cdFx0cHVibGljIGhlaWdodDogbnVtYmVyXHJcblx0KSB7XHJcblx0XHR0aGlzLmN1cnNvciA9IFJhbmdlU2V0Lml0ZXIoZ3V0dGVyLm1hcmtlcnMsIHZpZXdwb3J0LmZyb20pO1xyXG5cdH1cclxuXHJcblx0YWRkRWxlbWVudChcclxuXHRcdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRibG9jazogQmxvY2tJbmZvLFxyXG5cdFx0bWFya2VyczogcmVhZG9ubHkgR3V0dGVyTWFya2VyW11cclxuXHQpIHtcclxuXHRcdGxldCB7IGd1dHRlciB9ID0gdGhpcyxcclxuXHRcdFx0YWJvdmUgPSAoYmxvY2sudG9wIC0gdGhpcy5oZWlnaHQpIC8gdmlldy5zY2FsZVksXHJcblx0XHRcdGhlaWdodCA9IGJsb2NrLmhlaWdodCAvIHZpZXcuc2NhbGVZO1xyXG5cdFx0aWYgKHRoaXMuaSA9PSBndXR0ZXIuZWxlbWVudHMubGVuZ3RoKSB7XHJcblx0XHRcdGxldCBuZXdFbHQgPSBuZXcgR3V0dGVyRWxlbWVudCh2aWV3LCBoZWlnaHQsIGFib3ZlLCBtYXJrZXJzKTtcclxuXHRcdFx0Z3V0dGVyLmVsZW1lbnRzLnB1c2gobmV3RWx0KTtcclxuXHRcdFx0Z3V0dGVyLmRvbS5hcHBlbmRDaGlsZChuZXdFbHQuZG9tKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGd1dHRlci5lbGVtZW50c1t0aGlzLmldLnVwZGF0ZSh2aWV3LCBoZWlnaHQsIGFib3ZlLCBtYXJrZXJzKTtcclxuXHRcdH1cclxuXHRcdHRoaXMuaGVpZ2h0ID0gYmxvY2suYm90dG9tO1xyXG5cdFx0dGhpcy5pKys7XHJcblx0fVxyXG5cclxuXHRsaW5lKFxyXG5cdFx0dmlldzogRWRpdG9yVmlldyxcclxuXHRcdGxpbmU6IEJsb2NrSW5mbyxcclxuXHRcdGV4dHJhTWFya2VyczogcmVhZG9ubHkgR3V0dGVyTWFya2VyW11cclxuXHQpIHtcclxuXHRcdGxldCBsb2NhbE1hcmtlcnM6IEd1dHRlck1hcmtlcltdID0gW107XHJcblx0XHRhZHZhbmNlQ3Vyc29yKHRoaXMuY3Vyc29yLCBsb2NhbE1hcmtlcnMsIGxpbmUuZnJvbSk7XHJcblx0XHRpZiAoZXh0cmFNYXJrZXJzLmxlbmd0aClcclxuXHRcdFx0bG9jYWxNYXJrZXJzID0gbG9jYWxNYXJrZXJzLmNvbmNhdChleHRyYU1hcmtlcnMpO1xyXG5cdFx0bGV0IGZvckxpbmUgPSB0aGlzLmd1dHRlci5jb25maWcubGluZU1hcmtlcih2aWV3LCBsaW5lLCBsb2NhbE1hcmtlcnMpO1xyXG5cdFx0aWYgKGZvckxpbmUpIGxvY2FsTWFya2Vycy51bnNoaWZ0KGZvckxpbmUpO1xyXG5cclxuXHRcdGxldCBndXR0ZXIgPSB0aGlzLmd1dHRlcjtcclxuXHRcdGlmIChsb2NhbE1hcmtlcnMubGVuZ3RoID09IDAgJiYgIWd1dHRlci5jb25maWcucmVuZGVyRW1wdHlFbGVtZW50cylcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0dGhpcy5hZGRFbGVtZW50KHZpZXcsIGxpbmUsIGxvY2FsTWFya2Vycyk7XHJcblx0fVxyXG5cclxuXHR3aWRnZXQodmlldzogRWRpdG9yVmlldywgYmxvY2s6IEJsb2NrSW5mbykge1xyXG5cdFx0bGV0IG1hcmtlciA9IHRoaXMuZ3V0dGVyLmNvbmZpZy53aWRnZXRNYXJrZXIoXHJcblx0XHRcdFx0dmlldyxcclxuXHRcdFx0XHRibG9jay53aWRnZXQhLFxyXG5cdFx0XHRcdGJsb2NrXHJcblx0XHRcdCksXHJcblx0XHRcdG1hcmtlcnMgPSBtYXJrZXIgPyBbbWFya2VyXSA6IG51bGw7XHJcblx0XHRmb3IgKGxldCBjbHMgb2Ygdmlldy5zdGF0ZS5mYWNldChndXR0ZXJXaWRnZXRDbGFzcykpIHtcclxuXHRcdFx0bGV0IG1hcmtlciA9IGNscyh2aWV3LCBibG9jay53aWRnZXQhLCBibG9jayk7XHJcblx0XHRcdGlmIChtYXJrZXIpIChtYXJrZXJzIHx8IChtYXJrZXJzID0gW10pKS5wdXNoKG1hcmtlcik7XHJcblx0XHR9XHJcblx0XHRpZiAobWFya2VycykgdGhpcy5hZGRFbGVtZW50KHZpZXcsIGJsb2NrLCBtYXJrZXJzKTtcclxuXHR9XHJcblxyXG5cdGZpbmlzaCgpIHtcclxuXHRcdGxldCBndXR0ZXIgPSB0aGlzLmd1dHRlcjtcclxuXHRcdHdoaWxlIChndXR0ZXIuZWxlbWVudHMubGVuZ3RoID4gdGhpcy5pKSB7XHJcblx0XHRcdGxldCBsYXN0ID0gZ3V0dGVyLmVsZW1lbnRzLnBvcCgpITtcclxuXHRcdFx0Z3V0dGVyLmRvbS5yZW1vdmVDaGlsZChsYXN0LmRvbSk7XHJcblx0XHRcdGxhc3QuZGVzdHJveSgpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuY2xhc3MgU2luZ2xlR3V0dGVyVmlldyB7XHJcblx0ZG9tOiBIVE1MRWxlbWVudDtcclxuXHRlbGVtZW50czogR3V0dGVyRWxlbWVudFtdID0gW107XHJcblx0bWFya2VyczogcmVhZG9ubHkgUmFuZ2VTZXQ8R3V0dGVyTWFya2VyPltdO1xyXG5cdHNwYWNlcjogR3V0dGVyRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdHB1YmxpYyB2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdFx0cHVibGljIGNvbmZpZzogUmVxdWlyZWQ8R3V0dGVyQ29uZmlnPlxyXG5cdCkge1xyXG5cdFx0dGhpcy5kb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG5cdFx0dGhpcy5kb20uY2xhc3NOYW1lID1cclxuXHRcdFx0XCJjbS1ndXR0ZXJcIiArICh0aGlzLmNvbmZpZy5jbGFzcyA/IFwiIFwiICsgdGhpcy5jb25maWcuY2xhc3MgOiBcIlwiKTtcclxuXHRcdGZvciAobGV0IHByb3AgaW4gY29uZmlnLmRvbUV2ZW50SGFuZGxlcnMpIHtcclxuXHRcdFx0dGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcihwcm9wLCAoZXZlbnQ6IEV2ZW50KSA9PiB7XHJcblx0XHRcdFx0bGV0IHRhcmdldCA9IGV2ZW50LnRhcmdldCBhcyBIVE1MRWxlbWVudCxcclxuXHRcdFx0XHRcdHk7XHJcblx0XHRcdFx0aWYgKHRhcmdldCAhPSB0aGlzLmRvbSAmJiB0aGlzLmRvbS5jb250YWlucyh0YXJnZXQpKSB7XHJcblx0XHRcdFx0XHR3aGlsZSAodGFyZ2V0LnBhcmVudE5vZGUgIT0gdGhpcy5kb20pXHJcblx0XHRcdFx0XHRcdHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHRcdFx0bGV0IHJlY3QgPSB0YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdFx0XHR5ID0gKHJlY3QudG9wICsgcmVjdC5ib3R0b20pIC8gMjtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0eSA9IChldmVudCBhcyBNb3VzZUV2ZW50KS5jbGllbnRZO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRsZXQgbGluZSA9IHZpZXcubGluZUJsb2NrQXRIZWlnaHQoeSAtIHZpZXcuZG9jdW1lbnRUb3ApO1xyXG5cdFx0XHRcdGlmIChjb25maWcuZG9tRXZlbnRIYW5kbGVyc1twcm9wXSh2aWV3LCBsaW5lLCBldmVudCkpXHJcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHRoaXMubWFya2VycyA9IGFzQXJyYXkoY29uZmlnLm1hcmtlcnModmlldykpO1xyXG5cdFx0aWYgKGNvbmZpZy5pbml0aWFsU3BhY2VyKSB7XHJcblx0XHRcdHRoaXMuc3BhY2VyID0gbmV3IEd1dHRlckVsZW1lbnQodmlldywgMCwgMCwgW1xyXG5cdFx0XHRcdGNvbmZpZy5pbml0aWFsU3BhY2VyKHZpZXcpLFxyXG5cdFx0XHRdKTtcclxuXHRcdFx0dGhpcy5kb20uYXBwZW5kQ2hpbGQodGhpcy5zcGFjZXIuZG9tKTtcclxuXHRcdFx0dGhpcy5zcGFjZXIuZG9tLnN0eWxlLmNzc1RleHQgKz1cclxuXHRcdFx0XHRcInZpc2liaWxpdHk6IGhpZGRlbjsgcG9pbnRlci1ldmVudHM6IG5vbmVcIjtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHVwZGF0ZSh1cGRhdGU6IFZpZXdVcGRhdGUpIHtcclxuXHRcdGxldCBwcmV2TWFya2VycyA9IHRoaXMubWFya2VycztcclxuXHRcdHRoaXMubWFya2VycyA9IGFzQXJyYXkodGhpcy5jb25maWcubWFya2Vycyh1cGRhdGUudmlldykpO1xyXG5cdFx0aWYgKHRoaXMuc3BhY2VyICYmIHRoaXMuY29uZmlnLnVwZGF0ZVNwYWNlcikge1xyXG5cdFx0XHRsZXQgdXBkYXRlZCA9IHRoaXMuY29uZmlnLnVwZGF0ZVNwYWNlcihcclxuXHRcdFx0XHR0aGlzLnNwYWNlci5tYXJrZXJzWzBdLFxyXG5cdFx0XHRcdHVwZGF0ZVxyXG5cdFx0XHQpO1xyXG5cdFx0XHRpZiAodXBkYXRlZCAhPSB0aGlzLnNwYWNlci5tYXJrZXJzWzBdKVxyXG5cdFx0XHRcdHRoaXMuc3BhY2VyLnVwZGF0ZSh1cGRhdGUudmlldywgMCwgMCwgW3VwZGF0ZWRdKTtcclxuXHRcdH1cclxuXHRcdGxldCB2cCA9IHVwZGF0ZS52aWV3LnZpZXdwb3J0O1xyXG5cdFx0cmV0dXJuIChcclxuXHRcdFx0IVJhbmdlU2V0LmVxKHRoaXMubWFya2VycywgcHJldk1hcmtlcnMsIHZwLmZyb20sIHZwLnRvKSB8fFxyXG5cdFx0XHQodGhpcy5jb25maWcubGluZU1hcmtlckNoYW5nZVxyXG5cdFx0XHRcdD8gdGhpcy5jb25maWcubGluZU1hcmtlckNoYW5nZSh1cGRhdGUpXHJcblx0XHRcdFx0OiBmYWxzZSlcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHRkZXN0cm95KCkge1xyXG5cdFx0Zm9yIChsZXQgZWx0IG9mIHRoaXMuZWxlbWVudHMpIGVsdC5kZXN0cm95KCk7XHJcblx0fVxyXG59XHJcblxyXG5jbGFzcyBHdXR0ZXJFbGVtZW50IHtcclxuXHRkb206IEhUTUxFbGVtZW50O1xyXG5cdGhlaWdodDogbnVtYmVyID0gLTE7XHJcblx0YWJvdmU6IG51bWJlciA9IDA7XHJcblx0bWFya2VyczogcmVhZG9ubHkgR3V0dGVyTWFya2VyW10gPSBbXTtcclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdFx0aGVpZ2h0OiBudW1iZXIsXHJcblx0XHRhYm92ZTogbnVtYmVyLFxyXG5cdFx0bWFya2VyczogcmVhZG9ubHkgR3V0dGVyTWFya2VyW11cclxuXHQpIHtcclxuXHRcdHRoaXMuZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuXHRcdHRoaXMuZG9tLmNsYXNzTmFtZSA9IFwiY20tZ3V0dGVyRWxlbWVudFwiO1xyXG5cdFx0dGhpcy51cGRhdGUodmlldywgaGVpZ2h0LCBhYm92ZSwgbWFya2Vycyk7XHJcblx0fVxyXG5cclxuXHR1cGRhdGUoXHJcblx0XHR2aWV3OiBFZGl0b3JWaWV3LFxyXG5cdFx0aGVpZ2h0OiBudW1iZXIsXHJcblx0XHRhYm92ZTogbnVtYmVyLFxyXG5cdFx0bWFya2VyczogcmVhZG9ubHkgR3V0dGVyTWFya2VyW11cclxuXHQpIHtcclxuXHRcdGlmICh0aGlzLmhlaWdodCAhPSBoZWlnaHQpIHtcclxuXHRcdFx0dGhpcy5oZWlnaHQgPSBoZWlnaHQ7XHJcblx0XHRcdHRoaXMuZG9tLnN0eWxlLmhlaWdodCA9IGhlaWdodCArIFwicHhcIjtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmFib3ZlICE9IGFib3ZlKVxyXG5cdFx0XHR0aGlzLmRvbS5zdHlsZS5tYXJnaW5Ub3AgPSAodGhpcy5hYm92ZSA9IGFib3ZlKSA/IGFib3ZlICsgXCJweFwiIDogXCJcIjtcclxuXHRcdGlmICghc2FtZU1hcmtlcnModGhpcy5tYXJrZXJzLCBtYXJrZXJzKSkgdGhpcy5zZXRNYXJrZXJzKHZpZXcsIG1hcmtlcnMpO1xyXG5cdH1cclxuXHJcblx0c2V0TWFya2Vycyh2aWV3OiBFZGl0b3JWaWV3LCBtYXJrZXJzOiByZWFkb25seSBHdXR0ZXJNYXJrZXJbXSkge1xyXG5cdFx0bGV0IGNscyA9IFwiY20tZ3V0dGVyRWxlbWVudFwiLFxyXG5cdFx0XHRkb21Qb3MgPSB0aGlzLmRvbS5maXJzdENoaWxkO1xyXG5cdFx0Zm9yIChsZXQgaU5ldyA9IDAsIGlPbGQgPSAwOyA7ICkge1xyXG5cdFx0XHRsZXQgc2tpcFRvID0gaU9sZCxcclxuXHRcdFx0XHRtYXJrZXIgPSBpTmV3IDwgbWFya2Vycy5sZW5ndGggPyBtYXJrZXJzW2lOZXcrK10gOiBudWxsLFxyXG5cdFx0XHRcdG1hdGNoZWQgPSBmYWxzZTtcclxuXHRcdFx0aWYgKG1hcmtlcikge1xyXG5cdFx0XHRcdGxldCBjID0gbWFya2VyLmVsZW1lbnRDbGFzcztcclxuXHRcdFx0XHRpZiAoYykgY2xzICs9IFwiIFwiICsgYztcclxuXHRcdFx0XHRmb3IgKGxldCBpID0gaU9sZDsgaSA8IHRoaXMubWFya2Vycy5sZW5ndGg7IGkrKylcclxuXHRcdFx0XHRcdGlmICh0aGlzLm1hcmtlcnNbaV0uY29tcGFyZShtYXJrZXIpKSB7XHJcblx0XHRcdFx0XHRcdHNraXBUbyA9IGk7XHJcblx0XHRcdFx0XHRcdG1hdGNoZWQgPSB0cnVlO1xyXG5cdFx0XHRcdFx0XHRicmVhaztcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRza2lwVG8gPSB0aGlzLm1hcmtlcnMubGVuZ3RoO1xyXG5cdFx0XHR9XHJcblx0XHRcdHdoaWxlIChpT2xkIDwgc2tpcFRvKSB7XHJcblx0XHRcdFx0bGV0IG5leHQgPSB0aGlzLm1hcmtlcnNbaU9sZCsrXTtcclxuXHRcdFx0XHRpZiAobmV4dC50b0RPTSkge1xyXG5cdFx0XHRcdFx0bmV4dC5kZXN0cm95KGRvbVBvcyEpO1xyXG5cdFx0XHRcdFx0bGV0IGFmdGVyID0gZG9tUG9zIS5uZXh0U2libGluZztcclxuXHRcdFx0XHRcdGRvbVBvcyEucmVtb3ZlKCk7XHJcblx0XHRcdFx0XHRkb21Qb3MgPSBhZnRlcjtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCFtYXJrZXIpIGJyZWFrO1xyXG5cdFx0XHRpZiAobWFya2VyLnRvRE9NKSB7XHJcblx0XHRcdFx0aWYgKG1hdGNoZWQpIGRvbVBvcyA9IGRvbVBvcyEubmV4dFNpYmxpbmc7XHJcblx0XHRcdFx0ZWxzZSB0aGlzLmRvbS5pbnNlcnRCZWZvcmUobWFya2VyLnRvRE9NKHZpZXcpLCBkb21Qb3MpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChtYXRjaGVkKSBpT2xkKys7XHJcblx0XHR9XHJcblx0XHR0aGlzLmRvbS5jbGFzc05hbWUgPSBjbHM7XHJcblx0XHR0aGlzLm1hcmtlcnMgPSBtYXJrZXJzO1xyXG5cdH1cclxuXHJcblx0ZGVzdHJveSgpIHtcclxuXHRcdHRoaXMuc2V0TWFya2VycyhudWxsIGFzIGFueSwgW10pOyAvLyBGaXJzdCBhcmd1bWVudCBub3QgdXNlZCB1bmxlc3MgY3JlYXRpbmcgbWFya2Vyc1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gc2FtZU1hcmtlcnMoXHJcblx0YTogcmVhZG9ubHkgR3V0dGVyTWFya2VyW10sXHJcblx0YjogcmVhZG9ubHkgR3V0dGVyTWFya2VyW11cclxuKTogYm9vbGVhbiB7XHJcblx0aWYgKGEubGVuZ3RoICE9IGIubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSBpZiAoIWFbaV0uY29tcGFyZShiW2ldKSkgcmV0dXJuIGZhbHNlO1xyXG5cdHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTGluZU51bWJlckNvbmZpZyB7XHJcblx0Ly8vIEhvdyB0byBkaXNwbGF5IGxpbmUgbnVtYmVycy4gRGVmYXVsdHMgdG8gc2ltcGx5IGNvbnZlcnRpbmcgdGhlbVxyXG5cdC8vLyB0byBzdHJpbmcuXHJcblx0Zm9ybWF0TnVtYmVyPzogKGxpbmVObzogbnVtYmVyLCBzdGF0ZTogRWRpdG9yU3RhdGUpID0+IHN0cmluZztcclxuXHQvLy8gU3VwcGx5IGV2ZW50IGhhbmRsZXJzIGZvciBET00gZXZlbnRzIG9uIHRoaXMgZ3V0dGVyLlxyXG5cdGRvbUV2ZW50SGFuZGxlcnM/OiBIYW5kbGVycztcclxufVxyXG5cclxuLy8vIEZhY2V0IHVzZWQgdG8gcHJvdmlkZSBtYXJrZXJzIHRvIHRoZSBsaW5lIG51bWJlciBndXR0ZXIuXHJcbmV4cG9ydCBjb25zdCBsaW5lTnVtYmVyTWFya2VycyA9IEZhY2V0LmRlZmluZTxSYW5nZVNldDxHdXR0ZXJNYXJrZXI+PigpO1xyXG5cclxuLy8vIEZhY2V0IHVzZWQgdG8gY3JlYXRlIG1hcmtlcnMgaW4gdGhlIGxpbmUgbnVtYmVyIGd1dHRlciBuZXh0IHRvIHdpZGdldHMuXHJcbmV4cG9ydCBjb25zdCBsaW5lTnVtYmVyV2lkZ2V0TWFya2VyID1cclxuXHRGYWNldC5kZWZpbmU8XHJcblx0XHQoXHJcblx0XHRcdHZpZXc6IEVkaXRvclZpZXcsXHJcblx0XHRcdHdpZGdldDogV2lkZ2V0VHlwZSxcclxuXHRcdFx0YmxvY2s6IEJsb2NrSW5mb1xyXG5cdFx0KSA9PiBHdXR0ZXJNYXJrZXIgfCBudWxsXHJcblx0PigpO1xyXG5cclxuY29uc3QgbGluZU51bWJlckNvbmZpZyA9IEZhY2V0LmRlZmluZTxcclxuXHRMaW5lTnVtYmVyQ29uZmlnLFxyXG5cdFJlcXVpcmVkPExpbmVOdW1iZXJDb25maWc+XHJcbj4oe1xyXG5cdGNvbWJpbmUodmFsdWVzKSB7XHJcblx0XHRyZXR1cm4gY29tYmluZUNvbmZpZzxSZXF1aXJlZDxMaW5lTnVtYmVyQ29uZmlnPj4oXHJcblx0XHRcdHZhbHVlcyxcclxuXHRcdFx0eyBmb3JtYXROdW1iZXI6IFN0cmluZywgZG9tRXZlbnRIYW5kbGVyczoge30gfSxcclxuXHRcdFx0e1xyXG5cdFx0XHRcdGRvbUV2ZW50SGFuZGxlcnMoYTogSGFuZGxlcnMsIGI6IEhhbmRsZXJzKSB7XHJcblx0XHRcdFx0XHRsZXQgcmVzdWx0OiBIYW5kbGVycyA9IE9iamVjdC5hc3NpZ24oe30sIGEpO1xyXG5cdFx0XHRcdFx0Zm9yIChsZXQgZXZlbnQgaW4gYikge1xyXG5cdFx0XHRcdFx0XHRsZXQgZXhpc3RzID0gcmVzdWx0W2V2ZW50XSxcclxuXHRcdFx0XHRcdFx0XHRhZGQgPSBiW2V2ZW50XTtcclxuXHRcdFx0XHRcdFx0cmVzdWx0W2V2ZW50XSA9IGV4aXN0c1xyXG5cdFx0XHRcdFx0XHRcdD8gKHZpZXcsIGxpbmUsIGV2ZW50KSA9PlxyXG5cdFx0XHRcdFx0XHRcdFx0XHRleGlzdHModmlldywgbGluZSwgZXZlbnQpIHx8XHJcblx0XHRcdFx0XHRcdFx0XHRcdGFkZCh2aWV3LCBsaW5lLCBldmVudClcclxuXHRcdFx0XHRcdFx0XHQ6IGFkZDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdHJldHVybiByZXN1bHQ7XHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHR9LFxyXG59KTtcclxuXHJcbmNsYXNzIE51bWJlck1hcmtlciBleHRlbmRzIEd1dHRlck1hcmtlciB7XHJcblx0Y29uc3RydWN0b3IocmVhZG9ubHkgbnVtYmVyOiBzdHJpbmcpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0fVxyXG5cclxuXHRlcShvdGhlcjogTnVtYmVyTWFya2VyKSB7XHJcblx0XHRyZXR1cm4gdGhpcy5udW1iZXIgPT0gb3RoZXIubnVtYmVyO1xyXG5cdH1cclxuXHJcblx0dG9ET00oKSB7XHJcblx0XHRyZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodGhpcy5udW1iZXIpO1xyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gZm9ybWF0TnVtYmVyKHZpZXc6IEVkaXRvclZpZXcsIG51bWJlcjogbnVtYmVyKSB7XHJcblx0cmV0dXJuIHZpZXcuc3RhdGUuZmFjZXQobGluZU51bWJlckNvbmZpZykuZm9ybWF0TnVtYmVyKG51bWJlciwgdmlldy5zdGF0ZSk7XHJcbn1cclxuXHJcbmNvbnN0IGxpbmVOdW1iZXJHdXR0ZXIgPSBhY3RpdmVHdXR0ZXJzLmNvbXB1dGUoW2xpbmVOdW1iZXJDb25maWddLCAoc3RhdGUpID0+ICh7XHJcblx0Y2xhc3M6IFwiY20tbGluZU51bWJlcnNcIixcclxuXHRyZW5kZXJFbXB0eUVsZW1lbnRzOiBmYWxzZSxcclxuXHRtYXJrZXJzKHZpZXc6IEVkaXRvclZpZXcpIHtcclxuXHRcdHJldHVybiB2aWV3LnN0YXRlLmZhY2V0KGxpbmVOdW1iZXJNYXJrZXJzKTtcclxuXHR9LFxyXG5cdGxpbmVNYXJrZXIodmlldywgbGluZSwgb3RoZXJzKSB7XHJcblx0XHRpZiAob3RoZXJzLnNvbWUoKG0pID0+IG0udG9ET00pKSByZXR1cm4gbnVsbDtcclxuXHRcdHJldHVybiBuZXcgTnVtYmVyTWFya2VyKFxyXG5cdFx0XHRmb3JtYXROdW1iZXIodmlldywgdmlldy5zdGF0ZS5kb2MubGluZUF0KGxpbmUuZnJvbSkubnVtYmVyKVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdHdpZGdldE1hcmtlcjogKHZpZXcsIHdpZGdldCwgYmxvY2spID0+IHtcclxuXHRcdGZvciAobGV0IG0gb2Ygdmlldy5zdGF0ZS5mYWNldChsaW5lTnVtYmVyV2lkZ2V0TWFya2VyKSkge1xyXG5cdFx0XHRsZXQgcmVzdWx0ID0gbSh2aWV3LCB3aWRnZXQsIGJsb2NrKTtcclxuXHRcdFx0aWYgKHJlc3VsdCkgcmV0dXJuIHJlc3VsdDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBudWxsO1xyXG5cdH0sXHJcblx0bGluZU1hcmtlckNoYW5nZTogKHVwZGF0ZSkgPT5cclxuXHRcdHVwZGF0ZS5zdGFydFN0YXRlLmZhY2V0KGxpbmVOdW1iZXJDb25maWcpICE9XHJcblx0XHR1cGRhdGUuc3RhdGUuZmFjZXQobGluZU51bWJlckNvbmZpZyksXHJcblx0aW5pdGlhbFNwYWNlcih2aWV3OiBFZGl0b3JWaWV3KSB7XHJcblx0XHRyZXR1cm4gbmV3IE51bWJlck1hcmtlcihcclxuXHRcdFx0Zm9ybWF0TnVtYmVyKHZpZXcsIG1heExpbmVOdW1iZXIodmlldy5zdGF0ZS5kb2MubGluZXMpKVxyXG5cdFx0KTtcclxuXHR9LFxyXG5cdHVwZGF0ZVNwYWNlcihzcGFjZXI6IEd1dHRlck1hcmtlciwgdXBkYXRlOiBWaWV3VXBkYXRlKSB7XHJcblx0XHRsZXQgbWF4ID0gZm9ybWF0TnVtYmVyKFxyXG5cdFx0XHR1cGRhdGUudmlldyxcclxuXHRcdFx0bWF4TGluZU51bWJlcih1cGRhdGUudmlldy5zdGF0ZS5kb2MubGluZXMpXHJcblx0XHQpO1xyXG5cdFx0cmV0dXJuIG1heCA9PSAoc3BhY2VyIGFzIE51bWJlck1hcmtlcikubnVtYmVyXHJcblx0XHRcdD8gc3BhY2VyXHJcblx0XHRcdDogbmV3IE51bWJlck1hcmtlcihtYXgpO1xyXG5cdH0sXHJcblx0ZG9tRXZlbnRIYW5kbGVyczogc3RhdGUuZmFjZXQobGluZU51bWJlckNvbmZpZykuZG9tRXZlbnRIYW5kbGVycyxcclxufSkpO1xyXG5cclxuLy8vIENyZWF0ZSBhIGxpbmUgbnVtYmVyIGd1dHRlciBleHRlbnNpb24uXHJcbmV4cG9ydCBmdW5jdGlvbiBsaW5lTnVtYmVycyhjb25maWc6IExpbmVOdW1iZXJDb25maWcgPSB7fSk6IEV4dGVuc2lvbiB7XHJcblx0cmV0dXJuIFtsaW5lTnVtYmVyQ29uZmlnLm9mKGNvbmZpZyksIGd1dHRlcnMoKSwgbGluZU51bWJlckd1dHRlcl07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG1heExpbmVOdW1iZXIobGluZXM6IG51bWJlcikge1xyXG5cdGxldCBsYXN0ID0gOTtcclxuXHR3aGlsZSAobGFzdCA8IGxpbmVzKSBsYXN0ID0gbGFzdCAqIDEwICsgOTtcclxuXHRyZXR1cm4gbGFzdDtcclxufVxyXG5cclxuY29uc3QgYWN0aXZlTGluZUd1dHRlck1hcmtlciA9IG5ldyAoY2xhc3MgZXh0ZW5kcyBHdXR0ZXJNYXJrZXIge1xyXG5cdGVsZW1lbnRDbGFzcyA9IFwiY20tYWN0aXZlTGluZUd1dHRlclwiO1xyXG59KSgpO1xyXG5cclxuY29uc3QgYWN0aXZlTGluZUd1dHRlckhpZ2hsaWdodGVyID0gZ3V0dGVyTGluZUNsYXNzLmNvbXB1dGUoXHJcblx0W1wic2VsZWN0aW9uXCJdLFxyXG5cdChzdGF0ZSkgPT4ge1xyXG5cdFx0bGV0IG1hcmtzID0gW10sXHJcblx0XHRcdGxhc3QgPSAtMTtcclxuXHRcdGZvciAobGV0IHJhbmdlIG9mIHN0YXRlLnNlbGVjdGlvbi5yYW5nZXMpIHtcclxuXHRcdFx0bGV0IGxpbmVQb3MgPSBzdGF0ZS5kb2MubGluZUF0KHJhbmdlLmhlYWQpLmZyb207XHJcblx0XHRcdGlmIChsaW5lUG9zID4gbGFzdCkge1xyXG5cdFx0XHRcdGxhc3QgPSBsaW5lUG9zO1xyXG5cdFx0XHRcdG1hcmtzLnB1c2goYWN0aXZlTGluZUd1dHRlck1hcmtlci5yYW5nZShsaW5lUG9zKSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBSYW5nZVNldC5vZihtYXJrcyk7XHJcblx0fVxyXG4pO1xyXG5cclxuLy8vIFJldHVybnMgYW4gZXh0ZW5zaW9uIHRoYXQgYWRkcyBhIGBjbS1hY3RpdmVMaW5lR3V0dGVyYCBjbGFzcyB0b1xyXG4vLy8gYWxsIGd1dHRlciBlbGVtZW50cyBvbiB0aGUgW2FjdGl2ZVxyXG4vLy8gbGluZV0oI3ZpZXcuaGlnaGxpZ2h0QWN0aXZlTGluZSkuXHJcbmV4cG9ydCBmdW5jdGlvbiBoaWdobGlnaHRBY3RpdmVMaW5lR3V0dGVyKCkge1xyXG5cdHJldHVybiBhY3RpdmVMaW5lR3V0dGVySGlnaGxpZ2h0ZXI7XHJcbn1cclxuIl19