import { describe, expect, it } from "vitest";

import type { IsoDate } from "../../core/types";
import { handleUserEvent } from "../../core/handleEvents/handleUserEvent";
import { createFixtureRepo } from "./fixtureVault";

function score(repo: Awaited<ReturnType<typeof createFixtureRepo>>["repo"], date: IsoDate, areaId: string): Promise<number> {
  return repo.readDailyLog(date).then((log) => log.updatedScore[areaId]?.score ?? Number.NaN);
}

describe("integration: vault lifecycle", () => {
  it("recomputes the edited day and all existing future days", async () => {
    const { repo } = await createFixtureRepo();

    await handleUserEvent(
      { kind: "adjustActionTotal", date: "2026-03-01", actionId: "walk", delta: 1 },
      repo
    );

    const marchFirst = await repo.readDailyLog("2026-03-01");
    const marchSecond = await repo.readDailyLog("2026-03-02");
    const marchThird = await repo.readDailyLog("2026-03-03");

    expect(marchFirst.actions.walk).toBe(2);
    expect(marchFirst.updatedScore.health).toMatchObject({ score: 513, daysSince: 0, decayActive: false });
    expect(marchSecond.updatedScore.health).toMatchObject({ score: 512, daysSince: 1, decayActive: true });
    expect(marchThird.updatedScore.health).toMatchObject({ score: 501, daysSince: 2, decayActive: true });
    expect(marchThird.updatedScore.career).toMatchObject({ score: 495, daysSince: 0, decayActive: false });
  });

  it("creates a missing day from the previous day's updated scores", async () => {
    const { repo } = await createFixtureRepo();

    expect(await repo.existsDailyLog("2026-03-04")).toBe(false);

    await repo.ensureSetup("2026-03-04");

    expect(await repo.existsDailyLog("2026-03-04")).toBe(true);
    expect(await score(repo, "2026-03-04", "health")).toBe(478);
    expect(await score(repo, "2026-03-04", "career")).toBe(495);

    const newDay = await repo.readDailyLog("2026-03-04");
    expect(newDay.actions).toEqual({});
    expect(newDay.records).toEqual({});
    expect(newDay.previousScore.health).toMatchObject({ score: 489, daysSince: 2, decayActive: true });
  });

  it("persists records through recomputation", async () => {
    const { repo } = await createFixtureRepo();

    await handleUserEvent(
      { kind: "setRecordValue", date: "2026-03-01", recordId: "weight", value: "142.5" },
      repo
    );

    const dayLog = await repo.readDailyLog("2026-03-01");
    expect(dayLog.records).toEqual({ weight: "142.5" });
    expect(dayLog.updatedScore.health.score).toBe(501);
  });
});
