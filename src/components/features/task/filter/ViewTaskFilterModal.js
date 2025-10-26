import { Modal } from "obsidian";
import { TaskFilterComponent } from "./ViewTaskFilter";
export class ViewTaskFilterModal extends Modal {
    constructor(app, leafId, plugin) {
        super(app);
        this.leafId = leafId;
        this.filterCloseCallback = null;
        this.plugin = plugin;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        this.taskFilterComponent = new TaskFilterComponent(this.contentEl, this.app, this.leafId, this.plugin);
        // Ensure the component is properly loaded
        this.taskFilterComponent.onload();
    }
    onClose() {
        const { contentEl } = this;
        // 获取过滤状态并触发回调
        let filterState = undefined;
        if (this.taskFilterComponent) {
            try {
                filterState = this.taskFilterComponent.getFilterState();
                this.taskFilterComponent.onunload();
            }
            catch (error) {
                console.error("Failed to get filter state before modal close", error);
            }
        }
        contentEl.empty();
        // 调用自定义关闭回调
        if (this.filterCloseCallback) {
            try {
                this.filterCloseCallback(filterState);
            }
            catch (error) {
                console.error("Error in filter close callback", error);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVmlld1Rhc2tGaWx0ZXJNb2RhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlZpZXdUYXNrRmlsdGVyTW9kYWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0EsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUNqQyxPQUFPLEVBQUUsbUJBQW1CLEVBQW1CLE1BQU0sa0JBQWtCLENBQUM7QUFHeEUsTUFBTSxPQUFPLG1CQUFvQixTQUFRLEtBQUs7SUFPN0MsWUFDQyxHQUFRLEVBQ0EsTUFBZSxFQUN2QixNQUE4QjtRQUU5QixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFISCxXQUFNLEdBQU4sTUFBTSxDQUFTO1FBUGpCLHdCQUFtQixHQUVoQixJQUFJLENBQUM7UUFTZCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztJQUN0QixDQUFDO0lBRUQsTUFBTTtRQUNMLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFDM0IsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRWxCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixDQUNqRCxJQUFJLENBQUMsU0FBUyxFQUNkLElBQUksQ0FBQyxHQUFHLEVBQ1IsSUFBSSxDQUFDLE1BQU0sRUFDWCxJQUFJLENBQUMsTUFBTSxDQUNYLENBQUM7UUFDRiwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFRCxPQUFPO1FBQ04sTUFBTSxFQUFFLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQztRQUUzQixjQUFjO1FBQ2QsSUFBSSxXQUFXLEdBQWdDLFNBQVMsQ0FBQztRQUN6RCxJQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtZQUM3QixJQUFJO2dCQUNILFdBQVcsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUNwQztZQUFDLE9BQU8sS0FBSyxFQUFFO2dCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1osK0NBQStDLEVBQy9DLEtBQUssQ0FDTCxDQUFDO2FBQ0Y7U0FDRDtRQUVELFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVsQixZQUFZO1FBQ1osSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7WUFDN0IsSUFBSTtnQkFDSCxJQUFJLENBQUMsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUM7YUFDdEM7WUFBQyxPQUFPLEtBQUssRUFBRTtnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO2FBQ3ZEO1NBQ0Q7SUFDRixDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgTW9kYWwgfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuaW1wb3J0IHsgVGFza0ZpbHRlckNvbXBvbmVudCwgUm9vdEZpbHRlclN0YXRlIH0gZnJvbSBcIi4vVmlld1Rhc2tGaWx0ZXJcIjtcclxuaW1wb3J0IHR5cGUgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCJAL2luZGV4XCI7XHJcblxyXG5leHBvcnQgY2xhc3MgVmlld1Rhc2tGaWx0ZXJNb2RhbCBleHRlbmRzIE1vZGFsIHtcclxuXHRwdWJsaWMgdGFza0ZpbHRlckNvbXBvbmVudDogVGFza0ZpbHRlckNvbXBvbmVudDtcclxuXHRwdWJsaWMgZmlsdGVyQ2xvc2VDYWxsYmFjazpcclxuXHRcdHwgKChmaWx0ZXJTdGF0ZT86IFJvb3RGaWx0ZXJTdGF0ZSkgPT4gdm9pZClcclxuXHRcdHwgbnVsbCA9IG51bGw7XHJcblx0cHJpdmF0ZSBwbHVnaW4/OiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKFxyXG5cdFx0YXBwOiBBcHAsXHJcblx0XHRwcml2YXRlIGxlYWZJZD86IHN0cmluZyxcclxuXHRcdHBsdWdpbj86IFRhc2tQcm9ncmVzc0JhclBsdWdpblxyXG5cdCkge1xyXG5cdFx0c3VwZXIoYXBwKTtcclxuXHRcdHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG5cdH1cclxuXHJcblx0b25PcGVuKCkge1xyXG5cdFx0Y29uc3QgeyBjb250ZW50RWwgfSA9IHRoaXM7XHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHR0aGlzLnRhc2tGaWx0ZXJDb21wb25lbnQgPSBuZXcgVGFza0ZpbHRlckNvbXBvbmVudChcclxuXHRcdFx0dGhpcy5jb250ZW50RWwsXHJcblx0XHRcdHRoaXMuYXBwLFxyXG5cdFx0XHR0aGlzLmxlYWZJZCxcclxuXHRcdFx0dGhpcy5wbHVnaW5cclxuXHRcdCk7XHJcblx0XHQvLyBFbnN1cmUgdGhlIGNvbXBvbmVudCBpcyBwcm9wZXJseSBsb2FkZWRcclxuXHRcdHRoaXMudGFza0ZpbHRlckNvbXBvbmVudC5vbmxvYWQoKTtcclxuXHR9XHJcblxyXG5cdG9uQ2xvc2UoKSB7XHJcblx0XHRjb25zdCB7IGNvbnRlbnRFbCB9ID0gdGhpcztcclxuXHJcblx0XHQvLyDojrflj5bov4fmu6TnirbmgIHlubbop6blj5Hlm57osINcclxuXHRcdGxldCBmaWx0ZXJTdGF0ZTogUm9vdEZpbHRlclN0YXRlIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkO1xyXG5cdFx0aWYgKHRoaXMudGFza0ZpbHRlckNvbXBvbmVudCkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdGZpbHRlclN0YXRlID0gdGhpcy50YXNrRmlsdGVyQ29tcG9uZW50LmdldEZpbHRlclN0YXRlKCk7XHJcblx0XHRcdFx0dGhpcy50YXNrRmlsdGVyQ29tcG9uZW50Lm9udW5sb2FkKCk7XHJcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XHJcblx0XHRcdFx0Y29uc29sZS5lcnJvcihcclxuXHRcdFx0XHRcdFwiRmFpbGVkIHRvIGdldCBmaWx0ZXIgc3RhdGUgYmVmb3JlIG1vZGFsIGNsb3NlXCIsXHJcblx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHRjb250ZW50RWwuZW1wdHkoKTtcclxuXHJcblx0XHQvLyDosIPnlKjoh6rlrprkuYnlhbPpl63lm57osINcclxuXHRcdGlmICh0aGlzLmZpbHRlckNsb3NlQ2FsbGJhY2spIHtcclxuXHRcdFx0dHJ5IHtcclxuXHRcdFx0XHR0aGlzLmZpbHRlckNsb3NlQ2FsbGJhY2soZmlsdGVyU3RhdGUpO1xyXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xyXG5cdFx0XHRcdGNvbnNvbGUuZXJyb3IoXCJFcnJvciBpbiBmaWx0ZXIgY2xvc2UgY2FsbGJhY2tcIiwgZXJyb3IpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcbiJdfQ==