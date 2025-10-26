import { __awaiter } from "tslib";
import { requestUrl } from "obsidian";
import { CHANGELOG_VIEW_TYPE, } from "@/components/features/changelog/ChangelogView";
import { cacheChangelog, getCachedChangelog, } from "@/utils/changelog-cache";
const CHANGELOG_BASE_URL = "https://raw.githubusercontent.com/quorafind/obsidian-task-genius/master";
const RELEASE_BASE_URL = "https://github.com/quorafind/obsidian-task-genius/releases/tag";
const MAX_CHANGELOG_ENTRIES = 10;
export class ChangelogManager {
    constructor(plugin) {
        this.plugin = plugin;
        this.currentVersionDisplayed = null;
    }
    openChangelog(version, isBeta) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const view = yield this.getOrCreateView();
                if (this.currentVersionDisplayed === version) {
                    this.plugin.app.workspace.revealLeaf(view.leaf);
                    return;
                }
                const cached = getCachedChangelog(version, isBeta, this.plugin.app);
                if (cached) {
                    this.currentVersionDisplayed = version;
                    yield view.setContent({
                        version,
                        markdown: cached.markdown,
                        sourceUrl: cached.sourceUrl,
                    });
                    this.plugin.settings.changelog.lastVersion = version;
                    yield this.plugin.saveSettings();
                    return;
                }
                view.showLoading(version);
                this.currentVersionDisplayed = version;
                const data = yield this.fetchAndPrepareChangelog(isBeta);
                if (!data) {
                    view.showError("Failed to load changelog.");
                    this.currentVersionDisplayed = null;
                    return;
                }
                cacheChangelog(version, isBeta, data, this.plugin.app);
                yield view.setContent({
                    version,
                    markdown: data.markdown,
                    sourceUrl: data.sourceUrl,
                });
                this.plugin.settings.changelog.lastVersion = version;
                yield this.plugin.saveSettings();
            }
            catch (error) {
                console.error("[Changelog] Failed to open changelog view:", error);
                const view = this.tryGetExistingView();
                view === null || view === void 0 ? void 0 : view.showError("Failed to load changelog.");
                this.currentVersionDisplayed = null;
            }
        });
    }
    fetchAndPrepareChangelog(isBeta) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const fileName = isBeta ? "CHANGELOG-BETA.md" : "CHANGELOG.md";
                const url = `${CHANGELOG_BASE_URL}/${fileName}`;
                const response = yield requestUrl({ url });
                const rawContent = (_a = response.text) === null || _a === void 0 ? void 0 : _a.trim();
                if (!rawContent) {
                    console.warn("[Changelog] Received empty changelog content");
                    return null;
                }
                const markdown = this.extractLatestSections(rawContent, isBeta);
                return {
                    markdown,
                    sourceUrl: url,
                };
            }
            catch (error) {
                console.error("[Changelog] Failed to fetch changelog:", error);
                return null;
            }
        });
    }
    extractLatestSections(markdown, isBeta) {
        var _a, _b;
        const firstSectionIndex = markdown.search(/^## /m);
        const preamble = firstSectionIndex >= 0
            ? markdown.slice(0, firstSectionIndex).trim()
            : "";
        const sectionRegex = /^## [\s\S]*?(?=^## |\Z)/gm;
        const sections = (_a = markdown.match(sectionRegex)) !== null && _a !== void 0 ? _a : [];
        const latestSections = sections.slice(0, MAX_CHANGELOG_ENTRIES).map((section) => {
            const [heading, ...rest] = section.split("\n");
            const normalizedHeading = this.ensureReleaseLink(heading, isBeta);
            return [normalizedHeading, ...rest].join("\n");
        });
        const sectionsToRender = [];
        const trimmedPreamble = preamble.trim();
        if (trimmedPreamble &&
            !/^#\s*changelog$/i.test((_b = trimmedPreamble.split("\n")[0]) !== null && _b !== void 0 ? _b : "")) {
            sectionsToRender.push(trimmedPreamble);
        }
        const parts = [...sectionsToRender, ...latestSections]
            .filter((part) => part && part.trim().length > 0)
            .map((part) => part.trim());
        return parts.join("\n\n");
    }
    ensureReleaseLink(headingLine, isBeta) {
        if (headingLine.includes("](")) {
            return headingLine;
        }
        const match = headingLine.match(/^(##\s+)([^\s(]+)/);
        if (!match) {
            return headingLine;
        }
        const [, prefix, versionWithPotentialSymbols] = match;
        const version = versionWithPotentialSymbols.replace(/^\[|\]$/g, "");
        const releaseUrl = this.buildReleaseUrl(version, isBeta);
        return headingLine.replace(/^(##\s+)([^\s(]+)/, `${prefix}[${version}](${releaseUrl})`);
    }
    buildReleaseUrl(version, _isBeta) {
        const sanitizedVersion = version.replace(/^\[|\]$/g, "");
        return `${RELEASE_BASE_URL}/${sanitizedVersion}`;
    }
    getOrCreateView() {
        return __awaiter(this, void 0, void 0, function* () {
            const { workspace } = this.plugin.app;
            const existingLeaf = workspace.getLeavesOfType(CHANGELOG_VIEW_TYPE)[0];
            if (existingLeaf) {
                workspace.revealLeaf(existingLeaf);
                return existingLeaf.view;
            }
            const leaf = workspace.getLeaf("tab");
            yield leaf.setViewState({ type: CHANGELOG_VIEW_TYPE });
            workspace.revealLeaf(leaf);
            return leaf.view;
        });
    }
    tryGetExistingView() {
        const { workspace } = this.plugin.app;
        const existingLeaf = workspace.getLeavesOfType(CHANGELOG_VIEW_TYPE)[0];
        return (existingLeaf === null || existingLeaf === void 0 ? void 0 : existingLeaf.view) || null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlbG9nLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjaGFuZ2Vsb2ctbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUN0QyxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sK0NBQStDLENBQUM7QUFFdkQsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsR0FDbEIsTUFBTSx5QkFBeUIsQ0FBQztBQUVqQyxNQUFNLGtCQUFrQixHQUN2Qix5RUFBeUUsQ0FBQztBQUMzRSxNQUFNLGdCQUFnQixHQUNyQixnRUFBZ0UsQ0FBQztBQUNsRSxNQUFNLHFCQUFxQixHQUFHLEVBQUUsQ0FBQztBQU9qQyxNQUFNLE9BQU8sZ0JBQWdCO0lBRzVCLFlBQW9CLE1BQTZCO1FBQTdCLFdBQU0sR0FBTixNQUFNLENBQXVCO1FBRnpDLDRCQUF1QixHQUFrQixJQUFJLENBQUM7SUFFRixDQUFDO0lBRS9DLGFBQWEsQ0FBQyxPQUFlLEVBQUUsTUFBZTs7WUFDbkQsSUFBSTtnQkFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztnQkFFMUMsSUFBSSxJQUFJLENBQUMsdUJBQXVCLEtBQUssT0FBTyxFQUFFO29CQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEQsT0FBTztpQkFDUDtnQkFFRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FDaEMsT0FBTyxFQUNQLE1BQU0sRUFDTixJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZixDQUFDO2dCQUNGLElBQUksTUFBTSxFQUFFO29CQUNYLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxPQUFPLENBQUM7b0JBQ3ZDLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQzt3QkFDckIsT0FB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QUMsR0FBRyxDQUFDO1lBQ3RDLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQzdDLG1CQUFtQixDQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRUwsSUFBSSxZQUFZLEVBQUU7Z0JBQ2pCLFNBQVMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ25DLE9BQU8sWUFBWSxDQUFDLElBQWdDLENBQUM7YUFDckQ7WUFFRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLElBQUksRUFBRSxtQkFBbUIsRUFBRSxDQUFDLENBQUM7WUFDdkQsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMzQixPQUFPLElBQUksQ0FBQyxJQUFnQyxDQUFDO1FBQzlDLENBQUM7S0FBQTtJQUVPLGtCQUFrQjtRQUN6QixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDdEMsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLGVBQWUsQ0FDN0MsbUJBQW1CLENBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxPQUFPLENBQUMsWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLElBQWlDLEtBQUksSUFBSSxDQUFDO0lBQ2pFLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlcXVlc3RVcmwgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHtcclxuXHRDSEFOR0VMT0dfVklFV19UWVBFLFxyXG5cdENoYW5nZWxvZ1ZpZXcsXHJcbn0gZnJvbSBcIkAvY29tcG9uZW50cy9mZWF0dXJlcy9jaGFuZ2Vsb2cvQ2hhbmdlbG9nVmlld1wiO1xyXG5pbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7XHJcblx0Y2FjaGVDaGFuZ2Vsb2csXHJcblx0Z2V0Q2FjaGVkQ2hhbmdlbG9nLFxyXG59IGZyb20gXCJAL3V0aWxzL2NoYW5nZWxvZy1jYWNoZVwiO1xyXG5cclxuY29uc3QgQ0hBTkdFTE9HX0JBU0VfVVJMID1cclxuXHRcImh0dHBzOi8vcmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbS9xdW9yYWZpbmQvb2JzaWRpYW4tdGFzay1nZW5pdXMvbWFzdGVyXCI7XHJcbmNvbnN0IFJFTEVBU0VfQkFTRV9VUkwgPVxyXG5cdFwiaHR0cHM6Ly9naXRodWIuY29tL3F1b3JhZmluZC9vYnNpZGlhbi10YXNrLWdlbml1cy9yZWxlYXNlcy90YWdcIjtcclxuY29uc3QgTUFYX0NIQU5HRUxPR19FTlRSSUVTID0gMTA7XHJcblxyXG5pbnRlcmZhY2UgQ2hhbmdlbG9nRmV0Y2hSZXN1bHQge1xyXG5cdG1hcmtkb3duOiBzdHJpbmc7XHJcblx0c291cmNlVXJsOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDaGFuZ2Vsb2dNYW5hZ2VyIHtcclxuXHRwcml2YXRlIGN1cnJlbnRWZXJzaW9uRGlzcGxheWVkOiBzdHJpbmcgfCBudWxsID0gbnVsbDtcclxuXHJcblx0Y29uc3RydWN0b3IocHJpdmF0ZSBwbHVnaW46IFRhc2tQcm9ncmVzc0JhclBsdWdpbikge31cclxuXHJcblx0YXN5bmMgb3BlbkNoYW5nZWxvZyh2ZXJzaW9uOiBzdHJpbmcsIGlzQmV0YTogYm9vbGVhbik6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0dHJ5IHtcclxuXHRcdFx0Y29uc3QgdmlldyA9IGF3YWl0IHRoaXMuZ2V0T3JDcmVhdGVWaWV3KCk7XHJcblxyXG5cdFx0XHRpZiAodGhpcy5jdXJyZW50VmVyc2lvbkRpc3BsYXllZCA9PT0gdmVyc2lvbikge1xyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcC53b3Jrc3BhY2UucmV2ZWFsTGVhZih2aWV3LmxlYWYpO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3QgY2FjaGVkID0gZ2V0Q2FjaGVkQ2hhbmdlbG9nKFxyXG5cdFx0XHRcdHZlcnNpb24sXHJcblx0XHRcdFx0aXNCZXRhLFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0KTtcclxuXHRcdFx0aWYgKGNhY2hlZCkge1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudFZlcnNpb25EaXNwbGF5ZWQgPSB2ZXJzaW9uO1xyXG5cdFx0XHRcdGF3YWl0IHZpZXcuc2V0Q29udGVudCh7XHJcblx0XHRcdFx0XHR2ZXJzaW9uLFxyXG5cdFx0XHRcdFx0bWFya2Rvd246IGNhY2hlZC5tYXJrZG93bixcclxuXHRcdFx0XHRcdHNvdXJjZVVybDogY2FjaGVkLnNvdXJjZVVybCxcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY2hhbmdlbG9nLmxhc3RWZXJzaW9uID0gdmVyc2lvbjtcclxuXHRcdFx0XHRhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHZpZXcuc2hvd0xvYWRpbmcodmVyc2lvbik7XHJcblx0XHRcdHRoaXMuY3VycmVudFZlcnNpb25EaXNwbGF5ZWQgPSB2ZXJzaW9uO1xyXG5cclxuXHRcdFx0Y29uc3QgZGF0YSA9IGF3YWl0IHRoaXMuZmV0Y2hBbmRQcmVwYXJlQ2hhbmdlbG9nKGlzQmV0YSk7XHJcblx0XHRcdGlmICghZGF0YSkge1xyXG5cdFx0XHRcdHZpZXcuc2hvd0Vycm9yKFwiRmFpbGVkIHRvIGxvYWQgY2hhbmdlbG9nLlwiKTtcclxuXHRcdFx0XHR0aGlzLmN1cnJlbnRWZXJzaW9uRGlzcGxheWVkID0gbnVsbDtcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNhY2hlQ2hhbmdlbG9nKHZlcnNpb24sIGlzQmV0YSwgZGF0YSwgdGhpcy5wbHVnaW4uYXBwKTtcclxuXHRcdFx0YXdhaXQgdmlldy5zZXRDb250ZW50KHtcclxuXHRcdFx0XHR2ZXJzaW9uLFxyXG5cdFx0XHRcdG1hcmtkb3duOiBkYXRhLm1hcmtkb3duLFxyXG5cdFx0XHRcdHNvdXJjZVVybDogZGF0YS5zb3VyY2VVcmwsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MuY2hhbmdlbG9nLmxhc3RWZXJzaW9uID0gdmVyc2lvbjtcclxuXHRcdFx0YXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiW0NoYW5nZWxvZ10gRmFpbGVkIHRvIG9wZW4gY2hhbmdlbG9nIHZpZXc6XCIsIGVycm9yKTtcclxuXHRcdFx0Y29uc3QgdmlldyA9IHRoaXMudHJ5R2V0RXhpc3RpbmdWaWV3KCk7XHJcblx0XHRcdHZpZXc/LnNob3dFcnJvcihcIkZhaWxlZCB0byBsb2FkIGNoYW5nZWxvZy5cIik7XHJcblx0XHRcdHRoaXMuY3VycmVudFZlcnNpb25EaXNwbGF5ZWQgPSBudWxsO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBhc3luYyBmZXRjaEFuZFByZXBhcmVDaGFuZ2Vsb2coXHJcblx0XHRpc0JldGE6IGJvb2xlYW4sXHJcblx0KTogUHJvbWlzZTxDaGFuZ2Vsb2dGZXRjaFJlc3VsdCB8IG51bGw+IHtcclxuXHRcdHRyeSB7XHJcblx0XHRcdGNvbnN0IGZpbGVOYW1lID0gaXNCZXRhID8gXCJDSEFOR0VMT0ctQkVUQS5tZFwiIDogXCJDSEFOR0VMT0cubWRcIjtcclxuXHRcdFx0Y29uc3QgdXJsID0gYCR7Q0hBTkdFTE9HX0JBU0VfVVJMfS8ke2ZpbGVOYW1lfWA7XHJcblx0XHRcdGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgcmVxdWVzdFVybCh7IHVybCB9KTtcclxuXHRcdFx0Y29uc3QgcmF3Q29udGVudCA9IHJlc3BvbnNlLnRleHQ/LnRyaW0oKTtcclxuXHJcblx0XHRcdGlmICghcmF3Q29udGVudCkge1xyXG5cdFx0XHRcdGNvbnNvbGUud2FybihcIltDaGFuZ2Vsb2ddIFJlY2VpdmVkIGVtcHR5IGNoYW5nZWxvZyBjb250ZW50XCIpO1xyXG5cdFx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBtYXJrZG93biA9IHRoaXMuZXh0cmFjdExhdGVzdFNlY3Rpb25zKHJhd0NvbnRlbnQsIGlzQmV0YSk7XHJcblx0XHRcdHJldHVybiB7XHJcblx0XHRcdFx0bWFya2Rvd24sXHJcblx0XHRcdFx0c291cmNlVXJsOiB1cmwsXHJcblx0XHRcdH07XHJcblx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiW0NoYW5nZWxvZ10gRmFpbGVkIHRvIGZldGNoIGNoYW5nZWxvZzpcIiwgZXJyb3IpO1xyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgZXh0cmFjdExhdGVzdFNlY3Rpb25zKFxyXG5cdFx0bWFya2Rvd246IHN0cmluZyxcclxuXHRcdGlzQmV0YTogYm9vbGVhbixcclxuXHQpOiBzdHJpbmcge1xyXG5cdFx0Y29uc3QgZmlyc3RTZWN0aW9uSW5kZXggPSBtYXJrZG93bi5zZWFyY2goL14jIyAvbSk7XHJcblx0XHRjb25zdCBwcmVhbWJsZSA9XHJcblx0XHRcdGZpcnN0U2VjdGlvbkluZGV4ID49IDBcclxuXHRcdFx0XHQ/IG1hcmtkb3duLnNsaWNlKDAsIGZpcnN0U2VjdGlvbkluZGV4KS50cmltKClcclxuXHRcdFx0XHQ6IFwiXCI7XHJcblxyXG5cdFx0Y29uc3Qgc2VjdGlvblJlZ2V4ID0gL14jIyBbXFxzXFxTXSo/KD89XiMjIHxcXFopL2dtO1xyXG5cdFx0Y29uc3Qgc2VjdGlvbnMgPSBtYXJrZG93bi5tYXRjaChzZWN0aW9uUmVnZXgpID8/IFtdO1xyXG5cdFx0Y29uc3QgbGF0ZXN0U2VjdGlvbnMgPSBzZWN0aW9ucy5zbGljZSgwLCBNQVhfQ0hBTkdFTE9HX0VOVFJJRVMpLm1hcChcclxuXHRcdFx0KHNlY3Rpb24pID0+IHtcclxuXHRcdFx0XHRjb25zdCBbaGVhZGluZywgLi4ucmVzdF0gPSBzZWN0aW9uLnNwbGl0KFwiXFxuXCIpO1xyXG5cdFx0XHRcdGNvbnN0IG5vcm1hbGl6ZWRIZWFkaW5nID0gdGhpcy5lbnN1cmVSZWxlYXNlTGluayhcclxuXHRcdFx0XHRcdGhlYWRpbmcsXHJcblx0XHRcdFx0XHRpc0JldGEsXHJcblx0XHRcdFx0KTtcclxuXHRcdFx0XHRyZXR1cm4gW25vcm1hbGl6ZWRIZWFkaW5nLCAuLi5yZXN0XS5qb2luKFwiXFxuXCIpO1xyXG5cdFx0XHR9LFxyXG5cdFx0KTtcclxuXHJcblx0XHRjb25zdCBzZWN0aW9uc1RvUmVuZGVyOiBzdHJpbmdbXSA9IFtdO1xyXG5cdFx0Y29uc3QgdHJpbW1lZFByZWFtYmxlID0gcHJlYW1ibGUudHJpbSgpO1xyXG5cdFx0aWYgKFxyXG5cdFx0XHR0cmltbWVkUHJlYW1ibGUgJiZcclxuXHRcdFx0IS9eI1xccypjaGFuZ2Vsb2ckL2kudGVzdCh0cmltbWVkUHJlYW1ibGUuc3BsaXQoXCJcXG5cIilbMF0gPz8gXCJcIilcclxuXHRcdCkge1xyXG5cdFx0XHRzZWN0aW9uc1RvUmVuZGVyLnB1c2godHJpbW1lZFByZWFtYmxlKTtcclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBwYXJ0cyA9IFsuLi5zZWN0aW9uc1RvUmVuZGVyLCAuLi5sYXRlc3RTZWN0aW9uc11cclxuXHRcdFx0LmZpbHRlcigocGFydCkgPT4gcGFydCAmJiBwYXJ0LnRyaW0oKS5sZW5ndGggPiAwKVxyXG5cdFx0XHQubWFwKChwYXJ0KSA9PiBwYXJ0LnRyaW0oKSk7XHJcblxyXG5cdFx0cmV0dXJuIHBhcnRzLmpvaW4oXCJcXG5cXG5cIik7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGVuc3VyZVJlbGVhc2VMaW5rKGhlYWRpbmdMaW5lOiBzdHJpbmcsIGlzQmV0YTogYm9vbGVhbik6IHN0cmluZyB7XHJcblx0XHRpZiAoaGVhZGluZ0xpbmUuaW5jbHVkZXMoXCJdKFwiKSkge1xyXG5cdFx0XHRyZXR1cm4gaGVhZGluZ0xpbmU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbWF0Y2ggPSBoZWFkaW5nTGluZS5tYXRjaCgvXigjI1xccyspKFteXFxzKF0rKS8pO1xyXG5cdFx0aWYgKCFtYXRjaCkge1xyXG5cdFx0XHRyZXR1cm4gaGVhZGluZ0xpbmU7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgWywgcHJlZml4LCB2ZXJzaW9uV2l0aFBvdGVudGlhbFN5bWJvbHNdID0gbWF0Y2g7XHJcblx0XHRjb25zdCB2ZXJzaW9uID0gdmVyc2lvbldpdGhQb3RlbnRpYWxTeW1ib2xzLnJlcGxhY2UoL15cXFt8XFxdJC9nLCBcIlwiKTtcclxuXHRcdGNvbnN0IHJlbGVhc2VVcmwgPSB0aGlzLmJ1aWxkUmVsZWFzZVVybCh2ZXJzaW9uLCBpc0JldGEpO1xyXG5cclxuXHRcdHJldHVybiBoZWFkaW5nTGluZS5yZXBsYWNlKFxyXG5cdFx0XHQvXigjI1xccyspKFteXFxzKF0rKS8sXHJcblx0XHRcdGAke3ByZWZpeH1bJHt2ZXJzaW9ufV0oJHtyZWxlYXNlVXJsfSlgLFxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYnVpbGRSZWxlYXNlVXJsKHZlcnNpb246IHN0cmluZywgX2lzQmV0YTogYm9vbGVhbik6IHN0cmluZyB7XHJcblx0XHRjb25zdCBzYW5pdGl6ZWRWZXJzaW9uID0gdmVyc2lvbi5yZXBsYWNlKC9eXFxbfFxcXSQvZywgXCJcIik7XHJcblx0XHRyZXR1cm4gYCR7UkVMRUFTRV9CQVNFX1VSTH0vJHtzYW5pdGl6ZWRWZXJzaW9ufWA7XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIGFzeW5jIGdldE9yQ3JlYXRlVmlldygpOiBQcm9taXNlPENoYW5nZWxvZ1ZpZXc+IHtcclxuXHRcdGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLnBsdWdpbi5hcHA7XHJcblx0XHRjb25zdCBleGlzdGluZ0xlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFxyXG5cdFx0XHRDSEFOR0VMT0dfVklFV19UWVBFLFxyXG5cdFx0KVswXTtcclxuXHJcblx0XHRpZiAoZXhpc3RpbmdMZWFmKSB7XHJcblx0XHRcdHdvcmtzcGFjZS5yZXZlYWxMZWFmKGV4aXN0aW5nTGVhZik7XHJcblx0XHRcdHJldHVybiBleGlzdGluZ0xlYWYudmlldyBhcyB1bmtub3duIGFzIENoYW5nZWxvZ1ZpZXc7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgbGVhZiA9IHdvcmtzcGFjZS5nZXRMZWFmKFwidGFiXCIpO1xyXG5cdFx0YXdhaXQgbGVhZi5zZXRWaWV3U3RhdGUoeyB0eXBlOiBDSEFOR0VMT0dfVklFV19UWVBFIH0pO1xyXG5cdFx0d29ya3NwYWNlLnJldmVhbExlYWYobGVhZik7XHJcblx0XHRyZXR1cm4gbGVhZi52aWV3IGFzIHVua25vd24gYXMgQ2hhbmdlbG9nVmlldztcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdHJ5R2V0RXhpc3RpbmdWaWV3KCk6IENoYW5nZWxvZ1ZpZXcgfCBudWxsIHtcclxuXHRcdGNvbnN0IHsgd29ya3NwYWNlIH0gPSB0aGlzLnBsdWdpbi5hcHA7XHJcblx0XHRjb25zdCBleGlzdGluZ0xlYWYgPSB3b3Jrc3BhY2UuZ2V0TGVhdmVzT2ZUeXBlKFxyXG5cdFx0XHRDSEFOR0VMT0dfVklFV19UWVBFLFxyXG5cdFx0KVswXTtcclxuXHRcdHJldHVybiAoZXhpc3RpbmdMZWFmPy52aWV3IGFzIHVua25vd24gYXMgQ2hhbmdlbG9nVmlldykgfHwgbnVsbDtcclxuXHR9XHJcbn1cclxuIl19