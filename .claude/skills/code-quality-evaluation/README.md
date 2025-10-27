# Code Quality Evaluation Skill

A Claude Code skill for evaluating generated code focusing on maintainability, modularity, and long-term code health.

## Installation

### For Personal Use (Available in All Projects)

Copy this skill to your personal skills directory:

```bash
# Create personal skills directory if it doesn't exist
mkdir -p ~/.claude/skills

# Copy the skill
cp -r code-quality-evaluation ~/.claude/skills/
```

### For Project Use (Shared with Team)

Copy this skill to your project's `.claude/skills` directory:

```bash
# In your project root
mkdir -p .claude/skills
cp -r code-quality-evaluation .claude/skills/

# Commit to version control
git add .claude/skills/code-quality-evaluation
git commit -m "Add code quality evaluation skill"
```

## What This Skill Does

This skill helps Claude Code:
- Evaluate generated code for maintainability issues
- Identify files that are too large or too coupled
- Detect code duplication
- Assess test quality and coverage
- Suggest refactoring strategies when needed

## When Claude Uses This Skill

Claude automatically uses this skill when you:
- Ask to "review the code quality"
- Request to "evaluate maintainability"
- Ask "is this code well-structured?"
- Request refactoring guidance
- Ask about code smells or anti-patterns

## Manual Trigger Examples

If you want to explicitly trigger this skill:

```
Use the code quality evaluation skill to review the reputation calculator module
```

```
Evaluate the maintainability of the code I just generated
```

```
Run a code quality check on the ESP dashboard component
```

## Using the Quality Check Script

This skill includes a bash script for automated quality monitoring:

### Setup

```bash
# Make the script executable
chmod +x check-quality.sh

# Run from your project root
./check-quality.sh
```

### Generate Report File

```bash
# Save output to file
./check-quality.sh quality-report.txt

# View the report
cat quality-report.txt
```

### Add to CI/CD

Add to your `.github/workflows/quality-check.yml`:

```yaml
name: Code Quality Check

on:
  pull_request:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9am

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run quality check
        run: |
          chmod +x check-quality.sh
          ./check-quality.sh quality-report.txt
      
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: quality-report
          path: quality-report.txt
```

## Evaluation Criteria

The skill evaluates code across four dimensions:

### 1. Architecture & Structure (🏗️)
- File sizes (target: < 250 lines)
- Directory depth (max: 3 levels)
- Separation of concerns

### 2. Modularity & Coupling (🔄)
- Component reusability
- Import depth
- UI/logic separation

### 3. DRY - Don't Repeat Yourself (🎯)
- Code duplication (target: < 5%)
- Shared utilities
- Centralized constants

### 4. Test Quality (✅)
- Coverage (target: > 80%)
- Test redundancy
- Meaningful assertions

## Understanding the Results

The skill uses a traffic light system:

- 🟢 **Good**: No action needed, code is maintainable
- 🟡 **Medium**: Monitor and plan improvements
- 🔴 **Bad**: Refactoring required before merge

### Decision Matrix

| Result | Action |
|--------|--------|
| Majority 🟢 | ✅ Merge confidently |
| Majority 🟡 | ⚠️ Plan 1-2h refactoring, then merge |
| Majority 🔴 | 🚫 Refactor before merge |

## Example Usage

### Scenario 1: After Generating a New Module

```
I just generated the reputation-manager.js module. 
Can you evaluate its maintainability?
```

Claude will:
1. Check file size and structure
2. Look for code duplication
3. Assess coupling with other modules
4. Verify test coverage
5. Provide specific recommendations

### Scenario 2: Before Merging a PR

```
Review the code quality of the ESP dashboard feature branch 
before I merge it to main.
```

Claude will:
1. Evaluate all modified files
2. Check for introduced duplication
3. Verify proper separation of concerns
4. Suggest refactoring if needed

### Scenario 3: Refactoring Guidance

```
The game-engine.js file is 800 lines. 
How should I split it according to best practices?
```

Claude will:
1. Analyze the file's responsibilities
2. Suggest logical module boundaries
3. Provide refactoring strategy
4. Show before/after structure

## Customization

You can customize the thresholds in `SKILL.md`:

```yaml
# In the frontmatter, you could add:
settings:
  max_file_size: 250  # lines
  max_directory_depth: 3
  max_duplication: 5  # percentage
  min_coverage: 80    # percentage
```

Or modify the evaluation criteria to match your team's standards.

## Troubleshooting

### Skill Not Activating

**Issue**: Claude doesn't use the skill when expected

**Solutions**:
1. Check the skill is in the correct directory:
   - Personal: `~/.claude/skills/code-quality-evaluation/`
   - Project: `.claude/skills/code-quality-evaluation/`

2. Verify `SKILL.md` has proper frontmatter:
   ```yaml
   ---
   description: Evaluates generated code for maintainability...
   ---
   ```

3. Try explicit trigger:
   ```
   Use the code quality evaluation skill to review this code
   ```

### Script Fails to Run

**Issue**: `check-quality.sh` gives permission denied

**Solution**:
```bash
chmod +x check-quality.sh
```

**Issue**: `jscpd` not found

**Solution**:
```bash
npm install -g jscpd
# or
npx jscpd src/
```

## Integration Tips

### With Git Hooks

Add to `.git/hooks/pre-commit`:
```bash
#!/bin/bash
./check-quality.sh
if [ $? -ne 0 ]; then
    echo "❌ Code quality check failed"
    exit 1
fi
```

### With VS Code Tasks

Add to `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Check Code Quality",
      "type": "shell",
      "command": "./check-quality.sh",
      "problemMatcher": [],
      "group": {
        "kind": "test",
        "isDefault": true
      }
    }
  ]
}
```

Run with `Cmd+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows/Linux)

## Version History

- **1.0.0** (2025-01-27): Initial release
  - Four evaluation pillars
  - Quick evaluation matrix  
  - Automated quality check script
  - Refactoring strategies

## Contributing

To improve this skill:

1. Test it in real projects
2. Note what works and what doesn't
3. Suggest improvements to the evaluation criteria
4. Share common refactoring patterns you discover

## License

MIT License - feel free to adapt for your needs.

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the official [Claude Code documentation](https://docs.claude.com/en/docs/claude-code)
- Consult the [Agent Skills guide](https://docs.claude.com/en/docs/agents-and-tools/agent-skills)

---

**Remember**: This skill helps identify maintainability issues early, but perfect code doesn't exist. The goal is code that's easy to change safely, not code that scores 100% on every metric.
