import { setIcon } from "obsidian";
/**
 * Alert component for messages and notifications
 * Follows shadcn design with subtle backgrounds and borders
 */
export class Alert {
    /**
     * Create an alert element
     */
    static create(container, message, options = {}) {
        const { variant = "info", icon, title, showIcon = true, className = "", } = options;
        const alert = container.createDiv({
            cls: `onboarding-alert onboarding-alert-${variant} ${className}`,
        });
        // Icon
        if (showIcon) {
            const iconName = icon || this.VARIANT_ICONS[variant];
            const iconEl = alert.createDiv({ cls: "onboarding-alert-icon" });
            setIcon(iconEl, iconName);
        }
        // Content
        const content = alert.createDiv({ cls: "onboarding-alert-content" });
        // Title (optional)
        if (title) {
            content.createEl("div", {
                text: title,
                cls: "onboarding-alert-title",
            });
        }
        // Message
        content.createEl("div", {
            text: message,
            cls: "onboarding-alert-message",
        });
        return alert;
    }
}
Alert.VARIANT_ICONS = {
    info: "info",
    success: "check-circle",
    warning: "alert-triangle",
    error: "alert-circle",
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWxlcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJBbGVydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBWW5DOzs7R0FHRztBQUNILE1BQU0sT0FBTyxLQUFLO0lBUWpCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FDWixTQUFzQixFQUN0QixPQUFlLEVBQ2YsVUFBd0IsRUFBRTtRQUUxQixNQUFNLEVBQ0wsT0FBTyxHQUFHLE1BQU0sRUFDaEIsSUFBSSxFQUNKLEtBQUssRUFDTCxRQUFRLEdBQUcsSUFBSSxFQUNmLFNBQVMsR0FBRyxFQUFFLEdBQ2QsR0FBRyxPQUFPLENBQUM7UUFFWixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDO1lBQ2pDLEdBQUcsRUFBRSxxQ0FBcUMsT0FBTyxJQUFJLFNBQVMsRUFBRTtTQUNoRSxDQUFDLENBQUM7UUFFSCxPQUFPO1FBQ1AsSUFBSSxRQUFRLEVBQUU7WUFDYixNQUFNLFFBQVEsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNyRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLHVCQUF1QixFQUFFLENBQUMsQ0FBQztZQUNqRSxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQzFCO1FBRUQsVUFBVTtRQUNWLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1FBRXJFLG1CQUFtQjtRQUNuQixJQUFJLEtBQUssRUFBRTtZQUNWLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO2dCQUN2QixJQUFJLEVBQUUsS0FBSztnQkFDWCxHQUFHLEVBQUUsd0JBQXdCO2FBQzdCLENBQUMsQ0FBQztTQUNIO1FBRUQsVUFBVTtRQUNWLE9BQU8sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO1lBQ3ZCLElBQUksRUFBRSxPQUFPO1lBQ2IsR0FBRyxFQUFFLDBCQUEwQjtTQUMvQixDQUFDLENBQUM7UUFFSCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7O0FBcER1QixtQkFBYSxHQUFpQztJQUNyRSxJQUFJLEVBQUUsTUFBTTtJQUNaLE9BQU8sRUFBRSxjQUFjO0lBQ3ZCLE9BQU8sRUFBRSxnQkFBZ0I7SUFDekIsS0FBSyxFQUFFLGNBQWM7Q0FDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHNldEljb24gfSBmcm9tIFwib2JzaWRpYW5cIjtcclxuXHJcbmV4cG9ydCB0eXBlIEFsZXJ0VmFyaWFudCA9IFwiaW5mb1wiIHwgXCJzdWNjZXNzXCIgfCBcIndhcm5pbmdcIiB8IFwiZXJyb3JcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQWxlcnRPcHRpb25zIHtcclxuXHR2YXJpYW50PzogQWxlcnRWYXJpYW50O1xyXG5cdGljb24/OiBzdHJpbmc7XHJcblx0dGl0bGU/OiBzdHJpbmc7XHJcblx0c2hvd0ljb24/OiBib29sZWFuO1xyXG5cdGNsYXNzTmFtZT86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEFsZXJ0IGNvbXBvbmVudCBmb3IgbWVzc2FnZXMgYW5kIG5vdGlmaWNhdGlvbnNcclxuICogRm9sbG93cyBzaGFkY24gZGVzaWduIHdpdGggc3VidGxlIGJhY2tncm91bmRzIGFuZCBib3JkZXJzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQWxlcnQge1xyXG5cdHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IFZBUklBTlRfSUNPTlM6IFJlY29yZDxBbGVydFZhcmlhbnQsIHN0cmluZz4gPSB7XHJcblx0XHRpbmZvOiBcImluZm9cIixcclxuXHRcdHN1Y2Nlc3M6IFwiY2hlY2stY2lyY2xlXCIsXHJcblx0XHR3YXJuaW5nOiBcImFsZXJ0LXRyaWFuZ2xlXCIsXHJcblx0XHRlcnJvcjogXCJhbGVydC1jaXJjbGVcIixcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBDcmVhdGUgYW4gYWxlcnQgZWxlbWVudFxyXG5cdCAqL1xyXG5cdHN0YXRpYyBjcmVhdGUoXHJcblx0XHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdFx0bWVzc2FnZTogc3RyaW5nLFxyXG5cdFx0b3B0aW9uczogQWxlcnRPcHRpb25zID0ge31cclxuXHQpOiBIVE1MRWxlbWVudCB7XHJcblx0XHRjb25zdCB7XHJcblx0XHRcdHZhcmlhbnQgPSBcImluZm9cIixcclxuXHRcdFx0aWNvbixcclxuXHRcdFx0dGl0bGUsXHJcblx0XHRcdHNob3dJY29uID0gdHJ1ZSxcclxuXHRcdFx0Y2xhc3NOYW1lID0gXCJcIixcclxuXHRcdH0gPSBvcHRpb25zO1xyXG5cclxuXHRcdGNvbnN0IGFsZXJ0ID0gY29udGFpbmVyLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYG9uYm9hcmRpbmctYWxlcnQgb25ib2FyZGluZy1hbGVydC0ke3ZhcmlhbnR9ICR7Y2xhc3NOYW1lfWAsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBJY29uXHJcblx0XHRpZiAoc2hvd0ljb24pIHtcclxuXHRcdFx0Y29uc3QgaWNvbk5hbWUgPSBpY29uIHx8IHRoaXMuVkFSSUFOVF9JQ09OU1t2YXJpYW50XTtcclxuXHRcdFx0Y29uc3QgaWNvbkVsID0gYWxlcnQuY3JlYXRlRGl2KHsgY2xzOiBcIm9uYm9hcmRpbmctYWxlcnQtaWNvblwiIH0pO1xyXG5cdFx0XHRzZXRJY29uKGljb25FbCwgaWNvbk5hbWUpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIENvbnRlbnRcclxuXHRcdGNvbnN0IGNvbnRlbnQgPSBhbGVydC5jcmVhdGVEaXYoeyBjbHM6IFwib25ib2FyZGluZy1hbGVydC1jb250ZW50XCIgfSk7XHJcblxyXG5cdFx0Ly8gVGl0bGUgKG9wdGlvbmFsKVxyXG5cdFx0aWYgKHRpdGxlKSB7XHJcblx0XHRcdGNvbnRlbnQuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHRcdHRleHQ6IHRpdGxlLFxyXG5cdFx0XHRcdGNsczogXCJvbmJvYXJkaW5nLWFsZXJ0LXRpdGxlXCIsXHJcblx0XHRcdH0pO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE1lc3NhZ2VcclxuXHRcdGNvbnRlbnQuY3JlYXRlRWwoXCJkaXZcIiwge1xyXG5cdFx0XHR0ZXh0OiBtZXNzYWdlLFxyXG5cdFx0XHRjbHM6IFwib25ib2FyZGluZy1hbGVydC1tZXNzYWdlXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHRyZXR1cm4gYWxlcnQ7XHJcblx0fVxyXG59XHJcbiJdfQ==