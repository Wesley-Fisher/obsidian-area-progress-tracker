import { describe, expect, it } from "vitest";
import type { DailyLog, IsoDate, Scores, SystemConfig } from "../../../core/types";
import { ensureDailyLogFile } from "../../../core/vault/setup";
import { getDataPaths } from "../../../core/vault/paths";
import { buildDailyLog } from "../../../core/scoring";
import { MemoryVault } from "../../memoryVault";
import { VaultLike } from "../../../core/vault/storage";

describe("core/vault/setup ensureDailyLogFile", () => {
  it("uses a fallback empty config when config file cannot be read", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTrackerBase";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    await vault.write(paths.configPath, "{ this is not json }");

    await ensureDailyLogFile(vault as VaultLike, dataFolder, paths.configPath, date);

    const created = JSON.parse(await vault.read(paths.dailyLogPath)) as DailyLog;
    expect(created.actions).toBeDefined();
    expect(created.updatedScore).toBeDefined();
  });

  it("seeds previousScore from prior day's updatedScore when available", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTrackerBase";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    const config: SystemConfig = {
      version: 1,
      areas: [{ id: "health", name: "Health", minScore: 0, maxScore: 100, baseScore: 10, dailyDecay: 0 }],
      actions: [],
      records: [],
      groups: [],
      requiredActions: {},
    };

    const prevDate = "2026-03-15" as IsoDate;
    const prevPaths = getDataPaths(dataFolder, prevDate);
    const prevUpdated = { health: { score: 42, daysSince: 3 } } as Scores;

    await vault.write(paths.configPath, JSON.stringify(config));
    await vault.write(prevPaths.dailyLogPath, JSON.stringify({
      ...buildDailyLog(config, undefined, {}, {}),
      updatedScore: prevUpdated,
    }));

    await ensureDailyLogFile(vault as VaultLike, dataFolder, paths.configPath, date);

    const created = JSON.parse(await vault.read(paths.dailyLogPath)) as DailyLog;
    expect(created.previousScore.health.score).toBe(42);
  });

  it("does not overwrite an existing daily log", async () => {
    const vault = new MemoryVault();
    const dataFolder = "ProgressTrackerBase";
    const date = "2026-03-16" as IsoDate;
    const paths = getDataPaths(dataFolder, date);

    await vault.write(paths.dailyLogPath, JSON.stringify({ hello: "existing" }));
    await ensureDailyLogFile(vault as VaultLike, dataFolder, paths.configPath, date);

    const after = await vault.read(paths.dailyLogPath);
    expect(JSON.parse(after)).toMatchObject({ hello: "existing" });
  });
});
