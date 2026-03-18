# 02-requiredActions-decay

Demonstrates `requiredActions`.

- If `requiredActions.health` is configured and non-empty, the plugin uses it to decide whether the `health` area should decay into the next day.
- In this example, `health` only avoids tomorrow’s decay if both:
  - `walk >= 1`
  - `stretch >= 1`

Try it by creating consecutive days with/without meeting the requirements.
