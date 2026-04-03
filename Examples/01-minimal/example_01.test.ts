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
          "dailyDecay": 10
        }
      ],
      "actions": [
        {
          "id": "walk",
          "name": "Walk 20m",
          "input": { "type": "button", "step": 1 },
          "effects": { "health": 12 },
          "groupIds": ["health"],
          "max": 0
        },
        {
          "id": "stretch",
          "name": "Stretch",
          "input": { "type": "checkbox" },
          "effects": { "health": 3 },
          "groupIds": ["health"],
          "max": 0
        }
      ],
      "groups": [{"id": "health", "name": "Health" }],
      "records": []
    };

    expect(conf).toMatchObject(expected);
  });
});
