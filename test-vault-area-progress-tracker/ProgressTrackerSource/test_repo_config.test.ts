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
          "dailyDecay": 10
        },
        {
          "id": "career",
          "name": "Career",
          "minScore": 0,
          "maxScore": 1000,
          "baseScore": 500,
          "dailyDecay": 5
        }
      ],
      "groups": [
        { "id": "morning", "name": "Morning" },
        { "id": "work", "name": "Work" },
        { "id": "evening", "name": "Evening" }
      ],
      "actions": [
        {
          "id": "walk",
          "name": "Walk 20m",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": 12 },
          "groupIds": ["morning", "evening"],
          "max": 0
        },
        {
          "id": "deep_work",
          "name": "Deep work (45m)",
          "input": { "type": "number", "min": 0, "step": 1 },
          "effects": { "career": 5 },
          "groupIds": ["work"],
          "max": 0
        },
        {
          "id": "junk_food",
          "name": "Junk food",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": -15 },
          "groupIds": ["evening"],
          "max": 0
        }
      ],
      "records": [
        {
          "id": "weight",
          "name": "Weight",
          "input": { "type": "number", "min": 50, "max": 400, "step": 0.1 },
          "groupIds": ["morning", "evening"]
        },
        {
          "id": "mood",
          "name": "Mood",
          "input": { "type": "text" },
          "groupIds": ["evening"]
        }
      ],
      "requiredActions":
      {
        "health": [{"action": "walk", "req": 1}]
      },
      "dailyPlan": { "actions": {} },
      "weeklyPlan": { "startDate": "2026-03-01", "actions": {} }
    };

    expect(conf).toMatchObject(expected);
  });
});
