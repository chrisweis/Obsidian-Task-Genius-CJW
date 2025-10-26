# Claude Instructions for This Repository

## ⚠️ CRITICAL: DO NOT CREATE PULL REQUESTS TO UPSTREAM

This is a personal fork (`chrisweis/Obsidian-Task-Genius-CJW`) of `Quorafind/Obsidian-Task-Genius`.

**NEVER create pull requests to the upstream repository.**

### Workflow Preference

**Always use pull requests within this fork** - do not commit directly to master.

### Build and Deployment

**Always build the plugin after changes:**
- Run `npm run build` to compile the plugin
- The build automatically deploys to Obsidian folder (configured in `.env.local`)
- Ensure `.env.local` has `OBSIDIAN_PLUGIN_PATH` set correctly

### Rules

1. **NEVER** create pull requests to `Quorafind/Obsidian-Task-Genius`
2. **ALWAYS** create PRs within this fork using: `gh pr create --repo chrisweis/Obsidian-Task-Genius-CJW`
3. Create feature branches for changes, then PR to master within the fork
4. **ALWAYS** run `npm run build` after making changes to deploy to Obsidian

### Correct Workflow

```bash
# ✅ CORRECT: Create PR within your fork
git checkout -b feature/my-feature
git add .
git commit -m "message"
npm run build  # Deploy to Obsidian folder
git push origin feature/my-feature
gh pr create --repo chrisweis/Obsidian-Task-Genius-CJW --base master

# ❌ WRONG: Do not create PRs to upstream
gh pr create  # This defaults to upstream - DON'T USE
```
