import { describe, expect, it } from "vitest";
import type { DailyLog, PlanFile, SystemConfig } from "../../../core/types";
import { renderPlanDaySection } from "../../../core/render/renderPlanDaySection";
import { renderPlanWeekSection } from "../../../core/render/renderPlanWeekSection";
import { FakeButton, FakeElement, FakeInput, asHTMLElement } from "./fakeDom";

function mkArgs(overrides: Partial<any> = {}): any {
  const container = new FakeElement("div");
  return {
    container: asHTMLElement(container),
    blockConfig: { mode: "day", date: "2026-03-16" },
    config: { version: 1, areas: [], actions: [], records: [] } as SystemConfig,
    dayLog: null as DailyLog | null,
    dayPlan: null as PlanFile | null,
    weekPlan: null as PlanFile | null,
    onUserAction: async () => {},
    ...overrides,
    __root: container,
  };
}

describe("renderPlanDaySection / renderPlanWeekSection", () => {
  it("shows 'No actions configured.' when actions list is empty (day/week)", () => {
    const dayArgs = mkArgs({
      config: { version: 1, areas: [], actions: [], records: [] },
      dayLog: { ui: { hidePlanDay: false }, actions: {}, previousScore: {}, startingScore: {}, updatedScore: {} } as any,
      dayPlan: { actions: {} },
    });

    renderPlanDaySection(dayArgs);
    expect(dayArgs.__root.textContent()).toContain("No actions configured.");

    const weekArgs = mkArgs({
      config: { version: 1, areas: [], actions: [], records: [] },
      dayLog: { ui: { hidePlanWeek: false }, actions: {}, previousScore: {}, startingScore: {}, updatedScore: {} } as any,
      weekPlan: { actions: {} },
    });

    renderPlanWeekSection(weekArgs);
    expect(weekArgs.__root.textContent()).toContain("No actions configured.");
  });

  it("renders hidden message and toggles hidePlanDay", async () => {
    const calls: any[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {} }],
        records: [],
      },
      dayLog: { ui: { hidePlanDay: true }, actions: {}, previousScore: {}, startingScore: {}, updatedScore: {} } as any,
      dayPlan: { actions: { walk: 1 } },
      onUserAction: async (evt: any) => {
        calls.push(evt);
      },
    });

    renderPlanDaySection(args);

    expect(args.__root.textContent()).toContain("(Day plan hidden");

    const btns = args.__root.findAllByTag("button") as unknown as FakeButton[];
    // h4 + toggle button (toggle is first button)
    const toggle = btns[0];
    expect(toggle.text).toContain("Show day plan");

    toggle.click();
    expect(calls[0]).toMatchObject({ kind: "setDayUiFlag", flag: "hidePlanDay", value: false });
  });

  it("renders plan inputs and emits setPlanTarget on change", () => {
    const calls: any[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [
          { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {} },
          { id: "done", name: "Done", input: { type: "checkbox" }, effects: {} },
          { id: "deep_work", name: "Deep Work", input: { type: "number", min: 0, step: 1 }, effects: {} },
        ],
        records: [],
      },
      dayLog: { ui: { hidePlanDay: false }, actions: {}, previousScore: {}, startingScore: {}, updatedScore: {} } as any,
      dayPlan: { actions: { walk: 2, done: 0, deep_work: 3 } },
      onUserAction: async (evt: any) => {
        calls.push(evt);
      },
    });

    renderPlanDaySection(args);

    // Number action: emits setPlanTarget on change.
    const inputs = args.__root.findAllByTag("input") as unknown as FakeInput[];
    const numberInputs = inputs.filter((i) => i.type === "number");
    const checkboxInputs = inputs.filter((i) => i.type === "checkbox");
    expect(numberInputs.length).toBeGreaterThanOrEqual(1);
    expect(checkboxInputs.length).toBeGreaterThanOrEqual(1);

    numberInputs[0].change("5");
    expect(calls.some((c) => c.kind === "setPlanTarget" && c.scope === "day" && c.actionId === "deep_work" && c.value === 5)).toBe(true);

    // Checkbox action: toggles between 0/1.
    checkboxInputs[0].checked = true;
    checkboxInputs[0].change();
    expect(calls.some((c) => c.kind === "setPlanTarget" && c.scope === "day" && c.actionId === "done" && c.value === 1)).toBe(true);

    // Button action: plus/minus emits setPlanTarget values.
    const btns = args.__root.findAllByTag("button") as unknown as FakeButton[];
    const plus = btns.find((b) => b.text === "+");
    const minus = btns.find((b) => b.text === "-");
    expect(plus).toBeTruthy();
    expect(minus).toBeTruthy();
    plus!.click();
    expect(calls.some((c) => c.kind === "setPlanTarget" && c.scope === "day" && c.actionId === "walk" && c.value === 3)).toBe(true);
  });

  it("renders missing/invalid plan values as 0 and clamps plan entry changes", () => {
    const calls: any[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [
          { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {} },
          { id: "deep_work", name: "Deep Work", input: { type: "number", min: 0, step: 1 }, effects: {} },
        ],
        records: [],
      },
      dayLog: { ui: { hidePlanDay: false }, actions: {}, previousScore: {}, startingScore: {}, updatedScore: {} } as any,
      // walk=NaN -> planned becomes 0 (Number.isFinite false)
      // deep_work=-3 -> planned becomes 0 (clamped)
      dayPlan: { actions: { walk: Number.NaN as any, deep_work: -3 } },
      onUserAction: async (evt: any) => {
        calls.push(evt);
      },
    });

    renderPlanDaySection(args);

    const tds = (args.__root.findAllByTag("td") as unknown as FakeElement[]).map((n) => n.text);
    const idxWalk = tds.indexOf("Walk");
    const idxDeepWork = tds.indexOf("Deep Work");
    expect(idxWalk).toBeGreaterThanOrEqual(0);
    expect(idxDeepWork).toBeGreaterThanOrEqual(0);
    expect(tds[idxWalk + 1]).toBe("0");
    expect(tds[idxDeepWork + 1]).toBe("0");

    const inputs = args.__root.findAllByTag("input") as unknown as FakeInput[];
    const numberInputs = inputs.filter((i) => i.type === "number");
    expect(numberInputs.length).toBeGreaterThanOrEqual(1);

    numberInputs[0].change("-5");
    numberInputs[0].change("not-a-number");

    expect(calls.some((c) => c.kind === "setPlanTarget" && c.scope === "day" && c.value === 0)).toBe(true);
  });

  it("renders hidden message and toggles hidePlanWeek", async () => {
    const calls: any[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {} }],
        records: [],
      },
      dayLog: { ui: { hidePlanWeek: true }, actions: {}, previousScore: {}, startingScore: {}, updatedScore: {} } as any,
      weekPlan: { actions: { walk: 1 } },
      onUserAction: async (evt: any) => {
        calls.push(evt);
      },
    });

    renderPlanWeekSection(args);

    expect(args.__root.textContent()).toContain("(Week plan hidden");

    const btns = args.__root.findAllByTag("button") as unknown as FakeButton[];
    const toggle = btns[0];
    expect(toggle.text).toContain("Show week plan");

    toggle.click();
    expect(calls[0]).toMatchObject({ kind: "setDayUiFlag", flag: "hidePlanWeek", value: false });
  });
});
