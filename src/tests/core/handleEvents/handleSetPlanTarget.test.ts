import { describe, expect, it } from "vitest";
import type { PlanFile } from "../../../core/types";
import { handleSetPlanTarget } from "../../../core/handleEvents/handleSetPlanTarget";
import { createVaultRepo } from "../../../core/vault/repo";
import { getStaticDataPaths } from "../../../core/vault/paths";
import { MemoryVault } from "../../memoryVault";


describe("handleSetPlanTarget", () => {
  it("writes a value into the day plan when the plan file is missing", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    await handleSetPlanTarget(repo, {
      kind: "setPlanTarget",
      scope: "day",
      actionId: "walk",
      value: 3,
    });

    const staticPaths = getStaticDataPaths(dataFolder);
    const raw = await vault.read(staticPaths.dayPlanPath);
    const plan = JSON.parse(raw) as PlanFile;
    expect(plan.actions?.walk).toBe(3);
  });

  it("merges into an existing plan file", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTracker";
    const repo = createVaultRepo(vault, dataFolder);

    const staticPaths = getStaticDataPaths(dataFolder);
    await vault.write(staticPaths.weekPlanPath, JSON.stringify({ actions: { run: 1 } }));

    await handleSetPlanTarget(repo, {
      kind: "setPlanTarget",
      scope: "week",
      actionId: "walk",
      value: 5,
    });

    const raw = await vault.read(staticPaths.weekPlanPath);
    const plan = JSON.parse(raw) as PlanFile;
    expect(plan.actions?.run).toBe(1);
    expect(plan.actions?.walk).toBe(5);
  });
});
