# Area Progress Tracker — Manual Tests

This note is a **manual test sandbox** for the Obsidian test vault.

## Expected use-case
1. Automated tests run and passing in main repo
2. Build plugin distributable
3. Copy into the test vault via `prepareTestRepo.ps1`
4. Open Obsidian using `test-vault-area-progress-tracker/`
5. Open this note (`test.md`)
6. Test plugin as desired

## Preconditions
- Plugin enabled: **Area Progress Tracker**
- Plugin setting **Data folder** is set to `ProgressTracker`
- The test data folder exists with:
  - `ProgressTracker/config.json`
  - `ProgressTracker/logs/apt.2026-03-01.json`, `apt.2026-03-02.json`, `apt.2026-03-03.json`


---

```progress-tracker
{ "date": "2026-02-28" }
```

---

```progress-tracker
{ "date": "2026-03-01" }
```

---

```progress-tracker
{ "date": "2026-03-02" }
```

---

```progress-tracker
{ "date": "2026-03-03" }
```

---

```progress-tracker-norender
{ "date": "2026-03-04" }
```
