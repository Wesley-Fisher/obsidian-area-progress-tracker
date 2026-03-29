import { describe, expect, it } from "vitest";
import type { DailyLog, SystemConfig } from "../../../../core/types";
import { translateActivitiesSection } from "../../../../core/translate/translateActivitiesSection";
import { ActivitiesSectionModel, ActivitiesSectionModelEmpty } from "../../../../core/translate/models";

describe("render/translate/translateActivitiesSection", () => {
  it("returns activitiesEmpty when no actions or records are configured", () => {
    const config: SystemConfig = { version: 1, areas: [], actions: [], records: [] };

    const model = translateActivitiesSection({
      date: "2026-03-16" as any,
      config,
      dayLog: null,
    }) as ActivitiesSectionModelEmpty;

    expect(model.kind).toBe("activitiesEmpty");
    expect(model.message).toContain("No actions or records");
  });

  it("translates button/checkbox/number actions and record inputs into entry models", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [{ id: "g1", name: "Group 1" }],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 2 }, effects: {}, max: 2, groupIds: ["g1"] },
        { id: "meditate", name: "Meditate", input: { type: "checkbox" }, effects: {}, max: 0, groupIds: [] },
        { id: "pushups", name: "Pushups", input: { type: "number", max: 10, step: 1 }, effects: {}, max: 5, groupIds: [] },
      ],
      records: [{ id: "mood", name: "Mood", input: { type: "text" }, groupIds: ["g1"] }],
    };

    const dayLog: DailyLog = {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { walk: 2, meditate: 0, pushups: 1 },
      records: { mood: "ok" },
    };

    const model = translateActivitiesSection({
      date: "2026-03-16" as any,
      config,
      dayLog,
    });

    expect(model.kind).toBe("activitiesTabs");
    if (model.kind !== "activitiesTabs") throw new Error("expected activitiesTabs");

    const g1 = model.groups.find((g) => g.id === "g1")!;
    expect(g1).toBeTruthy();

    const walk = g1.rows.find((r) => r.kind === "action" && r.actionId === "walk")!;
    expect(walk.kind).toBe("action");
    if (walk.kind !== "action") throw new Error("expected action");
    expect(walk.entry.kind).toBe("button");
    if (walk.entry.kind === "button") {
      expect(walk.entry.plus.disabled).toBe(true); // current=2 max=2
      expect(walk.entry.minus.disabled).toBe(false);
      expect(walk.entry.plus.event).toMatchObject({ kind: "adjustActionTotal", actionId: "walk", delta: 2 });
      expect(walk.entry.minus.event).toMatchObject({ kind: "adjustActionTotal", actionId: "walk", delta: -2 });
    }

    const meditate = model.groups
      .flatMap((g) => g.rows)
      .find((r) => r.kind === "action" && r.actionId === "meditate")!;
    if (meditate.kind !== "action") throw new Error("expected action");
    expect(meditate.entry.kind).toBe("checkbox");
    if (meditate.entry.kind === "checkbox") {
      expect(meditate.entry.disabled).toBe(true); // max=0 disables
      expect(meditate.entry.checked).toBe(false);
    }

    const pushups = model.groups
      .flatMap((g) => g.rows)
      .find((r) => r.kind === "action" && r.actionId === "pushups")!;
    if (pushups.kind !== "action") throw new Error("expected action");
    expect(pushups.entry.kind).toBe("number");
    if (pushups.entry.kind === "number") {
      expect(pushups.entry.max).toBe("5"); // effective max = min(10,5)
      expect(pushups.entry.value).toBe("1");
    }

    const mood = g1.rows.find((r) => r.kind === "record" && r.recordId === "mood")!;
    expect(mood.kind).toBe("record");
    if (mood.kind !== "record") throw new Error("expected record");
    expect(mood.entry.kind).toBe("recordInput");
    expect(mood.entry.value).toBe("ok");
    expect(mood.entry.eventBase).toMatchObject({ kind: "setRecordValue", recordId: "mood" });
  });

  it("translates actions into multiple groups", () => {
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [{ id: "g1", name: "Group 1" }, {id: "g2", name: "Group 2" }],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 2 }, effects: {}, max: 2, groupIds: ["g1", "g2"] },
      ],
      records: [{ id: "mood", name: "Mood", input: { type: "text" }, groupIds: ["g1"] }],
    };

    const dayLog: DailyLog = {
      previousScore: {},
      startingScore: {},
      updatedScore: {},
      actions: { walk: 2, meditate: 0, pushups: 1 },
      records: { mood: "ok" },
    };

    const model = translateActivitiesSection({
      date: "2026-03-16" as any,
      config,
      dayLog,
    });

    expect(model.kind).toBe("activitiesTabs");
    if (model.kind !== "activitiesTabs") throw new Error("expected activitiesTabs");

    const g1 = model.groups.find((g) => g.id === "g1")!;
    expect(g1).toBeTruthy();

    const g2 = model.groups.find((g) => g.id === "g2")!;
    expect(g2).toBeTruthy();

    const walk1 = g1.rows.find((r) => r.kind === "action" && r.actionId === "walk")!;
    
    // Previous checks
    expect(walk1.kind).toBe("action");
    if (walk1.kind !== "action") throw new Error("expected action");
    expect(walk1.entry.kind).toBe("button");
    if (walk1.entry.kind === "button") {
      expect(walk1.entry.plus.disabled).toBe(true); // current=2 max=2
      expect(walk1.entry.minus.disabled).toBe(false);
      expect(walk1.entry.plus.event).toMatchObject({ kind: "adjustActionTotal", actionId: "walk", delta: 2 });
      expect(walk1.entry.minus.event).toMatchObject({ kind: "adjustActionTotal", actionId: "walk", delta: -2 });
    }

    // Lighter checks on 2nd rendering
    const walk2 = g2.rows.find((r) => r.kind === "action" && r.actionId === "walk")!;
    expect(walk2.kind).toBe("action");
    if (walk2.kind !== "action") throw new Error("expected action");
    expect(walk2.entry.kind).toBe("button");
  });
});
