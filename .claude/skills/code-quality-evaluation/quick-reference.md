# Quick Reference Guide

A one-page cheat sheet for code quality evaluation.

## 🎯 Evaluation in 5 Minutes

Run these checks when reviewing generated code:

```bash
# 1. File sizes (target: < 250 lines)
find src -name "*.js" -o -name "*.svelte" | xargs wc -l | sort -rn | head -5

# 2. Duplication (target: < 5%)
npx jscpd src/ --threshold 10

# 3. Deep imports (target: 0)
grep -r "from '\.\./\.\./\.\." src/ | wc -l

# 4. Test coverage (target: > 80%)
npm run test -- --coverage --silent | grep "All files"
```

---

## 📊 Decision Matrix

| Metric | 🔴 Bad | 🟡 Medium | 🟢 Good |
|--------|--------|-----------|---------|
| Files > 300L | > 5 | 2-4 | 0-1 |
| Deep imports | Present | < 5 | None |
| Duplication | > 10% | 5-10% | < 5% |
| Reusable components | < 50% | 50-70% | > 70% |
| UI/logic coupling | Strong | Medium | Weak |
| Test coverage | < 70% | 70-85% | > 85% |

**Action:**
- Majority 🟢 → Merge
- Majority 🟡 → Refactor (1-2h)
- Majority 🔴 → Must refactor before merge

---

## 🚩 Red Flags Checklist

Quick scan for common issues:

### Structure
- [ ] No files > 400 lines (🔴 critical)
- [ ] No files > 300 lines (🟡 warning)
- [ ] Directory depth ≤ 3 levels
- [ ] Clear separation: UI / Logic / State / Utils

### Modularity
- [ ] No business logic importing UI components
- [ ] No deep relative imports (`../../../`)
- [ ] Components are generic (not use-case specific)
- [ ] Each module has single responsibility

### DRY
- [ ] No identical code blocks in 3+ files
- [ ] Calculations are in shared utilities
- [ ] Validation logic is centralized
- [ ] No 70%+ similar components

### Tests
- [ ] No 5+ nearly identical test cases
- [ ] Tests focus on behavior, not implementation
- [ ] Critical edge cases are tested
- [ ] Business logic coverage > 80%

---

## 🔧 Common Refactoring Patterns

### Pattern 1: Split Large File

```javascript
// BEFORE: big-file.js (800 lines)
export class BigClass {
    methodA() { /* 200 lines */ }
    methodB() { /* 200 lines */ }
    methodC() { /* 200 lines */ }
    methodD() { /* 200 lines */ }
}

// AFTER: Modular structure
// main.js (100 lines - orchestration)
import { ModuleA } from './module-a';
import { ModuleB } from './module-b';
import { ModuleC } from './module-c';
import { ModuleD } from './module-d';

export class Main {
    constructor() {
        this.a = new ModuleA();
        this.b = new ModuleB();
        this.c = new ModuleC();
        this.d = new ModuleD();
    }
}
```

### Pattern 2: Extract Duplication

```javascript
// BEFORE: Duplicated in 3 files
const score = value * 0.5 + other * 0.3 + third * 0.2;

// AFTER: Shared utility
// utils/scoring.js
export const calculateWeighted = (values, weights = [0.5, 0.3, 0.2]) =>
    values.reduce((sum, val, i) => sum + val * weights[i], 0);

// Usage
import { calculateWeighted } from '$utils/scoring';
const score = calculateWeighted([value, other, third]);
```

### Pattern 3: Decouple UI from Logic

```javascript
// BEFORE: Logic manipulates UI
import Dashboard from './Dashboard.svelte';
function update() {
    Dashboard.refresh();
}

// AFTER: Logic updates store
import { dataStore } from './stores';
function update() {
    dataStore.set(newData);
}

// Dashboard.svelte subscribes to store
```

### Pattern 4: Consolidate Tests

```javascript
// BEFORE: 10 similar tests (250 lines)
test('case 1', () => { /* test */ });
test('case 2', () => { /* test */ });
// ... 8 more

// AFTER: Parameterized test (40 lines)
test.each([
    ['case1', input1, expected1],
    ['case2', input2, expected2],
    // ... more cases
])('%s returns %s', (name, input, expected) => {
    expect(fn(input)).toBe(expected);
});
```

