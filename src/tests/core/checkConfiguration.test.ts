import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../core/types";
import { checkConfiguration } from "../../core/checkConfiguration";

describe("checkConfiguration", () => {
  it("returns no issues for a valid config", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "2026-03-01", entries: [{ id: "walk-total", name: "Walk", statNames: ["walk"], display: ["total", "count"] }] },
    };

    expect(checkConfiguration(config)).toEqual([]);
  });

  it("flags unknown area/action and invalid req values", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {
        career: [{ action: "walk", req: 2 }],
        health: [
          { action: "missing", req: 2 },
          { action: "walk", req: -1 },
        ],
      },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
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
          areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 },
            { id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }

      ],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {
        health: [{ action: "walk", req: 2 }],
      },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("Duplicate area id: health");
  });

  it("flags a bad requirement set", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }
      ],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {
        health: undefined, // Invalid type
      },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions.health must be an array");
  });

  it("flags an empty action ID", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }
      ],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {
        health: [{ action: "", req: 2 }],
      },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions.health[0].action must be a non-empty string");
  });

  it("flags an empty action ID", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }
      ],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {
        // @ts-expect-error  // Allow testing invalid entry for robustness
        health: [null], // Invalid entry
      },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("requiredActions.health[0].action must be a non-empty string");
  });

  it("flags missing split decay fields", () => {
    const config = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: { health: [{ action: "walk", req: 2 }] },
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    } as unknown as SystemConfig;

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("areas[0].dailyDecayAlways must be a finite non-negative number");
    expect(messages).toContain("areas[0].dailyDecayUnattended must be a finite non-negative number");
  });

  it("flags invalid stats entries", () => {
    const config = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 1000, baseScore: 500, dailyDecayAlways: 0, dailyDecayUnattended: 10 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 12 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: {
        startDate: 123,
        entries: [{ id: "", name: "", statNames: ["missing", ""], display: ["average", "bogus"] }],
      },
    } as unknown as SystemConfig;

    const issues = checkConfiguration(config);
    const messages = issues.map((i) => i.message).join("\n");

    expect(messages).toContain("stats.startDate must be a string");
    expect(messages).toContain("stats.entries[0].id must be a non-empty string");
    expect(messages).toContain("stats.entries[0].name must be a non-empty string");
    expect(messages).toContain("stats.entries[0].statNames[0] references unknown action or record: missing");
    expect(messages).toContain("stats.entries[0].statNames[1] must be a non-empty string");
    expect(messages).toContain("stats.entries[0].display[1] must be one of: total, average, count, range");
  });
});
