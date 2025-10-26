import { __awaiter } from "tslib";
import { ItemView, MarkdownRenderer } from "obsidian";
import { getCachedChangelog } from "@/utils/changelog-cache";
import { t } from "@/translations/helper";
export const CHANGELOG_VIEW_TYPE = "task-genius-changelog";
export class ChangelogView extends ItemView {
    constructor(leaf, plugin) {
        super(leaf);
        this.content = null;
        this.isLoading = false;
        this.error = null;
        this.plugin = plugin;
    }
    getViewType() {
        return CHANGELOG_VIEW_TYPE;
    }
    getDisplayText() {
        return t("Changelog");
    }
    getIcon() {
        return "task-genius";
    }
    onOpen() {
        return __awaiter(this, void 0, void 0, function* () {
            this.tryLoadCachedContent();
            yield this.render();
        });
    }
    onClose() {
        return __awaiter(this, void 0, void 0, function* () {
            this.containerEl.empty();
        });
    }
    tryLoadCachedContent() {
        var _a;
        const manifestVersion = (_a = this.plugin.manifest) === null || _a === void 0 ? void 0 : _a.version;
        if (!manifestVersion) {
            return;
        }
        const isBeta = manifestVersion.toLowerCase().includes("beta");
        const cached = getCachedChangelog(manifestVersion, isBeta);
        if (!cached) {
            return;
        }
        this.isLoading = false;
        this.error = null;
        this.content = {
            version: cached.version,
            markdown: cached.markdown,
            sourceUrl: cached.sourceUrl,
        };
    }
    showLoading(version) {
        this.isLoading = true;
        this.error = null;
        this.content = {
            version,
            markdown: "",
            sourceUrl: "",
        };
        void this.render();
    }
    setContent(content) {
        return __awaiter(this, void 0, void 0, function* () {
            this.isLoading = false;
            this.error = null;
            this.content = content;
            yield this.render();
        });
    }
    showError(message) {
        this.isLoading = false;
        this.error = message;
        void this.render();
    }
    render() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const { containerEl } = this;
            containerEl.empty();
            containerEl.addClass("tg-changelog-view");
            const headerEl = containerEl.createDiv({
                cls: "tg-changelog-header",
            });
            headerEl.createEl("h2", {
                text: t("Task Genius Changelog"),
            });
            if ((_a = this.content) === null || _a === void 0 ? void 0 : _a.version) {
                const metaEl = headerEl.createDiv({
                    cls: "tg-changelog-meta",
                });
                metaEl.createSpan({
                    text: `Version ${this.content.version}`,
                });
                if (this.content.sourceUrl) {
                    metaEl.createSpan({ text: " • " });
                    metaEl.createEl("a", {
                        text: "View full changelog",
                        href: "https://taskgenius.md/changelog",
                        attr: {
                            target: "_blank",
                            rel: "noopener noreferrer",
                        },
                    });
                }
            }
            const bodyEl = containerEl.createDiv({
                cls: "tg-changelog-body markdown-preview-view",
            });
            if (this.isLoading) {
                bodyEl.createEl("p", { text: "Loading changelog..." });
                return;
            }
            if (this.error) {
                bodyEl.createEl("p", {
                    text: this.error,
                    attr: { class: "tg-changelog-error" },
                });
                return;
            }
            if ((_b = this.content) === null || _b === void 0 ? void 0 : _b.markdown) {
                yield MarkdownRenderer.render(this.plugin.app, this.content.markdown, bodyEl, "", this.plugin);
                return;
            }
            bodyEl.createEl("p", {
                text: "No changelog information available.",
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2hhbmdlbG9nVmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkNoYW5nZWxvZ1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQWlCLE1BQU0sVUFBVSxDQUFDO0FBRXJFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUUxQyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyx1QkFBdUIsQ0FBQztBQVEzRCxNQUFNLE9BQU8sYUFBYyxTQUFRLFFBQVE7SUFNMUMsWUFBWSxJQUFtQixFQUFFLE1BQTZCO1FBQzdELEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUxMLFlBQU8sR0FBNEIsSUFBSSxDQUFDO1FBQ3hDLGNBQVMsR0FBRyxLQUFLLENBQUM7UUFDbEIsVUFBSyxHQUFrQixJQUFJLENBQUM7UUFJbkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdEIsQ0FBQztJQUVELFdBQVc7UUFDVixPQUFPLG1CQUFtQixDQUFDO0lBQzVCLENBQUM7SUFFRCxjQUFjO1FBQ2IsT0FBTyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVELE9BQU87UUFDTixPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRUssTUFBTTs7WUFDWCxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNyQixDQUFDO0tBQUE7SUFFSyxPQUFPOztZQUNaLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDMUIsQ0FBQztLQUFBO0lBRU8sb0JBQW9COztRQUMzQixNQUFNLGVBQWUsR0FBRyxNQUFBLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSwwQ0FBRSxPQUFPLENBQUM7UUFDdEQs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LENBQUM7Z0JBQ3BDLEdBQUcsRUFBRSx5Q0FBeUM7YUFDOUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO2dCQUNuQixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZELE9BQU87YUFDUDtZQUVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDZixNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtvQkFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLO29CQUNoQixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7aUJBQ3JDLENBQUMsQ0FBQztnQkFDSCxPQUFPO2FBQ1A7WUFFRCxJQUFJLE1BQUEsSUFBSSxDQUFDLE9BQU8sMENBQUUsUUFBUSxFQUFFO2dCQUMzQixNQUFNLGdCQUFnQixDQUFDLE1BQU0sQ0FDNUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQ3JCLE1BQU0sRUFDTixFQUFFLEVBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FDWCxDQUFDO2dCQUNGLE9BQU87YUFDUDtZQUVELE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO2dCQUNwQixJQUFJLEVBQUUscUNBQXFDO2FBQzNDLENBQUMsQ0FBQzs7S0FDSDtDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgSXRlbVZpZXcsIE1hcmtkb3duUmVuZGVyZXIsIFdvcmtzcGFjZUxlYWYgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcbmltcG9ydCB7IGdldENhY2hlZENoYW5nZWxvZyB9IGZyb20gXCJAL3V0aWxzL2NoYW5nZWxvZy1jYWNoZVwiO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSBcIkAvdHJhbnNsYXRpb25zL2hlbHBlclwiO1xyXG5cclxuZXhwb3J0IGNvbnN0IENIQU5HRUxPR19WSUVXX1RZUEUgPSBcInRhc2stZ2VuaXVzLWNoYW5nZWxvZ1wiO1xyXG5cclxuaW50ZXJmYWNlIENoYW5nZWxvZ0NvbnRlbnQge1xyXG5cdHZlcnNpb246IHN0cmluZztcclxuXHRtYXJrZG93bjogc3RyaW5nO1xyXG5cdHNvdXJjZVVybDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ2hhbmdlbG9nVmlldyBleHRlbmRzIEl0ZW1WaWV3IHtcclxuXHRwcml2YXRlIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdHByaXZhdGUgY29udGVudDogQ2hhbmdlbG9nQ29udGVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgaXNMb2FkaW5nID0gZmFsc2U7XHJcblx0cHJpdmF0ZSBlcnJvcjogc3RyaW5nIHwgbnVsbCA9IG51bGw7XHJcblxyXG5cdGNvbnN0cnVjdG9yKGxlYWY6IFdvcmtzcGFjZUxlYWYsIHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luKSB7XHJcblx0XHRzdXBlcihsZWFmKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdH1cclxuXHJcblx0Z2V0Vmlld1R5cGUoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiBDSEFOR0VMT0dfVklFV19UWVBFO1xyXG5cdH1cclxuXHJcblx0Z2V0RGlzcGxheVRleHQoKTogc3RyaW5nIHtcclxuXHRcdHJldHVybiB0KFwiQ2hhbmdlbG9nXCIpO1xyXG5cdH1cclxuXHJcblx0Z2V0SWNvbigpOiBzdHJpbmcge1xyXG5cdFx0cmV0dXJuIFwidGFzay1nZW5pdXNcIjtcclxuXHR9XHJcblxyXG5cdGFzeW5jIG9uT3BlbigpIHtcclxuXHRcdHRoaXMudHJ5TG9hZENhY2hlZENvbnRlbnQoKTtcclxuXHRcdGF3YWl0IHRoaXMucmVuZGVyKCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBvbkNsb3NlKCkge1xyXG5cdFx0dGhpcy5jb250YWluZXJFbC5lbXB0eSgpO1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSB0cnlMb2FkQ2FjaGVkQ29udGVudCgpOiB2b2lkIHtcclxuXHRcdGNvbnN0IG1hbmlmZXN0VmVyc2lvbiA9IHRoaXMucGx1Z2luLm1hbmlmZXN0Py52ZXJzaW9uO1xyXG5cdFx0aWYgKCFtYW5pZmVzdFZlcnNpb24pIHtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGlzQmV0YSA9IG1hbmlmZXN0VmVyc2lvbi50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKFwiYmV0YVwiKTtcclxuXHRcdGNvbnN0IGNhY2hlZCA9IGdldENhY2hlZENoYW5nZWxvZyhtYW5pZmVzdFZlcnNpb24sIGlzQmV0YSk7XHJcblx0XHRpZiAoIWNhY2hlZCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5pc0xvYWRpbmcgPSBmYWxzZTtcclxuXHRcdHRoaXMuZXJyb3IgPSBudWxsO1xyXG5cdFx0dGhpcy5jb250ZW50ID0ge1xyXG5cdFx0XHR2ZXJzaW9uOiBjYWNoZWQudmVyc2lvbixcclxuXHRcdFx0bWFya2Rvd246IGNhY2hlZC5tYXJrZG93bixcclxuXHRcdFx0c291cmNlVXJsOiBjYWNoZWQuc291cmNlVXJsLFxyXG5cdFx0fTtcclxuXHR9XHJcblxyXG5cdHNob3dMb2FkaW5nKHZlcnNpb246IHN0cmluZykge1xyXG5cdFx0dGhpcy5pc0xvYWRpbmcgPSB0cnVlO1xyXG5cdFx0dGhpcy5lcnJvciA9IG51bGw7XHJcblx0XHR0aGlzLmNvbnRlbnQgPSB7XHJcblx0XHRcdHZlcnNpb24sXHJcblx0XHRcdG1hcmtkb3duOiBcIlwiLFxyXG5cdFx0XHRzb3VyY2VVcmw6IFwiXCIsXHJcblx0XHR9O1xyXG5cdFx0dm9pZCB0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHJcblx0YXN5bmMgc2V0Q29udGVudChjb250ZW50OiBDaGFuZ2Vsb2dDb250ZW50KSB7XHJcblx0XHR0aGlzLmlzTG9hZGluZyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5lcnJvciA9IG51bGw7XHJcblx0XHR0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xyXG5cdFx0YXdhaXQgdGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdHNob3dFcnJvcihtZXNzYWdlOiBzdHJpbmcpIHtcclxuXHRcdHRoaXMuaXNMb2FkaW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLmVycm9yID0gbWVzc2FnZTtcclxuXHRcdHZvaWQgdGhpcy5yZW5kZXIoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgYXN5bmMgcmVuZGVyKCk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0Y29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcclxuXHRcdGNvbnRhaW5lckVsLmVtcHR5KCk7XHJcblx0XHRjb250YWluZXJFbC5hZGRDbGFzcyhcInRnLWNoYW5nZWxvZy12aWV3XCIpO1xyXG5cclxuXHRcdGNvbnN0IGhlYWRlckVsID0gY29udGFpbmVyRWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0Y2xzOiBcInRnLWNoYW5nZWxvZy1oZWFkZXJcIixcclxuXHRcdH0pO1xyXG5cclxuXHRcdGhlYWRlckVsLmNyZWF0ZUVsKFwiaDJcIiwge1xyXG5cdFx0XHR0ZXh0OiB0KFwiVGFzayBHZW5pdXMgQ2hhbmdlbG9nXCIpLFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0aWYgKHRoaXMuY29udGVudD8udmVyc2lvbikge1xyXG5cdFx0XHRjb25zdCBtZXRhRWwgPSBoZWFkZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogXCJ0Zy1jaGFuZ2Vsb2ctbWV0YVwiLFxyXG5cdFx0XHR9KTtcclxuXHJcblx0XHRcdG1ldGFFbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0XHR0ZXh0OiBgVmVyc2lvbiAke3RoaXMuY29udGVudC52ZXJzaW9ufWAsXHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYgKHRoaXMuY29udGVudC5zb3VyY2VVcmwpIHtcclxuXHRcdFx0XHRtZXRhRWwuY3JlYXRlU3Bhbih7IHRleHQ6IFwiIOKAoiBcIiB9KTtcclxuXHRcdFx0XHRtZXRhRWwuY3JlYXRlRWwoXCJhXCIsIHtcclxuXHRcdFx0XHRcdHRleHQ6IFwiVmlldyBmdWxsIGNoYW5nZWxvZ1wiLFxyXG5cdFx0XHRcdFx0aHJlZjogXCJodHRwczovL3Rhc2tnZW5pdXMubWQvY2hhbmdlbG9nXCIsXHJcblx0XHRcdFx0XHRhdHRyOiB7XHJcblx0XHRcdFx0XHRcdHRhcmdldDogXCJfYmxhbmtcIixcclxuXHRcdFx0XHRcdFx0cmVsOiBcIm5vb3BlbmVyIG5vcmVmZXJyZXJcIixcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb25zdCBib2R5RWwgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IFwidGctY2hhbmdlbG9nLWJvZHkgbWFya2Rvd24tcHJldmlldy12aWV3XCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRpZiAodGhpcy5pc0xvYWRpbmcpIHtcclxuXHRcdFx0Ym9keUVsLmNyZWF0ZUVsKFwicFwiLCB7IHRleHQ6IFwiTG9hZGluZyBjaGFuZ2Vsb2cuLi5cIiB9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmVycm9yKSB7XHJcblx0XHRcdGJvZHlFbC5jcmVhdGVFbChcInBcIiwge1xyXG5cdFx0XHRcdHRleHQ6IHRoaXMuZXJyb3IsXHJcblx0XHRcdFx0YXR0cjogeyBjbGFzczogXCJ0Zy1jaGFuZ2Vsb2ctZXJyb3JcIiB9LFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0aGlzLmNvbnRlbnQ/Lm1hcmtkb3duKSB7XHJcblx0XHRcdGF3YWl0IE1hcmtkb3duUmVuZGVyZXIucmVuZGVyKFxyXG5cdFx0XHRcdHRoaXMucGx1Z2luLmFwcCxcclxuXHRcdFx0XHR0aGlzLmNvbnRlbnQubWFya2Rvd24sXHJcblx0XHRcdFx0Ym9keUVsLFxyXG5cdFx0XHRcdFwiXCIsXHJcblx0XHRcdFx0dGhpcy5wbHVnaW4sXHJcblx0XHRcdCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHRib2R5RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogXCJObyBjaGFuZ2Vsb2cgaW5mb3JtYXRpb24gYXZhaWxhYmxlLlwiLFxyXG5cdFx0fSk7XHJcblx0fVxyXG59XHJcbiJdfQ==