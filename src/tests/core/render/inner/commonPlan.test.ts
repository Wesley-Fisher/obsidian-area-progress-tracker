import { describe, expect, it } from "vitest";
import type { DailyLog, PlanFile, SystemConfig } from "../../../../core/types";
import { renderPlanTabs } from "../../../../core/render/inner/commonPlan";
import { FakeElement, FakeInput, asHTMLElement } from "../fakeDom";

describe("core/render/commonPlan", () => {
  it("renders plan table and emits setPlanTarget with clamped numeric values", () => {
    const calls: any[] = [];

    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {} },
        { id: "run", name: "Run", input: { type: "button", step: 1 }, effects: {} },
      ],
      records: [],
    };

    const args: any = {
      blockConfig: { mode: "day", date: "2026-03-16" },
      config,
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: {}, ui: {} } as DailyLog,
      dayPlan: { actions: {} } as PlanFile,
      weekPlan: { actions: {} } as PlanFile,
      onUserAction: async (evt: any) => {
        calls.push(evt);
      },
    };

    const root = new FakeElement("div");
    renderPlanTabs(asHTMLElement(root), args, "day", { walk: 2, run: Number.NaN as any });

    const inputs = root.findAllByTag("input") as unknown as FakeInput[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    inputs[0].change("-5");
    inputs[1].change("not-a-number");

    expect(calls.some((c) => c.kind === "setPlanTarget" && c.scope === "day" && c.value === 0)).toBe(true);
  });
});
