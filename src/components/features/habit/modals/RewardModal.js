import { Modal, Setting } from "obsidian";
import { t } from '@/translations/helper';
import "@/styles/reward.css";
export class RewardModal extends Modal {
    constructor(app, reward, onChoose) {
        super(app);
        this.reward = reward;
        this.onChoose = onChoose;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty(); // Clear previous content
        this.modalEl.toggleClass("reward-modal", true);
        contentEl.addClass("reward-modal-content");
        // Add a title
        this.setTitle("🎉 " + t("You've Earned a Reward!") + " 🎉");
        // Display reward name
        contentEl.createEl("p", {
            text: t("Your reward:") + " " + this.reward.name,
            cls: "reward-name",
        });
        // Display reward image if available
        if (this.reward.imageUrl) {
            const imgContainer = contentEl.createDiv({
                cls: "reward-image-container",
            });
            // Basic check for local vs web URL (can be improved)
            if (this.reward.imageUrl.startsWith("http")) {
                imgContainer.createEl("img", {
                    attr: { src: this.reward.imageUrl },
                    cls: "reward-image",
                });
            }
            else {
                // Assume it might be a vault path - needs resolving
                const imageFile = this.app.vault.getFileByPath(this.reward.imageUrl);
                if (imageFile) {
                    imgContainer.createEl("img", {
                        attr: {
                            src: this.app.vault.getResourcePath(imageFile),
                        },
                        cls: "reward-image",
                    });
                }
                else {
                    imgContainer.createEl("p", {
                        text: `(${t("Image not found:")} ${this.reward.imageUrl})`,
                        cls: "reward-image-error",
                    });
                }
            }
        }
        // Add spacing before buttons
        contentEl.createEl("div", { cls: "reward-spacer" });
        // Add buttons
        new Setting(contentEl)
            .addButton((button) => button
            .setButtonText(t("Claim Reward"))
            .setCta() // Makes the button more prominent
            .onClick(() => {
            this.onChoose(true); // Call callback with true (accepted)
            this.close();
        }))
            .addButton((button) => button.setButtonText(t("Skip")).onClick(() => {
            this.onChoose(false); // Call callback with false (skipped)
            this.close();
        }));
    }
    onClose() {
        const { contentEl } = this;
        contentEl.empty(); // Clean up the modal content
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmV3YXJkTW9kYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJSZXdhcmRNb2RhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQU8sS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUUvQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDMUMsT0FBTyxxQkFBcUIsQ0FBQztBQUU3QixNQUFNLE9BQU8sV0FBWSxTQUFRLEtBQUs7SUFJckMsWUFDQyxHQUFRLEVBQ1IsTUFBa0IsRUFDbEIsUUFBcUM7UUFFckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDMUIsQ0FBQztJQUVELE1BQU07UUFDTCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QjtRQUU1QyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFL0MsU0FBUyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRTNDLGNBQWM7UUFDZCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMseUJBQXlCLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQztRQUU1RCxzQkFBc0I7UUFDdEIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDdkIsSUFBSSxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJO1lBQ2hELEdBQUcsRUFBRSxhQUFhO1NBQ2xCLENBQUMsQ0FBQztRQUVILG9DQUFvQztRQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO1lBQ3pCLE1BQU0sWUFBWSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3hDLEdBQUcsRUFBRSx3QkFBd0I7YUFDN0IsQ0FBQyxDQUFDO1lBQ0gscURBQXFEO1lBQ3JELElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUM1QyxZQUFZLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRTtvQkFDNUIsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFO29CQUNuQyxHQUFHLEVBQUUsY0FBYztpQkFDbkIsQ0FBQyxDQUFDO2FBQ0g7aUJBQU07Z0JBQ04sb0RBQW9EO2dCQUNwRCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQzdDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUNwQixDQUFDO2dCQUNGLElBQUksU0FBUyxFQUFFO29CQUNkLFlBQVksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFO3dCQUM1QixJQUFJLEVBQUU7NEJBQ0wsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7eUJBQzlDO3dCQUNELEdBQUcsRUFBRSxjQUFjO3FCQUNuQixDQUFDLENBQUM7aUJBQ0g7cUJBQU07b0JBQ04sWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7d0JBQzFCLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxJQUM5QixJQUFJLENBQUMsTUFBTSxDQUFDLFFBQ2IsR0FBRzt3QkFDSCxHQUFHLEVBQUUsb0JBQW9CO3FCQUN6QixDQUFDLENBQUM7aUJBQ0g7YUFDRDtTQUNEO1FBRUQsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFFcEQsY0FBYztRQUNkLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQzthQUNwQixTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNyQixNQUFNO2FBQ0osYUFBYSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQzthQUNoQyxNQUFNLEVBQUUsQ0FBQyxrQ0FBa0M7YUFDM0MsT0FBTyxDQUFDLEdBQUcsRUFBRTtZQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxxQ0FBcUM7WUFDMUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQ0g7YUFDQSxTQUFTLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUNyQixNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDNUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLHFDQUFxQztZQUMzRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDZCxDQUFDLENBQUMsQ0FDRixDQUFDO0lBQ0osQ0FBQztJQUVELE9BQU87UUFDTixNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLDZCQUE2QjtJQUNqRCxDQUFDO0NBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHAsIE1vZGFsLCBTZXR0aW5nIH0gZnJvbSBcIm9ic2lkaWFuXCI7XHJcbmltcG9ydCB7IFJld2FyZEl0ZW0gfSBmcm9tICdAL2NvbW1vbi9zZXR0aW5nLWRlZmluaXRpb24nO1xyXG5pbXBvcnQgeyB0IH0gZnJvbSAnQC90cmFuc2xhdGlvbnMvaGVscGVyJztcclxuaW1wb3J0IFwiQC9zdHlsZXMvcmV3YXJkLmNzc1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFJld2FyZE1vZGFsIGV4dGVuZHMgTW9kYWwge1xyXG5cdHByaXZhdGUgcmV3YXJkOiBSZXdhcmRJdGVtO1xyXG5cdHByaXZhdGUgb25DaG9vc2U6IChhY2NlcHRlZDogYm9vbGVhbikgPT4gdm9pZDsgLy8gQ2FsbGJhY2sgZnVuY3Rpb25cclxuXHJcblx0Y29uc3RydWN0b3IoXHJcblx0XHRhcHA6IEFwcCxcclxuXHRcdHJld2FyZDogUmV3YXJkSXRlbSxcclxuXHRcdG9uQ2hvb3NlOiAoYWNjZXB0ZWQ6IGJvb2xlYW4pID0+IHZvaWRcclxuXHQpIHtcclxuXHRcdHN1cGVyKGFwcCk7XHJcblx0XHR0aGlzLnJld2FyZCA9IHJld2FyZDtcclxuXHRcdHRoaXMub25DaG9vc2UgPSBvbkNob29zZTtcclxuXHR9XHJcblxyXG5cdG9uT3BlbigpIHtcclxuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7IC8vIENsZWFyIHByZXZpb3VzIGNvbnRlbnRcclxuXHJcblx0XHR0aGlzLm1vZGFsRWwudG9nZ2xlQ2xhc3MoXCJyZXdhcmQtbW9kYWxcIiwgdHJ1ZSk7XHJcblxyXG5cdFx0Y29udGVudEVsLmFkZENsYXNzKFwicmV3YXJkLW1vZGFsLWNvbnRlbnRcIik7XHJcblxyXG5cdFx0Ly8gQWRkIGEgdGl0bGVcclxuXHRcdHRoaXMuc2V0VGl0bGUoXCLwn46JIFwiICsgdChcIllvdSd2ZSBFYXJuZWQgYSBSZXdhcmQhXCIpICsgXCIg8J+OiVwiKTtcclxuXHJcblx0XHQvLyBEaXNwbGF5IHJld2FyZCBuYW1lXHJcblx0XHRjb250ZW50RWwuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0dGV4dDogdChcIllvdXIgcmV3YXJkOlwiKSArIFwiIFwiICsgdGhpcy5yZXdhcmQubmFtZSxcclxuXHRcdFx0Y2xzOiBcInJld2FyZC1uYW1lXCIsXHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBEaXNwbGF5IHJld2FyZCBpbWFnZSBpZiBhdmFpbGFibGVcclxuXHRcdGlmICh0aGlzLnJld2FyZC5pbWFnZVVybCkge1xyXG5cdFx0XHRjb25zdCBpbWdDb250YWluZXIgPSBjb250ZW50RWwuY3JlYXRlRGl2KHtcclxuXHRcdFx0XHRjbHM6IFwicmV3YXJkLWltYWdlLWNvbnRhaW5lclwiLFxyXG5cdFx0XHR9KTtcclxuXHRcdFx0Ly8gQmFzaWMgY2hlY2sgZm9yIGxvY2FsIHZzIHdlYiBVUkwgKGNhbiBiZSBpbXByb3ZlZClcclxuXHRcdFx0aWYgKHRoaXMucmV3YXJkLmltYWdlVXJsLnN0YXJ0c1dpdGgoXCJodHRwXCIpKSB7XHJcblx0XHRcdFx0aW1nQ29udGFpbmVyLmNyZWF0ZUVsKFwiaW1nXCIsIHtcclxuXHRcdFx0XHRcdGF0dHI6IHsgc3JjOiB0aGlzLnJld2FyZC5pbWFnZVVybCB9LCAvLyBVc2UgYXR0ciBmb3IgYXR0cmlidXRlcyBsaWtlIHNyY1xyXG5cdFx0XHRcdFx0Y2xzOiBcInJld2FyZC1pbWFnZVwiLFxyXG5cdFx0XHRcdH0pO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdC8vIEFzc3VtZSBpdCBtaWdodCBiZSBhIHZhdWx0IHBhdGggLSBuZWVkcyByZXNvbHZpbmdcclxuXHRcdFx0XHRjb25zdCBpbWFnZUZpbGUgPSB0aGlzLmFwcC52YXVsdC5nZXRGaWxlQnlQYXRoKFxyXG5cdFx0XHRcdFx0dGhpcy5yZXdhcmQuaW1hZ2VVcmxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHRcdGlmIChpbWFnZUZpbGUpIHtcclxuXHRcdFx0XHRcdGltZ0NvbnRhaW5lci5jcmVhdGVFbChcImltZ1wiLCB7XHJcblx0XHRcdFx0XHRcdGF0dHI6IHtcclxuXHRcdFx0XHRcdFx0XHRzcmM6IHRoaXMuYXBwLnZhdWx0LmdldFJlc291cmNlUGF0aChpbWFnZUZpbGUpLFxyXG5cdFx0XHRcdFx0XHR9LCAvLyBVc2UgVEZpbGUgcmVmZXJlbmNlIGlmIHBvc3NpYmxlXHJcblx0XHRcdFx0XHRcdGNsczogXCJyZXdhcmQtaW1hZ2VcIixcclxuXHRcdFx0XHRcdH0pO1xyXG5cdFx0XHRcdH0gZWxzZSB7XHJcblx0XHRcdFx0XHRpbWdDb250YWluZXIuY3JlYXRlRWwoXCJwXCIsIHtcclxuXHRcdFx0XHRcdFx0dGV4dDogYCgke3QoXCJJbWFnZSBub3QgZm91bmQ6XCIpfSAke1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMucmV3YXJkLmltYWdlVXJsXHJcblx0XHRcdFx0XHRcdH0pYCxcclxuXHRcdFx0XHRcdFx0Y2xzOiBcInJld2FyZC1pbWFnZS1lcnJvclwiLFxyXG5cdFx0XHRcdFx0fSk7XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdFx0Ly8gQWRkIHNwYWNpbmcgYmVmb3JlIGJ1dHRvbnNcclxuXHRcdGNvbnRlbnRFbC5jcmVhdGVFbChcImRpdlwiLCB7IGNsczogXCJyZXdhcmQtc3BhY2VyXCIgfSk7XHJcblxyXG5cdFx0Ly8gQWRkIGJ1dHRvbnNcclxuXHRcdG5ldyBTZXR0aW5nKGNvbnRlbnRFbClcclxuXHRcdFx0LmFkZEJ1dHRvbigoYnV0dG9uKSA9PlxyXG5cdFx0XHRcdGJ1dHRvblxyXG5cdFx0XHRcdFx0LnNldEJ1dHRvblRleHQodChcIkNsYWltIFJld2FyZFwiKSlcclxuXHRcdFx0XHRcdC5zZXRDdGEoKSAvLyBNYWtlcyB0aGUgYnV0dG9uIG1vcmUgcHJvbWluZW50XHJcblx0XHRcdFx0XHQub25DbGljaygoKSA9PiB7XHJcblx0XHRcdFx0XHRcdHRoaXMub25DaG9vc2UodHJ1ZSk7IC8vIENhbGwgY2FsbGJhY2sgd2l0aCB0cnVlIChhY2NlcHRlZClcclxuXHRcdFx0XHRcdFx0dGhpcy5jbG9zZSgpO1xyXG5cdFx0XHRcdFx0fSlcclxuXHRcdFx0KVxyXG5cdFx0XHQuYWRkQnV0dG9uKChidXR0b24pID0+XHJcblx0XHRcdFx0YnV0dG9uLnNldEJ1dHRvblRleHQodChcIlNraXBcIikpLm9uQ2xpY2soKCkgPT4ge1xyXG5cdFx0XHRcdFx0dGhpcy5vbkNob29zZShmYWxzZSk7IC8vIENhbGwgY2FsbGJhY2sgd2l0aCBmYWxzZSAoc2tpcHBlZClcclxuXHRcdFx0XHRcdHRoaXMuY2xvc2UoKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHQpO1xyXG5cdH1cclxuXHJcblx0b25DbG9zZSgpIHtcclxuXHRcdGNvbnN0IHsgY29udGVudEVsIH0gPSB0aGlzO1xyXG5cdFx0Y29udGVudEVsLmVtcHR5KCk7IC8vIENsZWFuIHVwIHRoZSBtb2RhbCBjb250ZW50XHJcblx0fVxyXG59XHJcbiJdfQ==