import { __awaiter } from "tslib";
import { Setting } from "obsidian";
import { t } from "@/translations/helper";
import { ConfirmModal } from "@/components/ui/modals/ConfirmModal";
export function renderBasesSettingsTab(settingTab, containerEl) {
    new Setting(containerEl)
        .setName(t("Base View"))
        .setDesc(t("Advanced view management features that extend the default Task Genius views with additional functionality."))
        .setHeading();
    const descFragment = new DocumentFragment();
    descFragment.createEl("span", {
        text: t("Enable Base View functionality. This feature provides enhanced view management capabilities but may be affected by future Obsidian API changes. You may need to restart Obsidian to see the changes."),
    });
    descFragment.createEl("div", {
        text: t("You need to close all bases view if you already create task view in them and remove unused view via edit them manually when disable this feature."),
        cls: "mod-warning",
    });
    new Setting(containerEl)
        .setName(t("Enable Base View"))
        .setDesc(descFragment)
        .addToggle((toggle) => {
        var _a;
        return toggle
            .setValue(((_a = settingTab.plugin.settings.betaTest) === null || _a === void 0 ? void 0 : _a.enableBaseView) || false)
            .onChange((value) => __awaiter(this, void 0, void 0, function* () {
            if (value) {
                new ConfirmModal(settingTab.plugin, {
                    title: t("Enable Base View"),
                    message: t("Enable Base View functionality. This feature provides enhanced view management capabilities but may be affected by future Obsidian API changes."),
                    confirmText: t("Enable"),
                    cancelText: t("Cancel"),
                    onConfirm: (confirmed) => {
                        if (!confirmed) {
                            setTimeout(() => {
                                toggle.setValue(false);
                                settingTab.display();
                            }, 200);
                            return;
                        }
                        if (!settingTab.plugin.settings.betaTest) {
                            settingTab.plugin.settings.betaTest = {
                                enableBaseView: false,
                            };
                        }
                        settingTab.plugin.settings.betaTest.enableBaseView =
                            confirmed;
                        settingTab.applySettingsUpdate();
                        setTimeout(() => {
                            settingTab.display();
                        }, 200);
                    },
                }).open();
            }
            else {
                if (settingTab.plugin.settings.betaTest) {
                    settingTab.plugin.settings.betaTest.enableBaseView =
                        false;
                }
                settingTab.applySettingsUpdate();
                setTimeout(() => {
                    settingTab.display();
                }, 200);
            }
        }));
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQmFzZXNTZXR0aW5nc1RhYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIkJhc2VzU2V0dGluZ3NUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFFbkMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQzFDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVuRSxNQUFNLFVBQVUsc0JBQXNCLENBQUMsVUFBcUMsRUFDM0UsV0FBd0I7SUFFckIsSUFBSSxPQUFPLENBQUMsV0FBVyxDQUFDO1NBQ3pCLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7U0FDdkIsT0FBTyxDQUNQLENBQUMsQ0FDQSw0R0FBNEcsQ0FDNUcsQ0FDRDtTQUNBLFVBQVUsRUFBRSxDQUFDO0lBRWYsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO0lBQzVDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO1FBQzdCLElBQUksRUFBRSxDQUFDLENBQ04sc01BQXNNLENBQ3RNO0tBQ0QsQ0FBQyxDQUFDO0lBRUgsWUFBWSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUU7UUFDNUIsSUFBSSxFQUFFLENBQUMsQ0FDTixtSkFBbUosQ0FDbko7UUFDRCxHQUFHLEVBQUUsYUFBYTtLQUNsQixDQUFDLENBQUM7SUFFSCxJQUFJLE9BQU8sQ0FBQyxXQUFXLENBQUM7U0FDdEIsT0FBTyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQzlCLE9BQU8sQ0FBQyxZQUFZLENBQUM7U0FDckIsU0FBUyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7O1FBQ3JCLE9BQUEsTUFBTTthQUNKLFFBQVEsQ0FDUixDQUFBLE1BQUEsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSwwQ0FBRSxjQUFjLEtBQUksS0FBSyxDQUM1RDthQUNBLFFBQVEsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFO1lBQ3pCLElBQUksS0FBSyxFQUFFO2dCQUNWLElBQUksWUFBWSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUU7b0JBQ25DLEtBQUssRUFBRSxDQUFDLENBQUMsa0JBQWtCLENBQUM7b0JBQzVCLE9BQU8sRUFBRSxDQUFDLENBQ1QsaUpBQWlKLENBQ2pKO29CQUNELFdBQVcsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUN4QixVQUFVLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztvQkFDdkIsU0FBUyxFQUFFLENBQUMsU0FBa0IsRUFBRSxFQUFFO3dCQUNqQyxJQUFJLENBQUMsU0FBUyxFQUFFOzRCQUNmLFVBQVUsQ0FBQyxHQUFHLEVBQUU7Z0NBQ2YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQ0FDdkIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDOzRCQUN0QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7NEJBQ1IsT0FBTzt5QkFDUDt3QkFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFOzRCQUN6QyxVQUFVLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEdBQUc7Z0NBQ3JDLGNBQWMsRUFBRSxLQUFLOzZCQUNyQixDQUFDO3lCQUNGO3dCQUNELFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxjQUFjOzRCQUNqRCxTQUFTLENBQUM7d0JBQ1gsVUFBVSxDQUFDLG1CQUFtQixFQUFFLENBQUM7d0JBQ2pDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7NEJBQ2YsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO3dCQUN0QixDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ1QsQ0FBQztpQkFDRCxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7YUFDVjtpQkFBTTtnQkFDTixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtvQkFDeEMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGNBQWM7d0JBQ2pELEtBQUssQ0FBQztpQkFDUDtnQkFDRCxVQUFVLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDakMsVUFBVSxDQUFDLEdBQUcsRUFBRTtvQkFDZixVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ3RCLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQzthQUNSO1FBQ0YsQ0FBQyxDQUFBLENBQUMsQ0FBQTtLQUFBLENBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFRhc2tQcm9ncmVzc0JhclNldHRpbmdUYWIgfSBmcm9tIFwiQC9zZXR0aW5nXCI7XHJcbmltcG9ydCB7IHQgfSBmcm9tIFwiQC90cmFuc2xhdGlvbnMvaGVscGVyXCI7XHJcbmltcG9ydCB7IENvbmZpcm1Nb2RhbCB9IGZyb20gXCJAL2NvbXBvbmVudHMvdWkvbW9kYWxzL0NvbmZpcm1Nb2RhbFwiO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbmRlckJhc2VzU2V0dGluZ3NUYWIoc2V0dGluZ1RhYjogVGFza1Byb2dyZXNzQmFyU2V0dGluZ1RhYixcclxuXHRjb250YWluZXJFbDogSFRNTEVsZW1lbnRcclxuKSB7XHJcbiAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJCYXNlIFZpZXdcIikpXHJcblx0XHQuc2V0RGVzYyhcclxuXHRcdFx0dChcclxuXHRcdFx0XHRcIkFkdmFuY2VkIHZpZXcgbWFuYWdlbWVudCBmZWF0dXJlcyB0aGF0IGV4dGVuZCB0aGUgZGVmYXVsdCBUYXNrIEdlbml1cyB2aWV3cyB3aXRoIGFkZGl0aW9uYWwgZnVuY3Rpb25hbGl0eS5cIlxyXG5cdFx0XHQpXHJcblx0XHQpXHJcblx0XHQuc2V0SGVhZGluZygpO1xyXG5cclxuXHRjb25zdCBkZXNjRnJhZ21lbnQgPSBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xyXG5cdGRlc2NGcmFnbWVudC5jcmVhdGVFbChcInNwYW5cIiwge1xyXG5cdFx0dGV4dDogdChcclxuXHRcdFx0XCJFbmFibGUgQmFzZSBWaWV3IGZ1bmN0aW9uYWxpdHkuIFRoaXMgZmVhdHVyZSBwcm92aWRlcyBlbmhhbmNlZCB2aWV3IG1hbmFnZW1lbnQgY2FwYWJpbGl0aWVzIGJ1dCBtYXkgYmUgYWZmZWN0ZWQgYnkgZnV0dXJlIE9ic2lkaWFuIEFQSSBjaGFuZ2VzLiBZb3UgbWF5IG5lZWQgdG8gcmVzdGFydCBPYnNpZGlhbiB0byBzZWUgdGhlIGNoYW5nZXMuXCJcclxuXHRcdCksXHJcblx0fSk7XHJcblxyXG5cdGRlc2NGcmFnbWVudC5jcmVhdGVFbChcImRpdlwiLCB7XHJcblx0XHR0ZXh0OiB0KFxyXG5cdFx0XHRcIllvdSBuZWVkIHRvIGNsb3NlIGFsbCBiYXNlcyB2aWV3IGlmIHlvdSBhbHJlYWR5IGNyZWF0ZSB0YXNrIHZpZXcgaW4gdGhlbSBhbmQgcmVtb3ZlIHVudXNlZCB2aWV3IHZpYSBlZGl0IHRoZW0gbWFudWFsbHkgd2hlbiBkaXNhYmxlIHRoaXMgZmVhdHVyZS5cIlxyXG5cdFx0KSxcclxuXHRcdGNsczogXCJtb2Qtd2FybmluZ1wiLFxyXG5cdH0pO1xyXG5cclxuXHRuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuXHRcdC5zZXROYW1lKHQoXCJFbmFibGUgQmFzZSBWaWV3XCIpKVxyXG5cdFx0LnNldERlc2MoZGVzY0ZyYWdtZW50KVxyXG5cdFx0LmFkZFRvZ2dsZSgodG9nZ2xlKSA9PlxyXG5cdFx0XHR0b2dnbGVcclxuXHRcdFx0XHQuc2V0VmFsdWUoXHJcblx0XHRcdFx0XHRzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5iZXRhVGVzdD8uZW5hYmxlQmFzZVZpZXcgfHwgZmFsc2VcclxuXHRcdFx0XHQpXHJcblx0XHRcdFx0Lm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG5cdFx0XHRcdFx0aWYgKHZhbHVlKSB7XHJcblx0XHRcdFx0XHRcdG5ldyBDb25maXJtTW9kYWwoc2V0dGluZ1RhYi5wbHVnaW4sIHtcclxuXHRcdFx0XHRcdFx0XHR0aXRsZTogdChcIkVuYWJsZSBCYXNlIFZpZXdcIiksXHJcblx0XHRcdFx0XHRcdFx0bWVzc2FnZTogdChcclxuXHRcdFx0XHRcdFx0XHRcdFwiRW5hYmxlIEJhc2UgVmlldyBmdW5jdGlvbmFsaXR5LiBUaGlzIGZlYXR1cmUgcHJvdmlkZXMgZW5oYW5jZWQgdmlldyBtYW5hZ2VtZW50IGNhcGFiaWxpdGllcyBidXQgbWF5IGJlIGFmZmVjdGVkIGJ5IGZ1dHVyZSBPYnNpZGlhbiBBUEkgY2hhbmdlcy5cIlxyXG5cdFx0XHRcdFx0XHRcdCksXHJcblx0XHRcdFx0XHRcdFx0Y29uZmlybVRleHQ6IHQoXCJFbmFibGVcIiksXHJcblx0XHRcdFx0XHRcdFx0Y2FuY2VsVGV4dDogdChcIkNhbmNlbFwiKSxcclxuXHRcdFx0XHRcdFx0XHRvbkNvbmZpcm06IChjb25maXJtZWQ6IGJvb2xlYW4pID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdGlmICghY29uZmlybWVkKSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdHRvZ2dsZS5zZXRWYWx1ZShmYWxzZSk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdH0sIDIwMCk7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0XHRcdFx0XHRpZiAoIXNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmJldGFUZXN0KSB7XHJcblx0XHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmJldGFUZXN0ID0ge1xyXG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVuYWJsZUJhc2VWaWV3OiBmYWxzZSxcclxuXHRcdFx0XHRcdFx0XHRcdFx0fTtcclxuXHRcdFx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmJldGFUZXN0LmVuYWJsZUJhc2VWaWV3ID1cclxuXHRcdFx0XHRcdFx0XHRcdFx0Y29uZmlybWVkO1xyXG5cdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5hcHBseVNldHRpbmdzVXBkYXRlKCk7XHJcblx0XHRcdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRcdFx0c2V0dGluZ1RhYi5kaXNwbGF5KCk7XHJcblx0XHRcdFx0XHRcdFx0XHR9LCAyMDApO1xyXG5cdFx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdH0pLm9wZW4oKTtcclxuXHRcdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRcdGlmIChzZXR0aW5nVGFiLnBsdWdpbi5zZXR0aW5ncy5iZXRhVGVzdCkge1xyXG5cdFx0XHRcdFx0XHRcdHNldHRpbmdUYWIucGx1Z2luLnNldHRpbmdzLmJldGFUZXN0LmVuYWJsZUJhc2VWaWV3ID1cclxuXHRcdFx0XHRcdFx0XHRcdGZhbHNlO1xyXG5cdFx0XHRcdFx0XHR9XHJcblx0XHRcdFx0XHRcdHNldHRpbmdUYWIuYXBwbHlTZXR0aW5nc1VwZGF0ZSgpO1xyXG5cdFx0XHRcdFx0XHRzZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0XHRcdFx0XHRzZXR0aW5nVGFiLmRpc3BsYXkoKTtcclxuXHRcdFx0XHRcdFx0fSwgMjAwKTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9KVxyXG5cdFx0KTtcclxufSJdfQ==