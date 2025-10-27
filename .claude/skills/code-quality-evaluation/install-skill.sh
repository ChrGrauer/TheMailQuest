#!/bin/bash
# install-skill.sh
# Installation script for Code Quality Evaluation Skill

set -e

echo "======================================"
echo "  Code Quality Evaluation Skill"
echo "  Installation Script"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Determine skill directory
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="code-quality-evaluation"

echo "Source directory: $SKILL_DIR"
echo ""

# Ask user for installation type
echo "Where would you like to install this skill?"
echo "1) Personal (~/.claude/skills) - Available in all your projects"
echo "2) Project (.claude/skills) - Shared with your team"
echo "3) Both"
echo ""
read -p "Enter choice [1-3]: " choice

install_personal() {
    echo ""
    echo "${BLUE}Installing to personal skills directory...${NC}"
    
    PERSONAL_DIR="$HOME/.claude/skills/$SKILL_NAME"
    
    # Create directory
    mkdir -p "$HOME/.claude/skills"
    
    # Copy skill
    if [ -d "$PERSONAL_DIR" ]; then
        echo "${YELLOW}⚠️  Personal skill already exists. Overwrite? (y/n)${NC}"
        read -p "" overwrite
        if [ "$overwrite" != "y" ]; then
            echo "Skipped personal installation"
            return
        fi
        rm -rf "$PERSONAL_DIR"
    fi
    
    cp -r "$SKILL_DIR" "$PERSONAL_DIR"
    
    # Make script executable
    chmod +x "$PERSONAL_DIR/check-quality.sh" 2>/dev/null || true
    
    echo "${GREEN}✅ Installed to: $PERSONAL_DIR${NC}"
}

install_project() {
    echo ""
    echo "${BLUE}Installing to project skills directory...${NC}"
    
    # Find project root (look for package.json or .git)
    PROJECT_ROOT="$PWD"
    while [ "$PROJECT_ROOT" != "/" ]; do
        if [ -f "$PROJECT_ROOT/package.json" ] || [ -d "$PROJECT_ROOT/.git" ]; then
            break
        fi
        PROJECT_ROOT="$(dirname "$PROJECT_ROOT")"
    done
    
    if [ "$PROJECT_ROOT" = "/" ]; then
        echo "${YELLOW}⚠️  Could not find project root (no package.json or .git found)${NC}"
        echo "Please navigate to your project directory and try again"
        return 1
    fi
    
    echo "Project root: $PROJECT_ROOT"
    
    PROJECT_DIR="$PROJECT_ROOT/.claude/skills/$SKILL_NAME"
    
    # Create directory
    mkdir -p "$PROJECT_ROOT/.claude/skills"
    
    # Copy skill
    if [ -d "$PROJECT_DIR" ]; then
        echo "${YELLOW}⚠️  Project skill already exists. Overwrite? (y/n)${NC}"
        read -p "" overwrite
        if [ "$overwrite" != "y" ]; then
            echo "Skipped project installation"
            return
        fi
        rm -rf "$PROJECT_DIR"
    fi
    
    cp -r "$SKILL_DIR" "$PROJECT_DIR"
    
    # Make script executable
    chmod +x "$PROJECT_DIR/check-quality.sh" 2>/dev/null || true
    
    echo "${GREEN}✅ Installed to: $PROJECT_DIR${NC}"
    
    # Suggest git commit
    echo ""
    echo "${BLUE}📝 Don't forget to commit to version control:${NC}"
    echo "   cd $PROJECT_ROOT"
    echo "   git add .claude/skills/$SKILL_NAME"
    echo "   git commit -m 'Add code quality evaluation skill'"
}

# Execute based on choice
case $choice in
    1)
        install_personal
        ;;
    2)
        install_project
        ;;
    3)
        install_personal
        install_project
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "  Installation Complete!"
echo "======================================"
echo ""
echo "${GREEN}Next Steps:${NC}"
echo ""
echo "1. Verify installation:"
echo "   ls -la ~/.claude/skills/$SKILL_NAME (personal)"
echo "   ls -la .claude/skills/$SKILL_NAME (project)"
echo ""
echo "2. Test the skill:"
echo "   Ask Claude: 'Review the code quality of my recent changes'"
echo ""
echo "3. Run quality check script:"
echo "   cd your-project"
echo "   ~/.claude/skills/$SKILL_NAME/check-quality.sh"
echo "   # or"
echo "   .claude/skills/$SKILL_NAME/check-quality.sh"
echo ""
echo "4. Read the documentation:"
echo "   cat ~/.claude/skills/$SKILL_NAME/README.md"
echo ""
echo "${BLUE}📚 Quick Reference:${NC}"
echo "   - SKILL.md: Complete evaluation guide"
echo "   - examples.md: Before/after code examples"
echo "   - quick-reference.md: One-page cheat sheet"
echo "   - check-quality.sh: Automated quality checks"
echo ""
echo "Happy coding! 🚀"
