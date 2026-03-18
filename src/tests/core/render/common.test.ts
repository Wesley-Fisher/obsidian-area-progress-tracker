import { describe, expect, it } from "vitest";
import type { RenderDayModeArgs } from "../../../core/render/renderTypes";
import { buildActionOnlyGroups, buildActivityGroups } from "../../../core/render/common";

function mkArgs(partial: Partial<RenderDayModeArgs>): RenderDayModeArgs {
  return {
    plugin: {} as any,
    el: {} as any,
    ctx: {} as any,
    repo: {} as any,
    onUserAction: async () => {},
    container: {} as any,
    blockConfig: { mode: "day", date: "2026-03-16" as any },
    config: { version: 1, areas: [], actions: [], records: [], groups: [] },
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
          { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, groupId: "g1" },
          { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {} },
        ],
        records: [{ id: "r1", name: "R1", input: { type: "text" }, groupId: "g1" }],
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
        actions: [{ id: "a1", name: "A1", input: { type: "checkbox" }, effects: {} }],
        records: [{ id: "r1", name: "R1", input: { type: "text" } }],
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
          { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {} },
          { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {} },
        ],
        records: [],
      },
    });

    const groups = buildActionOnlyGroups(args);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});
