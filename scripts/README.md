# Scripts Directory

This directory contains automation scripts for the People HR Management System.

## Available Scripts

### close-draft-prs.sh

**Purpose**: Batch close multiple draft/WIP pull requests that are no longer needed.

**Prerequisites**:
- GitHub CLI (`gh`) installed
- Authenticated with GitHub CLI
- Run from repository root

**Usage**:
```bash
./scripts/close-draft-prs.sh
```

**What it does**:
1. Lists all PRs that will be closed
2. Asks for confirmation
3. Adds a closure comment to each PR explaining why
4. Closes each PR
5. Provides a summary of closures

**Customization**:
Edit the `PRS_TO_CLOSE` array in the script to change which PRs are closed.

**Safety**:
- Prompts for confirmation before making changes
- Adds informative comments before closing
- Can be aborted at any time (Ctrl+C)

## GitHub CLI Installation

### macOS
```bash
brew install gh
```

### Linux
```bash
# Debian/Ubuntu
sudo apt install gh

# Fedora/RHEL
sudo dnf install gh
```

### Windows
```bash
# Using winget
winget install GitHub.cli

# Using chocolatey  
choco install gh
```

### Authentication
```bash
gh auth login
```

## Other Scripts

Future automation scripts will be added to this directory as needed.

---

For more information about PR cleanup, see:
- `OPEN_PRS_CLEANUP_GUIDE.md` - Detailed analysis of all PRs
- `PR_CLEANUP_SUMMARY.md` - High-level cleanup summary
