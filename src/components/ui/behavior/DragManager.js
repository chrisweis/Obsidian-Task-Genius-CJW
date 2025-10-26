import { Component } from "obsidian";
export class DragManager extends Component {
    constructor(options) {
        super();
        this.isDragging = false;
        this.isPotentialDrag = false; // Flag to track if a drag might start
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.initialPointerX = 0; // Store initial pointer down position
        this.initialPointerY = 0;
        this.dragThreshold = 5; // Minimum distance in pixels to initiate drag
        this.draggedElement = null;
        this.originalElement = null; // Store original always
        this.hasMovedBeyondThreshold = false; // Flag to track if threshold was crossed during move
        this.startEventData = null;
        this.initialTarget = null; // Store the initial target of pointerdown
        this.currentDropTargetHover = null; // Track the element currently highlighted as drop zone
        this.options = options;
        this.boundHandlePointerDown = this.handlePointerDown.bind(this);
        this.boundHandlePointerMove = this.handlePointerMove.bind(this);
        this.boundHandlePointerUp = this.handlePointerUp.bind(this);
        this.boundHandleKeyDown = this.handleKeyDown.bind(this); // Bind the new handler
    }
    onload() {
        this.registerListeners();
    }
    onunload() {
        // Listeners are unregistered automatically by Component
        if (this.isDragging || this.isPotentialDrag) {
            // Clean up if unloaded mid-drag or potential drag
            this.resetDragState(); // Ensure cleanup including keydown listener
        }
    }
    registerListeners() {
        this.registerDomEvent(this.options.container, "pointerdown", this.boundHandlePointerDown);
    }
    // Add a new handler for keyboard events
    handleKeyDown(event) {
        if (event.key === "Escape" &&
            (this.isDragging || this.isPotentialDrag)) {
            console.log("DragManager: Escape key pressed, cancelling drag.");
            event.stopPropagation(); // Prevent event from bubbling up
            // Optionally trigger a specific cancel event/callback here
            this.resetDragState();
        }
    }
    handlePointerDown(event) {
        if (event.button !== 0)
            return; // Only main button
        let targetElement = event.target;
        this.initialTarget = event.target; // Store the initial target
        // Check for drag handle if specified
        if (this.options.dragHandleSelector) {
            const handle = targetElement.closest(this.options.dragHandleSelector);
            if (!handle)
                return; // Clicked outside handle
            // If handle is found, the draggable element is its parent (or ancestor matching draggableSelector)
            targetElement = handle.closest(this.options.draggableSelector || "*");
            if (!targetElement ||
                !this.options.container.contains(targetElement))
                return;
        }
        else if (this.options.draggableSelector) {
            // Find the closest draggable ancestor if draggableSelector is specified
            targetElement = targetElement.closest(this.options.draggableSelector);
            if (!targetElement ||
                !this.options.container.contains(targetElement))
                return;
        }
        else if (targetElement !== this.options.container) {
            // If no selector, assume direct children might be draggable, but check container boundary
            if (!this.options.container.contains(targetElement))
                return;
            // Potentially allow dragging direct children if no selector specified
        }
        else {
            return; // Clicked directly on the container background
        }
        // Potential drag start - record state but don't activate drag yet
        this.isPotentialDrag = true;
        this.initialPointerX = event.clientX;
        this.initialPointerY = event.clientY;
        this.originalElement = targetElement; // Store the element that received the pointerdown
        // Add global listeners immediately to capture move/up/escape
        this.registerDomEvent(document, "pointermove", this.boundHandlePointerMove);
        this.registerDomEvent(document, "pointerup", this.boundHandlePointerUp);
        this.registerDomEvent(document, "keydown", this.boundHandleKeyDown); // Add keydown listener
        // Prevent default only if needed (e.g., text selection), maybe delay this
        // event.preventDefault(); // Let's avoid calling this here to allow clicks
    }
    handlePointerMove(event) {
        var _a, _b;
        if (!this.isPotentialDrag && !this.isDragging)
            return;
        this.currentX = event.clientX;
        this.currentY = event.clientY;
        if (this.isPotentialDrag) {
            const deltaX = Math.abs(this.currentX - this.initialPointerX);
            const deltaY = Math.abs(this.currentY - this.initialPointerY);
            console.log(`DragManager: Pointer move. deltaX: ${deltaX}, deltaY: ${deltaY}, distance: ${Math.sqrt(deltaX * deltaX + deltaY * deltaY)}`);
            // Check if threshold is exceeded
            if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) >
                this.dragThreshold) {
                this.isPotentialDrag = false; // It's now a confirmed drag
                this.isDragging = true;
                this.hasMovedBeyondThreshold = true; // Set the flag
                // Prevent default actions like text selection *now* that it's a drag
                if (event.cancelable)
                    event.preventDefault();
                // --- Perform Drag Initialization ---
                this.startX = this.initialPointerX; // Use initial pointer pos as drag start
                this.startY = this.initialPointerY;
                // --- Cloning Logic ---
                if (this.options.cloneElement && this.originalElement) {
                    if (typeof this.options.cloneElement === "function") {
                        this.draggedElement = this.options.cloneElement();
                    }
                    else {
                        this.draggedElement = this.originalElement.cloneNode(true);
                    }
                    // Position the clone absolutely
                    const rect = this.originalElement.getBoundingClientRect();
                    this.draggedElement.style.position = "absolute";
                    // Start clone at the initial pointer down position offset by click inside element
                    const offsetX = this.startX - rect.left;
                    const offsetY = this.startY - rect.top;
                    this.draggedElement.style.left = `${this.currentX - offsetX}px`; // Position based on current mouse
                    this.draggedElement.style.top = `${this.currentY - offsetY}px`;
                    this.draggedElement.style.width = `${rect.width}px`;
                    this.draggedElement.style.height = `${rect.height}px`; // Ensure height is set
                    this.draggedElement.style.boxSizing = "border-box"; // Crucial for layout consistency
                    this.draggedElement.style.pointerEvents = "none";
                    this.draggedElement.style.zIndex = "1000";
                    document.body.appendChild(this.draggedElement);
                    if (this.options.ghostClass) {
                        this.originalElement.classList.add(this.options.ghostClass);
                    }
                }
                else {
                    this.draggedElement = this.originalElement; // Drag original element
                }
                if (this.options.dragClass && this.draggedElement) {
                    this.draggedElement.classList.add(this.options.dragClass);
                }
                // --- End Cloning Logic ---
                this.startEventData = {
                    element: this.draggedElement,
                    originalElement: this.originalElement,
                    startX: this.startX,
                    startY: this.startY,
                    event: event,
                    dropZoneSelector: this.options.dropZoneSelector,
                };
                // Check if drag should proceed (callback)
                const proceed = (_b = (_a = this.options).onDragStart) === null || _b === void 0 ? void 0 : _b.call(_a, this.startEventData);
                if (proceed === false) {
                    console.log("Drag start cancelled by callback");
                    this.resetDragState(); // Reset includes hasMovedBeyondThreshold
                    return;
                }
                // --- End Drag Initialization ---
                // Trigger initial move callback immediately after start
                this.triggerDragMove(event);
            }
            // If threshold not exceeded, do nothing - wait for more movement or pointerup
            return; // Don't proceed further in this move event if we just initiated drag
        }
        // --- Continue Drag Move ---
        if (this.isDragging) {
            if (event.cancelable)
                event.preventDefault(); // Continue preventing defaults during drag
            this.triggerDragMove(event);
        }
    }
    triggerDragMove(event) {
        var _a, _b;
        if (!this.isDragging || !this.draggedElement || !this.startEventData)
            return;
        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        // Update clone position if cloning
        if (this.options.cloneElement) {
            const startRect = this.originalElement.getBoundingClientRect();
            // Adjust based on where the pointer started *within* the element
            const offsetX = this.startEventData.startX - startRect.left;
            const offsetY = this.startEventData.startY - startRect.top;
            this.draggedElement.style.left = `${this.currentX - offsetX}px`;
            this.draggedElement.style.top = `${this.currentY - offsetY}px`;
        }
        // --- Highlight potential drop target ---
        this.updateDropTargetHighlight(event.clientX, event.clientY);
        // --- End Highlight ---
        const moveEventData = Object.assign(Object.assign({}, this.startEventData), { currentX: this.currentX, currentY: this.currentY, deltaX: deltaX, deltaY: deltaY, event: event });
        (_b = (_a = this.options).onDragMove) === null || _b === void 0 ? void 0 : _b.call(_a, moveEventData);
    }
    handlePointerUp(event) {
        var _a, _b;
        console.log("DragManager: Pointer up", event, this.hasMovedBeyondThreshold);
        // Check if the drag threshold was ever crossed during the pointermove phase
        if (this.hasMovedBeyondThreshold) {
            // If movement occurred, prevent the click event regardless of drop success etc.
            event.preventDefault();
            // console.log(`DragManager: Preventing click because threshold was crossed.`);
        }
        else {
            // console.log(`DragManager: Not preventing click because threshold was not crossed.`);
        }
        // Check if it was essentially a click (potential drag never became actual drag)
        if (this.isPotentialDrag && !this.isDragging) {
            // console.log("DragManager: PotentialDrag=true, IsDragging=false. Treating as click/short drag.");
            this.resetDragState(); // Clean up listeners etc.
            // Do not return here if preventDefault was called above
            // If hasMovedBeyondThreshold is false (no preventDefault), this allows the click
            // If hasMovedBeyondThreshold is true (preventDefault was called), the click is blocked anyway
            return; // Allow default behavior (or prevented behavior)
        }
        // Check if drag state is inconsistent or drag didn't actually start properly
        if (!this.isDragging || !this.draggedElement || !this.startEventData) {
            // console.log(`DragManager: Inconsistent state? isDragging=${this.isDragging}, hasMoved=${this.hasMovedBeyondThreshold}`);
            this.resetDragState();
            return;
        }
        // --- Drag End --- (Now we are sure a drag was properly started)
        // preventDefault() was potentially called at the beginning of this function.
        // console.log("DragManager: Drag End logic. hasMovedBeyondThreshold:", this.hasMovedBeyondThreshold);
        // Determine potential drop target
        let dropTarget = null;
        if (this.options.dropZoneSelector) {
            // Hide the clone temporarily to accurately find the element underneath
            // Use the dragged element (which might be the clone or original)
            const elementToHide = this.draggedElement;
            const originalDisplay = elementToHide.style.display;
            // Only hide if it's the clone, otherwise elementFromPoint gets the original element itself
            if (this.options.cloneElement) {
                elementToHide.style.display = "none";
            }
            const elementUnderPointer = document.elementFromPoint(event.clientX, // Use event's clientX/Y which are the final pointer coords
            event.clientY);
            // Restore visibility
            if (this.options.cloneElement) {
                elementToHide.style.display = originalDisplay;
            }
            if (elementUnderPointer) {
                dropTarget = elementUnderPointer.closest(this.options.dropZoneSelector);
            }
        }
        const endEventData = Object.assign(Object.assign({}, this.startEventData), { currentX: event.clientX, currentY: event.clientY, deltaX: event.clientX - this.startX, deltaY: event.clientY - this.startY, event: event, dropTarget: dropTarget });
        // Trigger the callback *before* final cleanup
        try {
            (_b = (_a = this.options).onDragEnd) === null || _b === void 0 ? void 0 : _b.call(_a, endEventData);
        }
        catch (error) {
            console.error("DragManager: Error in onDragEnd callback:", error);
        }
        finally {
            // Ensure cleanup happens even if callback throws
            this.resetDragState(); // This now resets hasMovedBeyondThreshold
        }
    }
    resetDragState() {
        // Note: No need to manually remove event listeners since we're using registerDomEvent
        // Obsidian will automatically clean them up when the component is unloaded
        // Clean up dragged element styles/DOM
        if (this.draggedElement) {
            if (this.options.dragClass) {
                this.draggedElement.classList.remove(this.options.dragClass);
            }
            // Remove clone if it exists
            if (this.options.cloneElement &&
                this.draggedElement !== this.originalElement) {
                // Check it's not the original element before removing
                this.draggedElement.remove();
            }
        }
        // Clean up original element styles
        if (this.originalElement && this.options.ghostClass) {
            this.originalElement.classList.remove(this.options.ghostClass);
        }
        // Remove drop target highlight
        if (this.currentDropTargetHover) {
            this.currentDropTargetHover.classList.remove("drop-target-active"); // Use your defined class
            this.currentDropTargetHover = null;
        }
        // Reset state variables
        this.isDragging = false;
        this.isPotentialDrag = false; // Reset potential drag flag
        this.hasMovedBeyondThreshold = false; // Reset the movement flag
        this.draggedElement = null;
        this.originalElement = null;
        this.startEventData = null;
        this.initialTarget = null;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        // Reset initial pointer positions as well
        this.initialPointerX = 0;
        this.initialPointerY = 0;
        // console.log("DragManager: resetDragState finished");
    }
    // New method to handle highlighting drop targets during move
    updateDropTargetHighlight(pointerX, pointerY) {
        if (!this.options.dropZoneSelector || !this.draggedElement)
            return;
        let potentialDropTarget = null;
        const currentHighlight = this.currentDropTargetHover;
        // Temporarily hide the clone to find the element underneath
        const originalDisplay = this.draggedElement.style.display;
        // Only hide if it's the clone
        if (this.options.cloneElement) {
            this.draggedElement.style.display = "none";
        }
        const elementUnderPointer = document.elementFromPoint(pointerX, pointerY);
        // Restore visibility
        if (this.options.cloneElement) {
            this.draggedElement.style.display = originalDisplay;
        }
        if (elementUnderPointer) {
            potentialDropTarget = elementUnderPointer.closest(this.options.dropZoneSelector);
        }
        // Check if the highlighted target has changed
        if (potentialDropTarget !== currentHighlight) {
            // Remove highlight from the previous target
            if (currentHighlight) {
                currentHighlight.classList.remove("drop-target-active"); // Use your defined class
            }
            // Add highlight to the new target
            if (potentialDropTarget) {
                potentialDropTarget.classList.add("drop-target-active"); // Use your defined class
                this.currentDropTargetHover = potentialDropTarget;
            }
            else {
                this.currentDropTargetHover = null; // No valid target under pointer
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRHJhZ01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJEcmFnTWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sU0FBUyxFQUFnQixNQUFNLFVBQVUsQ0FBQztBQW1DeEQsTUFBTSxPQUFPLFdBQVksU0FBUSxTQUFTO0lBc0J6QyxZQUFZLE9BQTJCO1FBQ3RDLEtBQUssRUFBRSxDQUFDO1FBckJELGVBQVUsR0FBRyxLQUFLLENBQUM7UUFDbkIsb0JBQWUsR0FBRyxLQUFLLENBQUMsQ0FBQyxzQ0FBc0M7UUFDL0QsV0FBTSxHQUFHLENBQUMsQ0FBQztRQUNYLFdBQU0sR0FBRyxDQUFDLENBQUM7UUFDWCxhQUFRLEdBQUcsQ0FBQyxDQUFDO1FBQ2IsYUFBUSxHQUFHLENBQUMsQ0FBQztRQUNiLG9CQUFlLEdBQUcsQ0FBQyxDQUFDLENBQUMsc0NBQXNDO1FBQzNELG9CQUFlLEdBQUcsQ0FBQyxDQUFDO1FBQ3BCLGtCQUFhLEdBQUcsQ0FBQyxDQUFDLENBQUMsOENBQThDO1FBQ2pFLG1CQUFjLEdBQXVCLElBQUksQ0FBQztRQUMxQyxvQkFBZSxHQUF1QixJQUFJLENBQUMsQ0FBQyx3QkFBd0I7UUFDcEUsNEJBQXVCLEdBQUcsS0FBSyxDQUFDLENBQUMscURBQXFEO1FBQ3RGLG1CQUFjLEdBQTBCLElBQUksQ0FBQztRQUs3QyxrQkFBYSxHQUF1QixJQUFJLENBQUMsQ0FBQywwQ0FBMEM7UUFDcEYsMkJBQXNCLEdBQXVCLElBQUksQ0FBQyxDQUFDLHVEQUF1RDtRQUlqSCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsc0JBQXNCLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRSxJQUFJ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UUFBUSxDQUNSLENBQUM7UUFFRixxQkFBcUI7UUFDckIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRTtZQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsZUFBZSxDQUFDO1NBQ3BEO1FBRUQsSUFBSSxtQkFBbUIsRUFBRTtZQUN4QixtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQ2QsQ0FBQztTQUNqQjtRQUVELDhDQUE4QztRQUM5QyxJQUFJLG1CQUFtQixLQUFLLGdCQUFnQixFQUFFO1lBQzdDLDRDQUE0QztZQUM1QyxJQUFJLGdCQUFnQixFQUFFO2dCQUNyQixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyx5QkFBeUI7YUFDbEY7WUFFRCxrQ0FBa0M7WUFDbEMsSUFBSSxtQkFBbUIsRUFBRTtnQkFDeEIsbUJBQW1CLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMseUJBQXlCO2dCQUNsRixJQUFJLENBQUMsc0JBQXNCLEdBQUcsbUJBQW1CLENBQUM7YUFDbEQ7aUJBQU07Z0JBQ04sSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxDQUFDLGdDQUFnQzthQUNwRTtTQUNEO0lBQ0YsQ0FBQztDQUNEIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwLCBDb21wb25lbnQsIFBvaW50LCBURmlsZSB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmFnU3RhcnRFdmVudCB7XHJcblx0ZWxlbWVudDogSFRNTEVsZW1lbnQ7XHJcblx0b3JpZ2luYWxFbGVtZW50OiBIVE1MRWxlbWVudDtcclxuXHRzdGFydFg6IG51bWJlcjtcclxuXHRzdGFydFk6IG51bWJlcjtcclxuXHRldmVudDogUG9pbnRlckV2ZW50IHwgTW91c2VFdmVudCB8IFRvdWNoRXZlbnQ7XHJcblx0ZHJvcFpvbmVTZWxlY3Rvcj86IHN0cmluZzsgLy8gU2VsZWN0b3IgZm9yIHZhbGlkIGRyb3Agem9uZXNcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmFnTW92ZUV2ZW50IGV4dGVuZHMgRHJhZ1N0YXJ0RXZlbnQge1xyXG5cdGN1cnJlbnRYOiBudW1iZXI7XHJcblx0Y3VycmVudFk6IG51bWJlcjtcclxuXHRkZWx0YVg6IG51bWJlcjtcclxuXHRkZWx0YVk6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEcmFnRW5kRXZlbnQgZXh0ZW5kcyBEcmFnTW92ZUV2ZW50IHtcclxuXHRkcm9wVGFyZ2V0OiBIVE1MRWxlbWVudCB8IG51bGw7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRHJhZ01hbmFnZXJPcHRpb25zIHtcclxuXHRkcmFnZ2FibGVTZWxlY3Rvcj86IHN0cmluZzsgLy8gU2VsZWN0b3IgZm9yIGVsZW1lbnRzICp3aXRoaW4qIHRoZSBjb250YWluZXIgdGhhdCBhcmUgZHJhZ2dhYmxlXHJcblx0Y29udGFpbmVyOiBIVE1MRWxlbWVudDsgLy8gVGhlIGVsZW1lbnQgdGhhdCBjb250YWlucyBkcmFnZ2FibGUgaXRlbXMgYW5kIGxpc3RlbnMgZm9yIGV2ZW50c1xyXG5cdG9uRHJhZ1N0YXJ0PzogKGRhdGE6IERyYWdTdGFydEV2ZW50KSA9PiB2b2lkIHwgYm9vbGVhbjsgLy8gUmV0dXJuIGZhbHNlIHRvIGNhbmNlbCBkcmFnXHJcblx0b25EcmFnTW92ZT86IChkYXRhOiBEcmFnTW92ZUV2ZW50KSA9PiB2b2lkO1xyXG5cdG9uRHJhZ0VuZD86IChkYXRhOiBEcmFnRW5kRXZlbnQpID0+IHZvaWQ7XHJcblx0ZHJhZ0hhbmRsZVNlbGVjdG9yPzogc3RyaW5nOyAvLyBPcHRpb25hbCBzZWxlY3RvciBmb3IgYSBzcGVjaWZpYyBkcmFnIGhhbmRsZSB3aXRoaW4gdGhlIGRyYWdnYWJsZSBlbGVtZW50XHJcblx0Y2xvbmVFbGVtZW50PzogYm9vbGVhbiB8ICgoKSA9PiBIVE1MRWxlbWVudCk7IC8vIE9wdGlvbiB0byBkcmFnIGEgY2xvbmVcclxuXHRkcmFnQ2xhc3M/OiBzdHJpbmc7IC8vIENsYXNzIGFkZGVkIHRvIHRoZSBlbGVtZW50IGJlaW5nIGRyYWdnZWQgKG9yIGl0cyBjbG9uZSlcclxuXHRnaG9zdENsYXNzPzogc3RyaW5nOyAvLyBDbGFzcyBhZGRlZCB0byB0aGUgb3JpZ2luYWwgZWxlbWVudCB3aGVuIGRyYWdnaW5nIGEgY2xvbmVcclxuXHRkcm9wWm9uZVNlbGVjdG9yPzogc3RyaW5nOyAvLyBTZWxlY3RvciBmb3IgdmFsaWQgZHJvcCB6b25lc1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRHJhZ01hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgb3B0aW9uczogRHJhZ01hbmFnZXJPcHRpb25zO1xyXG5cdHByaXZhdGUgaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG5cdHByaXZhdGUgaXNQb3RlbnRpYWxEcmFnID0gZmFsc2U7IC8vIEZsYWcgdG8gdHJhY2sgaWYgYSBkcmFnIG1pZ2h0IHN0YXJ0XHJcblx0cHJpdmF0ZSBzdGFydFggPSAwO1xyXG5cdHByaXZhdGUgc3RhcnRZID0gMDtcclxuXHRwcml2YXRlIGN1cnJlbnRYID0gMDtcclxuXHRwcml2YXRlIGN1cnJlbnRZID0gMDtcclxuXHRwcml2YXRlIGluaXRpYWxQb2ludGVyWCA9IDA7IC8vIFN0b3JlIGluaXRpYWwgcG9pbnRlciBkb3duIHBvc2l0aW9uXHJcblx0cHJpdmF0ZSBpbml0aWFsUG9pbnRlclkgPSAwO1xyXG5cdHByaXZhdGUgZHJhZ1RocmVzaG9sZCA9IDU7IC8vIE1pbmltdW0gZGlzdGFuY2UgaW4gcGl4ZWxzIHRvIGluaXRpYXRlIGRyYWdcclxuXHRwcml2YXRlIGRyYWdnZWRFbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdHByaXZhdGUgb3JpZ2luYWxFbGVtZW50OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsOyAvLyBTdG9yZSBvcmlnaW5hbCBhbHdheXNcclxuXHRwcml2YXRlIGhhc01vdmVkQmV5b25kVGhyZXNob2xkID0gZmFsc2U7IC8vIEZsYWcgdG8gdHJhY2sgaWYgdGhyZXNob2xkIHdhcyBjcm9zc2VkIGR1cmluZyBtb3ZlXHJcblx0cHJpdmF0ZSBzdGFydEV2ZW50RGF0YTogRHJhZ1N0YXJ0RXZlbnQgfCBudWxsID0gbnVsbDtcclxuXHRwcml2YXRlIGJvdW5kSGFuZGxlUG9pbnRlckRvd246IChldmVudDogUG9pbnRlckV2ZW50KSA9PiB2b2lkO1xyXG5cdHByaXZhdGUgYm91bmRIYW5kbGVQb2ludGVyTW92ZTogKGV2ZW50OiBQb2ludGVyRXZlbnQpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBib3VuZEhhbmRsZVBvaW50ZXJVcDogKGV2ZW50OiBQb2ludGVyRXZlbnQpID0+IHZvaWQ7XHJcblx0cHJpdmF0ZSBib3VuZEhhbmRsZUtleURvd246IChldmVudDogS2V5Ym9hcmRFdmVudCkgPT4gdm9pZDsgLy8gQWRkZWQgZm9yIEVzY2FwZSBrZXlcclxuXHRwcml2YXRlIGluaXRpYWxUYXJnZXQ6IEV2ZW50VGFyZ2V0IHwgbnVsbCA9IG51bGw7IC8vIFN0b3JlIHRoZSBpbml0aWFsIHRhcmdldCBvZiBwb2ludGVyZG93blxyXG5cdHByaXZhdGUgY3VycmVudERyb3BUYXJnZXRIb3ZlcjogSFRNTEVsZW1lbnQgfCBudWxsID0gbnVsbDsgLy8gVHJhY2sgdGhlIGVsZW1lbnQgY3VycmVudGx5IGhpZ2hsaWdodGVkIGFzIGRyb3Agem9uZVxyXG5cclxuXHRjb25zdHJ1Y3RvcihvcHRpb25zOiBEcmFnTWFuYWdlck9wdGlvbnMpIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLm9wdGlvbnMgPSBvcHRpb25zO1xyXG5cdFx0dGhpcy5ib3VuZEhhbmRsZVBvaW50ZXJEb3duID0gdGhpcy5oYW5kbGVQb2ludGVyRG93bi5iaW5kKHRoaXMpO1xyXG5cdFx0dGhpcy5ib3VuZEhhbmRsZVBvaW50ZXJNb3ZlID0gdGhpcy5oYW5kbGVQb2ludGVyTW92ZS5iaW5kKHRoaXMpO1xyXG5cdFx0dGhpcy5ib3VuZEhhbmRsZVBvaW50ZXJVcCA9IHRoaXMuaGFuZGxlUG9pbnRlclVwLmJpbmQodGhpcyk7XHJcblx0XHR0aGlzLmJvdW5kSGFuZGxlS2V5RG93biA9IHRoaXMuaGFuZGxlS2V5RG93bi5iaW5kKHRoaXMpOyAvLyBCaW5kIHRoZSBuZXcgaGFuZGxlclxyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb25sb2FkKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5yZWdpc3Rlckxpc3RlbmVycygpO1xyXG5cdH1cclxuXHJcblx0b3ZlcnJpZGUgb251bmxvYWQoKTogdm9pZCB7XHJcblx0XHQvLyBMaXN0ZW5lcnMgYXJlIHVucmVnaXN0ZXJlZCBhdXRvbWF0aWNhbGx5IGJ5IENvbXBvbmVudFxyXG5cdFx0aWYgKHRoaXMuaXNEcmFnZ2luZyB8fCB0aGlzLmlzUG90ZW50aWFsRHJhZykge1xyXG5cdFx0XHQvLyBDbGVhbiB1cCBpZiB1bmxvYWRlZCBtaWQtZHJhZyBvciBwb3RlbnRpYWwgZHJhZ1xyXG5cdFx0XHR0aGlzLnJlc2V0RHJhZ1N0YXRlKCk7IC8vIEVuc3VyZSBjbGVhbnVwIGluY2x1ZGluZyBrZXlkb3duIGxpc3RlbmVyXHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRwcml2YXRlIHJlZ2lzdGVyTGlzdGVuZXJzKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5yZWdpc3RlckRvbUV2ZW50KFxyXG5cdFx0XHR0aGlzLm9wdGlvbnMuY29udGFpbmVyLFxyXG5cdFx0XHRcInBvaW50ZXJkb3duXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVQb2ludGVyRG93blxyXG5cdFx0KTtcclxuXHR9XHJcblxyXG5cdC8vIEFkZCBhIG5ldyBoYW5kbGVyIGZvciBrZXlib2FyZCBldmVudHNcclxuXHRwcml2YXRlIGhhbmRsZUtleURvd24oZXZlbnQ6IEtleWJvYXJkRXZlbnQpOiB2b2lkIHtcclxuXHRcdGlmIChcclxuXHRcdFx0ZXZlbnQua2V5ID09PSBcIkVzY2FwZVwiICYmXHJcblx0XHRcdCh0aGlzLmlzRHJhZ2dpbmcgfHwgdGhpcy5pc1BvdGVudGlhbERyYWcpXHJcblx0XHQpIHtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJEcmFnTWFuYWdlcjogRXNjYXBlIGtleSBwcmVzc2VkLCBjYW5jZWxsaW5nIGRyYWcuXCIpO1xyXG5cdFx0XHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTsgLy8gUHJldmVudCBldmVudCBmcm9tIGJ1YmJsaW5nIHVwXHJcblx0XHRcdC8vIE9wdGlvbmFsbHkgdHJpZ2dlciBhIHNwZWNpZmljIGNhbmNlbCBldmVudC9jYWxsYmFjayBoZXJlXHJcblx0XHRcdHRoaXMucmVzZXREcmFnU3RhdGUoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlUG9pbnRlckRvd24oZXZlbnQ6IFBvaW50ZXJFdmVudCk6IHZvaWQge1xyXG5cdFx0aWYgKGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuOyAvLyBPbmx5IG1haW4gYnV0dG9uXHJcblxyXG5cdFx0bGV0IHRhcmdldEVsZW1lbnQgPSBldmVudC50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHR0aGlzLmluaXRpYWxUYXJnZXQgPSBldmVudC50YXJnZXQ7IC8vIFN0b3JlIHRoZSBpbml0aWFsIHRhcmdldFxyXG5cclxuXHRcdC8vIENoZWNrIGZvciBkcmFnIGhhbmRsZSBpZiBzcGVjaWZpZWRcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuZHJhZ0hhbmRsZVNlbGVjdG9yKSB7XHJcblx0XHRcdGNvbnN0IGhhbmRsZSA9IHRhcmdldEVsZW1lbnQuY2xvc2VzdChcclxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZHJhZ0hhbmRsZVNlbGVjdG9yXHJcblx0XHRcdCk7XHJcblx0XHRcdGlmICghaGFuZGxlKSByZXR1cm47IC8vIENsaWNrZWQgb3V0c2lkZSBoYW5kbGVcclxuXHJcblx0XHRcdC8vIElmIGhhbmRsZSBpcyBmb3VuZCwgdGhlIGRyYWdnYWJsZSBlbGVtZW50IGlzIGl0cyBwYXJlbnQgKG9yIGFuY2VzdG9yIG1hdGNoaW5nIGRyYWdnYWJsZVNlbGVjdG9yKVxyXG5cdFx0XHR0YXJnZXRFbGVtZW50ID0gaGFuZGxlLmNsb3Nlc3QoXHJcblx0XHRcdFx0dGhpcy5vcHRpb25zLmRyYWdnYWJsZVNlbGVjdG9yIHx8IFwiKlwiXHJcblx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHRcdGlmIChcclxuXHRcdFx0XHQhdGFyZ2V0RWxlbWVudCB8fFxyXG5cdFx0XHRcdCF0aGlzLm9wdGlvbnMuY29udGFpbmVyLmNvbnRhaW5zKHRhcmdldEVsZW1lbnQpXHJcblx0XHRcdClcclxuXHRcdFx0XHRyZXR1cm47XHJcblx0XHR9IGVsc2UgaWYgKHRoaXMub3B0aW9ucy5kcmFnZ2FibGVTZWxlY3Rvcikge1xyXG5cdFx0XHQvLyBGaW5kIHRoZSBjbG9zZXN0IGRyYWdnYWJsZSBhbmNlc3RvciBpZiBkcmFnZ2FibGVTZWxlY3RvciBpcyBzcGVjaWZpZWRcclxuXHRcdFx0dGFyZ2V0RWxlbWVudCA9IHRhcmdldEVsZW1lbnQuY2xvc2VzdChcclxuXHRcdFx0XHR0aGlzLm9wdGlvbnMuZHJhZ2dhYmxlU2VsZWN0b3JcclxuXHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdCF0YXJnZXRFbGVtZW50IHx8XHJcblx0XHRcdFx0IXRoaXMub3B0aW9ucy5jb250YWluZXIuY29udGFpbnModGFyZ2V0RWxlbWVudClcclxuXHRcdFx0KVxyXG5cdFx0XHRcdHJldHVybjtcclxuXHRcdH0gZWxzZSBpZiAodGFyZ2V0RWxlbWVudCAhPT0gdGhpcy5vcHRpb25zLmNvbnRhaW5lcikge1xyXG5cdFx0XHQvLyBJZiBubyBzZWxlY3RvciwgYXNzdW1lIGRpcmVjdCBjaGlsZHJlbiBtaWdodCBiZSBkcmFnZ2FibGUsIGJ1dCBjaGVjayBjb250YWluZXIgYm91bmRhcnlcclxuXHRcdFx0aWYgKCF0aGlzLm9wdGlvbnMuY29udGFpbmVyLmNvbnRhaW5zKHRhcmdldEVsZW1lbnQpKSByZXR1cm47XHJcblx0XHRcdC8vIFBvdGVudGlhbGx5IGFsbG93IGRyYWdnaW5nIGRpcmVjdCBjaGlsZHJlbiBpZiBubyBzZWxlY3RvciBzcGVjaWZpZWRcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybjsgLy8gQ2xpY2tlZCBkaXJlY3RseSBvbiB0aGUgY29udGFpbmVyIGJhY2tncm91bmRcclxuXHRcdH1cclxuXHJcblx0XHQvLyBQb3RlbnRpYWwgZHJhZyBzdGFydCAtIHJlY29yZCBzdGF0ZSBidXQgZG9uJ3QgYWN0aXZhdGUgZHJhZyB5ZXRcclxuXHRcdHRoaXMuaXNQb3RlbnRpYWxEcmFnID0gdHJ1ZTtcclxuXHRcdHRoaXMuaW5pdGlhbFBvaW50ZXJYID0gZXZlbnQuY2xpZW50WDtcclxuXHRcdHRoaXMuaW5pdGlhbFBvaW50ZXJZID0gZXZlbnQuY2xpZW50WTtcclxuXHRcdHRoaXMub3JpZ2luYWxFbGVtZW50ID0gdGFyZ2V0RWxlbWVudDsgLy8gU3RvcmUgdGhlIGVsZW1lbnQgdGhhdCByZWNlaXZlZCB0aGUgcG9pbnRlcmRvd25cclxuXHJcblx0XHQvLyBBZGQgZ2xvYmFsIGxpc3RlbmVycyBpbW1lZGlhdGVseSB0byBjYXB0dXJlIG1vdmUvdXAvZXNjYXBlXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoXHJcblx0XHRcdGRvY3VtZW50LFxyXG5cdFx0XHRcInBvaW50ZXJtb3ZlXCIsXHJcblx0XHRcdHRoaXMuYm91bmRIYW5kbGVQb2ludGVyTW92ZVxyXG5cdFx0KTtcclxuXHRcdHRoaXMucmVnaXN0ZXJEb21FdmVudChkb2N1bWVudCwgXCJwb2ludGVydXBcIiwgdGhpcy5ib3VuZEhhbmRsZVBvaW50ZXJVcCk7XHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsIFwia2V5ZG93blwiLCB0aGlzLmJvdW5kSGFuZGxlS2V5RG93bik7IC8vIEFkZCBrZXlkb3duIGxpc3RlbmVyXHJcblxyXG5cdFx0Ly8gUHJldmVudCBkZWZhdWx0IG9ubHkgaWYgbmVlZGVkIChlLmcuLCB0ZXh0IHNlbGVjdGlvbiksIG1heWJlIGRlbGF5IHRoaXNcclxuXHRcdC8vIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7IC8vIExldCdzIGF2b2lkIGNhbGxpbmcgdGhpcyBoZXJlIHRvIGFsbG93IGNsaWNrc1xyXG5cdH1cclxuXHJcblx0cHJpdmF0ZSBoYW5kbGVQb2ludGVyTW92ZShldmVudDogUG9pbnRlckV2ZW50KTogdm9pZCB7XHJcblx0XHRpZiAoIXRoaXMuaXNQb3RlbnRpYWxEcmFnICYmICF0aGlzLmlzRHJhZ2dpbmcpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLmN1cnJlbnRYID0gZXZlbnQuY2xpZW50WDtcclxuXHRcdHRoaXMuY3VycmVudFkgPSBldmVudC5jbGllbnRZO1xyXG5cclxuXHRcdGlmICh0aGlzLmlzUG90ZW50aWFsRHJhZykge1xyXG5cdFx0XHRjb25zdCBkZWx0YVggPSBNYXRoLmFicyh0aGlzLmN1cnJlbnRYIC0gdGhpcy5pbml0aWFsUG9pbnRlclgpO1xyXG5cdFx0XHRjb25zdCBkZWx0YVkgPSBNYXRoLmFicyh0aGlzLmN1cnJlbnRZIC0gdGhpcy5pbml0aWFsUG9pbnRlclkpO1xyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXHJcblx0XHRcdFx0YERyYWdNYW5hZ2VyOiBQb2ludGVyIG1vdmUuIGRlbHRhWDogJHtkZWx0YVh9LCBkZWx0YVk6ICR7ZGVsdGFZfSwgZGlzdGFuY2U6ICR7TWF0aC5zcXJ0KFxyXG5cdFx0XHRcdFx0ZGVsdGFYICogZGVsdGFYICsgZGVsdGFZICogZGVsdGFZXHJcblx0XHRcdFx0KX1gXHJcblx0XHRcdCk7XHJcblxyXG5cdFx0XHQvLyBDaGVjayBpZiB0aHJlc2hvbGQgaXMgZXhjZWVkZWRcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdE1hdGguc3FydChkZWx0YVggKiBkZWx0YVggKyBkZWx0YVkgKiBkZWx0YVkpID5cclxuXHRcdFx0XHR0aGlzLmRyYWdUaHJlc2hvbGRcclxuXHRcdFx0KSB7XHJcblx0XHRcdFx0dGhpcy5pc1BvdGVudGlhbERyYWcgPSBmYWxzZTsgLy8gSXQncyBub3cgYSBjb25maXJtZWQgZHJhZ1xyXG5cdFx0XHRcdHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XHJcblx0XHRcdFx0dGhpcy5oYXNNb3ZlZEJleW9uZFRocmVzaG9sZCA9IHRydWU7IC8vIFNldCB0aGUgZmxhZ1xyXG5cclxuXHRcdFx0XHQvLyBQcmV2ZW50IGRlZmF1bHQgYWN0aW9ucyBsaWtlIHRleHQgc2VsZWN0aW9uICpub3cqIHRoYXQgaXQncyBhIGRyYWdcclxuXHRcdFx0XHRpZiAoZXZlbnQuY2FuY2VsYWJsZSkgZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHJcblx0XHRcdFx0Ly8gLS0tIFBlcmZvcm0gRHJhZyBJbml0aWFsaXphdGlvbiAtLS1cclxuXHRcdFx0XHR0aGlzLnN0YXJ0WCA9IHRoaXMuaW5pdGlhbFBvaW50ZXJYOyAvLyBVc2UgaW5pdGlhbCBwb2ludGVyIHBvcyBhcyBkcmFnIHN0YXJ0XHJcblx0XHRcdFx0dGhpcy5zdGFydFkgPSB0aGlzLmluaXRpYWxQb2ludGVyWTtcclxuXHJcblx0XHRcdFx0Ly8gLS0tIENsb25pbmcgTG9naWMgLS0tXHJcblx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5jbG9uZUVsZW1lbnQgJiYgdGhpcy5vcmlnaW5hbEVsZW1lbnQpIHtcclxuXHRcdFx0XHRcdGlmICh0eXBlb2YgdGhpcy5vcHRpb25zLmNsb25lRWxlbWVudCA9PT0gXCJmdW5jdGlvblwiKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMuZHJhZ2dlZEVsZW1lbnQgPSB0aGlzLm9wdGlvbnMuY2xvbmVFbGVtZW50KCk7XHJcblx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50ID0gdGhpcy5vcmlnaW5hbEVsZW1lbnQuY2xvbmVOb2RlKFxyXG5cdFx0XHRcdFx0XHRcdHRydWVcclxuXHRcdFx0XHRcdFx0KSBhcyBIVE1MRWxlbWVudDtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdC8vIFBvc2l0aW9uIHRoZSBjbG9uZSBhYnNvbHV0ZWx5XHJcblx0XHRcdFx0XHRjb25zdCByZWN0ID0gdGhpcy5vcmlnaW5hbEVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xyXG5cdFx0XHRcdFx0Ly8gU3RhcnQgY2xvbmUgYXQgdGhlIGluaXRpYWwgcG9pbnRlciBkb3duIHBvc2l0aW9uIG9mZnNldCBieSBjbGljayBpbnNpZGUgZWxlbWVudFxyXG5cdFx0XHRcdFx0Y29uc3Qgb2Zmc2V0WCA9IHRoaXMuc3RhcnRYIC0gcmVjdC5sZWZ0O1xyXG5cdFx0XHRcdFx0Y29uc3Qgb2Zmc2V0WSA9IHRoaXMuc3RhcnRZIC0gcmVjdC50b3A7XHJcblx0XHRcdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50LnN0eWxlLmxlZnQgPSBgJHtcclxuXHRcdFx0XHRcdFx0dGhpcy5jdXJyZW50WCAtIG9mZnNldFhcclxuXHRcdFx0XHRcdH1weGA7IC8vIFBvc2l0aW9uIGJhc2VkIG9uIGN1cnJlbnQgbW91c2VcclxuXHRcdFx0XHRcdHRoaXMuZHJhZ2dlZEVsZW1lbnQuc3R5bGUudG9wID0gYCR7XHJcblx0XHRcdFx0XHRcdHRoaXMuY3VycmVudFkgLSBvZmZzZXRZXHJcblx0XHRcdFx0XHR9cHhgO1xyXG5cdFx0XHRcdFx0dGhpcy5kcmFnZ2VkRWxlbWVudC5zdHlsZS53aWR0aCA9IGAke3JlY3Qud2lkdGh9cHhgO1xyXG5cdFx0XHRcdFx0dGhpcy5kcmFnZ2VkRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBgJHtyZWN0LmhlaWdodH1weGA7IC8vIEVuc3VyZSBoZWlnaHQgaXMgc2V0XHJcblx0XHRcdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50LnN0eWxlLmJveFNpemluZyA9IFwiYm9yZGVyLWJveFwiOyAvLyBDcnVjaWFsIGZvciBsYXlvdXQgY29uc2lzdGVuY3lcclxuXHRcdFx0XHRcdHRoaXMuZHJhZ2dlZEVsZW1lbnQuc3R5bGUucG9pbnRlckV2ZW50cyA9IFwibm9uZVwiO1xyXG5cdFx0XHRcdFx0dGhpcy5kcmFnZ2VkRWxlbWVudC5zdHlsZS56SW5kZXggPSBcIjEwMDBcIjtcclxuXHRcdFx0XHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodGhpcy5kcmFnZ2VkRWxlbWVudCk7XHJcblxyXG5cdFx0XHRcdFx0aWYgKHRoaXMub3B0aW9ucy5naG9zdENsYXNzKSB7XHJcblx0XHRcdFx0XHRcdHRoaXMub3JpZ2luYWxFbGVtZW50LmNsYXNzTGlzdC5hZGQoXHJcblx0XHRcdFx0XHRcdFx0dGhpcy5vcHRpb25zLmdob3N0Q2xhc3NcclxuXHRcdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhpcy5kcmFnZ2VkRWxlbWVudCA9IHRoaXMub3JpZ2luYWxFbGVtZW50OyAvLyBEcmFnIG9yaWdpbmFsIGVsZW1lbnRcclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdGlmICh0aGlzLm9wdGlvbnMuZHJhZ0NsYXNzICYmIHRoaXMuZHJhZ2dlZEVsZW1lbnQpIHtcclxuXHRcdFx0XHRcdHRoaXMuZHJhZ2dlZEVsZW1lbnQuY2xhc3NMaXN0LmFkZCh0aGlzLm9wdGlvbnMuZHJhZ0NsYXNzKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0Ly8gLS0tIEVuZCBDbG9uaW5nIExvZ2ljIC0tLVxyXG5cclxuXHRcdFx0XHR0aGlzLnN0YXJ0RXZlbnREYXRhID0ge1xyXG5cdFx0XHRcdFx0ZWxlbWVudDogdGhpcy5kcmFnZ2VkRWxlbWVudCEsXHJcblx0XHRcdFx0XHRvcmlnaW5hbEVsZW1lbnQ6IHRoaXMub3JpZ2luYWxFbGVtZW50ISxcclxuXHRcdFx0XHRcdHN0YXJ0WDogdGhpcy5zdGFydFgsXHJcblx0XHRcdFx0XHRzdGFydFk6IHRoaXMuc3RhcnRZLFxyXG5cdFx0XHRcdFx0ZXZlbnQ6IGV2ZW50LCAvLyBVc2UgdGhlIGN1cnJlbnQgbW92ZSBldmVudCBhcyB0aGUgJ3N0YXJ0JyB0cmlnZ2VyXHJcblx0XHRcdFx0XHRkcm9wWm9uZVNlbGVjdG9yOiB0aGlzLm9wdGlvbnMuZHJvcFpvbmVTZWxlY3RvcixcclxuXHRcdFx0XHR9O1xyXG5cclxuXHRcdFx0XHQvLyBDaGVjayBpZiBkcmFnIHNob3VsZCBwcm9jZWVkIChjYWxsYmFjaylcclxuXHRcdFx0XHRjb25zdCBwcm9jZWVkID0gdGhpcy5vcHRpb25zLm9uRHJhZ1N0YXJ0Py4oXHJcblx0XHRcdFx0XHR0aGlzLnN0YXJ0RXZlbnREYXRhIVxyXG5cdFx0XHRcdCk7XHJcblx0XHRcdFx0aWYgKHByb2NlZWQgPT09IGZhbHNlKSB7XHJcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhcIkRyYWcgc3RhcnQgY2FuY2VsbGVkIGJ5IGNhbGxiYWNrXCIpO1xyXG5cdFx0XHRcdFx0dGhpcy5yZXNldERyYWdTdGF0ZSgpOyAvLyBSZXNldCBpbmNsdWRlcyBoYXNNb3ZlZEJleW9uZFRocmVzaG9sZFxyXG5cdFx0XHRcdFx0cmV0dXJuO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHQvLyAtLS0gRW5kIERyYWcgSW5pdGlhbGl6YXRpb24gLS0tXHJcblxyXG5cdFx0XHRcdC8vIFRyaWdnZXIgaW5pdGlhbCBtb3ZlIGNhbGxiYWNrIGltbWVkaWF0ZWx5IGFmdGVyIHN0YXJ0XHJcblx0XHRcdFx0dGhpcy50cmlnZ2VyRHJhZ01vdmUoZXZlbnQpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIElmIHRocmVzaG9sZCBub3QgZXhjZWVkZWQsIGRvIG5vdGhpbmcgLSB3YWl0IGZvciBtb3JlIG1vdmVtZW50IG9yIHBvaW50ZXJ1cFxyXG5cdFx0XHRyZXR1cm47IC8vIERvbid0IHByb2NlZWQgZnVydGhlciBpbiB0aGlzIG1vdmUgZXZlbnQgaWYgd2UganVzdCBpbml0aWF0ZWQgZHJhZ1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIC0tLSBDb250aW51ZSBEcmFnIE1vdmUgLS0tXHJcblx0XHRpZiAodGhpcy5pc0RyYWdnaW5nKSB7XHJcblx0XHRcdGlmIChldmVudC5jYW5jZWxhYmxlKSBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyAvLyBDb250aW51ZSBwcmV2ZW50aW5nIGRlZmF1bHRzIGR1cmluZyBkcmFnXHJcblx0XHRcdHRoaXMudHJpZ2dlckRyYWdNb3ZlKGV2ZW50KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgdHJpZ2dlckRyYWdNb3ZlKGV2ZW50OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5pc0RyYWdnaW5nIHx8ICF0aGlzLmRyYWdnZWRFbGVtZW50IHx8ICF0aGlzLnN0YXJ0RXZlbnREYXRhKVxyXG5cdFx0XHRyZXR1cm47XHJcblxyXG5cdFx0Y29uc3QgZGVsdGFYID0gdGhpcy5jdXJyZW50WCAtIHRoaXMuc3RhcnRYO1xyXG5cdFx0Y29uc3QgZGVsdGFZID0gdGhpcy5jdXJyZW50WSAtIHRoaXMuc3RhcnRZO1xyXG5cclxuXHRcdC8vIFVwZGF0ZSBjbG9uZSBwb3NpdGlvbiBpZiBjbG9uaW5nXHJcblx0XHRpZiAodGhpcy5vcHRpb25zLmNsb25lRWxlbWVudCkge1xyXG5cdFx0XHRjb25zdCBzdGFydFJlY3QgPSB0aGlzLm9yaWdpbmFsRWxlbWVudCEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XHJcblx0XHRcdC8vIEFkanVzdCBiYXNlZCBvbiB3aGVyZSB0aGUgcG9pbnRlciBzdGFydGVkICp3aXRoaW4qIHRoZSBlbGVtZW50XHJcblx0XHRcdGNvbnN0IG9mZnNldFggPSB0aGlzLnN0YXJ0RXZlbnREYXRhLnN0YXJ0WCAtIHN0YXJ0UmVjdC5sZWZ0O1xyXG5cdFx0XHRjb25zdCBvZmZzZXRZID0gdGhpcy5zdGFydEV2ZW50RGF0YS5zdGFydFkgLSBzdGFydFJlY3QudG9wO1xyXG5cdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50LnN0eWxlLmxlZnQgPSBgJHt0aGlzLmN1cnJlbnRYIC0gb2Zmc2V0WH1weGA7XHJcblx0XHRcdHRoaXMuZHJhZ2dlZEVsZW1lbnQuc3R5bGUudG9wID0gYCR7dGhpcy5jdXJyZW50WSAtIG9mZnNldFl9cHhgO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIC0tLSBIaWdobGlnaHQgcG90ZW50aWFsIGRyb3AgdGFyZ2V0IC0tLVxyXG5cdFx0dGhpcy51cGRhdGVEcm9wVGFyZ2V0SGlnaGxpZ2h0KGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkpO1xyXG5cdFx0Ly8gLS0tIEVuZCBIaWdobGlnaHQgLS0tXHJcblxyXG5cdFx0Y29uc3QgbW92ZUV2ZW50RGF0YTogRHJhZ01vdmVFdmVudCA9IHtcclxuXHRcdFx0Li4udGhpcy5zdGFydEV2ZW50RGF0YSxcclxuXHRcdFx0Y3VycmVudFg6IHRoaXMuY3VycmVudFgsXHJcblx0XHRcdGN1cnJlbnRZOiB0aGlzLmN1cnJlbnRZLFxyXG5cdFx0XHRkZWx0YVg6IGRlbHRhWCxcclxuXHRcdFx0ZGVsdGFZOiBkZWx0YVksXHJcblx0XHRcdGV2ZW50OiBldmVudCxcclxuXHRcdH07XHJcblxyXG5cdFx0dGhpcy5vcHRpb25zLm9uRHJhZ01vdmU/Lihtb3ZlRXZlbnREYXRhKTtcclxuXHR9XHJcblxyXG5cdHByaXZhdGUgaGFuZGxlUG9pbnRlclVwKGV2ZW50OiBQb2ludGVyRXZlbnQpOiB2b2lkIHtcclxuXHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcIkRyYWdNYW5hZ2VyOiBQb2ludGVyIHVwXCIsXHJcblx0XHRcdGV2ZW50LFxyXG5cdFx0XHR0aGlzLmhhc01vdmVkQmV5b25kVGhyZXNob2xkXHJcblx0XHQpO1xyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIGRyYWcgdGhyZXNob2xkIHdhcyBldmVyIGNyb3NzZWQgZHVyaW5nIHRoZSBwb2ludGVybW92ZSBwaGFzZVxyXG5cdFx0aWYgKHRoaXMuaGFzTW92ZWRCZXlvbmRUaHJlc2hvbGQpIHtcclxuXHRcdFx0Ly8gSWYgbW92ZW1lbnQgb2NjdXJyZWQsIHByZXZlbnQgdGhlIGNsaWNrIGV2ZW50IHJlZ2FyZGxlc3Mgb2YgZHJvcCBzdWNjZXNzIGV0Yy5cclxuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcclxuXHRcdFx0Ly8gY29uc29sZS5sb2coYERyYWdNYW5hZ2VyOiBQcmV2ZW50aW5nIGNsaWNrIGJlY2F1c2UgdGhyZXNob2xkIHdhcyBjcm9zc2VkLmApO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0Ly8gY29uc29sZS5sb2coYERyYWdNYW5hZ2VyOiBOb3QgcHJldmVudGluZyBjbGljayBiZWNhdXNlIHRocmVzaG9sZCB3YXMgbm90IGNyb3NzZWQuYCk7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgaXQgd2FzIGVzc2VudGlhbGx5IGEgY2xpY2sgKHBvdGVudGlhbCBkcmFnIG5ldmVyIGJlY2FtZSBhY3R1YWwgZHJhZylcclxuXHRcdGlmICh0aGlzLmlzUG90ZW50aWFsRHJhZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKFwiRHJhZ01hbmFnZXI6IFBvdGVudGlhbERyYWc9dHJ1ZSwgSXNEcmFnZ2luZz1mYWxzZS4gVHJlYXRpbmcgYXMgY2xpY2svc2hvcnQgZHJhZy5cIik7XHJcblx0XHRcdHRoaXMucmVzZXREcmFnU3RhdGUoKTsgLy8gQ2xlYW4gdXAgbGlzdGVuZXJzIGV0Yy5cclxuXHRcdFx0Ly8gRG8gbm90IHJldHVybiBoZXJlIGlmIHByZXZlbnREZWZhdWx0IHdhcyBjYWxsZWQgYWJvdmVcclxuXHRcdFx0Ly8gSWYgaGFzTW92ZWRCZXlvbmRUaHJlc2hvbGQgaXMgZmFsc2UgKG5vIHByZXZlbnREZWZhdWx0KSwgdGhpcyBhbGxvd3MgdGhlIGNsaWNrXHJcblx0XHRcdC8vIElmIGhhc01vdmVkQmV5b25kVGhyZXNob2xkIGlzIHRydWUgKHByZXZlbnREZWZhdWx0IHdhcyBjYWxsZWQpLCB0aGUgY2xpY2sgaXMgYmxvY2tlZCBhbnl3YXlcclxuXHRcdFx0cmV0dXJuOyAvLyBBbGxvdyBkZWZhdWx0IGJlaGF2aW9yIChvciBwcmV2ZW50ZWQgYmVoYXZpb3IpXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgZHJhZyBzdGF0ZSBpcyBpbmNvbnNpc3RlbnQgb3IgZHJhZyBkaWRuJ3QgYWN0dWFsbHkgc3RhcnQgcHJvcGVybHlcclxuXHRcdGlmICghdGhpcy5pc0RyYWdnaW5nIHx8ICF0aGlzLmRyYWdnZWRFbGVtZW50IHx8ICF0aGlzLnN0YXJ0RXZlbnREYXRhKSB7XHJcblx0XHRcdC8vIGNvbnNvbGUubG9nKGBEcmFnTWFuYWdlcjogSW5jb25zaXN0ZW50IHN0YXRlPyBpc0RyYWdnaW5nPSR7dGhpcy5pc0RyYWdnaW5nfSwgaGFzTW92ZWQ9JHt0aGlzLmhhc01vdmVkQmV5b25kVGhyZXNob2xkfWApO1xyXG5cdFx0XHR0aGlzLnJlc2V0RHJhZ1N0YXRlKCk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH1cclxuXHJcblx0XHQvLyAtLS0gRHJhZyBFbmQgLS0tIChOb3cgd2UgYXJlIHN1cmUgYSBkcmFnIHdhcyBwcm9wZXJseSBzdGFydGVkKVxyXG5cdFx0Ly8gcHJldmVudERlZmF1bHQoKSB3YXMgcG90ZW50aWFsbHkgY2FsbGVkIGF0IHRoZSBiZWdpbm5pbmcgb2YgdGhpcyBmdW5jdGlvbi5cclxuXHRcdC8vIGNvbnNvbGUubG9nKFwiRHJhZ01hbmFnZXI6IERyYWcgRW5kIGxvZ2ljLiBoYXNNb3ZlZEJleW9uZFRocmVzaG9sZDpcIiwgdGhpcy5oYXNNb3ZlZEJleW9uZFRocmVzaG9sZCk7XHJcblxyXG5cdFx0Ly8gRGV0ZXJtaW5lIHBvdGVudGlhbCBkcm9wIHRhcmdldFxyXG5cdFx0bGV0IGRyb3BUYXJnZXQ6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcblx0XHRpZiAodGhpcy5vcHRpb25zLmRyb3Bab25lU2VsZWN0b3IpIHtcclxuXHRcdFx0Ly8gSGlkZSB0aGUgY2xvbmUgdGVtcG9yYXJpbHkgdG8gYWNjdXJhdGVseSBmaW5kIHRoZSBlbGVtZW50IHVuZGVybmVhdGhcclxuXHRcdFx0Ly8gVXNlIHRoZSBkcmFnZ2VkIGVsZW1lbnQgKHdoaWNoIG1pZ2h0IGJlIHRoZSBjbG9uZSBvciBvcmlnaW5hbClcclxuXHRcdFx0Y29uc3QgZWxlbWVudFRvSGlkZSA9IHRoaXMuZHJhZ2dlZEVsZW1lbnQ7XHJcblx0XHRcdGNvbnN0IG9yaWdpbmFsRGlzcGxheSA9IGVsZW1lbnRUb0hpZGUuc3R5bGUuZGlzcGxheTtcclxuXHRcdFx0Ly8gT25seSBoaWRlIGlmIGl0J3MgdGhlIGNsb25lLCBvdGhlcndpc2UgZWxlbWVudEZyb21Qb2ludCBnZXRzIHRoZSBvcmlnaW5hbCBlbGVtZW50IGl0c2VsZlxyXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmNsb25lRWxlbWVudCkge1xyXG5cdFx0XHRcdGVsZW1lbnRUb0hpZGUuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRjb25zdCBlbGVtZW50VW5kZXJQb2ludGVyID0gZG9jdW1lbnQuZWxlbWVudEZyb21Qb2ludChcclxuXHRcdFx0XHRldmVudC5jbGllbnRYLCAvLyBVc2UgZXZlbnQncyBjbGllbnRYL1kgd2hpY2ggYXJlIHRoZSBmaW5hbCBwb2ludGVyIGNvb3Jkc1xyXG5cdFx0XHRcdGV2ZW50LmNsaWVudFlcclxuXHRcdFx0KTtcclxuXHJcblx0XHRcdC8vIFJlc3RvcmUgdmlzaWJpbGl0eVxyXG5cdFx0XHRpZiAodGhpcy5vcHRpb25zLmNsb25lRWxlbWVudCkge1xyXG5cdFx0XHRcdGVsZW1lbnRUb0hpZGUuc3R5bGUuZGlzcGxheSA9IG9yaWdpbmFsRGlzcGxheTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0aWYgKGVsZW1lbnRVbmRlclBvaW50ZXIpIHtcclxuXHRcdFx0XHRkcm9wVGFyZ2V0ID0gZWxlbWVudFVuZGVyUG9pbnRlci5jbG9zZXN0KFxyXG5cdFx0XHRcdFx0dGhpcy5vcHRpb25zLmRyb3Bab25lU2VsZWN0b3JcclxuXHRcdFx0XHQpIGFzIEhUTUxFbGVtZW50O1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZW5kRXZlbnREYXRhOiBEcmFnRW5kRXZlbnQgPSB7XHJcblx0XHRcdC4uLnRoaXMuc3RhcnRFdmVudERhdGEsXHJcblx0XHRcdGN1cnJlbnRYOiBldmVudC5jbGllbnRYLCAvLyBVc2UgZmluYWwgcG9pbnRlciBjb29yZHNcclxuXHRcdFx0Y3VycmVudFk6IGV2ZW50LmNsaWVudFksXHJcblx0XHRcdGRlbHRhWDogZXZlbnQuY2xpZW50WCAtIHRoaXMuc3RhcnRYLCAvLyBEZWx0YSBiYXNlZCBvbiBkcmFnIHN0YXJ0IGNvb3JkcyAoc3RhcnRYL1kpXHJcblx0XHRcdGRlbHRhWTogZXZlbnQuY2xpZW50WSAtIHRoaXMuc3RhcnRZLFxyXG5cdFx0XHRldmVudDogZXZlbnQsXHJcblx0XHRcdGRyb3BUYXJnZXQ6IGRyb3BUYXJnZXQsXHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIFRyaWdnZXIgdGhlIGNhbGxiYWNrICpiZWZvcmUqIGZpbmFsIGNsZWFudXBcclxuXHRcdHRyeSB7XHJcblx0XHRcdHRoaXMub3B0aW9ucy5vbkRyYWdFbmQ/LihlbmRFdmVudERhdGEpO1xyXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIkRyYWdNYW5hZ2VyOiBFcnJvciBpbiBvbkRyYWdFbmQgY2FsbGJhY2s6XCIsIGVycm9yKTtcclxuXHRcdH0gZmluYWxseSB7XHJcblx0XHRcdC8vIEVuc3VyZSBjbGVhbnVwIGhhcHBlbnMgZXZlbiBpZiBjYWxsYmFjayB0aHJvd3NcclxuXHRcdFx0dGhpcy5yZXNldERyYWdTdGF0ZSgpOyAvLyBUaGlzIG5vdyByZXNldHMgaGFzTW92ZWRCZXlvbmRUaHJlc2hvbGRcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdHByaXZhdGUgcmVzZXREcmFnU3RhdGUoKTogdm9pZCB7XHJcblx0XHQvLyBOb3RlOiBObyBuZWVkIHRvIG1hbnVhbGx5IHJlbW92ZSBldmVudCBsaXN0ZW5lcnMgc2luY2Ugd2UncmUgdXNpbmcgcmVnaXN0ZXJEb21FdmVudFxyXG5cdFx0Ly8gT2JzaWRpYW4gd2lsbCBhdXRvbWF0aWNhbGx5IGNsZWFuIHRoZW0gdXAgd2hlbiB0aGUgY29tcG9uZW50IGlzIHVubG9hZGVkXHJcblxyXG5cdFx0Ly8gQ2xlYW4gdXAgZHJhZ2dlZCBlbGVtZW50IHN0eWxlcy9ET01cclxuXHRcdGlmICh0aGlzLmRyYWdnZWRFbGVtZW50KSB7XHJcblx0XHRcdGlmICh0aGlzLm9wdGlvbnMuZHJhZ0NsYXNzKSB7XHJcblx0XHRcdFx0dGhpcy5kcmFnZ2VkRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKHRoaXMub3B0aW9ucy5kcmFnQ2xhc3MpO1xyXG5cdFx0XHR9XHJcblx0XHRcdC8vIFJlbW92ZSBjbG9uZSBpZiBpdCBleGlzdHNcclxuXHRcdFx0aWYgKFxyXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5jbG9uZUVsZW1lbnQgJiZcclxuXHRcdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50ICE9PSB0aGlzLm9yaWdpbmFsRWxlbWVudFxyXG5cdFx0XHQpIHtcclxuXHRcdFx0XHQvLyBDaGVjayBpdCdzIG5vdCB0aGUgb3JpZ2luYWwgZWxlbWVudCBiZWZvcmUgcmVtb3ZpbmdcclxuXHRcdFx0XHR0aGlzLmRyYWdnZWRFbGVtZW50LnJlbW92ZSgpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHQvLyBDbGVhbiB1cCBvcmlnaW5hbCBlbGVtZW50IHN0eWxlc1xyXG5cdFx0aWYgKHRoaXMub3JpZ2luYWxFbGVtZW50ICYmIHRoaXMub3B0aW9ucy5naG9zdENsYXNzKSB7XHJcblx0XHRcdHRoaXMub3JpZ2luYWxFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUodGhpcy5vcHRpb25zLmdob3N0Q2xhc3MpO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIFJlbW92ZSBkcm9wIHRhcmdldCBoaWdobGlnaHRcclxuXHRcdGlmICh0aGlzLmN1cnJlbnREcm9wVGFyZ2V0SG92ZXIpIHtcclxuXHRcdFx0dGhpcy5jdXJyZW50RHJvcFRhcmdldEhvdmVyLmNsYXNzTGlzdC5yZW1vdmUoXCJkcm9wLXRhcmdldC1hY3RpdmVcIik7IC8vIFVzZSB5b3VyIGRlZmluZWQgY2xhc3NcclxuXHRcdFx0dGhpcy5jdXJyZW50RHJvcFRhcmdldEhvdmVyID0gbnVsbDtcclxuXHRcdH1cclxuXHJcblx0XHQvLyBSZXNldCBzdGF0ZSB2YXJpYWJsZXNcclxuXHRcdHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG5cdFx0dGhpcy5pc1BvdGVudGlhbERyYWcgPSBmYWxzZTsgLy8gUmVzZXQgcG90ZW50aWFsIGRyYWcgZmxhZ1xyXG5cdFx0dGhpcy5oYXNNb3ZlZEJleW9uZFRocmVzaG9sZCA9IGZhbHNlOyAvLyBSZXNldCB0aGUgbW92ZW1lbnQgZmxhZ1xyXG5cdFx0dGhpcy5kcmFnZ2VkRWxlbWVudCA9IG51bGw7XHJcblx0XHR0aGlzLm9yaWdpbmFsRWxlbWVudCA9IG51bGw7XHJcblx0XHR0aGlzLnN0YXJ0RXZlbnREYXRhID0gbnVsbDtcclxuXHRcdHRoaXMuaW5pdGlhbFRhcmdldCA9IG51bGw7XHJcblx0XHR0aGlzLnN0YXJ0WCA9IDA7XHJcblx0XHR0aGlzLnN0YXJ0WSA9IDA7XHJcblx0XHR0aGlzLmN1cnJlbnRYID0gMDtcclxuXHRcdHRoaXMuY3VycmVudFkgPSAwO1xyXG5cdFx0Ly8gUmVzZXQgaW5pdGlhbCBwb2ludGVyIHBvc2l0aW9ucyBhcyB3ZWxsXHJcblx0XHR0aGlzLmluaXRpYWxQb2ludGVyWCA9IDA7XHJcblx0XHR0aGlzLmluaXRpYWxQb2ludGVyWSA9IDA7XHJcblx0XHQvLyBjb25zb2xlLmxvZyhcIkRyYWdNYW5hZ2VyOiByZXNldERyYWdTdGF0ZSBmaW5pc2hlZFwiKTtcclxuXHR9XHJcblxyXG5cdC8vIE5ldyBtZXRob2QgdG8gaGFuZGxlIGhpZ2hsaWdodGluZyBkcm9wIHRhcmdldHMgZHVyaW5nIG1vdmVcclxuXHRwcml2YXRlIHVwZGF0ZURyb3BUYXJnZXRIaWdobGlnaHQoXHJcblx0XHRwb2ludGVyWDogbnVtYmVyLFxyXG5cdFx0cG9pbnRlclk6IG51bWJlclxyXG5cdCk6IHZvaWQge1xyXG5cdFx0aWYgKCF0aGlzLm9wdGlvbnMuZHJvcFpvbmVTZWxlY3RvciB8fCAhdGhpcy5kcmFnZ2VkRWxlbWVudCkgcmV0dXJuO1xyXG5cclxuXHRcdGxldCBwb3RlbnRpYWxEcm9wVGFyZ2V0OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG5cdFx0Y29uc3QgY3VycmVudEhpZ2hsaWdodCA9IHRoaXMuY3VycmVudERyb3BUYXJnZXRIb3ZlcjtcclxuXHJcblx0XHQvLyBUZW1wb3JhcmlseSBoaWRlIHRoZSBjbG9uZSB0byBmaW5kIHRoZSBlbGVtZW50IHVuZGVybmVhdGhcclxuXHRcdGNvbnN0IG9yaWdpbmFsRGlzcGxheSA9IHRoaXMuZHJhZ2dlZEVsZW1lbnQuc3R5bGUuZGlzcGxheTtcclxuXHRcdC8vIE9ubHkgaGlkZSBpZiBpdCdzIHRoZSBjbG9uZVxyXG5cdFx0aWYgKHRoaXMub3B0aW9ucy5jbG9uZUVsZW1lbnQpIHtcclxuXHRcdFx0dGhpcy5kcmFnZ2VkRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCI7XHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgZWxlbWVudFVuZGVyUG9pbnRlciA9IGRvY3VtZW50LmVsZW1lbnRGcm9tUG9pbnQoXHJcblx0XHRcdHBvaW50ZXJYLFxyXG5cdFx0XHRwb2ludGVyWVxyXG5cdFx0KTtcclxuXHJcblx0XHQvLyBSZXN0b3JlIHZpc2liaWxpdHlcclxuXHRcdGlmICh0aGlzLm9wdGlvbnMuY2xvbmVFbGVtZW50KSB7XHJcblx0XHRcdHRoaXMuZHJhZ2dlZEVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IG9yaWdpbmFsRGlzcGxheTtcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZWxlbWVudFVuZGVyUG9pbnRlcikge1xyXG5cdFx0XHRwb3RlbnRpYWxEcm9wVGFyZ2V0ID0gZWxlbWVudFVuZGVyUG9pbnRlci5jbG9zZXN0KFxyXG5cdFx0XHRcdHRoaXMub3B0aW9ucy5kcm9wWm9uZVNlbGVjdG9yXHJcblx0XHRcdCkgYXMgSFRNTEVsZW1lbnQ7XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQ2hlY2sgaWYgdGhlIGhpZ2hsaWdodGVkIHRhcmdldCBoYXMgY2hhbmdlZFxyXG5cdFx0aWYgKHBvdGVudGlhbERyb3BUYXJnZXQgIT09IGN1cnJlbnRIaWdobGlnaHQpIHtcclxuXHRcdFx0Ly8gUmVtb3ZlIGhpZ2hsaWdodCBmcm9tIHRoZSBwcmV2aW91cyB0YXJnZXRcclxuXHRcdFx0aWYgKGN1cnJlbnRIaWdobGlnaHQpIHtcclxuXHRcdFx0XHRjdXJyZW50SGlnaGxpZ2h0LmNsYXNzTGlzdC5yZW1vdmUoXCJkcm9wLXRhcmdldC1hY3RpdmVcIik7IC8vIFVzZSB5b3VyIGRlZmluZWQgY2xhc3NcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gQWRkIGhpZ2hsaWdodCB0byB0aGUgbmV3IHRhcmdldFxyXG5cdFx0XHRpZiAocG90ZW50aWFsRHJvcFRhcmdldCkge1xyXG5cdFx0XHRcdHBvdGVudGlhbERyb3BUYXJnZXQuY2xhc3NMaXN0LmFkZChcImRyb3AtdGFyZ2V0LWFjdGl2ZVwiKTsgLy8gVXNlIHlvdXIgZGVmaW5lZCBjbGFzc1xyXG5cdFx0XHRcdHRoaXMuY3VycmVudERyb3BUYXJnZXRIb3ZlciA9IHBvdGVudGlhbERyb3BUYXJnZXQ7XHJcblx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0dGhpcy5jdXJyZW50RHJvcFRhcmdldEhvdmVyID0gbnVsbDsgLy8gTm8gdmFsaWQgdGFyZ2V0IHVuZGVyIHBvaW50ZXJcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG4iXX0=