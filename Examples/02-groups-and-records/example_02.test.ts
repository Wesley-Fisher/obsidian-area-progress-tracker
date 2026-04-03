import { describe, expect, it } from "vitest";

import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";

import { SystemConfig } from "../../src/core/types";
import { checkConfiguration } from "../../src/core/checkConfiguration";

describe("Examples/01-minimal", () => {
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
          "dailyDecay": 8
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
        { "id": "evening", "name": "Evening" }
      ],
      "actions": [
        {
          "id": "walk",
          "name": "Walk 20m",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": 12 },
          "groupIds": ["morning"],
          "max": 0
        },
        {
          "id": "deep_work",
          "name": "Deep work (minutes)",
          "input": { "type": "number", "min": 0, "max": 180, "step": 15 },
          "effects": { "career": 0.2 },
          "groupIds": ["morning"],
          "max": 0
        },
        {
          "id": "junk_food",
          "name": "Junk food",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": -15 },
          "groupIds": ["evening"],
          "max": 3
        }
      ],
      "records": [
        {
          "id": "weight",
          "name": "Weight",
          "input": { "type": "number", "min": 50, "max": 400, "step": 0.1 },
          "groupIds": ["morning"]
        },
        {
          "id": "note",
          "name": "Quick note",
          "input": { "type": "text" },
          "groupIds": ["evening"]
        }
      ]
    };

    expect(conf).toMatchObject(expected);
  });
});
