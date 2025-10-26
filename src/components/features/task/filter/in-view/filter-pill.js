import { Component, ExtraButtonComponent } from "obsidian";
export class FilterPill extends Component {
    constructor(options) {
        super();
        this.filter = options.filter;
        this.onRemove = options.onRemove;
    }
    onload() {
        this.element = this.createPillElement();
    }
    createPillElement() {
        // Create the main pill container
        const pill = document.createElement("div");
        pill.className = "filter-pill";
        pill.setAttribute("data-filter-id", this.filter.id);
        // Create and append category label span
        pill.createSpan({
            cls: "filter-pill-category",
            text: `${this.filter.categoryLabel}:`, // Add colon here
        });
        // Create and append value span
        pill.createSpan({
            cls: "filter-pill-value",
            text: this.filter.value,
        });
        // Create the remove button
        const removeButton = pill.createEl("span", {
            cls: "filter-pill-remove",
            attr: { "aria-label": "Remove filter" },
        });
        // Create and append the remove icon span inside the button
        removeButton.createSpan({
            cls: "filter-pill-remove-icon",
        }, (el) => {
            new ExtraButtonComponent(el).setIcon("x").onClick(() => {
                this.removePill();
            });
        });
        return pill;
    }
    removePill() {
        // Animate removal
        this.element.classList.add("filter-pill-removing");
        // Use Obsidian's Component lifecycle to handle removal after animation
        setTimeout(() => {
            this.onRemove(this.filter.id); // Notify parent
            // Parent component should handle removing this child component
        }, 150);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyLXBpbGwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmaWx0ZXItcGlsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sVUFBVSxDQUFDO0FBRzNELE1BQU0sT0FBTyxVQUFXLFNBQVEsU0FBUztJQUt4QyxZQUFZLE9BQTBCO1FBQ3JDLEtBQUssRUFBRSxDQUFDO1FBQ1IsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQzdCLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQztJQUNsQyxDQUFDO0lBRVEsTUFBTTtRQUNkLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDekMsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixpQ0FBaUM7UUFDakMsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQztRQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFcEQsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDZixHQUFHLEVBQUUsc0JBQXNCO1lBQzNCLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxHQUFHLEVBQUUsaUJBQWlCO1NBQ3hELENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDO1lBQ2YsR0FBRyxFQUFFLG1CQUFtQjtZQUN4QixJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLO1NBQ3ZCLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMxQyxHQUFHLEVBQUUsb0JBQW9CO1lBQ3pCLElBQUksRUFBRSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUU7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsMkRBQTJEO1FBQzNELFlBQVksQ0FBQyxVQUFVLENBQ3RCO1lBQ0MsR0FBRyxFQUFFLHlCQUF5QjtTQUM5QixFQUNELENBQUMsRUFBRSxFQUFFLEVBQUU7WUFDTixJQUFJLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO2dCQUN0RCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQ0QsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVPLFVBQVU7UUFDakIsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRW5ELHVFQUF1RTtRQUN2RSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCO1lBQy9DLCtEQUErRDtRQUNoRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDVCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb21wb25lbnQsIEV4dHJhQnV0dG9uQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IEFjdGl2ZUZpbHRlciwgRmlsdGVyUGlsbE9wdGlvbnMgfSBmcm9tIFwiLi9maWx0ZXItdHlwZVwiO1xyXG5cclxuZXhwb3J0IGNsYXNzIEZpbHRlclBpbGwgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgZmlsdGVyOiBBY3RpdmVGaWx0ZXI7XHJcblx0cHJpdmF0ZSBvblJlbW92ZTogKGlkOiBzdHJpbmcpID0+IHZvaWQ7XHJcblx0cHVibGljIGVsZW1lbnQ6IEhUTUxFbGVtZW50OyAvLyBNYWRlIHB1YmxpYyBmb3IgcGFyZW50IGFjY2Vzc1xyXG5cclxuXHRjb25zdHJ1Y3RvcihvcHRpb25zOiBGaWx0ZXJQaWxsT3B0aW9ucykge1xyXG5cdFx0c3VwZXIoKTtcclxuXHRcdHRoaXMuZmlsdGVyID0gb3B0aW9ucy5maWx0ZXI7XHJcblx0XHR0aGlzLm9uUmVtb3ZlID0gb3B0aW9ucy5vblJlbW92ZTtcclxuXHR9XHJcblxyXG5cdG92ZXJyaWRlIG9ubG9hZCgpOiB2b2lkIHtcclxuXHRcdHRoaXMuZWxlbWVudCA9IHRoaXMuY3JlYXRlUGlsbEVsZW1lbnQoKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgY3JlYXRlUGlsbEVsZW1lbnQoKTogSFRNTEVsZW1lbnQge1xyXG5cdFx0Ly8gQ3JlYXRlIHRoZSBtYWluIHBpbGwgY29udGFpbmVyXHJcblx0XHRjb25zdCBwaWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuXHRcdHBpbGwuY2xhc3NOYW1lID0gXCJmaWx0ZXItcGlsbFwiO1xyXG5cdFx0cGlsbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLWZpbHRlci1pZFwiLCB0aGlzLmZpbHRlci5pZCk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGFuZCBhcHBlbmQgY2F0ZWdvcnkgbGFiZWwgc3BhblxyXG5cdFx0cGlsbC5jcmVhdGVTcGFuKHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1waWxsLWNhdGVnb3J5XCIsXHJcblx0XHRcdHRleHQ6IGAke3RoaXMuZmlsdGVyLmNhdGVnb3J5TGFiZWx9OmAsIC8vIEFkZCBjb2xvbiBoZXJlXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgYW5kIGFwcGVuZCB2YWx1ZSBzcGFuXHJcblx0XHRwaWxsLmNyZWF0ZVNwYW4oe1xyXG5cdFx0XHRjbHM6IFwiZmlsdGVyLXBpbGwtdmFsdWVcIixcclxuXHRcdFx0dGV4dDogdGhpcy5maWx0ZXIudmFsdWUsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBDcmVhdGUgdGhlIHJlbW92ZSBidXR0b25cclxuXHRcdGNvbnN0IHJlbW92ZUJ1dHRvbiA9IHBpbGwuY3JlYXRlRWwoXCJzcGFuXCIsIHtcclxuXHRcdFx0Y2xzOiBcImZpbHRlci1waWxsLXJlbW92ZVwiLFxyXG5cdFx0XHRhdHRyOiB7IFwiYXJpYS1sYWJlbFwiOiBcIlJlbW92ZSBmaWx0ZXJcIiB9LFxyXG5cdFx0fSk7XHJcblxyXG5cdFx0Ly8gQ3JlYXRlIGFuZCBhcHBlbmQgdGhlIHJlbW92ZSBpY29uIHNwYW4gaW5zaWRlIHRoZSBidXR0b25cclxuXHRcdHJlbW92ZUJ1dHRvbi5jcmVhdGVTcGFuKFxyXG5cdFx0XHR7XHJcblx0XHRcdFx0Y2xzOiBcImZpbHRlci1waWxsLXJlbW92ZS1pY29uXCIsXHJcblx0XHRcdH0sXHJcblx0XHRcdChlbCkgPT4ge1xyXG5cdFx0XHRcdG5ldyBFeHRyYUJ1dHRvbkNvbXBvbmVudChlbCkuc2V0SWNvbihcInhcIikub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHR0aGlzLnJlbW92ZVBpbGwoKTtcclxuXHRcdFx0XHR9KTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHJcblx0XHRyZXR1cm4gcGlsbDtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVtb3ZlUGlsbCgpOiB2b2lkIHtcclxuXHRcdC8vIEFuaW1hdGUgcmVtb3ZhbFxyXG5cdFx0dGhpcy5lbGVtZW50LmNsYXNzTGlzdC5hZGQoXCJmaWx0ZXItcGlsbC1yZW1vdmluZ1wiKTtcclxuXHJcblx0XHQvLyBVc2UgT2JzaWRpYW4ncyBDb21wb25lbnQgbGlmZWN5Y2xlIHRvIGhhbmRsZSByZW1vdmFsIGFmdGVyIGFuaW1hdGlvblxyXG5cdFx0c2V0VGltZW91dCgoKSA9PiB7XHJcblx0XHRcdHRoaXMub25SZW1vdmUodGhpcy5maWx0ZXIuaWQpOyAvLyBOb3RpZnkgcGFyZW50XHJcblx0XHRcdC8vIFBhcmVudCBjb21wb25lbnQgc2hvdWxkIGhhbmRsZSByZW1vdmluZyB0aGlzIGNoaWxkIGNvbXBvbmVudFxyXG5cdFx0fSwgMTUwKTtcclxuXHR9XHJcbn1cclxuIl19