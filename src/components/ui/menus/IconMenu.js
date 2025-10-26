import { debounce, getIconIds, Notice, setIcon } from "obsidian";
export const attachIconMenu = (btn, params) => {
    let menuRef = null;
    const btnEl = btn.buttonEl;
    const win = params.containerEl.win;
    let availableIcons = [];
    try {
        if (typeof getIconIds === "function") {
            availableIcons = getIconIds();
        }
        else {
            console.warn("Task Genius: getIconIds() not available.");
        }
    }
    catch (e) {
        console.error("Task Genius: Error calling getIconIds():", e);
    }
    const showMenu = () => {
        console.log("showMenu", availableIcons.length);
        if (!availableIcons.length) {
            new Notice("Icon list unavailable.");
            return;
        }
        menuRef = params.containerEl.createDiv("tg-icon-menu bm-menu");
        const scrollParent = btnEl.closest(".vertical-tab-content") || params.containerEl;
        let iconEls = {};
        const searchInput = menuRef.createEl("input", {
            attr: { type: "text", placeholder: "Search icons..." },
            cls: "tg-menu-search",
        });
        win.setTimeout(() => searchInput.focus(), 50);
        const searchInputClickHandler = () => {
            setTimeout(() => {
                searchInput.focus();
            }, 400);
        };
        const searchInputBlurHandler = () => {
            searchInput.focus();
        };
        const iconList = menuRef.createDiv("tg-menu-icons");
        const ICONS_PER_BATCH = 100;
        let currentBatch = 0;
        let isSearchActive = false;
        const renderIcons = (iconsToRender, resetBatch = true) => {
            if (resetBatch) {
                iconList.empty();
                iconEls = {};
                currentBatch = 0;
            }
            if (!iconsToRender.length && currentBatch === 0) {
                iconList.empty();
                iconList.createEl("p", {
                    text: "No matching icons found.",
                });
                return;
            }
            const startIdx = isSearchActive
                ? 0
                : currentBatch * ICONS_PER_BATCH;
            const endIdx = isSearchActive
                ? iconsToRender.length
                : Math.min((currentBatch + 1) * ICONS_PER_BATCH, iconsToRender.length);
            if (startIdx >= endIdx && !isSearchActive)
                return; // Already loaded all available icons
            const iconsToShow = iconsToRender.slice(startIdx, endIdx);
            iconsToShow.forEach((iconId) => {
                const iconEl = iconList.createDiv({
                    cls: "clickable-icon",
                    attr: { "data-icon": iconId, "aria-label": iconId },
                });
                iconEls[iconId] = iconEl;
                setIcon(iconEl, iconId);
                iconEl.addEventListener("click", () => {
                    params.onIconSelected(iconId);
                    destroyMenu();
                });
            });
            if (!isSearchActive) {
                currentBatch++;
            }
            win.setTimeout(calcMenuPos, 0);
        };
        const iconListScrollHandler = () => {
            const { scrollTop, scrollHeight, clientHeight } = iconList;
            if (isSearchActive)
                return;
            if (scrollHeight - scrollTop - clientHeight < 50) {
                // console.log("Near bottom detected");
                if (currentBatch * ICONS_PER_BATCH < availableIcons.length) {
                    renderIcons(availableIcons, false);
                }
                else {
                    // console.log("No more icons to lazy load.");
                }
            }
        };
        const destroyMenu = () => {
            if (menuRef) {
                menuRef.remove();
                menuRef = null;
            }
            win.removeEventListener("click", clickOutside);
            scrollParent === null || scrollParent === void 0 ? void 0 : scrollParent.removeEventListener("scroll", scrollHandler);
            iconList.removeEventListener("scroll", iconListScrollHandler);
            searchInput.removeEventListener("click", searchInputClickHandler);
            searchInput.removeEventListener("blur", searchInputBlurHandler);
        };
        const clickOutside = (e) => {
            // Don't close the menu if clicking on the search input
            if (menuRef && !menuRef.contains(e.target)) {
                destroyMenu();
            }
        };
        const handleSearch = debounce(() => {
            const query = searchInput.value.toLowerCase().trim();
            if (!query) {
                isSearchActive = false;
                renderIcons(availableIcons);
            }
            else {
                isSearchActive = true;
                const results = availableIcons.filter((iconId) => iconId.toLowerCase().includes(query));
                renderIcons(results);
            }
        }, 250, true);
        const calcMenuPos = () => {
            if (!menuRef)
                return;
            const rect = btnEl.getBoundingClientRect();
            const menuHeight = menuRef.offsetHeight;
            const menuWidth = menuRef.offsetWidth; // Get menu width
            const viewportWidth = win.innerWidth;
            const viewportHeight = win.innerHeight;
            let top = rect.bottom + 2; // Position below the button (viewport coordinates)
            let left = rect.left; // Position aligned with button left (viewport coordinates)
            // Check if menu goes off bottom edge
            if (top + menuHeight > viewportHeight - 20) {
                top = rect.top - menuHeight - 2; // Position above the button
            }
            // Check if menu goes off top edge (e.g., after being positioned above)
            if (top < 0) {
                top = 5; // Place near top edge if it overflows both top and bottom
            }
            // Check if menu goes off right edge
            if (left + menuWidth > viewportWidth - 20) {
                left = rect.right - menuWidth; // Align right edge of menu with right edge of button
                // Adjust if button itself is wider than menu allows sticking right
                if (left < 0) {
                    left = 5; // Place near left edge as fallback
                }
            }
            // Check if menu goes off left edge
            if (left < 0) {
                left = 5; // Place near left edge
            }
            // Use fixed positioning as the element is appended to body
            menuRef.style.position = "fixed";
            menuRef.style.top = `${top}px`;
            menuRef.style.left = `${left}px`;
        };
        const scrollHandler = () => {
            if (menuRef) {
                destroyMenu();
            }
            else {
                destroyMenu();
            }
        };
        // Prevent the search input from losing focus when clicked
        searchInput.addEventListener("click", searchInputClickHandler);
        searchInput.addEventListener("blur", searchInputBlurHandler);
        iconList.addEventListener("scroll", iconListScrollHandler);
        renderIcons(availableIcons);
        searchInput.addEventListener("input", handleSearch);
        document.body.appendChild(menuRef);
        calcMenuPos();
        win.setTimeout(() => {
            win.addEventListener("click", clickOutside);
            scrollParent === null || scrollParent === void 0 ? void 0 : scrollParent.addEventListener("scroll", scrollHandler);
        }, 10);
    };
    btn.onClick(() => {
        if (menuRef) {
            // Let clickOutside handle closing
        }
        else {
            showMenu();
        }
    });
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSWNvbk1lbnUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJJY29uTWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBS2pFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxDQUM3QixHQUFvQixFQUNwQixNQUlDLEVBQ0EsRUFBRTtJQUNILElBQUksT0FBTyxHQUEwQixJQUFJLENBQUM7SUFDMUMsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztJQUMzQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztJQUVuQyxJQUFJLGNBQWMsR0FBYSxFQUFFLENBQUM7SUFDbEMsSUFBSTtRQUNILElBQUksT0FBTyxVQUFVLEtBQUssVUFBVSxFQUFFO1lBQ3JDLGNBQWMsR0FBRyxVQUFVLEVBQUUsQ0FBQztTQUM5QjthQUFNO1lBQ04sT0FBTyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1NBQ3pEO0tBQ0Q7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsMENBQTBDLEVBQUUsQ0FBQyxDQUFDLENBQUM7S0FDN0Q7SUFFRCxNQUFNLFFBQVEsR0FBRyxHQUFHLEVBQUU7UUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9DLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFO1lBQzNCLElBQUksTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDckMsT0FBTztTQUNQO1FBRUQsT0FBTyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDL0QsTUFBTSxZQUFZLEdBQ2pCLEtBQUssQ0FBQyxPQUFPLENBQUMsdUJBQXVCLENB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LENBQUM7YUFDZDtRQUNGLENBQUMsQ0FBQztRQUVGLDBEQUEwRDtRQUMxRCxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFDL0QsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO1FBRTdELFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUscUJBQXFCLENBQUMsQ0FBQztRQUUzRCxXQUFXLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFNUIsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVwRCxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNuQyxXQUFXLEVBQUUsQ0FBQztRQUVkLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ25CLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDNUMsWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN6RCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUixDQUFDLENBQUM7SUFFRixHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUNoQixJQUFJLE9BQU8sRUFBRTtZQUNaLGtDQUFrQztTQUNsQzthQUFNO1lBQ04sUUFBUSxFQUFFLENBQUM7U0FDWDtJQUNGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZGVib3VuY2UsIGdldEljb25JZHMsIE5vdGljZSwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5cclxuaW1wb3J0IHsgQnV0dG9uQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4gZnJvbSBcIkAvaW5kZXhcIjtcclxuXHJcbmV4cG9ydCBjb25zdCBhdHRhY2hJY29uTWVudSA9IChcclxuXHRidG46IEJ1dHRvbkNvbXBvbmVudCxcclxuXHRwYXJhbXM6IHtcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudDtcclxuXHRcdHBsdWdpbjogVGFza1Byb2dyZXNzQmFyUGx1Z2luO1xyXG5cdFx0b25JY29uU2VsZWN0ZWQ6IChpY29uSWQ6IHN0cmluZykgPT4gdm9pZDtcclxuXHR9XHJcbikgPT4ge1xyXG5cdGxldCBtZW51UmVmOiBIVE1MRGl2RWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdGNvbnN0IGJ0bkVsID0gYnRuLmJ1dHRvbkVsO1xyXG5cdGNvbnN0IHdpbiA9IHBhcmFtcy5jb250YWluZXJFbC53aW47XHJcblxyXG5cdGxldCBhdmFpbGFibGVJY29uczogc3RyaW5nW10gPSBbXTtcclxuXHR0cnkge1xyXG5cdFx0aWYgKHR5cGVvZiBnZXRJY29uSWRzID09PSBcImZ1bmN0aW9uXCIpIHtcclxuXHRcdFx0YXZhaWxhYmxlSWNvbnMgPSBnZXRJY29uSWRzKCk7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJUYXNrIEdlbml1czogZ2V0SWNvbklkcygpIG5vdCBhdmFpbGFibGUuXCIpO1xyXG5cdFx0fVxyXG5cdH0gY2F0Y2ggKGUpIHtcclxuXHRcdGNvbnNvbGUuZXJyb3IoXCJUYXNrIEdlbml1czogRXJyb3IgY2FsbGluZyBnZXRJY29uSWRzKCk6XCIsIGUpO1xyXG5cdH1cclxuXHJcblx0Y29uc3Qgc2hvd01lbnUgPSAoKSA9PiB7XHJcblx0XHRjb25zb2xlLmxvZyhcInNob3dNZW51XCIsIGF2YWlsYWJsZUljb25zLmxlbmd0aCk7XHJcblx0XHRpZiAoIWF2YWlsYWJsZUljb25zLmxlbmd0aCkge1xyXG5cdFx0XHRuZXcgTm90aWNlKFwiSWNvbiBsaXN0IHVuYXZhaWxhYmxlLlwiKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdG1lbnVSZWYgPSBwYXJhbXMuY29udGFpbmVyRWwuY3JlYXRlRGl2KFwidGctaWNvbi1tZW51IGJtLW1lbnVcIik7XHJcblx0XHRjb25zdCBzY3JvbGxQYXJlbnQgPVxyXG5cdFx0XHRidG5FbC5jbG9zZXN0KFwiLnZlcnRpY2FsLXRhYi1jb250ZW50XCIpIHx8IHBhcmFtcy5jb250YWluZXJFbDtcclxuXHJcblx0XHRsZXQgaWNvbkVsczogUmVjb3JkPHN0cmluZywgSFRNTERpdkVsZW1lbnQ+ID0ge307XHJcblx0XHRjb25zdCBzZWFyY2hJbnB1dCA9IG1lbnVSZWYuY3JlYXRlRWwoXCJpbnB1dFwiLCB7XHJcblx0XHRcdGF0dHI6IHsgdHlwZTogXCJ0ZXh0XCIsIHBsYWNlaG9sZGVyOiBcIlNlYXJjaCBpY29ucy4uLlwiIH0sXHJcblx0XHRcdGNsczogXCJ0Zy1tZW51LXNlYXJjaFwiLFxyXG5cdFx0fSk7XHJcblx0XHR3aW4uc2V0VGltZW91dCgoKSA9PiBzZWFyY2hJbnB1dC5mb2N1cygpLCA1MCk7XHJcblxyXG5cdFx0Y29uc3Qgc2VhcmNoSW5wdXRDbGlja0hhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdHNldFRpbWVvdXQoKCkgPT4ge1xyXG5cdFx0XHRcdHNlYXJjaElucHV0LmZvY3VzKCk7XHJcblx0XHRcdH0sIDQwMCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IHNlYXJjaElucHV0Qmx1ckhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdHNlYXJjaElucHV0LmZvY3VzKCk7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGljb25MaXN0ID0gbWVudVJlZi5jcmVhdGVEaXYoXCJ0Zy1tZW51LWljb25zXCIpO1xyXG5cclxuXHRcdGNvbnN0IElDT05TX1BFUl9CQVRDSCA9IDEwMDtcclxuXHRcdGxldCBjdXJyZW50QmF0Y2ggPSAwO1xyXG5cdFx0bGV0IGlzU2VhcmNoQWN0aXZlID0gZmFsc2U7XHJcblxyXG5cdFx0Y29uc3QgcmVuZGVySWNvbnMgPSAoaWNvbnNUb1JlbmRlcjogc3RyaW5nW10sIHJlc2V0QmF0Y2ggPSB0cnVlKSA9PiB7XHJcblx0XHRcdGlmIChyZXNldEJhdGNoKSB7XHJcblx0XHRcdFx0aWNvbkxpc3QuZW1wdHkoKTtcclxuXHRcdFx0XHRpY29uRWxzID0ge307XHJcblx0XHRcdFx0Y3VycmVudEJhdGNoID0gMDtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKCFpY29uc1RvUmVuZGVyLmxlbmd0aCAmJiBjdXJyZW50QmF0Y2ggPT09IDApIHtcclxuXHRcdFx0XHRpY29uTGlzdC5lbXB0eSgpO1xyXG5cdFx0XHRcdGljb25MaXN0LmNyZWF0ZUVsKFwicFwiLCB7XHJcblx0XHRcdFx0XHR0ZXh0OiBcIk5vIG1hdGNoaW5nIGljb25zIGZvdW5kLlwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc3Qgc3RhcnRJZHggPSBpc1NlYXJjaEFjdGl2ZVxyXG5cdFx0XHRcdD8gMFxyXG5cdFx0XHRcdDogY3VycmVudEJhdGNoICogSUNPTlNfUEVSX0JBVENIO1xyXG5cdFx0XHRjb25zdCBlbmRJZHggPSBpc1NlYXJjaEFjdGl2ZVxyXG5cdFx0XHRcdD8gaWNvbnNUb1JlbmRlci5sZW5ndGhcclxuXHRcdFx0XHQ6IE1hdGgubWluKFxyXG5cdFx0XHRcdFx0XHQoY3VycmVudEJhdGNoICsgMSkgKiBJQ09OU19QRVJfQkFUQ0gsXHJcblx0XHRcdFx0XHRcdGljb25zVG9SZW5kZXIubGVuZ3RoXHJcblx0XHRcdFx0ICApO1xyXG5cclxuXHRcdFx0aWYgKHN0YXJ0SWR4ID49IGVuZElkeCAmJiAhaXNTZWFyY2hBY3RpdmUpIHJldHVybjsgLy8gQWxyZWFkeSBsb2FkZWQgYWxsIGF2YWlsYWJsZSBpY29uc1xyXG5cclxuXHRcdFx0Y29uc3QgaWNvbnNUb1Nob3cgPSBpY29uc1RvUmVuZGVyLnNsaWNlKHN0YXJ0SWR4LCBlbmRJZHgpO1xyXG5cclxuXHRcdFx0aWNvbnNUb1Nob3cuZm9yRWFjaCgoaWNvbklkKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgaWNvbkVsID0gaWNvbkxpc3QuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRcdGNsczogXCJjbGlja2FibGUtaWNvblwiLFxyXG5cdFx0XHRcdFx0YXR0cjogeyBcImRhdGEtaWNvblwiOiBpY29uSWQsIFwiYXJpYS1sYWJlbFwiOiBpY29uSWQgfSxcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0XHRpY29uRWxzW2ljb25JZF0gPSBpY29uRWw7XHJcblx0XHRcdFx0c2V0SWNvbihpY29uRWwsIGljb25JZCk7XHJcblx0XHRcdFx0aWNvbkVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcblx0XHRcdFx0XHRwYXJhbXMub25JY29uU2VsZWN0ZWQoaWNvbklkKTtcclxuXHRcdFx0XHRcdGRlc3Ryb3lNZW51KCk7XHJcblx0XHRcdFx0fSk7XHJcblx0XHRcdH0pO1xyXG5cdFx0XHRpZiAoIWlzU2VhcmNoQWN0aXZlKSB7XHJcblx0XHRcdFx0Y3VycmVudEJhdGNoKys7XHJcblx0XHRcdH1cclxuXHRcdFx0d2luLnNldFRpbWVvdXQoY2FsY01lbnVQb3MsIDApO1xyXG5cdFx0fTtcclxuXHJcblx0XHRjb25zdCBpY29uTGlzdFNjcm9sbEhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdGNvbnN0IHsgc2Nyb2xsVG9wLCBzY3JvbGxIZWlnaHQsIGNsaWVudEhlaWdodCB9ID0gaWNvbkxpc3Q7XHJcblxyXG5cdFx0XHRpZiAoaXNTZWFyY2hBY3RpdmUpIHJldHVybjtcclxuXHJcblx0XHRcdGlmIChzY3JvbGxIZWlnaHQgLSBzY3JvbGxUb3AgLSBjbGllbnRIZWlnaHQgPCA1MCkge1xyXG5cdFx0XHRcdC8vIGNvbnNvbGUubG9nKFwiTmVhciBib3R0b20gZGV0ZWN0ZWRcIik7XHJcblx0XHRcdFx0aWYgKGN1cnJlbnRCYXRjaCAqIElDT05TX1BFUl9CQVRDSCA8IGF2YWlsYWJsZUljb25zLmxlbmd0aCkge1xyXG5cdFx0XHRcdFx0cmVuZGVySWNvbnMoYXZhaWxhYmxlSWNvbnMsIGZhbHNlKTtcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJObyBtb3JlIGljb25zIHRvIGxhenkgbG9hZC5cIik7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGRlc3Ryb3lNZW51ID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAobWVudVJlZikge1xyXG5cdFx0XHRcdG1lbnVSZWYucmVtb3ZlKCk7XHJcblx0XHRcdFx0bWVudVJlZiA9IG51bGw7XHJcblx0XHRcdH1cclxuXHRcdFx0d2luLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGlja091dHNpZGUpO1xyXG5cdFx0XHRzY3JvbGxQYXJlbnQ/LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgc2Nyb2xsSGFuZGxlcik7XHJcblx0XHRcdGljb25MaXN0LnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgaWNvbkxpc3RTY3JvbGxIYW5kbGVyKTtcclxuXHRcdFx0c2VhcmNoSW5wdXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHNlYXJjaElucHV0Q2xpY2tIYW5kbGVyKTtcclxuXHRcdFx0c2VhcmNoSW5wdXQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImJsdXJcIiwgc2VhcmNoSW5wdXRCbHVySGFuZGxlcik7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGNsaWNrT3V0c2lkZSA9IChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcblx0XHRcdC8vIERvbid0IGNsb3NlIHRoZSBtZW51IGlmIGNsaWNraW5nIG9uIHRoZSBzZWFyY2ggaW5wdXRcclxuXHRcdFx0aWYgKG1lbnVSZWYgJiYgIW1lbnVSZWYuY29udGFpbnMoZS50YXJnZXQgYXMgTm9kZSkpIHtcclxuXHRcdFx0XHRkZXN0cm95TWVudSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IGhhbmRsZVNlYXJjaCA9IGRlYm91bmNlKFxyXG5cdFx0XHQoKSA9PiB7XHJcblx0XHRcdFx0Y29uc3QgcXVlcnkgPSBzZWFyY2hJbnB1dC52YWx1ZS50b0xvd2VyQ2FzZSgpLnRyaW0oKTtcclxuXHRcdFx0XHRpZiAoIXF1ZXJ5KSB7XHJcblx0XHRcdFx0XHRpc1NlYXJjaEFjdGl2ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdFx0cmVuZGVySWNvbnMoYXZhaWxhYmxlSWNvbnMpO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpc1NlYXJjaEFjdGl2ZSA9IHRydWU7XHJcblx0XHRcdFx0XHRjb25zdCByZXN1bHRzID0gYXZhaWxhYmxlSWNvbnMuZmlsdGVyKChpY29uSWQpID0+XHJcblx0XHRcdFx0XHRcdGljb25JZC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5KVxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHJlbmRlckljb25zKHJlc3VsdHMpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0MjUwLFxyXG5cdFx0XHR0cnVlXHJcblx0XHQpO1xyXG5cclxuXHRcdGNvbnN0IGNhbGNNZW51UG9zID0gKCkgPT4ge1xyXG5cdFx0XHRpZiAoIW1lbnVSZWYpIHJldHVybjtcclxuXHRcdFx0Y29uc3QgcmVjdCA9IGJ0bkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cdFx0XHRjb25zdCBtZW51SGVpZ2h0ID0gbWVudVJlZi5vZmZzZXRIZWlnaHQ7XHJcblx0XHRcdGNvbnN0IG1lbnVXaWR0aCA9IG1lbnVSZWYub2Zmc2V0V2lkdGg7IC8vIEdldCBtZW51IHdpZHRoXHJcblx0XHRcdGNvbnN0IHZpZXdwb3J0V2lkdGggPSB3aW4uaW5uZXJXaWR0aDtcclxuXHRcdFx0Y29uc3Qgdmlld3BvcnRIZWlnaHQgPSB3aW4uaW5uZXJIZWlnaHQ7XHJcblxyXG5cdFx0XHRsZXQgdG9wID0gcmVjdC5ib3R0b20gKyAyOyAvLyBQb3NpdGlvbiBiZWxvdyB0aGUgYnV0dG9uICh2aWV3cG9ydCBjb29yZGluYXRlcylcclxuXHRcdFx0bGV0IGxlZnQgPSByZWN0LmxlZnQ7IC8vIFBvc2l0aW9uIGFsaWduZWQgd2l0aCBidXR0b24gbGVmdCAodmlld3BvcnQgY29vcmRpbmF0ZXMpXHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiBtZW51IGdvZXMgb2ZmIGJvdHRvbSBlZGdlXHJcblx0XHRcdGlmICh0b3AgKyBtZW51SGVpZ2h0ID4gdmlld3BvcnRIZWlnaHQgLSAyMCkge1xyXG5cdFx0XHRcdHRvcCA9IHJlY3QudG9wIC0gbWVudUhlaWdodCAtIDI7IC8vIFBvc2l0aW9uIGFib3ZlIHRoZSBidXR0b25cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgbWVudSBnb2VzIG9mZiB0b3AgZWRnZSAoZS5nLiwgYWZ0ZXIgYmVpbmcgcG9zaXRpb25lZCBhYm92ZSlcclxuXHRcdFx0aWYgKHRvcCA8IDApIHtcclxuXHRcdFx0XHR0b3AgPSA1OyAvLyBQbGFjZSBuZWFyIHRvcCBlZGdlIGlmIGl0IG92ZXJmbG93cyBib3RoIHRvcCBhbmQgYm90dG9tXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIENoZWNrIGlmIG1lbnUgZ29lcyBvZmYgcmlnaHQgZWRnZVxyXG5cdFx0XHRpZiAobGVmdCArIG1lbnVXaWR0aCA+IHZpZXdwb3J0V2lkdGggLSAyMCkge1xyXG5cdFx0XHRcdGxlZnQgPSByZWN0LnJpZ2h0IC0gbWVudVdpZHRoOyAvLyBBbGlnbiByaWdodCBlZGdlIG9mIG1lbnUgd2l0aCByaWdodCBlZGdlIG9mIGJ1dHRvblxyXG5cdFx0XHRcdC8vIEFkanVzdCBpZiBidXR0b24gaXRzZWxmIGlzIHdpZGVyIHRoYW4gbWVudSBhbGxvd3Mgc3RpY2tpbmcgcmlnaHRcclxuXHRcdFx0XHRpZiAobGVmdCA8IDApIHtcclxuXHRcdFx0XHRcdGxlZnQgPSA1OyAvLyBQbGFjZSBuZWFyIGxlZnQgZWRnZSBhcyBmYWxsYmFja1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQ2hlY2sgaWYgbWVudSBnb2VzIG9mZiBsZWZ0IGVkZ2VcclxuXHRcdFx0aWYgKGxlZnQgPCAwKSB7XHJcblx0XHRcdFx0bGVmdCA9IDU7IC8vIFBsYWNlIG5lYXIgbGVmdCBlZGdlXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIFVzZSBmaXhlZCBwb3NpdGlvbmluZyBhcyB0aGUgZWxlbWVudCBpcyBhcHBlbmRlZCB0byBib2R5XHJcblx0XHRcdG1lbnVSZWYuc3R5bGUucG9zaXRpb24gPSBcImZpeGVkXCI7XHJcblx0XHRcdG1lbnVSZWYuc3R5bGUudG9wID0gYCR7dG9wfXB4YDtcclxuXHRcdFx0bWVudVJlZi5zdHlsZS5sZWZ0ID0gYCR7bGVmdH1weGA7XHJcblx0XHR9O1xyXG5cclxuXHRcdGNvbnN0IHNjcm9sbEhhbmRsZXIgPSAoKSA9PiB7XHJcblx0XHRcdGlmIChtZW51UmVmKSB7XHJcblx0XHRcdFx0ZGVzdHJveU1lbnUoKTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRkZXN0cm95TWVudSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFByZXZlbnQgdGhlIHNlYXJjaCBpbnB1dCBmcm9tIGxvc2luZyBmb2N1cyB3aGVuIGNsaWNrZWRcclxuXHRcdHNlYXJjaElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBzZWFyY2hJbnB1dENsaWNrSGFuZGxlcik7XHJcblx0XHRzZWFyY2hJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiYmx1clwiLCBzZWFyY2hJbnB1dEJsdXJIYW5kbGVyKTtcclxuXHJcblx0XHRpY29uTGlzdC5hZGRFdmVudExpc3RlbmVyKFwic2Nyb2xsXCIsIGljb25MaXN0U2Nyb2xsSGFuZGxlcik7XHJcblxyXG5cdFx0cmVuZGVySWNvbnMoYXZhaWxhYmxlSWNvbnMpO1xyXG5cclxuXHRcdHNlYXJjaElucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCBoYW5kbGVTZWFyY2gpO1xyXG5cclxuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobWVudVJlZik7XHJcblx0XHRjYWxjTWVudVBvcygpO1xyXG5cclxuXHRcdHdpbi5zZXRUaW1lb3V0KCgpID0+IHtcclxuXHRcdFx0d2luLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGlja091dHNpZGUpO1xyXG5cdFx0XHRzY3JvbGxQYXJlbnQ/LmFkZEV2ZW50TGlzdGVuZXIoXCJzY3JvbGxcIiwgc2Nyb2xsSGFuZGxlcik7XHJcblx0XHR9LCAxMCk7XHJcblx0fTtcclxuXHJcblx0YnRuLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0aWYgKG1lbnVSZWYpIHtcclxuXHRcdFx0Ly8gTGV0IGNsaWNrT3V0c2lkZSBoYW5kbGUgY2xvc2luZ1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0c2hvd01lbnUoKTtcclxuXHRcdH1cclxuXHR9KTtcclxufTtcclxuIl19