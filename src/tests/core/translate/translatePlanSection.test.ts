import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, PlanFile, SystemConfig } from "../../../core/types";
import { translatePlanSection } from "../../../core/translate/inner/translatePlanSection";

describe("render/translate/translatePlanSection", () => {
  it("returns planHidden and wires toggle event when hidden", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [] }],
      records: [],
    };

    const dayLog: DailyLog = {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: {},
      ui: { hidePlanDay: true },
    } as DailyLog;

    const model = translatePlanSection({
      scope: "day",
      date: "2026-03-16" as IsoDate,
      config,
      dayLog,
      plan: { actions: { walk: 1 } } as PlanFile,
    });

    expect(model.kind).toBe("planHidden");
    if (model.kind !== "planHidden") throw new Error("expected planHidden");

    expect(model.toggle.label).toContain("Show day plan");
    expect(model.toggle.event).toMatchObject({ kind: "setDayUiFlag", flag: "hidePlanDay", value: false });
    expect(model.message).toContain("Day plan hidden");
  });

  it("returns planNoActions when actions are empty", () => {
    const config: SystemConfig = { version: 1, areas: [], actions: [], records: [] };
    const dayLog: DailyLog = {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: {},
      ui: { hidePlanWeek: false },
    } as DailyLog;

    const model = translatePlanSection({
      scope: "week",
      date: "2026-03-16" as IsoDate,
      config,
      dayLog,
      plan: { actions: {} },
    });

    expect(model.kind).toBe("planNoActions");
    if (model.kind !== "planNoActions") throw new Error("expected planNoActions");
    expect(model.message).toBe("No actions configured.");
    expect(model.toggle.label).toContain("Hide week plan");
  });

  it("sanitizes plan values (NaN/-3/missing -> 0) and builds rows", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: []  },
        { id: "done", name: "Done", input: { type: "checkbox" }, effects: {}, groupIds: []  },
        { id: "deep_work", name: "Deep Work", input: { type: "number", min: 0, max: 10, step: 1 }, effects: {}, groupIds: []  },
      ],
      records: [],
    };

    const dayLog: DailyLog = {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: {},
      ui: { hidePlanDay: false },
    } as DailyLog;

    // Next line tests incorrect types to ensure robustness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan: PlanFile = { actions: { walk: Number.NaN as any, done: -3 as any, deep_work: "not-a-number" as any } };

    const model = translatePlanSection({
      scope: "day",
      date: "2026-03-16" as IsoDate,
      config,
      dayLog,
      plan,
    });

    expect(model.kind).toBe("planTabs");
    if (model.kind !== "planTabs") throw new Error("expected planTabs");

    const allRows = model.groups.flatMap((g) => g.rows);
    const byId = new Map(allRows.map((r) => [r.actionId, r] as const));

    expect(byId.get("walk")?.plannedText).toBe("0");
    expect(byId.get("done")?.plannedText).toBe("0");
    expect(byId.get("deep_work")?.plannedText).toBe("0");

    expect(byId.get("walk")?.eventBase).toMatchObject({ kind: "setPlanTarget", scope: "day", actionId: "walk" });

    expect(byId.get("walk")?.entry.kind).toBe("button");
    expect(byId.get("done")?.entry.kind).toBe("checkbox");
    expect(byId.get("deep_work")?.entry.kind).toBe("number");
  });
});
