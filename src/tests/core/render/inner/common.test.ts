import { describe, expect, it } from "vitest";
import type { RenderDayModeArgs } from "../../../../core/render/renderTypes";
import { buildActionOnlyGroups, buildActivityGroups } from "../../../../core/render/inner/common";
import { IsoDate } from "../../../../core/types";

function mkArgs(partial: Partial<RenderDayModeArgs>): RenderDayModeArgs {
  return {
    el: {} as HTMLElement,
    // Allow 'any' to pass blank objects for test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repo: {} as any, container: {} as any,
    onUserAction: async () => {},
    blockConfig: { mode: "day", date: "2026-03-16" as IsoDate },
    config: { version: 1, areas: [], actions: [], records: [], groups: [], requiredActions: {} },
    dayLog: null,
    dayPlan: null,
    weekPlan: null,
    ...partial,
  };
}

describe("render/common grouping helpers", () => {
  it("buildActivityGroups uses configured groups and adds Ungrouped for leftovers", () => {
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        groups: [{ id: "g1", name: "Group 1" }],
        actions: [
          { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, groupIds: ["g1"], max: 0 },
          { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
        ],
        records: [{ id: "r1", name: "R1", input: { type: "text" }, groupIds: ["g1"] }],
        requiredActions: {},
      },
    });

    const groups = buildActivityGroups(args, args.config.records ?? []);

    expect(groups.map((g) => g.id)).toEqual(["g1", "__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
    expect(groups[0].records.map((r) => r.id)).toEqual(["r1"]);
    expect(groups[1].actions.map((a) => a.id)).toEqual(["a2"]);
  });

  it("buildActivityGroups falls back to All when nothing is grouped", () => {
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        groups: [],
        actions: [{ id: "a1", name: "A1", input: { type: "checkbox" }, effects: {}, groupIds: [], max: 0 }],
        records: [{ id: "r1", name: "R1", input: { type: "text" }, groupIds: [] }],
        requiredActions: {},
      },
    });

    const groups = buildActivityGroups(args, args.config.records ?? []);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions).toHaveLength(1);
    expect(groups[0].records).toHaveLength(1);
  });

  it("buildActionOnlyGroups creates __all__ when no groupId is present", () => {
    const args = mkArgs({
      config: {
        version: 1,
        areas: [],
        groups: [{ id: "g1", name: "Group 1" }],
        actions: [
          { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0 },
          { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {}, groupIds: [], max: 0},
        ],
        records: [],
        requiredActions: {},
      },
    });

    const groups = buildActionOnlyGroups(args);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});
