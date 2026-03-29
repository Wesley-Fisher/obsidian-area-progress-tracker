import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../core/types";
import { checkConfiguration } from "../../core/checkConfiguration";

describe("checkConfiguration", () => {
  it("returns no issues for a valid config", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [] }],
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
    };

    expect(checkConfiguration(config)).toEqual([]);
  });

  it("flags unknown area/action and invalid req values", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [] }],
      requiredActions: {
        career: [{ action: "walk", req: 2 }],
        health: [
          { action: "missing", req: 2 },
          { action: "walk", req: -1 },
        ],
      },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions references unknown area: career");
    expect(messages).toContain("references unknown action: missing");
    expect(messages).toContain("must be a finite non-negative number");
  });

  it("flags a duplicate area ID", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 },
              { id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }

      ],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [] }],
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("Duplicate area id: health");
  });

  it("flags a bad requirement set", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }
      ],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [] }],
      requiredActions: {
        health: undefined, // Invalid type
      },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions.health must be an array");
  });

  it("flags an empty action ID", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }
      ],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [] }],
      requiredActions: {
        health: [{ action: "", req: 2 }],
      },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions.health[0].action must be a non-empty string");
  });

  it("flags an empty action ID", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecay: 10 }
      ],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [] }],
      requiredActions: {
        // @ts-expect-error  // Allow testing invalid entry for robustness
        health: [null], // Invalid entry
      },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions.health[0].action must be a non-empty string");
  });
});
