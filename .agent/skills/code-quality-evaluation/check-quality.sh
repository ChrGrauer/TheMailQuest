#!/bin/bash
# check-quality.sh
# Weekly code quality health check
# 
# Usage: ./check-quality.sh [output-file]
# Example: ./check-quality.sh quality-report.txt

set -e

OUTPUT_FILE="${1:-}"

# Color codes for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Redirect to file if specified
if [ -n "$OUTPUT_FILE" ]; then
    exec > "$OUTPUT_FILE" 2>&1
fi

echo "======================================"
echo "    CODE QUALITY HEALTH CHECK"
echo "======================================"
echo "Generated: $(date)"
echo "Project: $(basename $(pwd))"
echo ""

# Check if src directory exists
if [ ! -d "src" ]; then
    echo "❌ Error: 'src' directory not found"
    exit 1
fi

# ======================================
# 1. FILE SIZE ANALYSIS
# ======================================
echo "📏 FILE SIZE ANALYSIS"
echo "────────────────────────────────────"

echo "Files exceeding recommended limits:"
echo ""

# Find large files (>250 lines)
large_files=$(find src -type f \( -name "*.js" -o -name "*.svelte" -o -name "*.ts" \) -exec wc -l {} + | \
    awk '$1 > 250 {count++; printf "  %s (%d lines)", $2, $1; if ($1 > 400) printf " 🔴 CRITICAL"; else if ($1 > 300) printf " 🟡 WARNING"; else printf " ⚠️  REVIEW"; print ""}; END {if (count == 0) print "  ✅ All files within limits"}')

echo "$large_files"
echo ""

# Summary statistics
total_files=$(find src -type f \( -name "*.js" -o -name "*.svelte" -o -name "*.ts" \) | wc -l | tr -d ' ')
large_count=$(find src -type f \( -name "*.js" -o -name "*.svelte" -o -name "*.ts" \) -exec wc -l {} + | awk '$1 > 250 {count++} END {print count+0}')

echo "Summary:"
echo "  Total files: $total_files"
echo "  Files > 250 lines: $large_count"

if [ "$large_count" -gt 5 ]; then
    echo "  Status: 🔴 Too many large files (target: ≤ 1)"
elif [ "$large_count" -gt 1 ]; then
    echo "  Status: 🟡 Some large files (target: ≤ 1)"
else
    echo "  Status: 🟢 Good"
fi
echo ""

# ======================================
# 2. CODE DUPLICATION
# ======================================
echo "🔄 CODE DUPLICATION ANALYSIS"
echo "────────────────────────────────────"

# Check if jscpd is available
if command -v npx &> /dev/null; then
    duplication_output=$(npx --yes jscpd src/ --threshold 10 --reporters console 2>/dev/null || echo "Error running jscpd")
    
    if [[ "$duplication_output" == *"Error"* ]]; then
        echo "⚠️  Could not run duplication check (jscpd not available)"
    else
        # Extract duplication percentage if available
        duplication_pct=$(echo "$duplication_output" | grep -oP '\d+\.\d+%' | head -1 || echo "0%")
        
        echo "Duplication rate: $duplication_pct"
        
        # Parse percentage for comparison
        dup_value=$(echo "$duplication_pct" | sed 's/%//')
        
        if (( $(echo "$dup_value > 10" | bc -l 2>/dev/null || echo "0") )); then
            echo "Status: 🔴 High duplication (target: < 5%)"
        elif (( $(echo "$dup_value > 5" | bc -l 2>/dev/null || echo "0") )); then
            echo "Status: 🟡 Moderate duplication (target: < 5%)"
        else
            echo "Status: 🟢 Good"
        fi
    fi
else
    echo "⚠️  npx not available - skipping duplication check"
fi
echo ""

# ======================================
# 3. DIRECTORY DEPTH
# ======================================
echo "📂 DIRECTORY STRUCTURE"
echo "────────────────────────────────────"

max_depth=$(find src -type f | awk -F/ '{print NF-1}' | sort -rn | head -1)
deep_paths=$(find src -type f | awk -F/ 'NF-1 > 5 {print}' | head -5)

echo "Maximum directory depth: $max_depth levels"

if [ -n "$deep_paths" ]; then
    echo ""
    echo "Paths exceeding 5 levels (🟡 consider flattening):"
    echo "$deep_paths" | while read -r path; do
        echo "  $path"
    done
fi

if [ "$max_depth" -gt 5 ]; then
    echo "Status: 🟡 Structure might be too deep (target: ≤ 4 levels)"
else
    echo "Status: 🟢 Good structure"
fi
echo ""

# ======================================
# 4. IMPORT COUPLING
# ======================================
echo "🔗 IMPORT COUPLING ANALYSIS"
echo "────────────────────────────────────"

