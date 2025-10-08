# Quick Start: PR Cleanup

This guide helps you quickly close the 29 draft/WIP pull requests that are cluttering the repository.

## TL;DR

```bash
# Install GitHub CLI if not already installed
brew install gh  # macOS
# OR: sudo apt install gh  # Linux
# OR: winget install GitHub.cli  # Windows

# Authenticate
gh auth login

# Run the cleanup script
./scripts/close-draft-prs.sh
```

That's it! The script will close all 29 draft PRs automatically.

## What Gets Closed?

29 draft/WIP PRs (numbers: 15, 19-45 except 46):
- Feature explorations that were never completed
- Code refactoring attempts
- Out-of-scope features
- Duplicate or superseded work

## What Doesn't Get Closed?

- ✅ **PR #17**: Event Handling System (completed, needs review)
- ✅ **PR #18**: Security Modules (completed, needs review)  
- ✅ **PR #46**: This cleanup PR (current)

## Detailed Information

- **Full analysis**: See `OPEN_PRS_CLEANUP_GUIDE.md`
- **Executive summary**: See `PR_CLEANUP_SUMMARY.md`
- **Script docs**: See `scripts/README.md`

## Manual Closure (Alternative)

If you prefer to close PRs manually:

1. Open each PR in GitHub
2. Add this comment:
   ```
   Closing as part of repository cleanup. This PR was exploratory/incomplete.
   See OPEN_PRS_CLEANUP_GUIDE.md for details.
   ```
3. Click "Close pull request"

## After Cleanup

1. Review PR #17 for merge (Event Handling)
2. Review PR #18 for merge (Security Modules)
3. Merge this PR #46 (Cleanup docs)
4. Enjoy a clean PR list! ✨

## Questions?

Read the detailed guides:
- `OPEN_PRS_CLEANUP_GUIDE.md` - Why each PR should be closed
- `PR_CLEANUP_SUMMARY.md` - Overall strategy and benefits

---

**Estimated time**: 3-5 minutes (automated) or 30-45 minutes (manual)
