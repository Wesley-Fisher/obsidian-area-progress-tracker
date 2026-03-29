# Area Progress Tracker — Manual Tests

This note is a **manual test script** for the Obsidian test vault.

## Expected use-case
1. Build plugin distributable
2. Copy into the test vault via `deployToTestRepo.ps1`
3. Open Obsidian using `test-vault-area-progress-tracker/`
4. Open this note (`test.md`)
5. Run through the sections below
6. Restore state (e.g. via git checkout/restore) when done

## Preconditions
- Plugin enabled: **Area Progress Tracker**
- Plugin setting **Data folder** is set to `ProgressTrackerCopied`
- The test data folder exists with:
  - `ProgressTrackerCopied/config.json`
  - `ProgressTrackerCopied/plans.day.json`
  - `ProgressTrackerCopied/plans.week.json`
  - `ProgressTrackerCopied/logs/2026-03-01.json`, `2026-03-02.json`, `2026-03-03.json`

Notes:
- The code block name is `progress-tracker`.
- All score expectations below assume the shipped config:
  - Health: base 500, decay 10/day, Walk +12, Junk food -15
  - Career: base 500, decay 5/day, Deep work +5

---

## 1) Baseline rendering (3 existing days)

### Day 2026-03-01
**Actions to take**
- Scroll to the block below and confirm it renders (no error).

**Expect**
- Areas table shows:
  - Health: `daysSince=0`, `updatedScore=502`
  - Career: `daysSince=1`, `updatedScore=495`
- Actions show (at least): Walk 20m, Deep work (45m), Junk food
- Plan (day) and Plan (week) sections are visible
- Actions and Plan areas have current tab highlighted

```progress-tracker
{ "date": "2026-03-01" }
```

### Day 2026-03-02 (decay day)
**Actions to take**
- Confirm the block renders.

**Expect**
- No actions recorded, so decay applies from the prior day:
  - Health: `daysSince=1`, `updatedScore=492` (502 - 10)
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
  - Health: `daysSince=2`, `updatedScore=482`
  - Career: `daysSince=0`, `updatedScore=495` (decay then +10)

```progress-tracker
{ "date": "2026-03-03" }
```

---

## 2) Planning for a week and a day

Use **Day 2026-03-01** block below.

**Actions to take**
- In **Plan (day)**, set:
  - Walk 20m = `3`
  - Deep work (45m) = `4`
- In **Plan (week)**, set:
  - Walk 20m = `10`
  - Deep work (45m) = `10`

```progress-tracker
{ "date": "2026-03-01", "show": ["plan-day", "plan-week"] }
```

**Expect**
- In the **Areas** table below, the “Possible” columns update immediately:
  - Possible (day plan):
    - Health becomes `526` (current 502 + remaining(3-1)*12 = 24)
    - Career becomes `515` (current 495 + remaining(4-0)*5 = 20)
  - Possible (week plan):
    - Health becomes `622` (current 502 + 10*12 = 120)
    - Career becomes `545` (current 495 + 10*5 = 50)

```progress-tracker
{ "date": "2026-03-01", "show": ["areas"] }
```

---

## 3) Hiding planning sections

Use **Day 2026-03-01** block below.

**Actions to take**
- Click **Hide day plan**.
- Click **Hide week plan**.

**Expect**
- Both plan sections collapse and show a message:
  - “(Day plan hidden for this date)”
  - “(Week plan hidden for this date)”
- Each section’s button label flips to **Show day plan** / **Show week plan**.

```progress-tracker
{ "date": "2026-03-01", "show": ["plan-day", "plan-week"] }
```

**Repeat for showing each planning section**

---

## 4) Updating an item (and forward recompute)

This verifies that changing one day recomputes that day and **all following existing day files**.

Use **Day 2026-03-01**, **2026-03-02**, and **2026-03-03** blocks below.

**Actions to take**
- In **Day 2026-03-01** Actions, press **Walk 20m +** once (Walk goes from 1 → 2).

```progress-tracker
{ "date": "2026-03-01", "show": ["actions"] }
```

**Expect**
- The **same day** scores update:
  - Day 2026-03-01 Health updated score becomes `514` (starting 490 + 2x12)

```progress-tracker
{ "date": "2026-03-01", "show": ["areas"] }
```

**Expect**
- The **next day** scores update (forward recompute):
  - Day 2026-03-02 Health updated score stays `514` (no decay)

```progress-tracker
{ "date": "2026-03-02", "show": ["areas"] }
```

**Expect**
- Forward propagation continues while the next day file exists:
  - Day 2026-03-03 Health updated score becomes `504` (514 - 10)
  - Day 2026-03-03 Career remains `495` and `daysSince=0`

```progress-tracker
{ "date": "2026-03-03", "show": ["areas"] }
```

---

## 5) Adding a new day that does not yet have a file

This verifies that opening a new date creates its `logs/YYYY-MM-DD.json` file (seeded from the previous day when available).

### Day 2026-03-04 (should be missing at first)
**Actions to take**
- Confirm there is no file at `ProgressTrackerCopied/logs/2026-03-04.json`.
- Scroll to the block below, edit the fence text, and confirm it renders.
- Re-check the file list for `ProgressTrackerCopied/logs/2026-03-04.json`.

**Expect**
- The block renders (no “Missing daily log” error).
- A new log file appears at `ProgressTrackerCopied/logs/2026-03-04.json`.
- If you completed section (4) first, the expected seeded/decayed values are:
  - Health: `daysSince=3`, `updatedScore=494` (from 2026-03-03 Health 504 - 10)
  - Career: `daysSince=1`, `updatedScore=495` (no decay from last day yet)

```progress-tracker
{ "date": "2026-03-04" }
```

---

## 6) Allowing decay to happen (explicit check)

This is already demonstrated by the existing chain:
- 2026-03-02 has no actions, so decay applies.
- 2026-03-03 has no Health actions, so Health continues to decay.

**Actions to take**
- Compare Health updated score for consecutive days.

**Expect**
- Health decreases by `10` on any day with no Health-touching actions.
- Career decreases by `5` on any day with no Career-touching actions.

```progress-tracker
{ "date": "2026-03-01", "show": ["areas"] }
```

```progress-tracker
{ "date": "2026-03-02", "show": ["areas"] }
```

```progress-tracker
{ "date": "2026-03-03", "show": ["areas"] }
```

## 6) Showing Actions and Records in Multiple Groups

**Actions to take**
- Confirm there is a "Walk 20min" action under both "morning" and "evening".
- Add "+1" for "Walk 20 min" under "morning".
- Add "-1" for "Walk 20 min" under "evening".
- Repeat the "+1"/"-1" entries another time or two.
- Enter a "Weight" under "morning", and confirm it is visible under "evening".
- Change the "Weight" under "evening", and confirm it changes under "morning".

**Expect**
- The "Walk 20min" action appears under both tabs.
- Both "+1" and "-1" buttons from different tabs modify the day's score.
- The "+1"/"-1" cycle always returns to the same values at the end.
- Entering "Weight" in one tab makes it's value change when viewing the other tab.

```progress-tracker
{ "date": "2026-03-03", "show": ["areas", "actions"] }
```

---

## Cleanup / Restore
- Plans are stored in:
  - `ProgressTrackerCopied/plans.day.json`
  - `ProgressTrackerCopied/plans.week.json`
- Per-day UI hide flags are stored in:
  - `ProgressTrackerCopied/logs/YYYY-MM-DD.json` under `ui`
- Restore by reverting those JSON files back to the repo state.
