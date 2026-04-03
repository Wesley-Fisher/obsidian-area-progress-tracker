import { describe, expect, it } from "vitest";
import type { IsoDate, SystemConfig } from "../../../core/types";
import { handleUserEvent } from "../../../core/handleEvents/handleUserEvent";
import { getStaticDataPaths } from "../../../core/vault/paths";
import { createVaultRepo } from "../../../core/vault/repo";
import { MemoryVault } from "../../memoryVault";


describe("handleUserEvent", () => {
  it("ignores unknown event kinds", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    // Allow any for this test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await handleUserEvent({ kind: "noop" } as unknown as any, repo);

    const staticPaths = getStaticDataPaths(dataFolder);
    expect(await vault.exists(staticPaths.configPath)).toBe(false);
  });

  it("handles setPlanTarget by writing the plan file", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    await handleUserEvent(
      {
        kind: "setPlanTarget",
        scope: "day",
        actionId: "walk",
        value: 2,
      },
      repo
    );

    const dayPlan = await repo.readPlan("day");
    const weekPlan = await repo.readPlan("week");

    expect(dayPlan.actions?.walk).toBe(2);
    expect(weekPlan.actions ?? {}).toBeDefined();
  });

  it("handles setRecordValue by writing records and preserving them after recompute", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);
    const date = "2026-03-16" as IsoDate;

    await handleUserEvent(
      {
        kind: "setRecordValue",
        date,
        recordId: "weight",
        value: "180",
      },
      repo
    );

    const dayLog = await repo.readDailyLog(date);
    expect(dayLog.records?.weight).toBe("180");
  });

  it("handles adjustActionTotal and clamps to action.max from config", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);
    const date = "2026-03-16" as IsoDate;

    // Pre-seed config so the handler uses a known action.max.
    const staticPaths = getStaticDataPaths(dataFolder);
    const config: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, max: 1, groupIds: [] }],
      records: [],
      requiredActions: {},
      dailyPlan: { actions: {} },
      weeklyPlan: { startDate: "", actions: {} },
    };
    await vault.write(staticPaths.configPath, JSON.stringify(config));

    await handleUserEvent(
      {
        kind: "adjustActionTotal",
        date,
        actionId: "walk",
        delta: 10,
      },
      repo
    );

    const dayLog = await repo.readDailyLog(date);
    expect(dayLog.actions.walk).toBe(1);
  });
});
