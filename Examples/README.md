# Examples

This folder contains small, copy/paste-ready example configurations for Area Progress Tracker.

## How to use an example

1. Pick one of the subfolders below.
2. Copy `config.json` into your vault data folder (defaults to `ProgressTracker/config.json`).
3. (Optional) Copy the matching `plans.day.json` and `plans.week.json` into your data folder.
4. Open a note with a `progress-tracker` block and refresh/re-open the note.

Note: If you already have an existing setup, you probably want to merge selectively instead of overwriting.

## Examples included

### 00-minimal

A tiny setup with:
- 1 area
- 2 actions (button + checkbox)
- no groups, no records

### 01-groups-and-records

Shows:
- `groups` + `groupId` usage (good with `activitiesLayout: "tabs"`)
- a numeric `record` (does not affect scores)
- a mix of action input types

### 02-requiredActions-decay

Shows:
- `requiredActions` for a specific area
- how decay suppression is determined by meeting requirements

### 03-number-actions

Shows:
- a `number`-input action (typed numeric input)
- interaction between `input.max` and per-action `max` (the effective cap is the lower of the two)
