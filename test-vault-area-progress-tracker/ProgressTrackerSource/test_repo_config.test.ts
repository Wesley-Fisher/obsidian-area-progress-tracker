import { describe, expect, it } from "vitest";

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { SystemConfig } from "../../src/core/types";
import { checkConfiguration } from "../../src/core/checkConfiguration";

describe("test-repo-config", () => {
  it("has a valid config.json", async () => {
    const exampleFolderPath = path.dirname(fileURLToPath(import.meta.url));

    const raw = await fs.readFile(path.join(exampleFolderPath, "config.json"), { encoding: "utf-8" });
    const conf = JSON.parse(raw) as SystemConfig;

    const issues = checkConfiguration(conf);
    expect(issues).toEqual([]);

    const expected: SystemConfig = {
      "version": 1,
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
      ],
      "groups": [
        { "id": "routine", "name": "Routine", "columns": [{ "id": "morning", "name": "Morning" }, { "id": "evening", "name": "Evening" }] },
        { "id": "work", "name": "Work", "columns": [{ "id": "main", "name": "Work" }] }
      ],
      "actions": [
        {
          "id": "walk",
          "name": "Walk 20m",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": 12 },
          "placements": [{ "groupId": "routine", "columnId": "morning" }, { "groupId": "routine", "columnId": "evening" }],
          "max": 0
        },
        {
          "id": "stretch",
          "name": "Stretch",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": 0 },
          "placements": [{ "groupId": "routine", "columnId": "morning" }, { "groupId": "routine", "columnId": "evening" }],
          "max": 0
        },
        {
          "id": "deep_work",
          "name": "Deep work (45m)",
          "input": { "type": "number", "min": 0, "step": 1 },
          "effects": { "career": 5 },
          "placements": [{ "groupId": "work", "columnId": "main" }],
          "max": 0
        },
        {
          "id": "junk_food",
          "name": "Junk food",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": -15 },
          "placements": [{ "groupId": "routine", "columnId": "evening" }],
          "max": 0
        }
      ],
      "records": [
        {
          "id": "weight",
          "name": "Weight",
          "input": { "type": "number", "min": 50, "max": 400, "step": 0.1 },
          "placements": [{ "groupId": "routine", "columnId": "morning" }, { "groupId": "routine", "columnId": "evening" }]
        },
        {
          "id": "mood",
          "name": "Mood",
          "input": { "type": "text" },
          "placements": [{ "groupId": "routine", "columnId": "evening" }]
        }
      ],
      "requiredActions":
      {
        "health": [{"action": "walk", "req": 1}]
      },
      "dailyPlan": { "actions": {} },
      "weeklyPlan": { "actions": {} },
      "stats": {
        "entries": [
          { "id": "walk-total", "name": "Walk", "statNames": ["walk"], "display": ["total", "average", "count", "range"] },
          { "id": "exercise", "name": "Exercise", "statNames": ["walk", "stretch"], "display": ["total", "average", "count", "range"] },
          { "id": "weight-total", "name": "Weight", "statNames": ["weight"], "display": ["total", "average", "count", "range"] }
        ]
      }
    };

    expect(conf).toMatchObject(expected);
  });
});
