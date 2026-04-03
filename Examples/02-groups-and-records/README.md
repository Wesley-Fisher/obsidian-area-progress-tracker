# 01-groups-and-records

Demonstrates grouping actions/records into UI groups and adding record inputs.

- Groups: `morning`, `evening`
- Areas: `health`, `career`
- Actions:
  - `walk` (button) → health
  - `deep_work` (number) → career
  - `junk_food` (button, negative effect) → health
- Records:
  - `weight` (number record) — does not affect scores

Recommended block config for this example:

```progress-tracker
{ "date": "2026-01-01", "activitiesLayout": "tabs" }
```
