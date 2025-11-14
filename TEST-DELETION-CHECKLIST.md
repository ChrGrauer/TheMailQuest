# Test Deletion Checklist

## Quick Reference: What to Delete

| File | Current Lines | Lines to Delete | Keep | Reason |
|------|--------------|----------------|------|--------|
| `game-session-creation.spec.ts` | 241 | ~180 | Error handling only | Session creation is implicit in all tests |
| `game-start.spec.ts` | 162 | ~120 | Permission checks, validation | Game start is implicit in 9+ tests |
| `player-join.spec.ts` | 582 | ~300 | Error scenarios only | Player join is implicit in all multi-player tests |
| `us-2.1-esp-dashboard.spec.ts` | 1,225 | ~200 | Feature-specific tests | Remove setup/navigation validation |
| `us-2.5-destination-dashboard.spec.ts` | 854 | ~150 | Feature-specific tests | Remove duplicated patterns |
| `resource-allocation.spec.ts` | 475 | ~100 | Core allocation logic | Remove setup tests |
| **TOTAL** | **3,539** | **~1,050** | **~2,489** | **30% reduction in these files** |

---

## File 1: `game-session-creation.spec.ts`

### DELETE: Lines 22-41 ❌
**Test:** "should allow facilitator to create a session from the create page"
**Reason:** This exact flow is executed in **17 files** via `createTestSession()`:
```typescript
export async function createTestSession(page: Page): Promise<string> {
  await page.goto('/');
  await page.click("text=I'm a facilitator");
  await page.waitForURL('/create');
  await page.click('text=Create a Session');
  await page.waitForURL(/\/lobby\/.+/);
  const url = page.url();
  const roomCode = url.split('/lobby/')[1];
  return roomCode;
}
```

If this flow breaks, **17 tests immediately fail**. No need for dedicated test.

---

### DELETE: Lines 43-95 ❌
**Test:** "should display room code with copy button in the lobby"
**Test:** "should copy room code to clipboard when copy button is clicked"
**Reason:**
- Room code visibility is checked every time a player joins (they need to see it)
- Copy functionality is UI convenience, not critical path
- If room code broken, ALL tests fail at `createTestSession()`

---

### DELETE: Lines 102-124 ❌
**Test:** "should allow direct navigation to lobby page with room code"
**Reason:**
- Every player who joins navigates to `/lobby/${roomCode}` via `addPlayer()`
- This is tested implicitly 50+ times
- Generic navigation behavior, not session-specific

---

### DELETE: Lines 162-189 ❌
**Test:** "should display waiting message when no players have joined"
**Test:** "should display ESP team slots in the lobby"
**Test:** "should display destination slots in the lobby"
**Reason:**
- Lobby display is tested in `player-join.spec.ts` where it's actually relevant
- Every test that adds players verifies slots are visible
- Duplicates with player selection tests

---

### KEEP: Lines 130-156 ✅
**Tests:** Error handling scenarios
- "should show error message if session creation fails"
- "should allow retry after session creation failure"

**Reason:** Error states are NOT tested elsewhere. These are the only places we verify graceful failure.

---

### KEEP: Lines 213-238 ✅
**Tests:** Accessibility
- "should have accessible room code display"
- "should have accessible copy button"

**Reason:** Accessibility-specific attributes might not be checked elsewhere.

**ACTION:** Consider moving these to a dedicated `accessibility.spec.ts` file.

---

## File 2: `game-start.spec.ts`

### DELETE: Lines 30-58 ❌
**Test:** "Given facilitator and player in lobby, Then only facilitator sees Start Game button"
**Reason:**
- Permission checks are important, but...
- This is a KEEP candidate if we consolidate into permission tests
- Consider: Move to dedicated `permissions.spec.ts` instead of deleting

**DECISION:** **KEEP** but move to consolidated permissions file.

---

### DELETE: Lines 64-90 ❌
**Test:** "Given different player configurations, Then Start Game button state should reflect minimum requirements"
**Reason:**
- Button state is checked in every test that starts a game
- `createSessionWithMinimumPlayers()` validates button becomes enabled
- This is edge case validation—but important

