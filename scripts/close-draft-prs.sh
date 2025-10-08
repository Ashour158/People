#!/bin/bash

# PR Cleanup Script for People HR Management System
# This script helps close multiple draft/WIP PRs that are no longer needed
#
# Usage: 
#   ./scripts/close-draft-prs.sh
#
# Prerequisites:
#   - GitHub CLI (gh) installed and authenticated
#   - Run from repository root

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PR Cleanup Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# List of PR numbers to close (all draft/WIP PRs except this one #46)
PRS_TO_CLOSE=(
    15  # Comprehensive security enhancements (superseded by #18)
    19  # AI and ML integrations (too large, needs breaking up)
    20  # Python module (not adopting Python)
    21  # Enterprise-grade enhancements (too broad)
    22  # Merge conflicts verification (no changes needed)
    23  # Frontend functionality fixes (too broad)
    24  # Scalability refactor (incomplete)
    25  # Multilanguage support (incomplete)
    26  # Workflows and approvals (incomplete)
    27  # Low-code customization (out of scope)
    28  # n8n workflow creation (incomplete)
    29  # Drag and drop (incomplete)
    30  # Bulk import/export (incomplete)
    31  # UI/UX refactor CCO style (incomplete)
    32  # UI/UX Zoho People style (incomplete)
    33  # Complete HR system (too broad)
    34  # Open API integration (incomplete)
    35  # Web and mobile hosting (out of scope)
    36  # Event timestamps and location (incomplete)
    37  # Travel policies (incomplete)
    38  # Event tracking (incomplete)
    40  # Frontend dependency conflicts (already fixed)
    41  # Restart completed tasks (unnecessary)
    42  # Restart failed tasks (incomplete)
    43  # Email notifications (incomplete)
    44  # People management restart (incomplete)
    45  # Claude CRM login fix (wrong repository)
)

# Closure message template
CLOSURE_MESSAGE="This PR is being closed as part of repository cleanup (see PR #46 and OPEN_PRS_CLEANUP_GUIDE.md).

**Reason for closure:**
This PR was created for exploratory/experimental purposes and was never completed. It remains in draft/WIP status with incomplete implementation, missing tests, or insufficient documentation.

**If you need this feature:**
Please create a new focused PR with:
- Clear requirements and scope  
- Complete implementation
- Tests and documentation
- Ready-for-review status (not draft)

For more context, see: OPEN_PRS_CLEANUP_GUIDE.md

Thank you! 🙏"

echo -e "${YELLOW}This script will close ${#PRS_TO_CLOSE[@]} draft/WIP PRs.${NC}"
echo ""
echo "PRs to close:"
for pr in "${PRS_TO_CLOSE[@]}"; do
    echo "  - PR #$pr"
done
echo ""

# Confirm before proceeding
read -p "Do you want to proceed? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Aborted by user.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}Starting PR closure process...${NC}"
echo ""

# Close each PR
CLOSED_COUNT=0
FAILED_COUNT=0

for pr_number in "${PRS_TO_CLOSE[@]}"; do
    echo -e "${BLUE}Processing PR #$pr_number...${NC}"
    
    # Add comment
    if gh pr comment "$pr_number" --body "$CLOSURE_MESSAGE" 2>&1; then
        echo -e "${GREEN}  ✓ Added closure comment${NC}"
    else
        echo -e "${RED}  ✗ Failed to add comment${NC}"
    fi
    
    # Close PR
    if gh pr close "$pr_number" 2>&1; then
        echo -e "${GREEN}  ✓ Closed PR #$pr_number${NC}"
        ((CLOSED_COUNT++))
    else
        echo -e "${RED}  ✗ Failed to close PR #$pr_number${NC}"
        ((FAILED_COUNT++))
    fi
    
    echo ""
    
    # Add small delay to avoid rate limiting
    sleep 1
done

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Successfully closed: $CLOSED_COUNT PRs${NC}"
if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "${RED}Failed to close: $FAILED_COUNT PRs${NC}"
fi
echo ""
echo -e "${YELLOW}Note: PRs #17 and #18 were not closed as they contain${NC}"
echo -e "${YELLOW}completed work that should be reviewed for merging.${NC}"
echo ""
echo -e "${GREEN}Cleanup complete! ✨${NC}"