### Pattern 5: Unify Similar Components

```javascript
// BEFORE: 2 components (350 lines total)
<ESPCard.svelte>    // 180 lines
<DestCard.svelte>   // 170 lines

// AFTER: 1 unified component (200 lines)
<PlayerCard.svelte role={esp|destination}>
```

---

## 💡 Quick Tips

### For Better Structure
- **One file = one responsibility**
- **Max 250 lines** per file
- **Max 3 levels** deep directory
- **Use import aliases** (`$lib/...`)

### For Better Modularity
- **UI never imports logic**, only stores
- **Logic never imports UI**
- **Services injected**, not imported directly
- **Components generic**, not use-case specific

### For Better DRY
- **3+ occurrences?** Extract to function
- **Similar components?** Add variant prop
- **Repeated validation?** Centralize validator
- **Magic numbers?** Define constants

### For Better Tests
- **Similar tests?** Use `test.each()`
- **Test behavior**, not implementation
- **Mock dependencies**, not internals
- **Cover edge cases**, not just happy path

---

## 🎬 Common Commands

```bash
# Check file sizes
find src -name "*.js" -o -name "*.svelte" | \
    xargs wc -l | \
    awk '$1 > 250 {print $2 " (" $1 " lines)"}'

# Find duplication
npx jscpd src/ --format markdown -o duplication.md

# Find deep imports
grep -r "from '\.\./\.\./\.\." src/ | wc -l

# Check test coverage
npm run test -- --coverage

# Run full quality check
./check-quality.sh quality-report.txt
```

---

## 📝 Code Review Questions

Ask these when reviewing generated code:

### Understanding
- Can I find where to add new functionality in < 2 minutes?
- Do file/folder names clearly indicate their purpose?
- Is the code self-documenting?

### Maintenance
- If I need to change X, how many files must I touch?
- Are there any "god files" that do too much?
- Is the same logic repeated in multiple places?

### Testing
- Can I test this module in isolation?
- Are tests readable by non-developers?
- Do tests give confidence without being brittle?

### Future-Proofing
- Will this be easy to understand in 6 months?
- Can new developers contribute without confusion?
- Is the architecture flexible for changes?

---

## 🎯 Target Metrics Summary

| Metric | Target |
|--------|--------|
| **File Size** | < 250 lines |
| **Directory Depth** | ≤ 3 levels |
| **Code Duplication** | < 5% |
| **Deep Imports** | 0 |
| **Reusable Components** | > 70% |
| **Test Coverage (business logic)** | > 80% |
| **Branch Coverage** | > 70% |
| **Function Coverage** | > 85% |

---

## 🚀 When to Use This Skill

### ✅ Always Use For
- After generating a new module/feature
- Before merging a pull request
- During code review sessions
- When code feels "hard to work with"
- Monthly code health check

### ⚠️ Optional For
- Hotfixes (review later)
- Spike/prototype code
- Code destined for deletion
- One-off scripts

### ❌ Don't Use For
- Linting issues (use ESLint)
- Formatting issues (use Prettier)
- Security scans (use other tools)
- Performance profiling

---

## 📚 Related Skills

- **Testing Skills**: For ATDD test generation
- **Architecture Skills**: For system design decisions
- **Performance Skills**: For optimization work

---

## 🆘 Emergency Refactoring

If code quality is critical (🔴 🔴 🔴):

### Hour 1: Split Large Files
- Identify largest files
- Extract logical modules
- Update imports

### Hour 2: Eliminate Duplication
- Run `jscpd` to find duplicates
- Extract to shared utilities
- Replace all occurrences

### Hour 3: Decouple & Test
- Remove UI/logic coupling
- Add missing tests
- Verify coverage > 80%

**Result**: Code ready to merge

---

## 📖 Further Reading

- See `SKILL.md` for complete guide
- See `examples.md` for detailed examples
- See `README.md` for installation/usage
- Run `check-quality.sh` for automated checks

---

**Remember**: Perfect code doesn't exist. Aim for "easy to change safely" not "perfect score".