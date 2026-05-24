import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, SystemConfig } from "../../../../core/types";
import { renderActivitiesTabs } from "../../../../core/render/inner/common";
import { FakeButton, FakeElement, FakeInput, asHTMLElement } from "../fakeDom";
import { UserEvent } from "../../../../core/handleEvents/types";

// This was a useful AI-gen way to allow overriding lots of these elements
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mkArgs(overrides: Partial<any> = {}): any {
  const container = new FakeElement("div");
  const config: SystemConfig = {
    version: 1,
    areas: [],
    groups: [],
    actions: [],
    records: [],
    requiredActions: {},
    dailyPlan: { actions: {} },
    weeklyPlan: { startDate: "", actions: {} },
    stats: { startDate: "", entries: [] },
  };

  const dayLog: DailyLog = {
    previousScore: {},
    startingScore: {},
    updatedScore: {},
    actions: {},
    records: {},
  };

  return {
    container: asHTMLElement(container),
    blockConfig: { mode: "day", date: "2026-03-16" as IsoDate },
    config,
    dayLog,
    dayPlan: null,
    weekPlan: null,
    onUserAction: async () => {},
    __root: container,
    ...overrides,
  };
}

describe("renderActivitiesTabs", () => {
  it("wires button (+/-) actions with step and respects max/0 disabling", () => {
    const calls: UserEvent[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 2 }, effects: {}, max: 2 }],
        records: [],
      },
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: { walk: 1 } } as DailyLog,
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    });

    renderActivitiesTabs(asHTMLElement(args.__root), args, []);

    const btns = args.__root.findAllByTag("button") as unknown as FakeButton[];
    // tab bar buttons include group tab first, then + and -
    const plus = btns.find((b) => b.text === "+")!;
    const minus = btns.find((b) => b.text === "-")!;

    expect(plus.disabled).toBe(false);
    expect(minus.disabled).toBe(false);

    plus.click();
    minus.click();

    expect(calls).toContainEqual({
      kind: "adjustActionTotal",
      date: args.blockConfig.date,
      actionId: "walk",
      delta: 2,
    });
    expect(calls).toContainEqual({
      kind: "adjustActionTotal",
      date: args.blockConfig.date,
      actionId: "walk",
      delta: -2,
    });
  });

  it("renders single-step button actions and emits +/-1 deltas", () => {
    const calls: UserEvent[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [{ id: "meditate", name: "Meditate", input: { type: "button", step: 1 }, effects: {} }],
        records: [],
      },
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: { meditate: 1 } } as DailyLog,
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    });

    renderActivitiesTabs(asHTMLElement(args.__root), args, []);

    const btns = args.__root.findAllByTag("button") as unknown as FakeButton[];
    const plus = btns.find((b) => b.text === "+")!;
    const minus = btns.find((b) => b.text === "-")!;

    plus.click();
    minus.click();

    expect(calls[0]).toMatchObject({ kind: "adjustActionTotal", actionId: "meditate", delta: 1 });
    expect(calls[1]).toMatchObject({ kind: "adjustActionTotal", actionId: "meditate", delta: -1 });
  });

  it("renders number actions and clamps value to >=0 and <= effective max", () => {
    const calls: UserEvent[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [
          { id: "pushups", name: "Pushups", input: { type: "number", max: 10, step: 1 }, effects: {}, max: 5 },
        ],
        records: [],
      },
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: { pushups: 1 } } as DailyLog,
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    });

    renderActivitiesTabs(asHTMLElement(args.__root), args, []);

    const inputs = args.__root.findAllByTag("input") as unknown as FakeInput[];
    expect(inputs).toHaveLength(1);

    // effectiveMax = min(input.max=10, configMax=5) => 5
    inputs[0].change("100");
    expect(calls[0]).toMatchObject({ kind: "adjustActionTotal", actionId: "pushups", delta: 4 });

    calls.length = 0;
    inputs[0].change("-1");
    expect(calls[0]).toMatchObject({ kind: "adjustActionTotal", actionId: "pushups", delta: -1 });
  });

  it("renders record inputs and emits setRecordValue on change", () => {
    const calls: UserEvent[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {} }],
        records: [{ id: "mood", name: "Mood", input: { type: "text" } }],
      },
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: {}, records: { mood: "ok" } } as DailyLog,
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    });

    renderActivitiesTabs(asHTMLElement(args.__root), args, args.config.records);

    const inputs = args.__root.findAllByTag("input") as unknown as FakeInput[];
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    const recInput = inputs.find((i) => i.type === "text")!;
    recInput.change("great");
    expect(calls.some((c) => c.kind === "setRecordValue" && c.recordId === "mood" && c.value === "great")).toBe(true);
  });

  it("treats button max=0 as unlimited (enabled) and emits events", () => {
    const calls: UserEvent[] = [];
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        actions: [{ id: "meditate", name: "Meditate", input: { type: "button", step: 1 }, effects: {}, max: 0 }],
        records: [],
      },
      dayLog: { previousScore: {}, startingScore: {}, updatedScore: {}, actions: { meditate: 0 } } as DailyLog,
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    });

    renderActivitiesTabs(asHTMLElement(args.__root), args, []);

    const btns = args.__root.findAllByTag("button") as unknown as FakeButton[];
    const plus = btns.find((b) => b.text === "+")!;
    const minus = btns.find((b) => b.text === "-")!;
    expect(plus.disabled).toBe(false);
    expect(minus.disabled).toBe(true);

    plus.click();
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ kind: "adjustActionTotal", actionId: "meditate", delta: 1 });
  });
});
