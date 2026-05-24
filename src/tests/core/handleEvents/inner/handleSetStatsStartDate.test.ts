import { describe, expect, it } from "vitest";
import type { SystemConfig } from "../../../../core/types";
import { createVaultRepo } from "../../../../core/vault/repo";
import { getStaticDataPaths } from "../../../../core/vault/paths";
import { handleSetStatsStartDate } from "../../../../core/handleEvents/inner/handleSetStatsStartDate";
import { MemoryVault } from "../../../memoryVault";

describe("handleSetStatsStartDate", () => {
  it("writes a stats start date into config.json and preserves entries", async () => {
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
      weeklyPlan: { startDate: "", actions: {} },
      stats: { startDate: "", entries: [{ id: "weight-total", name: "Weight", statNames: ["weight"], display: ["total", "range"] }] },
    };
    await vault.write(staticPaths.configPath, JSON.stringify(seed));

    await handleSetStatsStartDate(repo, {
      kind: "setStatsStartDate",
      value: "2026-03-01",
    });

    const raw = await vault.read(staticPaths.configPath);
    const next = JSON.parse(raw) as SystemConfig;
    expect(next.stats.startDate).toBe("2026-03-01");
    expect(next.stats.entries).toEqual([{ id: "weight-total", name: "Weight", statNames: ["weight"], display: ["total", "range"] }]);
  });
});