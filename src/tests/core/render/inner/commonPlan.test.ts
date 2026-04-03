import { describe, expect, it } from "vitest";
import type { DailyLog, PlanFile, SystemConfig } from "../../../../core/types";
import { renderPlanTabs } from "../../../../core/render/inner/commonPlan";
import { FakeElement, FakeInput, asHTMLElement } from "../fakeDom";
import { UserEvent } from "../../../../core/handleEvents/types";
import { RenderDayModeArgs } from "../../../../core/render/renderTypes";

describe("core/render/commonPlan", () => {
  it("renders plan table and emits setPlanTarget with clamped numeric values", () => {
    const calls: UserEvent[] = [];

    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
        { id: "run", name: "Run", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
      ],
      records: [],
    };

    const args: RenderDayModeArgs = {
      // All 'any' to provide blank objects for test
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      container: {} as any, el: {} as any, repo: {} as any,
      blockConfig: { mode: "day", date: "2026-03-16" },
      config,
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: {}, ui: {} } as DailyLog,
      dayPlan: { actions: {} } as PlanFile,
      weekPlan: { actions: {} } as PlanFile,
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    };

    const root = new FakeElement("div");

    // Allow any to test handling an incorrect type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderPlanTabs(asHTMLElement(root), args, "day", { walk: 2, run: Number.NaN as any });

    const inputs = root.findAllByTag("input") as unknown as FakeInput[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    inputs[0].change("-5");
    inputs[1].change("not-a-number");

    expect(calls.some((c) => c.kind === "setPlanTarget" && c.scope === "day" && c.value === 0)).toBe(true);
  });
});
