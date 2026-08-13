import { describe, expect, it } from "vitest";

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { SystemConfig } from "../../src/core/types";
import { checkConfiguration } from "../../src/core/checkConfiguration";

describe("Examples/04-number-actions", () => {
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
          "id": "career",
          "name": "Career",
          "minScore": 0,
          "maxScore": 1000,
          "baseScore": 500,
          "dailyDecayAlways": 0,
          "dailyDecayUnattended": 6
        }
      ],
      "actions": [
        {
          "id": "deep_work_minutes",
          "name": "Deep work (minutes)",
          "input": { "type": "number", "min": 0, "max": 240, "step": 15 },
          "effects": { "career": 0.25 },
          "max": 180,
          "placements": [{ "groupId": "career", "columnId": "main" }]
        },
        {
          "id": "admin_tasks",
          "name": "Admin tasks (count)",
          "input": { "type": "button", "step": 1 },
          "effects": { "career": 1 },
          "placements": [{ "groupId": "career", "columnId": "main" }],
          "max": 0
        }
      ],
      "groups": [{ "id": "career", "name": "Career", "columns": [{ "id": "main", "name": "Activities" }] }],
      "records": [],
      "requiredActions": {},
      "dailyPlan": { "actions": {} },
      "weeklyPlan": { "actions": {} },
      "stats": {
        "entries": [
          { "id": "deep-work-minutes-total", "name": "Deep work minutes", "statNames": ["deep_work_minutes"], "display": ["total", "average", "range"] },
          { "id": "admin-tasks-total", "name": "Admin tasks", "statNames": ["admin_tasks"], "display": ["total", "count"] }
        ]
      },
    };

    expect(conf).toMatchObject(expected);
  });
});
