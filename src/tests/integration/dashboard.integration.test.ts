import { describe, expect, it } from "vitest";

import type { IsoDate } from "../../core/types";
import { handleUserEvent } from "../../core/handleEvents/handleUserEvent";
import { translateRenderBlock } from "../../core/translate/translateRenderBlock";
import type { ActivitiesGroupModel, RenderDashboardBodyModel } from "../../core/translate/models";
import { createFixtureRepo } from "./fixtureVault";

async function renderDashboard(date: IsoDate) {
  const fixture = await createFixtureRepo();
  const model = await translateRenderBlock({
    el: {} as HTMLElement,
    blockConfig: { date },
    repo: fixture.repo,
    onUserAction: async () => {},
  });

  expect(model.kind).toBe("dashboard");
  if (model.kind !== "dashboard") throw new Error("expected dashboard model");
  return { ...fixture, model };
}

function activityGroup(model: RenderDashboardBodyModel, id: string): ActivitiesGroupModel {
  if (model.actions.kind !== "activitiesTabs") throw new Error("expected activity tabs");
  const group = model.actions.groups.find((candidate) => candidate.id === id);
  if (!group) throw new Error(`missing activity group: ${id}`);
  return group;
}

describe("integration: dashboard workflows", () => {
  it("renders the fixture's scores, groups, required counts, and plans", async () => {
    const { model } = await renderDashboard("2026-03-02");

    expect(model.areas.kind).toBe("areasTable");
    if (model.areas.kind !== "areasTable") throw new Error("expected areas table");
    expect(model.areas.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ areaName: "Health", updatedScoreText: "500", daysSinceText: "1" }),
      expect.objectContaining({ areaName: "Career", updatedScoreText: "490", daysSinceText: "2" }),
    ]));

    expect(model.planDay).toMatchObject({ kind: "planTabs", scope: "day" });
    expect(model.planWeek).toMatchObject({ kind: "planTabs", scope: "week" });

    const morning = activityGroup(model, "morning");
    const evening = activityGroup(model, "evening");
    expect(morning.numActionsStillRequired).toBe(1);
    expect(evening.numActionsStillRequired).toBe(1);

    const morningWalk = morning.rows.find((row) => row.kind === "action" && row.actionId === "walk");
    const eveningWalk = evening.rows.find((row) => row.kind === "action" && row.actionId === "walk");
    expect(morningWalk).toMatchObject({ kind: "action", requiredLeft: 1, currentText: "0" });
    expect(eveningWalk).toMatchObject({ kind: "action", requiredLeft: 1, currentText: "0" });
  });

  it("updates one shared action and record across every group containing them", async () => {
    const { repo } = await createFixtureRepo();

    await handleUserEvent(
      { kind: "adjustActionTotal", date: "2026-03-03", actionId: "walk", delta: 1 },
      repo
    );
    await handleUserEvent(
      { kind: "setRecordValue", date: "2026-03-03", recordId: "weight", value: "141" },
      repo
    );

    const model = await translateRenderBlock({
      el: {} as HTMLElement,
      blockConfig: { date: "2026-03-03" },
      repo,
      onUserAction: async () => {},
    });

    expect(model.kind).toBe("dashboard");
    if (model.kind !== "dashboard") throw new Error("expected dashboard model");

    for (const groupId of ["morning", "evening"]) {
      const group = activityGroup(model, groupId);
      expect(group.rows).toEqual(expect.arrayContaining([
        expect.objectContaining({ kind: "action", actionId: "walk", currentText: "1" }),
        expect.objectContaining({ kind: "record", recordId: "weight", currentText: "141" }),
      ]));
    }
  });

  it("persists day and week plans and reflects them in possible scores", async () => {
    const { repo } = await createFixtureRepo();

    await handleUserEvent(
      { kind: "setPlanTarget", scope: "day", actionId: "walk", value: 3 },
      repo
    );
    await handleUserEvent(
      { kind: "setPlanTarget", scope: "day", actionId: "deep_work", value: 4 },
      repo
    );
    await handleUserEvent(
      { kind: "setPlanTarget", scope: "week", actionId: "walk", value: 10 },
      repo
    );
    await handleUserEvent(
      { kind: "setPlanTarget", scope: "week", actionId: "deep_work", value: 10 },
      repo
    );

    const dayPlan = await repo.readPlan("day");
    const weekPlan = await repo.readPlan("week");
    expect(dayPlan.actions).toMatchObject({ walk: 3, deep_work: 4 });
    expect(weekPlan.actions).toMatchObject({ walk: 10, deep_work: 10 });

    const model = await translateRenderBlock({
      el: {} as HTMLElement,
      blockConfig: { date: "2026-03-01" },
      repo,
      onUserAction: async () => {},
    });

    expect(model.kind).toBe("dashboard");
    if (model.kind !== "dashboard") throw new Error("expected dashboard model");
    expect(model.planDay.kind).toBe("planTabs");
    expect(model.planWeek.kind).toBe("planTabs");
    if (model.areas.kind !== "areasTable") throw new Error("expected areas table");

    expect(model.areas.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ areaName: "Health", possibleDayText: "525", possibleWeekText: "613" }),
      expect.objectContaining({ areaName: "Career", possibleDayText: "515", possibleWeekText: "550" }),
    ]));
  });
});
