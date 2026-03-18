
# Files And Triggers Used

* Settings: plugin settings
* JSON Files: config for system, and stored data for each day
  * `config.json`: definition for how to behave
  * `plans.day.json`: holds planned actions for the day (1 file re-used for all days)
  * `plans.week.json`: holds planned actions for the week (1 file re-used for all weeks)
  * `(daily json file)`: holds day's starting state, updates during day, and final state of the day
* `progress-tracker` code block: triggers rendering UI

# General Workflow

1. Plugin is initialized and registers handlers
2. User opens a file containing `progress-tracker` block
3. Settings and `json` files are read or initialized
4. The state of the system is transformed into render-able types
5. The user interacts with the rendered buttons or other inputs
6. A callback is triggered to begin processing for generic 'events'
7. The type of event is determined, and handled properly
8. Handling may involve re-writing contents of one or more `json` files
9. A refresh of rendered blocks is triggered

# Code Organization

## Obsidian Plugin Aspects

This code is stored in the `plugin` folder.

`main.ts`
* Initializes the plugin

`settings.ts`
* Manages the settings of the plugin

`plugin.ts`
* Does registration for events and connects the plugin behavior to Obsidian
* Registers code block processor to activate and render on `progress-tracker` code blocks
* Injects handling callback into rendering, to activate processing
* Manages refresh of one or more code blocks in the current file, to update on user actions


## Vault Abstraction

Elements of code are used to abstract away interactions with the Obsidian vault, and allow for automated testing. These are in `core/vault`.

`storage.ts`
* Exports the `VaultLike` interface used for some of these abstractions.
* `VaultLike` is used to ultimately make `read` and `write` calls.

`obsidianAdapter.ts`
* Exports an instance of `VaultLike` tied to a true Obsidian vault.

`tests/memoryVault.ts`
* Exposes an instance of `VaultLike` that stores files and file contents in memory.

`repo.ts`
* Abstracts access to the specific files used in this plugin.


## Rendering

`renderBlock.ts`
* Contains `onRenderProgressTrackerBlock` as the entry point for all rendering
* Calls translation of system data to render-able data in `translateRenderBlock`
* Calls `renderProgressTrackerBody`

`core/render/translate`
* Transforms system configuration into a render-able configuration
* Reduces need for decision logic in rendering functions
* `translateRenderBlock.ts`: `translateRenderBlock()` is the entry point

`core/render/renderFromModel.ts`
* Entry point of post-translation rendering, in `renderProgressTrackerBody()`


## User Event Handling

`core/handleEvents/handleUserEvent.ts`
* Entry point of event handling, in `handleUserEvent()`

## Scoring and File Updating

`core/recomputeChain.ts`
* Functions to recompute state of days
* Updates any existing 'next' day continuously, so after-the-fact updates are carried through

`core/scoring.ts`
* Score calculations
