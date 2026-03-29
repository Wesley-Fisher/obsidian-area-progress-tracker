import { describe, expect, it } from "vitest";
import type { DailyLog, PlanFile, SystemConfig } from "../../../../core/types";
import { translateAreasSection } from "../../../../core/translate/translateAreasSection";

describe("render/translate/translateAreasSection", () => {
  it("returns areasEmpty when scores are missing", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecay: 1 }],
      actions: [],
      records: [],
    };

    const model = translateAreasSection({
      config,
      dayLog: { updatedScore: {} } as any,
      dayPlan: { actions: {} },
      weekPlan: { actions: {} },
    });

    expect(model.kind).toBe("areasEmpty");
    expect(model.message).toContain("No scores yet");
  });

  it("computes possible day/week score columns from plans", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 50, dailyDecay: 1 }],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: { health: 10 } }],
      records: [],
    };

    const dayLog: DailyLog = {
      updatedScore: { health: { score: 40, daysSince: 2 } },
      previousScore: { health: { score: 40, daysSince: 2 } },
      startingScore: { health: { score: 39, daysSince: 3 } },
      actions: { walk: 1 },
      records: {},
    };

    const dayPlan: PlanFile = { actions: { walk: 3 } }; // remaining=2 => +20 => 60
    const weekPlan: PlanFile = { actions: { walk: 3 } }; // no subtract => +30 => 70

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
      possibleDayText: "60",
      possibleWeekText: "70",
    });
  });
});
