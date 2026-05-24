import { describe, expect, it } from "vitest";
import type { DailyLog, DailyPlanConfig, SystemConfig, WeeklyPlanConfig } from "../../../core/types";
import { translateAreasSection } from "../../../core/translate/inner/translateAreasSection";
import { AreasSectionModelEmpty } from "../../../core/translate/models";

describe("render/translate/translateAreasSection", () => {
  it("returns areasEmpty when scores are missing", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecayAlways: 0, dailyDecayUnattended: 1 }],
      groups: [],
      actions: [],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const model = translateAreasSection({
      config,
      dayLog: { updatedScore: {} } as DailyLog,
      dayPlan: { actions: {} },
      weekPlan: { startDate: "", actions: {} },
    });

    expect(model.kind).toBe("areasEmpty");
    expect((model as AreasSectionModelEmpty).message).toContain("No scores yet");
  });

  it("computes possible day/week score columns from plans", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecayAlways: 0, dailyDecayUnattended: 1 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 10 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const dayLog: DailyLog = {
      updatedScore: { health: { score: 40, daysSince: 2 } },
      previousScore: { health: { score: 40, daysSince: 2 } },
      startingScore: { health: { score: 39, daysSince: 3 } },
      actions: { walk: 1 },
      records: {},
    };

    const dayPlan: DailyPlanConfig = { actions: { walk: 3 } }; // startingScore=39, +30 => 69
    const weekPlan: WeeklyPlanConfig = { startDate: "", actions: { walk: 3 } }; // same baseline => 69

    const model = translateAreasSection({
      config,
      dayLog,
      dayPlan,
      weekPlan,
    });

    expect(model.kind).toBe("areasTable");
    if (model.kind !== "areasTable") throw new Error("expected areasTable");

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]).toMatchObject({
      areaName: "Health",
      daysSinceText: "2",
      updatedScoreText: "40",
      possibleDayText: "69",
      possibleWeekText: "69",
    });
  });

  it("uses the same baseline for possible day/week when plans match (startingScore w/ decay)", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecayAlways: 0, dailyDecayUnattended: 1 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 10 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const dayLog: DailyLog = {
      previousScore: { health: { score: 50, daysSince: 1 } },
      startingScore: { health: { score: 49, daysSince: 2 } },
      updatedScore: { health: { score: 59, daysSince: 2 } },
      actions: { walk: 1 },
      records: {},
    };

    const dayPlan: DailyPlanConfig = { actions: { walk: 3 } };
    const weekPlan: WeeklyPlanConfig = { startDate: "", actions: { walk: 3 } };

    const model = translateAreasSection({ config, dayLog, dayPlan, weekPlan });
    expect(model.kind).toBe("areasTable");
    if (model.kind !== "areasTable") throw new Error("expected areasTable");

    expect(model.rows).toHaveLength(1);
    expect(model.rows[0]?.possibleDayText).toBe(model.rows[0]?.possibleWeekText);
  });

  it("subtracts 7 applications of dailyDecayAlways from weekly possible score", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecayAlways: 2, dailyDecayUnattended: 1 }],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 10 }, groupIds: [], max: 0 }],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [] },
    };

    const dayLog: DailyLog = {
      updatedScore: { health: { score: 40, daysSince: 2 } },
      previousScore: { health: { score: 40, daysSince: 2 } },
      startingScore: { health: { score: 39, daysSince: 3 } },
      actions: { walk: 1 },
      records: {},
    };

    const model = translateAreasSection({
      config,
      dayLog,
      dayPlan: { actions: { walk: 3 } },
      weekPlan: { startDate: "", actions: { walk: 3 } },
    });

    expect(model.kind).toBe("areasTable");
    if (model.kind !== "areasTable") throw new Error("expected areasTable");

    expect(model.rows[0]).toMatchObject({
      possibleDayText: "69",
      possibleWeekText: "55",
    });
  });
});
