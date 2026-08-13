import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../../../core/types";
import { handleSetPlanTarget } from "../../../../core/handleEvents/inner/handleSetPlanTarget";
import { createVaultRepo } from "../../../../core/vault/repo";
import { getStaticDataPaths } from "../../../../core/vault/paths";
import { MemoryVault } from "../../../memoryVault";


describe("handleSetPlanTarget", () => {
  it("writes a value into dailyPlan in config.json", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const staticPaths = getStaticDataPaths(dataFolder);
    const seed: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      requiredActions: {},
      actions: [],
      records: [],
      dailyPlan: { actions: {} },
      weeklyPlan: { actions: {} },
      stats: { entries: [] },
    };
    await vault.write(staticPaths.configPath, JSON.stringify(seed));

    await handleSetPlanTarget(repo, {
      kind: "setPlanTarget",
      scope: "day",
      actionId: "walk",
      value: 3,
    });

    const raw = await vault.read(staticPaths.configPath);
    const next = JSON.parse(raw) as SystemConfig;
    expect(next.dailyPlan.actions.walk).toBe(3);
  });

  it("merges into an existing weeklyPlan", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const staticPaths = getStaticDataPaths(dataFolder);
    const seed: SystemConfig = {
      version: 1,
      areas: [],
      groups: [],
      requiredActions: {},
      actions: [],
      records: [],
      dailyPlan: { actions: {} },
      weeklyPlan: { actions: { run: 1 } },
      stats: { entries: [] },
    };
    await vault.write(staticPaths.configPath, JSON.stringify(seed));

    await handleSetPlanTarget(repo, {
      kind: "setPlanTarget",
      scope: "week",
      actionId: "walk",
      value: 5,
    });

    const raw = await vault.read(staticPaths.configPath);
    const next = JSON.parse(raw) as SystemConfig;
    expect(next.weeklyPlan.actions.run).toBe(1);
    expect(next.weeklyPlan.actions.walk).toBe(5);
  });
});
