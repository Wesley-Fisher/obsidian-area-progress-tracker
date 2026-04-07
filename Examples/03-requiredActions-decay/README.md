# 02-requiredActions-decay

Demonstrates `requiredActions`.

- `health.dailyDecayAlways` still applies every day when moving to the next day.
- If `requiredActions.health` is configured and non-empty, the plugin uses it to decide whether `health.dailyDecayUnattended` also applies into the next day.
- In this example, `health` only avoids the unattended decay if both:
  - `walk >= 1`
  - `stretch >= 1`

Try it by creating consecutive days with/without meeting the requirements.