**DECISION:** **KEEP** this one—it tests minimum player validation, which is critical business logic.

---

### DELETE: Lines 96-134 ❌
**Test:** "Given minimum players present, When facilitator clicks Start Game, Then game starts and button disappears"
**Test:** "Given game has started, When checking the page, Then Start Game button should not be visible"
**Reason:**
- This exact sequence happens in 9 different test files:
  - `createGameInPlanningPhase()` (most common)
  - `createGameWithDestinationPlayer()`
  - `createGameWith2ESPTeams()`
  - etc.
- If start button doesn't work, 9+ tests immediately fail

---

### DELETE: Lines 140-160 ❌
**Test:** "Start Game button should have proper accessibility attributes"
**Reason:** Move to dedicated accessibility test file if keeping.

---

## File 3: `player-join.spec.ts` (BIGGEST OPPORTUNITY)

### DELETE: Lines 23-58 ❌
**Test:** "should redirect to lobby page and show role selection when valid room code is entered"
**Reason:**
- This is literally what `addPlayer()` does on lines 27-42 of `game-setup.ts`
- Called 50+ times across test suite
- Every successful join test validates this flow

---

### DELETE: Lines 144-164 ❌
**Test:** "should display 5 ESP team slots and 3 Destination slots"
**Reason:**
- Lobby UI display
- Not specific to joining flow
- Already tested in session creation

---

### DELETE: Lines 217-244 ❌
**Test:** "should allow player to join as ESP team with display name"
**Reason:**
- This is **exactly** what `addPlayer()` does
- If this breaks, every test with `addPlayer()` breaks
- Redundant with 50+ implicit tests

---

### DELETE: Lines 247-275 ❌
**Test:** "should allow player to join as Destination with display name"
**Reason:** Same as above—redundant with `addPlayer()` helper.

---

### DELETE: Lines 374-420 ❌
**Test:** "should update all connected players when a new player joins"
**Reason:**
- WebSocket sync should be in dedicated file
- This is generic WebSocket behavior, not join-specific
- Move to `websocket-sync.spec.ts` if keeping

---

### DELETE: Lines 422-453 ❌
**Test:** "should show updated player counts as players join"
**Reason:**
- Player counts are checked in many tests implicitly
- Part of WebSocket sync pattern
- Generic lobby behavior

---

### KEEP: Lines 60-138 ✅
**Tests:** Error scenarios
- "should show error message for non-existent room code"
- "should show format error for too short room code"
- "should show format error for various invalid formats"

**Reason:** These are error cases that are NOT tested elsewhere.

---

### KEEP: Lines 166-211 ✅
**Test:** "should show occupied slots as unavailable and remaining slots as available"
**Reason:** Tests slot occupancy logic—important edge case.

---

### KEEP: Lines 277-300 ✅
**Test:** "should show validation error when display name is empty"
**Reason:** Error case not tested elsewhere.

---

### KEEP: Lines 306-368 ✅
**Tests:** Cannot select occupied slots
**Reason:** Edge cases that test business logic.

---

### KEEP: Lines 459-515 ✅
**Test:** "should show 'session is full' message when trying to join full lobby"
**Reason:** Critical edge case—session capacity validation.

---

### KEEP: Lines 520-580 ✅
**Tests:** Accessibility and error UI
**Reason:** Specific validation of error handling and accessibility.

---

## File 4: `us-2.1-esp-dashboard.spec.ts`

### DELETE: Lines 45-65 ❌
**Test:** "Scenario: Budget is displayed prominently"
**Reason:**
- Budget display is checked in 6+ other tests
- If budget doesn't display, all dashboard tests fail
- Not dashboard-specific—generic UI element

---

### Pattern to Delete Throughout File
Look for tests that verify:
- ❌ "Dashboard loads successfully"
- ❌ "Elements are visible on page load"
- ❌ "Navigation to dashboard works"
- ❌ "WebSocket connection establishes"

Keep tests that verify:
- ✅ Budget **calculations** (not just display)
- ✅ Reputation gauge **values** (not just presence)
- ✅ Dashboard-specific **interactions**
- ✅ ESP-specific **business logic**

**Estimated deletion:** ~200 lines of setup validation

---

