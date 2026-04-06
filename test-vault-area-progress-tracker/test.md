# Area Progress Tracker — Manual Tests

This note is a **manual test script** for the Obsidian test vault.

## Expected use-case
1. Build plugin distributable
2. Copy into the test vault via `prepareTestRepo.ps1`
3. Open Obsidian using `test-vault-area-progress-tracker/`
4. Open this note (`test.md`)
5. Run through the sections below
6. Restore state (e.g. via git checkout/restore) when done

## Preconditions
- Plugin enabled: **Area Progress Tracker**
- Plugin setting **Data folder** is set to `ProgressTracker`
- The test data folder exists with:
  - `ProgressTracker/config.json`
  - `ProgressTracker/logs/apt.2026-03-01.json`, `apt.2026-03-02.json`, `apt.2026-03-03.json`

Notes:
- The code block name is `progress-tracker`.
- All score expectations below assume the shipped config:
  - Health: base 500, `dailyDecayAlways=1`, `dailyDecayUnattended=10`, `requiredActions.health = walk >= 1`, Walk +12, Junk food -15
  - Career: base 500, `dailyDecayAlways=0`, `dailyDecayUnattended=5`, no required-actions override, Deep work +5

---

## 1) Baseline rendering (3 existing days)

### Day 2026-03-01
**Actions to take**
- Scroll to the block below and confirm it renders (no error).

**Expect**
- Areas table shows:
  - Health: `daysSince=0`, `updatedScore=501`
    - Health reached `501` because the day starts at `489` (`500 - dailyDecayAlways 1 - dailyDecayUnattended 10`), then `walk +12`
  - Career: `daysSince=1`, `updatedScore=495`
- Actions show (at least):
	- Morning
		- Walk 20m
	- Work
		- Deep work (45m)
	- Evening
		- Walk 20m
		- Junk food
- Planning tabs are visible for the day and week, with no entries
- Actions and Plan areas have current tab highlighted

```progress-tracker
{ "date": "2026-03-01" }
```

### Day 2026-03-02 (decay day)
**Actions to take**
- Confirm the block renders.

**Expect**
- No actions are recorded on this day.
- Health shows only `dailyDecayAlways` here because 2026-03-01 met `requiredActions.health`.
- Career shows unattended decay because it was not touched on the prior day.
  - Health: `daysSince=1`, `updatedScore=500` (501 - 1 always decay)
  - Career: `daysSince=2`, `updatedScore=490` (495 - 5)
- Morning and Evening tabs show `(1)` for 1 required action
- `Walk 20m` is underlined under Morning and Evening

```progress-tracker
{ "date": "2026-03-02" }
```

### Day 2026-03-03 (career touched)
**Actions to take**
- Confirm the block renders.

**Expect**
- Deep work is already `2` for this day.
- Areas table shows:
  - Health: `daysSince=2`, `updatedScore=489` (`500 - 1 always - 10 unattended`)
  - Career: `daysSince=0`, `updatedScore=495` (starting `485`, then `+2x5`)

```progress-tracker
{ "date": "2026-03-03" }
```

---

## 2) Planning for a week and a day

Use **Day 2026-03-01** block below.

**Actions to take**
- In **Planning (day)**, set:
  - Walk 20m = `3`
  - Deep work (45m) = `4`
- In **Planning (week)**, set:
  - Walk 20m = `10`
  - Deep work (45m) = `10`

```progress-tracker
{ "date": "2026-03-01", "show": ["plan-day", "plan-week"] }
```

**Expect**
- In the **Areas** table below, the “Possible” columns update immediately:
  - Possible (day plan):
    - Health becomes `525` (day starting score `489` + planned `3x12 = 36`)
    - Career becomes `515` (day starting score `495` + planned `4x5 = 20`)
  - Possible (week plan):
    - Health becomes `602` (week-start score `489` + `10x12 = 120` - `7 x dailyDecayAlways = 7`)
    - Career becomes `545` (starting 495 + 10x5 = 50, and `7 x dailyDecayAlways = 0`)

Additional check:
- Weekly prediction does not subtract unattended decay here; it only applies the configured `dailyDecayAlways`, which is `1` for Health and `0` for Career in the shipped test config.

```progress-tracker
{ "date": "2026-03-01", "show": ["areas"] }
```

---


## 3) Updating an item (and forward recompute)

This verifies that changing one day recomputes that day and **all following existing day files**.

Use **Day 2026-03-01**, **2026-03-02**, and **2026-03-03** blocks below.

**Actions to take**
- In **Day 2026-03-01** Actions, press **Walk 20m +** once (Walk goes from 1 → 2).

```progress-tracker
{ "date": "2026-03-01", "show": ["actions"] }
```

**Expect**
- The **same day** scores update:
  - Day 2026-03-01 Health updated score becomes `513` (starting 489 + 2x12)

```progress-tracker
{ "date": "2026-03-01", "show": ["areas"] }
```

**Expect**
- The **next day** scores update (forward recompute):
  - Day 2026-03-02 Health updated score becomes `512`
  - Health has no decay because the updated 2026-03-01 state now meets `requiredActions.health`
  - `dailyDecayAlways=1` still applies, so the next day loses 1 point even though unattended decay is suppressed

```progress-tracker
{ "date": "2026-03-02", "show": ["areas"] }
```

**Expect**
- Forward propagation continues while the next day file exists:
  - Day 2026-03-03 Health updated score becomes `501` (`512 - 1 always - 10 unattended`)
  - Day 2026-03-03 Career remains `495` and `daysSince=0`

```progress-tracker
{ "date": "2026-03-03", "show": ["areas"] }
```

---

## 4) Adding a new day that does not yet have a file

This verifies that opening a new date creates its `logs/YYYY-MM-DD.json` file (seeded from the previous day when available).

### Day 2026-03-04 (should be missing at first)
**Actions to take**
- Confirm there is no file at `ProgressTracker/logs/apt.2026-03-04.json`.
- Scroll to the block below, edit the fence text, and confirm it renders.
- Re-check the file list for `ProgressTracker/logs/apt.2026-03-04.json`.

**Expect**
- The block renders (no “Missing daily log” error).
- A new log file appears at `ProgressTracker/logs/apt.2026-03-04.json`.
- If you completed section (3) first, the expected seeded/decayed values are:
  - Health: `daysSince=3`, `updatedScore=490` (from 2026-03-03 Health 501 - 1 always - 10 unattended)
  - Career: `daysSince=1`, `updatedScore=495` (no unattended decay from the prior day state, and `dailyDecayAlways=0`)

Additional check:
- The newly created day should continue to respect the split decay config names in `ProgressTracker/config.json`:
  - `dailyDecayAlways`
  - `dailyDecayUnattended`

```progress-tracker
{ "date": "2026-03-04" }
```

---

## 5) Showing Actions and Records in Multiple Groups

**Actions to take**
- Confirm there is a "Walk 20m" action under both "morning" and "evening".
- Add "+1" for "Walk 20m" under "morning".
- Add "-1" for "Walk 20m" under "evening".
- Repeat the "+1"/"-1" entries another time or two.
- Enter a "Weight" under "morning", and confirm it is visible under "evening".
- Change the "Weight" under "evening", and confirm it changes under "morning".

**Expect**
- The "Walk 20m" action appears under both tabs.
- Both "+1" and "-1" buttons from different tabs modify the day's score.
- The "+1"/"-1" cycle always returns to the same values at the end.
- Entering "Weight" in one tab makes its value change when viewing the other tab.

```progress-tracker
{ "date": "2026-03-03", "show": ["areas", "actions"] }
```

---
