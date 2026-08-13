import { describe, expect, it } from "vitest";
import {
  renderProgressTrackerBody,
  RenderRuntime,
} from "../../../core/render/renderFromModel";
import type { RenderBodyModel } from "../../../core/translate/models";
import { FakeButton, FakeElement, FakeInput, asHTMLElement } from "./fakeDom";
import { UserEvent } from "../../../core/handleEvents/types";

describe("core/render/renderFromModel", () => {
  it("renders errorList with items", () => {
    const root = new FakeElement("div");

    // Need to specify function, but no need to do anything
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const runtime = { date: "2026-03-16", onUserAction: async (evt: UserEvent) => {} } as RenderRuntime;

    const model: RenderBodyModel = { kind: "errorList", message: "Bad things", items: ["a", "b"] };
    renderProgressTrackerBody(asHTMLElement(root), runtime, model);

    expect(root.textContent()).toContain("Bad things");
    expect(root.textContent()).toContain("a");
    expect(root.textContent()).toContain("b");
  });


  it("wires activities: button/number and record input events", () => {
    const root = new FakeElement("div");
    const calls: UserEvent[] = [];
    const runtime = {
      date: "2026-03-16",
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    };

    const model: RenderBodyModel = {
      kind: "dashboard",
      areas: { kind: "areasEmpty", message: "No areas" },
      actions: {
        kind: "activitiesTabs",
        groups: [
          {
            id: "g1",
            name: "Group",
            numActionsStillRequired: 0,
            columns: [{ id: "default", name: "Default", rows: [
              {
                kind: "action",
                actionId: "walk",
                name: "Walk",
                currentText: "1",
                entry: {
                  kind: "button",
                  plus: {
                    label: "+",
                    disabled: false,
                    event: {
                      kind: "adjustActionTotal",
                      date: "2026-03-16",
                      actionId: "walk",
                      delta: 1,
                    } as UserEvent,
                  },
                  minus: {
                    label: "-",
                    disabled: false,
                    event: {
                      kind: "adjustActionTotal",
                      date: "2026-03-16",
                      actionId: "walk",
                      delta: -1,
                    } as UserEvent,
                  },
                },
                requiredLeft: 0,
              },
              {
                kind: "action",
                actionId: "pushups",
                name: "Pushups",
                currentText: "1",
                entry: {
                  kind: "number",
                  min: "0",
                  max: "5",
                  step: "1",
                  value: "1",
                  eventBase: { kind: "adjustActionTotal", date: "2026-03-16", actionId: "pushups" },
                  current: 1,
                },
                requiredLeft: 0,
              },
              {
                kind: "record",
                recordId: "mood",
                name: "Mood",
                currentText: "ok",
                entry: {
                  kind: "recordInput",
                  inputType: "text",
                  value: "ok",
                  eventBase: { kind: "setRecordValue", date: "2026-03-16", recordId: "mood" },
                },
              },
            ], numActionsStillRequired: 0 }],
          },
        ],
      },
      planDay: {
        kind: "planNoActions",
        scope: "day",
        message: "No actions",
      },
      planWeek: {
        kind: "planNoActions",
        scope: "week",
        message: "No actions",
      },
      stats: {
        entries: [],
      },
    };

    renderProgressTrackerBody(asHTMLElement(root), runtime as RenderRuntime, model);

    const btns = root.findAllByTag("button") as unknown as FakeButton[];
    const plus = btns.find((b) => b.text === "+")!;
    const minus = btns.find((b) => b.text === "-")!;
    plus.click();
    minus.click();

    const inputs = root.findAllByTag("input") as unknown as FakeInput[];
    const number = inputs.find((i) => i.type === "number")!;
    number.change("100");

    const text = inputs.find((i) => i.type === "text" && i.value === "ok")!;
    text.change("great");

    expect(calls.some((c) => c.kind === "adjustActionTotal" && c.actionId === "walk" && c.delta === 1)).toBe(true);
    expect(calls.some((c) => c.kind === "adjustActionTotal" && c.actionId === "walk" && c.delta === -1)).toBe(true);
    // max=5 clamp: current=1, next=5 => delta=4
    expect(calls.some((c) => c.kind === "adjustActionTotal" && c.actionId === "pushups" && c.delta === 4)).toBe(true);
    expect(calls.some((c) => c.kind === "setRecordValue" && c.recordId === "mood" && c.value === "great")).toBe(true);
  });

  it("renders plan sections (hidden/no-actions/tabs) and emits setPlanTarget clamped to >=0", () => {
    const root = new FakeElement("div");
    const calls: UserEvent[] = [];
    const runtime: RenderRuntime = {
      date: "2026-03-16",
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
    };

    const model: RenderBodyModel = {
      kind: "dashboard",
      areas: { kind: "areasEmpty", message: "No areas" },
      actions: { kind: "activitiesEmpty", message: "No actions" },
      planDay: {
        kind: "planTabs",
        scope: "day",
        groups: [
          {
            id: "g1",
            name: "Group",
            columns: [{ id: "default", name: "Default", rows: [
              {
                actionId: "walk",
                name: "Walk",
                plannedText: "2",
                scope: "day",
                eventBase: { kind: "setPlanTarget", scope: "day", actionId: "walk" },
                entry: {
                  kind: "stepperNumber",
                  plus: {
                    label: "+1",
                    disabled: false,
                    event: { kind: "setPlanTarget", scope: "day", actionId: "walk", value: 3 },
                  },
                  minus: {
                    label: "-1",
                    disabled: false,
                    event: { kind: "setPlanTarget", scope: "day", actionId: "walk", value: 1 },
                  },
                  min: "0",
                  max: undefined,
                  step: "1",
                  value: "2",
                  eventBase: { kind: "setPlanTarget", scope: "day", actionId: "walk" },
                  current: 2,
                },
              },
            ] }],
          },
        ],
      },
      planWeek: {
        kind: "planNoActions",
        scope: "week",
        message: "No actions",
      },
      stats: {
        entries: [],
      },
    };

    renderProgressTrackerBody(asHTMLElement(root), runtime as RenderRuntime, model);

    const buttons = root.findAllByTag("button") as unknown as FakeButton[];
    const plus = buttons.find((button) => button.text === "+1")!;
    const minus = buttons.find((button) => button.text === "-1")!;
    plus.click();
    minus.click();

    const inputs = root.findAllByTag("input") as unknown as FakeInput[];
    const number = inputs.find((i) => i.type === "number")!;
    number.change("-5");
    number.change("not-a-number");

    expect(calls.some((c) => c.kind === "setPlanTarget" && c.actionId === "walk" && c.value === 3)).toBe(true);
    expect(calls.some((c) => c.kind === "setPlanTarget" && c.actionId === "walk" && c.value === 1)).toBe(true);
    expect(calls.some((c) => c.kind === "setPlanTarget" && c.actionId === "walk" && c.value === 0)).toBe(true);
  });

  it("loads stats only when the stats tab is opened", async () => {
    const root = new FakeElement("div");
    const calls: UserEvent[] = [];
    let numStatsLoads = 0;

    const runtime: RenderRuntime = {
      date: "2026-03-16",
      onUserAction: async (evt: UserEvent) => {
        calls.push(evt);
      },
      loadStats: async () => {
        numStatsLoads += 1;
        return {
          kind: "statsTable",
          rows: [{ name: "Walk total", valueLines: ["Total=7", "Count=2"] }],
        };
      },
    };

    const model: RenderBodyModel = {
      kind: "dashboard",
      areas: { kind: "areasEmpty", message: "No areas" },
      actions: { kind: "activitiesEmpty", message: "No actions" },
      planDay: { kind: "planNoActions", scope: "day", message: "No actions" },
      planWeek: {
        kind: "planNoActions",
        scope: "week",
        message: "No actions",
      },
      stats: {
        entries: [{ id: "walk-total", name: "Walk total", statNames: ["walk"], display: ["total", "count"] }],
      },
    };

    renderProgressTrackerBody(asHTMLElement(root), runtime, model);
    expect(numStatsLoads).toBe(0);

    const buttons = root.findAllByTag("button") as unknown as FakeButton[];
    const statsTab = buttons.find((button) => button.text === "Stats");
    expect(statsTab).toBeDefined();
    statsTab?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(numStatsLoads).toBe(1);
    expect(root.textContent()).toContain("Walk total");
    expect(root.textContent()).toContain("Total=7");
    expect(root.textContent()).toContain("Count=2");
    expect(calls).toEqual([]);
  });
});
