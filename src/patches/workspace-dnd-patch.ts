import type TaskProgressBarPlugin from "@/index";
import { around, dedupe } from "monkey-around";
import { Workspace } from "obsidian";

/** View types that should never be drag-moved to the center panel. */
const RESTRICTED_VIEW_TYPES = new Set<string>([
	"tg-left-sidebar",
	"tg-right-detail",
	"tg-timeline-sidebar-view",
]);

/** Allow other modules to add more restricted view types at runtime. */
export function registerRestrictedDnDViewTypes(...types: string[]) {
	for (const t of types) if (t) RESTRICTED_VIEW_TYPES.add(t);
}

function isRestrictedLeaf(leaf: any): boolean {
	try {
		const vt = leaf?.view?.getViewType?.();
		return typeof vt === "string" && RESTRICTED_VIEW_TYPES.has(vt);
	} catch {
		return false;
	}
}

/** Unique keys for deduping patches across plugins */
const KEY_ON_DRAG = "task-genius/workspace-dnd:onDragLeaf";
const KEY_GET_DROP = "task-genius/workspace-dnd:getDropLocation";

/**
 * Install a runtime monkey-patch for Obsidian's internal drag handling,
 * using monkey-around for co-operative, removable patches.
 */
export function installWorkspaceDragMonitor(plugin: TaskProgressBarPlugin): void {
	const unpatch = around(Workspace.prototype as any, {
		onDragLeaf(old: Function | undefined) {
			return dedupe(KEY_ON_DRAG, old as Function, function (this: any, e: DragEvent, leaf: any) {
				const restricted = isRestrictedLeaf(leaf);
				const prev = this.__tg_restrict_dnd;
				this.__tg_restrict_dnd = !!restricted;
				if (restricted) {
					const vt = leaf?.view?.getViewType?.();
					console.debug("[TG][MonkeyPatch] onDragLeaf(restricted)", vt);
				} else {
					console.debug("[TG][MonkeyPatch] onDragLeaf");
				}
				try {
					return old && old.apply(this, [e, leaf]);
				} finally {
					this.__tg_restrict_dnd = prev;
				}
			});
		},

		getDropLocation(old: Function | undefined) {
			return dedupe(KEY_GET_DROP, old as Function, function (this: any, ...args: any[]) {
				const target = old && old.apply(this, args);
				try {
					if (this.__tg_restrict_dnd && target) {
						const root = typeof target?.getRoot === "function" ? target.getRoot() : undefined;
						const isCenterRegion = root && root === this.rootSplit && target !== this.leftSplit && target !== this.rightSplit;
						if (isCenterRegion) {
							console.debug("[TG][MonkeyPatch] Blocked center drop location for restricted leaf");
							return null;
						}
					}
				} catch (err) {
					console.warn("[TG][MonkeyPatch] getDropLocation patch error", err);
				}
				return target;
			});
		},
	});

	plugin.register(unpatch);
}

