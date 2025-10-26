// Temporary script to add rebuild command
console.log("Add this to your plugin commands to force rebuild:");
console.log(`
this.addCommand({
    id: 'force-rebuild-index',
    name: 'Force rebuild task index',
    callback: async () => {
        if (this.dataflowOrchestrator) {
            new Notice('Rebuilding task index...');
            await this.dataflowOrchestrator.rebuild();
            new Notice('Task index rebuilt successfully!');
        }
    }
});
`);
