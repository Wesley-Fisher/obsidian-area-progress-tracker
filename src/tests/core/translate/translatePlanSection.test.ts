import { describe, expect, it } from "vitest";
import type { DailyPlanConfig, SystemConfig } from "../../../core/types";
import { translatePlanSection } from "../../../core/translate/inner/translatePlanSection";
import { UserPlanEvent } from "../../../core/handleEvents/types";

describe("render/translate/translatePlanSection", () => {
  it("returns planNoActions when actions are empty", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { actions: {} },
      stats: { entries: [] },
    };
    const model = translatePlanSection({
      scope: "week",
      config,
      plan: { actions: {} },
    });

    expect(model.kind).toBe("planNoActions");
    if (model.kind !== "planNoActions") throw new Error("expected planNoActions");
    expect(model.message).toBe("No actions configured.");
  });

  it("sanitizes plan values (NaN/-3/missing -> 0) and builds rows", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0  },
        { id: "done", name: "Done", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0  },
        { id: "deep_work", name: "Deep Work", input: { type: "number", min: 0, max: 10, step: 1 }, effects: {}, groupIds: [], max: 0 },
      ],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { actions: {} },
      stats: { entries: [] },
    };

    // Next line tests incorrect types to ensure robustness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan: DailyPlanConfig = { actions: { walk: Number.NaN as any, done: -3 as any, deep_work: "not-a-number" as any } };

    const model = translatePlanSection({
      scope: "day",
      config,
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

    expect(byId.get("walk")?.entry.kind).toBe("stepperNumber");
    expect(byId.get("done")?.entry.kind).toBe("stepperNumber");
    expect(byId.get("deep_work")?.entry.kind).toBe("stepperNumber");
  });

  it("treats action.max=0 as unlimited in plan steppers", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
        { id: "done", name: "Done", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
      ],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { actions: {} },
      stats: { entries: [] },
    };

    const model = translatePlanSection({ scope: "day", config, plan: { actions: {} } });
    expect(model.kind).toBe("planTabs");
    if (model.kind !== "planTabs") throw new Error("expected planTabs");

    const rows = model.groups.flatMap((g) => g.rows);
    const byId = new Map(rows.map((r) => [r.actionId, r] as const));

    const walk = byId.get("walk");
    expect(walk?.entry.kind).toBe("stepperNumber");
    if (!walk || walk.entry.kind !== "stepperNumber") throw new Error("expected walk stepperNumber entry");
    expect(walk.entry.plus.disabled).toBe(false);
    expect((walk.entry.plus.event as UserPlanEvent).value).toBe(1);
    expect(walk.entry.minus.disabled).toBe(true);

    const done = byId.get("done");
    expect(done?.entry.kind).toBe("stepperNumber");
    if (!done || done.entry.kind !== "stepperNumber") throw new Error("expected done stepperNumber entry");
    expect(done.entry.plus.disabled).toBe(false);
    expect(done.entry.minus.disabled).toBe(true);
  });

  it("applies a positive max to button actions", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 1 }],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { actions: {} },
      stats: { entries: [] },
    };

    const model = translatePlanSection({ scope: "day", config, plan: { actions: { walk: 1 } } });
    expect(model.kind).toBe("planTabs");
    if (model.kind !== "planTabs") throw new Error("expected planTabs");

    const row = model.groups.flatMap((g) => g.rows).find((r) => r.actionId === "walk");
    if (!row || row.entry.kind !== "stepperNumber") throw new Error("expected walk stepperNumber entry");
    expect(row.entry.plus.disabled).toBe(true);
    expect(row.entry.minus.disabled).toBe(false);
  });
});
