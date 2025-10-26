import { Component, setIcon } from "obsidian";
/**
 * Generic tree item renderer component
 * Provides reusable tree rendering logic for any hierarchical data
 */
export class TreeItemRenderer extends Component {
    constructor(containerEl, node, config, events = {}) {
        super();
        this.childRenderers = [];
        this.containerEl = containerEl;
        this.node = node;
        this.events = events;
        // Apply default config values
        this.config = {
            renderContent: config.renderContent,
            iconResolver: config.iconResolver || (() => "folder"),
            classPrefix: config.classPrefix || "tree",
            showToggle: config.showToggle !== false,
            enableSelection: config.enableSelection !== false
        };
    }
    onload() {
        this.render();
    }
    /**
     * Render the tree node and its children
     */
    render() {
        const prefix = this.config.classPrefix;
        // Create main node container
        this.nodeEl = this.containerEl.createDiv({
            cls: `${prefix}-item`,
            attr: {
                "data-node-id": this.node.id,
                "data-level": this.node.level.toString(),
                "role": "treeitem"
            }
        });
        // Set CSS variable for level-based indentation
        this.nodeEl.style.setProperty('--tree-level', this.node.level.toString());
        // Set aria-expanded if node has children
        if (this.node.children.length > 0) {
            this.nodeEl.setAttribute('aria-expanded', this.node.isExpanded.toString());
        }
        // Apply selection state
        if (this.node.isSelected) {
            this.nodeEl.addClass("is-selected");
        }
        // Create node content container
        const nodeContentEl = this.nodeEl.createDiv({
            cls: `${prefix}-item-content`
        });
        // Create expand/collapse toggle if node has children
        if (this.config.showToggle && this.node.children.length > 0) {
            this.toggleEl = nodeContentEl.createDiv({
                cls: `${prefix}-item-toggle`
            });
            setIcon(this.toggleEl, this.node.isExpanded ? "chevron-down" : "chevron-right");
            this.registerDomEvent(this.toggleEl, "click", (e) => {
                e.stopPropagation();
                this.toggleExpanded();
            });
        }
        else if (this.config.showToggle) {
            // Add spacer for alignment when no children
            nodeContentEl.createDiv({
                cls: `${prefix}-item-toggle-spacer`
            });
        }
        // Create icon
        if (this.config.iconResolver) {
            this.iconEl = nodeContentEl.createDiv({
                cls: `${prefix}-item-icon`
            });
            const iconName = this.config.iconResolver(this.node);
            setIcon(this.iconEl, iconName);
        }
        // Create content container
        this.contentEl = nodeContentEl.createDiv({
            cls: `${prefix}-item-content-wrapper`
        });
        // Render custom content
        this.config.renderContent(this.node, this.contentEl);
        // Register click handler for selection
        if (this.config.enableSelection) {
            this.registerDomEvent(nodeContentEl, "click", (e) => {
                const isMultiSelect = e.ctrlKey || e.metaKey;
                this.selectNode(isMultiSelect);
            });
        }
        // Register context menu handler
        this.registerDomEvent(nodeContentEl, "contextmenu", (e) => {
            if (this.events.onContextMenu) {
                this.events.onContextMenu(this.node, e);
            }
        });
        // Render children if expanded
        if (this.node.children.length > 0) {
            this.childrenContainerEl = this.nodeEl.createDiv({
                cls: `${prefix}-item-children`
            });
            if (this.node.isExpanded) {
                this.renderChildren();
            }
            else {
                this.childrenContainerEl.hide();
            }
        }
    }
    /**
     * Render child nodes
     */
    renderChildren() {
        if (!this.childrenContainerEl)
            return;
        // Clear existing children
        this.clearChildren();
        // Render each child
        for (const childNode of this.node.children) {
            const childRenderer = new TreeItemRenderer(this.childrenContainerEl, childNode, this.config, this.events);
            this.addChild(childRenderer);
            this.childRenderers.push(childRenderer);
        }
    }
    /**
     * Clear child renderers
     */
    clearChildren() {
        for (const childRenderer of this.childRenderers) {
            this.removeChild(childRenderer);
        }
        this.childRenderers = [];
        if (this.childrenContainerEl) {
            this.childrenContainerEl.empty();
        }
    }
    /**
     * Toggle expanded state
     */
    toggleExpanded() {
        this.setExpanded(!this.node.isExpanded);
    }
    /**
     * Set expanded state
     */
    setExpanded(expanded) {
        if (this.node.isExpanded === expanded)
            return;
        this.node.isExpanded = expanded;
        // Update toggle icon
        if (this.toggleEl) {
            setIcon(this.toggleEl, expanded ? "chevron-down" : "chevron-right");
        }
        // Show/hide children
        if (this.childrenContainerEl) {
            if (expanded) {
                this.renderChildren();
                this.childrenContainerEl.show();
            }
            else {
                this.childrenContainerEl.hide();
                this.clearChildren();
            }
        }
        // Trigger event
        if (this.events.onToggle) {
            this.events.onToggle(this.node, expanded);
        }
    }
    /**
     * Select this node
     */
    selectNode(isMultiSelect) {
        if (this.events.onSelect) {
            this.events.onSelect(this.node, isMultiSelect);
        }
    }
    /**
     * Update selection visual state
     */
    setSelected(selected) {
        var _a, _b;
        this.node.isSelected = selected;
        if (selected) {
            (_a = this.nodeEl) === null || _a === void 0 ? void 0 : _a.addClass("is-selected");
        }
        else {
            (_b = this.nodeEl) === null || _b === void 0 ? void 0 : _b.removeClass("is-selected");
        }
    }
    /**
     * Update the node data and re-render content
     */
    updateNode(node) {
        this.node = node;
        // Update content
        if (this.contentEl) {
            this.contentEl.empty();
            this.config.renderContent(this.node, this.contentEl);
        }
        // Update selection state
        this.setSelected(node.isSelected || false);
        // Update children if structure changed
        if (this.node.children.length > 0 && this.node.isExpanded) {
            this.renderChildren();
        }
    }
    /**
     * Get the tree node
     */
    getNode() {
        return this.node;
    }
    /**
     * Find a child renderer by node ID
     */
    findChildRenderer(nodeId) {
        for (const childRenderer of this.childRenderers) {
            if (childRenderer.getNode().id === nodeId) {
                return childRenderer;
            }
            // Recursively search in children
            const found = childRenderer.findChildRenderer(nodeId);
            if (found)
                return found;
        }
        return undefined;
    }
    onunload() {
        var _a;
        this.clearChildren();
        (_a = this.nodeEl) === null || _a === void 0 ? void 0 : _a.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJlZUl0ZW1SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIlRyZWVJdGVtUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxVQUFVLENBQUM7QUF1QjlDOzs7R0FHRztBQUNILE1BQU0sT0FBTyxnQkFBb0IsU0FBUSxTQUFTO0lBY2pELFlBQ0MsV0FBd0IsRUFDeEIsSUFBaUIsRUFDakIsTUFBaUMsRUFDakMsU0FBNEIsRUFBRTtRQUU5QixLQUFLLEVBQUUsQ0FBQztRQWZELG1CQUFjLEdBQTBCLEVBQUUsQ0FBQztRQWdCbEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFFckIsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxNQUFNLEdBQUc7WUFDYixhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWE7WUFDbkMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7WUFDckQsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXLElBQUksTUFBTTtZQUN6QyxVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVUsS0FBSyxLQUFLO1lBQ3ZDLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZSxLQUFLLEtBQUs7U0FDVixDQUFDO0lBQzFDLENBQUM7SUFFRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssTUFBTTtRQUNiLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO1FBRXZDLDZCQUE2QjtRQUM3QixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDO1lBQ3hD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QUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1NBQ3JEO1FBRUQseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUUzQyx1Q0FBdUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1lBQzFELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztTQUN0QjtJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNJLE9BQU87UUFDYixPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksaUJBQWlCLENBQUMsTUFBYztRQUN0QyxLQUFLLE1BQU0sYUFBYSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDaEQsSUFBSSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxLQUFLLE1BQU0sRUFBRTtnQkFDMUMsT0FBTyxhQUFhLENBQUM7YUFDckI7WUFDRCxpQ0FBaUM7WUFDakMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RELElBQUksS0FBSztnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUN4QjtRQUNELE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxRQUFROztRQUNQLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNyQixNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbXBvbmVudCwgc2V0SWNvbiB9IGZyb20gXCJvYnNpZGlhblwiO1xyXG5pbXBvcnQgeyBUcmVlTm9kZSwgVHJlZU5vZGVFdmVudHMgfSBmcm9tIFwiQC90eXBlcy90cmVlXCI7XHJcblxyXG4vKipcclxuICogQ29uZmlndXJhdGlvbiBmb3IgdHJlZSBpdGVtIHJlbmRlcmluZ1xyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBUcmVlSXRlbVJlbmRlcmVyQ29uZmlnPFQ+IHtcclxuXHQvKiogRnVuY3Rpb24gdG8gcmVuZGVyIGN1c3RvbSBjb250ZW50IGZvciBhIG5vZGUgKi9cclxuXHRyZW5kZXJDb250ZW50OiAobm9kZTogVHJlZU5vZGU8VD4sIGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpID0+IHZvaWQ7XHJcblx0XHJcblx0LyoqIEZ1bmN0aW9uIHRvIGRldGVybWluZSB0aGUgaWNvbiBmb3IgYSBub2RlICovXHJcblx0aWNvblJlc29sdmVyPzogKG5vZGU6IFRyZWVOb2RlPFQ+KSA9PiBzdHJpbmc7XHJcblx0XHJcblx0LyoqIENTUyBjbGFzcyBwcmVmaXggZm9yIHN0eWxpbmcgKi9cclxuXHRjbGFzc1ByZWZpeD86IHN0cmluZztcclxuXHRcclxuXHQvKiogV2hldGhlciB0byBzaG93IGV4cGFuZC9jb2xsYXBzZSB0b2dnbGUgKi9cclxuXHRzaG93VG9nZ2xlPzogYm9vbGVhbjtcclxuXHRcclxuXHQvKiogV2hldGhlciB0byBlbmFibGUgc2VsZWN0aW9uICovXHJcblx0ZW5hYmxlU2VsZWN0aW9uPzogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyaWMgdHJlZSBpdGVtIHJlbmRlcmVyIGNvbXBvbmVudFxyXG4gKiBQcm92aWRlcyByZXVzYWJsZSB0cmVlIHJlbmRlcmluZyBsb2dpYyBmb3IgYW55IGhpZXJhcmNoaWNhbCBkYXRhXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVHJlZUl0ZW1SZW5kZXJlcjxUPiBleHRlbmRzIENvbXBvbmVudCB7XHJcblx0cHJpdmF0ZSBjb250YWluZXJFbDogSFRNTEVsZW1lbnQ7XHJcblx0cHJpdmF0ZSBub2RlOiBUcmVlTm9kZTxUPjtcclxuXHRwcml2YXRlIGNvbmZpZzogVHJlZUl0ZW1SZW5kZXJlckNvbmZpZzxUPjtcclxuXHRwcml2YXRlIGV2ZW50czogVHJlZU5vZGVFdmVudHM8VD47XHJcblx0cHJpdmF0ZSBjaGlsZFJlbmRlcmVyczogVHJlZUl0ZW1SZW5kZXJlcjxUPltdID0gW107XHJcblx0XHJcblx0Ly8gRE9NIGVsZW1lbnRzXHJcblx0cHJpdmF0ZSBub2RlRWw6IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgdG9nZ2xlRWw/OiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGljb25FbD86IEhUTUxFbGVtZW50O1xyXG5cdHByaXZhdGUgY29udGVudEVsOiBIVE1MRWxlbWVudDtcclxuXHRwcml2YXRlIGNoaWxkcmVuQ29udGFpbmVyRWw/OiBIVE1MRWxlbWVudDtcclxuXHRcclxuXHRjb25zdHJ1Y3RvcihcclxuXHRcdGNvbnRhaW5lckVsOiBIVE1MRWxlbWVudCxcclxuXHRcdG5vZGU6IFRyZWVOb2RlPFQ+LFxyXG5cdFx0Y29uZmlnOiBUcmVlSXRlbVJlbmRlcmVyQ29uZmlnPFQ+LFxyXG5cdFx0ZXZlbnRzOiBUcmVlTm9kZUV2ZW50czxUPiA9IHt9XHJcblx0KSB7XHJcblx0XHRzdXBlcigpO1xyXG5cdFx0dGhpcy5jb250YWluZXJFbCA9IGNvbnRhaW5lckVsO1xyXG5cdFx0dGhpcy5ub2RlID0gbm9kZTtcclxuXHRcdHRoaXMuZXZlbnRzID0gZXZlbnRzO1xyXG5cdFx0XHJcblx0XHQvLyBBcHBseSBkZWZhdWx0IGNvbmZpZyB2YWx1ZXNcclxuXHRcdHRoaXMuY29uZmlnID0ge1xyXG5cdFx0XHRyZW5kZXJDb250ZW50OiBjb25maWcucmVuZGVyQ29udGVudCxcclxuXHRcdFx0aWNvblJlc29sdmVyOiBjb25maWcuaWNvblJlc29sdmVyIHx8ICgoKSA9PiBcImZvbGRlclwiKSxcclxuXHRcdFx0Y2xhc3NQcmVmaXg6IGNvbmZpZy5jbGFzc1ByZWZpeCB8fCBcInRyZWVcIixcclxuXHRcdFx0c2hvd1RvZ2dsZTogY29uZmlnLnNob3dUb2dnbGUgIT09IGZhbHNlLFxyXG5cdFx0XHRlbmFibGVTZWxlY3Rpb246IGNvbmZpZy5lbmFibGVTZWxlY3Rpb24gIT09IGZhbHNlXHJcblx0XHR9IGFzIFJlcXVpcmVkPFRyZWVJdGVtUmVuZGVyZXJDb25maWc8VD4+O1xyXG5cdH1cclxuXHRcclxuXHRvbmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBSZW5kZXIgdGhlIHRyZWUgbm9kZSBhbmQgaXRzIGNoaWxkcmVuXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXIoKTogdm9pZCB7XHJcblx0XHRjb25zdCBwcmVmaXggPSB0aGlzLmNvbmZpZy5jbGFzc1ByZWZpeDtcclxuXHRcdFxyXG5cdFx0Ly8gQ3JlYXRlIG1haW4gbm9kZSBjb250YWluZXJcclxuXHRcdHRoaXMubm9kZUVsID0gdGhpcy5jb250YWluZXJFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRjbHM6IGAke3ByZWZpeH0taXRlbWAsXHJcblx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcImRhdGEtbm9kZS1pZFwiOiB0aGlzLm5vZGUuaWQsXHJcblx0XHRcdFx0XCJkYXRhLWxldmVsXCI6IHRoaXMubm9kZS5sZXZlbC50b1N0cmluZygpLFxyXG5cdFx0XHRcdFwicm9sZVwiOiBcInRyZWVpdGVtXCJcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdC8vIFNldCBDU1MgdmFyaWFibGUgZm9yIGxldmVsLWJhc2VkIGluZGVudGF0aW9uXHJcblx0XHR0aGlzLm5vZGVFbC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS10cmVlLWxldmVsJywgdGhpcy5ub2RlLmxldmVsLnRvU3RyaW5nKCkpO1xyXG5cdFx0XHJcblx0XHQvLyBTZXQgYXJpYS1leHBhbmRlZCBpZiBub2RlIGhhcyBjaGlsZHJlblxyXG5cdFx0aWYgKHRoaXMubm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMubm9kZUVsLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsIHRoaXMubm9kZS5pc0V4cGFuZGVkLnRvU3RyaW5nKCkpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBBcHBseSBzZWxlY3Rpb24gc3RhdGVcclxuXHRcdGlmICh0aGlzLm5vZGUuaXNTZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLm5vZGVFbC5hZGRDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBDcmVhdGUgbm9kZSBjb250ZW50IGNvbnRhaW5lclxyXG5cdFx0Y29uc3Qgbm9kZUNvbnRlbnRFbCA9IHRoaXMubm9kZUVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7cHJlZml4fS1pdGVtLWNvbnRlbnRgXHJcblx0XHR9KTtcclxuXHRcdFxyXG5cdFx0Ly8gQ3JlYXRlIGV4cGFuZC9jb2xsYXBzZSB0b2dnbGUgaWYgbm9kZSBoYXMgY2hpbGRyZW5cclxuXHRcdGlmICh0aGlzLmNvbmZpZy5zaG93VG9nZ2xlICYmIHRoaXMubm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMudG9nZ2xlRWwgPSBub2RlQ29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgJHtwcmVmaXh9LWl0ZW0tdG9nZ2xlYFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0c2V0SWNvbih0aGlzLnRvZ2dsZUVsLCB0aGlzLm5vZGUuaXNFeHBhbmRlZCA/IFwiY2hldnJvbi1kb3duXCIgOiBcImNoZXZyb24tcmlnaHRcIik7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQodGhpcy50b2dnbGVFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcblx0XHRcdFx0dGhpcy50b2dnbGVFeHBhbmRlZCgpO1xyXG5cdFx0XHR9KTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5jb25maWcuc2hvd1RvZ2dsZSkge1xyXG5cdFx0XHQvLyBBZGQgc3BhY2VyIGZvciBhbGlnbm1lbnQgd2hlbiBubyBjaGlsZHJlblxyXG5cdFx0XHRub2RlQ29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgJHtwcmVmaXh9LWl0ZW0tdG9nZ2xlLXNwYWNlcmBcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIENyZWF0ZSBpY29uXHJcblx0XHRpZiAodGhpcy5jb25maWcuaWNvblJlc29sdmVyKSB7XHJcblx0XHRcdHRoaXMuaWNvbkVsID0gbm9kZUNvbnRlbnRFbC5jcmVhdGVEaXYoe1xyXG5cdFx0XHRcdGNsczogYCR7cHJlZml4fS1pdGVtLWljb25gXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRjb25zdCBpY29uTmFtZSA9IHRoaXMuY29uZmlnLmljb25SZXNvbHZlcih0aGlzLm5vZGUpO1xyXG5cdFx0XHRzZXRJY29uKHRoaXMuaWNvbkVsLCBpY29uTmFtZSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIENyZWF0ZSBjb250ZW50IGNvbnRhaW5lclxyXG5cdFx0dGhpcy5jb250ZW50RWwgPSBub2RlQ29udGVudEVsLmNyZWF0ZURpdih7XHJcblx0XHRcdGNsczogYCR7cHJlZml4fS1pdGVtLWNvbnRlbnQtd3JhcHBlcmBcclxuXHRcdH0pO1xyXG5cdFx0XHJcblx0XHQvLyBSZW5kZXIgY3VzdG9tIGNvbnRlbnRcclxuXHRcdHRoaXMuY29uZmlnLnJlbmRlckNvbnRlbnQodGhpcy5ub2RlLCB0aGlzLmNvbnRlbnRFbCk7XHJcblx0XHRcclxuXHRcdC8vIFJlZ2lzdGVyIGNsaWNrIGhhbmRsZXIgZm9yIHNlbGVjdGlvblxyXG5cdFx0aWYgKHRoaXMuY29uZmlnLmVuYWJsZVNlbGVjdGlvbikge1xyXG5cdFx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobm9kZUNvbnRlbnRFbCwgXCJjbGlja1wiLCAoZSkgPT4ge1xyXG5cdFx0XHRcdGNvbnN0IGlzTXVsdGlTZWxlY3QgPSBlLmN0cmxLZXkgfHwgZS5tZXRhS2V5O1xyXG5cdFx0XHRcdHRoaXMuc2VsZWN0Tm9kZShpc011bHRpU2VsZWN0KTtcclxuXHRcdFx0fSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdC8vIFJlZ2lzdGVyIGNvbnRleHQgbWVudSBoYW5kbGVyXHJcblx0XHR0aGlzLnJlZ2lzdGVyRG9tRXZlbnQobm9kZUNvbnRlbnRFbCwgXCJjb250ZXh0bWVudVwiLCAoZSkgPT4ge1xyXG5cdFx0XHRpZiAodGhpcy5ldmVudHMub25Db250ZXh0TWVudSkge1xyXG5cdFx0XHRcdHRoaXMuZXZlbnRzLm9uQ29udGV4dE1lbnUodGhpcy5ub2RlLCBlKTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0XHRcclxuXHRcdC8vIFJlbmRlciBjaGlsZHJlbiBpZiBleHBhbmRlZFxyXG5cdFx0aWYgKHRoaXMubm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcblx0XHRcdHRoaXMuY2hpbGRyZW5Db250YWluZXJFbCA9IHRoaXMubm9kZUVsLmNyZWF0ZURpdih7XHJcblx0XHRcdFx0Y2xzOiBgJHtwcmVmaXh9LWl0ZW0tY2hpbGRyZW5gXHJcblx0XHRcdH0pO1xyXG5cdFx0XHRcclxuXHRcdFx0aWYgKHRoaXMubm9kZS5pc0V4cGFuZGVkKSB7XHJcblx0XHRcdFx0dGhpcy5yZW5kZXJDaGlsZHJlbigpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuY2hpbGRyZW5Db250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogUmVuZGVyIGNoaWxkIG5vZGVzXHJcblx0ICovXHJcblx0cHJpdmF0ZSByZW5kZXJDaGlsZHJlbigpOiB2b2lkIHtcclxuXHRcdGlmICghdGhpcy5jaGlsZHJlbkNvbnRhaW5lckVsKSByZXR1cm47XHJcblx0XHRcclxuXHRcdC8vIENsZWFyIGV4aXN0aW5nIGNoaWxkcmVuXHJcblx0XHR0aGlzLmNsZWFyQ2hpbGRyZW4oKTtcclxuXHRcdFxyXG5cdFx0Ly8gUmVuZGVyIGVhY2ggY2hpbGRcclxuXHRcdGZvciAoY29uc3QgY2hpbGROb2RlIG9mIHRoaXMubm9kZS5jaGlsZHJlbikge1xyXG5cdFx0XHRjb25zdCBjaGlsZFJlbmRlcmVyID0gbmV3IFRyZWVJdGVtUmVuZGVyZXIoXHJcblx0XHRcdFx0dGhpcy5jaGlsZHJlbkNvbnRhaW5lckVsLFxyXG5cdFx0XHRcdGNoaWxkTm9kZSxcclxuXHRcdFx0XHR0aGlzLmNvbmZpZyxcclxuXHRcdFx0XHR0aGlzLmV2ZW50c1xyXG5cdFx0XHQpO1xyXG5cdFx0XHR0aGlzLmFkZENoaWxkKGNoaWxkUmVuZGVyZXIpO1xyXG5cdFx0XHR0aGlzLmNoaWxkUmVuZGVyZXJzLnB1c2goY2hpbGRSZW5kZXJlcik7XHJcblx0XHR9XHJcblx0fVxyXG5cdFxyXG5cdC8qKlxyXG5cdCAqIENsZWFyIGNoaWxkIHJlbmRlcmVyc1xyXG5cdCAqL1xyXG5cdHByaXZhdGUgY2xlYXJDaGlsZHJlbigpOiB2b2lkIHtcclxuXHRcdGZvciAoY29uc3QgY2hpbGRSZW5kZXJlciBvZiB0aGlzLmNoaWxkUmVuZGVyZXJzKSB7XHJcblx0XHRcdHRoaXMucmVtb3ZlQ2hpbGQoY2hpbGRSZW5kZXJlcik7XHJcblx0XHR9XHJcblx0XHR0aGlzLmNoaWxkUmVuZGVyZXJzID0gW107XHJcblx0XHRpZiAodGhpcy5jaGlsZHJlbkNvbnRhaW5lckVsKSB7XHJcblx0XHRcdHRoaXMuY2hpbGRyZW5Db250YWluZXJFbC5lbXB0eSgpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBUb2dnbGUgZXhwYW5kZWQgc3RhdGVcclxuXHQgKi9cclxuXHRwcml2YXRlIHRvZ2dsZUV4cGFuZGVkKCk6IHZvaWQge1xyXG5cdFx0dGhpcy5zZXRFeHBhbmRlZCghdGhpcy5ub2RlLmlzRXhwYW5kZWQpO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBTZXQgZXhwYW5kZWQgc3RhdGVcclxuXHQgKi9cclxuXHRwdWJsaWMgc2V0RXhwYW5kZWQoZXhwYW5kZWQ6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLm5vZGUuaXNFeHBhbmRlZCA9PT0gZXhwYW5kZWQpIHJldHVybjtcclxuXHRcdFxyXG5cdFx0dGhpcy5ub2RlLmlzRXhwYW5kZWQgPSBleHBhbmRlZDtcclxuXHRcdFxyXG5cdFx0Ly8gVXBkYXRlIHRvZ2dsZSBpY29uXHJcblx0XHRpZiAodGhpcy50b2dnbGVFbCkge1xyXG5cdFx0XHRzZXRJY29uKHRoaXMudG9nZ2xlRWwsIGV4cGFuZGVkID8gXCJjaGV2cm9uLWRvd25cIiA6IFwiY2hldnJvbi1yaWdodFwiKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gU2hvdy9oaWRlIGNoaWxkcmVuXHJcblx0XHRpZiAodGhpcy5jaGlsZHJlbkNvbnRhaW5lckVsKSB7XHJcblx0XHRcdGlmIChleHBhbmRlZCkge1xyXG5cdFx0XHRcdHRoaXMucmVuZGVyQ2hpbGRyZW4oKTtcclxuXHRcdFx0XHR0aGlzLmNoaWxkcmVuQ29udGFpbmVyRWwuc2hvdygpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdHRoaXMuY2hpbGRyZW5Db250YWluZXJFbC5oaWRlKCk7XHJcblx0XHRcdFx0dGhpcy5jbGVhckNoaWxkcmVuKCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0Ly8gVHJpZ2dlciBldmVudFxyXG5cdFx0aWYgKHRoaXMuZXZlbnRzLm9uVG9nZ2xlKSB7XHJcblx0XHRcdHRoaXMuZXZlbnRzLm9uVG9nZ2xlKHRoaXMubm9kZSwgZXhwYW5kZWQpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBTZWxlY3QgdGhpcyBub2RlXHJcblx0ICovXHJcblx0cHJpdmF0ZSBzZWxlY3ROb2RlKGlzTXVsdGlTZWxlY3Q6IGJvb2xlYW4pOiB2b2lkIHtcclxuXHRcdGlmICh0aGlzLmV2ZW50cy5vblNlbGVjdCkge1xyXG5cdFx0XHR0aGlzLmV2ZW50cy5vblNlbGVjdCh0aGlzLm5vZGUsIGlzTXVsdGlTZWxlY3QpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBVcGRhdGUgc2VsZWN0aW9uIHZpc3VhbCBzdGF0ZVxyXG5cdCAqL1xyXG5cdHB1YmxpYyBzZXRTZWxlY3RlZChzZWxlY3RlZDogYm9vbGVhbik6IHZvaWQge1xyXG5cdFx0dGhpcy5ub2RlLmlzU2VsZWN0ZWQgPSBzZWxlY3RlZDtcclxuXHRcdGlmIChzZWxlY3RlZCkge1xyXG5cdFx0XHR0aGlzLm5vZGVFbD8uYWRkQ2xhc3MoXCJpcy1zZWxlY3RlZFwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMubm9kZUVsPy5yZW1vdmVDbGFzcyhcImlzLXNlbGVjdGVkXCIpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBVcGRhdGUgdGhlIG5vZGUgZGF0YSBhbmQgcmUtcmVuZGVyIGNvbnRlbnRcclxuXHQgKi9cclxuXHRwdWJsaWMgdXBkYXRlTm9kZShub2RlOiBUcmVlTm9kZTxUPik6IHZvaWQge1xyXG5cdFx0dGhpcy5ub2RlID0gbm9kZTtcclxuXHRcdFxyXG5cdFx0Ly8gVXBkYXRlIGNvbnRlbnRcclxuXHRcdGlmICh0aGlzLmNvbnRlbnRFbCkge1xyXG5cdFx0XHR0aGlzLmNvbnRlbnRFbC5lbXB0eSgpO1xyXG5cdFx0XHR0aGlzLmNvbmZpZy5yZW5kZXJDb250ZW50KHRoaXMubm9kZSwgdGhpcy5jb250ZW50RWwpO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQvLyBVcGRhdGUgc2VsZWN0aW9uIHN0YXRlXHJcblx0XHR0aGlzLnNldFNlbGVjdGVkKG5vZGUuaXNTZWxlY3RlZCB8fCBmYWxzZSk7XHJcblx0XHRcclxuXHRcdC8vIFVwZGF0ZSBjaGlsZHJlbiBpZiBzdHJ1Y3R1cmUgY2hhbmdlZFxyXG5cdFx0aWYgKHRoaXMubm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwICYmIHRoaXMubm9kZS5pc0V4cGFuZGVkKSB7XHJcblx0XHRcdHRoaXMucmVuZGVyQ2hpbGRyZW4oKTtcclxuXHRcdH1cclxuXHR9XHJcblx0XHJcblx0LyoqXHJcblx0ICogR2V0IHRoZSB0cmVlIG5vZGVcclxuXHQgKi9cclxuXHRwdWJsaWMgZ2V0Tm9kZSgpOiBUcmVlTm9kZTxUPiB7XHJcblx0XHRyZXR1cm4gdGhpcy5ub2RlO1xyXG5cdH1cclxuXHRcclxuXHQvKipcclxuXHQgKiBGaW5kIGEgY2hpbGQgcmVuZGVyZXIgYnkgbm9kZSBJRFxyXG5cdCAqL1xyXG5cdHB1YmxpYyBmaW5kQ2hpbGRSZW5kZXJlcihub2RlSWQ6IHN0cmluZyk6IFRyZWVJdGVtUmVuZGVyZXI8VD4gfCB1bmRlZmluZWQge1xyXG5cdFx0Zm9yIChjb25zdCBjaGlsZFJlbmRlcmVyIG9mIHRoaXMuY2hpbGRSZW5kZXJlcnMpIHtcclxuXHRcdFx0aWYgKGNoaWxkUmVuZGVyZXIuZ2V0Tm9kZSgpLmlkID09PSBub2RlSWQpIHtcclxuXHRcdFx0XHRyZXR1cm4gY2hpbGRSZW5kZXJlcjtcclxuXHRcdFx0fVxyXG5cdFx0XHQvLyBSZWN1cnNpdmVseSBzZWFyY2ggaW4gY2hpbGRyZW5cclxuXHRcdFx0Y29uc3QgZm91bmQgPSBjaGlsZFJlbmRlcmVyLmZpbmRDaGlsZFJlbmRlcmVyKG5vZGVJZCk7XHJcblx0XHRcdGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHVuZGVmaW5lZDtcclxuXHR9XHJcblx0XHJcblx0b251bmxvYWQoKTogdm9pZCB7XHJcblx0XHR0aGlzLmNsZWFyQ2hpbGRyZW4oKTtcclxuXHRcdHRoaXMubm9kZUVsPy5yZW1vdmUoKTtcclxuXHR9XHJcbn0iXX0=