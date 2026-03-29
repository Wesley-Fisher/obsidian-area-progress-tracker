import { describe, expect, it } from "vitest";
import type { IsoDate, SystemConfig } from "../../../../core/types";
import { buildDailyLog } from "../../../../core/scoring";
import { handleAdjustActionTotal } from "../../../../core/handleEvents/inner/handleAdjustActionTotal";
import { createVaultRepo } from "../../../../core/vault/repo";
import { MemoryVault } from "../../../memoryVault";


describe("handleAdjustActionTotal", () => {
  it("increments an action total and writes the updated daily log", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [] }],
      records: [],
    };

    const dayLog = buildDailyLog(config, undefined, { walk: 1 }, {});
    const date = "2026-03-16" as IsoDate;

    await handleAdjustActionTotal(repo, dayLog, config, {
      kind: "adjustActionTotal",
      date,
      actionId: "walk",
      delta: 2,
    });

    const written = await repo.readDailyLog(date);
    expect(written.actions.walk).toBe(3);
    expect(written.updatedScore).toBeDefined();
  });

  it("clamps totals to 0 for negative deltas", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [] }],
      records: [],
    };

    const dayLog = buildDailyLog(config, undefined, { walk: 1 }, {});
    const date = "2026-03-16" as IsoDate;

    await handleAdjustActionTotal(repo, dayLog, config, {
      kind: "adjustActionTotal",
      date,
      actionId: "walk",
      delta: -99,
    });

    const written = await repo.readDailyLog(date);
    expect(written.actions.walk).toBe(0);
  });

  it("clamps totals to action.max when configured", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, max: 2, groupIds: [] }],
      records: [],
    };

    const dayLog = buildDailyLog(config, undefined, { walk: 1 }, {});
    const date = "2026-03-16" as IsoDate;

    await handleAdjustActionTotal(repo, dayLog, config, {
      kind: "adjustActionTotal",
      date,
      actionId: "walk",
      delta: 99,
    });

    const written = await repo.readDailyLog(date);
    expect(written.actions.walk).toBe(2);
  });

  it("does not clamp when action.max is invalid", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [
        { id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, max: Number.NaN, groupIds: [] },
      ],
      records: [],
    };

    const dayLog = buildDailyLog(config, undefined, { walk: 1 }, {});
    const date = "2026-03-16" as IsoDate;

    await handleAdjustActionTotal(repo, dayLog, config, {
      kind: "adjustActionTotal",
      date,
      actionId: "walk",
      delta: 9,
    });

    const written = await repo.readDailyLog(date);
    expect(written.actions.walk).toBe(10);
  });

  it("handles when an action record had not existed", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const config: SystemConfig = {
      version: 1,
      areas: [],
      actions: [{ id: "walk", name: "Walk", input: { type: "button", step: 1 }, effects: {}, groupIds: [] }],
      records: [],
    };

    let dayLog = buildDailyLog(config, undefined, {}, {});
    const date = "2026-03-16" as IsoDate;

    await handleAdjustActionTotal(repo, dayLog, config, {
      kind: "adjustActionTotal",
      date,
      actionId: "walk",
      delta: 2,
    });

    const written = await repo.readDailyLog(date);
    expect(written.actions.walk).toBe(2);
    expect(written.updatedScore).toBeDefined();
  });
});
