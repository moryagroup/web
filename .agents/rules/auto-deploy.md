---
trigger: always_on
---

# Auto-Deploy to GitHub Rule

## Rule: Always Commit & Push After Code Changes

After **every session where source code files are created, modified, or fixed**, you MUST automatically commit and push all changes to GitHub before ending your response. This is a mandatory, non-negotiable deployment step.

### When to trigger this rule

Trigger after completing any of the following:
- Bug fixes
- Feature additions or updates
- UI changes or improvements
- Schema / database changes
- Configuration changes (workflow files, env examples, etc.)
- Any modification to files inside `src/`, `supabase_schema.sql`, `.github/workflows/`, `capacitor.config.ts`, `vite.config.ts`, `index.html`, `package.json`

### Exact steps to follow (in order)

1. **Stage all modified files:**
   ```
   git add -A
   ```

2. **Commit with a descriptive message** using conventional commit format:
   - `fix: <short description>` — for bug fixes
   - `feat: <short description>` — for new features
   - `chore: <short description>` — for config/build changes
   - `refactor: <short description>` — for code restructuring
   - `style: <short description>` — for UI/styling only changes

   Example:
   ```
   git commit -m "fix: resolve attachment saving for income transactions"
   ```

3. **Push to origin main:**
   ```
   git push origin main
   ```

4. **Confirm success** by checking the exit code. If `git push` succeeds (exit code 0), confirm to the user that the code has been deployed to GitHub and that GitHub Actions will automatically build and deploy to GitHub Pages.

### Important notes

- Always run `git status` first to see exactly which files were changed, so the commit message is accurate.
- If there are no changes to commit (`git status` shows clean), skip this step silently — do not mention it.
- Use the git user config already set on the machine. If not set, use: `git config user.name "Antigravity Agent"` and `git config user.email "agent@moryagroup.local"`.
- The remote URL already contains authentication. No token setup needed.
- After pushing, GitHub Actions will automatically run `deploy.yml` which builds and deploys to GitHub Pages.

### What to tell the user after pushing

Report in this format:
> ✅ **GitHub कडे Push झाले!** Commit `<hash>` → `main` branch. GitHub Actions आता automatically build करेल आणि GitHub Pages वर deploy होईल.
