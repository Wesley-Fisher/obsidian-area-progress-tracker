import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../../../core/types";
import {
  buildActionOnlyGroupsFromConfig,
  buildActivityGroupsFromConfig,
} from "../../../../core/render/translate/grouping";

function mkConfig(partial: Partial<SystemConfig>): SystemConfig {
  return {
    version: 1,
    areas: [],
    groups: [],
    actions: [],
    records: [],
    ...partial,
  };
}

describe("render/translate/grouping", () => {
  it("buildActivityGroupsFromConfig uses configured groups and adds Ungrouped for leftovers", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1" }],
      actions: [
        { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, groupId: "g1" },
        { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {} },
      ],
      records: [{ id: "r1", name: "R1", input: { type: "text" }, groupId: "g1" }],
    });

    const groups = buildActivityGroupsFromConfig(config);

    expect(groups.map((g) => g.id)).toEqual(["g1", "__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
    expect(groups[0].records.map((r) => r.id)).toEqual(["r1"]);
    expect(groups[1].actions.map((a) => a.id)).toEqual(["a2"]);
  });

  it("buildActivityGroupsFromConfig falls back to All when nothing is grouped", () => {
    const config = mkConfig({
      actions: [{ id: "a1", name: "A1", input: { type: "checkbox" }, effects: {} }],
      records: [{ id: "r1", name: "R1", input: { type: "text" } }],
    });

    const groups = buildActivityGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions).toHaveLength(1);
    expect(groups[0].records).toHaveLength(1);
  });

  it("buildActionOnlyGroupsFromConfig returns Ungrouped when groupIds absent", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1" }],
      actions: [
        { id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {} },
        { id: "a2", name: "A2", input: { type: "button", step: 1 }, effects: {} },
      ],
    });

    const groups = buildActionOnlyGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__ungrouped__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("buildActivityGroupsFromConfig skips empty configured groups and falls back to All when nothing else exists", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1" }],
      // action references unknown groupId so it won't match g1, and isn't considered ungrouped
      actions: [{ id: "a1", name: "A1", input: { type: "button", step: 1 }, effects: {}, groupId: "unknown" }],
      records: [],
    });

    const groups = buildActivityGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__all__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
  });

  it("buildActionOnlyGroupsFromConfig skips empty configured groups and falls back to All", () => {
    const config = mkConfig({
      groups: [{ id: "g1", name: "Group 1" }],
      actions: [{ id: "a1", name: "A1", input: { type: "checkbox" }, effects: {}, groupId: "unknown" }],
    });

    const groups = buildActionOnlyGroupsFromConfig(config);
    expect(groups.map((g) => g.id)).toEqual(["__all__"]);
    expect(groups[0].actions.map((a) => a.id)).toEqual(["a1"]);
  });
});
