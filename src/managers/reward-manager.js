import { __awaiter } from "tslib";
import { Notice, Component } from "obsidian";
import { RewardModal } from "../components/features/habit/modals/RewardModal"; // We'll create this modal later
import { parseAdvancedFilterQuery, evaluateFilterNode, } from "../utils/task/filter-compatibility";
export class RewardManager extends Component {
    constructor(plugin) {
        super();
        this.plugin = plugin;
        this.app = plugin.app;
        this.settings = plugin.settings.rewards;
        this.registerEvent(this.app.workspace.on("task-genius:task-completed", (task) => {
            this.triggerReward(task);
        }));
    }
    /**
     * Call this method when a task is completed.
     * @param task The completed task object.
     */
    triggerReward(task) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.settings.enableRewards ||
                !((_a = this.settings.rewardItems) === null || _a === void 0 ? void 0 : _a.length)) {
                return; // Rewards disabled or no rewards defined
            }
            const eligibleRewards = this.getEligibleRewards(task);
            console.log("eligibleRewards", eligibleRewards);
            if (!eligibleRewards.length) {
                return; // No rewards match the conditions or inventory is depleted
            }
            const chosenReward = this.drawReward(eligibleRewards);
            if (!chosenReward) {
                return; // Should not happen if eligibleRewards is not empty, but safety check
            }
            this.showRewardModal(chosenReward);
        });
    }
    /**
     * Filters the reward list based on inventory and conditions using filterUtils.
     * @param task The completed task.
     * @returns A list of rewards eligible for drawing.
     */
    getEligibleRewards(task) {
        // const now = Date.now(); // Keep if needed for time-based conditions later
        return this.settings.rewardItems.filter((reward) => {
            // 1. Check Inventory
            if (reward.inventory !== -1 && reward.inventory <= 0) {
                return false; // Skip if out of stock (and not infinite)
            }
            // 2. Check Condition using filterUtils
            if (reward.condition && reward.condition.trim()) {
                try {
                    const conditionMet = this.evaluateCondition(reward.condition, task);
                    if (!conditionMet) {
                        return false; // Skip if condition not met
                    }
                }
                catch (error) {
                    console.error(`RewardManager: Error evaluating condition "${reward.condition}" for reward "${reward.name}":`, error);
                    return false; // Skip if condition evaluation fails
                }
            }
            // If inventory and condition checks pass (or no condition), it's eligible
            return true;
        });
    }
    /**
     * Evaluates if a task meets the reward's condition string using filterUtils.
     * @param conditionString The condition string from the reward item.
     * @param task The task object.
     * @returns True if the condition is met, false otherwise.
     * @throws Error if parsing or evaluation fails.
     */
    evaluateCondition(conditionString, task) {
        if (!conditionString || !conditionString.trim()) {
            return true; // Empty condition is always true
        }
        // Use the advanced parser
        const filterTree = parseAdvancedFilterQuery(conditionString);
        // Use the advanced evaluator
        // Need to ensure the Task interface here provides all fields
        // expected by evaluateFilterNode based on the conditionString
        // (e.g., if condition uses PRIORITY:, task needs priority property)
        return evaluateFilterNode(filterTree, task);
    }
    /**
     * Draws a reward from the eligible list based on occurrence probabilities.
     * @param eligibleRewards A list of rewards that have passed inventory and condition checks.
     * @returns The chosen RewardItem or null if none could be drawn.
     */
    drawReward(eligibleRewards) {
        var _a;
        const occurrenceMap = new Map(this.settings.occurrenceLevels.map((level) => [
            level.name,
            level.chance,
        ]));
        let totalWeight = 0;
        const weightedRewards = [];
        for (const reward of eligibleRewards) {
            const chance = (_a = occurrenceMap.get(reward.occurrence)) !== null && _a !== void 0 ? _a : 0; // Default to 0 chance if occurrence level not found
            if (chance > 0) {
                weightedRewards.push({ reward, weight: chance });
                totalWeight += chance;
            }
        }
        if (totalWeight <= 0) {
            // This might happen if all eligible rewards have 0% chance based on defined levels
            console.warn("RewardManager: No rewards could be drawn as total weight is zero. Check occurrence levels and chances.");
            // Optionally, fall back to a simple random pick from eligible ones? Or just return null.
            // For now, return null.
            return null;
            // // Fallback: Uniform random chance among eligibles if weights fail
            // if (eligibleRewards.length > 0) {
            //  const randomIndex = Math.floor(Math.random() * eligibleRewards.length);
            //  return eligibleRewards[randomIndex];
            // } else {
            //  return null;
            // }
        }
        let random = Math.random() * totalWeight;
        for (const { reward, weight } of weightedRewards) {
            if (random < weight) {
                return reward;
            }
            random -= weight;
        }
        // Fallback in case of floating point issues, return the last reward considered
        // Or handle this case more gracefully if needed.
        return weightedRewards.length > 0
            ? weightedRewards[weightedRewards.length - 1].reward
            : null;
    }
    /**
     * Shows a modal displaying the chosen reward.
     * @param reward The reward item to display.
     */
    showRewardModal(reward) {
        // Check if showRewardType is set to notice
        if (this.settings.showRewardType === "notice") {
            // Show a notice that automatically accepts the reward
            new Notice(`🎉 ${reward.name}!`, 0);
            // Automatically accept the reward (decrease inventory)
            this.acceptReward(reward);
            return;
        }
        // Original modal behavior
        new RewardModal(this.app, reward, (accepted) => {
            if (accepted) {
                this.acceptReward(reward);
                new Notice(`🎉 ${reward.name}!`); // Simple confirmation
            }
            else {
                // User skipped
                new Notice(`Skipped reward: ${reward.name}`);
            }
        }).open();
    }
    /**
     * Called when the user accepts the reward. Updates inventory if necessary.
     * @param acceptedReward The reward that was accepted.
     */
    acceptReward(acceptedReward) {
        return __awaiter(this, void 0, void 0, function* () {
            if (acceptedReward.inventory === -1) {
                return; // Infinite inventory, no need to update
            }
            // Find the reward in the settings and decrement its inventory
            const rewardIndex = this.settings.rewardItems.findIndex((r) => r.id === acceptedReward.id);
            if (rewardIndex !== -1) {
                const currentInventory = this.plugin.settings.rewards.rewardItems[rewardIndex].inventory;
                // Ensure inventory is not already <= 0 before decrementing, though getEligibleRewards should prevent this.
                if (currentInventory > 0) {
                    this.plugin.settings.rewards.rewardItems[rewardIndex]
                        .inventory--;
                    yield this.plugin.saveSettings();
                    console.log(`Reward accepted: ${acceptedReward.name}. Inventory updated to: ${this.plugin.settings.rewards.rewardItems[rewardIndex].inventory}`);
                }
                else if (currentInventory !== -1) {
                    // Log if we somehow tried to accept a reward with 0 inventory (shouldn't happen)
                    console.warn(`RewardManager: Attempted to accept reward ${acceptedReward.name} with inventory ${currentInventory}`);
                }
            }
            else {
                console.error(`RewardManager: Could not find accepted reward with id ${acceptedReward.id} in settings to update inventory.`);
            }
        });
    }
    /**
     * Updates the internal settings reference. Call this if settings are reloaded externally.
     */
    updateSettings() {
        this.settings = this.plugin.settings.rewards;
        console.log("RewardManager settings updated.");
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV3YXJkLW1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXdhcmQtbWFuYWdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBRUEsT0FBTyxFQUFjLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxVQUFVLENBQUM7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlEQUFpRCxDQUFDLENBQUMsZ0NBQWdDO0FBQy9HLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsa0JBQWtCLEdBRWxCLE1BQU0sb0NBQW9DLENBQUM7QUFHNUMsTUFBTSxPQUFPLGFBQWMsU0FBUSxTQUFTO0lBSzNDLFlBQVksTUFBNkI7UUFDeEMsS0FBSyxFQUFFLENBQUM7UUFDUixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDdEIsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUV4QyxJQUFJLENBQUMsYUFBYSxDQUNqQixJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQ3BCLDRCQUE0QixFQUM1QixDQUFDLElBQVUsRUFBRSxFQUFFO1lBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQixDQUFDLENBQ0QsQ0FDRCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNVLGFBQWEsQ0FBQyxJQUFVOzs7WUFDcEMsSUFDQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYTtnQkFDNUIsQ0FBQyxDQUFBLE1BQUEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLDBDQUFFLE1BQU0sQ0FBQSxFQUNqQztnQkFDRCxPQUFPLENBQUMseUNBQXlDO2FBQ2pEO1lBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RELE9BQU8s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LENBQ1Ysb0JBQW9CLGNBQWMsQ0FBQyxJQUFJLDJCQUEyQixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUNuSSxDQUFDO2lCQUNGO3FCQUFNLElBQUksZ0JBQWdCLEtBQUssQ0FBQyxDQUFDLEVBQUU7b0JBQ25DLGlGQUFpRjtvQkFDakYsT0FBTyxDQUFDLElBQUksQ0FDWCw2Q0FBNkMsY0FBYyxDQUFDLElBQUksbUJBQW1CLGdCQUFnQixFQUFFLENBQ3JHLENBQUM7aUJBQ0Y7YUFDRDtpQkFBTTtnQkFDTixPQUFPLENBQUMsS0FBSyxDQUNaLHlEQUF5RCxjQUFjLENBQUMsRUFBRSxtQ0FBbUMsQ0FDN0csQ0FBQzthQUNGO1FBQ0YsQ0FBQztLQUFBO0lBRUQ7O09BRUc7SUFDSSxjQUFjO1FBQ3BCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQzdDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLENBQUMsQ0FBQztJQUNoRCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgVGFza1Byb2dyZXNzQmFyUGx1Z2luIGZyb20gXCIuLi9pbmRleFwiO1xyXG5pbXBvcnQgeyBSZXdhcmRJdGVtLCBSZXdhcmRTZXR0aW5ncyB9IGZyb20gXCIuLi9jb21tb24vc2V0dGluZy1kZWZpbml0aW9uXCI7XHJcbmltcG9ydCB7IFRGaWxlLCBBcHAsIE5vdGljZSwgQ29tcG9uZW50IH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFJld2FyZE1vZGFsIH0gZnJvbSBcIi4uL2NvbXBvbmVudHMvZmVhdHVyZXMvaGFiaXQvbW9kYWxzL1Jld2FyZE1vZGFsXCI7IC8vIFdlJ2xsIGNyZWF0ZSB0aGlzIG1vZGFsIGxhdGVyXHJcbmltcG9ydCB7XHJcblx0cGFyc2VBZHZhbmNlZEZpbHRlclF1ZXJ5LFxyXG5cdGV2YWx1YXRlRmlsdGVyTm9kZSxcclxuXHRGaWx0ZXJOb2RlLFxyXG59IGZyb20gXCIuLi91dGlscy90YXNrL2ZpbHRlci1jb21wYXRpYmlsaXR5XCI7XHJcbmltcG9ydCB7IFRhc2sgfSBmcm9tIFwiLi4vdHlwZXMvdGFza1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFJld2FyZE1hbmFnZXIgZXh0ZW5kcyBDb21wb25lbnQge1xyXG5cdHByaXZhdGUgcGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW47XHJcblx0cHJpdmF0ZSBhcHA6IEFwcDtcclxuXHRwcml2YXRlIHNldHRpbmdzOiBSZXdhcmRTZXR0aW5ncztcclxuXHJcblx0Y29uc3RydWN0b3IocGx1Z2luOiBUYXNrUHJvZ3Jlc3NCYXJQbHVnaW4pIHtcclxuXHRcdHN1cGVyKCk7XHJcblx0XHR0aGlzLnBsdWdpbiA9IHBsdWdpbjtcclxuXHRcdHRoaXMuYXBwID0gcGx1Z2luLmFwcDtcclxuXHRcdHRoaXMuc2V0dGluZ3MgPSBwbHVnaW4uc2V0dGluZ3MucmV3YXJkcztcclxuXHJcblx0XHR0aGlzLnJlZ2lzdGVyRXZlbnQoXHJcblx0XHRcdHRoaXMuYXBwLndvcmtzcGFjZS5vbihcclxuXHRcdFx0XHRcInRhc2stZ2VuaXVzOnRhc2stY29tcGxldGVkXCIsXHJcblx0XHRcdFx0KHRhc2s6IFRhc2spID0+IHtcclxuXHRcdFx0XHRcdHRoaXMudHJpZ2dlclJld2FyZCh0YXNrKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdClcclxuXHRcdCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDYWxsIHRoaXMgbWV0aG9kIHdoZW4gYSB0YXNrIGlzIGNvbXBsZXRlZC5cclxuXHQgKiBAcGFyYW0gdGFzayBUaGUgY29tcGxldGVkIHRhc2sgb2JqZWN0LlxyXG5cdCAqL1xyXG5cdHB1YmxpYyBhc3luYyB0cmlnZ2VyUmV3YXJkKHRhc2s6IFRhc2spOiBQcm9taXNlPHZvaWQ+IHtcclxuXHRcdGlmIChcclxuXHRcdFx0IXRoaXMuc2V0dGluZ3MuZW5hYmxlUmV3YXJkcyB8fFxyXG5cdFx0XHQhdGhpcy5zZXR0aW5ncy5yZXdhcmRJdGVtcz8ubGVuZ3RoXHJcblx0XHQpIHtcclxuXHRcdFx0cmV0dXJuOyAvLyBSZXdhcmRzIGRpc2FibGVkIG9yIG5vIHJld2FyZHMgZGVmaW5lZFxyXG5cdFx0fVxyXG5cclxuXHRcdGNvbnN0IGVsaWdpYmxlUmV3YXJkcyA9IHRoaXMuZ2V0RWxpZ2libGVSZXdhcmRzKHRhc2spO1xyXG5cdFx0Y29uc29sZS5sb2coXCJlbGlnaWJsZVJld2FyZHNcIiwgZWxpZ2libGVSZXdhcmRzKTtcclxuXHRcdGlmICghZWxpZ2libGVSZXdhcmRzLmxlbmd0aCkge1xyXG5cdFx0XHRyZXR1cm47IC8vIE5vIHJld2FyZHMgbWF0Y2ggdGhlIGNvbmRpdGlvbnMgb3IgaW52ZW50b3J5IGlzIGRlcGxldGVkXHJcblx0XHR9XHJcblxyXG5cdFx0Y29uc3QgY2hvc2VuUmV3YXJkID0gdGhpcy5kcmF3UmV3YXJkKGVsaWdpYmxlUmV3YXJkcyk7XHJcblx0XHRpZiAoIWNob3NlblJld2FyZCkge1xyXG5cdFx0XHRyZXR1cm47IC8vIFNob3VsZCBub3QgaGFwcGVuIGlmIGVsaWdpYmxlUmV3YXJkcyBpcyBub3QgZW1wdHksIGJ1dCBzYWZldHkgY2hlY2tcclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLnNob3dSZXdhcmRNb2RhbChjaG9zZW5SZXdhcmQpO1xyXG5cdH1cclxuXHJcblx0LyoqXHJcblx0ICogRmlsdGVycyB0aGUgcmV3YXJkIGxpc3QgYmFzZWQgb24gaW52ZW50b3J5IGFuZCBjb25kaXRpb25zIHVzaW5nIGZpbHRlclV0aWxzLlxyXG5cdCAqIEBwYXJhbSB0YXNrIFRoZSBjb21wbGV0ZWQgdGFzay5cclxuXHQgKiBAcmV0dXJucyBBIGxpc3Qgb2YgcmV3YXJkcyBlbGlnaWJsZSBmb3IgZHJhd2luZy5cclxuXHQgKi9cclxuXHRwcml2YXRlIGdldEVsaWdpYmxlUmV3YXJkcyh0YXNrOiBUYXNrKTogUmV3YXJkSXRlbVtdIHtcclxuXHRcdC8vIGNvbnN0IG5vdyA9IERhdGUubm93KCk7IC8vIEtlZXAgaWYgbmVlZGVkIGZvciB0aW1lLWJhc2VkIGNvbmRpdGlvbnMgbGF0ZXJcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5zZXR0aW5ncy5yZXdhcmRJdGVtcy5maWx0ZXIoKHJld2FyZCkgPT4ge1xyXG5cdFx0XHQvLyAxLiBDaGVjayBJbnZlbnRvcnlcclxuXHRcdFx0aWYgKHJld2FyZC5pbnZlbnRvcnkgIT09IC0xICYmIHJld2FyZC5pbnZlbnRvcnkgPD0gMCkge1xyXG5cdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gU2tpcCBpZiBvdXQgb2Ygc3RvY2sgKGFuZCBub3QgaW5maW5pdGUpXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdC8vIDIuIENoZWNrIENvbmRpdGlvbiB1c2luZyBmaWx0ZXJVdGlsc1xyXG5cdFx0XHRpZiAocmV3YXJkLmNvbmRpdGlvbiAmJiByZXdhcmQuY29uZGl0aW9uLnRyaW0oKSkge1xyXG5cdFx0XHRcdHRyeSB7XHJcblx0XHRcdFx0XHRjb25zdCBjb25kaXRpb25NZXQgPSB0aGlzLmV2YWx1YXRlQ29uZGl0aW9uKFxyXG5cdFx0XHRcdFx0XHRyZXdhcmQuY29uZGl0aW9uLFxyXG5cdFx0XHRcdFx0XHR0YXNrXHJcblx0XHRcdFx0XHQpO1xyXG5cdFx0XHRcdFx0aWYgKCFjb25kaXRpb25NZXQpIHtcclxuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlOyAvLyBTa2lwIGlmIGNvbmRpdGlvbiBub3QgbWV0XHJcblx0XHRcdFx0XHR9XHJcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcclxuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXHJcblx0XHRcdFx0XHRcdGBSZXdhcmRNYW5hZ2VyOiBFcnJvciBldmFsdWF0aW5nIGNvbmRpdGlvbiBcIiR7cmV3YXJkLmNvbmRpdGlvbn1cIiBmb3IgcmV3YXJkIFwiJHtyZXdhcmQubmFtZX1cIjpgLFxyXG5cdFx0XHRcdFx0XHRlcnJvclxyXG5cdFx0XHRcdFx0KTtcclxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTsgLy8gU2tpcCBpZiBjb25kaXRpb24gZXZhbHVhdGlvbiBmYWlsc1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Ly8gSWYgaW52ZW50b3J5IGFuZCBjb25kaXRpb24gY2hlY2tzIHBhc3MgKG9yIG5vIGNvbmRpdGlvbiksIGl0J3MgZWxpZ2libGVcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9KTtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIEV2YWx1YXRlcyBpZiBhIHRhc2sgbWVldHMgdGhlIHJld2FyZCdzIGNvbmRpdGlvbiBzdHJpbmcgdXNpbmcgZmlsdGVyVXRpbHMuXHJcblx0ICogQHBhcmFtIGNvbmRpdGlvblN0cmluZyBUaGUgY29uZGl0aW9uIHN0cmluZyBmcm9tIHRoZSByZXdhcmQgaXRlbS5cclxuXHQgKiBAcGFyYW0gdGFzayBUaGUgdGFzayBvYmplY3QuXHJcblx0ICogQHJldHVybnMgVHJ1ZSBpZiB0aGUgY29uZGl0aW9uIGlzIG1ldCwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG5cdCAqIEB0aHJvd3MgRXJyb3IgaWYgcGFyc2luZyBvciBldmFsdWF0aW9uIGZhaWxzLlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgZXZhbHVhdGVDb25kaXRpb24oY29uZGl0aW9uU3RyaW5nOiBzdHJpbmcsIHRhc2s6IFRhc2spOiBib29sZWFuIHtcclxuXHRcdGlmICghY29uZGl0aW9uU3RyaW5nIHx8ICFjb25kaXRpb25TdHJpbmcudHJpbSgpKSB7XHJcblx0XHRcdHJldHVybiB0cnVlOyAvLyBFbXB0eSBjb25kaXRpb24gaXMgYWx3YXlzIHRydWVcclxuXHRcdH1cclxuXHJcblx0XHQvLyBVc2UgdGhlIGFkdmFuY2VkIHBhcnNlclxyXG5cdFx0Y29uc3QgZmlsdGVyVHJlZTogRmlsdGVyTm9kZSA9XHJcblx0XHRcdHBhcnNlQWR2YW5jZWRGaWx0ZXJRdWVyeShjb25kaXRpb25TdHJpbmcpO1xyXG5cclxuXHRcdC8vIFVzZSB0aGUgYWR2YW5jZWQgZXZhbHVhdG9yXHJcblx0XHQvLyBOZWVkIHRvIGVuc3VyZSB0aGUgVGFzayBpbnRlcmZhY2UgaGVyZSBwcm92aWRlcyBhbGwgZmllbGRzXHJcblx0XHQvLyBleHBlY3RlZCBieSBldmFsdWF0ZUZpbHRlck5vZGUgYmFzZWQgb24gdGhlIGNvbmRpdGlvblN0cmluZ1xyXG5cdFx0Ly8gKGUuZy4sIGlmIGNvbmRpdGlvbiB1c2VzIFBSSU9SSVRZOiwgdGFzayBuZWVkcyBwcmlvcml0eSBwcm9wZXJ0eSlcclxuXHRcdHJldHVybiBldmFsdWF0ZUZpbHRlck5vZGUoZmlsdGVyVHJlZSwgdGFzayk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBEcmF3cyBhIHJld2FyZCBmcm9tIHRoZSBlbGlnaWJsZSBsaXN0IGJhc2VkIG9uIG9jY3VycmVuY2UgcHJvYmFiaWxpdGllcy5cclxuXHQgKiBAcGFyYW0gZWxpZ2libGVSZXdhcmRzIEEgbGlzdCBvZiByZXdhcmRzIHRoYXQgaGF2ZSBwYXNzZWQgaW52ZW50b3J5IGFuZCBjb25kaXRpb24gY2hlY2tzLlxyXG5cdCAqIEByZXR1cm5zIFRoZSBjaG9zZW4gUmV3YXJkSXRlbSBvciBudWxsIGlmIG5vbmUgY291bGQgYmUgZHJhd24uXHJcblx0ICovXHJcblx0cHJpdmF0ZSBkcmF3UmV3YXJkKGVsaWdpYmxlUmV3YXJkczogUmV3YXJkSXRlbVtdKTogUmV3YXJkSXRlbSB8IG51bGwge1xyXG5cdFx0Y29uc3Qgb2NjdXJyZW5jZU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KFxyXG5cdFx0XHR0aGlzLnNldHRpbmdzLm9jY3VycmVuY2VMZXZlbHMubWFwKChsZXZlbCkgPT4gW1xyXG5cdFx0XHRcdGxldmVsLm5hbWUsXHJcblx0XHRcdFx0bGV2ZWwuY2hhbmNlLFxyXG5cdFx0XHRdKVxyXG5cdFx0KTtcclxuXHJcblx0XHRsZXQgdG90YWxXZWlnaHQgPSAwO1xyXG5cdFx0Y29uc3Qgd2VpZ2h0ZWRSZXdhcmRzOiB7IHJld2FyZDogUmV3YXJkSXRlbTsgd2VpZ2h0OiBudW1iZXIgfVtdID0gW107XHJcblxyXG5cdFx0Zm9yIChjb25zdCByZXdhcmQgb2YgZWxpZ2libGVSZXdhcmRzKSB7XHJcblx0XHRcdGNvbnN0IGNoYW5jZSA9IG9jY3VycmVuY2VNYXAuZ2V0KHJld2FyZC5vY2N1cnJlbmNlKSA/PyAwOyAvLyBEZWZhdWx0IHRvIDAgY2hhbmNlIGlmIG9jY3VycmVuY2UgbGV2ZWwgbm90IGZvdW5kXHJcblx0XHRcdGlmIChjaGFuY2UgPiAwKSB7XHJcblx0XHRcdFx0d2VpZ2h0ZWRSZXdhcmRzLnB1c2goeyByZXdhcmQsIHdlaWdodDogY2hhbmNlIH0pO1xyXG5cdFx0XHRcdHRvdGFsV2VpZ2h0ICs9IGNoYW5jZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICh0b3RhbFdlaWdodCA8PSAwKSB7XHJcblx0XHRcdC8vIFRoaXMgbWlnaHQgaGFwcGVuIGlmIGFsbCBlbGlnaWJsZSByZXdhcmRzIGhhdmUgMCUgY2hhbmNlIGJhc2VkIG9uIGRlZmluZWQgbGV2ZWxzXHJcblx0XHRcdGNvbnNvbGUud2FybihcclxuXHRcdFx0XHRcIlJld2FyZE1hbmFnZXI6IE5vIHJld2FyZHMgY291bGQgYmUgZHJhd24gYXMgdG90YWwgd2VpZ2h0IGlzIHplcm8uIENoZWNrIG9jY3VycmVuY2UgbGV2ZWxzIGFuZCBjaGFuY2VzLlwiXHJcblx0XHRcdCk7XHJcblx0XHRcdC8vIE9wdGlvbmFsbHksIGZhbGwgYmFjayB0byBhIHNpbXBsZSByYW5kb20gcGljayBmcm9tIGVsaWdpYmxlIG9uZXM/IE9yIGp1c3QgcmV0dXJuIG51bGwuXHJcblx0XHRcdC8vIEZvciBub3csIHJldHVybiBudWxsLlxyXG5cdFx0XHRyZXR1cm4gbnVsbDtcclxuXHRcdFx0Ly8gLy8gRmFsbGJhY2s6IFVuaWZvcm0gcmFuZG9tIGNoYW5jZSBhbW9uZyBlbGlnaWJsZXMgaWYgd2VpZ2h0cyBmYWlsXHJcblx0XHRcdC8vIGlmIChlbGlnaWJsZVJld2FyZHMubGVuZ3RoID4gMCkge1xyXG5cdFx0XHQvLyAgY29uc3QgcmFuZG9tSW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBlbGlnaWJsZVJld2FyZHMubGVuZ3RoKTtcclxuXHRcdFx0Ly8gIHJldHVybiBlbGlnaWJsZVJld2FyZHNbcmFuZG9tSW5kZXhdO1xyXG5cdFx0XHQvLyB9IGVsc2Uge1xyXG5cdFx0XHQvLyAgcmV0dXJuIG51bGw7XHJcblx0XHRcdC8vIH1cclxuXHRcdH1cclxuXHJcblx0XHRsZXQgcmFuZG9tID0gTWF0aC5yYW5kb20oKSAqIHRvdGFsV2VpZ2h0O1xyXG5cclxuXHRcdGZvciAoY29uc3QgeyByZXdhcmQsIHdlaWdodCB9IG9mIHdlaWdodGVkUmV3YXJkcykge1xyXG5cdFx0XHRpZiAocmFuZG9tIDwgd2VpZ2h0KSB7XHJcblx0XHRcdFx0cmV0dXJuIHJld2FyZDtcclxuXHRcdFx0fVxyXG5cdFx0XHRyYW5kb20gLT0gd2VpZ2h0O1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIEZhbGxiYWNrIGluIGNhc2Ugb2YgZmxvYXRpbmcgcG9pbnQgaXNzdWVzLCByZXR1cm4gdGhlIGxhc3QgcmV3YXJkIGNvbnNpZGVyZWRcclxuXHRcdC8vIE9yIGhhbmRsZSB0aGlzIGNhc2UgbW9yZSBncmFjZWZ1bGx5IGlmIG5lZWRlZC5cclxuXHRcdHJldHVybiB3ZWlnaHRlZFJld2FyZHMubGVuZ3RoID4gMFxyXG5cdFx0XHQ/IHdlaWdodGVkUmV3YXJkc1t3ZWlnaHRlZFJld2FyZHMubGVuZ3RoIC0gMV0ucmV3YXJkXHJcblx0XHRcdDogbnVsbDtcclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFNob3dzIGEgbW9kYWwgZGlzcGxheWluZyB0aGUgY2hvc2VuIHJld2FyZC5cclxuXHQgKiBAcGFyYW0gcmV3YXJkIFRoZSByZXdhcmQgaXRlbSB0byBkaXNwbGF5LlxyXG5cdCAqL1xyXG5cdHByaXZhdGUgc2hvd1Jld2FyZE1vZGFsKHJld2FyZDogUmV3YXJkSXRlbSk6IHZvaWQge1xyXG5cdFx0Ly8gQ2hlY2sgaWYgc2hvd1Jld2FyZFR5cGUgaXMgc2V0IHRvIG5vdGljZVxyXG5cdFx0aWYgKHRoaXMuc2V0dGluZ3Muc2hvd1Jld2FyZFR5cGUgPT09IFwibm90aWNlXCIpIHtcclxuXHRcdFx0Ly8gU2hvdyBhIG5vdGljZSB0aGF0IGF1dG9tYXRpY2FsbHkgYWNjZXB0cyB0aGUgcmV3YXJkXHJcblx0XHRcdG5ldyBOb3RpY2UoYPCfjokgJHtyZXdhcmQubmFtZX0hYCwgMCk7XHJcblx0XHRcdC8vIEF1dG9tYXRpY2FsbHkgYWNjZXB0IHRoZSByZXdhcmQgKGRlY3JlYXNlIGludmVudG9yeSlcclxuXHRcdFx0dGhpcy5hY2NlcHRSZXdhcmQocmV3YXJkKTtcclxuXHRcdFx0cmV0dXJuO1xyXG5cdFx0fVxyXG5cclxuXHRcdC8vIE9yaWdpbmFsIG1vZGFsIGJlaGF2aW9yXHJcblx0XHRuZXcgUmV3YXJkTW9kYWwodGhpcy5hcHAsIHJld2FyZCwgKGFjY2VwdGVkKSA9PiB7XHJcblx0XHRcdGlmIChhY2NlcHRlZCkge1xyXG5cdFx0XHRcdHRoaXMuYWNjZXB0UmV3YXJkKHJld2FyZCk7XHJcblx0XHRcdFx0bmV3IE5vdGljZShg8J+OiSAke3Jld2FyZC5uYW1lfSFgKTsgLy8gU2ltcGxlIGNvbmZpcm1hdGlvblxyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIFVzZXIgc2tpcHBlZFxyXG5cdFx0XHRcdG5ldyBOb3RpY2UoYFNraXBwZWQgcmV3YXJkOiAke3Jld2FyZC5uYW1lfWApO1xyXG5cdFx0XHR9XHJcblx0XHR9KS5vcGVuKCk7XHJcblx0fVxyXG5cclxuXHQvKipcclxuXHQgKiBDYWxsZWQgd2hlbiB0aGUgdXNlciBhY2NlcHRzIHRoZSByZXdhcmQuIFVwZGF0ZXMgaW52ZW50b3J5IGlmIG5lY2Vzc2FyeS5cclxuXHQgKiBAcGFyYW0gYWNjZXB0ZWRSZXdhcmQgVGhlIHJld2FyZCB0aGF0IHdhcyBhY2NlcHRlZC5cclxuXHQgKi9cclxuXHRwcml2YXRlIGFzeW5jIGFjY2VwdFJld2FyZChhY2NlcHRlZFJld2FyZDogUmV3YXJkSXRlbSk6IFByb21pc2U8dm9pZD4ge1xyXG5cdFx0aWYgKGFjY2VwdGVkUmV3YXJkLmludmVudG9yeSA9PT0gLTEpIHtcclxuXHRcdFx0cmV0dXJuOyAvLyBJbmZpbml0ZSBpbnZlbnRvcnksIG5vIG5lZWQgdG8gdXBkYXRlXHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gRmluZCB0aGUgcmV3YXJkIGluIHRoZSBzZXR0aW5ncyBhbmQgZGVjcmVtZW50IGl0cyBpbnZlbnRvcnlcclxuXHRcdGNvbnN0IHJld2FyZEluZGV4ID0gdGhpcy5zZXR0aW5ncy5yZXdhcmRJdGVtcy5maW5kSW5kZXgoXHJcblx0XHRcdChyKSA9PiByLmlkID09PSBhY2NlcHRlZFJld2FyZC5pZFxyXG5cdFx0KTtcclxuXHRcdGlmIChyZXdhcmRJbmRleCAhPT0gLTEpIHtcclxuXHRcdFx0Y29uc3QgY3VycmVudEludmVudG9yeSA9XHJcblx0XHRcdFx0dGhpcy5wbHVnaW4uc2V0dGluZ3MucmV3YXJkcy5yZXdhcmRJdGVtc1tyZXdhcmRJbmRleF0uaW52ZW50b3J5O1xyXG5cdFx0XHQvLyBFbnN1cmUgaW52ZW50b3J5IGlzIG5vdCBhbHJlYWR5IDw9IDAgYmVmb3JlIGRlY3JlbWVudGluZywgdGhvdWdoIGdldEVsaWdpYmxlUmV3YXJkcyBzaG91bGQgcHJldmVudCB0aGlzLlxyXG5cdFx0XHRpZiAoY3VycmVudEludmVudG9yeSA+IDApIHtcclxuXHRcdFx0XHR0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXdhcmRzLnJld2FyZEl0ZW1zW3Jld2FyZEluZGV4XVxyXG5cdFx0XHRcdFx0LmludmVudG9yeS0tO1xyXG5cdFx0XHRcdGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG5cdFx0XHRcdGNvbnNvbGUubG9nKFxyXG5cdFx0XHRcdFx0YFJld2FyZCBhY2NlcHRlZDogJHthY2NlcHRlZFJld2FyZC5uYW1lfS4gSW52ZW50b3J5IHVwZGF0ZWQgdG86ICR7dGhpcy5wbHVnaW4uc2V0dGluZ3MucmV3YXJkcy5yZXdhcmRJdGVtc1tyZXdhcmRJbmRleF0uaW52ZW50b3J5fWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9IGVsc2UgaWYgKGN1cnJlbnRJbnZlbnRvcnkgIT09IC0xKSB7XHJcblx0XHRcdFx0Ly8gTG9nIGlmIHdlIHNvbWVob3cgdHJpZWQgdG8gYWNjZXB0IGEgcmV3YXJkIHdpdGggMCBpbnZlbnRvcnkgKHNob3VsZG4ndCBoYXBwZW4pXHJcblx0XHRcdFx0Y29uc29sZS53YXJuKFxyXG5cdFx0XHRcdFx0YFJld2FyZE1hbmFnZXI6IEF0dGVtcHRlZCB0byBhY2NlcHQgcmV3YXJkICR7YWNjZXB0ZWRSZXdhcmQubmFtZX0gd2l0aCBpbnZlbnRvcnkgJHtjdXJyZW50SW52ZW50b3J5fWBcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFxyXG5cdFx0XHRcdGBSZXdhcmRNYW5hZ2VyOiBDb3VsZCBub3QgZmluZCBhY2NlcHRlZCByZXdhcmQgd2l0aCBpZCAke2FjY2VwdGVkUmV3YXJkLmlkfSBpbiBzZXR0aW5ncyB0byB1cGRhdGUgaW52ZW50b3J5LmBcclxuXHRcdFx0KTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdC8qKlxyXG5cdCAqIFVwZGF0ZXMgdGhlIGludGVybmFsIHNldHRpbmdzIHJlZmVyZW5jZS4gQ2FsbCB0aGlzIGlmIHNldHRpbmdzIGFyZSByZWxvYWRlZCBleHRlcm5hbGx5LlxyXG5cdCAqL1xyXG5cdHB1YmxpYyB1cGRhdGVTZXR0aW5ncygpOiB2b2lkIHtcclxuXHRcdHRoaXMuc2V0dGluZ3MgPSB0aGlzLnBsdWdpbi5zZXR0aW5ncy5yZXdhcmRzO1xyXG5cdFx0Y29uc29sZS5sb2coXCJSZXdhcmRNYW5hZ2VyIHNldHRpbmdzIHVwZGF0ZWQuXCIpO1xyXG5cdH1cclxufVxyXG4iXX0=