## File 5: `us-2.5-destination-dashboard.spec.ts`

### DELETE: Similar patterns to ESP dashboard
- ❌ "should display destination name"
- ❌ "should load initial dashboard state"
- ❌ "should show filtering policies"
- ❌ Generic WebSocket sync tests

### KEEP:
- ✅ Destination-specific calculations
- ✅ Filtering policy logic
- ✅ Destination-specific interactions

**Estimated deletion:** ~150 lines

---

## File 6: `resource-allocation.spec.ts`

### DELETE: Lines showing setup testing
- ❌ Any test that re-validates player joining
- ❌ Any test that re-validates game starting
- ❌ Generic WebSocket sync checks

### KEEP:
- ✅ Resource allocation logic
- ✅ Limit enforcement
- ✅ Multi-team resource conflicts

**Estimated deletion:** ~100 lines

---

## Implementation Order

### Week 1: Low-Risk Deletions
1. `game-session-creation.spec.ts` - Delete happy path tests (keep errors)
2. `game-start.spec.ts` - Delete successful start tests (keep validation)
3. Run test suite - verify still passing

**Risk:** Low (deleting obviously redundant tests)
**Reward:** ~300 lines removed, faster tests

---

### Week 2: High-Value Deletions
1. `player-join.spec.ts` - Delete happy path (keep errors)
2. Run test suite - verify edge cases still covered

**Risk:** Medium (large file, many deletions)
**Reward:** ~300 lines removed

---

### Week 3: Feature Test Cleanup
1. `us-2.1-esp-dashboard.spec.ts` - Remove setup validation
2. `us-2.5-destination-dashboard.spec.ts` - Remove setup validation
3. `resource-allocation.spec.ts` - Remove setup validation

**Risk:** Medium (requires careful review)
**Reward:** ~450 lines removed

---

### Week 4: Consolidation
1. Create `websocket-sync.spec.ts` with comprehensive tests
2. Remove WebSocket tests from individual files
3. Create `accessibility.spec.ts` if desired

**Risk:** Medium (moving tests, not deleting)
**Reward:** Better organization

---

## Validation Checklist

After each deletion phase:

- [ ] Run full test suite: `npm test`
- [ ] Check test coverage: `npm run test:coverage`
- [ ] Verify coverage delta: Should be ≤1% decrease (ideally 0%)
- [ ] Review failing tests: None should fail due to deletions
- [ ] Run E2E suite: `npm run test:e2e`
- [ ] Check test execution time: Should decrease
- [ ] Review test output: Should be clearer

---

## Success Criteria

- ✅ Remove 1,000+ lines of redundant tests
- ✅ Maintain >95% code coverage
- ✅ Reduce test execution time by 10-20%
- ✅ Zero functionality regressions
- ✅ Clearer test failure messages
- ✅ Easier onboarding for new developers

---

## Rollback Plan

If deletions cause issues:

1. **Git is your friend:** Each deletion phase = 1 commit
2. **Revert specific commits:** `git revert <commit-hash>`
3. **Cherry-pick kept tests:** `git cherry-pick <commit-hash>`
4. **No panic:** All code is in version control

---

## Questions?

**Q: What if deleting a test reveals a bug?**
A: GREAT! That means the test was doing something valuable. Add it back or add equivalent coverage.

**Q: Should we delete ALL happy path tests?**
A: No—keep ONE happy path test per major workflow for documentation. Delete DUPLICATES.

**Q: What about test coverage metrics?**
A: Coverage should stay the same. We're removing **explicit** tests, but **implicit** coverage remains via helpers.

**Q: How do we know we haven't deleted something important?**
A:
1. Review this checklist carefully
2. Delete in small batches
3. Run full suite after each batch
4. Check that deleted tests were truly redundant

---

## Final Note

**The goal is NOT to delete as many tests as possible.**

**The goal is to remove REDUNDANT tests while maintaining complete coverage.**

Every deletion should be justified by:
1. ✅ Same behavior tested elsewhere (implicitly or explicitly)
2. ✅ Helper functions provide equivalent coverage
3. ✅ No unique edge case being tested
4. ✅ No unique error condition being validated

When in doubt, KEEP the test.
