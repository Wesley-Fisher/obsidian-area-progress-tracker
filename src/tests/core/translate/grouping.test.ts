import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../../core/types";
import {
  buildActionOnlyGroupsFromConfig,
  buildActivityGroupsFromConfig,
} from "../../../core/translate/inner/grouping";

function mkConfig(partial: Partial<SystemConfig>): SystemConfig {
  return {
    version: 1,
    areas: [],
    groups: [],
    actions: [],
    records: [],
    requiredActions: {},
    dailyPlan: { actions: {} },
    weeklyPlan: { actions: {} },
    ...partial,
    stats: partial.stats ?? { entries: [] },
  };
}

describe("render/translate/grouping", () => {
  it("buildActivityGroupsFromConfig uses configured groups and adds Ungrouped for leftovers", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1", columns: [{ id: "default", name: "Default" }] }],
      actions: [
        { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, placements: [{ groupId: "g1", columnId: "default" }], max: 0 },
        { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {}, placements: [], max: 0},
      ],
      records: [{ id: "r1", name: "R1", input: { type: "text" }, placements: [{ groupId: "g1", columnId: "default" }] }],
    });

    const groups = buildActivityGroupsFromConfig(config);

    expect(groups.map((g) => g.id)).toEqual(["g1", "__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
    expect(groups[0].records.map((r) => r.id)).toEqual(["r1"]);
    expect(groups[1].actions.map((a) => a.id)).toEqual(["a2"]);
  });

  it("buildActivityGroupsFromConfig falls back to All when nothing is grouped", () => {
    const config = mkConfig({
      actions: [{ id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, placements: [], max: 0 }],
      records: [{ id: "r1", name: "R1", input: { type: "text" }, placements: [] }],
    });

    const groups = buildActivityGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions).toHaveLength(1);
    expect(groups[0].records).toHaveLength(1);
  });

  it("buildActionOnlyGroupsFromConfig returns Ungrouped when placements are empty", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1", columns: [{ id: "default", name: "Default" }] }],
      actions: [
        { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, placements: [], max: 0 },
        { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {}, placements: [], max: 0 },
      ],
    });

    const groups = buildActionOnlyGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("buildActivityGroupsFromConfig skips empty configured groups and falls back to All when nothing else exists", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1", columns: [{ id: "default", name: "Default" }] }],
      // action references unknown groupId so it won't match g1, and isn't considered ungrouped
      actions: [{ id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, placements: [{ groupId: "unknown", columnId: "default" }], max: 0 }],
      records: [],
    });

    const groups = buildActivityGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__all__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
  });

  it("buildActionOnlyGroupsFromConfig skips empty configured groups and falls back to All", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1", columns: [{ id: "default", name: "Default" }] }],
      actions: [{ id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, placements: [{ groupId: "unknown", columnId: "default" }], max: 0 }],
    });

    const groups = buildActionOnlyGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__all__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
  });
});