# Find deep relative imports (../../..)
deep_imports=$(grep -r "from ['\"]\.\.\/\.\.\/\.\." src/ 2>/dev/null | wc -l | tr -d ' ')

echo "Deep relative imports (../../../): $deep_imports instances"

if [ "$deep_imports" -gt 10 ]; then
    echo "Status: 🔴 High coupling (target: 0)"
    echo ""
    echo "Consider using import aliases (@lib, $lib, etc.)"
elif [ "$deep_imports" -gt 0 ]; then
    echo "Status: 🟡 Some coupling detected (target: 0)"
else
    echo "Status: 🟢 Good - no deep imports"
fi
echo ""

# ======================================
# 5. TEST COVERAGE
# ======================================
echo "✅ TEST COVERAGE"
echo "────────────────────────────────────"

# Check if npm test is available
if [ -f "package.json" ] && grep -q "\"test\"" package.json; then
    echo "Running tests with coverage..."
    
    # Run tests and extract coverage
    coverage_output=$(npm run test -- --coverage --silent --passWithNoTests 2>&1 || echo "Error running tests")
    
    if [[ "$coverage_output" == *"Error"* ]] || [[ "$coverage_output" == *"No tests found"* ]]; then
        echo "⚠️  Could not generate coverage report"
    else
        # Try to extract coverage percentage
        coverage_line=$(echo "$coverage_output" | grep -E "All files|Statements" | tail -1)
        
        if [ -n "$coverage_line" ]; then
            echo "$coverage_line"
            
            # Extract percentage (rough parsing)
            coverage_pct=$(echo "$coverage_line" | grep -oP '\d+(\.\d+)?%' | head -1 | sed 's/%//')
            
            if [ -n "$coverage_pct" ]; then
                if (( $(echo "$coverage_pct < 70" | bc -l 2>/dev/null || echo "0") )); then
                    echo "Status: 🔴 Low coverage (target: > 80%)"
                elif (( $(echo "$coverage_pct < 80" | bc -l 2>/dev/null || echo "0") )); then
                    echo "Status: 🟡 Moderate coverage (target: > 80%)"
                else
                    echo "Status: 🟢 Good coverage"
                fi
            fi
        else
            echo "⚠️  Could not parse coverage data"
        fi
    fi
else
    echo "⚠️  No test script found in package.json"
fi
echo ""

# ======================================
# 6. COMPLEXITY INDICATORS
# ======================================
echo "🧩 COMPLEXITY INDICATORS"
echo "────────────────────────────────────"

# Count number of functions/methods (rough estimate)
function_count=$(grep -r "function\|=>" src/ 2>/dev/null | wc -l | tr -d ' ')
echo "Approximate function count: $function_count"

# Check for long functions (>50 lines between function definition and closing brace)
# This is a rough heuristic
long_functions=$(grep -n "function\|const.*=.*=>" src/**/*.{js,ts,svelte} 2>/dev/null | wc -l | tr -d ' ')
echo "Functions detected: $long_functions"

# Check for nested callbacks/promises (complexity smell)
deep_nesting=$(grep -r "\.then(.*\.then(.*\.then(" src/ 2>/dev/null | wc -l | tr -d ' ')
if [ "$deep_nesting" -gt 0 ]; then
    echo "⚠️  Deeply nested promises found: $deep_nesting (consider async/await)"
fi

echo ""

# ======================================
# FINAL SUMMARY
# ======================================
echo "======================================"
echo "    SUMMARY & RECOMMENDATIONS"
echo "======================================"
echo ""

# Calculate overall health score
issues=0
warnings=0

[ "$large_count" -gt 5 ] && ((issues++))
[ "$large_count" -gt 1 ] && [ "$large_count" -le 5 ] && ((warnings++))
[ "$deep_imports" -gt 10 ] && ((issues++))
[ "$deep_imports" -gt 0 ] && [ "$deep_imports" -le 10 ] && ((warnings++))

echo "Health Status:"
if [ "$issues" -gt 0 ]; then
    echo "  🔴 $issues critical issue(s) found - refactoring recommended"
elif [ "$warnings" -gt 0 ]; then
    echo "  🟡 $warnings warning(s) - monitor and plan improvements"
else
    echo "  🟢 Code quality is good - keep up the good work!"
fi

echo ""
echo "Next Steps:"
if [ "$large_count" -gt 1 ]; then
    echo "  • Split large files into smaller, focused modules"
fi
if [ "$deep_imports" -gt 0 ]; then
    echo "  • Configure import aliases to reduce coupling"
fi
if [ "$max_depth" -gt 5 ]; then
    echo "  • Consider flattening directory structure"
fi
if [ "$issues" -eq 0 ] && [ "$warnings" -eq 0 ]; then
    echo "  • Continue monitoring weekly"
    echo "  • Keep duplication below 5%"
fi

echo ""
echo "======================================"
echo "Report generated successfully"
echo "======================================"
