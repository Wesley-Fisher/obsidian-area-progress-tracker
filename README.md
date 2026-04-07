
# Area Progress Tracker

[![CI](https://github.com/Wesley-Fisher/obsidian-area-progress-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Wesley-Fisher/obsidian-area-progress-tracker/actions/workflows/ci.yml)

(Linting currently excluded from CI)

An Obsidian plugin I created to track and motivate actions that contribute to areas in life.

Main Features:
* System is defined, and data is stored, in `json` files. The folder for these is set in Obsidian plugin settings for this plugin.
* Interactions with plugin are rendered with three-backtick blocks titled with `progress-tracker`.
* User-defined sets of Areas and Actions.
* Progress tracked as a score, which can:
  * Increase when actions are taken/logged.
  * Decay over time if it does not receive attention.
* 'Plan' abilities to show what score increases may be possible for a given day and week.


# Plugin Development (AI Use Disclaimer)

## AI Use

This plugin was developed heavily using the assistance of AI. I hope to be able to revisit all of its elements personally over time, but cannot guarantee it. Caution should be taken to not over-trust the app or its functions (including tests).

## Testing

I have tried to achieve a high coverage of automated tests. The majority of untested branches appear to be inline "extra null/undefined" checks that are probably not needed due to type definitions, but I do not want to remove.

Current testing includes:
* In-memory automated tests (`src/tests`)
* Built-in Obsidian test vault for manual testing `test-vault-area-progress-tracker`

Future testing may include:
* Automated testing with file modifications

# Code Explanation

The `README` file within the `src` directory explains the overall code layout, and some key entrypoints.

# How to Use

## Installing the Plugin

* Decide on a folder location in your vault to hold the configuration and data files. (Default is `ProgressTracker`.) Obsidian doesn't appear to show JSON files inside its vault by default, but other text editors can be used (or possibly other plugins).
* Create this folder
* TODO: instructions to install base plugin
* Modify the plugin settings to point to the folder decided on
* Create any block to begin rendering the plugin. This will trigger the first files to be created.
* Set up the system as desired.

The plugin can be activated using this example block:

```progress-tracker
{ "date": "2026-01-01" }
```

Note: this will generate a daily log file for 2026-01-01, which can be manually deleted later.

Also created/used in the data folder:
* `config.json` (system definition)
* `plans.day.json` and `plans.week.json` (planning targets)
* `logs/apt.YYYY-MM-DD.json` (daily logs)

## System Setup

Setting up the system will require editing JSON files in the current version.

There are example configs in the `Examples` folder in this repository.

A blank file generated from a newly-installed plugin will look like:

```
{
  "version": 1,
  "areas": [],
  "groups": [],
  "actions": [],
  "records": []
}
```

### Areas Setup

Areas are intended to be the big-picture items to be tracked in the system. Areas have a score, and actions contribute towards this score. Areas may be any of:
* Large life areas, such as "Health"
* Smaller areas that are important enough to want to track, such as "Climbing".
* Specific goals that you want some tracking or extra motivation for.

Areas are set up as a list of JSON objects such as below:

```
...
  "areas": [
    {
      "id": "health",
      "name": "Health",
      "minScore": 0,
      "maxScore": 1000,
      "baseScore": 500,
      "dailyDecayAlways": 1,
      "dailyDecayUnattended": 10
    },
    {
      "id": "career",
      "name": "Career",
      "minScore": 0,
      "maxScore": 1000,
      "baseScore": 500,
      "dailyDecayAlways": 0,
      "dailyDecayUnattended": 5
    }
    ...
  ],
...
```

The elements needed for each Area are:
* `id`: a short bit of text. This next needs to be re-used to reference the area (ex: when setting an action to affect a specific areas).
* `name`: the name that will be shown when the plugin renders.
* `minScore`: a minimum score.
* `maxScore`: a maximum score.
* `baseScore`: the starting score for the first time an area is used in the system.
* `dailyDecayAlways`: a score loss that is applied every day when moving the area forward to the next day. This is required, and may be set to `0`.
* `dailyDecayUnattended`: an additional score loss that applies when the area does not receive enough attention for the day.


### Groups Setup

Groups appear as named tabs that will be shown in the rendered plugin. They can be used to see sets of activities more effectively. Groups may be useful to separate activities by:
* Time of day (Ex: morning activities).
* Type of activity (Ex: work vs exercise).
* Other context (Ex: weekends).

Groups are set up as a list of JSON objects as below:

```
...
  "groups": [
    { "id": "morning", "name": "Morning" },
    { "id": "work", "name": "Work" },
    { "id": "evening", "name": "Evening" }
  ],
...
```

The elements needed for each Group are:
* `id`: a short bit of text. This next needs to be re-used to reference the group (ex: when setting an action to be included under a group).
* `name`: the text that will be shown for the group.

### Actions Setup

Actions are the specific actions that can be taken. These will have points effects on Areas. Actions can include negative points as well.

Actions are set up as a list of JSON elements as below:

```
...
"actions": [
    {
      "id": "walk",
      "name": "Walk 20m",
      "input": { "type": "button", "step": 1 },
      "effects": { "health": 12 },
      "groupIds": ["morning", "afternoon"]
    },
    {
      "id": "junk_food",
      "name": "Junk food",
      "input": { "type": "button", "step": 1 },
      "effects": { "health": -15, "finances": -5 },
      "groupIds": ["evening"]
    },
    ...
]
...
```

The elements needed for each Action are:
* `id`: a short bit of text. This next needs to be re-used to reference the Action (ex: when setting an action to be required to not drop the score for a day).
* `name`: the text that will be shown for the action
* `input`: the type of input
  * `"button"` will show a "+" and a "-" button. Each one will apply the `"step"` value (usually 1) of the action each time it is clicked.
  * `"number"` will show a numeric input box (typing). This is useful for things like "minutes", "pages", or "reps".
* `effects`: an object of effects the action will have on each Area. An action can affect multiple areas (Ex: a "Walking Meeting" action may be a +5 to Health, and a +2 to Work)
  * Within the `effects` object, there must be key/value pairs (see the "Junk Food" entry).
  * The keys must match the `id` field of the created Area (the "finances" area is not shown in these examples).
  * The numbers are the effect on the Area's score.
* `groupIds`: A list of Group tabs to show the action under. Each entry should match an `id` of a configured Group.
* `max`: (optional) a per-day cap on how many times an action can be recorded.

### Records Setup

Records are simple recordings to be added to each day. They have no effect on scores. This might be useful to track some values outside of this plugin.

Records are set up as a list of JSON elements as below:

```
...
"records": [
    {
      "id": "weight",
      "name": "Weight",
      "input": { "type": "number", "min": 50, "max": 400, "step": 0.1 },
      "groupId": "morning"
    },
    ...
]
...
```

The elements needed for each Record are:
* `id`: a short bit of text. This next needs to be re-used to reference the Record.
* `name`: the text to be shown.
* `input`: the type of input
  * `"text"` for a text entry
  * `"number"` for a numeric entry (can include `min`/`max`/`step`)
* `groupId`: (optional) the Group tab to show the record under. If provided, it should match the `id` of a configured Group.


### RequiredActions Setup

`requiredActions` is optional, and can be set for one or more Areas.



RequiredActions for an Area, defines Action totals that must be met to prevent that Area's `dailyDecayUnattended` from applying into the next day.

`dailyDecayAlways` still applies every day regardless of whether requirements were met.

Example:

```
"requiredActions": {
  "health": [
    { "action": "walk", "req": 1 },
    { "action": "stretch", "req": 1 }
  ]
}
```

The elements needed for each RequiredActions entry are:
* A key value that matches the `id` of an Area
* A list of required Actions

The items in the list of required actions must include:
* `action`: this must match the `id` of the Action.
* `req`: this is the count required each day.

### Quick Help: What needs to Match What

Actions:
* the keys in the `effects` list must match the `id` of Areas
* The `groupIds` entries must match an `id` of a Group

Records:
* The `groupId` (if used) must match an `id` of a Group

RequiredActions
* The keys must each match the `id` of an Area
* The `action` of an entry must match the `id` of an Action


# Development

## Stack

* Javascript/Typescript
* Code organization defined in `src` folder's README
* QA:
    * Automated Testing: vitest
    * Linting: eslint
